import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { alertsTable } from "@workspace/db";
import {
  ListAlertsQueryParams,
  AcknowledgeAlertParams,
  ResolveAlertParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/alerts", async (req, res): Promise<void> => {
  const query = ListAlertsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let alerts = await db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt));

  if (query.data.workflowId) {
    alerts = alerts.filter((a) => a.workflowId === query.data.workflowId);
  }

  if (query.data.status) {
    alerts = alerts.filter((a) => a.status === query.data.status);
  }

  res.json(alerts.map(serializeAlert));
});

router.post("/alerts/:id/acknowledge", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AcknowledgeAlertParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [alert] = await db
    .update(alertsTable)
    .set({ status: "acknowledged", acknowledgedAt: new Date() })
    .where(eq(alertsTable.id, params.data.id))
    .returning();

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json(serializeAlert(alert));
});

router.post("/alerts/:id/resolve", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ResolveAlertParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [alert] = await db
    .update(alertsTable)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(alertsTable.id, params.data.id))
    .returning();

  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json(serializeAlert(alert));
});

function serializeAlert(a: Record<string, unknown>) {
  return {
    ...a,
    createdAt: (a.createdAt as Date).toISOString(),
    acknowledgedAt: a.acknowledgedAt ? (a.acknowledgedAt as Date).toISOString() : null,
    resolvedAt: a.resolvedAt ? (a.resolvedAt as Date).toISOString() : null,
  };
}

export default router;
