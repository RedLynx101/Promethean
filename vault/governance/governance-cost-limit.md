---
type: governance-policy
id: governance-cost-limit
tags: [governance, cost, hard-limit]
linksTo: [governance-index, governance-cost, L4-tool-augmented-llm, L5-multi-agent]
---

# Cost Limit Per Run (hard kill)

**`costLimitPerRun`** — abort the run when accumulated cost exceeds this. Hard kill, not an alert.

## Mandatory for

- Any workflow with [[L4-tool-augmented-llm]] or [[L5-multi-agent]] nodes (agent loops can spiral).
- Any workflow that takes external user input (poisoned prompts can drive cost explosions).

## Implementation

The execution runtime (or the harness running the agent) must:

1. Track accumulated `cost` on the execution record after every model/tool call.
2. Before issuing the next model call, check `accumulatedCost + estimatedNextCost > costLimitPerRun`.
3. If exceeded: abort, mark the execution `failed`, write a `cost_limit_exceeded` alert.

For Claude Code / Codex harness setups: configure the per-session token budget in the harness config and wire a stop-hook that fires on breach.

## Picking a value

5× to 10× the `costThreshold` is a reasonable default. Lower for untrusted inputs, higher for known-bounded internal tasks.
