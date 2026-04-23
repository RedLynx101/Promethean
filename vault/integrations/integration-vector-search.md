---
type: integration
id: integration-vector-search
tags: [integration, retrieval, l4]
linksTo: [integration-index, L4-tool-augmented-llm, L2-language-understanding]
---

# Vector Search (RAG)

Embedding-based retrieval for [[L4-tool-augmented-llm]] context grounding. Choices: `pgvector` (default — already on postgres), Pinecone, Weaviate, Qdrant.

## When to use

- The agent needs reference material that doesn't fit in the prompt.
- Internal docs, regulatory text, past tickets, prior memos — anything searchable by meaning rather than keyword.

## Pipeline

1. **Chunk** source docs (~500 tokens, overlap 50).
2. **Embed** with `openai.embeddings` or `voyage-3` (cheaper, often better recall).
3. **Store** with metadata for filtering (doc id, version, ACLs).
4. **Query**: embed the user's question, top-K (typically 5–10) by cosine, optionally **rerank** with `cohere-rerank-3` for quality.
5. **Inject** retrieved chunks into the L4 prompt with citation tags.

## Governance

- Track embedding model + version per chunk so re-embeds are detectable.
- Re-embed when source docs change (write-time hook on the source CMS).
- Honour ACLs at query time — never let the agent retrieve a chunk the user can't see.

## Examples in templates

- Policy gap analysis in [[template-compliance-memo-generator]] uses vector search over internal policies.
