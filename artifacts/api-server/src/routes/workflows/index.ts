import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { workflowsTable, workflowVersionsTable } from "@workspace/db";
import type { Workflow } from "@workspace/db";
import {
  CreateWorkflowBody,
  UpdateWorkflowBody,
  GetWorkflowParams,
  UpdateWorkflowParams,
  DeleteWorkflowParams,
  ListWorkflowVersionsParams,
} from "@workspace/api-zod";
import { layoutNodes } from "../../lib/agents/layout";

const router: IRouter = Router();

function serializeWorkflow(w: Workflow) {
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    status: w.status,
    phase: w.phase,
    version: w.version,
    domain: w.domain,
    tags: Array.isArray(w.tags) ? w.tags : [],
    nodes: Array.isArray(w.nodes) ? w.nodes : [],
    edges: Array.isArray(w.edges) ? w.edges : [],
    systemTypeSummary: (w.systemTypeSummary as Record<string, number>) ?? {},
    governanceConfig: w.governanceConfig ?? {},
    workflowBrief: w.workflowBrief,
    triggerType: w.triggerType,
    estimatedCostPerRun: w.estimatedCostPerRun != null ? Number(w.estimatedCostPerRun) : null,
    estimatedLatencyMs: w.estimatedLatencyMs,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

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
  const params = GetWorkflowParams.safeParse({ id: req.params.id });
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
  const params = UpdateWorkflowParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateWorkflowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof workflowsTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.nodes !== undefined) updateData.nodes = parsed.data.nodes as unknown[];
  if (parsed.data.edges !== undefined) updateData.edges = parsed.data.edges as unknown[];
  if (parsed.data.governanceConfig !== undefined) updateData.governanceConfig = parsed.data.governanceConfig as Record<string, unknown>;
  if (parsed.data.triggerType !== undefined) updateData.triggerType = parsed.data.triggerType;
  if (parsed.data.domain !== undefined) updateData.domain = parsed.data.domain;
  if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags as string[];

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

router.post("/workflows/:id/relayout", async (req, res): Promise<void> => {
  const params = GetWorkflowParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [workflow] = await db.select().from(workflowsTable).where(eq(workflowsTable.id, params.data.id));
  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  const nodes = (Array.isArray(workflow.nodes) ? workflow.nodes : []) as Array<{ id: string; position?: { x: number; y: number }; data?: Record<string, unknown> }>;
  const edges = (Array.isArray(workflow.edges) ? workflow.edges : []) as Array<{ source: string; target: string }>;
  const relaid = layoutNodes(nodes, edges);

  const [updated] = await db
    .update(workflowsTable)
    .set({ nodes: relaid as unknown, updatedAt: new Date() })
    .where(eq(workflowsTable.id, params.data.id))
    .returning();

  res.json(serializeWorkflow(updated));
});

router.delete("/workflows/:id", async (req, res): Promise<void> => {
  const params = DeleteWorkflowParams.safeParse({ id: req.params.id });
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
  const params = ListWorkflowVersionsParams.safeParse({ id: req.params.id });
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
    id: v.id,
    workflowId: v.workflowId,
    version: v.version,
    definition: v.definition,
    changelog: v.changelog,
    createdAt: v.createdAt.toISOString(),
  })));
});

export default router;
