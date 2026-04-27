# PROMETHEAN — Version Notes

Human-readable changelog for Phase 3. Each entry pairs a date/version with what changed, why, and what test evidence motivated it.

For the authoritative history see `git log`. This file captures the **narrative** — the decisions, not just the diffs.

---

## v0.3.2 — Token budgets, decomposition cap, empty-input guard (2026-04-24)

- **What changed:**
  1. `max_completion_tokens` raised from 8192 to 16384 across all four agents ([decomposition.ts](../../artifacts/api-server/src/lib/agents/decomposition.ts), [systemSelection.ts](../../artifacts/api-server/src/lib/agents/systemSelection.ts), [orchestration.ts](../../artifacts/api-server/src/lib/agents/orchestration.ts), [governance.ts](../../artifacts/api-server/src/lib/agents/governance.ts)).
  2. Decomposition system prompt hardened: 5–15 node range is now a hard cap with explicit guidance to consolidate rather than exceed it. Also added a non-workflow-input rule asking the agent to return empty nodes/edges for questions, greetings, or non-workflow text.
  3. `StartPipelineBody.description` and `.workflowId` now require `minLength: 1` at both the OpenAPI layer ([openapi.yaml](../../lib/api-spec/openapi.yaml)) and the generated Zod client ([api.ts:329-332](../../lib/api-zod/src/generated/api.ts:329)).
- **Why:**
  - FC-02 (orchestration JSON truncation on 22-node decomposition of TC-05c). The 8192 budget was insufficient for `JSON.stringify` of a fully-enriched 20+ node graph.
  - FC-04 (empty description accepted). Prior contract allowed `""`, which caused a full pipeline run on meaningless input.
- **Evidence:**
  - TC-05c: pre-fix trace [traces/tc-05c-prefix-bug/02_approve_select.json](../traces/tc-05c-prefix-bug/02_approve_select.json) (500 error with truncated JSON) vs. post-fix [traces/tc-05c/03_final_state.json](../traces/tc-05c/03_final_state.json) (16-node completed workflow).
  - TC-05a: pre-fix returned 200 with 11-node fallback; post-fix returns 400 (see [traces/tc-05a/01_start_response.json](../traces/tc-05a/01_start_response.json)).
- **Risk / rollback:**
  - Token-budget change doubles the per-agent output-token cost in the worst case but has no effect on typical workflows that finish well under 8k tokens. Rollback is a one-line revert per agent.
  - The decomposition prompt change depends on model compliance; TC-05c still produced 16 nodes (one over the cap) but did not crash. Open follow-up: if compliance remains imperfect, add a server-side truncation pass.
  - `.min(1)` on description is backwards-incompatible only for any client that was intentionally sending empty strings — which nothing in the repo does.

## v0.3.1 — Governance merge fix (2026-04-24)

- **What changed:** Governance agent no longer replaces the orchestrated graph. Tightened the system prompt with an explicit output contract ("the nodes array you return must contain EVERY node from the orchestrated input ... PLUS any new governance nodes you add"). Added a defensive server-side merge in [artifacts/api-server/src/lib/agents/governance.ts](../../artifacts/api-server/src/lib/agents/governance.ts) that preserves every original orchestrated node by id, overlays with any fields the agent updated, and appends any newly added gate/checkpoint nodes. Same treatment for edges.
- **Why:** FC-01 in [failure_log.md](failure_log.md). On TC-02 and TC-03 the LLM returned only the 2–4 gate/checkpoint nodes it added, and the prior code (`parsed.nodes = parsed.nodes.map(...)` with no merge) discarded the entire orchestrated graph — all L3/L4 substeps vanished from the deployed workflow.
- **Evidence:** Pre-fix trace: [traces/tc-02-prefix-bug/02_approve_orchestrate.json](../traces/tc-02-prefix-bug/02_approve_orchestrate.json) (4 nodes). Post-fix trace: [traces/tc-02/03_final_state.json](../traces/tc-02/03_final_state.json) (13 nodes preserved, +1 gate added by governance).
- **Risk / rollback:** Low. Change is additive — if the agent happens to return the full node list (desired behavior), the merge is a no-op because ids match. Rollback is a single-file revert.

## v0.3.0 — Phase 3 Evaluation Runs (2026-04-24)

- **What changed:** No code changes — this entry records that 8 live test-case runs were executed against the deployed pipeline, plus one rejection-with-feedback loop, for the Phase 3 evidence package. Added `phase-3/scripts/run_tc.sh` (test driver) and `phase-3/scripts/compute_metrics.py` (CSV writer).
- **Why:** Phase 3 rubric §4 (evaluation methodology) and §6 (failure analysis).
- **Evidence:** [evaluation_results.csv](evaluation_results.csv), all [traces/](../traces/).
- **Risk / rollback:** N/A (evidence-only).

## v0.2.x — Phase 2 Prototype (2026-04-XX)

- 4-agent pipeline (decompose → select → orchestrate → govern) operational end-to-end
- Human approval gate + rejection-with-feedback at every phase
- Visual editor (React Flow), Command Center, Template Library, Workflow Wizard complete

## v0.1.0 — Phase 1 Scaffold

- Monorepo + codegen pipeline set up
- Database schema finalized; initial API routes scaffolded

---

## Template for future entries

```
## vX.Y.Z — Short title (YYYY-MM-DD)

- **What changed:**
- **Why:**
- **Evidence:**
- **Risk / rollback:**
```
