---
type: spectrum-level
id: L0-deterministic
level: 0
color: "#4CAF50"
tags: [spectrum, deterministic]
linksTo: [spectrum-index, pattern-error-handling]
---

# L0 — Deterministic

Rule-based logic with **zero AI**. Pure if/then/else, regex, schema validation, database lookups, arithmetic, routing tables.

## When to use

- Input is structured and bounded (you know every possible value).
- The decision can be expressed as a finite rule set.
- 100% predictability is required (compliance, billing, security gates).

## Typical tools

`zod`, `regex`, `postgres`, `redis`, native language primitives, JSON Schema validators, `webhook` receivers, REST clients to deterministic APIs (Slack post, GitHub API, Stripe charge, S3 put).

## Cost / latency profile

- **Cost:** ~$0 (no model calls).
- **Latency:** ms to low-100s ms.
- **Confidence:** typically 95–99 — if you're unsure it's deterministic, it isn't.

## Anti-patterns

- Using L0 to handle natural language. Push to [[L2-language-understanding]] or [[L3-single-llm-agent]].
- "Deterministic" wrapping of an LLM call. The wrapper is L0; the call inside is whatever level the call is.

## Examples in templates

- Data validation, routing decisions, evidence collection, ticket ingestion, Slack notifications — see [[template-crm-lead-qualification]], [[template-cybersecurity-incident-response]].
