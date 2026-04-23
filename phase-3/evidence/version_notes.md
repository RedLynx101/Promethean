# PROMETHEAN — Version Notes

Human-readable changelog for Phase 3. Each entry pairs a date/version with what changed, why, and what test evidence motivated it.

For the authoritative history see `git log`. This file captures the **narrative** — the decisions, not just the diffs.

---

## v0.3.0 — Phase 3 Submission (YYYY-MM-DD)

- **What changed:** *[e.g. tightened decomposition prompt to enforce 5–15 step range; added Zod guard on edge types in approve route]*
- **Why:** *[which failure case or metric this addressed — link FC-01 in failure_log.md]*
- **Evidence:** *[link to before/after traces in ../traces/]*

## v0.2.x — Phase 2 Prototype (2026-04-XX)

- 4-agent pipeline (decompose → select → orchestrate → govern) operational end-to-end
- Human approval gate + rejection-with-feedback at every phase
- Visual editor (React Flow), Command Center, Template Library, Workflow Wizard complete

## v0.1.0 — Phase 1 Scaffold

- Monorepo + codegen pipeline set up
- Database schema finalized; initial API routes scaffolded

---

## Template for future entries

```
## vX.Y.Z — Short title (YYYY-MM-DD)

- **What changed:**
- **Why:**
- **Evidence:**
- **Risk / rollback:**
```
