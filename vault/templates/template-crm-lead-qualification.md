---
type: template
id: template-crm-lead-qualification
domain: Sales
tags: [template, crm, lead-gen, sales]
estimatedCostPerRun: 0.082
estimatedLatencyMs: 4200
linksTo: [template-index, L0-deterministic, L1-supervised-ml, L3-single-llm-agent, pattern-parallel, pattern-conditional, integration-slack-api]
---

# CRM Lead Qualification

Automated pipeline for qualifying inbound sales leads with multi-agent AI scoring, enrichment, and CRM routing.

## Shape

```
Trigger ─→ Validate ─┬─→ Enrich (L1)  ─┐
                     └─→ Score   (L3)  ─┴─→ Route (L0) ─(if hot)→ Notify
```

## Nodes

| Step | Level | Tools |
|------|-------|-------|
| New Lead Intake | [[L0-deterministic]] (Trigger) | webhook, postgres |
| Data Validation | [[L0-deterministic]] | zod, regex |
| Company Enrichment | [[L1-supervised-ml]] | clearbit-api, apollo-api |
| AI Lead Scoring | [[L3-single-llm-agent]] | openai.chat |
| Routing Decision | [[L0-deterministic]] | postgres, redis |
| Sales Rep Notification | [[L0-deterministic]] | [[integration-slack-api]] |

## Patterns used

- [[pattern-parallel]] — enrichment and scoring run concurrently from validation.
- [[pattern-conditional]] — `score >= 80` gates the Slack notification.

## Suggested governance

Medium-risk profile from [[governance-index]]: `costThreshold: $0.20`, `costLimitPerRun: $1.00`, `latencyThreshold: 30s`, channels `["slack", "email"]`.
