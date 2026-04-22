# Phase 3 — Screenshot Index

> Captioned evidence of Promethean Studio in operation, mapped to the Phase 3 rubric's Evidence Package requirement (§4) and Portfolio-Ready Package requirement (§8).

This index documents every screenshot included in the Phase 3 submission. Each entry lists:
- **File** — relative path to the image
- **Caption** — one-line description suitable for the final report
- **Agent / Phase** — which part of the 4-agent pipeline or system surface it demonstrates
- **Evidence value** — which rubric item it supports and why it is non-redundant
- **Reproduction** — exact steps to recapture the screenshot locally

Screenshots are stored as `.jpg` (existing captures) or `.png` (new Phase 3 captures). Phase 3 captures follow the numbered convention `NN_short_name.png` so ordering matches the final report narrative.

---

## 1. Existing screenshots (captured during Phase 2)

These three were captured while the UI was first built and are reused unchanged for Phase 3. They live at the repo root under `screenshots/` so the existing demo video and Phase 2 bundle continue to reference them.

### 1.1 `screenshots/dashboard.jpg` — Command Center

| Field | Value |
| --- | --- |
| Caption | Fleet-level view of all workflows with 24-hour execution metrics, latency timeline, active-alert feed, and per-workflow success indicators. |
| Surface | Command Center (post-pipeline, operational monitoring) |
| Evidence value | Demonstrates the "portfolio-ready UI" required by rubric §8 and shows that governance telemetry (success rate, latency, cost, alerts) is surfaced to operators rather than hidden in logs. |
| Reproduction | `pnpm dev` at repo root → open `http://localhost:5000/` → left nav **Command Center**. Requires at least one executed workflow in the DB to populate the timeline and fleet list. |

### 1.2 `screenshots/templates.jpg` — Template Library

| Field | Value |
| --- | --- |
| Caption | Six pre-configured workflow blueprints across Data Engineering, Legal & Compliance, Engineering, Sales, Security, and Customer Success, each deployable in one click. |
| Surface | Template Library (pre-pipeline, user entry point) |
| Evidence value | Shows breadth of supported domains and satisfies the rubric's request for concrete target-user scenarios. Also provides the CRM Lead Qualification tile used as the primary evaluation scenario (see `phase-2/08-interaction-trace.md`). |
| Reproduction | `pnpm dev` → left nav **Template Library**. Templates are seeded from `artifacts/api-server/src/db/seed/templates.ts`. |

### 1.3 `screenshots/wizard.jpg` — Prometheus Intake (Agent 1 entry)

| Field | Value |
| --- | --- |
| Caption | Opening turn of the Decomposition agent's conversational intake (step 0/8), prompting the user for the workflow name. |
| Surface | New Workflow wizard — Agent 1 (Decomposition) |
| Evidence value | Demonstrates the human-authored-input → AI-agent handoff boundary. The `0 / 8 complete` progress indicator documents the fixed-structure intake that feeds downstream agents. |
| Reproduction | `pnpm dev` → left nav **+ New Workflow** → the first assistant turn appears immediately; screenshot before typing. |

---

## 2. Phase 3 captures required (TO DO)

Five new screenshots are needed to satisfy the rubric's "screenshots of key pipeline states" requirement (§4) and to reach the 4–8 captioned-screenshots target in §8. Each entry below is a capture spec — treat it as an acceptance test for the screenshot, not a wish list.

> **Capture environment for all items below:** local dev (`pnpm dev`), Chrome at 1440×900 viewport, DB seeded with the CRM Lead Qualification template, browser zoom 100%. Save as PNG into this folder.

### 2.1 `phase-3/screenshots/04_approval_gate.png` — Human approval gate between agents

| Field | Value |
| --- | --- |
| Caption | Approval panel between Agent 2 (System Selection) and Agent 3 (Orchestration) showing the reviewer's Approve / Edit / Reject options with the feedback text field expanded. |
| Surface | Pipeline run view, mid-pipeline |
| Evidence value | Directly evidences the "human-in-the-loop gate" governance control claimed in `phase-2/06-risk-governance-plan.md`. This is the single most important new screenshot — without it, the HITL claim is unverified. |
| Reproduction | Run a CRM Lead Qualification pipeline → wait for Agent 2 to complete → the approval panel appears before Agent 3 starts → click the **Reject with feedback** toggle to expand the textarea → capture. |

### 2.2 `phase-3/screenshots/05_agent_output_detail.png` — Structured agent output viewer

