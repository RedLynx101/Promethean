---
type: spectrum-level
id: Trigger
level: trigger
tags: [spectrum, trigger, entry-point]
linksTo: [spectrum-index]
---

# Trigger — Workflow Entry Point

Not a level — the **entry point** of every workflow. Always the first node. `nodeCategory: "trigger"` in the schema.

## Trigger types

| Type | When | Tools |
|------|------|-------|
| **webhook** | External system pushes (CRM form, GitHub PR, Stripe event) | HTTP receiver |
| **cron** | Scheduled (hourly profiling, nightly reports) | scheduler |
| **queue** | Message arrives (Kafka, SQS, Redis stream) | consumer |
| **manual** | Human kicks off via UI or API | API endpoint |
| **file** | New object in S3 / GCS / Drive | event subscription |
| **email** | Inbound message to monitored address | IMAP / SES |

## What the trigger node owns

1. **Schema of the trigger payload** — every downstream node depends on this contract.
2. **Authentication** of the caller (HMAC sig, OAuth, API key).
3. **Idempotency key** — so retries don't double-process.
4. **Rate limit** — protect downstream cost (especially [[L3-single-llm-agent]]+ chains).

## Anti-patterns

- Multiple triggers in one workflow. Split into separate workflows that share downstream patterns.
- Trusting the trigger payload without validation — pair with an [[L0-deterministic]] validation node immediately after.
