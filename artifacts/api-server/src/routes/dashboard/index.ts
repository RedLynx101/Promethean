import { Router, type IRouter } from "express";
import { eq, desc, gte, sql, and, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { workflowsTable, executionsTable, alertsTable } from "@workspace/db";
import { GetDashboardActivityQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const allWorkflows = await db.select().from(workflowsTable);
  const activeWorkflows = allWorkflows.filter((w) => w.status === "active");

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentExecutions = await db
    .select()
    .from(executionsTable)
    .where(gte(executionsTable.startedAt, yesterday));

  const successfulExecutions = recentExecutions.filter((e) => e.status === "success");
  const successRate = recentExecutions.length > 0
    ? (successfulExecutions.length / recentExecutions.length) * 100
    : 100;

  const completedExecutions = recentExecutions.filter(
    (e) => e.totalLatencyMs != null
  );
  const avgLatency = completedExecutions.length > 0
    ? Math.round(completedExecutions.reduce((sum, e) => sum + (e.totalLatencyMs ?? 0), 0) / completedExecutions.length)
    : null;

  const totalCost = recentExecutions.reduce((sum, e) => sum + Number(e.totalCost ?? 0), 0);

  const activeAlerts = await db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.status, "active"));

  // Build workflow summaries
  const workflowSummaries = await Promise.all(
    allWorkflows.map(async (w) => {
      const wfExecutions = await db
        .select()
        .from(executionsTable)
        .where(eq(executionsTable.workflowId, w.id))
        .orderBy(desc(executionsTable.startedAt));

      const wfAlerts = activeAlerts.filter((a) => a.workflowId === w.id);
      const total = wfExecutions.length;
      const successful = wfExecutions.filter((e) => e.status === "success").length;
      const wfSuccessRate = total > 0 ? (successful / total) * 100 : 100;
      const lastRun = wfExecutions[0];

      return {
        id: w.id,
        name: w.name,
        status: w.status,
        phase: w.phase,
        successRate: Math.round(wfSuccessRate * 10) / 10,
        lastRunAt: lastRun ? lastRun.startedAt.toISOString() : null,
        totalRuns: total,
        activeAlerts: wfAlerts.length,
      };
    })
  );

  res.json({
    totalWorkflows: allWorkflows.length,
    activeWorkflows: activeWorkflows.length,
    totalExecutions24h: recentExecutions.length,
    successRate: Math.round(successRate * 10) / 10,
    avgLatencyMs: avgLatency,
    totalCost24h: Math.round(totalCost * 10000) / 10000,
    activeAlerts: activeAlerts.length,
    workflows: workflowSummaries,
  });
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const query = GetDashboardActivityQueryParams.safeParse(req.query);
  const days = query.success ? (query.data.days ?? 14) : 14;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const executions = await db
    .select()
    .from(executionsTable)
    .where(gte(executionsTable.startedAt, since))
    .orderBy(executionsTable.startedAt);

  // Group by date
  const byDate: Record<string, { executions: number; successes: number; failures: number; cost: number }> = {};

  // Initialize all dates
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split("T")[0];
    byDate[key] = { executions: 0, successes: 0, failures: 0, cost: 0 };
  }

  executions.forEach((e) => {
    const key = e.startedAt.toISOString().split("T")[0];
    if (!byDate[key]) byDate[key] = { executions: 0, successes: 0, failures: 0, cost: 0 };
    byDate[key].executions++;
    if (e.status === "success") byDate[key].successes++;
    if (e.status === "failed") byDate[key].failures++;
    byDate[key].cost += Number(e.totalCost ?? 0);
  });

  const activity = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  res.json(activity);
});

export default router;
