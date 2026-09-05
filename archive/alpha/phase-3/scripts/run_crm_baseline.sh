#!/usr/bin/env bash
# Runs 9 CRM pipelines (3 variants × 3 runs) through the local API
# and captures traces for baseline-comparison analysis.
#
# Usage (from repo root):
#   bash phase-3/scripts/run_crm_baseline.sh

set -u
API="${API:-http://localhost:8080/api}"
TRACES="phase-3/traces"

now_ms() { python3 -c "import time; print(int(time.time()*1000))"; }

run_one() {
  local tc_id="$1"
  local wf_name="$2"
  local input_file="$3"

  local dir="$TRACES/$tc_id"
  mkdir -p "$dir"
  if [[ "$(realpath "$input_file" 2>/dev/null)" != "$(realpath "$dir/input.txt" 2>/dev/null)" ]]; then
    cp "$input_file" "$dir/input.txt"
  fi
  local desc
  desc=$(cat "$dir/input.txt")

  echo "[$tc_id] create workflow..."
  curl -s -X POST "$API/workflows" \
    -H 'content-type: application/json' \
    -d "$(jq -n --arg name "$wf_name" '{name:$name, domain:"crm"}')" \
    > "$dir/00_create_workflow.json"

  local wf_id
  wf_id=$(jq -r .id "$dir/00_create_workflow.json")
  if [[ -z "$wf_id" || "$wf_id" == "null" ]]; then
    echo "[$tc_id] FAILED to create workflow; skipping"
    return 1
  fi
  echo "workflow_id=$wf_id" > "$dir/timings.txt"

  echo "[$tc_id] start pipeline (decompose)..."
  local start end
  start=$(now_ms)
  curl -s -X POST "$API/pipeline/start" \
    -H 'content-type: application/json' \
    -d "$(jq -n --arg wf "$wf_id" --arg desc "$desc" '{workflowId:$wf, description:$desc, domain:"crm"}')" \
    > "$dir/01_decompose.json"
  end=$(now_ms)
  echo "decompose_ms=$((end - start))" >> "$dir/timings.txt"

  for phase in decompose select orchestrate govern; do
    echo "[$tc_id] approve $phase..."
    start=$(now_ms)
    curl -s -X POST "$API/pipeline/$wf_id/approve" \
      -H 'content-type: application/json' \
      -d "{\"phase\":\"$phase\"}" \
      > "$dir/02_approve_${phase}.json"
    end=$(now_ms)
    echo "approve_${phase}_ms=$((end - start))" >> "$dir/timings.txt"
  done

  curl -s "$API/pipeline/$wf_id/status" > "$dir/03_final_state.json"

  local phase_reached node_count cost
  phase_reached=$(jq -r '.phase // "unknown"' "$dir/03_final_state.json")
  node_count=$(jq -r '.workflow.nodes | length' "$dir/03_final_state.json")
  cost=$(jq -r '.workflow.estimatedCostPerRun // "null"' "$dir/03_final_state.json")
  echo "[$tc_id] done: phase=$phase_reached nodes=$node_count cost=\$$cost"
}

# V1 - existing TC-01 input, 2 additional runs for variance
V1_INPUT="$TRACES/tc-01/input.txt"
run_one "tc-01-r2" "TC-01 CRM Lead Qualification (run 2)" "$V1_INPUT"
run_one "tc-01-r3" "TC-01 CRM Lead Qualification (run 3)" "$V1_INPUT"

# V2 - Customer churn prevention, 3 runs
V2_INPUT="$TRACES/tc-01-v2/input.txt"
run_one "tc-01-v2"    "TC-01 V2 Customer Churn Prevention (run 1)" "$V2_INPUT"
run_one "tc-01-v2-r2" "TC-01 V2 Customer Churn Prevention (run 2)" "$V2_INPUT"
run_one "tc-01-v2-r3" "TC-01 V2 Customer Churn Prevention (run 3)" "$V2_INPUT"

# V3 - Sales opportunity progression, 3 runs
V3_INPUT="$TRACES/tc-01-v3/input.txt"
run_one "tc-01-v3"    "TC-01 V3 Sales Opportunity Progression (run 1)" "$V3_INPUT"
run_one "tc-01-v3-r2" "TC-01 V3 Sales Opportunity Progression (run 2)" "$V3_INPUT"
run_one "tc-01-v3-r3" "TC-01 V3 Sales Opportunity Progression (run 3)" "$V3_INPUT"

echo
echo "All 8 runs complete. Existing tc-01/ (run 1 of V1) remains unchanged."
