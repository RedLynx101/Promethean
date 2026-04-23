---
type: pattern
id: pattern-human-gate
tags: [patterns, hitl, gates]
linksTo: [pattern-index, HumanGate]
---

# Human Gate Flow

A graph shape that pauses for human approval, persists state, and resumes (with possibly edited payload) on approve.

## Shape

```
       A ─→ propose ─→ [HumanGate] ─(approve)─→ act
                            │
                            └────(reject + feedback)─→ A (loop with feedback)
```

The reject edge feeds the human's `feedback` string back into the upstream agent's prompt — the same pattern Promethean's own decomposition/system-selection/orchestration/governance agents use.

## Implementation in a vault + harness setup

1. Approving step writes a proposal as `proposals/<workflow>-<execId>.md` with frontmatter (proposed payload, reasoning, links to upstream snapshots).
2. The harness or Promethean UI surfaces the file. Human edits, then renames the file to `approved/...` (or moves to `rejected/...` with a `feedback:` frontmatter field).
3. A file-watcher (or the Promethean UI's "approve" button calling back to the harness) resumes the workflow.

## Cross-references

- See [[HumanGate]] for the node-level contract.
- Pair with [[governance-execution-timeout]] for SLA on pending gates.
- Pair with [[governance-snapshots]] so the human can see full upstream context.
