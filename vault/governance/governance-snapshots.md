---
type: governance-policy
id: governance-snapshots
tags: [governance, snapshots, replay]
linksTo: [governance-index, governance-logging]
---

# Auto-Snapshot

**`autoSnapshot`** — boolean. When true, the workflow's full state is snapshotted at every step transition.

## What "state" means

- The trigger payload (immutable).
- All upstream step outputs.
- The current node's input.
- Model + tool versions in use.

## Why

- **Replay** — re-run the exact same execution against a new model / new code without re-firing external side effects.
- **Debugging** — when a run fails, you can step backwards through node states.
- **Audit** — for regulated workflows ([[HumanGate]] approvals especially), the snapshot is the evidentiary record.

## Storage

Snapshots are JSON blobs on `execution_steps` for small payloads. For payloads >256KB, persist to S3 keyed by `executionId/stepId` and store the URL on the step row.

## Cost

Snapshots aren't free — storage + write IO. Disable for high-volume L0 workflows where replay isn't useful. **Always on for L3+**.
