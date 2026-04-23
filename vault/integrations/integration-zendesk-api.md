---
type: integration
id: integration-zendesk-api
tags: [integration, action, support]
linksTo: [integration-index]
---

# Zendesk API

Ticket ingestion (Trigger), routing, agent assignment, comment posting.

## Auth

OAuth 2.0 or API token + email. Token preferred for server-to-server. Subdomain in URL: `https://<subdomain>.zendesk.com/api/v2`.

## Idempotency

- Creating tickets: pass `external_id` to dedupe across retries.
- Updating tickets: PUT is naturally idempotent.
- Posting comments: not idempotent — track `(ticketId, executionId) → commentId` to dedupe.

## Rate limits

200 req/min for most plans, 700 for Enterprise. 429 with `Retry-After` header.

## Trigger pattern

Zendesk Triggers (the platform feature, not Promethean's Trigger node) can post to a webhook on ticket create/update. Set this up to feed into the Promethean [[Trigger]] node.
