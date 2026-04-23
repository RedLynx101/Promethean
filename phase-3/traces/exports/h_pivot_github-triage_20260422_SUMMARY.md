# Phase 3 Evidence — Vault Consumability (GitHub Issue Triage)

**Trace type:** `H` (Harness) — secondary evidence for the pivot architecture.
**Date:** 2026-04-22
**What this proves:** the curated Promethean vault is **agent-consumable via MCP** — a harnessed coding agent (Claude Code) can read the same knowledge the in-process design agents use and produce pipeline-phase outputs that validate against the same Zod schemas. This is the property the emit phase depends on.
**Scenario brief:** "When a new GitHub issue is opened on our repo, classify its severity (bug / feature-request / question / security), draft a short triage response in the issue's voice, and page on-call via PagerDuty only for security issues." (domain: Engineering; constraint: $0.50/run).

---

## Scope of this bundle — secondary evidence, not primary demo

The **canonical** Promethean flow (see [`../../../README.md`](../../../README.md) and [`../../../PIVOT.md`](../../../PIVOT.md)) runs phases 1–4 **in the Promethean UI** via the in-process Express agents. The canonical phase-3 evidence for those four phases is API/DB traces from the running UI (captured per [`../README.md`](../README.md) Options A/B).

This bundle documents a **secondary property**: the vault is independently agent-consumable. That property matters because it's what the **emit phase** (the canonical pivot skill at `skills/emit.md`) relies on — it reads the same vault at build time to translate approved workflow JSON into real runnable code.

Phase 1 and phase 2 outputs here were produced using the **archived skills** under [`../../../skills/archive/`](../../../skills/archive/), which exist as "alternative headless entry points" — the same prompts as the in-process agents, re-authored to read vault notes via MCP instead of embedding the doctrine in the system prompt. Those skills are not the canonical path; the output shown here is proof the vault is traversable and the schemas match, which is what the emit phase needs.

**For primary phase-3 evidence of the design pipeline**, capture API traces from the running UI per [`../README.md`](../README.md).

## Evidence bundle

| File | What it shows |
|------|---------------|
| [`h_pivot_mcp-vault_20260422_jsonrpc-trace.jsonl`](./h_pivot_mcp-vault_20260422_jsonrpc-trace.jsonl) | Raw MCP JSON-RPC exchange proving the vault server is callable: `initialize`, `tools/list`, `vault_search`, two `vault_get` calls, `spectrum_schema`. 6 request/response pairs over stdio. |
| [`h_pivot_github-triage_20260422_phase1-decomposition.md`](./h_pivot_github-triage_20260422_phase1-decomposition.md) | Phase 1 proposal produced by the harness invoking [`skills/decompose.md`](../../../skills/decompose.md) against the brief. 9 nodes, 11 edges, Mermaid graph, full JSON matching `DecompositionResultSchema`. |
| [`h_pivot_github-triage_20260422_phase2-classification.md`](./h_pivot_github-triage_20260422_phase2-classification.md) | Phase 2 proposal produced by the harness invoking [`skills/classify.md`](../../../skills/classify.md) with the phase-1 JSON as input. Full `systemLevel` + `confidence` + `rationale` per node, preserving all IDs/positions/edges. Matches `SystemSelectionResultSchema`. |

## What each artefact proves

### 1. The MCP server is live (`…jsonrpc-trace.jsonl`)

Sending the six JSON-RPC messages over stdio returned six valid responses, including:

- **`tools/list`** → the five Promethean tools: `vault_list`, `vault_get`, `vault_search`, `spectrum_schema`, `vault_reload`.
- **`vault_search "github issue triage classify severity"`** → top hit `template-customer-support-triage` (expected prior art), followed by relevant `L*` and pattern notes. Search ranking is sane.
- **`vault_get "L2-language-understanding"`** → full frontmatter + body + every `[[wikilink]]` resolved to its target note. Knowledge-graph traversal works.
- **`spectrum_schema`** → the JSON-schema contract the agent must emit against. This is how the harness validates its own output against `artifacts/api-server/src/lib/agents/schemas.ts`.

This replaces the "API response body" evidence the existing traces rely on — the MCP exchange *is* the agent↔knowledge-base interface.

### 2. Decomposition phase reasons over vault content (`…phase1-decomposition.md`)

Concrete evidence the agent used the vault, not training data:

- Frontmatter `templateRef: template-customer-support-triage` — correct closest-prior-art.
- Cites three separate templates (`template-customer-support-triage`, `template-code-review-pipeline`, `template-cybersecurity-incident-response`) and explains **which shape it borrowed from each**.
- Uses edge types only from the vault's declared enum (`default | parallel | conditional`).
- Structural compliance: 9 nodes (within 5–15), Trigger-first, explicit terminal `end-1`.
- Five open questions for the human reviewer — including the "security auto-labeling" concern that phase 2 then re-engages with.

