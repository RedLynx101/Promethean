---
type: spectrum-level
id: L1-supervised-ml
level: 1
color: "#2196F3"
tags: [spectrum, ml, supervised]
linksTo: [spectrum-index, L0-deterministic]
---

# L1 — Supervised ML

Traditional ML models — classification, regression, clustering, anomaly detection. **Trained on labelled data, narrow domain, high accuracy (>95%).** No language model.

## When to use

- A pattern exists in historical data that rules can't cleanly capture.
- You can label training data (or have it labelled).
- The output space is small and well-defined (a class, a number, a score).

## Typical tools

`sklearn`, `xgboost`, `tensorflow` / `tflite`, `pytorch`, `pyod` (anomaly), `pandas-profiling`, `ydata-profiling`, custom feature stores, vector similarity (`pgvector`, `faiss`).

For external ML services: `clearbit-api`, `apollo-api`, fraud-scoring vendors, dedicated fine-tuned classifiers.

## Cost / latency profile

- **Cost:** low — inference is cheap; training is amortised.
- **Latency:** 10ms–500ms typical.
- **Confidence:** report the model's own probability/score; flag <60% for human review.

## Governance considerations

- Drift detection required — see [[governance-snapshots]] and [[governance-error-rate]].
- Periodic retraining cadence should be in the workflow's [[governance-logging]] config.

## Anti-patterns

- Using L1 where L0 rules suffice (over-engineering).
- Using L1 for tasks that need language generation — that's [[L3-single-llm-agent]].

## Examples in templates

- ML triage in [[template-cybersecurity-incident-response]], statistical profiling and anomaly detection in [[template-data-quality-check]].
