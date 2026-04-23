---
type: governance-policy
id: governance-error-rate
tags: [governance, error-rate, drift]
linksTo: [governance-index, governance-snapshots, L1-supervised-ml]
---

# Error Rate Threshold

**`errorRateThreshold`** — fraction (0–1) of runs allowed to fail in a rolling window before an alert fires. Default `0.05` (5%).

## Window

The api-server should compute over the last N runs (e.g., 100) or last N hours (e.g., 24), whichever fires first. Smaller windows for high-traffic workflows so drift surfaces fast.

## Common causes of error-rate spikes

- **Upstream schema drift** — the trigger payload changed shape. Pair with [[governance-snapshots]] to diff inputs.
- **Model regression** — model provider silently rolled an update. Pin model versions where possible.
- **L1 model drift** — feature distribution shifted. Re-train cadence should be in [[governance-logging]] config.
- **Tool API changes** — external integration changed response shape; Zod parse fails downstream.

## Pairing

Always pair with [[governance-alerting]] — a stale error-rate metric nobody sees is worse than no metric.
