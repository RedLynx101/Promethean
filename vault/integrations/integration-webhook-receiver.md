---
type: integration
id: integration-webhook-receiver
tags: [integration, trigger]
linksTo: [integration-index, Trigger]
---

# Webhook Receiver

The most common [[Trigger]] type. An HTTP endpoint that external systems POST to.

## Mandatory checks (in order)

1. **HMAC signature verification** — every provider has a header (`X-Hub-Signature-256` for GitHub, `X-Slack-Signature`, `Stripe-Signature`). Reject with 401 on mismatch.
2. **Replay protection** — use the timestamp header + a 5-min window. Reject older.
3. **Idempotency** — store the provider's event id; if seen, return 200 without re-processing.
4. **Schema validation** — Zod parse the body. 400 on mismatch.
5. **Rate limit per source** — protect downstream cost.

## Response

Return **200 OK fast** (under 1s — many providers retry on slow responses). Enqueue the actual workflow run; don't process inline.

## Anti-patterns

- Doing real work in the webhook handler. Always enqueue.
- Trusting `Content-Type: application/json` without HMAC. Spoofable.
- Logging the full body without [[governance-logging]] redaction — webhook bodies often contain PII.
