---
type: integration
id: integration-web-search
tags: [integration, retrieval, l4]
linksTo: [integration-index, L4-tool-augmented-llm]
---

# Web Search

External search as an [[L4-tool-augmented-llm]] tool. Choices: Tavily (LLM-tuned), Brave Search API, SerpAPI (Google scrape).

## When to use

- The workflow needs current information (regulatory updates, threat intel, news, market data).
- Reference material isn't in your vector store.

## Cost / latency

- ~$0.005–$0.02 per query.
- Latency: 500ms–3s.
- **Always cap calls per agent run** in the L4 tool definition — agents will gladly burn 30 searches if you let them.

## Anti-patterns

- Web search as a substitute for proper RAG over internal docs.
- Letting raw scraped HTML into the LLM context — clean / extract main content first (Readability, Mercury Parser).

## Examples in templates

- Regulatory research in [[template-compliance-memo-generator]], threat-intel correlation in [[template-cybersecurity-incident-response]].
