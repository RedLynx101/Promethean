---
type: governance-policy
id: governance-logging
tags: [governance, logging, observability]
linksTo: [governance-index, governance-snapshots]
---

# Logging Level

**`loggingLevel`** — `"minimal" | "standard" | "verbose" | "debug"`.

| Level | Captures | When |
|-------|----------|------|
| `minimal` | Execution start/end, status, total cost/latency. | Cheap L0 workflows running thousands of times/day. |
| `standard` | `minimal` + per-step status, latency, cost. | Default. |
| `verbose` | `standard` + per-step input/output payloads, tool call args/results. | L3+, customer-facing, regulated. |
| `debug` | `verbose` + LLM raw responses, retry attempts, prompt versions. | Active development, post-incident, L5 multi-agent. |

## What gets persisted where

- `execution_steps.input` / `.output` / `.llmCalls` / `.toolCalls` — the structured per-step record.
- `pino` structured stdout — for log aggregation (Datadog, BetterStack, Grafana Loki).
- For verbose+ on L3+, also persist raw model responses to object storage (S3) keyed by `executionId/stepId` — too big for the row.

## PII / secrets

- Always **redact** trigger payloads matching configured PII patterns *before* persistence.
- Never log API keys, OAuth tokens, or signed URLs. Pino redact config lives in `artifacts/api-server/src/lib/logger.ts`.
