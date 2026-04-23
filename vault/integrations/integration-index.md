---
type: index
id: integration-index
tags: [integrations, tools]
---

# Integration Registry

Each integration note is the **canonical reference** for an external tool: what it does, what auth it needs, idempotency story, and gotchas. When an agent emits a runtime artifact that uses one of these, it should read the relevant note first.

The list below is seeded from the templates. Add a new note when you adopt a new tool.

## LLM providers
- [[integration-openai-chat]] — `openai.chat.completions`
- [[integration-anthropic-messages]] — `anthropic.messages.create`

## Action APIs
- [[integration-slack-api]]
- [[integration-github-api]]
- [[integration-zendesk-api]]
- [[integration-pagerduty]]

## Data / infra
- [[integration-postgres]]
- [[integration-vector-search]]
- [[integration-webhook-receiver]]

## Search & retrieval
- [[integration-web-search]]

> **Adding a new integration:** copy any of the notes above as a template. Frontmatter `type: integration`, `id: integration-<slug>`. Always document auth, idempotency, rate limits, common errors, and at least one Zod schema example.
