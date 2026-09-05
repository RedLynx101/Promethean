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
import { VALID_EDGE_TYPES } from "../../lib/agents/schemas";

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
    nodes: result.nodes as unknown,
    edges: result.edges as unknown,
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
  const params = ApprovePhaseParams.safeParse({ workflowId: req.params.workflowId });
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

  // Enforce server-side phase transition validity
  if (workflow.phase !== phase) {
    res.status(409).json({
      error: `Phase mismatch: workflow is in phase "${workflow.phase}" but request targets "${phase}". Refresh and try again.`,
    });
    return;
  }

  const editsObj = edits as Record<string, unknown> | undefined;

  let currentNodes: PrometheanNode[] = (editsObj?.nodes ?? workflow.nodes) as PrometheanNode[];
  let currentEdges: PrometheanEdge[] = (editsObj?.edges ?? workflow.edges) as PrometheanEdge[];
  const currentGovernance: GovernanceConfig | Record<string, unknown> =
    (editsObj?.governanceConfig ?? workflow.governanceConfig) as GovernanceConfig;

  // Validate incoming edited edges: coerce unknown types to "default", reject unknown if strict
  if (editsObj?.edges) {
    const invalidEdges = currentEdges.filter(
      (e) => e.type && !VALID_EDGE_TYPES.includes(e.type as typeof VALID_EDGE_TYPES[number])
    );
    if (invalidEdges.length > 0) {
      res.status(400).json({
        error: `Invalid edge type(s): ${invalidEdges.map((e) => `${e.id}:${e.type}`).join(", ")}. Allowed: ${VALID_EDGE_TYPES.join(", ")}`,
      });
      return;
    }
  }

  if (edits) {
    await db.update(workflowsTable).set({
      nodes: currentNodes as unknown,
      edges: currentEdges as unknown,
      governanceConfig: currentGovernance as unknown as Record<string, unknown>,
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
      nodes: currentNodes as unknown,
      edges: currentEdges as unknown,
      phase: "select",
      status: "awaiting_approval",
      systemTypeSummary: summary as unknown,
      estimatedCostPerRun: String(agentResult.estimatedCostPerRun ?? 0),
      estimatedLatencyMs: agentResult.estimatedLatencyMs ?? null,
      // Phase advanced — reset the rejection counter for the next phase's gate.
      rejectionCount: 0,
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
      nodes: currentNodes as unknown,
      edges: currentEdges as unknown,
      phase: "orchestrate",
      status: "awaiting_approval",
      // Phase advanced — reset the rejection counter for the next phase's gate.
      rejectionCount: 0,
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
      nodes: currentNodes as unknown,
      edges: currentEdges as unknown,
      governanceConfig: agentResult.governanceConfig as unknown,
      phase: "govern",
      status: "awaiting_approval",
      // Phase advanced — reset the rejection counter for the next phase's gate.
      rejectionCount: 0,
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
      // Phase advanced — reset the rejection counter for the next phase's gate.
      rejectionCount: 0,
    }).where(eq(workflowsTable.id, workflowId));

    await db.insert(workflowVersionsTable).values({
      workflowId,
      version: workflow.version,
      definition: { nodes: currentNodes, edges: currentEdges, governanceConfig: currentGovernance } as unknown,
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
  const params = RejectPhaseParams.safeParse({ workflowId: req.params.workflowId });
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

  // Enforce the per-phase rejection cap. This closes the unbounded-rejection
  // failure mode flagged in Phase 2 feedback: humans can't trap the workflow
  // in an infinite reject/regenerate loop. After max rejections, the operator
  // must either escalate or reset the phase.
  if (workflow.rejectionCount >= workflow.maxRejections) {
    req.log.warn(
      { workflowId, phase, rejectionCount: workflow.rejectionCount, maxRejections: workflow.maxRejections },
      "Rejection cap reached for current phase",
    );
    res.status(409).json({
      error:
        `Rejection cap reached for phase "${workflow.phase}" ` +
        `(${workflow.rejectionCount}/${workflow.maxRejections}). ` +
        `Escalate to a workflow owner or reset the phase before further regeneration.`,
      rejectionCount: workflow.rejectionCount,
      maxRejections: workflow.maxRejections,
    });
    return;
  }

  // Also guard against phase mismatch — same defensive check as /approve.
  if (workflow.phase !== phase) {
    res.status(409).json({
      error: `Phase mismatch: workflow is in phase "${workflow.phase}" but request targets "${phase}". Refresh and try again.`,
    });
    return;
  }

  const description = workflow.workflowBrief ?? "workflow";
  const currentNodes = workflow.nodes as PrometheanNode[];
  const currentEdges = workflow.edges as PrometheanEdge[];
  const nextRejectionCount = workflow.rejectionCount + 1;

  req.log.info(
    { workflowId, phase, feedback, rejectionCount: nextRejectionCount, maxRejections: workflow.maxRejections },
    "Regenerating pipeline phase",
  );

  let result: Record<string, unknown>;

  if (phase === "decompose") {
    const agentResult = await runDecompositionAgent(description, workflow.domain ?? undefined, undefined, feedback);
    await db.update(workflowsTable).set({
      nodes: agentResult.nodes as unknown,
      edges: agentResult.edges as unknown,
      status: "awaiting_approval",
      rejectionCount: nextRejectionCount,
    }).where(eq(workflowsTable.id, workflowId));
    result = { nodes: agentResult.nodes, edges: agentResult.edges, message: agentResult.summary };

  } else if (phase === "select") {
    const agentResult = await runSystemSelectionAgent(currentNodes, currentEdges, description, undefined, feedback);
    await db.update(workflowsTable).set({
      nodes: agentResult.nodes as unknown,
      edges: agentResult.edges as unknown,
      status: "awaiting_approval",
      rejectionCount: nextRejectionCount,
    }).where(eq(workflowsTable.id, workflowId));
    result = { nodes: agentResult.nodes, edges: agentResult.edges, message: agentResult.summary };

  } else if (phase === "orchestrate") {
    const agentResult = await runOrchestrationAgent(currentNodes, currentEdges, description, undefined, feedback);
    await db.update(workflowsTable).set({
      nodes: agentResult.nodes as unknown,
      edges: agentResult.edges as unknown,
      status: "awaiting_approval",
      rejectionCount: nextRejectionCount,
    }).where(eq(workflowsTable.id, workflowId));
    result = { nodes: agentResult.nodes, edges: agentResult.edges, message: agentResult.summary };

  } else if (phase === "govern") {
    const agentResult = await runGovernanceAgent(currentNodes, currentEdges, description, undefined, feedback);
    await db.update(workflowsTable).set({
      nodes: agentResult.nodes as unknown,
      edges: agentResult.edges as unknown,
      governanceConfig: agentResult.governanceConfig as unknown,
      status: "awaiting_approval",
      rejectionCount: nextRejectionCount,
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
  const params = GetPipelineStatusParams.safeParse({ workflowId: req.params.workflowId });
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
