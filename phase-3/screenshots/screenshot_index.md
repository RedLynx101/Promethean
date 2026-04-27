# Phase 3 — Screenshot Index

> Captioned evidence of Promethean Studio in operation, mapped to the Phase 3 rubric's Evidence Package requirement (§4) and Portfolio-Ready Package requirement (§8).

This index documents every screenshot included in the Phase 3 submission. Each entry lists:
- **File** — relative path to the image
- **Caption** — one-line description suitable for the final report
- **Surface** — which part of the system the screenshot captures
- **Evidence value** — which rubric item it supports and why it is non-redundant
- **Reproduction** — exact steps to recapture the screenshot locally

Screenshots are stored as `.jpg` (Phase 2 captures, at repo root under `screenshots/`) or `.png` (Phase 3 captures, in this folder). Phase 3 captures follow the numbered convention `NN_short_name.png` so ordering matches the final report narrative.

---

## 1. Phase 2 screenshots (reused unchanged)

These three were captured during Phase 2 and are reused for Phase 3. They live at the repo root under `screenshots/` so the existing demo video and Phase 2 bundle continue to reference them.

### 1.1 `screenshots/dashboard.jpg` — Command Center

| Field | Value |
| --- | --- |
| Caption | Fleet-level view of all workflows with 24-hour execution metrics, latency timeline, active-alert feed, and per-workflow success indicators. |
| Surface | Command Center (post-pipeline, operational monitoring) |
| Evidence value | Demonstrates the "portfolio-ready UI" required by rubric §8 and shows that governance telemetry (success rate, latency, cost, alerts) is surfaced to operators rather than hidden in logs. |
| Reproduction | `pnpm --filter @workspace/api-server run dev` and `pnpm --filter @workspace/promethean run dev` → open `http://localhost:5200/` → left nav **Command Center**. Requires at least one executed workflow in the DB to populate the timeline and fleet list. |

### 1.2 `screenshots/templates.jpg` — Template Library

| Field | Value |
| --- | --- |
| Caption | Six pre-configured workflow blueprints across Data Engineering, Legal & Compliance, Engineering, Sales, Security, and Customer Success, each deployable in one click. |
| Surface | Template Library (pre-pipeline, user entry point) |
| Evidence value | Shows breadth of supported domains and satisfies the rubric's request for concrete target-user scenarios. Also provides the CRM Lead Qualification tile used as the primary evaluation scenario (see `phase-2/08-interaction-trace.md`). |
| Reproduction | Start both dev servers → left nav **Template Library**. Templates are seeded from `artifacts/api-server/src/db/seed/templates.ts`. |

### 1.3 `screenshots/wizard.jpg` — Prometheus Intake (opening turn)

| Field | Value |
| --- | --- |
| Caption | Opening turn of the Prometheus Intake conversation, prompting the user for the workflow name. |
| Surface | New Workflow wizard — intake step 0/2 |
| Evidence value | Demonstrates the human-authored-input → AI-agent handoff boundary. The progress indicator documents the fixed-structure intake that feeds downstream agents. |
| Reproduction | Start both dev servers → left nav **+ New Workflow** → the first assistant turn appears immediately; screenshot before typing. |

---

## 2. Phase 3 captures (new for final submission)

Five new screenshots document the full pipeline lifecycle for the CRM Lead Qualification evaluation scenario, in the order a reviewer would encounter them. All captured on April 24, 2026 on a local dev environment (`http://localhost:5200/`) with the CRM Lead Qualification template.

### 2.1 `phase-3/screenshots/04_intake_review_gate.png` — Prometheus Intake review

| Field | Value |
| --- | --- |
| Caption | Pre-pipeline intake review (Step 2/2) showing Prometheus' auto-generated Domain classification, compliance-framework mapping (GDPR, CCPA, SOC 2, ISO/IEC 27001, NIST AI RMF 1.0, NIST CSF 2.0), and concrete guardrails, each with Accept / Edit controls for human review before Launch. |
| Surface | New Workflow wizard — intake step 2/2 |
| Evidence value | First human-in-the-loop checkpoint. Evidences the governance-by-design claim in `phase-2/06-risk-governance-plan.md`: compliance frameworks and guardrails are surfaced for human approval *before* the agent pipeline begins, not retrofitted afterward. |
| Reproduction | Start both dev servers → **+ New Workflow** → name the workflow "CRM Lead Qualification" → paste the CRM evaluation description → wait for Prometheus to emit the three review panels → capture before clicking Launch. |
| Captured on | April 24, 2026 |

### 2.2 `phase-3/screenshots/05_agent_output_detail.png` — Decomposition gate with task graph

| Field | Value |
| --- | --- |
| Caption | Post-Decomposition human gate showing the 11-node task graph emitted by Agent 1 (Receive New Lead → Collect Lead Data → Validate Lead → … → Log Audit Event), with the "Review the decompose analysis" banner and Regenerate / Edit & Approve / APPROVE controls. |
| Surface | Pipeline run view — post-Agent 1 approval gate |
| Evidence value | Proves Agent 1 emits a structured, inspectable task decomposition (not free-form text), and that the reviewer can regenerate, edit, or approve before Agent 2 runs. Supports rubric §4 (interaction traces) and §6 (design decisions are inspectable). |
| Reproduction | From the intake review, accept all three panels → click Launch → wait for Decomposition to complete → capture the graph view with the "Review the decompose analysis" banner visible. |
| Captured on | April 24, 2026 |

