# Individual Contribution Reflection — Vishnu Bala

**Role:** Agent Alignment

## What I contributed

- Implemented the Phase 2 feedback-incorporation set in code/docs with verification links:
  1. Captured real pipeline traces across all planned scenarios plus repeated runs with timestamped artifacts under `phase-3/traces/`.
  2. Ran and documented CRM-domain baseline comparisons against Always-L0, Always-L4, and Always-L5 in `phase-3/evidence/baseline_comparison_crm.{csv,md}`.
  3. Executed and documented multiple failure cases end-to-end with raw run artifacts in `phase-3/evidence/failure_log.md` and `phase-3/traces/*-prefix-bug/`.
  4. Added per-phase rejection-count cap enforcement in the human-in-the-loop reject flow and updated the risk register (`phase-2/06-risk-governance-plan.md`).
  5. Helped finalize per-artifact contribution ownership coverage across reflections/report and enforced one pinned runtime model version across docs (`gpt-5.4-mini-2026-03-17`).
  6. Added explicit retention and rotation policy coverage for `executions` / `execution_steps` in `phase-2/04-tools-memory-data-design.md`.
- Worked on agent alignment quality across the four-stage pipeline by reviewing classification and orchestration behavior against the project rubric.
- Helped validate that system-level assignments remained consistent with task complexity, especially for deterministic workflow steps that should stay at lower autonomy levels.
- Reviewed final outputs and failure notes to ensure fixes were reflected in both the pipeline behavior and written documentation.
- Contributed to final submission readiness by cross-checking report claims against available evidence artifacts and traces.

## What I learned

- Alignment is not just prompt quality; it also depends on strict output contracts and server-side safeguards when models return partial structures.
- Confidence scores can look internally consistent while still being misleading on vague inputs, so calibration needs explicit treatment.
- Failure analysis with before/after traces provides clearer engineering feedback than isolated one-off runs.

## What I would do differently

- Add explicit alignment regression tests for known edge cases (vague input, oversized input, and non-workflow prompts).
- Define stronger guardrails at the API boundary for non-workflow detection instead of relying mainly on prompt compliance.
- Track alignment metrics continuously during development rather than only at evaluation time.

## Hours invested

- Phase 3: ~11 hours
