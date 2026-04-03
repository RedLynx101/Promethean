import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { workflowsTable, workflowVersionsTable } from "@workspace/db";
import {
  StartPipelineBody,
  ApprovePhaseBody,
  ApprovePhaseParams,
  RejectPhaseBody,
  RejectPhaseParams,
  GetPipelineStatusParams,
} from "@workspace/api-zod";
import { runDecompositionAgent } from "../../lib/agents/decomposition";
import { runSystemSelectionAgent } from "../../lib/agents/systemSelection";
import { runOrchestrationAgent } from "../../lib/agents/orchestration";
import { runGovernanceAgent } from "../../lib/agents/governance";
import type { PrometheanNode, PrometheanEdge, GovernanceConfig } from "../../lib/agents/types";

const router: IRouter = Router();

const PHASES = ["wizard", "decompose", "select", "orchestrate", "govern", "deployed"];

function getNextPhase(currentPhase: string): string {
  const idx = PHASES.indexOf(currentPhase);
  return PHASES[idx + 1] ?? "deployed";
}

function toJsonb<T>(value: T): unknown {
  return value as unknown;
}

function fromJsonb<T>(value: unknown): T {
  return value as T;
}

router.post("/pipeline/start", async (req, res): Promise<void> => {
  const parsed = StartPipelineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { workflowId, description, domain, constraints } = parsed.data;

  const [workflow] = await db.select().from(workflowsTable).where(eq(workflowsTable.id, workflowId));
  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  await db.update(workflowsTable).set({
    workflowBrief: description,
    domain: domain ?? workflow.domain,
    phase: "decompose",
    status: "building",
  }).where(eq(workflowsTable.id, workflowId));

  const constraintsObj = constraints as Record<string, unknown> | undefined;

  req.log.info({ workflowId }, "Starting decomposition pipeline");

  const result = await runDecompositionAgent(description, domain, constraintsObj);

  await db.update(workflowsTable).set({
    nodes: toJsonb(result.nodes),
    edges: toJsonb(result.edges),
    phase: "decompose",
    status: "awaiting_approval",
  }).where(eq(workflowsTable.id, workflowId));

  const [updated] = await db.select().from(workflowsTable).where(eq(workflowsTable.id, workflowId));

  res.json({
    workflowId,
    phase: "decompose",
    status: "awaiting_approval",
    nodes: result.nodes,
    edges: result.edges,
    message: result.summary,
    workflow: serializeWorkflow(updated),
  });
});