### 2.3 `phase-3/screenshots/06_approval_gate_inter_agent.png` — System Selection gate with L0–L5 override

| Field | Value |
| --- | --- |
| Caption | Post-System-Selection human gate showing per-node L0–L5 autonomy classifications (L0 Deterministic for most nodes, L3 Single LLM for "Prepare Sales Handoff") with editable dropdowns under the "Adjust AI-assigned system levels before approving" panel. |
| Surface | Pipeline run view — post-Agent 2 approval gate |
| Evidence value | **Most distinctive screenshot in the set.** Directly visualizes the L0–L5 autonomy spectrum from `phase-2/02-role-definitions.md` and the reviewer's per-node override capability — evidence that the system-selection decision is both AI-generated and human-correctable at fine granularity, not an opaque batch approval. |
| Reproduction | Continue from the Decompose gate → Edit & Approve → wait for System Selection → capture the L0–L5 Classification Override panel with the "Review the select analysis" banner and the Prepare Sales Handoff dropdown set to L3. |
| Captured on | April 24, 2026 |

### 2.4 `phase-3/screenshots/07_govern_gate.png` — Governance gate before Deploy

| Field | Value |
| --- | --- |
| Caption | Post-Governance human gate showing the final enriched graph (including the Governance Checkpoint and Human Review Gate nodes added by Agent 4) with the "Review the govern analysis" banner and the green **DEPLOY** action enabled. |
| Surface | Pipeline run view — post-Agent 4 approval gate |
| Evidence value | Evidences the governance-agent contribution in `phase-2/04-tools-memory-data-design.md` — Agent 4 injects compliance-specific nodes (checkpoints, human-review gates) into the workflow graph, which the reviewer must approve before deployment. This is the last HITL gate before production. |
| Reproduction | Continue from the Select gate through Orchestrate → wait for Governance to complete → capture the graph view with the orange Governance Checkpoint and Human Review Gate nodes visible and the DEPLOY button active. |
| Captured on | April 24, 2026 |

### 2.5 `phase-3/screenshots/08_deployed_gate.png` — End-to-end pipeline success

| Field | Value |
| --- | --- |
| Caption | Post-deployment state with all six pipeline stages (Intake, Decompose, Select, Orchestrate, Govern, Deployed) complete and the DEPLOYED badge active, showing the final governed workflow graph ready for execution. |
| Surface | Pipeline run view — final deployed state |
| Evidence value | Single frame that demonstrates the full four-agent pipeline ran end-to-end for the primary CRM Lead Qualification evaluation scenario. Serves as the closing image in the final report narrative. |
| Reproduction | From the Govern gate, click **DEPLOY** → wait for the deployed state to render → capture with all six progress pills green and the DEPLOYED badge visible top-right. |
| Captured on | April 24, 2026 |

---

## 3. Naming convention

| Segment | Rule |
| --- | --- |
| Prefix | Two-digit zero-padded index matching the order screenshots appear in the final report. 01–03 = Phase 2 (dashboard / templates / wizard), 04–08 = Phase 3. |
| Name | Lower-snake-case, describes the surface not the workflow domain. |
| Extension | `.png` for Phase 3 captures, existing `.jpg` files kept as-is to avoid breaking the Phase 2 video and bundle. |

---

## 4. Cross-references

| Rubric item | Screenshots that satisfy it |
| --- | --- |
| §4 Evidence Package — screenshots of key pipeline states | 2.1, 2.2, 2.3, 2.4, 2.5 |
| §4 Evidence Package — interaction traces supporting material | 2.2 (agent output), 2.3 (L0–L5 override) |
| §6 Failure Analysis — human correction surfaces | 2.3 (per-node override), 2.4 (governance review) |
| §8 Portfolio-Ready Package — 4–8 captioned screenshots | All 8 entries above |
| `phase-2/02-role-definitions.md` — L0–L5 spectrum | 2.3 |
| `phase-2/03-coordination-logic.md` — approval-gate sequencing | 2.2, 2.3, 2.4 |
| `phase-2/04-tools-memory-data-design.md` — governance agent output | 2.4 |
| `phase-2/06-risk-governance-plan.md` — HITL gate claim | 2.1, 2.2, 2.3, 2.4 |

---

## 5. Capture environment (for reproduction)

- Browser: Chrome at 1440×900 viewport, zoom 100%, dark mode
- Frontend: `pnpm --filter @workspace/promethean run dev` → `http://localhost:5200/`
- Backend: `pnpm --filter @workspace/api-server run dev` → `http://localhost:8080/`
- Database: Postgres with the CRM Lead Qualification template seeded
- OpenAI: `gpt-5.4-mini-2026-03-17` via `AI_INTEGRATIONS_OPENAI_API_KEY`
- Full-page captures taken via Chrome DevTools → Command Menu → "Capture full size screenshot"

---

_Last updated: April 24, 2026. Edit this file whenever a new screenshot is added or an existing one is replaced._
