# Individual Contribution Reflection — Yiying Lu

**Role:** Tech Stack Testing / Exploration (Phase 2) → Evidence Package & Portfolio Polish owner (Phase 3). Across both phases my work sat on the testing, QA, evaluation, and documentation side of the project rather than the primary build, which is what kept the four-agent system shipped by the build leads actually defensible as coursework evidence.

## What I contributed

### Phase 2 — Architecture, Prototype, and Evaluation Plan

- **Tech-stack evaluation and tooling review.** Walked through the proposed stack (React PWA → Express API → PostgreSQL + Drizzle ORM → OpenAI GPT-5.4-mini agents, with Orval-generated Zod schemas and React Query hooks) and pressure-tested each choice against the L0–L5 pipeline requirements. Reviewed trade-offs around Replit as the hosting/build environment vs. a separate local workspace, and flagged the issues that would later bite in Phase 3 (env-variable load order, codegen reset behavior, port conflicts across sibling projects).
- **L0–L5 rubric and role-definition review.** Reviewed drafts of [`02-role-definitions.md`](../../phase-2/02-role-definitions.md) and [`03-coordination-logic.md`](../../phase-2/03-coordination-logic.md) end-to-end as teammates shipped them, stress-testing the rubric against real workflow descriptions to make sure the spectrum actually discriminated — i.e., that tasks I expected to be L0 weren't being silently absorbed into L2+, and that the handoffs between Agents 1–4 were well-typed enough to test later.
- **End-to-end QA of teammate builds.** As the Decomposition, System Selection, Orchestration, and Governance agents were shipped, ran them against real CRM-adjacent descriptions, logged cases where outputs drifted from the rubric, and fed the findings back into prompt-engineering adjustments. This QA work didn't ship as a standalone deliverable, but it's the reason the Phase 3 evidence runs produced clean traces on the first pass.
- **Evaluation plan input for Phase 3.** Contributed to the structure of [`05-evaluation-plan.md`](../../phase-2/05-evaluation-plan.md), specifically the scenarios-per-domain count and the proposal to run fixed-level baseline comparisons. That framing is what [`baseline_comparison_crm.md`](../evidence/baseline_comparison_crm.md) later operationalized.
- **Documentation review and consistency pass.** Reviewed all eight Phase 2 deliverables for terminology alignment (pipeline phase names, agent numbering, L-level definitions) before the Phase 2 submission went out.

### Phase 3 — Evaluation, Evidence, and Portfolio Polish

- **Baseline comparison experiment (CRM domain).** Designed and ran a 9-run comparison (3 CRM variants × 3 runs each: Lead Qualification, Churn Prevention, Opportunity Progression) against Always-L0, Always-L4, and Always-L5 policies. Wrote two reusable scripts — [`run_crm_baseline.sh`](../scripts/run_crm_baseline.sh) drives the full 4-agent pipeline over HTTP, and [`compute_baseline_comparison.py`](../scripts/compute_baseline_comparison.py) emits [`baseline_comparison_crm.csv`](../evidence/baseline_comparison_crm.csv). Wrote the analysis in [`baseline_comparison_crm.md`](../evidence/baseline_comparison_crm.md), including the finding that Agent 4 (Governance) drives per-run cost variance while Agent 2 classification stays reproducible within a variant.
- **Phase 3 evidence capture.** Captured and indexed the Phase 3 screenshots (`04_intake_review_gate` through `08_deployed_gate`) covering the three human-in-the-loop gate types — pre-pipeline intake, inter-agent approve/reject/override, and the final governance gate — and updated [`screenshots/screenshot_index.md`](../screenshots/screenshot_index.md) with captions, reproduction steps, and evidence value for each image.
- **Model-version consistency fix across Phase 2 docs.** After the Phase 2 submission, audited all eight Phase 2 markdown files, replaced every `GPT-5.2` reference with `GPT-5.4-mini` (prose) / `gpt-5.4-mini-2026-03-17` (code/config), and verified zero remaining occurrences with `ripgrep` before pushing the `fix/model-version-consistency` branch. Diagram alignment was re-checked manually after the automated pass.
- **Local dev stack bring-up and debugging.** Brought up the full system locally (PostgreSQL via Docker, backend on `:8080`, frontend on `:5200`) so that screenshots and baseline traces could be captured against real pipeline runs. Debugged pnpm workspace command targeting, Vite `PORT` loading order, a stale OpenAI API key held in a pre-`.env` backend process, and an Orval codegen regression that had to be rolled back.
- **`AI_USAGE.md` refresh for Phase 3.** Added a new section documenting Cursor + Claude Opus 4.7 usage (documentation polish, screenshot index drafting, and the baseline comparison scripts/analysis), with an explicit list of what was changed manually and what was independently verified — directly responsive to the Phase 2 professor feedback on AI-disclosure depth.

