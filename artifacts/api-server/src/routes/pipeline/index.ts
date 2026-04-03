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
import { logger } from "../../lib/logger";

const router: IRouter = Router();

const PHASES = ["wizard", "decompose", "select", "orchestrate", "govern", "deployed"];

function getNextPhase(currentPhase: string): string {
  const idx = PHASES.indexOf(currentPhase);
  return PHASES[idx + 1] ?? "deployed";
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

  // Save the brief to the workflow
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
    nodes: result.nodes as never,
    edges: result.edges as never,
    phase: "decompose",
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

  // Apply any user edits before advancing
  let currentNodes = ((edits as Record<string, unknown>)?.nodes as never[] ?? workflow.nodes) as typeof workflow.nodes;
  let currentEdges = ((edits as Record<string, unknown>)?.edges as never[] ?? workflow.edges) as typeof workflow.edges;
  const currentGovernance = ((edits as Record<string, unknown>)?.governanceConfig ?? workflow.governanceConfig);

  if (edits) {
    await db.update(workflowsTable).set({
      nodes: currentNodes,
      edges: currentEdges,
      governanceConfig: currentGovernance as never,
    }).where(eq(workflowsTable.id, workflowId));
  }

  const description = workflow.workflowBrief ?? "workflow";
  const constraints = undefined;
  const nextPhase = getNextPhase(phase);

  req.log.info({ workflowId, phase, nextPhase }, "Advancing pipeline phase");

  let result;
  let message = "";

  if (nextPhase === "select") {
    const agentResult = await runSystemSelectionAgent(
      currentNodes as never,
      currentEdges as never,
      description,
      constraints
    );
    currentNodes = agentResult.nodes as never;
    currentEdges = agentResult.edges as never;
    message = agentResult.summary;

    // Compute system type summary
    const summary: Record<string, number> = {};
    agentResult.nodes.forEach((n: Record<string, unknown>) => {
      const level = `L${(n.data as Record<string, unknown>)?.systemLevel ?? 0}`;
      summary[level] = (summary[level] ?? 0) + 1;
    });

    await db.update(workflowsTable).set({
      nodes: currentNodes,
      edges: currentEdges,
      phase: "select",
      systemTypeSummary: summary as never,
      estimatedCostPerRun: String(agentResult.estimatedCostPerRun ?? 0),
      estimatedLatencyMs: agentResult.estimatedLatencyMs ?? null,
    }).where(eq(workflowsTable.id, workflowId));

    result = { nodes: agentResult.nodes, edges: agentResult.edges, message };

  } else if (nextPhase === "orchestrate") {
    const agentResult = await runOrchestrationAgent(
      currentNodes as never,
      currentEdges as never,
      description,
      constraints
    );
    currentNodes = agentResult.nodes as never;
    currentEdges = agentResult.edges as never;
    message = agentResult.summary;

    await db.update(workflowsTable).set({
      nodes: currentNodes,
      edges: currentEdges,
      phase: "orchestrate",
    }).where(eq(workflowsTable.id, workflowId));

    result = { nodes: agentResult.nodes, edges: agentResult.edges, message };

  } else if (nextPhase === "govern") {
    const agentResult = await runGovernanceAgent(
      currentNodes as never,
      currentEdges as never,
      description,
      constraints
    );
    currentNodes = agentResult.nodes as never;
    currentEdges = agentResult.edges as never;
    message = agentResult.summary;

    await db.update(workflowsTable).set({
      nodes: currentNodes,
      edges: currentEdges,
      governanceConfig: agentResult.governanceConfig as never,
      phase: "govern",
    }).where(eq(workflowsTable.id, workflowId));

    result = {
      nodes: agentResult.nodes,
      edges: agentResult.edges,
      governanceConfig: agentResult.governanceConfig,
      message,
    };

  } else if (nextPhase === "deployed") {
    // Final deployment — save version
    await db.update(workflowsTable).set({
      phase: "deployed",
      status: "active",
    }).where(eq(workflowsTable.id, workflowId));

    await db.insert(workflowVersionsTable).values({
      workflowId,
      version: workflow.version,
      definition: { nodes: currentNodes, edges: currentEdges, governanceConfig: currentGovernance },
      changelog: "Initial deployment",
    });

    result = { nodes: currentNodes as never, edges: currentEdges as never, message: "Workflow deployed successfully" };
  } else {
    result = { nodes: currentNodes as never, edges: currentEdges as never, message: "Phase advanced" };
    await db.update(workflowsTable).set({ phase: nextPhase }).where(eq(workflowsTable.id, workflowId));
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
  const currentNodes = workflow.nodes as never;
  const currentEdges = workflow.edges as never;

  req.log.info({ workflowId, phase, feedback }, "Regenerating pipeline phase");

  let result;

  if (phase === "decompose") {
    const agentResult = await runDecompositionAgent(description, workflow.domain ?? undefined, undefined, feedback);
    await db.update(workflowsTable).set({
      nodes: agentResult.nodes as never,
      edges: agentResult.edges as never,
    }).where(eq(workflowsTable.id, workflowId));
    result = { nodes: agentResult.nodes, edges: agentResult.edges, message: agentResult.summary };

  } else if (phase === "select") {
    const agentResult = await runSystemSelectionAgent(currentNodes, currentEdges, description, undefined, feedback);
    await db.update(workflowsTable).set({
      nodes: agentResult.nodes as never,
      edges: agentResult.edges as never,
    }).where(eq(workflowsTable.id, workflowId));
    result = { nodes: agentResult.nodes, edges: agentResult.edges, message: agentResult.summary };

  } else if (phase === "orchestrate") {
    const agentResult = await runOrchestrationAgent(currentNodes, currentEdges, description, undefined, feedback);
    await db.update(workflowsTable).set({
      nodes: agentResult.nodes as never,
      edges: agentResult.edges as never,
    }).where(eq(workflowsTable.id, workflowId));
    result = { nodes: agentResult.nodes, edges: agentResult.edges, message: agentResult.summary };

  } else if (phase === "govern") {
    const agentResult = await runGovernanceAgent(currentNodes, currentEdges, description, undefined, feedback);
    await db.update(workflowsTable).set({
      nodes: agentResult.nodes as never,
      edges: agentResult.edges as never,
      governanceConfig: agentResult.governanceConfig as never,
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
