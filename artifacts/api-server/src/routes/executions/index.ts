/**
 * LEGACY / SIMULATED EXECUTION SURFACE
 * =====================================================================
 * POST /executions in this router does NOT run a node graph. It writes
 * plausible cost/latency rows (Math.random-based) so the Command Center
 * UI has data to render. This is kept for demo continuity only.
 *
 * Real execution under the pivot architecture happens via the harness
 * path: skills/emit.md translates an approved blueprint into runnable
 * code (LangGraph / Inngest / Temporal / n8n / Claude Agent SDK / plain
 * script), which is then invoked by the harness or deployed independently.
 *
 * See PIVOT.md at the repo root for the rationale and the intended
 * replacement path (a proposals/approved/ file-watcher that resumes the
 * harness on human approval and writes real execution records here).
 * =====================================================================
 */
import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { executionsTable, executionStepsTable, workflowsTable } from "@workspace/db";
import type { Execution, ExecutionStep } from "@workspace/db";
import {
  ListExecutionsQueryParams,
  CreateExecutionBody,
  GetExecutionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeExecution(e: Execution) {
  return {
    id: e.id,
    workflowId: e.workflowId,
    workflowVersion: e.workflowVersion,
    triggeredBy: e.triggeredBy,
    status: e.status,
    triggerPayload: e.triggerPayload,
    result: e.result,
    error: e.error,
    startedAt: e.startedAt.toISOString(),
    completedAt: e.completedAt ? e.completedAt.toISOString() : null,
    totalCost: e.totalCost != null ? Number(e.totalCost) : null,
    totalLatencyMs: e.totalLatencyMs,
  };
}

function serializeStep(s: ExecutionStep) {
  return {
    id: s.id,
    executionId: s.executionId,
    stepId: s.stepId,
    stepName: s.stepName,
    systemLevel: s.systemLevel,
    status: s.status,
    input: s.input,
    output: s.output,
    llmCalls: s.llmCalls,
    toolCalls: s.toolCalls,
    latencyMs: s.latencyMs,
    cost: s.cost != null ? Number(s.cost) : null,
    startedAt: s.startedAt.toISOString(),
    completedAt: s.completedAt ? s.completedAt.toISOString() : null,
  };
}

router.get("/executions", async (req, res): Promise<void> => {
  const query = ListExecutionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let executions = await db.select().from(executionsTable).orderBy(desc(executionsTable.startedAt));

  if (query.data.workflowId) {
    const wfId = query.data.workflowId;
    executions = executions.filter((e) => e.workflowId === wfId);
  }

  const limit = query.data.limit ?? 50;
  executions = executions.slice(0, limit);

  res.json(executions.map(serializeExecution));
});

router.post("/executions", async (req, res): Promise<void> => {
  const parsed = CreateExecutionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { workflowId, inputData } = parsed.data;

  const [workflow] = await db.select().from(workflowsTable).where(eq(workflowsTable.id, workflowId));
  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  if (workflow.phase !== "deployed") {
    res.status(400).json({ error: "Workflow must be deployed before it can be run" });
    return;
  }

  // SIMULATED — see header comment. The fields below are synthesised so
  // the Command Center has a populated timeline; they are NOT measurements
  // from a real run. Real executions come from the harness emit path
  // (skills/emit.md → generated framework code).
  const latencyMs = workflow.estimatedLatencyMs ?? Math.floor(Math.random() * 8000) + 2000;
  const costUsd = workflow.estimatedCostPerRun != null
    ? Number(workflow.estimatedCostPerRun)
    : Math.random() * 0.1;
  const success = Math.random() > 0.1;

  const startedAt = new Date();
  const completedAt = new Date(startedAt.getTime() + latencyMs);

  const [execution] = await db.insert(executionsTable).values({
    workflowId,
    triggeredBy: "manual",
    status: success ? "success" : "failed",
    startedAt,
    completedAt,
    totalLatencyMs: latencyMs,
    totalCost: costUsd.toFixed(6),
    triggerPayload: inputData ?? null,
    result: success ? { output: "Execution completed successfully" } : null,
    error: success ? null : { message: "Simulated execution failure" },
  }).returning();

  res.status(201).json(serializeExecution(execution));
});

router.get("/executions/:id", async (req, res): Promise<void> => {
  const params = GetExecutionParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [execution] = await db
    .select()
    .from(executionsTable)
    .where(eq(executionsTable.id, params.data.id));

  if (!execution) {
    res.status(404).json({ error: "Execution not found" });
    return;
  }

  const steps = await db
    .select()
    .from(executionStepsTable)
    .where(eq(executionStepsTable.executionId, params.data.id))
    .orderBy(executionStepsTable.startedAt);

  res.json({
    execution: serializeExecution(execution),
    steps: steps.map(serializeStep),
  });
});

export default router;
