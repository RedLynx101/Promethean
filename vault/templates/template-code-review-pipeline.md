---
type: template
id: template-code-review-pipeline
domain: Engineering
tags: [template, devops, code-review, ci-cd]
estimatedCostPerRun: 0.156
estimatedLatencyMs: 18000
linksTo: [template-index, L0-deterministic, L1-supervised-ml, L3-single-llm-agent, L5-multi-agent, pattern-parallel, integration-github-api]
---

# Code Review Pipeline

Automated PR analysis: static analysis, security scanning, complexity scoring, AI code review, test generation, gating controls.

## Shape

```
PR ─┬─→ Static (L0)     ─┐
    ├─→ Security (L1)   ─┼─→ AI Review (L5) ─┬─→ Test Gen (L3) ─┐
    └─→ Complexity (L0) ─┘                   └─→ Quality Gate ──┴─→ PR Comment
```

## Nodes

| Step | Level | Tools |
|------|-------|-------|
| PR Webhook | [[L0-deterministic]] (Trigger) | [[integration-github-api]] |
| Static Analysis | [[L0-deterministic]] | eslint, sonarqube, tsc |
| Security Scan | [[L1-supervised-ml]] | semgrep, snyk |
| Complexity Scoring | [[L0-deterministic]] | complexity-report |
| AI Code Review | [[L5-multi-agent]] | openai.chat, anthropic |
| Test Generation | [[L3-single-llm-agent]] | openai.chat |
| Quality Gate | [[L0-deterministic]] | [[integration-github-api]] |
| PR Comment Summary | [[L3-single-llm-agent]] | [[integration-github-api]], openai.chat |

## Patterns used

- [[pattern-parallel]] fan-out from PR webhook (static / security / complexity).
- [[L5-multi-agent]] AI review with sub-agents: architecture / security / style. Synthesised into a single review comment.

## Suggested governance

High-risk for the L5 step specifically: `costLimitPerRun: $2.00`, `executionTimeoutMs: 5min`, channels `["slack"]`, `loggingLevel: debug` for the L5 sub-agent traces.
