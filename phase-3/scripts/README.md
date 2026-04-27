# Phase 3 — Evidence Generation Guide

How to drive the live pipeline through the five test scenarios and collect the artifacts required by the rubric, without building new tooling.

---

## Prerequisites

1. Local dev stack running (`pnpm --filter @workspace/api-server run dev` on port 8080, `pnpm --filter @workspace/promethean run dev` for the UI).
2. Database seeded (happens automatically on first startup).
3. `curl` and `jq` on PATH. A shared directory at `phase-3/traces/` for JSON captures, created alongside this folder.

Set a convenience env var for the API base:

```bash
export API=http://localhost:8080/api
```

---

## 1. Run a scenario end-to-end and capture traces

Each scenario has the same three-step shape: create the workflow record, kick off the pipeline, and walk through four approvals. Save every response JSON under `phase-3/traces/<tc-id>/`.

### Step 1 — create the workflow shell

```bash
TC=tc-01
mkdir -p phase-3/traces/$TC

# Create an empty workflow to attach the pipeline run to.
curl -s -X POST "$API/workflows" \
  -H 'content-type: application/json' \
  -d '{"name":"TC-01 CRM Lead Qualification","domain":"crm"}' \
  | tee phase-3/traces/$TC/00_create_workflow.json \
  | jq .
```

Grab the returned `id` for subsequent calls:

```bash
WF=$(jq -r .id phase-3/traces/$TC/00_create_workflow.json)
```

### Step 2 — start the pipeline (runs Decomposition)

```bash
curl -s -X POST "$API/pipeline/start" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg wf "$WF" --arg desc "$(cat phase-3/traces/$TC/input.txt)" \
        '{workflowId:$wf, description:$desc, domain:"crm"}')" \
  | tee phase-3/traces/$TC/01_decompose.json \
  | jq '{phase, status, nodes: (.nodes|length), edges: (.edges|length), message}'
```

### Step 3 — approve each phase in turn

Run the four approvals in sequence. Between approvals, optionally edit the graph via the UI and capture screenshots at each gate.

```bash
for PHASE in decompose select orchestrate govern; do
  OUT=phase-3/traces/$TC/02_approve_${PHASE}.json
  curl -s -X POST "$API/pipeline/$WF/approve" \
    -H 'content-type: application/json' \
    -d "{\"phase\":\"$PHASE\"}" \
  | tee "$OUT" \
  | jq '{phase, status, nodes: (.nodes|length), message}'
done
```

The final approval (`govern`) flips the workflow to `deployed` and writes an immutable row into `workflow_versions`.

### Step 4 — pull final state

```bash
curl -s "$API/pipeline/$WF/status" \
  | tee phase-3/traces/$TC/03_final_state.json \
  | jq '{phase,status,nodeCount:(.workflow.nodes|length),cost:.workflow.estimatedCostPerRun}'
```

You now have a complete trace: `00_create_workflow.json`, `01_decompose.json`, `02_approve_decompose.json`, `02_approve_select.json`, `02_approve_orchestrate.json`, `02_approve_govern.json`, `03_final_state.json`.

---

## 2. Generate a rejection-with-feedback trace (for FC-0X evidence)

After any phase approval, hit `/reject` instead to produce a re-generation trace.

```bash
curl -s -X POST "$API/pipeline/$WF/reject" \
  -H 'content-type: application/json' \
  -d '{"phase":"select","feedback":"Email validation should be L0 not L3; this is a regex check."}' \
  | tee phase-3/traces/$TC/rejection_select_v1.json \
  | jq '{phase,status,message}'
```

Capture the before/after nodes in your failure log entry. This also supplies screenshot #08 from [../screenshots/screenshot_index.md](../screenshots/screenshot_index.md).

---

## 3. Compute metrics from traces (no new code required)

Run this `jq` pipeline against a completed trace set to fill a row in [../evidence/evaluation_results.csv](../evidence/evaluation_results.csv).