router.post("/pipeline/:workflowId/approve", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.workflowId) ? req.params.workflowId[0] : req.params.workflowId;
  const params = ApprovePhaseParams.safeParse({ workflowId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ApprovePhaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { workflowId } = params.data;
  const { phase, edits } = parsed.data;

  const [workflow] = await db.select().from(workflowsTable).where(eq(workflowsTable.id, workflowId));
  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  const editsObj = edits as Record<string, unknown> | undefined;

  let currentNodes: PrometheanNode[] = fromJsonb<PrometheanNode[]>(
    editsObj?.nodes ?? workflow.nodes
  );
  let currentEdges: PrometheanEdge[] = fromJsonb<PrometheanEdge[]>(
    editsObj?.edges ?? workflow.edges
  );
  const currentGovernance: GovernanceConfig | Record<string, unknown> =
    fromJsonb<GovernanceConfig>(editsObj?.governanceConfig ?? workflow.governanceConfig);

  if (edits) {
    await db.update(workflowsTable).set({
      nodes: toJsonb(currentNodes),
      edges: toJsonb(currentEdges),
      governanceConfig: toJsonb(currentGovernance),
    }).where(eq(workflowsTable.id, workflowId));
  }

  const description = workflow.workflowBrief ?? "workflow";
  const nextPhase = getNextPhase(phase);

  req.log.info({ workflowId, phase, nextPhase }, "Advancing pipeline phase");

  let result: Record<string, unknown>;
  let message = "";

  if (nextPhase === "select") {
    const agentResult = await runSystemSelectionAgent(
      currentNodes,
      currentEdges,
      description,
      undefined
    );
    currentNodes = agentResult.nodes;
    currentEdges = agentResult.edges;
    message = agentResult.summary;

    const summary: Record<string, number> = {};
    agentResult.nodes.forEach((n) => {
      const level = `L${n.data?.systemLevel ?? 0}`;
      summary[level] = (summary[level] ?? 0) + 1;
    });

    await db.update(workflowsTable).set({
      nodes: toJsonb(currentNodes),
      edges: toJsonb(currentEdges),
      phase: "select",
      status: "awaiting_approval",
      systemTypeSummary: toJsonb(summary),
      estimatedCostPerRun: String(agentResult.estimatedCostPerRun ?? 0),
      estimatedLatencyMs: agentResult.estimatedLatencyMs ?? null,
    }).where(eq(workflowsTable.id, workflowId));

    result = { nodes: agentResult.nodes, edges: agentResult.edges, message };

  } else if (nextPhase === "orchestrate") {
    const agentResult = await runOrchestrationAgent(
      currentNodes,
      currentEdges,
      description,
      undefined
    );
    currentNodes = agentResult.nodes;
    currentEdges = agentResult.edges;
    message = agentResult.summary;

    await db.update(workflowsTable).set({
      nodes: toJsonb(currentNodes),
      edges: toJsonb(currentEdges),
      phase: "orchestrate",
      status: "awaiting_approval",
    }).where(eq(workflowsTable.id, workflowId));

    result = { nodes: agentResult.nodes, edges: agentResult.edges, message };

  } else if (nextPhase === "govern") {
    const agentResult = await runGovernanceAgent(
      currentNodes,
      currentEdges,
      description,
      undefined
    );
    currentNodes = agentResult.nodes;
    currentEdges = agentResult.edges;
    message = agentResult.summary;

    await db.update(workflowsTable).set({
      nodes: toJsonb(currentNodes),
      edges: toJsonb(currentEdges),
      governanceConfig: toJsonb(agentResult.governanceConfig),
      phase: "govern",
      status: "awaiting_approval",
    }).where(eq(workflowsTable.id, workflowId));

    result = {
      nodes: agentResult.nodes,
      edges: agentResult.edges,
      governanceConfig: agentResult.governanceConfig,
      message,
    };

  } else if (nextPhase === "deployed") {
    await db.update(workflowsTable).set({
      phase: "deployed",
      status: "active",
    }).where(eq(workflowsTable.id, workflowId));

    await db.insert(workflowVersionsTable).values({
      workflowId,
      version: workflow.version,
      definition: toJsonb({ nodes: currentNodes, edges: currentEdges, governanceConfig: currentGovernance }),
      changelog: "Initial deployment",
    });

    result = { nodes: currentNodes, edges: currentEdges, message: "Workflow deployed successfully" };
  } else {
    await db.update(workflowsTable).set({ phase: nextPhase }).where(eq(workflowsTable.id, workflowId));
    result = { nodes: currentNodes, edges: currentEdges, message: "Phase advanced" };
  }

  const [updated] = await db.select().from(workflowsTable).where(eq(workflowsTable.id, workflowId));

  res.json({
    workflowId,
    phase: nextPhase,
    status: nextPhase === "deployed" ? "deployed" : "awaiting_approval",
    ...result,
    workflow: serializeWorkflow(updated),
  });
});

