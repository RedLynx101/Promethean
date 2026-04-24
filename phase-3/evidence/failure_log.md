# PROMETHEAN — Failure Log

Failures surfaced during Phase 3 live-pipeline evaluation on 2026-04-24. Raw traces in [../traces/](../traces/).

---

## FC-01 — Governance agent wipes the orchestrated graph

- **Scenarios:** TC-02, TC-03 (first run)
- **Date observed:** 2026-04-24
- **Observed behavior:**
  - TC-02 post-orchestration had 13 nodes (L0:3, L3:2, L4:7). After governance ran, the final deployed workflow had only 4 nodes — two human gates and two checkpoints. All L3/L4 steps disappeared. Cost jumped from what should have been ~$0.07/run to $0.085/run on a 4-node graph.
  - TC-03 post-orchestration had 9 L0 nodes. After governance ran, the final deployed workflow had 2 nodes.
- **Expected behavior:**
  - Governance agent adds gates/checkpoints and writes a `governanceConfig`; it must preserve every orchestrated node and edge.
- **Trace (pre-fix):** [../traces/tc-02-prefix-bug/02_approve_orchestrate.json](../traces/tc-02-prefix-bug/02_approve_orchestrate.json), [../traces/tc-03-prefix-bug/02_approve_orchestrate.json](../traces/tc-03-prefix-bug/02_approve_orchestrate.json)
- **Root cause:**
  - The governance system prompt said "Also add governance nodes where appropriate" with an example response of `"nodes": []`. The model interpreted that as "return only the governance nodes I added," not "return all nodes including new ones."
  - The server at [artifacts/api-server/src/lib/agents/governance.ts:88](../../artifacts/api-server/src/lib/agents/governance.ts:88) treated a non-empty LLM response as authoritative — it replaced the incoming `nodes`/`edges` arrays wholesale instead of merging by id.
- **Severity:** High — the final deployed workflow was unusable; every L3+ step vanished.
- **Fix:**
  - Tightened the governance prompt with an explicit output contract: "must contain EVERY node from the orchestrated input ... PLUS any new governance nodes you add."
  - Added a defensive server-side merge: preserve all original orchestrated nodes keyed by id, overlay with any updates the agent returned, append any newly added gate/checkpoint nodes. Same treatment for edges.
- **Post-fix verification:**
  - Re-ran TC-02 on 2026-04-24 → 13 nodes preserved (L0:3, L3:2, L4:7 + 1 gate), governance config correctly set `loggingLevel=verbose`, `alertChannels=[slack,email,pagerduty,webhook]`. Trace: [../traces/tc-02/](../traces/tc-02/).
  - Re-ran TC-03 on 2026-04-24 → 9 L0 nodes preserved, `loggingLevel=standard`. Trace: [../traces/tc-03/](../traces/tc-03/).

---

## FC-02 — Orchestration agent output truncation on long decompositions

- **Scenario:** TC-05c (5000-word, 50-step input)
- **Date observed:** 2026-04-24
- **Observed behavior:**
  - Decomposition produced 22 nodes — already above the 5–15 consolidation spec. When the orchestration agent then attempted to enrich those 22 nodes, its JSON output was truncated mid-string by the `max_completion_tokens: 8192` cap. `JSON.parse` threw `Unexpected end of JSON input`, the request returned 500, and the pipeline halted at phase=select.
- **Expected behavior:**
  - Pipeline either consolidates to ≤15 steps at decomposition time, or the downstream agents handle a higher node count without crashing.
- **Pre-fix trace:** [../traces/tc-05c-prefix-bug/02_approve_select.json](../traces/tc-05c-prefix-bug/02_approve_select.json) — contains the HTML 500 body with the thrown stack.
- **Root cause:**
  - Two compounding causes. (1) Decomposition did not enforce its own "5–15 steps" spec against a very long input and produced 22 steps. (2) Every agent hard-codes `max_completion_tokens: 8192` — fine for typical workflows, insufficient once `JSON.stringify(nodes, null, 2)` of 22 enriched nodes exceeds that budget.
- **Severity:** Medium — crashes only on pathologically large inputs, but when it does, there is no recovery path.
- **Fix:**
  - Raised `max_completion_tokens` from 8192 to 16384 across all four agents ([decomposition.ts](../../artifacts/api-server/src/lib/agents/decomposition.ts), [systemSelection.ts](../../artifacts/api-server/src/lib/agents/systemSelection.ts), [orchestration.ts](../../artifacts/api-server/src/lib/agents/orchestration.ts), [governance.ts](../../artifacts/api-server/src/lib/agents/governance.ts)).
  - Tightened the decomposition system prompt to enforce the 5–15 step cap as a hard limit: "NEVER emit more than 15 nodes. For long or complex inputs, consolidate related operations into a single coarser step rather than exceeding the cap."
