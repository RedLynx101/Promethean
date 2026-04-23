/**
 * Emit endpoint — the canonical pivot surface.
 * =====================================================================
 * POST /api/workflows/:id/emit { targetFramework }
 *
 * Triggered by the "Build" button in the Promethean UI after all four
 * design phases have been approved. Writes an emit-request manifest to
 * ./emit-requests/<workflowId>-<timestamp>.json that a harnessed agent
 * (Claude Code, Codex, MS Agent Factory) running skills/emit.md picks
 * up to produce real runnable code in ./out/<workflow-slug>/.
 *
 * This is the boundary between:
 *   - the in-process four-agent design pipeline (Express + React UI)
 *   - the vault-driven cookbook-at-emit code generator (harness + MCP)
 *
 * The endpoint itself does NOT spawn the harness — that's deliberately
 * out-of-process so the API server stays stateless and so the harness
 * can be driven from whatever environment has the right credentials
 * (a developer's laptop, a CI worker, etc.).
 *
 * See PIVOT.md § "The emit boundary" and skills/emit.md for the full
 * contract an emitting harness must satisfy.
 * =====================================================================
 */
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { db } from "@workspace/db";
import { workflowsTable } from "@workspace/db";
import { logger } from "../../lib/logger";

const VALID_TARGETS = [
  "langgraph-js",
  "langgraph-py",
  "inngest",
  "temporal",
  "n8n",
  "claude-agent-sdk",
  "python-script",
] as const;

const EmitBodySchema = z.object({
  targetFramework: z.enum(VALID_TARGETS),
  targetDir: z.string().optional(),
});

const EmitParamsSchema = z.object({
  id: z.string().uuid(),
});

const router: IRouter = Router();

/**
 * Resolve the emit-requests directory at runtime. Configurable via
 * EMIT_REQUESTS_DIR so deployments can point it at shared storage
 * (S3FUSE, NFS) that the harness worker also watches.
 */
function emitRequestsDir(): string {
  return (
    process.env.EMIT_REQUESTS_DIR ??
    path.resolve(process.cwd(), "..", "..", "emit-requests")
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "workflow";
}

router.post("/workflows/:id/emit", async (req, res): Promise<void> => {
  const params = EmitParamsSchema.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = EmitBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
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

  // The UI should only surface the Build button for fully-approved workflows,
  // but enforce server-side too. Accept `deployed` (legacy) or `govern` (the
  // final design phase is approved but the workflow hasn't been marked
  // deployed in the old simulated sense).
  if (workflow.phase !== "deployed" && workflow.phase !== "govern") {
    res.status(400).json({
      error:
        "Workflow must complete all four design phases before emission. Current phase: " +
        workflow.phase,
    });
    return;
  }

  const slug = slugify(workflow.name);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const requestId = `${slug}-${timestamp}`;
  const targetDir =
    body.data.targetDir ?? path.posix.join("out", slug);

  const manifest = {
    requestId,
    workflowId: workflow.id,
    workflowName: workflow.name,
    workflowVersion: workflow.version,
    targetFramework: body.data.targetFramework,
    targetDir,
    requestedAt: new Date().toISOString(),
    status: "pending" as const,
    // Full approved workflow JSON — the emit skill's input.
    workflow: {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      domain: workflow.domain,
      nodes: workflow.nodes ?? [],
      edges: workflow.edges ?? [],
      governanceConfig: workflow.governanceConfig ?? {},
      systemTypeSummary: workflow.systemTypeSummary ?? {},
      estimatedCostPerRun: workflow.estimatedCostPerRun,
      estimatedLatencyMs: workflow.estimatedLatencyMs,
    },
    // How the harness should pick this up. See PIVOT.md.
    harnessInstructions: {
      skillToLoad: "skills/emit.md",
      mcpServer: "promethean-vault",
      nextSteps: [
        `Load skills/emit.md.`,
        `Validate every tool referenced in nodes[*].data.tools[] against vault/integrations/ via vault_get.`,
        `Generate code into ${targetDir}/.`,
        `Write ${targetDir}/EMIT_MANIFEST.json with status + filesWritten when done.`,
      ],
    },
  };

  const dir = emitRequestsDir();
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${requestId}.json`);
  await fs.writeFile(filePath, JSON.stringify(manifest, null, 2), "utf8");

  logger.info(
    { requestId, workflowId: workflow.id, targetFramework: body.data.targetFramework, filePath },
    "emit request written"
  );

  res.status(202).json({
    status: "accepted",
    requestId,
    requestFile: filePath,
    message:
      "Emit request written. Start a harness session (e.g., `claude` from repo root) and instruct it to load skills/emit.md with this request. See PIVOT.md § 'The emit boundary'.",
    targetDir,
  });
});

/**
 * GET /api/workflows/:id/emit — list emit-request manifests for a
 * workflow so the UI can show a "Build history" panel.
 */
router.get("/workflows/:id/emit", async (req, res): Promise<void> => {
  const params = EmitParamsSchema.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const dir = emitRequestsDir();
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  const manifests = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        try {
          const raw = await fs.readFile(path.join(dir, f), "utf8");
          const m = JSON.parse(raw) as { workflowId?: string };
          return m.workflowId === params.data.id ? m : null;
        } catch {
          return null;
        }
      })
  );

  res.json({
    workflowId: params.data.id,
    emitRequests: manifests.filter((m): m is NonNullable<typeof m> => m !== null),
  });
});

export default router;
