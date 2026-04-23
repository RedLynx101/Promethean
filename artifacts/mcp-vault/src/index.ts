#!/usr/bin/env node
/**
 * Promethean MCP Vault server.
 *
 * Exposes the markdown-based vault at <repo>/vault to any MCP-aware harness
 * (Claude Code, Codex, Microsoft Agent Factory, etc.) so a harnessed agent
 * can read spectrum, governance, patterns, integrations, and templates the
 * same way the in-process Promethean agents read them today.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import matter from "gray-matter";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const VAULT_DIR =
  process.env.VAULT_DIR ?? path.resolve(__dirname, "..", "..", "..", "vault");

const LOG_LEVEL = (process.env.MCP_VAULT_LOG_LEVEL ?? "info") as
  | "silent"
  | "info"
  | "debug";

function log(level: "info" | "debug", ...args: unknown[]): void {
  if (LOG_LEVEL === "silent") return;
  if (level === "debug" && LOG_LEVEL !== "debug") return;
  // stderr — never stdout (reserved for MCP protocol)
  // eslint-disable-next-line no-console
  console.error(`[mcp-vault]`, ...args);
}

// ---------------------------------------------------------------------------
// Vault index
// ---------------------------------------------------------------------------

interface VaultNote {
  /** Stable id from frontmatter, falling back to relative path without extension. */
  id: string;
  /** Path relative to VAULT_DIR. */
  relPath: string;
  /** Absolute path. */
  absPath: string;
  /** Folder bucket: spectrum | governance | patterns | integrations | templates | root. */
  folder: string;
  frontmatter: Record<string, unknown>;
  body: string;
  /** [[wikilinks]] extracted from the body. */
  links: string[];
}

async function loadVault(): Promise<VaultNote[]> {
  const notes: VaultNote[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) continue;
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const raw = await fs.readFile(full, "utf8");
        const parsed = matter(raw);
        const relPath = path.relative(VAULT_DIR, full);
        const parts = relPath.split(path.sep);
        const folder = parts.length > 1 ? parts[0]! : "root";
        const id =
          (parsed.data.id as string | undefined) ??
          relPath.replace(/\.md$/, "").replace(/[\\/]/g, "/");

        notes.push({
          id,
          relPath,
          absPath: full,
          folder,
          frontmatter: parsed.data ?? {},
          body: parsed.content,
          links: extractWikilinks(parsed.content),
        });
      }
    }
  }

  await walk(VAULT_DIR);
  log("info", `loaded ${notes.length} notes from ${VAULT_DIR}`);
  return notes;
}

function extractWikilinks(body: string): string[] {
  const out = new Set<string>();
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    out.add(m[1]!.trim());
  }
  return [...out];
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

interface SearchHit {
  id: string;
  relPath: string;
  folder: string;
  score: number;
  excerpt: string;
}

