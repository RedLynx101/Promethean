---
phase: 4-governance
workflowId: test
status: pending-review
riskProfile: medium
---

# Governance Proposal

**Risk profile: medium.**

Per `governance-index.md`'s risk-tightness table, Medium fires on *"At least one L3 OR customer-facing domain"*. Both apply here: `draft-response-1` is L3, and the workflow posts public comments on a public GitHub repo (customer-facing to anyone reading the issue). High is **not** warranted — no L4/L5 nodes, no financial/medical/regulated-data handling. The one genuinely elevated risk on this workflow — posting a public `type:security` label or paging on-call on a false positive — is already mitigated at phase 3 by `human-gate-security-1`; escalating the whole workflow to High would apply PagerDuty to routine cost/latency breaches (anti-pattern per `governance-alerting.md`: *"Pager-everything. Alerts that fire constantly get muted"*).

## Configuration

| Field | Value | Source / rationale |
|-------|-------|--------------------|
| `loggingLevel` | `"verbose"` | `governance-logging` Medium row — captures per-step input/output, tool call args/results. L3 (`draft-response-1`) mandates ≥ verbose so the drafted text is replayable; `governance-logging` also says raw model responses should go to S3 keyed by `executionId/stepId` for verbose on L3+. |
| `autoSnapshot` | `true` | `governance-snapshots` — *"Always on for L3+"*. Doubles as the HumanGate audit trail per `pattern-human-gate` (the snapshot is the evidentiary record of what the reviewer saw when they approved/rejected). |
| `latencyThreshold` | `30000` ms (30s) | `governance-index` Medium row. Phase 2's estimate was 3.7s critical-path, so 30s is ~8× headroom — leaves room for Anthropic cold starts (which can spike to 20s+) without false-alarming, while still catching real degradation. **Measures active compute only** — HumanGate pause time is explicitly excluded (see domain note #3 below). |
| `costThreshold` | `$0.05` | **Tightened from the Medium default of $0.50** because phase-2 estimate was $0.011/run, and `governance-cost.md` says *"base on estimatedCostPerRun × 2"*. $0.05 ≈ 4.5× estimated, gives a genuine early-warning signal instead of sitting mute under the hard kill. |
| `costLimitPerRun` | `$0.50` | **User's explicit brief constraint.** Overrides the Medium-default $2.00 from `governance-index`. `governance-cost-limit` is a hard kill — run aborts + `cost_limit_exceeded` alert fires. Ratio to soft threshold is 10× ($0.50 / $0.05), matching the recommended 5–10× spread. |
| `errorRateThreshold` | `0.05` | `governance-index` default + Medium row. `governance-error-rate.md` flags common causes for a triage workflow: schema drift in the GitHub webhook payload, silent model updates at Anthropic, L2 classifier drift if labeled issue distribution shifts. Pair with pinned model versions (see domain note #5). |
| `alertChannels` | `["slack", "email"]` | `governance-index` Medium row. **Not** `pagerduty` at the governance level — PagerDuty is already wired at the workflow level on `page-oncall-1` for confirmed security issues; adding it for routine cost/latency/error breaches would trip the `governance-alerting.md` *"pager-everything"* anti-pattern. |
| `executionTimeoutMs` | `300000` ms (5 min) | `governance-execution-timeout` says *3–5× `latencyThreshold`* and *"round to a friendly number (5min, 10min, 30min)"*. 5min is 10× our 30s threshold — on the generous side to avoid killing slow but succeeding runs. Applies to active compute; HumanGate wait is not counted (domain note #3). |

## Domain-specific notes

1. **PII redaction on trigger payload.** Per `governance-logging` — *"Always redact trigger payloads matching configured PII patterns before persistence"*. GitHub issue bodies routinely include emails, stack traces with bearer tokens, private URLs, and screenshots. Wire pino's redact config on the trigger payload before it hits `execution_steps.input`.

2. **Prompt caching on `draft-response-1`.** `integration-anthropic-messages.md` recommends prompt caching for the system prompt + context — *"typically 90% cost reduction for repeated reads"*. Since the triage style guide is stable across runs, this pushes per-run drafter cost from ~$0.010 toward ~$0.001, widening headroom under the $0.50 hard kill.

3. **HumanGate time does not count against `latencyThreshold` or `executionTimeoutMs`.** Per `pattern-human-gate`, a HumanGate pauses the workflow and resumes on approval — often hours later. The workflow must instrument `activeComputeMs` separately from `wallClockMs`, and the thresholds above apply to `activeComputeMs`. Gate-specific SLA is a separate timer on `human-gate-security-1`: per `governance-execution-timeout` + `HumanGate.md`, configure a default-reviewer SLA (suggest 4 business hours), escalate to a secondary on breach, and fire a `human_gate_pending` alert (per `governance-alerting` alert types).

4. **Gate-node logging at `debug`, not just `verbose`.** Workflow-level `loggingLevel` is `verbose`, but `human-gate-security-1` specifically should capture every approve/reject/edit event with reviewer identity, timestamp, and the full `gate.feedback` string. This is the audit record for a decision that gates public-repo label visibility and on-call paging. Per `governance-logging.md` — *"every approval/rejection persisted with reviewer identity"* (referenced from `HumanGate.md`).

5. **Pin the Anthropic model version.** Per `governance-error-rate.md` — *"Model regression — model provider silently rolled an update. Pin model versions where possible."* Set an explicit Claude model id on `draft-response-1`'s `integration-anthropic-messages` call rather than an alias; bump deliberately after evaluation. Same applies to the L2 classifier checkpoint once `integration-huggingface-transformers` exists.

6. **Rate-limit the trigger per source.** Per `integration-webhook-receiver` — *"Rate limit per source — protect downstream cost"*. A spam of issues from one user could drive aggregate cost past the team's overall budget even though per-run cost stays under $0.50. Suggested: 30 issues / user / hour at the webhook receiver, soft-reject to 202 Accepted after that.

7. **Snapshot payload size.** GitHub issue bodies can include base64-embedded images and large stack traces. Per `governance-snapshots.md`, payloads >256KB must spill to S3 keyed by `executionId/stepId`. Confirm the trigger handler enforces that before enabling `autoSnapshot`.

## Outstanding from prior phases (restated)

- `integration-huggingface-transformers.md` still does not exist — runtime emission (phase 5 / `emit.md`) should not proceed without it. Governance values above assume a fine-tuned encoder classifier (~$0.0005/call, ~300ms p95); if the actual choice is a hosted LLM classifier, revisit `costThreshold` upward.
- The HumanGate's reject-loop feeds `gate.feedback` back into `classify-1`'s next iteration. Capture reject rate as a secondary metric — if it exceeds, say, 30%, the L2 classifier needs retraining (per `governance-error-rate.md` drift guidance).

---

```json
{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "custom",
      "position": { "x": 100, "y": 300 },
      "data": {
        "label": "GitHub Issue Opened",
        "description": "Webhook receiver for issues.opened events. Validates X-Hub-Signature-256 HMAC, enforces 5-min replay window, stores X-GitHub-Delivery UUID as the execution idempotency key. Per-source rate limit (30/user/hr) per integration-webhook-receiver.",
        "systemLevel": 0,
        "confidence": 98,
        "rationale": "Webhook receiver + HMAC verification + delivery-ID capture — all deterministic primitives.",
        "tools": ["integration-webhook-receiver", "integration-github-api"],
        "errorHandling": "alert-and-fail",
        "status": "idle",
        "nodeCategory": "trigger"
      }
    },
    {
      "id": "validate-1",
      "type": "custom",
      "position": { "x": 350, "y": 300 },
      "data": {
        "label": "Validate & Extract",
        "description": "Zod-parse the webhook body and extract { title, body, author, repo, issueNumber, existingLabels }. PII-redact the body before persistence per governance-logging.",
        "systemLevel": 0,
        "confidence": 97,
        "rationale": "Schema-validating a known-shape webhook payload is textbook L0.",
        "tools": ["zod"],
        "errorHandling": "alert-and-fail",
        "status": "idle"
      }
    },
    {
      "id": "classify-1",
      "type": "custom",
      "position": { "x": 600, "y": 300 },
      "data": {
        "label": "Classify Severity",
        "description": "Classify the issue into { bug, feature-request, question, security } with calibrated confidence 0-100. Model checkpoint pinned per governance-error-rate drift guidance.",
        "systemLevel": 2,
        "confidence": 78,
        "rationale": "Four-way closed-set intent classification. Runtime confidence <60 routes through human-gate-security-1.",
        "tools": ["huggingface-transformers"],
        "conditions": ["emit classifier_confidence >= 0 && <= 100"],
        "errorHandling": "route-to-human-gate",
        "status": "idle"
      }
    },
    {
      "id": "human-gate-security-1",
      "type": "custom",
      "position": { "x": 600, "y": 660 },
      "data": {
        "label": "Human Review: Security / Low-Confidence",
        "description": "Pauses when severity === 'security' OR classifier_confidence < 60 OR classify-1 errored. Reviewer approves (optionally with corrected finalSeverity) or rejects with feedback. Node-level loggingLevel: debug so every approve/reject/edit is audit-logged with reviewer identity. Gate SLA: 4 business hours to default reviewer, fires human_gate_pending alert on breach.",
        "systemLevel": null,
        "confidence": null,
        "rationale": "Covers public-repo type:security leakage, low-confidence classification, and classifier outage in a single gate.",
        "tools": ["integration-slack-api", "integration-github-api"],
        "conditions": [
          "trigger: severity === 'security' || classifier_confidence < 60 || classifier error",
          "emit: { approved: boolean, finalSeverity: enum, feedback: string? }",
          "sla: 4h default reviewer, escalate on breach"
        ],
        "errorHandling": "alert-and-fail",
        "status": "idle",
        "nodeCategory": "human_gate"
      }
    },
    {
      "id": "apply-labels-1",
      "type": "custom",
      "position": { "x": 900, "y": 120 },
      "data": {
        "label": "Apply Labels",
        "description": "Idempotent PUT of the issue's label set based on finalSeverity. For severity === 'security', reachable only via human-gate-security-1.",
        "systemLevel": 0,
        "confidence": 98,
        "rationale": "Lookup table. Deterministic.",
        "tools": ["integration-github-api"],
        "errorHandling": "retry-with-backoff",
        "status": "idle"
      }
    },
    {
      "id": "assign-team-1",
      "type": "custom",
      "position": { "x": 900, "y": 300 },
      "data": {
        "label": "Assign Team",
        "description": "Assigns the issue to a team based on finalSeverity. Deterministic map.",
        "systemLevel": 0,
        "confidence": 98,
        "rationale": "Lookup table. Deterministic.",
        "tools": ["integration-github-api"],
        "errorHandling": "retry-with-backoff",
        "status": "idle"
      }
    },
    {
      "id": "draft-response-1",
      "type": "custom",
      "position": { "x": 900, "y": 480 },
      "data": {
        "label": "Draft Triage Response",
        "description": "Drafts a short (<= 3 sentence) triage reply in the issue's voice, tailored to finalSeverity. Uses anthropic.messages with structured output via tool_use. Prompt-cache the system prompt + style guide per integration-anthropic-messages (~90% cost reduction). Model version pinned.",
        "systemLevel": 3,
        "confidence": 88,
        "rationale": "Genuine natural-language generation; single LLM call, all context fits in the prompt.",
        "tools": ["integration-anthropic-messages"],
        "errorHandling": "alert-and-skip",
        "status": "idle"
      }
    },
    {
      "id": "page-oncall-1",
      "type": "custom",
      "position": { "x": 900, "y": 660 },
      "data": {
        "label": "Page On-Call via PagerDuty",
        "description": "Fires PagerDuty Events API v2 trigger. Reachable only from human-gate-security-1 with gate.approved && finalSeverity === 'security'. dedup_key = '{repo}-security-{issueNumber}'.",
        "systemLevel": 0,
        "confidence": 97,
        "rationale": "Deterministic REST POST with computed dedup_key.",
        "tools": ["integration-pagerduty"],
        "errorHandling": "retry-with-backoff",
        "status": "idle"
      }
    },
    {
      "id": "post-comment-1",
      "type": "custom",
      "position": { "x": 1150, "y": 300 },
      "data": {
        "label": "Post Issue Comment",
        "description": "Posts the drafted triage reply via the GitHub API. Existing-bot-comment lookup + PATCH for idempotency.",
        "systemLevel": 0,
        "confidence": 96,
        "rationale": "Deterministic GitHub API call.",
        "tools": ["integration-github-api"],
        "errorHandling": "retry-with-backoff",
        "status": "idle"
      }
    },
    {
      "id": "end-1",
      "type": "custom",
      "position": { "x": 1400, "y": 480 },
      "data": {
        "label": "Complete Triage",
        "description": "Terminal node. Emits execution result with flags { labeled, assigned, drafted, commented, paged, gated, rejected } for observability.",
        "systemLevel": 0,
        "confidence": 99,
        "rationale": "Pure state emission / logging.",
        "tools": [],
        "errorHandling": "alert-and-fail",
        "status": "idle"
      }
    }
  ],
  "edges": [
    { "id": "e-trigger-validate", "source": "trigger-1", "target": "validate-1", "type": "default", "data": { "label": "on issues.opened", "condition": null } },
    { "id": "e-validate-classify", "source": "validate-1", "target": "classify-1", "type": "default", "data": { "label": "validated payload", "condition": null } },
    { "id": "e-classify-labels", "source": "classify-1", "target": "apply-labels-1", "type": "conditional", "data": { "label": "auto (non-security, confident)", "condition": "severity !== 'security' && classifier_confidence >= 60" } },
    { "id": "e-classify-assign", "source": "classify-1", "target": "assign-team-1", "type": "conditional", "data": { "label": "auto (non-security, confident)", "condition": "severity !== 'security' && classifier_confidence >= 60" } },
    { "id": "e-classify-draft", "source": "classify-1", "target": "draft-response-1", "type": "conditional", "data": { "label": "auto (non-security, confident)", "condition": "severity !== 'security' && classifier_confidence >= 60" } },
    { "id": "e-classify-gate", "source": "classify-1", "target": "human-gate-security-1", "type": "conditional", "data": { "label": "gate (security or low-confidence)", "condition": "severity === 'security' || classifier_confidence < 60" } },
    { "id": "e-classify-error", "source": "classify-1", "target": "human-gate-security-1", "type": "error", "data": { "label": "classifier error -> human", "condition": null } },
    { "id": "e-gate-labels", "source": "human-gate-security-1", "target": "apply-labels-1", "type": "conditional", "data": { "label": "approved", "condition": "gate.approved === true" } },
    { "id": "e-gate-assign", "source": "human-gate-security-1", "target": "assign-team-1", "type": "conditional", "data": { "label": "approved", "condition": "gate.approved === true" } },
    { "id": "e-gate-draft", "source": "human-gate-security-1", "target": "draft-response-1", "type": "conditional", "data": { "label": "approved", "condition": "gate.approved === true" } },
    { "id": "e-gate-page", "source": "human-gate-security-1", "target": "page-oncall-1", "type": "conditional", "data": { "label": "approved + confirmed security", "condition": "gate.approved === true && gate.finalSeverity === 'security'" } },
    { "id": "e-gate-reject", "source": "human-gate-security-1", "target": "classify-1", "type": "loop", "data": { "label": "rejected -> reclassify with feedback", "condition": "gate.approved === false" } },
    { "id": "e-labels-comment", "source": "apply-labels-1", "target": "post-comment-1", "type": "default", "data": { "label": "labels applied", "condition": null } },
    { "id": "e-assign-comment", "source": "assign-team-1", "target": "post-comment-1", "type": "default", "data": { "label": "team assigned", "condition": null } },
    { "id": "e-draft-comment", "source": "draft-response-1", "target": "post-comment-1", "type": "default", "data": { "label": "draft ready", "condition": null } },
    { "id": "e-draft-error", "source": "draft-response-1", "target": "end-1", "type": "error", "data": { "label": "draft failed -> skip comment", "condition": null } },
    { "id": "e-comment-end", "source": "post-comment-1", "target": "end-1", "type": "default", "data": { "label": "posted", "condition": null } },
    { "id": "e-page-end", "source": "page-oncall-1", "target": "end-1", "type": "default", "data": { "label": "paged", "condition": null } }
  ],
  "governanceConfig": {
    "loggingLevel": "verbose",
    "autoSnapshot": true,
    "latencyThreshold": 30000,
    "costThreshold": 0.05,
    "errorRateThreshold": 0.05,
    "alertChannels": ["slack", "email"],
    "costLimitPerRun": 0.50,
    "executionTimeoutMs": 300000
  },
  "summary": "Medium risk profile: L3 drafter + customer-facing (public GitHub) — no L4/L5 nodes and no regulated data means High is not warranted. Thresholds follow governance-index Medium row with two deliberate departures: (1) costLimitPerRun tightened from the Medium default $2.00 to the user's explicit $0.50/run brief constraint; (2) costThreshold tightened to $0.05 (~4.5x the $0.011 phase-2 estimate) so the soft alert fires meaningfully below the hard kill. verbose logging + autoSnapshot are mandatory for the L3 drafter and double as the HumanGate audit trail. slack+email channels for governance alerts; PagerDuty remains confined to the confirmed-security workflow path (page-oncall-1) to avoid pager-everything. Domain notes cover PII redaction on webhook payload, prompt caching on the drafter, HumanGate time excluded from latency/timeout measurement, debug-level logging specifically on the gate node for audit, pinned model versions, per-source rate limiting at the trigger, and >256KB snapshot spillover to S3."
}
```
