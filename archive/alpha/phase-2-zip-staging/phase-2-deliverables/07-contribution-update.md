# PROMETHEAN — Contribution Update

### Phase 2 Deliverable | Track A: Technical Build
### April 2026

---

## Project Information

| Field | Value |
|-------|-------|
| Project Title | Promethean Studio |
| Track | Track A: Technical Build |
| Phase | Phase 2 — Architecture, Prototype, and Evaluation Plan |
| Repository | Replit — Promethean Studio |
| Team Members | Noah Hicks, Rushabh Kankariya, Vishnu Bala, Yiying Lu, Mel Wong |

Note: The team worked to give feedback and determine the alignment of the project and any edits that should be made.
---

## Phase 2 Summary

### What Was Accomplished
- Full system architecture designed and documented (React PWA → Express API → 4-Agent Pipeline → PostgreSQL)
- All four AI agents implemented and functional (Decomposition, System Selection, Orchestration, Governance)
- Human-in-the-loop pipeline with approve/reject/edit at every stage
- Visual workflow editor with React Flow, color-coded L0–L5 nodes, confidence badges
- Command Center dashboard with KPI metrics, timeline, alert feed, fleet grid
- Workflow Wizard with conversational intake flow (8-step Prometheus assistant)
- Template library with 6 pre-built workflow templates across 6 domains
- PostgreSQL schema with Drizzle ORM (workflows, executions, alerts, templates, versions)
- OpenAPI 3.1 spec with generated Zod schemas and React Query hooks (Orval codegen)
- ARWES-inspired sci-fi dark theme with Orbitron + JetBrains Mono typography
- 5-minute product demo video produced

### What Remains for Phase 3
- Execute the 5 planned evaluation test scenarios
- Collect and log interaction traces and evidence artifacts
- Run baseline comparisons (Always-L0, Always-L4, Always-L5)
- Document 2+ concrete failure cases with root cause analysis
- Write the final report (problem → architecture → evaluation → results → lessons learned)
- Compile the complete portfolio-ready submission package (PDF, screenshots, eval files)

---

## Collaboration Tools Used

| Tool | Purpose |
|------|---------|
| Replit | Primary development environment, live hosting, and version control |
| WhatsApp | Team communication and coordination |

---

## AI Usage Disclosure

| Tool | Used For | What Was Changed Manually | What Was Independently Verified |
|------|---------|--------------------------|-------------------------------|
| Replit Agent (AI coding assistant) | Code scaffolding, component generation, route implementation, schema design | Agent prompts hand-tuned for output quality; UI layout and styling refined; Zod validation schemas reviewed and corrected; edge cases added manually | Pipeline correctness tested end-to-end; node classification logic reviewed against rubric; API contract verified by running type checks (`pnpm run typecheck`) |
| OpenAI GPT-5.4-mini-2026-03-17 | Runtime LLM backbone for all four pipeline agents (Decomposition, System Selection, Orchestration, Governance) | Prompt engineering for each agent written by hand; output format constraints (structured JSON via Zod) designed manually; system spectrum rubric authored by team | Agent outputs reviewed against expected L0–L5 classifications; governance config fields validated against schema; decomposition quality assessed on real workflow descriptions |
