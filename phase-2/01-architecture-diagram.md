# PROMETHEAN — System Architecture Diagram

### Phase 2 Deliverable | Track A: Technical Build
### April 2026

---

## 1. High-Level System Architecture

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                        P R O M E T H E A N   S T U D I O                       ║
║                     Workflow Analysis & Orchestration Platform                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                                     │
│                     React PWA + ARWES Sci-Fi Theme                              │
│                                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   COMMAND    │  │   WORKFLOW   │  │   VISUAL     │  │   TEMPLATE   │        │
│  │   CENTER     │  │   WIZARD     │  │   EDITOR     │  │   LIBRARY    │        │
│  │              │  │              │  │              │  │              │        │
│  │ • KPI Dash   │  │ • 4-Step     │  │ • React Flow │  │ • 6 Pre-built│        │
│  │ • Timeline   │  │   Intake     │  │ • L0–L5 Nodes│  │   Templates  │        │
│  │ • Alert Feed │  │ • Constraints│  │ • Phase Bar  │  │ • Filterable │        │
│  │ • Fleet Grid │  │ • Governance │  │ • Gate Ctrls │  │ • CRM, Sec,  │        │
│  │              │  │ • Review     │  │ • Confidence │  │   Compliance │        │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                                 │
│  ┌──────────────┐                                                               │
│  │  WORKFLOW    │  Zustand State Management | React Query Data Fetching         │
│  │  DETAIL      │  Orbitron + JetBrains Mono | Cyan/Magenta Accents             │
│  │              │                                                               │
│  │ • Exec Logs  │  Built with: React 19 + TypeScript + Vite + Tailwind CSS     │
│  │ • Run Times  │                                                               │
│  └──────────────┘                                                               │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │
                                     │  HTTP/REST (JSON)
                                     │  /api/pipeline/*
                                     │  /api/workflows/*
                                     │  /api/templates/*
                                     │  /api/alerts/*
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            API SERVER LAYER                                     │
│                     Express.js + TypeScript + Pino Logger                        │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        Pipeline Router                                  │    │
│  │                                                                         │    │
│  │   POST /pipeline/start          → Launch decomposition                  │    │
│  │   POST /pipeline/:id/approve    → Approve phase & advance               │    │
│  │   POST /pipeline/:id/reject     → Reject phase & regenerate             │    │
│  │   GET  /pipeline/:id/status     → Get current pipeline state            │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        Resource Routers                                  │    │
│  │                                                                         │    │
│  │   CRUD /workflows    → Create, list, update, delete workflows           │    │
│  │   CRUD /templates    → Browse and apply workflow templates               │    │
│  │   CRUD /alerts       → Manage governance alerts                         │    │
│  │   CRUD /executions   → Track execution history                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  Zod Schema Validation (shared @workspace/api-zod)                              │
│  CORS + JSON Middleware | Pino Request Logging                                  │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                          ▼                     ▼
┌─────────────────────────────────┐  ┌───────────────────────────────────────────┐
│      4-AGENT AI PIPELINE       │  │              DATA LAYER                    │
│                                 │  │                                           │
│  (See Pipeline Detail Below)    │  │   PostgreSQL + Drizzle ORM               │
│                                 │  │                                           │
│  Each agent calls:              │  │   ┌─────────────┐  ┌─────────────┐       │
│  • OpenAI GPT-5.2 API          │  │   │  workflows   │  │  executions │       │
│  • JSON structured output      │  │   │             │  │             │       │
│  • Function calling mode       │  │   │ • id (UUID)  │  │ • id (UUID) │       │
│                                 │  │   │ • name       │  │ • workflowId│       │
│                                 │  │   │ • nodes[]    │  │ • status    │       │
│                                 │  │   │ • edges[]    │  │ • result    │       │
│                                 │  │   │ • phase      │  │ • cost      │       │
│                                 │  │   │ • status     │  │ • latency   │       │
│                                 │  │   │ • govConfig  │  │             │       │
│                                 │  │   └─────────────┘  └─────────────┘       │
│                                 │  │                                           │
│                                 │  │   ┌─────────────┐  ┌─────────────┐       │
│                                 │  │   │  templates   │  │   alerts    │       │
│                                 │  │   │             │  │             │       │
│                                 │  │   │ • id (UUID)  │  │ • id (UUID) │       │
│                                 │  │   │ • name       │  │ • workflowId│       │
│                                 │  │   │ • nodes[]    │  │ • alertType │       │
│                                 │  │   │ • edges[]    │  │ • severity  │       │
│                                 │  │   │ • domain     │  │ • evidence  │       │
│                                 │  │   │ • rating     │  │ • status    │       │
│                                 │  │   └─────────────┘  └─────────────┘       │
│                                 │  │                                           │
│                                 │  │   ┌──────────────────────────┐            │
│                                 │  │   │   workflow_versions      │            │
│                                 │  │   │                          │            │
│                                 │  │   │ • workflowId + version   │            │
│                                 │  │   │ • definition (JSONB)     │            │
│                                 │  │   │ • changelog              │            │
│                                 │  │   └──────────────────────────┘            │
│                                 │  │                                           │
│                                 │  │   ┌──────────────────────────┐            │
│                                 │  │   │   execution_steps        │            │
│                                 │  │   │                          │            │
│                                 │  │   │ • executionId + stepId   │            │
│                                 │  │   │ • systemLevel            │            │
│                                 │  │   │ • input/output (JSONB)   │            │
│                                 │  │   │ • llmCalls, toolCalls    │            │
│                                 │  │   │ • cost, latency          │            │
│                                 │  │   └──────────────────────────┘            │
└─────────────────────────────────┘  └───────────────────────────────────────────┘
```

---

## 2. Four-Agent Pipeline — Detailed View

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                    PROMETHEAN 4-AGENT SEQUENTIAL PIPELINE                       ║
║          "Right-size every workflow step on the L0–L5 spectrum"                  ║
╚══════════════════════════════════════════════════════════════════════════════════╝

     USER INPUT                                                     DEPLOYED
     (Workflow                                                      WORKFLOW
     Description)                                                   (Active +
         │                                                          Monitored)
         ▼                                                              ▲
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │    │                 │
│   STAGE 1:      │    │   STAGE 2:      │    │   STAGE 3:      │    │   STAGE 4:      │
│   DECOMPOSITION │───▶│   SYSTEM        │───▶│   ORCHESTRATION │───▶│   GOVERNANCE    │
│   AGENT         │    │   SELECTION     │    │   AGENT         │    │   AGENT         │
│                 │    │   AGENT         │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │  INPUT:   │  │    │  │  INPUT:   │  │    │  │  INPUT:   │  │    │  │  INPUT:   │  │
│  │  Natural  │  │    │  │  Nodes[]  │  │    │  │  Annotated│  │    │  │  Enriched │  │
│  │  language │  │    │  │  Edges[]  │  │    │  │  nodes w/ │  │    │  │  workflow  │  │
│  │  workflow │  │    │  │  Original │  │    │  │  L0–L5    │  │    │  │  w/ tools  │  │
│  │  brief    │  │    │  │  descrip. │  │    │  │  levels   │  │    │  │  & edges   │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│                 │    │                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │  OUTPUT:  │  │    │  │  OUTPUT:  │  │    │  │  OUTPUT:  │  │    │  │  OUTPUT:  │  │
│  │  nodes[]  │  │    │  │  nodes[] +│  │    │  │  nodes[] +│  │    │  │  Final    │  │
│  │  edges[]  │  │    │  │  system   │  │    │  │  tools[]  │  │    │  │  workflow +│  │
│  │  summary  │  │    │  │  Level,   │  │    │  │  refined  │  │    │  │  govConfig│  │
│  │           │  │    │  │  confid., │  │    │  │  edges +  │  │    │  │  logging  │  │
│  │           │  │    │  │  rationale│  │    │  │  error    │  │    │  │  alerts   │  │
│  │           │  │    │  │  cost/lat │  │    │  │  handling │  │    │  │  threshlds│  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│                 │    │                 │    │                 │    │                 │
│  Model: GPT-5.2│    │  Model: GPT-5.2│    │  Model: GPT-5.2│    │  Model: GPT-5.2│
│  JSON output   │    │  JSON output   │    │  JSON output   │    │  JSON output   │
│  8192 max tkns │    │  8192 max tkns │    │  8192 max tkns │    │  8192 max tkns │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │                      │
         ▼                      ▼                      ▼                      ▼
   ┌───────────┐          ┌───────────┐          ┌───────────┐          ┌───────────┐
   │  HUMAN    │          │  HUMAN    │          │  HUMAN    │          │  HUMAN    │
   │  REVIEW   │          │  REVIEW   │          │  REVIEW   │          │  REVIEW   │
   │  GATE 1   │          │  GATE 2   │          │  GATE 3   │          │  GATE 4   │
   │           │          │           │          │           │          │           │
   │ ✓ Approve │          │ ✓ Approve │          │ ✓ Approve │          │ ✓ Approve │
   │ ✗ Reject  │          │ ✗ Reject  │          │ ✗ Reject  │          │ ✗ Reject  │
   │   +feedback│          │   +feedback│          │   +feedback│          │   +feedback│
   │ ✎ Edit    │          │ ✎ Edit    │          │ ✎ Edit    │          │ ✎ Edit    │
   └───────────┘          └───────────┘          └───────────┘          └───────────┘
```

---

## 3. Request Flow — Complete Pipeline Walkthrough

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║              REQUEST FLOW: Workflow Through the Full Pipeline                   ║
╚══════════════════════════════════════════════════════════════════════════════════╝

  USER                   FRONTEND                  API SERVER              AI AGENTS
   │                        │                          │                       │
   │  1. Create Workflow    │                          │                       │
   │  ───────────────────▶  │                          │                       │
   │                        │  POST /workflows         │                       │
   │                        │  ─────────────────────▶  │                       │
   │                        │  ◀─ 201 {id, status:     │                       │
   │                        │     "draft"}              │                       │
   │                        │                          │                       │
   │  2. Fill Wizard Form   │                          │                       │
   │  (description, domain, │                          │                       │
   │   constraints, govnce) │                          │                       │
   │  ───────────────────▶  │                          │                       │
   │                        │  POST /pipeline/start    │                       │
   │                        │  {workflowId, desc,      │                       │
   │                        │   domain, constraints}   │                       │
   │                        │  ─────────────────────▶  │                       │
   │                        │                          │  ┌─────────────────┐  │
   │                        │                          │  │ Decomposition   │  │
   │                        │                          │──▶│ Agent           │  │
   │                        │                          │  │ (GPT-5.2 call)  │  │
   │                        │                          │  └────────┬────────┘  │
   │                        │                          │           │           │
   │                        │                          │  ◀────────┘           │
   │                        │                          │  {nodes[], edges[],   │
   │                        │                          │   summary}            │
   │                        │                          │                       │
   │                        │                          │  UPDATE workflows SET │
   │                        │                          │  phase='decompose',   │
   │                        │                          │  status='awaiting_    │
   │                        │                          │  approval'            │
   │                        │                          │                       │
   │                        │  ◀─ {phase:"decompose",  │                       │
   │                        │      status:"awaiting_   │                       │
   │                        │      approval", nodes,   │                       │
   │  3. Review in Editor   │      edges}              │                       │
   │  ◀─────────────────── │                          │                       │
   │                        │                          │                       │
   │  4. APPROVE or REJECT  │                          │                       │
   │  ───────────────────▶  │                          │                       │
   │                        │                          │                       │
   │  [If APPROVE]          │  POST /pipeline/:id/     │                       │
   │                        │  approve {phase:         │                       │
   │                        │  "decompose"}            │                       │
   │                        │  ─────────────────────▶  │                       │
   │                        │                          │  ┌─────────────────┐  │
   │                        │                          │  │ System Selection│  │
   │                        │                          │──▶│ Agent           │  │
   │                        │                          │  │ (GPT-5.2 call)  │  │
   │                        │                          │  └────────┬────────┘  │
   │                        │                          │           │           │
   │                        │                          │  {nodes[] w/ L0–L5,  │
   │                        │                          │   confidence, cost}   │
   │                        │                          │                       │
   │                        │  ... (repeat approve/reject for each phase) ...  │
   │                        │                          │                       │
   │  [If REJECT]           │  POST /pipeline/:id/     │                       │
   │                        │  reject {phase, feedback}│                       │
   │                        │  ─────────────────────▶  │                       │
   │                        │                          │  Re-run same agent    │
   │                        │                          │  with feedback param  │
   │                        │  ◀─ regenerated result   │                       │
   │                        │                          │                       │
   │  5. Final Approval     │  POST /pipeline/:id/     │                       │
   │  (Governance phase)    │  approve {phase:"govern"}│                       │
   │  ───────────────────▶  │  ─────────────────────▶  │                       │
   │                        │                          │  UPDATE workflows SET │
   │                        │                          │  phase='deployed',    │
   │                        │                          │  status='active'      │
   │                        │                          │                       │
   │                        │                          │  INSERT workflow_     │
   │                        │                          │  versions (snapshot)  │
   │                        │                          │                       │
   │  6. View in Dashboard  │  ◀─ {status:"deployed"}  │                       │
   │  ◀─────────────────── │                          │                       │
   │                        │                          │                       │
```

---

## 4. Pipeline Phase State Machine

```
                    ┌──────────┐
                    │  wizard  │  (User filling intake form)
                    └────┬─────┘
                         │ POST /pipeline/start
                         ▼
                    ┌──────────┐
              ┌────▶│decompose │◀────┐
              │     └────┬─────┘     │
              │          │ approve   │ reject + feedback
              │          ▼           │ (re-run Decomposition Agent)
              │     ┌──────────┐     │
              │     │  select  │─────┘
              │     └────┬─────┘
              │          │ approve
              │          ▼
              │     ┌───────────┐
              │     │orchestrate│◀────┐
              │     └────┬──────┘     │
              │          │ approve    │ reject + feedback
              │          ▼            │ (re-run Orchestration Agent)
              │     ┌──────────┐     │
              │     │  govern  │─────┘
              │     └────┬─────┘
              │          │ approve
              │          ▼
              │     ┌──────────┐
              └─────│ deployed │  (Active + monitored)
                    └──────────┘
```

---

## 5. Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     TECHNOLOGY STACK                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FRONTEND                                                       │
│  ├── React 19 + TypeScript                                      │
│  ├── Vite (build tool)                                          │
│  ├── Tailwind CSS + ARWES-inspired sci-fi theme                 │
│  ├── React Flow (visual workflow editor)                        │
│  ├── Recharts (data visualization)                              │
│  ├── Zustand (client state management)                          │
│  ├── React Query / TanStack Query (data fetching)               │
│  └── Orbitron + JetBrains Mono (typography)                     │
│                                                                 │
│  BACKEND                                                        │
│  ├── Express.js + TypeScript                                    │
│  ├── Pino (structured logging)                                  │
│  ├── Zod (request/response validation)                          │
│  └── CORS middleware                                            │
│                                                                 │
│  AI / AGENTS                                                    │
│  ├── OpenAI GPT-5.2 (all 4 agents)                              │
│  ├── JSON response format (response_format: json_object)        │
│  └── 8192 max completion tokens per call                        │
│                                                                 │
│  DATA                                                           │
│  ├── PostgreSQL (primary data store)                            │
│  ├── Drizzle ORM (type-safe schema + queries)                   │
│  └── JSONB columns (nodes, edges, configs)                      │
│                                                                 │
│  INFRASTRUCTURE                                                 │
│  ├── Replit (hosting + deployment)                              │
│  ├── pnpm monorepo workspace                                    │
│  └── Shared packages (@workspace/db, @workspace/api-zod)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Monorepo Package Structure

```
promethean-studio/
├── artifacts/
│   ├── promethean/          # React PWA frontend
│   │   ├── src/
│   │   │   ├── components/  # UI components (Dashboard, Wizard, Editor, etc.)
│   │   │   ├── hooks/       # React Query hooks
│   │   │   ├── stores/      # Zustand state stores
│   │   │   └── pages/       # Route pages
│   │   └── package.json
│   │
│   └── api-server/          # Express API backend
│       ├── src/
│       │   ├── lib/
│       │   │   └── agents/  # 4 AI agent implementations
│       │   │       ├── decomposition.ts
│       │   │       ├── systemSelection.ts
│       │   │       ├── orchestration.ts
│       │   │       ├── governance.ts
│       │   │       └── types.ts
│       │   └── routes/
│       │       ├── pipeline/ # Pipeline orchestration routes
│       │       ├── workflows/
│       │       ├── templates/
│       │       └── alerts/
│       └── package.json
│
├── lib/
│   └── db/                  # Shared database package
│       └── src/
│           └── schema/      # Drizzle ORM schemas
│               ├── workflows.ts
│               ├── executions.ts
│               ├── alerts.ts
│               └── templates.ts
│
├── packages/
│   └── api-zod/             # Shared Zod validation schemas
│
└── pnpm-workspace.yaml      # Monorepo configuration
```
