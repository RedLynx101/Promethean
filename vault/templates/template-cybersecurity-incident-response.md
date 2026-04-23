---
type: template
id: template-cybersecurity-incident-response
domain: Security
tags: [template, security, incident-response, soc]
estimatedCostPerRun: 0.038
estimatedLatencyMs: 1800
linksTo: [template-index, L0-deterministic, L1-supervised-ml, L3-single-llm-agent, L4-tool-augmented-llm, pattern-parallel, pattern-conditional, integration-pagerduty]
---

# Cybersecurity Incident Response

Automated detection, triage, evidence collection, and coordinated response with human escalation gates for critical threats.

## Shape

```
Detect (L1) ─→ Triage (L1) ─┬─→ Evidence (L0)        ─┐
                            └─→ AI Threat Analysis (L4) ─┴─→ Auto-Contain ─┬─(if critical)→ SOC Page
                                                                           └─(always)──────→ Report
```

## Nodes

| Step | Level | Tools |
|------|-------|-------|
| Threat Detection | [[L1-supervised-ml]] | splunk, datadog-security |
| Automated Triage | [[L1-supervised-ml]] | sklearn, tensorflow |
| Evidence Collection | [[L0-deterministic]] | aws-cloudtrail, osquery |
| AI Threat Analysis | [[L4-tool-augmented-llm]] | openai.chat, virustotal-api |
| Auto-Containment | [[L0-deterministic]] | aws-security-groups, okta-api |
| SOC Escalation | [[L0-deterministic]] | [[integration-pagerduty]], slack |
| Incident Report | [[L3-single-llm-agent]] | openai.chat, confluence-api |

## Patterns used

- [[pattern-parallel]] for evidence + analysis.
- [[pattern-conditional]] (`severity === 'critical'`) for SOC pager.
- Auto-containment runs **without** [[HumanGate]] only because the actions (block IP, isolate host, revoke token) are explicitly designed to be reversible. Document this exception clearly.

## Suggested governance

Critical profile: `executionTimeoutMs: 60s` (response speed matters more than thoroughness), `costLimitPerRun: $1.00`, channels `["pagerduty"]`, `loggingLevel: verbose` for full audit trail.
