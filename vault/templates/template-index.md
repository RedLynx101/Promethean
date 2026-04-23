---
type: index
id: template-index
tags: [templates]
---

# Reference Templates

The 6 seed templates Promethean ships with — kept here as **reference blueprints** the agent can mine for prior art when decomposing a new workflow.

When the user describes something resembling one of these, the [decompose skill](../../skills/decompose.md) should retrieve the closest template(s) and adapt rather than starting from scratch.

| Template | Domain | Note |
|----------|--------|------|
| CRM Lead Qualification | Sales | [[template-crm-lead-qualification]] |
| Compliance Memo Generator | Legal & Compliance | [[template-compliance-memo-generator]] |
| Cybersecurity Incident Response | Security | [[template-cybersecurity-incident-response]] |
| Customer Support Triage | Customer Success | [[template-customer-support-triage]] |
| Code Review Pipeline | Engineering | [[template-code-review-pipeline]] |
| Data Quality Check | Data Engineering | [[template-data-quality-check]] |

The full executable JSON for each (the React Flow `nodes` / `edges`) lives in `artifacts/api-server/src/lib/seed.ts`. These notes summarise the **shape and intent** so the agent can reason about them without parsing all the JSON.