### 3. Classification phase makes a vault-grounded non-trivial call (`…phase2-classification.md`)

The standout evidence: the agent correctly **downgraded** the original LLM-looking step (`classify-1`) from L3 to L2. Its rationale cites specific doctrine from `L2-language-understanding.md`:

> "Four-way closed-set intent classification over unstructured text — the canonical L2 shape. L2-language-understanding.md explicitly names intent classification as L2 and flags 'using a full LLM to do intent classification' as an anti-pattern."

This is exactly the classification rule from [`artifacts/api-server/src/lib/agents/systemSelection.ts`](../../../artifacts/api-server/src/lib/agents/systemSelection.ts#L20-L26) — "ALWAYS start at L0. Justify every level increase" — working correctly. The agent also:

- Preserved all 9 node IDs, positions, and 11 edges from phase 1. ✅
- Assigned `confidence` scores calibrated to the class (97–99 for L0, 78 for contested L2, 88 for L3 with known-ambiguity).
- Noted the runtime-vs-graph-time distinction for HumanGate insertion — a sophisticated read of `HumanGate.md`.
- Computed per-run cost ($0.011) and critical-path latency (3700ms) with per-node cites, coming in **45× under** the $0.50 budget cap.

## How the evidence maps to Phase 3 requirements

| Track-A requirement | Covered by |
|--------------------|------------|
| "Logs or traces showing interaction among agents" | `…jsonrpc-trace.jsonl` + the two phase `.md` proposals — each phase's JSON block is the literal input to the next phase's skill. |
| "Must come from the running prototype" | The JSON-RPC trace was captured from `node artifacts/mcp-vault/dist/index.js` on 2026-04-22. The proposals were written by Claude Code in a live session against `.mcp.json` at the repo root. |
| "Real LLM agent calls" | The decompositions and classifications are verbatim from Claude Code's tool-augmented reasoning over the vault. Claude Code's model provider handled the LLM calls; the vault-side interaction is fully captured in this bundle. |
| "Human-in-the-loop approval gates" | Each phase proposal has `status: pending-review` frontmatter and explicit open questions for the human. The approval-to-proceed loop is the architecture's primary control surface. |

## Reproduction recipe

```bash
# 1. Build the MCP server
cd /Users/mel/Documents/GitHub/Promethean
pnpm install
pnpm --filter @workspace/mcp-vault run build

# 2. Verify the server is callable (reproduces the JSON-RPC trace)
(
  printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.0"}}}'
  printf '%s\n' '{"jsonrpc":"2.0","method":"notifications/initialized"}'
  printf '%s\n' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
  sleep 1
) | MCP_VAULT_LOG_LEVEL=silent node ./artifacts/mcp-vault/dist/index.js

# 3. Wire Claude Code to the vault (.mcp.json is already committed at repo root)
claude

# 4. In the Claude Code session, paste the brief from this summary and follow
#    the four-phase prompt sequence in PIVOT.md § "Smoke 5".
```

## Honest caveats

- **Tool-call log gap.** Claude Code's own transcript of which MCP tools it invoked during the two live phases is not checked in here — only the *outputs* (the proposal files) and an independently-captured MCP smoke trace are. The rationales inside the proposals are strong circumstantial evidence (specific quotes from specific vault notes), but if a reviewer wants direct tool-invocation logs, export the Claude Code session transcript alongside this bundle.
- **Only 2 of 4 phases executed, and not from the canonical path.** This bundle stops at phase 2 because the canonical design flow is the UI, not these archived headless skills. Phase 3 (`orchestrate`) and phase 4 (`govern`) via the archived-skills path were deliberately not run; the equivalent primary evidence is API/DB traces from the UI.
- **Emission phase not yet demonstrated.** The "stop planning, actually emit runnable code" claim is covered by [`../../../skills/emit.md`](../../../skills/emit.md) but hasn't been exercised against a target framework with committed output. Running it against `langgraph-js` or `inngest` and committing the resulting `out/github-issue-triage/` is the single highest-value next demo.

## Recommended follow-ups for submission

1. **Run the first real emit.** Approve a workflow via the UI, click Build (or `POST /api/workflows/:id/emit`), run the harness against `emit-requests/<manifest>.json`, commit `out/<slug>/`. This is the artefact that distinguishes the pivot from every prior phase of Promethean.
2. **Capture primary phase-3 evidence from the UI.** API trace exports per the options in [`../README.md`](../README.md) document the canonical design path; this bundle then complements them as proof the vault is agent-consumable.
3. **Export Claude Code's session transcript** alongside the next harness run; adds direct tool-invocation evidence to the circumstantial evidence already present in the proposal rationales.

---

*This summary is intentionally narrative; the raw evidence is the three sibling files in this directory. Graders who want the machine-readable phase outputs should open the two `.md` proposals and read the trailing JSON blocks.*