## What I learned

- **Agent 2 variance vs Agent 4 variance are separable and should be reported separately.** My first instinct on seeing the $0.082 V2-r3 outlier was "Agent 2 is unstable." It isn't — Agent 2 produced identical L-distributions across all three V2 runs. The cost delta came from Agent 4 choosing verbose logging, an extra alert channel, a tighter cost threshold, and injecting an additional human gate. This changed how I'd report results going forward: describe classification stability and governance latitude as two different things, because they are.
- **"Infeasibility at a given L-level" is a better objective metric than any quality rating.** I started out wanting to hand-label workflow quality, which is inherently subjective. Counting nodes Promethean rated L2+ as "L0-infeasible" turned out to be defensible, reproducible, and directly derivable from the trace JSONs — no labeler required. 15% of CRM nodes being L0-infeasible is a stronger claim than any rating would have been.
- **Design-time evaluation is a real thing and needs to be called out.** Every cost and latency number in my analysis is what Promethean *estimates* for the deployed workflow, not what running the workflow against real CRM data would cost. For a design-time tool that is the right unit of measurement, but the credibility of the evaluation hinges on naming that limitation upfront rather than hiding it.
- **QA and evaluation work is invisible until it isn't.** My Phase 2 contribution was mostly review, QA, and rubric-stress-testing — none of which shows up in a demo video. It only becomes legible in Phase 3 when the evidence runs actually work on the first pass and the baseline-comparison numbers hold up to scrutiny. That's a useful lesson about how to scope and signal this kind of role in future team projects.
- **Environment surprises always cost more than the actual analysis.** The baseline comparison analysis was maybe 2–3 hours of thinking. Getting the dev stack stable enough to produce 9 clean traces was longer. Next time I'd bring up the full local stack at the start of Phase 2, not Phase 3.

## What I would do differently

- **Move the baseline-comparison scripting into Phase 2.** `compute_metrics.py` already existed at the end of Phase 2; extending it into `compute_baseline_comparison.py` in Phase 3 was mostly mechanical. If the team had written the baseline-cost columns into `compute_metrics.py` at Phase 2 handoff, Phase 3 would have been data collection only and I could have run 5+ domains instead of 1.
- **Rotate the OpenAI API key immediately after the pre-`.env` incident, not later.** The placeholder key ended up in a backend log because a stale process was holding it in memory. In a production repo this would be a disclosure event, not a troubleshooting one.
- **Automate the screenshot capture.** I took the Phase 3 screenshots by hand at 1× browser zoom; a Playwright script that deterministically produces the same 5 screenshots for every reviewer would be worth building if we continue this project past the course.
- **Front-load the cross-branch merges.** My `fix/model-version-consistency` work and teammates' later Phase 3 edits lived on separate branches and had to be reconciled late. A shared `phase-3-working` branch from the start would have avoided some rebase churn.
- **Write the testing/QA contribution down as it happens.** A lot of my Phase 2 rubric-stress-testing and agent-behavior QA was shared verbally or in chat and only partially survived into the deliverables. A running `qa_notes.md` during build weeks would have made the Phase 2 contribution more concretely cite-able.

## Hours invested

- **Phase 2: ~18 hours**
  - Tech-stack evaluation and tooling review: ~4h
  - L0–L5 rubric / role-definition review and QA against real prompts: ~6h
  - End-to-end QA of teammate agent builds during shipping: ~5h
  - Evaluation plan input + documentation consistency pass: ~3h
- **Phase 3: ~20 hours**
  - Evidence capture (screenshots + index + local stack setup/debugging): ~8h
  - Baseline comparison (experiment design, script authoring, 9 runs, CSV, analysis): ~7h
  - Model-version fix + AI_USAGE refresh + other doc polish: ~3h
  - Review, git workflow, coordination with teammates: ~2h
- **Total across both phases: ~38 hours**
