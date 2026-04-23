---
type: template
id: template-compliance-memo-generator
domain: Legal & Compliance
tags: [template, compliance, legal, document-gen]
estimatedCostPerRun: 0.245
estimatedLatencyMs: 12000
linksTo: [template-index, L0-deterministic, L2-language-understanding, L3-single-llm-agent, L4-tool-augmented-llm, HumanGate, pattern-parallel, integration-vector-search, integration-web-search]
---

# Compliance Memo Generator

Multi-agent pipeline that analyses regulatory updates, cross-references internal policies, drafts compliance memos for legal review.

## Shape

```
Trigger ─→ NLP Extract ─┬─→ Policy Gap (L4)  ─┐
                        └─→ Reg Research (L4) ─┴─→ Draft Memo (L3) ─→ [HumanGate]
```

## Nodes

| Step | Level | Tools |
|------|-------|-------|
| Regulatory Update Trigger | [[L0-deterministic]] (Trigger) | rss-feed, webhook |
| Document NLP Extraction | [[L2-language-understanding]] | spacy, huggingface |
| Policy Gap Analysis | [[L4-tool-augmented-llm]] | openai.chat, [[integration-vector-search]] |
| Regulatory Research | [[L4-tool-augmented-llm]] | openai.chat, [[integration-web-search]] |
| Memo Drafting Agent | [[L3-single-llm-agent]] | openai.chat |
| Human Legal Review | [[HumanGate]] | docusign, slack |

## Patterns used

- [[pattern-parallel]] for policy + research.
- [[HumanGate]] as the terminal node — never auto-publish a compliance memo.

## Suggested governance

High-risk profile: `costThreshold: $1.00`, `costLimitPerRun: $5.00`, `executionTimeoutMs: 5min`, channels `["slack", "email"]`, `loggingLevel: verbose`. PII redaction on the trigger payload mandatory.
