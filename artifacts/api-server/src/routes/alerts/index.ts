import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { alertsTable } from "@workspace/db";
import type { Alert } from "@workspace/db";
import {
  ListAlertsQueryParams,
  AcknowledgeAlertParams,
  ResolveAlertParams,
  DeleteAlertParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeAlert(a: Alert) {
  return {
    id: a.id,
    workflowId: a.workflowId,
    alertType: a.alertType,
    severity: a.severity,
    title: a.title,
    description: a.description,
    evidence: a.evidence,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    acknowledgedAt: a.acknowledgedAt ? a.acknowledgedAt.toISOString() : null,
    resolvedAt: a.resolvedAt ? a.resolvedAt.toISOString() : null,
  };
}

router.get("/alerts", async (req, res): Promise<void> => {
  const query = ListAlertsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let alerts = await db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt));

  if (query.data.workflowId) {
    const wfId = query.data.workflowId;
    alerts = alerts.filter((a) => a.workflowId === wfId);
  }

  if (query.data.status) {
    const s = query.data.status;
    alerts = alerts.filter((a) => a.status === s);
  }

  res.json(alerts.map(serializeAlert));
});

router.post("/alerts/:id/acknowledge", async (req, res): Promise<void> => {
  const params = AcknowledgeAlertParams.safeParse({ id: req.params.id });
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
  const params = ResolveAlertParams.safeParse({ id: req.params.id });
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

router.delete("/alerts/:id", async (req, res): Promise<void> => {
  const params = DeleteAlertParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(alertsTable)
    .where(eq(alertsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json({ success: true, id: params.data.id });
});

export default router;
