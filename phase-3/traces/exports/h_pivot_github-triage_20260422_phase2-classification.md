---
phase: 2-classification
workflowId: test
status: pending-review
estimatedCostPerRun: 0.011
estimatedLatencyMs: 3700
---

# Classification Proposal

**Brief:** GitHub issue triage — classify severity, draft a triage reply, page on-call only for security.
**Constraint:** budget cap $0.50/run. Estimate comes in ~45× under cap, mostly headroom for model upgrade.

## Per-node levels

| Node | Level | Confidence | Rationale |
|------|-------|------------|-----------|
| trigger-1 | L0 | 98 | Webhook receiver: HMAC verify + delivery-ID capture is pure deterministic logic. `nodeCategory: "trigger"` preserved. |
| validate-1 | L0 | 97 | Zod-shaped extraction of structured fields from a known payload schema — textbook L0 per `L0-deterministic.md`. |
| classify-1 | **L2** | 78 | **Downgraded from L3.** Four-way closed-set intent classification (bug / feature-request / question / security) on free text — directly matches L2 examples ("Intent classification + sentiment analysis"). The L2 note explicitly flags "using a full LLM (L3) to do intent classification" as the anti-pattern. Confidence is 78, not 95, because the `security` class needs semantic nuance ("I can see other users' data" vs. "login failed") — a fine-tuned BERT-class encoder handles it, but a generic hosted classifier may not. If the encoder's score is <60, orchestration should route through a HumanGate. |
| apply-labels-1 | L0 | 98 | Lookup table: classification → label set. No uncertainty. |
| assign-team-1 | L0 | 98 | Same — lookup table on classification → team handle. |
| draft-response-1 | L3 | 88 | Genuine natural-language generation in a tailored voice — cannot be done by L0 templates or L2 classifiers. One LLM call, structured output (`{body: string}`), all context fits in the prompt → L3 per `L3-single-llm-agent.md`. Not L4: no retrieval or tool-calls needed (the issue text and classification are the only inputs). Not L5: single role, no hand-off. Confidence 88 — docked because "in the issue's voice" has interpretation risk (see phase-1 open question). |
| page-oncall-1 | L0 | 97 | PagerDuty Events v2 POST with a deterministic `dedup_key`. The *decision* to fire is a conditional edge, which is also deterministic (`severity === 'security'`). |
| post-comment-1 | L0 | 96 | GitHub API call with bot-comment lookup + PATCH. Deterministic, idempotent. |
| end-1 | L0 | 99 | Terminal result node — pure state emission. |

## Distribution

- **L0: 7** — trigger, validate, apply-labels, assign-team, page-oncall, post-comment, end
- **L1: 0**
- **L2: 1** — classify-1
- **L3: 1** — draft-response-1
- **L4: 0**
- **L5: 0**
- **HumanGate: 0** (orchestrate phase may insert one for the security-label branch per phase-1 open questions)

Shape reads as: *one classifier, one drafter, everything else deterministic*. Consistent with the `template-customer-support-triage` composition (L0×2, L2×2, L3×1).

## Low-confidence nodes (need orchestrator HumanGate)

None below 60. Two nodes worth flagging for the orchestrator's attention even though they clear the threshold:

- **classify-1 (78)** — at runtime, the L2 classifier itself emits a per-inference probability; route through a HumanGate when that probability < 60, per `L2-language-understanding.md` guidance. That is a runtime gate, not a graph-time one.
- **draft-response-1 (88)** — the phase-1 proposal noted "in the issue's voice" is ambiguous. The orchestrator should consider either a soft HumanGate before `post-comment-1` for security-severity issues only, or caching + review the first N drafts in production before removing any gate.

## Cost / latency estimate

Per-node costs (from level notes):

| Node | Level | Est. cost | Est. latency |
|------|-------|-----------|--------------|
| trigger-1 | L0 | $0 | 50ms |
| validate-1 | L0 | $0 | 50ms |
| classify-1 | L2 | $0.0005 | 300ms |
| apply-labels-1 | L0 | $0 | 100ms (GitHub API) |
| assign-team-1 | L0 | $0 | 100ms (GitHub API) |
| draft-response-1 | L3 | $0.010 | 3000ms (Haiku-class, short prompt) |
| page-oncall-1 | L0 | $0 | 150ms (PagerDuty API, conditional) |
| post-comment-1 | L0 | $0 | 200ms (GitHub API) |
| end-1 | L0 | $0 | 10ms |

