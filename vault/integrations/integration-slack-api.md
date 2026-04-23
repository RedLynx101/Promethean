---
type: integration
id: integration-slack-api
tags: [integration, action, notification]
linksTo: [integration-index, governance-alerting]
---

# Slack API

Notifications, alert delivery, [[HumanGate]] approval prompts.

## Auth

OAuth 2.0 bot token (`xoxb-...`). Store in secret manager, never commit. Required scopes: `chat:write`, `channels:read`, `users:read`. For interactive approval buttons add `chat:write.public` and `interactivity`.

## Idempotency

Slack `chat.postMessage` is **not idempotent**. To dedupe, store `(workflowId, executionId, stepId) → ts` in postgres and check before posting. Or use `unfurl_links: false` + a unique `client_msg_id` you track.

## Rate limits

- Tier 2 (`chat.postMessage`): 1 message/sec/channel.
- Tier 3 (lookup): higher.
- Honour `Retry-After` on 429.

## Approval-button pattern (HumanGate)

Use Block Kit with action buttons → Slack hits your webhook → webhook updates the proposal record → workflow resumes. See [[pattern-human-gate]].
