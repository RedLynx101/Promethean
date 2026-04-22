# AI Usage Disclosure

**Project:** Promethean Studio
**Team:** Noah Hicks, Rushabh Kankariya, Vishnu Bala, Yiying Lu, Mel Wong
**Track:** Track A: Technical Build
**Course:** Agentic Systems Studio

This document discloses all AI tools used in the development of Promethean Studio, as required by course policy.

> _Last updated: April 21, 2026 — refreshed for Phase 3 submission._

---

## Tools Used

### 1. Replit Agent

**Version:** Replit Agent (Claude-based coding assistant, April 2026)

**What it was used for:**
- Scaffolding the pnpm monorepo structure and workspace configuration
- Generating initial Express route handlers and Drizzle ORM schema files
- Building React component skeletons for the dashboard, wizard, editor, and template library
- Writing OpenAPI 3.1 specification and Orval codegen configuration
- Generating Zod validation schemas for API request/response contracts
- Producing the Phase 2 documentation drafts (architecture diagram, role definitions, coordination logic, tools/data design, evaluation plan, risk plan, interaction trace)
- Producing the animated product demo video component

**What was changed manually afterward:**
- All four agent prompts (Decomposition, System Selection, Orchestration, Governance) were written and refined by hand to reflect the Promethean System Spectrum (L0–L5) classification rubric
- The L0–L5 system spectrum rubric itself was designed by the team
- UI layout, color palette, and typography choices were specified and adjusted by the team
- The Zod schemas for agent outputs were reviewed and corrected to match expected data shapes
- Phase transition validation logic and human-in-the-loop gate behavior were specified by the team
- Edge type taxonomy (`default`, `conditional`, `error`, `parallel`, `loop`) designed by the team
- Evaluation scenarios, success criteria, and baseline definitions written by the team
- Risk analysis and governance policy content authored by the team

**What was independently verified:**
- End-to-end pipeline flow tested manually by running the full wizard → decompose → select → orchestrate → govern sequence
- TypeScript type correctness verified by running `pnpm run typecheck` across the monorepo (zero errors)
- Node classification logic reviewed against the L0–L5 rubric by the team
- API contracts verified by inspecting request/response shapes against the OpenAPI spec
- Database schema migrations tested against a live PostgreSQL instance

---

### 2. OpenAI GPT-5.4-mini-2026-03-17 (Runtime LLM)

**Version:** gpt-5.4-mini-2026-03-17 (via OpenAI API, accessed April 2026)

**What it was used for:**
- Runtime backbone for all four pipeline agents during live workflow processing:
  - **Decomposition Agent:** Converts natural-language workflow descriptions into structured node graphs
  - **System Selection Agent:** Classifies each node on the L0–L5 autonomy spectrum
  - **Orchestration Agent:** Adds edge routing, error handling, parallel paths, and tool integrations
  - **Governance Agent:** Generates monitoring configs, alerting thresholds, and cost/latency guardrails
- All calls use OpenAI structured outputs (JSON mode with Zod schemas) to constrain response format

**What was changed manually afterward:**
- Prompt text for each agent was written entirely by the team — the LLM received no free-form generation authority over its own instructions
- Output format constraints (JSON schema, required fields, enum values) were designed by hand
- The system spectrum rubric used for classification was authored by the team and injected into prompts

**What was independently verified:**
- Classification outputs reviewed against expected L0–L5 mappings for known workflow types
- Governance config fields validated against the database schema
- Orchestration edge types checked against the canonical taxonomy
- Decomposition quality assessed on multiple real workflow descriptions (CRM lead qualification, customer support triage, code review)

---

### 3. Cursor IDE + Claude Opus 4.7 (Phase 3 Documentation Polish)

**Version:** Claude Opus 4.7 accessed via Cursor IDE (April 2026)

**What it was used for:**
- Auditing Phase 2 documentation for model-version consistency and producing batch edits across 8 files
- Drafting the Phase 3 screenshot index and assisting with repo structure alignment to the course-mandated layout
- Cross-referencing the Phase 2 professor feedback against the course rubric to produce a per-person Phase 3 work plan

**What was changed manually afterward:**
- All suggested edits reviewed line-by-line before committing
- ASCII diagram alignment verified manually after automated find/replace, with width adjustments applied where needed
- Branch commit messages and PR descriptions written by the team member

**What was independently verified:**
- `ripgrep` search confirmed zero remaining `GPT-5.2` references in the Phase 2 docs after the consistency fix
- `git diff` reviewed before the fix branch was pushed
- Screenshot captions and cross-references hand-verified against the actual UI

---

## Prompts Used

The prompts injected into each agent at runtime are defined in the following source files in the repository:

| Agent | Source File |
|-------|------------|
| Decomposition | `artifacts/api-server/src/lib/agents/decomposition.ts` |
| System Selection | `artifacts/api-server/src/lib/agents/systemSelection.ts` |
| Orchestration | `artifacts/api-server/src/lib/agents/orchestration.ts` |
| Governance | `artifacts/api-server/src/lib/agents/governance.ts` |

The full prompt text for each agent can be read directly from the source code. All prompts are deterministic (no dynamic prompt injection beyond the user's workflow description and current node state).

---

## Summary

AI tools were used as a force multiplier for implementation speed, documentation scaffolding, demo video production, and Phase 3 submission polish. All core design decisions — the system spectrum rubric, agent responsibilities, evaluation criteria, risk analysis, and governance policy — were made by the team. All AI-generated content was reviewed, corrected where needed, and independently verified before inclusion in the submission.
