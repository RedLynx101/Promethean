# PROMETHEAN — Phase 3 Test Cases

These five scenarios map 1:1 to [phase-2/05-evaluation-plan.md](../../phase-2/05-evaluation-plan.md). Each case below includes the exact input string used against the live pipeline, the domain, the expected behavior per phase, and the pass/fail criteria. Results for each case are recorded in [evaluation_results.csv](evaluation_results.csv). Raw JSON traces live in [../traces/](../traces/).

---

## TC-01 — CRM Lead Qualification (Happy Path)

- **Domain:** CRM / Sales
- **Purpose:** Validate the full 4-agent pipeline end-to-end on a well-understood, bounded workflow.
- **Input:**
  ```
  When a new lead comes in through the website form, validate the email format
  and check for duplicates in the CRM. Score the lead based on company size,
  industry, and engagement history. If the score is above 80, route to a sales
  rep with a personalized summary. If below 40, add to the nurture campaign.
  For scores in between, flag for manual review by the sales team.
  ```
- **Expected behavior:**
  - Decomposition: 7–10 atomic substeps
  - System Selection: ≥60% at L0–L2, zero L5
  - Orchestration: conditional branching at score thresholds, error paths for CRM API
  - Governance: standard logging, cost threshold ≈ $0.05/run
- **Pass criteria:**
  - [ ] Pipeline reaches `deployed` phase without server error
  - [ ] Schema validation passes for all 4 agents
  - [ ] No substep classified L5
  - [ ] Total agent latency < 3 min

---

## TC-02 — Cybersecurity Incident Response (Complex Routing)

- **Domain:** Cybersecurity
- **Purpose:** Stress-test on a high-stakes workflow that genuinely warrants higher automation levels and stricter governance.
- **Input:**
  ```
  When a security alert is triggered by the SIEM system, triage the alert by
  checking severity, source IP reputation, and affected assets. For critical
  alerts, immediately isolate the affected endpoint and notify the security
  team via PagerDuty. Run an automated forensic scan to collect logs, memory
  dumps, and network traffic captures. Correlate findings across multiple
  data sources to identify the attack vector. Generate an incident report
  with timeline, impact assessment, and recommended remediation steps.
  For false positives, update the SIEM rules and document the false positive
  pattern for future tuning.
  ```
- **Expected behavior:**
  - Decomposition: 10–15 substeps covering triage, isolation, notification, forensics, correlation, reporting
  - System Selection: ≥2 substeps at L3+, IP reputation/triage remain L0/L1
  - Orchestration: at least one parallel branch (notify while scanning), explicit error paths
  - Governance: verbose logging, PagerDuty integration, tight latency thresholds
- **Pass criteria:**
  - [ ] System correctly identifies this as higher-complexity than TC-01
  - [ ] ≥2 substeps at L3+
  - [ ] Governance config includes verbose logging + PagerDuty
  - [ ] Over-classification rate vs. expert rubric < 20%

---

## TC-03 — CSV Validation Pipeline (Under-classification Guard)

- **Domain:** Data Engineering
- **Purpose:** Verify the system does NOT over-classify a deterministic problem.
- **Input:**
  ```
  Validate incoming CSV files: check that the file has the expected columns,
  verify data types match the schema, flag any null values in required fields,
  check that numeric values are within acceptable ranges, and generate a
  validation report listing all errors found.
  ```
- **Expected behavior:**
  - Decomposition: 5–7 substeps
  - System Selection: ≥80% L0, possibly L1 for report formatting
  - Orchestration: simple sequential flow
  - Governance: minimal/standard logging
- **Pass criteria:**
  - [ ] Zero substeps at L3+
  - [ ] ≥80% at L0
  - [ ] Governance is NOT verbose

---

## TC-04 — Ambiguous Input (Uncertainty Handling)

- **Domain:** *unspecified*
- **Purpose:** Test graceful handling of vague, underspecified input.
- **Input:**
  ```
  Handle customer issues when they come in. Figure out what the customer
  needs and deal with it appropriately. Make sure things get resolved.
  ```
- **Expected behavior:**
  - Decomposition produces generic substeps without hallucinating domain detail
  - System Selection flags multiple substeps for human review (confidence < 60%)
  - Summary explicitly acknowledges the vagueness
- **Pass criteria:**
  - [ ] Pipeline does not crash
  - [ ] ≥2 substeps flagged as needing human review
  - [ ] No fabricated domain-specific tools or thresholds
  - [ ] Summary mentions the input's low specificity

---

## TC-05 — Adversarial / Boundary Cases

Four sub-cases, each run and scored independently.

### TC-05a — Empty Input
- **Input:** `""`
- **Pass criteria:** Server returns 400 from Zod validation **before** any agent runs.

### TC-05b — Contradictory Constraints
- **Input:**
  ```
  Build a real-time stock trading system that processes millions of
  transactions per second. Budget: $0.01 per run. Maximum latency: 1ms.
  Must use no external APIs. Must also call 5 different ML models and
  run a multi-agent debate for every transaction.
  ```
- **Pass criteria:** Output is produced but the cost/latency estimates make the contradiction visible; the summary flags the conflict.

### TC-05c — Extremely Long Description
- **Input:** 5000-word description with 50+ distinct steps (see [../traces/tc-05c-input.txt](../traces/tc-05c-input.txt)).
- **Pass criteria:** Decomposition consolidates to the documented 5–15 step range; no timeout or crash within 5 min.

### TC-05d — Non-Workflow Input
- **Input:** `What is the meaning of life?`
- **Pass criteria:** System either produces a validation error or returns a minimal low-confidence decomposition; no hallucinated workflow.

---

## Baseline Comparison (applies to TC-01 through TC-04)

For each scenario, after running Promethean's pipeline, generate three counterfactuals and compute cost/accuracy vs. expert classification:

| Baseline | Rule |
|----------|------|
| Always-L0 | Overwrite every substep `systemLevel` → 0, recompute cost |
| Always-L4 | Overwrite every substep `systemLevel` → 4, recompute cost |
| Always-L5 | Overwrite every substep `systemLevel` → 5, recompute cost |

Results are aggregated in [evaluation_results.csv](evaluation_results.csv).
