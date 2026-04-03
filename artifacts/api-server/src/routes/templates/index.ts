import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { templatesTable, workflowsTable } from "@workspace/db";
import {
  ListTemplatesQueryParams,
  GetTemplateParams,
  DeployTemplateParams,
  DeployTemplateBody,
  CreateTemplateBody,
  UpdateTemplateParams,
  UpdateTemplateBody,
  DeleteTemplateParams,
} from "@workspace/api-zod";
import type { Template as SelectTemplate } from "@workspace/db";

const router: IRouter = Router();

function serializeTemplate(t: SelectTemplate) {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    domain: t.domain,
    tags: Array.isArray(t.tags) ? t.tags : [],
    rating: Number(t.rating ?? 0),
    usageCount: t.usageCount,
    estimatedCostPerRun: t.estimatedCostPerRun != null ? Number(t.estimatedCostPerRun) : null,
    estimatedLatencyMs: t.estimatedLatencyMs,
    isPublic: t.isPublic,
    nodes: Array.isArray(t.nodes) ? t.nodes : [],
    edges: Array.isArray(t.edges) ? t.edges : [],
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/templates", async (req, res): Promise<void> => {
  const query = ListTemplatesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let templates = await db.select().from(templatesTable).orderBy(templatesTable.usageCount);

  if (query.data.domain) {
    const d = query.data.domain;
    templates = templates.filter((t) => t.domain === d);
  }

  if (query.data.search) {
    const s = query.data.search.toLowerCase();
    templates = templates.filter(
      (t) => t.name.toLowerCase().includes(s) || (t.description ?? "").toLowerCase().includes(s)
    );
  }

  res.json(templates.map(serializeTemplate));
});

router.get("/templates/:id", async (req, res): Promise<void> => {
  const params = GetTemplateParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, params.data.id));
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.json(serializeTemplate(template));
});

router.post("/templates/:id/deploy", async (req, res): Promise<void> => {
  const params = DeployTemplateParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = DeployTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, params.data.id));
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  await db.update(templatesTable)
    .set({ usageCount: template.usageCount + 1 })
    .where(eq(templatesTable.id, template.id));

  const defaultGovConfig = {
    loggingLevel: "standard",
    autoSnapshot: true,
    latencyThreshold: 30000,
    costThreshold: 0.5,
    errorRateThreshold: 0.05,
    alertChannels: ["slack"],
  };

  const [workflow] = await db.insert(workflowsTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? template.description,
    domain: template.domain,
    tags: Array.isArray(template.tags) ? (template.tags as string[]) : [],
    nodes: Array.isArray(template.nodes) ? template.nodes : [],
    edges: Array.isArray(template.edges) ? template.edges : [],
    governanceConfig: defaultGovConfig,
    systemTypeSummary: {},
    phase: "deployed",
    status: "active",
    estimatedCostPerRun: template.estimatedCostPerRun,
    estimatedLatencyMs: template.estimatedLatencyMs,
  }).returning();

  res.status(201).json({
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    domain: workflow.domain,
    status: workflow.status,
    phase: workflow.phase,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
    estimatedCostPerRun: workflow.estimatedCostPerRun != null ? Number(workflow.estimatedCostPerRun) : null,
    nodes: Array.isArray(workflow.nodes) ? workflow.nodes : [],
    edges: Array.isArray(workflow.edges) ? workflow.edges : [],
    tags: Array.isArray(workflow.tags) ? workflow.tags : [],
    systemTypeSummary: {},
    governanceConfig: workflow.governanceConfig ?? {},
  });
});

router.post("/templates", async (req, res): Promise<void> => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [template] = await db.insert(templatesTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    domain: parsed.data.domain ?? null,
    tags: parsed.data.tags,
    isPublic: parsed.data.isPublic,
    estimatedCostPerRun: parsed.data.estimatedCostPerRun != null ? String(parsed.data.estimatedCostPerRun) : null,
    estimatedLatencyMs: parsed.data.estimatedLatencyMs ?? null,
    nodes: parsed.data.nodes as unknown[],
    edges: parsed.data.edges as unknown[],
  }).returning();

  res.status(201).json(serializeTemplate(template));
});

router.patch("/templates/:id", async (req, res): Promise<void> => {
  const params = UpdateTemplateParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(templatesTable).where(eq(templatesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const updateData: Partial<typeof templatesTable.$inferInsert> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.domain !== undefined) updateData.domain = parsed.data.domain;
  if (parsed.data.tags != null) updateData.tags = parsed.data.tags;
  if (parsed.data.isPublic != null) updateData.isPublic = parsed.data.isPublic;
  if (parsed.data.estimatedCostPerRun !== undefined) {
    updateData.estimatedCostPerRun = parsed.data.estimatedCostPerRun != null ? String(parsed.data.estimatedCostPerRun) : null;
  }
  if (parsed.data.estimatedLatencyMs !== undefined) updateData.estimatedLatencyMs = parsed.data.estimatedLatencyMs;
  if (parsed.data.nodes != null) updateData.nodes = parsed.data.nodes as unknown[];
  if (parsed.data.edges != null) updateData.edges = parsed.data.edges as unknown[];

  const [updated] = await db.update(templatesTable)
    .set(updateData)
    .where(eq(templatesTable.id, params.data.id))
    .returning();

  res.json(serializeTemplate(updated));
});

router.delete("/templates/:id", async (req, res): Promise<void> => {
  const params = DeleteTemplateParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(templatesTable)
    .where(eq(templatesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.json({ success: true, id: params.data.id });
});

export default router;