```bash
TC=tc-01
DIR=phase-3/traces/$TC

# Substep count and per-level histogram from the final decomposition+selection
jq '[.workflow.nodes[] | .data.systemLevel] | group_by(.) | map({level: .[0], count: length})' \
  "$DIR/03_final_state.json"

# Estimated cost and latency persisted by the Selection agent
jq '{
  estimatedCostPerRun: .workflow.estimatedCostPerRun,
  estimatedLatencyMs:  .workflow.estimatedLatencyMs
}' "$DIR/03_final_state.json"
```

Per-agent wall-clock latency comes from timestamping each curl call — wrap them with:

```bash
time curl -s -X POST "$API/pipeline/$WF/approve" ...
```

and record the `real` value.

---

## 4. Generate baselines (Always-L0 / Always-L4 / Always-L5)

The selection agent already persists `estimatedCostPerRun`. To compute the three baselines, overwrite `systemLevel` on every node and re-run the cost formula (same one the selection agent uses — see [artifacts/api-server/src/lib/agents/systemSelection.ts](../../artifacts/api-server/src/lib/agents/systemSelection.ts)).

Quick shell approximation (replace the per-level cost constants with the ones your agent uses):

```bash
jq '{
  nodes_count: (.workflow.nodes|length),
  baseline_L0_cost: (.workflow.nodes|length) * 0.0001,
  baseline_L4_cost: (.workflow.nodes|length) * 0.02,
  baseline_L5_cost: (.workflow.nodes|length) * 0.05,
  promethean_cost:  .workflow.estimatedCostPerRun
}' "$DIR/03_final_state.json"
```

For the final report, use the exact per-level unit costs from the selection agent so baselines are apples-to-apples.

---

## 5. Expert agreement (for TC-01 and TC-02)

1. Export the final nodes: `jq '.workflow.nodes[] | {id, label: .data.label, promethean: .data.systemLevel}' phase-3/traces/tc-01/03_final_state.json > phase-3/traces/tc-01/expert_rubric.json`
2. A team member fills in `expert_level` per node independently, without seeing Promethean's classification (hide the column in a spreadsheet).
3. Agreement = `count(promethean == expert_level) / total_nodes`.

Record the result in [../evidence/evaluation_results.csv](../evidence/evaluation_results.csv) under `expert_agreement_pct`.

---

## 6. Suggested capture order (half-day session)

Plan for roughly 3–4 focused hours; most time goes into expert review and baseline compute, not running the pipeline.

1. Boot dev stack; confirm the seeded DB (~5 min).
2. Run TC-01 through TC-04 end-to-end, capturing traces and screenshots 01–07 during TC-01 (~60 min).
3. Run TC-05a–TC-05d boundary cases, capturing screenshot 08 during whichever one produces the most illustrative failure (~30 min).
4. Trigger one rejection-with-feedback loop on TC-01 or TC-02 for FC-0X (~15 min).
5. Fill in [../evidence/evaluation_results.csv](../evidence/evaluation_results.csv) from `jq` outputs (~45 min).
6. Run expert-agreement review on TC-01 and TC-02 (~45 min).
7. Promote the two worst observed failures into [../evidence/failure_log.md](../evidence/failure_log.md) with root-cause notes and a linked fix commit (~30 min).

---

## 7. Output checklist

After the session you should have:

- [x] `phase-3/traces/tc-01/` through `tc-05d/` — full JSON trace per scenario
- [x] `phase-3/evidence/evaluation_results.csv` — one populated row per scenario
- [x] `phase-3/evidence/failure_log.md` — at least FC-01 and FC-02 filled in
- [x] `phase-3/evidence/version_notes.md` — entries for any fix commits that landed during evaluation
- [x] `phase-3/screenshots/01_*.png` through `08_*.png`
- [x] At least one rejection-with-feedback trace to support the HITL claim

If any checkbox is empty, the evidence package is incomplete for rubric §4 and §6.
