---
phase: 3-orchestration
workflowId: test
status: pending-review
newIntegrationsProposed:
  - integration-huggingface-transformers
---

# Orchestration Proposal

Addresses the two flags from earlier phases:

1. **Phase-1 open question** — "should `type:security` auto-apply?" Answer: **no**, not on `security` severity. Inserted `human-gate-security-1` between `classify-1` and the security-path actions (apply security label, assign security team, page on-call). Non-security classifications bypass the gate.
2. **Phase-2 note** — classify-1 confidence 78, `security` class specifically needs a runtime gate. Answer: the same gate covers it. Gate triggers when `severity === 'security' OR classifier_confidence < 60`, so it doubles as the low-confidence HumanGate per `pattern-human-gate` and `L2-language-understanding.md` guidance.

## Tool bindings

| Node | Tools | Vault refs |
|------|-------|------------|
| trigger-1 | `integration-webhook-receiver`, `integration-github-api` | [[integration-webhook-receiver]] (HMAC/replay/idempotency checks), [[integration-github-api]] (GitHub App auth, `X-Hub-Signature-256`) |
| validate-1 | `zod` (library) | [[L0-deterministic]] — schema validation. No external integration. |
| classify-1 | `huggingface-transformers` | **NEW integration proposed** (see below). [[L2-language-understanding]] recommends `huggingface-transformers` for encoder-based intent classification. |
| human-gate-security-1 | `integration-slack-api`, `integration-github-api` | [[pattern-human-gate]] (approve/reject via Slack Block Kit buttons), [[integration-slack-api]] (approval-button pattern), [[integration-github-api]] (render issue context in approval prompt) |
| apply-labels-1 | `integration-github-api` | [[integration-github-api]] — idempotent label PUT |
| assign-team-1 | `integration-github-api` | [[integration-github-api]] — assignee/team PATCH |
| draft-response-1 | `integration-anthropic-messages` | [[integration-anthropic-messages]] — L3 drafter with `tool_use` for structured output; prompt-cache the system prompt |
| page-oncall-1 | `integration-pagerduty` | [[integration-pagerduty]] — Events v2 with `dedup_key = '{repo}-security-{issueNumber}'` |
| post-comment-1 | `integration-github-api` | [[integration-github-api]] — look up existing bot comment, PATCH rather than POST |
| end-1 | (none) | Terminal result emission |

## Error handling per node

| Node | Strategy | Rationale |
|------|----------|-----------|
| trigger-1 | `alert-and-fail` | Webhook receiver errors (HMAC/schema) are legitimate 4xx — do not retry. Return the 4xx, alert ops. |
| validate-1 | `alert-and-fail` | Malformed payload that passed HMAC is a GitHub-side bug or attack — fail loud, don't silently skip. |
| classify-1 | `route-to-human-gate` | L2 service outage must not silently drop security issues. Error edge routes straight to `human-gate-security-1` so a human classifies manually. Matches `pattern-error-handling` guidance for "high-stakes" error routes. |
| human-gate-security-1 | `alert-and-fail` | If the gate itself errors (Slack down, DB write fails), fail loud — **do not** auto-approve. Governance-execution-timeout handles the separate "human didn't respond in N hours" case. |
| apply-labels-1 | `retry-with-backoff` | GitHub API transient 5xx/429 per `integration-github-api` rate-limit guidance. Idempotent: label PUT. Max 3 attempts, exp. backoff base 1s, cap 30s per `pattern-retries`. |
| assign-team-1 | `retry-with-backoff` | Same as above — idempotent team PATCH. |
| draft-response-1 | `alert-and-skip` | Best-effort. If Anthropic is down or returns malformed structured output, skip the comment (issue still gets labeled/assigned/paged). Error edge → `end-1` with `commented: false` flag. |
| page-oncall-1 | `retry-with-backoff` | PagerDuty is the entire point of the security path — must retry. Events v2 is idempotent on `dedup_key`. Max 5 attempts (higher than default because a missed page is a real incident). |
| post-comment-1 | `retry-with-backoff` | GitHub API transient 5xx/429. Idempotent via existing-bot-comment lookup + PATCH (per integration note). |
| end-1 | `alert-and-fail` | Terminal state emission — if this fails we have a logging/observability problem worth paging on. |

