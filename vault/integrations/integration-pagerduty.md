---
type: integration
id: integration-pagerduty
tags: [integration, action, alerting, on-call]
linksTo: [integration-index, governance-alerting]
---

# PagerDuty

Critical-severity alerting (24/7 on-call escalation). See [[governance-alerting]] for severity routing.

## Auth

Events API v2 routing key per service. Different services per workflow domain (security, data, infra) so on-call rotations stay clean.

## Sending an event

`POST https://events.pagerduty.com/v2/enqueue` with `routing_key`, `event_action: "trigger" | "acknowledge" | "resolve"`, and a `dedup_key`.

## Idempotency

Use `dedup_key = "{workflowId}-{alertType}-{day}"` so repeated alerts from the same source on the same day update the same incident instead of paging again.

## Anti-patterns

- Wiring every workflow to one PagerDuty service. Split by domain so the right team gets paged.
- Pager-everything (see [[governance-alerting]]).
