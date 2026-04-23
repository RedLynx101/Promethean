# Promethean Pivot — Emit-Phase Architecture

> **TL;DR.** The existing Promethean UI is great at **design** — the four-agent
> pipeline, the visual editor, the approval gates. What it's missing is
> **deploy**: `POST /executions` simulates runs with `Math.random()`. This
> pivot adds a fifth phase — **emit** — that translates the approved JSON
> from the UI into real runnable code (LangGraph / Inngest / Temporal / n8n /
> Claude Agent SDK / plain script), driven by a coding-agent harness reading
> a curated markdown cookbook (`vault/`) over MCP.
>
> The UI owns design. The vault owns deploy. Nothing about the existing UX
> changes; everything about "deployable" becomes real.

---

## Why this pivot

The README promises "fully orchestrated, governed, deployable pipeline." The
design side delivers — the four agents, the editor, the approval gates are
real and useful. The deploy side simulates; `POST /executions` fakes runs
with `Math.random()` (see [`artifacts/api-server/src/routes/executions/index.ts`](artifacts/api-server/src/routes/executions/index.ts)).

Building a real execution engine — durable workflow runtime, tool/credential
vault, retries, HumanGate suspend/resume, per-tenant isolation — is months
of plumbing. The shorter, more defensible path:

- **Stop competing with Temporal / Inngest / LangGraph** as a runtime. Rent
  one. The emitted code runs on them.
- **Be the cookbook** — the `vault/` curates per-tool auth, idempotency,
  rate-limits, error strategies, governance middleware. That's the actually-
  novel part Promethean has the right team to own.
- **Keep the UI doing what it's already good at** — design. The UI owns
  phases 1–4; the cookbook + harness own phase 5.

Plain version: be Figma *and* the export-to-React tool. Let Temporal be
Temporal.

---

## What this PR added

```
.
├── PIVOT.md                       ← you are here
├── vault/                         ← curated markdown cookbook (43 notes)
│   ├── integrations/              per-tool auth / idempotency / rate limits  ← primary emit context
│   ├── patterns/                  edge-type semantics + error strategies    ← primary emit context
│   ├── governance/                cost / latency / timeout / alerting        ← emit middleware spec
│   ├── spectrum/                  L0–L5 + HumanGate + Trigger doctrine       ← human reference
│   └── templates/                 6 reference workflow blueprints            ← human reference
├── skills/
│   ├── emit.md                    ← THE canonical pivot skill
│   └── archive/                   ← alternative headless design skills (not canonical)
├── artifacts/
│   ├── mcp-vault/                 ← MCP stdio server exposing the vault
│   └── api-server/src/routes/emit/index.ts   ← POST /api/workflows/:id/emit
├── emit-requests/                 ← queue written by the API, consumed by harness
└── .mcp.json                      ← wires Claude Code to the vault MCP server
```

**Nothing in `artifacts/promethean/` (the UI) or `artifacts/api-server/src/lib/agents/` (the in-process design agents) was changed.** The design loop works exactly as before. The pivot is purely additive: one new endpoint, one new queue directory, one new skill, one new MCP server, and one new cookbook-shaped vault.

---

## The emit boundary

The central idea is clean separation:

| Phase | Where it runs | Knowledge source | Human surface |
|-------|---------------|------------------|---------------|
| 1. Decompose | Express in-process agent | Hardcoded system prompt | Workflow Wizard |
| 2. Classify | Express in-process agent | Hardcoded system prompt | React Flow editor + Approve button |
| 3. Orchestrate | Express in-process agent | Hardcoded system prompt | React Flow editor + Approve button |
| 4. Govern | Express in-process agent | Hardcoded system prompt | React Flow editor + Approve button |
| **5. Emit** | **Harnessed agent (Claude Code / Codex / etc.)** | **`vault/` via MCP** | **Build button → review generated `out/` folder → run tests → ship** |

The boundary is `POST /api/workflows/:id/emit`:

```
 Promethean UI                     API server                      Harness
      │                                │                              │
      ├── click "Build"                │                              │
      │   targetFramework: inngest     │                              │
      │────────────────────────────────▶                              │
      │                                │                              │
      │                                ├─ validate workflow           │
      │                                ├─ write emit-requests/<id>.json
      │                                │                              │
      ◀──── 202 Accepted ──────────────┤                              │
      │       requestId,               │                              │
      │       requestFile              │                              │
      │                                │                              │
      │                                │         (developer invokes) │
      │                                │   claude + skills/emit.md ──▶
      │                                │                              │
      │                                │         ◀─── vault_get ──────┤
      │                                │         ─── integration data ─▶
      │                                │                              │
      │                                │                              │ (writes)
      │                                │                              ├── out/<slug>/
      │                                │                              │     workflow.ts
      │                                │                              │     nodes/*.ts
      │                                │                              │     governance.ts
      │                                │                              │     tests/*.ts
      │                                │                              │     EMIT_MANIFEST.json
```

The API server is deliberately stateless about emit — it writes the manifest and returns. The harness runs in whatever environment has the right credentials (developer laptop, CI worker). This avoids the standard agent-platform problems of per-tenant credential isolation and long-running subprocess management.

