---
type: governance-policy
id: governance-alerting
tags: [governance, alerting]
linksTo: [governance-index]
---

# Alert Channels

**`alertChannels`** — array of strings. Currently supported: `"slack" | "email" | "pagerduty" | "webhook"`.

## Channel selection

| Severity | Channels |
|----------|----------|
| `info` | (no alert; logged only) |
| `warning` | `slack` |
| `error` | `slack` + `email` |
| `critical` | `pagerduty` (24/7), `slack` for context |

## Alert payload contract

Every alert written to `alertsTable` has `alertType`, `severity`, `title`, `description`, `workflowId`, optional `executionId`. Channel adapters read this row and format per channel.

## Alert types in active use

- `latency_spike` — see [[governance-latency]]
- `cost_limit_exceeded` — see [[governance-cost-limit]]
- `error_rate_breach` — see [[governance-error-rate]]
- `timeout` — see [[governance-execution-timeout]]
- `drift_detected` — schema drift from snapshot diff, see [[governance-snapshots]]
- `human_gate_pending` — open [[HumanGate]] beyond SLA

## Anti-patterns

- Pager-everything. Alerts that fire constantly get muted, then ignored when they matter.
- Slack-only for critical. People log off Slack at 5pm; PagerDuty for true `critical`.