function search(notes: VaultNote[], query: string, limit = 8): SearchHit[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (terms.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const n of notes) {
    const haystack = `${n.id}\n${JSON.stringify(n.frontmatter)}\n${n.body}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      const matches = haystack.split(t).length - 1;
      if (matches === 0) continue;
      // id / frontmatter hits weigh more
      const idHits = n.id.toLowerCase().split(t).length - 1;
      const fmHits =
        JSON.stringify(n.frontmatter).toLowerCase().split(t).length - 1;
      score += matches + idHits * 5 + fmHits * 2;
    }
    if (score === 0) continue;

    // Build an excerpt around the first match in the body
    const lcBody = n.body.toLowerCase();
    let excerptStart = 0;
    for (const t of terms) {
      const idx = lcBody.indexOf(t);
      if (idx >= 0) {
        excerptStart = Math.max(0, idx - 80);
        break;
      }
    }
    const excerpt =
      (excerptStart > 0 ? "…" : "") +
      n.body.slice(excerptStart, excerptStart + 240).replace(/\s+/g, " ").trim() +
      (excerptStart + 240 < n.body.length ? "…" : "");

    hits.push({
      id: n.id,
      relPath: n.relPath,
      folder: n.folder,
      score,
      excerpt,
    });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Spectrum schema (mirror of artifacts/api-server/src/lib/agents/schemas.ts)
// ---------------------------------------------------------------------------

const SPECTRUM_SCHEMA = {
  description:
    "Promethean node / edge / governance schemas. Mirror of artifacts/api-server/src/lib/agents/schemas.ts. Use these as the contract for any artefact the agent emits.",
  validEdgeTypes: ["default", "conditional", "error", "parallel", "loop"],
  spectrumLevels: [
    { id: "L0", name: "Deterministic", color: "#4CAF50" },
    { id: "L1", name: "Supervised ML", color: "#2196F3" },
    { id: "L2", name: "Language Understanding", color: "#9C27B0" },
    { id: "L3", name: "Single LLM Agent", color: "#FF9800" },
    { id: "L4", name: "Tool-Augmented LLM", color: "#F44336" },
    { id: "L5", name: "Multi-Agent", color: "#E91E63" },
  ],
  specialNodeCategories: ["trigger", "human_gate"],
  jsonSchema: {
    PrometheanNode: {
      type: "object",
      required: ["id", "type", "position", "data"],
      properties: {
        id: { type: "string" },
        type: { type: "string", const: "custom" },
        position: {
          type: "object",
          required: ["x", "y"],
          properties: { x: { type: "number" }, y: { type: "number" } },
        },
        data: {
          type: "object",
          required: ["label", "description"],
          properties: {
            label: { type: "string" },
            description: { type: "string" },
            systemLevel: { type: ["integer", "null"], minimum: 0, maximum: 5 },
            confidence: { type: ["integer", "null"], minimum: 0, maximum: 100 },
            rationale: { type: ["string", "null"] },
            tools: { type: "array", items: { type: "string" } },
            status: { type: "string", default: "idle" },
            conditions: { type: "array", items: { type: "string" } },
            errorHandling: { type: "string" },
            nodeCategory: {
              type: ["string", "null"],
              enum: ["trigger", "human_gate", null],
            },
          },
        },
      },
    },
    PrometheanEdge: {
      type: "object",
      required: ["id", "source", "target", "type"],
      properties: {
        id: { type: "string" },
        source: { type: "string" },
        target: { type: "string" },
        type: {
          type: "string",
          enum: ["default", "conditional", "error", "parallel", "loop"],
        },
        data: {
          type: "object",
          properties: {
            condition: { type: ["string", "null"] },
            label: { type: ["string", "null"] },
          },
        },
      },
    },
    GovernanceConfig: {
      type: "object",
      required: [
        "loggingLevel",
        "autoSnapshot",
        "latencyThreshold",
        "costThreshold",
        "errorRateThreshold",
        "alertChannels",
      ],
      properties: {
        loggingLevel: {
          type: "string",
          enum: ["minimal", "standard", "verbose", "debug"],
        },
        autoSnapshot: { type: "boolean" },
        latencyThreshold: { type: "number" },
        costThreshold: { type: "number" },
        errorRateThreshold: { type: "number", minimum: 0, maximum: 1 },
        alertChannels: {
          type: "array",
          items: {
            type: "string",
            enum: ["slack", "email", "pagerduty", "webhook"],
          },
        },
        costLimitPerRun: { type: "number" },
        executionTimeoutMs: { type: "number" },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  let notes = await loadVault();

  const server = new Server(
    {
      name: "promethean-mcp-vault",
      version: "0.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "vault_list",
        description:
          "List notes in the Promethean vault. Optionally filter by folder: spectrum | governance | patterns | integrations | templates | all.",
        inputSchema: {
          type: "object",
          properties: {
            folder: {
              type: "string",
              enum: [
                "spectrum",
                "governance",
                "patterns",
                "integrations",
                "templates",
                "all",
              ],
              default: "all",
            },
          },
        },
      },
      {
        name: "vault_get",
        description:
          "Fetch a single note by its frontmatter id (e.g., 'L3-single-llm-agent') or by its path relative to the vault root (e.g., 'spectrum/L3-single-llm-agent.md'). Returns frontmatter, body, and resolved wikilinks.",
        inputSchema: {
          type: "object",
          required: ["idOrPath"],
          properties: {
            idOrPath: { type: "string" },
          },
        },
      },
      {
        name: "vault_search",
        description:
          "Keyword search across all vault notes (frontmatter + body). Returns up to `limit` ranked hits with short excerpts. Use this when looking for prior art, applicable patterns, or relevant integrations for a brief.",
        inputSchema: {
          type: "object",
          required: ["query"],
          properties: {
            query: { type: "string" },
            limit: { type: "integer", minimum: 1, maximum: 30, default: 8 },
          },
        },
      },
      {
        name: "spectrum_schema",
        description:
          "Return the Promethean node / edge / governance JSON schemas. Use these to validate any proposal you generate before persisting it.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "vault_reload",
        description:
          "Re-scan VAULT_DIR. Call this if the human edited a vault note during the session.",
        inputSchema: { type: "object", properties: {} },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;

    switch (name) {
      case "vault_list": {
        const folder = (args.folder as string | undefined) ?? "all";
        const filtered =
          folder === "all" ? notes : notes.filter((n) => n.folder === folder);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                filtered.map((n) => ({
                  id: n.id,
                  folder: n.folder,
                  relPath: n.relPath,
                  type: n.frontmatter.type,
                  tags: n.frontmatter.tags,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case "vault_get": {
        const idOrPath = String(args.idOrPath ?? "");
        const note =
          notes.find((n) => n.id === idOrPath) ??
          notes.find((n) => n.relPath === idOrPath) ??
          notes.find(
            (n) => n.relPath === idOrPath.replace(/^\/+/, "")
          );
        if (!note) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `vault_get: no note found for "${idOrPath}". Try vault_list or vault_search.`,
              },
            ],
          };
        }
        // Resolve wikilink targets when possible
        const resolvedLinks = note.links.map((linkId) => {
          const target =
            notes.find((n) => n.id === linkId) ??
            notes.find((n) => n.relPath.endsWith(`${linkId}.md`));
          return {
            link: linkId,
            resolvedId: target?.id ?? null,
            resolvedPath: target?.relPath ?? null,
          };
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id: note.id,
                  relPath: note.relPath,
                  frontmatter: note.frontmatter,
                  body: note.body,
                  links: resolvedLinks,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "vault_search": {
        const query = String(args.query ?? "");
        const limit = Number(args.limit ?? 8);
        const hits = search(notes, query, limit);
        return {
          content: [
            { type: "text", text: JSON.stringify({ query, hits }, null, 2) },
          ],
        };
      }

      case "spectrum_schema": {
        return {
          content: [
            { type: "text", text: JSON.stringify(SPECTRUM_SCHEMA, null, 2) },
          ],
        };
      }

      case "vault_reload": {
        notes = await loadVault();
        return {
          content: [
            { type: "text", text: `reloaded ${notes.length} notes` },
          ],
        };
      }

      default:
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
        };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("info", "promethean-mcp-vault ready (stdio)");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[mcp-vault] fatal", err);
  process.exit(1);
});
