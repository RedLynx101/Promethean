import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { workflowsTable, workflowVersionsTable } from "@workspace/db";
import {
  CreateWorkflowBody,
  UpdateWorkflowBody,
  GetWorkflowParams,
  UpdateWorkflowParams,
  DeleteWorkflowParams,
  ListWorkflowVersionsParams,
} from "@workspace/api-zod";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

router.get("/workflows", async (req, res): Promise<void> => {
  const workflows = await db.select().from(workflowsTable).orderBy(desc(workflowsTable.updatedAt));
  res.json(workflows.map(serializeWorkflow));
});

router.post("/workflows", async (req, res): Promise<void> => {
  const parsed = CreateWorkflowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [workflow] = await db
    .insert(workflowsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      domain: parsed.data.domain ?? null,
      tags: parsed.data.tags ?? [],
      nodes: [],
      edges: [],
      governanceConfig: {
        loggingLevel: "standard",
        autoSnapshot: true,
        latencyThreshold: 30000,
        costThreshold: 0.5,
        errorRateThreshold: 0.05,
        alertChannels: ["slack"],
      },
      systemTypeSummary: {},
    })
    .returning();

  res.status(201).json(serializeWorkflow(workflow));
});

router.get("/workflows/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetWorkflowParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [workflow] = await db
    .select()
    .from(workflowsTable)
    .where(eq(workflowsTable.id, params.data.id));

  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  res.json(serializeWorkflow(workflow));
});

router.patch("/workflows/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateWorkflowParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateWorkflowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.nodes !== undefined) updateData.nodes = parsed.data.nodes;
  if (parsed.data.edges !== undefined) updateData.edges = parsed.data.edges;
  if (parsed.data.governanceConfig !== undefined) updateData.governanceConfig = parsed.data.governanceConfig;
  if (parsed.data.triggerType !== undefined) updateData.triggerType = parsed.data.triggerType;
  if (parsed.data.domain !== undefined) updateData.domain = parsed.data.domain;
  if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags;

  const [workflow] = await db
    .update(workflowsTable)
    .set(updateData)
    .where(eq(workflowsTable.id, params.data.id))
    .returning();

  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  res.json(serializeWorkflow(workflow));
});

router.delete("/workflows/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteWorkflowParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [workflow] = await db
    .delete(workflowsTable)
    .where(eq(workflowsTable.id, params.data.id))
    .returning();

  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/workflows/:id/versions", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ListWorkflowVersionsParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const versions = await db
    .select()
    .from(workflowVersionsTable)
    .where(eq(workflowVersionsTable.workflowId, params.data.id))
    .orderBy(desc(workflowVersionsTable.createdAt));

  res.json(versions.map((v) => ({
    ...v,
    createdAt: v.createdAt.toISOString(),
  })));
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
