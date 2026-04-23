---
type: governance-policy
id: governance-execution-timeout
tags: [governance, timeout, hard-limit]
linksTo: [governance-index, governance-latency, L4-tool-augmented-llm]
---

# Execution Timeout (hard kill)

**`executionTimeoutMs`** — abort the run after this many ms of wall-clock. Hard kill.

## Mandatory for

- Any workflow with [[L4-tool-augmented-llm]] / [[L5-multi-agent]] (loop risk).
- Any workflow triggered by external webhooks (you don't want a wedged run blocking subsequent triggers).

## Picking a value

3–5× `latencyThreshold`. Round to a friendly number (5min, 10min, 30min).

## Behaviour on timeout

1. Mark execution `failed` with `error.message = "execution_timeout"`.
2. Best-effort cancel any in-flight tool calls (most APIs have AbortController support).
3. Persist whatever partial output exists on the execution record.
4. Fire a `latency_spike` or `timeout` alert depending on cause.
