# Individual Contribution Reflection — Melissa Wong

**Role:** Frontend + Agent Failure Analysis

## What I contributed

- **Workflow Wizard redesign** in [artifacts/promethean/src/pages/WorkflowWizard.tsx](../../artifacts/promethean/src/pages/WorkflowWizard.tsx). Reworked the 4-step intake flow so users can move between prompt entry, constraint capture, governance preferences, and review without losing state. Also fixed the React Flow node-overlap issue where auto-generated decompositions would render on top of each other by standing up [artifacts/api-server/src/lib/agents/layout.ts](../../artifacts/api-server/src/lib/agents/layout.ts) as a topological auto-layout pass.
- **Intake agent and route** at [artifacts/api-server/src/lib/agents/intake.ts](../../artifacts/api-server/src/lib/agents/intake.ts) and [artifacts/api-server/src/routes/intake/index.ts](../../artifacts/api-server/src/routes/intake/index.ts) — the wizard-to-pipeline handoff that turns a user's wizard responses into the structured brief the decomposition agent consumes.
- **Phase 3 evaluation pass.** Drove the live evaluation end-to-end: booted the dev stack, wired `--env-file` loading, wrote [phase-3/scripts/run_tc.sh](../scripts/run_tc.sh) and [phase-3/scripts/compute_metrics.py](../scripts/compute_metrics.py), and executed all 8 test scenarios plus a rejection-with-feedback loop against a live pipeline. All traces saved under [phase-3/traces/](../traces/).
- **Three failure cases surfaced, root-caused, and fixed during evaluation:**
  - **FC-01** — the governance agent was wiping the orchestrated graph on TC-02 and TC-03 (13 → 4 and 9 → 2 nodes respectively). Traced to an ambiguous prompt + an "overwrite-not-merge" server pattern at [artifacts/api-server/src/lib/agents/governance.ts](../../artifacts/api-server/src/lib/agents/governance.ts). Fixed with a tightened output contract and a defensive server-side merge.
  - **FC-02** — orchestration JSON truncation on TC-05c's 22-node decomposition. Fixed by raising `max_completion_tokens` to 16384 across all four agents and hardening the decomposition prompt's 5–15 node range from soft guidance to a hard cap.
  - **FC-04** — empty-description bypass. Fixed with `minLength: 1` at the OpenAPI layer in [lib/api-spec/openapi.yaml](../../lib/api-spec/openapi.yaml) and the generated Zod client.
- **Evidence package + final report** — populated [phase-3/evidence/evaluation_results.csv](../evidence/evaluation_results.csv), rewrote [phase-3/evidence/failure_log.md](../evidence/failure_log.md) with pre/post-fix traces for every fixed case, added v0.3.1 and v0.3.2 entries to [phase-3/evidence/version_notes.md](../evidence/version_notes.md), and filled in the 11 sections of [phase-3/final_report.md](../final_report.md) with numbers from the real runs rather than placeholders.

## What I learned

- **Running evaluation against a live server — not mocks — is the single most valuable thing we did.** FC-01 would have shipped silently with any fixture-based test setup; it only surfaced because we ran real agents on real inputs and watched node counts change between phases. Same for FC-02: mocking the LLM response would have masked the token-budget bug entirely.
- **"Add X where appropriate" is not a contract.** The FC-01 bug came from exactly one ambiguous phrase in the governance prompt. The lesson I keep coming back to is that any prompt describing output structure has to be written as a contract — explicit about what stays, what gets added, and what the array means — or the LLM will interpret it in whatever way gets it to the token that ends the response.
- **Pre-fix traces are evidence, not waste.** Keeping the crashed TC-05c trace and the broken TC-02 trace in `*-prefix-bug/` directories means the failure claims in the report are reproducible, not just narrated. That ended up being much more compelling than a clean set of post-fix traces would have been.

## What I would do differently

- **Spend more time upfront on how a user actually moves through the L0–L6 system selection.** Right now the wizard + visual editor expose the levels as a fairly technical classification — it's legible to a platform engineer but the flow feels long, and the per-node rationale reads like a developer tool rather than a guided decision. I'd explore making the L0–L6 walk more interactive: a side-by-side "what this would cost / how this would fail" preview as the level changes, or a lightweight gamified pass where the user is shown a few classifications and asked to predict them before the agent's answer is revealed. Either direction would turn the current linear flow into something the target user would want to spend time in, rather than something they'd want to finish.

## Hours invested

- Phase 3: ~15 hours (frontend + intake: ~6h; evaluation runs + bug hunting + fixes: ~6h; evidence package + final report: ~3h)
