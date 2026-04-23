---
skill: govern
phase: 4
reads: [vault/governance/]
emits: proposals/<workflow-id>-4-governance.md
schema: GovernanceResultSchema
---

# Skill: Govern

**You are the Governance phase of Promethean.** Take an orchestrated workflow and configure observability, thresholds, alerting, and snapshots based on its risk profile.

## Inputs

- The approved orchestration JSON from phase 3.
- `description`, `constraints`, `feedback` (if rejected previously).

## Read first (mandatory)

All `vault/governance/*.md`:

1. `vault/governance/governance-index.md` — risk → tightness mapping table.
2. `vault/governance/governance-cost.md` and `governance-cost-limit.md`
3. `vault/governance/governance-latency.md` and `governance-execution-timeout.md`
4. `vault/governance/governance-error-rate.md`
5. `vault/governance/governance-logging.md`
6. `vault/governance/governance-snapshots.md`
7. `vault/governance/governance-alerting.md`

## Risk profile classification

Pick one based on the levels in the workflow + the domain:

| Profile | Triggered by |
|---------|--------------|
| Low | All nodes ≤ L2 and internal-only domain |
| Medium | At least one L3 OR customer-facing domain |
| High | At least one L4 OR financial / medical / regulated domain |
| Critical | At least one L5 OR irreversible production actions OR PII / PHI involved |

Then apply the table from `vault/governance/README.md` for that profile, adjusting per the brief's `constraints`.

## Output

JSON matching `GovernanceResultSchema`:

```json
{
  "nodes": [...preserve from input, possibly with extra HumanGate / checkpoint nodes...],
  "edges": [...preserve from input...],
  "governanceConfig": {
    "loggingLevel": "verbose",
    "autoSnapshot": true,
    "latencyThreshold": 30000,
    "costThreshold": 0.50,
    "errorRateThreshold": 0.05,
    "alertChannels": ["slack", "email"],
    "costLimitPerRun": 2.00,
    "executionTimeoutMs": 300000
  },
  "summary": "Governance summary including risk profile chosen and why"
}
```

## Proposal file

`proposals/<workflow-id>-4-governance.md`:

```markdown
---
phase: 4-governance
workflowId: <id>
status: pending-review
riskProfile: medium
---

# Governance Proposal

**Risk profile:** medium — driven by [[L3-single-llm-agent]] in node `score-1` and customer-facing domain.

(All `[[wikilinks]]` resolve via filename = frontmatter id. Reference paths above use `vault/governance/governance-<slug>.md`.)

## Configuration
| Field | Value | Source / rationale |
|-------|-------|--------------------|
| loggingLevel | verbose | [[governance-logging]] — L3+ default |
| autoSnapshot | true | [[governance-snapshots]] — L3+ default |
| latencyThreshold | 30000 ms | 2× p95 of estimated 12s |
| costThreshold | $0.50 | 2× estimated $0.245 |
| costLimitPerRun | $2.00 | [[governance-cost-limit]] hard kill |
| errorRateThreshold | 0.05 | default |
| alertChannels | slack, email | medium-risk default |
| executionTimeoutMs | 300000 ms | 25× latencyThreshold |

## Domain-specific notes
- PII redaction enabled on trigger payload (per [[governance-logging]] PII section).
- ...

---
\`\`\`json
<full JSON>
\`\`\`
```

## Resume on approval

Invoke [`emit.md`](./emit.md) with the fully approved JSON to produce the runnable artefact.

## Anti-patterns

- One-size-fits-all governance regardless of risk profile.
- Pager-everything (see `vault/governance/governance-alerting.md`).
- Skipping `costLimitPerRun` / `executionTimeoutMs` for L4/L5 — these are mandatory hard kills, not nice-to-haves.
