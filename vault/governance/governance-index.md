---
type: index
id: governance-index
tags: [governance]
---

# Governance Policies

Every workflow must declare a `governanceConfig` matching the schema in `lib/db` and validated by `GovernanceConfigSchema` (see `artifacts/api-server/src/lib/agents/schemas.ts`).

| Field | Note | Default |
|-------|------|---------|
| `loggingLevel` | [[governance-logging]] | `"standard"` |
| `autoSnapshot` | [[governance-snapshots]] | `true` |
| `latencyThreshold` | [[governance-latency]] | `30000` ms |
| `costThreshold` | [[governance-cost]] | `$0.50` |
| `costLimitPerRun` | [[governance-cost-limit]] | varies — **must be set for L4+** |
| `errorRateThreshold` | [[governance-error-rate]] | `0.05` |
| `alertChannels` | [[governance-alerting]] | `["slack"]` |
| `executionTimeoutMs` | [[governance-execution-timeout]] | `300000` ms |

## Risk → tightness mapping

Higher levels and higher-stakes domains demand tighter governance.

| Risk profile | Latency thresh | Cost thresh | Cost limit | Channels | Snapshot | Logging |
|---|---|---|---|---|---|---|
| Low (L0–L2, internal) | 60s | $0.10 | $0.50 | slack | true | standard |
| Medium (L3, customer-facing) | 30s | $0.50 | $2.00 | slack, email | true | verbose |
| High (L4, financial/medical) | 30s | $2.00 | $10.00 | slack, email, pagerduty | true | verbose + audit |
| Critical (L5, regulated/destructive) | 60s | $5.00 | $25.00 | pagerduty + [[HumanGate]] | true | debug + audit + traces |
