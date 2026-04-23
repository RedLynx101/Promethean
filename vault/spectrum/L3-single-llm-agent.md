---
type: spectrum-level
id: L3-single-llm-agent
level: 3
color: "#FF9800"
tags: [spectrum, llm]
linksTo: [spectrum-index, L4-tool-augmented-llm, governance-cost]
---

# L3 — Single LLM Agent

**One LLM call**, structured output, no external tool use. Generation, summarisation, drafting, reasoning over text passed in the prompt.

## When to use

- The task requires generating language (a draft, a summary, a rewrite).
- All the context the model needs fits in the prompt.
- The output schema can be enforced with structured outputs / Zod.

## Typical tools

`openai.chat` (with `response_format: json_object` or structured outputs), `anthropic.messages`, `google.gemini`. Always pair with a Zod or JSON Schema validator.

## Cost / latency profile

- **Cost:** $0.001–$0.05 per call depending on model + context length. Track in [[governance-cost]].
- **Latency:** 1–10s typical. Track in [[governance-latency]].
- **Confidence:** LLMs are bad at calibrating confidence — use structured outputs and validate downstream.

## Required guardrails

- **Structured output** — never accept free-form text into a downstream step.
- **Cost ceiling** per call — see [[governance-cost]].
- **Timeout** — see [[governance-execution-timeout]].
- Consider **caching** for repeated prompts.

## Anti-patterns

- Using L3 when L2 would do (e.g., classifying sentiment with GPT-4 instead of a small classifier).
- Free-form output. Always force structure.
- Chaining multiple L3 calls in sequence to do tool-use — that's [[L4-tool-augmented-llm]].

## Examples in templates

- Lead scoring in [[template-crm-lead-qualification]], memo drafting in [[template-compliance-memo-generator]], auto-response draft in [[template-customer-support-triage]].