## Edges (changes from phase 2)

Phase 2 had 11 edges. Phase 3 has 18. Changes:

| Edge | Type | Condition | Change |
|------|------|-----------|--------|
| e-trigger-validate | default | — | unchanged |
| e-validate-classify | default | — | unchanged |
| **e-classify-labels** | **conditional** | `severity !== 'security' && classifier_confidence >= 60` | **Changed from `parallel` → `conditional`.** Non-security, high-confidence auto-path only. |
| **e-classify-assign** | **conditional** | `severity !== 'security' && classifier_confidence >= 60` | **Changed.** Same reason. |
| **e-classify-draft** | **conditional** | `severity !== 'security' && classifier_confidence >= 60` | **Changed from `parallel`.** Auto-path only; security-path drafts after gate approval so the human's possibly-corrected severity can tune the tone. |
| **e-classify-gate** | **conditional** | `severity === 'security' \|\| classifier_confidence < 60` | **NEW.** Routes to human gate for security or low-confidence. |
| **e-classify-error** | **error** | — | **NEW.** L2 classifier error routes to the human gate (see errorHandling: `route-to-human-gate`). |
| **e-gate-labels** | **conditional** | `gate.approved === true` | **NEW.** After human approval, labels applied with (possibly corrected) severity. |
| **e-gate-assign** | **conditional** | `gate.approved === true` | **NEW.** Same — team assignment based on final severity. |
| **e-gate-draft** | **conditional** | `gate.approved === true` | **NEW.** Draft runs after gate so it can use final severity for tone. |
| **e-gate-page** | **conditional** | `gate.approved === true && gate.finalSeverity === 'security'` | **NEW.** Page only if human confirmed security. Replaces the direct classify→page edge from phase 2. |
| **e-gate-reject** | **loop** | `gate.approved === false` | **NEW.** Reject feeds `gate.feedback` back into `classify-1`'s next-iteration prompt per `pattern-human-gate` reject-feedback loop. |
| e-labels-comment | default | — | unchanged |
| e-assign-comment | default | — | unchanged |
| e-draft-comment | default | — | unchanged |
| **e-draft-error** | **error** | — | **NEW.** Draft failure short-circuits to end-1 (alert-and-skip), so labels/assign/page still commit. |
| e-comment-end | default | — | unchanged |
| e-page-end | default | — | unchanged |

## HumanGates inserted

- **Before `apply-labels-1` / `assign-team-1` / `page-oncall-1` on the security-or-low-confidence branch:** `human-gate-security-1`. Reason: (a) `type:security` labels are public on public repos and can leak sensitive signal to a reporter, so they must not auto-apply (phase-1 open Q); (b) classify-1 confidence <60 means the L2 model is itself unsure and `L2-language-understanding.md` / `HumanGate.md` both mandate a gate at that threshold (phase-2 flag); (c) paging on-call on a false-positive wastes the rotation. One gate, one approval, covers all three risks. Approval UI uses Slack Block Kit per `pattern-human-gate` + `integration-slack-api`. Reject loops back to classify-1 with the reviewer's `feedback` string. Governance timeout (handled in phase 4) escalates if no reviewer responds within the SLA.

## New integrations needed

