---
type: pattern
id: pattern-retries
tags: [patterns, retries, resilience]
linksTo: [pattern-index, pattern-error-handling]
---

# Retries with Backoff

Use `edge.type: "loop"` to mark a back-edge from a failure handler back to the failed node.

## Defaults

- **Max attempts:** 3 (1 initial + 2 retries) for idempotent calls. **1** for non-idempotent (don't retry a Stripe charge).
- **Backoff:** exponential with jitter. Base 1s, cap 30s. `delay = min(base * 2^attempt, cap) * (0.5 + random())`.
- **Retry on:** transient errors only — HTTP 408/429/5xx, network timeouts, rate-limit signals from model providers.
- **Do not retry on:** 4xx (other than 408/429), schema validation failures, permission errors.

## Idempotency

Always set an idempotency key on the upstream call:

- Webhooks: use the upstream event id.
- LLM calls: hash of `{model, prompt, tool_args}` for caching providers, or pass `idempotency_key` to providers that support it.
- DB writes: prefer `INSERT ... ON CONFLICT DO NOTHING` or `UPDATE ... WHERE`.

## Anti-patterns

- Retrying L4/L5 agent loops blindly — see [[governance-cost-limit]].
- Infinite retry. Always cap.
- Same backoff base across all nodes — slow APIs need longer base.
