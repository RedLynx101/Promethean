---
type: template
id: template-data-quality-check
domain: Data Engineering
tags: [template, data-quality, etl, monitoring]
estimatedCostPerRun: 0.012
estimatedLatencyMs: 8500
linksTo: [template-index, L0-deterministic, L1-supervised-ml, L3-single-llm-agent, pattern-parallel, pattern-conditional, integration-pagerduty, integration-postgres]
---

# Data Quality Check

Automated pipeline for validating data ingestion quality, detecting schema drift, profiling data, alerting on anomalies.

## Shape

```
Ingest ─┬─→ Schema (L0)   ─→ Drift (L0)    ─┐
        └─→ Profile (L1) ─→ Anomaly (L1)  ─┴─→ Quality Report (L3) ─┬─(if <90%)→ Alert
                                                                    └─(always)──→ Store
```

## Nodes

| Step | Level | Tools |
|------|-------|-------|
| Data Ingestion Trigger | [[L0-deterministic]] (Trigger) | kafka, s3-events |
| Schema Validation | [[L0-deterministic]] | pydantic, great-expectations |
| Statistical Profiling | [[L1-supervised-ml]] | pandas-profiling, ydata-profiling |
| Schema Drift Detection | [[L0-deterministic]] | [[integration-postgres]], dbt |
| Anomaly Detection | [[L1-supervised-ml]] | sklearn, pyod |
| Quality Report | [[L3-single-llm-agent]] | openai.chat, pandas |
| Alert on Failures | [[L0-deterministic]] | [[integration-pagerduty]], slack |
| Store Quality Metrics | [[L0-deterministic]] | [[integration-postgres]], datahub |

## Patterns used

- [[pattern-parallel]] schema + profile branches.
- [[pattern-conditional]] — `qualityScore < 90` gates the alert.

## Suggested governance

Low-risk per-run, but high volume: `costThreshold: $0.05`, `latencyThreshold: 60s`, channels `["slack", "pagerduty"]` (pagerduty for alert step's own failures, not nominal alerts), `loggingLevel: standard`, `autoSnapshot: false` (volume too high).
