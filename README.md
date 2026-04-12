# Promethean Studio

**AI workflow orchestration studio with a four-agent pipeline, human-in-the-loop approval gates, and a visual graph editor.**

Promethean takes a natural-language description of a business workflow and transforms it into a fully orchestrated, governed, deployable pipeline — using a sequence of specialized AI agents, with human review at every stage.

![Command Center](screenshots/dashboard.jpg)

---

## Team

**Track A: Technical Build** | Agentic Systems Studio — Phase 2

| Name | Role |
|------|------|
| Noah Hicks | [Fill in] |
| Rushabh Kankariya | [Fill in] |
| Vishnu Bala | [Fill in] |
| Yiying Lu | [Fill in] |
| Mel Wong | [Fill in] |

---

## What It Does

1. **Describe** a workflow in plain English through a conversational wizard.
2. **Decompose** — an AI agent breaks the description into atomic processing steps.
3. **Select** — a second agent classifies each step on the Promethean System Spectrum (L0 Deterministic through L5 Multi-Agent).
4. **Orchestrate** — a third agent adds tooling, conditional branches, error handlers, and parallel execution paths.
5. **Govern** — a final agent layers monitoring, alerting thresholds, cost guardrails, and logging policies.

Every phase transition is a **human-in-the-loop approval gate** — you review the AI's work in a visual editor, make edits, approve or reject with feedback, and only then advance to the next stage.

Once deployed, workflows appear in the Command Center for execution tracking, latency monitoring, cost analysis, and alerting.

---

## Screenshots

| Command Center | Template Library | Workflow Wizard |
|:-:|:-:|:-:|
| ![Dashboard](screenshots/dashboard.jpg) | ![Templates](screenshots/templates.jpg) | ![Wizard](screenshots/wizard.jpg) |

---

## Architecture

```
promethean/
├── artifacts/
│   ├── api-server/          Express 5 API with AI pipeline agents
│   └── promethean/          React + Vite frontend (SPA)
├── lib/
│   ├── db/                  PostgreSQL schema (Drizzle ORM)
│   ├── api-spec/            OpenAPI 3.1 specification
│   ├── api-zod/             Generated Zod validation schemas
│   └── api-client-react/    Generated React Query hooks (Orval)
└── screenshots/
```

### Frontend

React 19 single-page app built with Vite, styled with Tailwind v4 and a custom sci-fi dark theme inspired by [ARWES](https://arwes.dev). Key libraries:

- **React Flow** (`@xyflow/react`) — interactive node-graph editor with custom color-coded nodes for each system level
- **Recharts** — execution timeline charts and performance metrics
- **Radix UI + Park UI** — accessible component primitives
- **Orbitron + JetBrains Mono** — display and monospace typefaces

Pages: Command Center (dashboard), Workflow Wizard (chat-style intake), Visual Editor (React Flow canvas), Template Library, Workflow Detail.

### Backend

Express 5 REST API with structured logging (pino), Zod request validation on every route, and four specialized AI agents:

| Agent | Responsibility |
|-------|---------------|
| **Decomposition** | Breaks natural-language descriptions into atomic workflow nodes |
| **System Selection** | Classifies each node on the L0-L5 autonomy spectrum |
| **Orchestration** | Adds edge routing, error handling, parallel paths, and tool integrations |
| **Governance** | Configures monitoring, alerting thresholds, cost/latency guardrails |

All agent outputs are validated at runtime with Zod schemas before persisting to the database.

### Database

PostgreSQL with Drizzle ORM. Six core tables:

- `workflows` — workflow definitions with JSONB node/edge graphs and governance configs
- `workflow_versions` — immutable snapshots at each phase transition
- `templates` — pre-built workflow blueprints (ships with 6 seed templates)
- `executions` — workflow run records with cost and latency tracking
- `execution_steps` — per-node execution telemetry
- `alerts` — governance-triggered alerts with acknowledge/resolve lifecycle

### API Codegen Pipeline

OpenAPI 3.1 spec → Orval generates React Query hooks and Zod validation schemas → consumed by the frontend with full type safety from database to UI.

---

## The Promethean System Spectrum

Every workflow node is classified on a six-level autonomy spectrum:

| Level | Name | Color | Description |
|-------|------|-------|-------------|
| L0 | Deterministic | `#4CAF50` | Rule-based logic, no ML |
| L1 | Supervised ML | `#2196F3` | Traditional ML models with human oversight |
| L2 | Language Understanding | `#9C27B0` | NLP/NLU processing |
| L3 | Single LLM Agent | `#FF9800` | One LLM call with structured output |
| L4 | Tool-Augmented LLM | `#F44336` | LLM with external tool access |
| L5 | Multi-Agent | `#E91E63` | Coordinated multi-agent system |

Plus two special node types: **HumanGate** (manual approval checkpoints) and **Trigger** (workflow entry points).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24, TypeScript 5.9 |
| Monorepo | pnpm workspaces |
| Frontend | React 19, Vite 6, Tailwind v4, React Flow, Recharts |
| Backend | Express 5, pino (logging), Zod (validation) |
| Database | PostgreSQL, Drizzle ORM |
| AI | OpenAI GPT (structured outputs with Zod schemas) |
| API Codegen | OpenAPI 3.1, Orval |
| Components | Radix UI, Park UI |

---

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL database

### Setup

```bash
pnpm install

pnpm --filter @workspace/db run push

pnpm --filter @workspace/api-spec run codegen
```

### Development

```bash
pnpm --filter @workspace/api-server run dev

pnpm --filter @workspace/promethean run dev
```

The API server runs on port 8080. The frontend dev server proxies `/api` requests to the backend automatically.

The database seeds itself on first startup with sample workflows, templates, and execution data.

### Type Checking

```bash
pnpm run typecheck
```

---

## Design Philosophy

Promethean is built around a few core ideas:

- **Human-in-the-loop by default.** AI agents propose, humans approve. Every pipeline phase has a gate where you can edit, reject with feedback, or approve the AI's output before moving forward.

- **Typed end-to-end.** A single OpenAPI spec generates both the Zod validation schemas used by the backend and the React Query hooks consumed by the frontend. Database types flow from Drizzle schemas through API serializers to the client. There are no `any` types in the critical path.

- **Separation of concerns in the AI layer.** Each agent has one job. Decomposition doesn't pick system levels. System selection doesn't add error handling. Orchestration doesn't configure monitoring. This makes each agent's prompt focused and its output predictable.

- **Visual-first workflow editing.** The React Flow canvas isn't just a viewer — it's an editor. Nodes can be repositioned, edges reconnected, system levels changed, and labels edited directly on the graph before approving a phase.

---

## Project Status

**v0.1.0 ALPHA** — Core pipeline and UI are functional. The four-agent AI pipeline runs end-to-end with human approval gates. The Command Center, Template Library, Workflow Wizard, and Visual Editor are all operational.

---

*Built with TypeScript, React, Express, PostgreSQL, and OpenAI.*
