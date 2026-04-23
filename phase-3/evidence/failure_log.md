# PROMETHEAN — Failure Log

Document at least **two** concrete failures surfaced during Phase 3 evaluation. For each entry:

1. Capture what went wrong, reproducibly.
2. Identify the root cause (agent prompt, schema, orchestration logic, UI, data).
3. Describe what changed after testing — link the commit or PR that addressed it (or mark as an open limitation).

Reference raw traces in [../traces/](../traces/).

---

## FC-01 — *[short failure name, e.g. "Selection agent over-classifies simple CSV validator"]*

- **Scenario:** TC-0X
- **Date observed:** YYYY-MM-DD
- **Observed behavior:**
  - ...
- **Expected behavior:**
  - ...
- **Trace:** [../traces/tc-0X-run-001.json](../traces/)
- **Root cause analysis:**
  - ...
- **Severity:** Low / Medium / High
- **Fix / mitigation:**
  - Commit: `<sha>` — *[one-line description]*
  - Or: *Open limitation — documented in [../final_report.md](../final_report.md) §Limitations.*
- **Post-fix verification:**
  - Re-ran TC-0X on YYYY-MM-DD — outcome: ...

---

## FC-02 — *[second failure name]*

- **Scenario:** TC-0X
- **Date observed:** YYYY-MM-DD
- **Observed behavior:**
  - ...
- **Expected behavior:**
  - ...
- **Trace:** [../traces/tc-0X-run-001.json](../traces/)
- **Root cause analysis:**
  - ...
- **Severity:** Low / Medium / High
- **Fix / mitigation:**
  - Commit: `<sha>` — *[one-line description]*
- **Post-fix verification:**
  - Re-ran TC-0X on YYYY-MM-DD — outcome: ...

---

## Candidate failure modes to probe during evaluation

Use this list as a starting checklist when running the scenarios — any of these that actually trips the pipeline becomes a promoted entry above.

- Decomposition produces fewer than 3 substeps on a real workflow (under-decomposition).
- Selection agent assigns L5 to a substep that does not require multi-agent coordination.
- Orchestration drops an edge so a substep becomes unreachable from the trigger.
- Governance agent produces a config that omits a required threshold (cost, latency, error rate).
- Rejection loop produces output nearly identical to the rejected version (non-responsive to feedback).
- Phase approval succeeds against a workflow already advanced past that phase (stale client state — see the 409 guard in [pipeline/index.ts:101](../../artifacts/api-server/src/routes/pipeline/index.ts:101)).
- Very long input causes truncation or schema validation failure.
- Zod validation rejects an edge type the orchestration agent emitted (schema drift).
