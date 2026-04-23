# Promethean Vault

A curated, Obsidian-compatible markdown knowledge base. Two roles:

1. **Cookbook at emit time.** The canonical role. When a workflow is approved in the Promethean UI and the user clicks "Build," the [`emit` skill](../skills/emit.md) reads this vault to translate abstract node descriptions (`data.tools: ["integration-github-api"]`, `data.errorHandling: "retry-with-backoff"`, `edge.type: "parallel"`) into real runnable code in the target framework.
2. **Human reference documentation.** When a reviewer is editing a phase in the UI, these notes are the canonical doctrine — why L3 exists, when HumanGate is mandatory, what governance profile to pick per risk level. The in-process agents' system prompts were written from this material; the notes are the authoritative source humans consult.

The vault is agent-consumable via the [`@workspace/mcp-vault`](../artifacts/mcp-vault/) MCP server (stdio, five tools), and human-consumable by opening the folder in Obsidian or any markdown editor.

## Folder layout

```
vault/
├── README.md              ← you are here
├── integrations/          ← cookbook entries (primary role at emit time)
├── patterns/              ← cookbook entries (primary role at emit time)
├── spectrum/              ← reference doctrine (consulted by humans in the UI)
├── governance/            ← reference doctrine + emit-time middleware specs
└── templates/             ← reference workflows (documentation, not runtime input)
```

### Folder roles at emit time

| Folder | Role during emit | Example use |
|--------|------------------|-------------|
| `integrations/` | **Primary.** Per-tool auth, idempotency, rate limits, common failures, structured-output schemas. Emit reads one note per tool referenced in the graph. | `data.tools: ["integration-slack-api"]` → emit reads `vault/integrations/integration-slack-api.md` to generate the actual Slack posting code with HMAC verify, dedup key, retry policy. |
| `patterns/` | **Primary.** Semantics for edge types and error-handling strategies. Emit reads these to translate abstract edge types into framework idioms. | `edge.type: "parallel"` with `data.condition` set → emit reads `pattern-parallel.md` + `pattern-conditional.md` to decide between LangGraph's concurrent sub-graphs vs Inngest parallel steps. |
| `governance/` | **Primary** for the middleware spec. Emit reads these to generate cost/latency/timeout/alerting wrappers around the node graph. | `governanceConfig.costLimitPerRun: 2.00` → emit reads `governance-cost-limit.md` to generate the counter + hard-kill enforcement. |
| `spectrum/` | **Reference only** at emit time (the decisions are already baked into `nodes[*].data.systemLevel`). Consulted during UI review when a human wants to justify or change a level. | Human reviewing phase 2 asks "should this really be L4?" → opens `vault/spectrum/L4-tool-augmented-llm.md` in the UI sidebar. |
| `templates/` | **Reference only** at emit time. Useful prior art when a human is kicking off a new workflow similar to an existing one. | UI Wizard could surface these as "start from a template" suggestions — not currently wired. |

## File conventions

Every note has YAML frontmatter:

```yaml
---
type: spectrum-level | governance-policy | pattern | integration | template
id: stable-kebab-id
tags: [tag1, tag2]
linksTo: [other-note-id, ...]
---
```

Use `[[wikilinks]]` between notes. The MCP server (`artifacts/mcp-vault/`) parses frontmatter and resolves links so an agent (or a reader in Obsidian's graph view) can traverse the graph the same way.

## Adding new integration notes

When a workflow references a tool that doesn't have a `vault/integrations/integration-<tool>.md` note, the emit skill is instructed to **stop and ask** rather than improvise auth or idempotency. Add the note first. Copy any existing one as a template and fill in:

- Auth (env vars, OAuth scopes, signing)
- Idempotency (dedup key strategy, upsert vs insert)
- Rate limits and retry behaviour
- Common failure modes
- Structured-output schemas (Zod / Pydantic snippets)
- Anti-patterns

The vault grows organically as the team adopts new tools. Quality of emitted code ≈ quality of the cookbook.

## Sub-indexes

- [`integrations/integration-index.md`](integrations/integration-index.md) — the tool registry
- [`patterns/pattern-index.md`](patterns/pattern-index.md) — orchestration patterns
- [`spectrum/spectrum-index.md`](spectrum/spectrum-index.md) — the 6-level spectrum (reference)
- [`governance/governance-index.md`](governance/governance-index.md) — governance policies (reference + emit-time middleware spec)
- [`templates/template-index.md`](templates/template-index.md) — reference workflows
