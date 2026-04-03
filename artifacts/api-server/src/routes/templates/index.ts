import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { templatesTable, workflowsTable } from "@workspace/db";
import {
  ListTemplatesQueryParams,
  GetTemplateParams,
  DeployTemplateParams,
  DeployTemplateBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/templates", async (req, res): Promise<void> => {
  const query = ListTemplatesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let templates = await db.select().from(templatesTable).orderBy(templatesTable.usageCount);

  if (query.data.domain) {
    templates = templates.filter((t) => t.domain === query.data.domain);
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
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetTemplateParams.safeParse({ id: rawId });
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
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeployTemplateParams.safeParse({ id: rawId });
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

  // Increment usage count
  await db.update(templatesTable)
    .set({ usageCount: template.usageCount + 1 })
    .where(eq(templatesTable.id, template.id));

  // Create workflow from template
  const [workflow] = await db.insert(workflowsTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? template.description,
    domain: template.domain,
    tags: template.tags,
    nodes: template.nodes as never,
    edges: template.edges as never,
    governanceConfig: {
      loggingLevel: "standard",
      autoSnapshot: true,
      latencyThreshold: 30000,
      costThreshold: 0.5,
      errorRateThreshold: 0.05,
      alertChannels: ["slack"],
    } as never,
    systemTypeSummary: {} as never,
    phase: "deployed",
    status: "active",
    estimatedCostPerRun: template.estimatedCostPerRun,
    estimatedLatencyMs: template.estimatedLatencyMs,
  }).returning();

  res.status(201).json({
    ...workflow,
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

function serializeTemplate(t: Record<string, unknown>) {
  return {
    ...t,
    createdAt: (t.createdAt as Date).toISOString(),
    rating: Number(t.rating ?? 0),
    estimatedCostPerRun: t.estimatedCostPerRun != null ? Number(t.estimatedCostPerRun) : null,
    nodes: Array.isArray(t.nodes) ? t.nodes : [],
    edges: Array.isArray(t.edges) ? t.edges : [],
    tags: Array.isArray(t.tags) ? t.tags : [],
  };
}

export default router;