**Per run cost:** ~$0.011 (L2 + L3 only). Well under $0.50 cap — headroom for upgrading the drafter to a larger model if quality requires it.

**Per run latency (critical path):** trigger→validate→classify (≈400ms) → parallel fan-out where `max(labels 100, assign 100, draft 3000) = 3000ms` → post-comment (200ms) → end (10ms) ≈ **3700ms**. The conditional pager branch runs parallel to the main fan-out so doesn't extend critical path.

**Key trade-off:** L2 vs. L3 on classify-1 is the lever. Dropping to L2 saves ~$0.01 and ~2.5s per run. If a hosted classifier can't reliably distinguish security from bug/question (an empirical question; worth measuring on historical issues before committing), escalating that one node to L3 puts per-run cost at ~$0.021 — still 24× under cap.

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
        "description": "Webhook receiver for issues.opened events. Validates X-Hub-Signature-256 HMAC and stores X-GitHub-Delivery UUID as the execution idempotency key.",
        "systemLevel": 0,
        "confidence": 98,
        "rationale": "Webhook receiver + HMAC verification + delivery-ID capture — all deterministic primitives. No AI required. Preserved nodeCategory: trigger.",
        "tools": ["integration-github-api"],
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
        "description": "Deterministic extraction of { title, body, author, repo, issueNumber, existingLabels } from the webhook payload. Rejects malformed events before any LLM call.",
        "systemLevel": 0,
        "confidence": 97,
        "rationale": "Schema-validating a known-shape webhook payload is textbook L0 (Zod / JSON Schema). Pushing this to L1+ would be over-engineering.",
        "tools": ["zod"],
        "status": "idle"
      }
    },
    {
      "id": "classify-1",
      "type": "custom",
      "position": { "x": 600, "y": 300 },
      "data": {
        "label": "Classify Severity",
        "description": "Classify the issue into one of { bug, feature-request, question, security } with confidence (0-100) and a short rationale string.",
        "systemLevel": 2,
        "confidence": 78,
        "rationale": "Four-way closed-set intent classification over unstructured text — the canonical L2 shape. L2-language-understanding.md explicitly names intent classification as L2 and flags 'using a full LLM to do intent classification' as an anti-pattern. Confidence is 78 (not 95) because the 'security' class needs semantic nuance that generic hosted classifiers can miss; fine-tuned encoder recommended. Runtime probability < 60 should route through a HumanGate.",
        "tools": ["huggingface-transformers"],
        "status": "idle"
      }
    },
    {
      "id": "apply-labels-1",
      "type": "custom",
      "position": { "x": 850, "y": 120 },
      "data": {
        "label": "Apply Labels",
        "description": "Deterministic map from severity classification to GitHub labels (type:bug | type:feature | type:question | type:security). Idempotent PUT on the issue's label set.",
        "systemLevel": 0,
        "confidence": 98,
        "rationale": "Pure lookup table: {classification} -> {label set}. Finite rule set, 100% predictable.",
        "tools": ["integration-github-api"],
        "status": "idle"
      }
    },
    {
      "id": "assign-team-1",
      "type": "custom",
      "position": { "x": 850, "y": 300 },
      "data": {
        "label": "Assign Team",
        "description": "Deterministic map from classification to GitHub team: security -> @org/security-team; bug -> @org/eng-triage; feature-request -> @org/product; question -> @org/community.",
        "systemLevel": 0,
        "confidence": 98,
        "rationale": "Lookup table on classification -> team handle. No AI required.",
        "tools": ["integration-github-api"],
        "status": "idle"
      }
    },
    {
      "id": "draft-response-1",
      "type": "custom",
      "position": { "x": 850, "y": 480 },
      "data": {
        "label": "Draft Triage Response",
        "description": "LLM drafts a short triage reply (<= 3 sentences) in the issue's voice: acknowledges the report, sets an expectation, and links the next step based on severity.",
        "systemLevel": 3,
        "confidence": 88,
        "rationale": "Requires genuine natural-language generation tailored to the issue's tone and classification — beyond what L0 templates or L2 classifiers can produce. One LLM call, structured output, all context fits in the prompt -> L3. Not L4 (no retrieval or tool-calls). Not L5 (single role, no hand-off). Docked 10 points because the 'in the issue's voice' requirement carries interpretation risk.",
        "tools": ["anthropic.messages"],
        "status": "idle"
      }
    },
    {
      "id": "page-oncall-1",
      "type": "custom",
      "position": { "x": 850, "y": 660 },
      "data": {
        "label": "Page On-Call via PagerDuty",
        "description": "Fires PagerDuty Events API v2 trigger ONLY when severity === 'security'. dedup_key = '{repo}-security-{issueNumber}' so retries coalesce.",
        "systemLevel": 0,
        "confidence": 97,
        "rationale": "Deterministic REST POST with a computed dedup_key. The conditional gate happens at the edge, not in this node — the node itself is pure action.",
        "tools": ["integration-pagerduty"],
        "status": "idle"
      }
    },
    {
      "id": "post-comment-1",
      "type": "custom",
      "position": { "x": 1100, "y": 300 },
      "data": {
        "label": "Post Issue Comment",
        "description": "Post the drafted triage reply via GitHub API. Looks up existing bot comments on the issue and PATCHes instead of POSTing to stay idempotent across webhook retries.",
        "systemLevel": 0,
        "confidence": 96,
        "rationale": "GitHub API call with bot-comment lookup and PATCH. Deterministic and idempotent per the integration note.",
        "tools": ["integration-github-api"],
        "status": "idle"
      }
    },
    {
      "id": "end-1",
      "type": "custom",
      "position": { "x": 1350, "y": 480 },
      "data": {
        "label": "Complete Triage",
        "description": "Terminal node. Emits execution result with flags: { labeled, assigned, drafted, commented, paged } for observability.",
        "systemLevel": 0,
        "confidence": 99,
        "rationale": "Pure state emission / logging. No decision logic, no AI.",
        "tools": [],
        "status": "idle"
      }
    }
  ],
  "edges": [
    { "id": "e-trigger-validate", "source": "trigger-1", "target": "validate-1", "type": "default", "data": { "label": "on issues.opened", "condition": null } },
    { "id": "e-validate-classify", "source": "validate-1", "target": "classify-1", "type": "default", "data": { "label": "validated payload", "condition": null } },
    { "id": "e-classify-labels", "source": "classify-1", "target": "apply-labels-1", "type": "parallel", "data": { "label": "classification", "condition": null } },
    { "id": "e-classify-assign", "source": "classify-1", "target": "assign-team-1", "type": "parallel", "data": { "label": "classification", "condition": null } },
    { "id": "e-classify-draft", "source": "classify-1", "target": "draft-response-1", "type": "parallel", "data": { "label": "classification + issue text", "condition": null } },
    { "id": "e-classify-page", "source": "classify-1", "target": "page-oncall-1", "type": "conditional", "data": { "label": "if security", "condition": "severity === 'security'" } },
    { "id": "e-labels-comment", "source": "apply-labels-1", "target": "post-comment-1", "type": "default", "data": { "label": "labels applied", "condition": null } },
    { "id": "e-assign-comment", "source": "assign-team-1", "target": "post-comment-1", "type": "default", "data": { "label": "team assigned", "condition": null } },
    { "id": "e-draft-comment", "source": "draft-response-1", "target": "post-comment-1", "type": "default", "data": { "label": "draft ready", "condition": null } },
    { "id": "e-comment-end", "source": "post-comment-1", "target": "end-1", "type": "default", "data": { "label": "posted", "condition": null } },
    { "id": "e-page-end", "source": "page-oncall-1", "target": "end-1", "type": "default", "data": { "label": "paged", "condition": null } }
  ],
  "summary": "7x L0, 1x L2, 1x L3. One intent classifier (L2) and one response drafter (L3); everything else deterministic. Mirrors the template-customer-support-triage composition. Est. $0.011 / 3700ms per run, ~45x under the $0.50 budget cap.",
  "estimatedCostPerRun": 0.011,
  "estimatedLatencyMs": 3700
}
```
