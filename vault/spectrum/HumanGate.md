---
type: spectrum-level
id: HumanGate
level: gate
tags: [spectrum, governance, hitl]
linksTo: [spectrum-index, governance-snapshots]
---

# HumanGate — Manual Approval Checkpoint

Not a level — a **special node category**. Pauses the workflow until a human approves, rejects with feedback, or edits the proposed action.

## When to use (effectively mandatory)

- Before any **destructive or irreversible** action: production deploys, data deletion, sending external customer comms, financial transfers, regulatory filings.
- After any [[L4-tool-augmented-llm]] or [[L5-multi-agent]] step that produces an output a downstream system will act on.
- When [[L1-supervised-ml]] / [[L2-language-understanding]] confidence is below threshold (typically <60).

## Implementation contract

A HumanGate node must:

1. **Persist the proposed payload** — the agent's output, full context, and reasoning.
2. **Notify** the right human via the configured channel (Slack, email, PagerDuty).
3. **Block until** approve / reject / edit. (For an Obsidian-vault + harness setup, this is a `proposals/<id>.md` file the human edits and renames to `approved/`.)
4. **Resume with** the (possibly edited) payload, or short-circuit on reject with the feedback string.

## Governance configuration

- **Timeout** — what happens if no human responds in N hours? Escalate? Auto-reject? See [[governance-execution-timeout]].
- **Default reviewer** + **escalation chain**.
- **Audit log** — every approval/rejection persisted with reviewer identity. See [[governance-logging]].

## Anti-patterns

- HumanGate as theatre — humans rubber-stamping without context. Always include the *why*, not just the *what*.
- HumanGate after a fast deterministic step. Save the gate for genuinely risky actions.
- One global reviewer. Distribute by domain expertise.
