---
type: spectrum-level
id: L2-language-understanding
level: 2
color: "#9C27B0"
tags: [spectrum, nlp, nlu]
linksTo: [spectrum-index, L1-supervised-ml, L3-single-llm-agent]
---

# L2 — Language Understanding

NLP / NLU. **Understands language but doesn't generate it.** Intent classification, entity extraction, sentiment, language detection, embedding for retrieval.

## When to use

- Input is unstructured text but the *output* is structured (a class, entities, a sentiment score, an embedding).
- An L3 LLM would be overkill (cost, latency) for what is fundamentally a classification task.

## Typical tools

`spacy`, `huggingface-transformers` (BERT-family encoders), `openai.embeddings`, `voyage-embeddings`, `cohere-rerank`, hosted classifiers (Google NL, AWS Comprehend).

## Cost / latency profile

- **Cost:** ~$0.0001–$0.001 per call.
- **Latency:** 50ms–500ms typical for hosted; near-zero for local encoders.
- **Confidence:** classifier scores; route low-confidence to [[HumanGate]].

## Anti-patterns

- Using L2 to *generate* a response. That's L3+.
- Using a full LLM (L3) to do intent classification. Use L2 — it's 100× cheaper and faster.

## Examples in templates

- Intent classification + sentiment analysis in [[template-customer-support-triage]], document NLP extraction in [[template-compliance-memo-generator]].