### Manifest shape

See [`emit-requests/README.md`](emit-requests/README.md). Key fields:

- `requestId` — unique per build, timestamped
- `workflowId` + full approved `workflow` JSON (nodes, edges, governanceConfig, etc.)
- `targetFramework` — one of 7 supported targets (see `skills/emit.md`)
- `targetDir` — where to write code; defaults to `out/<workflow-slug>/`
- `harnessInstructions` — exactly what the harness should do

---

## Wiring the MCP server into a harness

### Claude Code (recommended)

[`.mcp.json`](.mcp.json) at the repo root is already wired. Just launch from the repo root:

```bash
cd /path/to/Promethean
pnpm --filter @workspace/mcp-vault run build   # if not already built
claude
```

Inside the session, confirm attachment:
```
/mcp
```
Look for `promethean-vault ✓ connected`.

### Codex

```toml
# ~/.codex/config.toml
[mcp_servers.promethean-vault]
command = "node"
args = ["./artifacts/mcp-vault/dist/index.js"]

[mcp_servers.promethean-vault.env]
VAULT_DIR = "/abs/path/to/repo/vault"
```

### Generic MCP-aware harness

Any stdio MCP client works. Server binary is `artifacts/mcp-vault/dist/index.js` after the workspace build.

---

## Running the first emit end to end

1. Build the MCP server:
   ```bash
   pnpm install
   pnpm --filter @workspace/mcp-vault run build
   ```
2. Start the API + UI:
   ```bash
   pnpm --filter @workspace/api-server run dev
   pnpm --filter @workspace/promethean run dev
   ```
3. In the UI: Wizard → describe a workflow → approve each of the four design phases.
4. On the workflow detail page, click **Build** (or POST directly):
   ```bash
   curl -X POST http://localhost:8080/api/workflows/<id>/emit \
     -H 'content-type: application/json' \
     -d '{"targetFramework":"inngest"}'
   ```
5. Check `emit-requests/` — you should see `<slug>-<timestamp>.json`.
6. In another terminal:
   ```bash
   claude     # MCP server attaches via .mcp.json
   ```
   Paste:
   > *Read `skills/emit.md` and process `emit-requests/<filename>`. Use the `promethean-vault` MCP tools to read every `integration-*` note for tools referenced in the workflow. Generate code into the manifest's `targetDir`. Write `EMIT_MANIFEST.json` when done.*
7. Review `out/<slug>/`, run its tests, ship.

---

## What's deliberately *not* here

- **A file-watcher daemon.** The harness must be invoked manually against `emit-requests/` today. Keeping the loop manual while the vault and emit skill mature; a daemon is trivial to add later (~half-day) once the manual flow is stable.
- **Execution runtime replacement.** `POST /executions` remains simulated. Real execution is what `out/<slug>/` does when a developer runs it. The simulated endpoint is kept for UI demo continuity and flagged in-source.
- **UI changes to the four design phases.** The pivot is additive — only the new Build button touches the UI, and that's a TODO for the follow-up PR (the endpoint is wired; the button is the next commit).
- **New auth / multi-tenancy.** Each developer runs the harness locally against their own checkout.

---

## Honest tradeoffs

- **Vault becomes the product.** Emit quality ≈ vault quality. That's a feature if the team writes well, a bug otherwise.
- **Governance becomes soft.** The vault's governance policies are applied as middleware in the *emitted* code, not enforced by an always-on runtime. For research / internal tooling that's fine; for regulated production, layer durable runtime enforcement after deploy.
- **Multi-tenant SaaS is harder.** Running a harness per user is awkward. Easier to ship as an internal platform or a clonable template.
- **"Connect to any platform natively"** is bounded by what vault integration notes exist. Adding a new tool = adding a vault note. The vault grows with adoption.

---

## Verification (smoke)

```bash
pnpm install
pnpm --filter @workspace/mcp-vault run typecheck   # clean
pnpm --filter @workspace/mcp-vault run build
pnpm --filter @workspace/mcp-vault run start      # stdio; Ctrl-C to exit
```

Phase-3 evidence of the architecture working end-to-end lives under [`phase-3/traces/exports/`](phase-3/traces/exports/). The `h_pivot_*` bundle documents the MCP path and was captured using the archived skills as an alternative entry-point demo; it proves the vault is agent-consumable independent of the UI, which is the property we most need to demonstrate.

---

## Next steps (suggested order)

1. **Wire the Build button** in the workflow-detail page of the UI. One React component + one call to `POST /api/workflows/:id/emit`. ~2 hours.
2. **Run the first real emit** to `inngest` or `langgraph-js` on the GitHub-issue-triage workflow. Commit the resulting `out/github-issue-triage/` folder. This is the single highest-value demo for submission.
3. **Author one new vault integration note per real customer integration** as they come up. The vault grows; the runtime stays at zero LOC.
4. **Optionally**, add a small file-watcher daemon that spawns the harness automatically when a new manifest appears in `emit-requests/`. Promotes the loop from "call `claude` yourself" to "click Build, go get coffee, find a PR."