router.post("/pipeline/:workflowId/reject", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.workflowId) ? req.params.workflowId[0] : req.params.workflowId;
  const params = RejectPhaseParams.safeParse({ workflowId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = RejectPhaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { workflowId } = params.data;
  const { phase, feedback } = parsed.data;

  const [workflow] = await db.select().from(workflowsTable).where(eq(workflowsTable.id, workflowId));
  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  const description = workflow.workflowBrief ?? "workflow";
  const currentNodes = fromJsonb<PrometheanNode[]>(workflow.nodes);
  const currentEdges = fromJsonb<PrometheanEdge[]>(workflow.edges);

  req.log.info({ workflowId, phase, feedback }, "Regenerating pipeline phase");

  let result: Record<string, unknown>;

  if (phase === "decompose") {
    const agentResult = await runDecompositionAgent(description, workflow.domain ?? undefined, undefined, feedback);
    await db.update(workflowsTable).set({
      nodes: toJsonb(agentResult.nodes),
      edges: toJsonb(agentResult.edges),
      status: "awaiting_approval",
    }).where(eq(workflowsTable.id, workflowId));
    result = { nodes: agentResult.nodes, edges: agentResult.edges, message: agentResult.summary };

  } else if (phase === "select") {
    const agentResult = await runSystemSelectionAgent(currentNodes, currentEdges, description, undefined, feedback);
    await db.update(workflowsTable).set({
      nodes: toJsonb(agentResult.nodes),
      edges: toJsonb(agentResult.edges),
      status: "awaiting_approval",
    }).where(eq(workflowsTable.id, workflowId));
    result = { nodes: agentResult.nodes, edges: agentResult.edges, message: agentResult.summary };

  } else if (phase === "orchestrate") {
    const agentResult = await runOrchestrationAgent(currentNodes, currentEdges, description, undefined, feedback);
    await db.update(workflowsTable).set({
      nodes: toJsonb(agentResult.nodes),
      edges: toJsonb(agentResult.edges),
      status: "awaiting_approval",
    }).where(eq(workflowsTable.id, workflowId));
    result = { nodes: agentResult.nodes, edges: agentResult.edges, message: agentResult.summary };

  } else if (phase === "govern") {
    const agentResult = await runGovernanceAgent(currentNodes, currentEdges, description, undefined, feedback);
    await db.update(workflowsTable).set({
      nodes: toJsonb(agentResult.nodes),
      edges: toJsonb(agentResult.edges),
      governanceConfig: toJsonb(agentResult.governanceConfig),
      status: "awaiting_approval",
    }).where(eq(workflowsTable.id, workflowId));
    result = {
      nodes: agentResult.nodes,
      edges: agentResult.edges,
      governanceConfig: agentResult.governanceConfig,
      message: agentResult.summary,
    };
  } else {
    result = { nodes: currentNodes, edges: currentEdges, message: "Unknown phase" };
  }

  const [updated] = await db.select().from(workflowsTable).where(eq(workflowsTable.id, workflowId));

  res.json({
    workflowId,
    phase,
    status: "awaiting_approval",
    ...result,
    workflow: serializeWorkflow(updated),
  });
});

router.get("/pipeline/:workflowId/status", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.workflowId) ? req.params.workflowId[0] : req.params.workflowId;
  const params = GetPipelineStatusParams.safeParse({ workflowId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [workflow] = await db.select().from(workflowsTable).where(eq(workflowsTable.id, params.data.workflowId));
  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  res.json({
    workflowId: workflow.id,
    phase: workflow.phase,
    status: workflow.status,
    workflow: serializeWorkflow(workflow),
  });
});

function serializeWorkflow(w: Record<string, unknown>) {
  return {
    ...w,
    createdAt: (w.createdAt as Date).toISOString(),
    updatedAt: (w.updatedAt as Date).toISOString(),
    estimatedCostPerRun: w.estimatedCostPerRun != null ? Number(w.estimatedCostPerRun) : null,
    nodes: Array.isArray(w.nodes) ? w.nodes : [],
    edges: Array.isArray(w.edges) ? w.edges : [],
    tags: Array.isArray(w.tags) ? w.tags : [],
    systemTypeSummary: (w.systemTypeSummary as Record<string, number>) ?? {},
    governanceConfig: w.governanceConfig ?? {},
  };
}

export default router;