- **Post-fix verification:**
  - Re-ran TC-05c on 2026-04-24 → pipeline completed end-to-end. Decomposition consolidated from 22 → 16 nodes (still one above the soft cap but no crash), orchestration and governance both completed cleanly. Final: 16 nodes (L0:13, L1:1, L3:2), $0.045/run, 161s total agent latency. Trace: [../traces/tc-05c/03_final_state.json](../traces/tc-05c/03_final_state.json).

---

## FC-04 — Empty description accepted into pipeline

- **Scenario:** TC-05a (empty string as workflow description)
- **Date observed:** 2026-04-24
- **Observed behavior:**
  - `POST /api/pipeline/start` with `description: ""` returned HTTP 200 and the decomposition agent fabricated an 11-node generic fallback workflow ("Receive Workflow Request" → "Define Workflow Goal" → …). No user-provided content drove any step.
- **Expected behavior per TC-05a:**
  - Server returns HTTP 400 from Zod validation before any agent runs.
- **Pre-fix trace:** [../traces/tc-05a](../traces/tc-05a) (01_start_response.json captured the 200 + fabricated workflow).
- **Root cause:**
  - `StartPipelineBody.description` in [lib/api-spec/openapi.yaml](../../lib/api-spec/openapi.yaml) was typed as `string` with no `minLength`, and the generated Zod schema at [lib/api-zod/src/generated/api.ts](../../lib/api-zod/src/generated/api.ts) was `zod.string()` with no `.min()`. Empty strings therefore parsed successfully and reached the decomposition agent.
- **Severity:** Low — no data loss, but violates the API's implicit contract and wastes a full pipeline worth of agent calls on meaningless input.
- **Fix:**
  - Added `minLength: 1` to both `workflowId` and `description` on `StartPipelineBody` in [openapi.yaml](../../lib/api-spec/openapi.yaml), and the corresponding `.min(1)` constraint in the generated Zod client at [api.ts:329-332](../../lib/api-zod/src/generated/api.ts:329).
- **Post-fix verification:**
  - Re-ran TC-05a on 2026-04-24 → server returned HTTP 400 with Zod error `"String must contain at least 1 character(s)"`, no agents invoked. Trace: [../traces/tc-05a/01_start_response.json](../traces/tc-05a/01_start_response.json).

---

## FC-03 — Overconfidence on vague input (no low-confidence flags) — OPEN

- **Scenario:** TC-04 ("Handle customer issues when they come in ...")
- **Date observed:** 2026-04-24
- **Observed behavior:**
  - All 10 nodes received confidence scores in [74, 99] — zero nodes flagged as needing human review (< 60 confidence). The select summary asserted "This workflow is mostly deterministic support automation with a few language-understanding and generation touchpoints" — hallucinating a "customer-support" specialization from input that never said the word "support" or named any tool, field, or policy.
- **Expected behavior per [test_cases.md](test_cases.md) TC-04:**
  - ≥2 substeps flagged as needing human review (confidence < 60%).
  - Summary explicitly acknowledges input vagueness.
  - No fabricated domain-specific tools or thresholds.
- **Trace:** [../traces/tc-04/](../traces/tc-04/)
- **Root cause:**
  - The selection agent's prompt does not instruct it to calibrate confidence against input specificity — only against its own confidence in the L0–L5 mapping. It treats a vague description as if it were a well-specified workflow with obvious classifications.
- **Severity:** Medium — pipeline runs and schema-validates, but the output misleads users into thinking the system understands their (under-specified) problem.
- **Fix / mitigation:** Open limitation — documented in [../final_report.md](../final_report.md) §Lessons Learned. Future fix: add an "input-specificity assessment" step (either as a decomposition-agent subtask or a separate guard) that emits a `vagueness_score` and forces `confidence ≤ 60` when it's high.

---

## Additional observed limitations (not promoted to failure cases)

These do not break the pipeline but fail their test-case pass criteria and are worth naming.

- **TC-05d — non-workflow input accepted.** "What is the meaning of life?" produced an 8-node "philosophical response" workflow rather than a validation error or a minimal low-confidence refusal. Mitigation in progress: added a rule to the decomposition system prompt instructing the agent to return empty nodes/edges for non-workflow input. This relies on the LLM's compliance and is not a hard guard — a proper fix would validate workflow-likeness server-side before the agent runs.

---

## Rejection-with-feedback trace (positive evidence)

Not a failure — evidence that the human-in-the-loop path works.

- **Trace:** [../traces/rejection-loop/](../traces/rejection-loop/)
- **Before:** node `prepare-summary` classified L3 (single LLM agent), confidence 90.
- **Feedback:** "This is overkill — a templated summary using lead fields from the CRM is sufficient. Please reclassify to L0 (deterministic template) unless the summary truly requires generative language."
- **After:** `prepare-summary` reclassified L0, confidence 97. Select-agent summary explicitly acknowledged: "The only previously elevated step, Prepare Personalized Summary, has been reclassified to L0 because the prompt indi[cates...]"
