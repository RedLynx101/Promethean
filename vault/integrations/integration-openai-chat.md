---
type: integration
id: integration-openai-chat
tags: [integration, llm, openai]
linksTo: [integration-index, L3-single-llm-agent, L4-tool-augmented-llm]
---

# openai.chat.completions

The default L3/L4 LLM in Promethean. See `@workspace/integrations-openai-ai-server` for the configured client.

## Auth

`OPENAI_API_KEY` env var. For project-scoped keys also set `OPENAI_PROJECT`.

## Idempotency

OpenAI does **not** guarantee idempotency on the chat endpoint. To dedupe, hash `{model, messages, tools, response_format}` and cache the result yourself. (Helpful for re-runs and replay — see [[governance-snapshots]].)

## Cost tracking

Read `usage.prompt_tokens`, `usage.completion_tokens`, multiply by the model's published rate. Persist to `execution_steps.cost`. Pair with [[governance-cost-limit]].

## Structured outputs (always)

Always pass `response_format: { type: "json_object" }` (or `json_schema` for stricter contracts) and validate the result with a Zod schema before passing downstream. The Promethean agents already do this — see `artifacts/api-server/src/lib/agents/schemas.ts`.

## Common failure modes

- `429 rate_limit_exceeded` → [[pattern-retries]] with backoff.
- `invalid_request_error: response_format` → schema mismatch; validate before retry.
- Truncated JSON when `max_completion_tokens` is too low → bump and re-run.
- Hallucinated tool args (L4) → validate tool schemas; reject and re-prompt.

## Models in use

The Promethean agents currently use `gpt-5.4-mini-2026-03-17`. Pin model versions in workflow configs — silent rolls cause [[governance-error-rate]] spikes.
