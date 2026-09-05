#!/usr/bin/env bash
# Drives one test case through the Promethean pipeline end-to-end and saves
# trace files + per-phase wall-clock timing to phase-3/traces/<tc>/.
#
# Usage: run_tc.sh <tc-id> <workflow-name> <domain>
# Reads input from phase-3/traces/<tc-id>/input.txt
set -euo pipefail

TC="${1:?tc-id required}"
NAME="${2:?workflow-name required}"
DOMAIN="${3:-general}"

API="${API:-http://localhost:8080/api}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/traces/$TC"

if [[ ! -f "$DIR/input.txt" ]]; then
  echo "missing $DIR/input.txt" >&2
  exit 1
fi

mkdir -p "$DIR"
TIMES="$DIR/timings.txt"
: > "$TIMES"

tick() { python3 -c 'import time; print(int(time.time()*1000))'; }

t0=$(tick)
curl -s -X POST "$API/workflows" \
  -H 'content-type: application/json' \
  -d "$(jq -n --arg name "$NAME" --arg domain "$DOMAIN" '{name:$name, domain:$domain}')" \
  > "$DIR/00_create_workflow.json"
echo "create_workflow_ms=$(($(tick)-t0))" >> "$TIMES"

WF=$(jq -r .id "$DIR/00_create_workflow.json")
echo "workflow_id=$WF" >> "$TIMES"

DESC=$(jq -Rs . < "$DIR/input.txt")

t0=$(tick)
curl -s -X POST "$API/pipeline/start" \
  -H 'content-type: application/json' \
  -d "{\"workflowId\":\"$WF\",\"description\":$DESC,\"domain\":\"$DOMAIN\"}" \
  > "$DIR/01_decompose.json"
echo "decompose_ms=$(($(tick)-t0))" >> "$TIMES"

# Check for error on start
if jq -e '.error' "$DIR/01_decompose.json" >/dev/null 2>&1; then
  echo "pipeline/start returned error:" >&2
  jq . "$DIR/01_decompose.json" >&2
  exit 2
fi

for PHASE in decompose select orchestrate govern; do
  t0=$(tick)
  curl -s -X POST "$API/pipeline/$WF/approve" \
    -H 'content-type: application/json' \
    -d "{\"phase\":\"$PHASE\"}" \
    > "$DIR/02_approve_${PHASE}.json"
  echo "approve_${PHASE}_ms=$(($(tick)-t0))" >> "$TIMES"

  if jq -e '.error' "$DIR/02_approve_${PHASE}.json" >/dev/null 2>&1; then
    echo "approve/$PHASE returned error:" >&2
    jq . "$DIR/02_approve_${PHASE}.json" >&2
    exit 3
  fi
done

curl -s "$API/pipeline/$WF/status" > "$DIR/03_final_state.json"

echo "--- $TC complete ---"
jq '{phase:.phase, status:.status, nodes:(.workflow.nodes|length), edges:(.workflow.edges|length), cost:.workflow.estimatedCostPerRun, latency_ms:.workflow.estimatedLatencyMs}' "$DIR/03_final_state.json"
cat "$TIMES"
