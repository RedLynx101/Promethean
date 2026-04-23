---
type: template
id: template-customer-support-triage
domain: Customer Success
tags: [template, support, ticketing, nlp]
estimatedCostPerRun: 0.024
estimatedLatencyMs: 2100
linksTo: [template-index, L0-deterministic, L2-language-understanding, L3-single-llm-agent, pattern-parallel, integration-zendesk-api, integration-slack-api]
---

# Customer Support Triage

Intelligent ticket routing, priority classification, sentiment analysis, automated first-response generation.

## Shape

```
Ticket ─┬─→ Intent (L2)    ─┐
        └─→ Sentiment (L2) ─┴─→ Priority Score (L0) ─┬─→ Auto-Response (L3) ─┐
                                                     └─→ Route (L0)         ─┴─→ Notify
```

## Nodes

| Step | Level | Tools |
|------|-------|-------|
| Ticket Ingestion | [[L0-deterministic]] (Trigger) | [[integration-zendesk-api]] |
| Intent Classification | [[L2-language-understanding]] | huggingface-transformers |
| Sentiment Analysis | [[L2-language-understanding]] | huggingface-transformers |
| Priority Scoring | [[L0-deterministic]] | postgres, redis |
| Auto-Response Draft | [[L3-single-llm-agent]] | openai.chat |
| Agent Routing | [[L0-deterministic]] | [[integration-zendesk-api]] |
| Agent Notification | [[L0-deterministic]] | [[integration-slack-api]] |

## Patterns used

- [[pattern-parallel]] aggressively — both classifiers from the trigger; both downstream actions from priority.
- The L3 draft is **proposed only** — agents review before sending. Effectively a soft [[HumanGate]] without the explicit node.

## Suggested governance

Medium-risk: `costThreshold: $0.10`, `latencyThreshold: 10s`, channels `["slack"]`, `loggingLevel: standard`. PII redaction on ticket bodies before snapshotting.
