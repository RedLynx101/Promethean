import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { executionsTable, executionStepsTable } from "@workspace/db";
import {
  ListExecutionsQueryParams,
  GetExecutionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/executions", async (req, res): Promise<void> => {
  const query = ListExecutionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let dbQuery = db.select().from(executionsTable).orderBy(desc(executionsTable.startedAt));

  const executions = await dbQuery;
  let filtered = executions;

  if (query.data.workflowId) {
    filtered = filtered.filter((e) => e.workflowId === query.data.workflowId);
  }

  const limit = query.data.limit ?? 50;
  filtered = filtered.slice(0, limit);

  res.json(filtered.map(serializeExecution));
});

router.get("/executions/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetExecutionParams.safeParse({ id: rawId });
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

function serializeExecution(e: Record<string, unknown>) {
  return {
    ...e,
    startedAt: (e.startedAt as Date).toISOString(),
    completedAt: e.completedAt ? (e.completedAt as Date).toISOString() : null,
    totalCost: e.totalCost != null ? Number(e.totalCost) : null,
  };
}

function serializeStep(s: Record<string, unknown>) {
  return {
    ...s,
    startedAt: (s.startedAt as Date).toISOString(),
    completedAt: s.completedAt ? (s.completedAt as Date).toISOString() : null,
    cost: s.cost != null ? Number(s.cost) : null,
  };
}

export default router;
