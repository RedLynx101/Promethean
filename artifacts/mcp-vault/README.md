# @workspace/mcp-vault

A minimal **Model Context Protocol** server that exposes the Promethean [`vault/`](../../vault/) knowledge base to any harnessed AI agent (Claude Code, Codex, Microsoft Agent Factory, MCP-aware IDEs).

The server is the bridge in the new architecture (see [`PIVOT.md`](../../PIVOT.md)) — instead of Promethean executing workflows itself, an external agent reads this vault via MCP, takes a user brief, and emits real artefacts.

Built binary: `dist/index.js` (ESM — package is `"type": "module"`).

## Tools exposed

| Tool | Description |
|------|-------------|
| `vault_list` | List notes by folder (`spectrum`, `governance`, `patterns`, `integrations`, `templates`, or `all`). |
| `vault_get` | Fetch a single note by id (frontmatter `id:`) or relative path. Returns `{ frontmatter, body, links }`. |
| `vault_search` | Keyword search across all notes (frontmatter + body). Returns ranked excerpts. |
| `spectrum_schema` | Return the Promethean node / edge / governance JSON schemas so the agent can validate its proposals. |

## Run

```bash
pnpm --filter @workspace/mcp-vault install
pnpm --filter @workspace/mcp-vault run dev   # tsx-watched stdio server
# or
pnpm --filter @workspace/mcp-vault run build && pnpm --filter @workspace/mcp-vault run start
```

The server speaks **stdio** transport — wire it into any MCP-aware harness via its config (see [`PIVOT.md`](../../PIVOT.md) for Claude Code / Codex examples).

## Configuration

Two env vars, both optional:

- `VAULT_DIR` — absolute path to the vault root. Default: resolved from this package up to `<repo>/vault`.
- `MCP_VAULT_LOG_LEVEL` — `silent | info | debug`. Default `info`. Logs go to stderr (stdout is reserved for the MCP protocol).
