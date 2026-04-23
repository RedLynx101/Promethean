---
type: integration
id: integration-anthropic-messages
tags: [integration, llm, anthropic]
linksTo: [integration-index, L3-single-llm-agent, L4-tool-augmented-llm, L5-multi-agent]
---

# anthropic.messages.create

Alternative L3/L4 LLM. Often preferred for long-context analysis, code review, and harnessed-agent (Claude Code SDK) flows.

## Auth

`ANTHROPIC_API_KEY` env var.

## Strengths vs. OpenAI

- Larger context windows (200K+) — useful for L4 RAG over long docs and L5 sub-agent context handoffs.
- Strong tool-use behaviour with explicit `tool_use` / `tool_result` content blocks.
- The **Claude Agent SDK** runs harnessed agents end-to-end — the right primitive for the "agent reads vault → emits artifact" architecture in the [vault README](../README.md).

## Cost tracking

Read `usage.input_tokens`, `usage.output_tokens`, plus `cache_read_input_tokens` / `cache_creation_input_tokens`. **Use prompt caching** for the system prompt + vault context — typically 90% cost reduction for repeated reads.

## Structured outputs

Use the `tool_use` mechanism — define a single "submit" tool whose input_schema is the structured output you want. Validate with Zod after.