- **`integration-huggingface-transformers`** — canonical reference for deploying a fine-tuned BERT-class encoder as the L2 classifier. Should document: auth (self-hosted vs. Hugging Face Inference API), idempotency (deterministic on input text), rate limits (self-hosted: GPU capacity; hosted: per-plan quotas), confidence score calibration guidance (per `L2-language-understanding.md`), and a recommended Zod schema for the classifier output (`{label: enum, score: 0-1, all_scores: Record<label, score>}`). Until this note exists, classify-1's `tools: ["huggingface-transformers"]` is a placeholder binding — runtime emission should not proceed without it.

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
        "description": "Webhook receiver for issues.opened events. Validates X-Hub-Signature-256 HMAC, enforces 5-min replay window, stores X-GitHub-Delivery UUID as the execution idempotency key.",
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
        "description": "Zod-parse the webhook body and extract { title, body, author, repo, issueNumber, existingLabels }. Rejects malformed events before any downstream call.",
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
        "description": "Classify the issue into { bug, feature-request, question, security } with a calibrated confidence score 0-100. Emits { severity, classifier_confidence, all_scores, rationale }.",
        "systemLevel": 2,
        "confidence": 78,
        "rationale": "Four-way closed-set intent classification — canonical L2 shape. Runtime confidence <60 routes through human-gate-security-1 per L2-language-understanding.md guidance.",
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
        "description": "Pauses for human approval whenever severity === 'security' OR classifier_confidence < 60 OR classify-1 errored. Reviewer sees the issue title/body, the L2 classifier scores, and can: (a) approve with finalSeverity, (b) approve with a corrected severity, or (c) reject with feedback (loops back to classify-1).",
        "systemLevel": null,
        "confidence": null,
        "rationale": "Covers three risks: public-repo security-label leakage, low-confidence classification, and classifier outage. One gate, one approval.",
        "tools": ["integration-slack-api", "integration-github-api"],
        "conditions": [
          "trigger: severity === 'security' || classifier_confidence < 60 || classifier error",
          "emit: { approved: boolean, finalSeverity: enum, feedback: string? }"
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
        "description": "Idempotent PUT of the issue's label set based on finalSeverity (type:bug | type:feature | type:question | type:security). For severity === 'security' this node is reachable only via human-gate-security-1.",
        "systemLevel": 0,
        "confidence": 98,
        "rationale": "Lookup table: {finalSeverity} -> {label set}. Deterministic.",
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
        "description": "Assigns the issue to a team based on finalSeverity: security -> @org/security-team; bug -> @org/eng-triage; feature-request -> @org/product; question -> @org/community.",
        "systemLevel": 0,
        "confidence": 98,
        "rationale": "Lookup table on finalSeverity -> team handle. Deterministic.",
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
        "description": "Drafts a short (<= 3 sentence) triage reply in the issue's voice, tailored to finalSeverity. Uses anthropic.messages with structured output via tool_use and prompt caching of the system prompt + triage style guide.",
        "systemLevel": 3,
        "confidence": 88,
        "rationale": "Genuine natural-language generation; single LLM call, all context fits in the prompt. Prompt-cache system prompt for ~90% cost reduction on repeats.",
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
        "rationale": "Deterministic REST POST with computed dedup_key. Gating lives on the incoming edge, not inside the node.",
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
        "description": "Posts the drafted triage reply via the GitHub API. Looks up existing bot comments on the issue and PATCHes instead of POSTing for idempotency across webhook retries.",
        "systemLevel": 0,
        "confidence": 96,
        "rationale": "Deterministic GitHub API call with bot-comment lookup + PATCH.",
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
  "summary": "Orchestrated: 10 nodes (was 9), 18 edges (was 11). Added human-gate-security-1 covering both phase-1 (public type:security label leakage risk) and phase-2 (classify confidence <60) concerns with a single gate. Non-security high-confidence issues take an auto-path; security-or-low-confidence-or-classifier-error issues route through Slack Block Kit approval. Reject-path loops back to classify-1 with human feedback per pattern-human-gate. Error-handling strategies named per pattern-error-handling: classify -> route-to-human-gate, draft -> alert-and-skip, GitHub/PagerDuty writes -> retry-with-backoff, trigger/validate/gate/end -> alert-and-fail. One new integration flagged: integration-huggingface-transformers for the L2 classifier."
}
```
