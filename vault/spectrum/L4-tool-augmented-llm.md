---
type: spectrum-level
id: L4-tool-augmented-llm
level: 4
color: "#F44336"
tags: [spectrum, llm, tools, agentic]
linksTo: [spectrum-index, L3-single-llm-agent, L5-multi-agent, integration-index]
---

# L4 — Tool-Augmented LLM

LLM with **tool calls** — search, APIs, code execution, vector retrieval. Multi-step within a single agent, dynamic.

## When to use

- The model needs information not present in the prompt (web search, internal docs via RAG, live API state).
- The task involves taking actions on external systems (write to a CRM, file a ticket, run a query).
- The decision tree is too dynamic for L0/L3 chains.

## Typical tools

- LLM with function-calling: `openai.chat` + `tools=[...]`, `anthropic.messages` + tools, `langchain` agents.
- Retrieval: `vector-search` (pgvector, Pinecone, Weaviate), `web-search` (Tavily, Brave, SerpAPI), `virustotal-api`, internal doc search.
- Action APIs: see [[integration-index]].

## Cost / latency profile

- **Cost:** $0.01–$1.00+ per run. Multiple model calls + tool latency stack up.
- **Latency:** 5–60s typical.
- **Confidence:** lowest of the LLM tiers — tool errors and hallucinated tool args are common.

## Required guardrails

- **Hard cost cap** per run — see [[governance-cost-limit]].
- **Max tool-call depth** to prevent infinite agent loops.
- **Tool schema validation** — every tool input/output goes through Zod.
- **Allowlist of tools** per workflow — never give the agent every tool you have.
- Strong logging — see [[governance-logging]] (`verbose` recommended).

## Anti-patterns

- Giving the agent write access to production systems without [[HumanGate]] before destructive actions.
- Letting the agent decide its own retry policy. Wrap tool calls in [[pattern-retries]].
- Skipping L4 → L5: don't multi-agent prematurely. One well-tooled agent beats five poorly-coordinated ones.

## Examples in templates

- Policy gap analysis + regulatory research in [[template-compliance-memo-generator]], AI threat analysis in [[template-cybersecurity-incident-response]], AI code review in [[template-code-review-pipeline]].
