# PROMETHEAN — Final Submission Packet

## Project Information

- **Project title:** Promethean Studio
- **Team members:** Noah Hicks, Rushabh Kankariya, Vishnu Bala, Yiying Lu, Mel Wong
- **Selected track:** Track A: Technical Build
- **Repository link:** [https://github.com/RedLynx101/Promethean](https://github.com/RedLynx101/Promethean)
- **5-minute demo video:** [https://drive.google.com/drive/folders/19-IFyg5feKVrce7TfKstvEAJC69OSSJh](https://drive.google.com/drive/folders/19-IFyg5feKVrce7TfKstvEAJC69OSSJh)

### One-paragraph project summary

Promethean Studio is an AI workflow orchestration system that transforms natural-language workflow descriptions into deployable, governed workflow graphs through a four-agent pipeline: Decomposition, System Selection, Orchestration, and Governance. The system is designed to reduce both over-automation and under-automation by assigning each node the right autonomy level on an L0-L5 spectrum, while enforcing human-in-the-loop approval gates between every phase transition. The deliverable includes a visual graph editor for review and correction, full trace capture for reproducibility, scenario-based evaluation with baseline comparisons (Always-L0/L4/L5), and failure analysis with root cause documentation, verified fixes, and clearly named residual limitations.

---

## Required Submission Materials

- **Final report:** file included in packet (repo source: `phase-3/final_report.md`)
- **Architecture diagram:** file included in packet (repo source: `phase-2/01-architecture-diagram.md`)
- **Screenshot index:** file included in packet (repo source: `phase-3/screenshots/screenshot_index.md`)
- **Evaluation summary:** included below (repo sources: `phase-3/final_report.md`, `phase-3/evidence/`)
- **List of submitted files and folders:** included below

---

## Evaluation Summary

### Scope and method

Evaluation was run on eight total executions spanning five scenarios: TC-01 (CRM happy path), TC-02 (cybersecurity incident response), TC-03 (deterministic CSV validation), TC-04 (ambiguous input), and TC-05a/05b/05c/05d (boundary and adversarial cases). Runs were executed against the live pipeline with full JSON traces and post-run metric extraction, not synthetic mocks.

### Quantitative outcomes

- **Pipeline completion:** 8/8 runs completed successfully to terminal outcome (including expected 400 boundary rejection for TC-05a post-fix).
- **Schema validation:** 100% pass rate across all four agents and all completed scenarios.
- **Latency profile:** approximately 96s median total agent latency, with TC-05c worst-case at approximately 161s after long-input fix.
- **Cost profile:** Promethean consistently outperformed the Always-L4 and Always-L5 baselines; reported savings vs Always-L4 ranged from roughly 4.9x to 225x across scenarios.
- **Failure handling maturity:** four concrete failure cases were documented; three were fixed and re-verified with before/after traces, one remains open as an explicit limitation.

### Nuanced interpretation

- The strongest evidence is not just aggregate pass rates, but pre-fix vs post-fix trace pairs for FC-01 and FC-02 that show concrete behavioral correction under the same workflow families.
- TC-04 and TC-05d demonstrate that the team did not collapse all uncertainty into "pass" claims; overconfidence on vague input and non-workflow prompt handling are explicitly surfaced as residual risks.
- Baseline comparisons are methodologically useful for cost and calibration framing, but should be interpreted as design-time comparisons, not production execution benchmarks.

### Primary evidence references

- **Repo source paths:**
- `phase-3/evidence/evaluation_results.csv`
- `phase-3/evidence/failure_log.md`
- `phase-3/evidence/version_notes.md`
- `phase-3/evidence/baseline_comparison_crm.csv`
- `phase-3/evidence/baseline_comparison_crm.md`
- `phase-3/traces/`

---

## List of Submitted Files and Folders

### Phase 3 deliverable package

- **Repo source paths:**
- `phase-3/final_report.md` (file included in packet)
- `phase-2/01-architecture-diagram.md` (file included in packet)
- `phase-3/screenshots/screenshot_index.md` (file included in packet)
- `phase-3/evidence/`
  - `test_cases.csv`
  - `test_cases.md`
  - `evaluation_results.csv`
  - `failure_log.md`
  - `version_notes.md`
  - `baseline_comparison_crm.csv`
  - `baseline_comparison_crm.md`
- `phase-3/screenshots/`
  - `04_intake_review_gate.png`
  - `05_agent_output_detail.png`
  - `06_approval_gate_inter_agent.png`
  - `07_govern_gate.png`
  - `08_deployed_gate.png`
- `phase-3/traces/`
- `phase-3/reflections/`
  - `melissa_wong.md`
  - `noah_hicks.md`
  - `rushabh_kankariya.md`
  - `vishnu_bala.md`
  - `yiying_lu.md`
