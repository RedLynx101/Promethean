# PROMETHEAN — Phase 3 Deliverables (Final)

### Track A: Technical Build
### April 2026

---

## Overview

Phase 3 (25% of final grade) is the final delivery phase: the runnable application, evidence that it works (and where it does not), evaluation materials, and portfolio-ready documentation.

**Status:** Report, evaluation tables, and documentation are in place. **Track A requires you to add real run evidence:** drop API/DB trace exports into `traces/exports/` (see `traces/README.md`) and record the **5-minute video** and **04–08 screenshots** from `screenshots/screenshot_index.md`.

**Pivot architecture note:** the project now ships in two complementary forms — the original in-process Express pipeline (reference implementation + Command Center demo) and a harness-driven architecture that reads a curated `vault/` over MCP and emits real runnable code. See [`../PIVOT.md`](../PIVOT.md) for the architectural rationale; Track A evidence for the harness path lives under [`traces/exports/`](traces/exports/) as `h_pivot_*` and `h_emit_*` files.

**Per-person contributions** are captured in [`reflections/*.md`](reflections/) — each teammate maintains their own.

---

## Deliverable index

| # | Rubric item | Location |
|---|-------------|----------|
| 1 | Final artifact (code) | Repository root — `README.md`, `artifacts/promethean`, `artifacts/api-server` |
| 2 | Five-minute video | **`video_outline.md`** (script); upload video per Canvas |
| 3 | Final report | **`final_report.md`** |
| 4 | Evidence package (5+ scenarios, 2+ failures, traces, screenshots) | **`evidence/`**, **`traces/`**, **`screenshots/screenshot_index.md`** |
| 5 | `test_cases` + `evaluation_results` + `failure_log` + `version_notes` | **`evidence/test_cases.md`**, **`evidence/evaluation_results.csv`**, **`evidence/failure_log.md`**, **`evidence/version_notes.md`** |
| 6 | Failure analysis | **`evidence/failure_log.md`** + §6 in **`final_report.md`** |
| 7 | Individual reflections | **`reflections/*.md`** |
| 8 | Portfolio-ready (README, architecture, screenshots, AI usage) | Root **`README.md`**, **`final_report.md`**, **`AI_USAGE.md`**, screenshot index |

**Live URL:** Record deployment link in the Canvas submission and in team notes; hosting is environment-specific (not committed here).

---

## Folder structure (actual)

```
phase-3/
├── README.md
├── final_report.md
├── video_outline.md
├── AI_USAGE.md
├── evidence/
│   ├── test_cases.md
│   ├── evaluation_results.csv
│   ├── failure_log.md
│   └── version_notes.md
├── traces/
│   ├── README.md
│   ├── exports/
│   │   ├── h_pivot_github-triage_20260422_SUMMARY.md          (harness-path evidence bundle summary)
│   │   ├── h_pivot_github-triage_20260422_phase1-decomposition.md
│   │   ├── h_pivot_github-triage_20260422_phase2-classification.md
│   │   ├── h_pivot_mcp-vault_20260422_jsonrpc-trace.jsonl
│   │   └── (add JSON from GET /api/pipeline/:id/status or POST responses for in-process scenarios)
│   └── illustrative/
│       ├── trace_crm_lead_qualification.json
│       ├── trace_cybersecurity_incident.json
│       ├── trace_csv_validation.json
│       ├── trace_ambiguous_workflow.json
│       └── trace_adversarial_edge.json
├── screenshots/
│   └── screenshot_index.md
└── reflections/
    ├── noah_hicks.md
    ├── rushabh_kankariya.md
    ├── vishnu_bala.md
    ├── yiying_lu.md
    └── mel_wong.md
```

**Full per-stage JSON examples** (CRM walkthrough) also live in `phase-2/08-interaction-trace.md`.

---

## Quick start (reviewers)

1. Read **`final_report.md`** for the full narrative.
2. Open **`evidence/evaluation_results.csv`** for the metrics table.
3. Open **`traces/exports/`** for **captured** pipeline state; use **`traces/illustrative/`** only as a schema hint. For CRM-level JSON examples, see **`phase-2/08-interaction-trace.md`**.

---

_Repository version at submission: see `evidence/version_notes.md`._
