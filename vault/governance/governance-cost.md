---
type: governance-policy
id: governance-cost
tags: [governance, cost]
linksTo: [governance-index, governance-cost-limit, L3-single-llm-agent, L4-tool-augmented-llm]
---

# Cost Threshold (alert)

**`costThreshold`** — alert if a single run's cost exceeds this. Soft limit. The run continues; an alert fires.

## Picking a value

- Base it on `estimatedCostPerRun` × 2.
- For L0/L1/L2 workflows: pennies — set $0.05–$0.20.
- For L3-heavy: $0.20–$1.00.
- For L4 with web search / retrieval: $1.00–$5.00.
- For L5 multi-agent: $5.00+ depending on sub-agent count.

## What to log on breach

- workflow id, execution id
- per-step cost breakdown (so the offender is identifiable)
- the trigger payload (often a pathological input)
- model + token counts per call

Pair with [[governance-cost-limit]] (hard kill) so a runaway run can't burn $1000 before the alert is read.