| Field | Value |
| --- | --- |
| Caption | Agent 2 (System Selection) output panel showing per-node L0–L5 tags with justifications, expanded for one node to reveal the selection rationale and tool choice. |
| Surface | Pipeline run view → Agent 2 output tab |
| Evidence value | Proves Agent 2 emits human-readable L0–L5 classifications with justifications — the core claim of the system spectrum rubric. Supports rubric §4 (interaction traces) and §6 (design decisions are inspectable). |
| Reproduction | Same CRM pipeline → after Agent 2 completes, open the agent output panel → click one node row to expand its justification → capture. |

### 2.3 `phase-3/screenshots/06_database_state.png` — DB-centric state (Drizzle Studio)

| Field | Value |
| --- | --- |
| Caption | Drizzle Studio view of the `workflow_pipeline_runs` table with JSONB columns for each agent's output, showing progressive enrichment across a single run. |
| Surface | Drizzle Studio (out-of-app, but part of the build) |
| Evidence value | Substantiates the "database as single source of truth" architecture claim in `phase-2/04-tools-memory-data-design.md`. Distinguishes our design from in-memory / session-scoped agent chains. |
| Reproduction | `pnpm drizzle-kit studio` → open `http://local.drizzle.studio` → table **workflow_pipeline_runs** → filter to the most recent run → capture the row expanded to show `decomposition_output`, `system_selection_output`, `orchestration_output`, and `governance_output` JSONB cells. |

### 2.4 `phase-3/screenshots/07_full_pipeline_completion.png` — End-to-end pipeline success

| Field | Value |
| --- | --- |
| Caption | Completion view after all four agents have run and been approved, showing the final workflow graph with per-node autonomy tags and governance annotations. |
| Surface | Pipeline run view → final state |
| Evidence value | Single frame that demonstrates the full four-agent pipeline ran end-to-end for the primary evaluation scenario. Serves as the headline image in the final report. |
| Reproduction | Run the CRM pipeline through all four agent approval gates to completion → capture the final graph view with the "Pipeline complete" state visible. |

### 2.5 `phase-3/screenshots/08_retry_with_feedback.png` — Feedback-as-retry flow

| Field | Value |
| --- | --- |
| Caption | Agent 3 re-running after rejection, with the original output, the reviewer's feedback text, and the regenerated output shown side-by-side. |
| Surface | Pipeline run view → Agent 3 output tab, post-rejection retry |
| Evidence value | Evidences the "feedback-as-retry" mechanism from `phase-2/03-coordination-logic.md`. Also serves as one of the two required documented failure / boundary cases (rubric §6) if the first Agent 3 attempt had a genuine deficiency. |
| Reproduction | During a CRM pipeline run, at the Agent 3 approval gate click **Reject with feedback** → enter a concrete correction (e.g. "Add a Slack notification after CRM upsert") → submit → wait for Agent 3 to regenerate → capture with both outputs visible in the diff view. |

---

## 3. Naming convention

| Segment | Rule |
| --- | --- |
| Prefix | Two-digit zero-padded index matching the order screenshots appear in the final report. Existing 01–03 = dashboard / templates / wizard (Phase 2), 04–08 = Phase 3 captures. |
| Name | Lower-snake-case, describes the surface not the workflow domain. |
| Extension | `.png` for Phase 3 captures, existing `.jpg` files kept as-is to avoid breaking the Phase 2 video and bundle. |

Example: `04_approval_gate.png`, not `CRM_approval_rejected_v2.png`.

---

## 4. Capture checklist (for whoever takes the screenshots)

Before saving each Phase 3 screenshot:

- [ ] Browser viewport set to 1440×900 (Chrome DevTools → device toolbar → responsive → 1440×900).
- [ ] No personally-identifying test data visible (use the seeded CRM template, not real leads).
- [ ] Relevant panel / row is expanded so the evidence value is visible in the frame.
- [ ] Dark-mode theme active (matches the existing three screenshots).
- [ ] File saved into `phase-3/screenshots/` with the exact filename from §2 above.
- [ ] This index updated with the capture date in a new **Captured on** row under the file's table.

---

## 5. Cross-references

| Rubric item | Screenshots that satisfy it |
| --- | --- |
| §4 Evidence Package — "screenshots of key pipeline states" | 2.1, 2.2, 2.4, 2.5 |
| §4 Evidence Package — interaction traces supporting material | 2.3 (DB state), 2.5 (retry transcript) |
| §6 Failure Analysis — at least one concrete failure / retry case | 2.5 |
| §8 Portfolio-Ready Package — 4–8 captioned screenshots | All 8 entries above |
| `phase-2/06-risk-governance-plan.md` — HITL gate claim | 2.1 |
| `phase-2/04-tools-memory-data-design.md` — DB-centric state claim | 2.3 |
| `phase-2/03-coordination-logic.md` — feedback-as-retry claim | 2.5 |

---

_Last updated: April 21, 2026. Edit this file whenever a new screenshot is added or an existing one is replaced._
