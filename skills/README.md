# Promethean Skills

The canonical Promethean flow has one skill: [`emit.md`](./emit.md). It is the **last** phase of the pipeline — the one that turns an approved workflow blueprint into real runnable code.

## The end-to-end flow

```
Brief (user types in UI)
  │
  ▼
[Promethean UI: Wizard → Editor → Approval gates]
  │  Phases 1–4 run in the Express app with the in-process agents:
  │    • Decomposition      (artifacts/api-server/src/lib/agents/decomposition.ts)
  │    • System Selection   (                           systemSelection.ts)
  │    • Orchestration      (                           orchestration.ts)
  │    • Governance         (                           governance.ts)
  │  Human reviews and approves each phase's graph in React Flow.
  │
  ▼
Approved workflow JSON  (nodes, edges, governanceConfig persisted in Postgres)
  │
  ▼
User clicks "Build" → POST /api/workflows/:id/emit { targetFramework }
  │
  ▼
Harness session loads this skill → reads vault/ via MCP → writes out/<workflow>/
  │    Specifically:
  │    • vault/integrations/<tool>.md for every tool referenced in the graph
  │    • vault/patterns/*.md for parallel / conditional / error / retry / gate semantics
  │    • vault/governance/ for cost/latency/timeout middleware
  │
  ▼
out/<workflow>/   ← real LangGraph / Inngest / Temporal / n8n / Claude Agent SDK code
```

## Why only `emit.md` is in the canonical path

The Promethean UI is good at workflow design — that's what it was built for. The **emit** step is the new thing the pivot adds: turning the approved JSON into actual code a developer can read, run, deploy.

The in-process agents (Express) and the vault (MCP-exposed cookbook) are **complementary**, not competing:

| Phase | Agent | Knowledge source | Transport |
|-------|-------|------------------|-----------|
| Decompose | `decomposition.ts` | System prompt (hardcoded) | HTTP |
| Classify | `systemSelection.ts` | System prompt (hardcoded) | HTTP |
| Orchestrate | `orchestration.ts` | System prompt (hardcoded) | HTTP |
| Govern | `governance.ts` | System prompt (hardcoded) | HTTP |
| **Emit** | **Harness + `emit.md`** | **`vault/` (curated cookbook)** | **MCP** |

The vault's spectrum / governance / patterns notes are still valuable as **human reference documentation** — consult them while reviewing a phase in the UI — but they're not the runtime context for phases 1–4.

## Alternative headless path

If you want to run phases 1–4 without the UI (CI, batch, demo), archived skills in [`archive/`](./archive/) describe how a harnessed agent could consume the vault directly for those phases. See [`archive/README.md`](./archive/README.md). They are preserved but not the canonical path.

## Files

| File | Canonical | Purpose |
|------|-----------|---------|
| [`emit.md`](./emit.md) | ✅ | **The** pivot skill. Turns approved JSON into runnable code. |
| [`archive/decompose.md`](./archive/decompose.md) | — | Alternative headless decomposition. |
| [`archive/classify.md`](./archive/classify.md) | — | Alternative headless system selection. |
| [`archive/orchestrate.md`](./archive/orchestrate.md) | — | Alternative headless orchestration. |
| [`archive/govern.md`](./archive/govern.md) | — | Alternative headless governance. |
