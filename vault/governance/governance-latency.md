---
type: governance-policy
id: governance-latency
tags: [governance, latency]
linksTo: [governance-index, governance-execution-timeout]
---

# Latency Threshold (alert)

**`latencyThreshold`** — alert if a single run exceeds this wall-clock time, in ms. Soft.

## Picking a value

- 2–3× the rolling p95 of the workflow's historical `totalLatencyMs`.
- For brand-new workflows, base on the sum of per-step expected latencies (L0: ~100ms, L1/L2: ~500ms, L3: ~5s, L4: ~20s, L5: ~60s).

## What slow runs usually mean

- **External API degradation** (the most common culprit — track per-tool latency separately).
- **Prompt context bloat** in [[L3-single-llm-agent]]+ as upstream steps accumulate state.
- **Agent loops** in [[L4-tool-augmented-llm]] / [[L5-multi-agent]] — pair with [[governance-execution-timeout]] hard kill.
