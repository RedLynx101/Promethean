# Promethean Studio — Workspace

## Overview

**Promethean** is a full-stack sci-fi workflow analysis and orchestration studio. It accepts natural-language workflow descriptions, runs a 4-agent AI pipeline (Decomposition → System Selection → Orchestration → Governance) with human-in-the-loop approval gates, and renders results in a React Flow visual editor.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Architecture

- **Frontend** (`artifacts/promethean/`): React + Vite PWA at `/`
  - Sci-fi ARWES-inspired dark theme (bg `#0a0e14`, surface `#161b22`, accent-cyan `#00d4ff`, accent-magenta `#ff00aa`)
  - Fonts: Orbitron (display) + JetBrains Mono (mono)
  - React Flow canvas with custom color-coded nodes (L0-L5 system levels)
  - Recharts for execution timeline and metrics
  - Pages: Dashboard (Command Center), Workflow Wizard, Visual Editor, Template Library, Workflow Detail

- **API Server** (`artifacts/api-server/`): Express + Drizzle ORM at port 8080
  - All routes under `/api` prefix
  - Routes: `/workflows`, `/pipeline`, `/templates`, `/executions`, `/alerts`, `/dashboard`
  - 4 AI agents using GPT model: decomposition, systemSelection, orchestration, governance
  - Auto-seeds DB on startup with 6 templates + 3 sample workflows + executions + alerts

- **DB** (`lib/db/`): PostgreSQL + Drizzle ORM
  - Tables: workflows, workflow_versions, executions, execution_steps, alerts, templates

- **API Spec** (`lib/api-spec/`): OpenAPI spec with codegen (Zod schemas + React Query hooks)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend UI**: React Flow (`@xyflow/react`), Recharts, Tailwind v4, Radix UI
- **Build**: esbuild (API server), Vite (frontend)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## AI Pipeline Phases

1. **wizard** — user describes workflow via intake form
2. **decompose** — Decomposition Agent breaks into atomic steps
3. **select** — System Selection Agent classifies each step L0-L5
4. **orchestrate** — Orchestration Agent adds tools, conditions, error handling
5. **govern** — Governance Agent configures monitoring
6. **deployed** — workflow is active

Each phase transition is a human-in-the-loop approval gate.

## Node System Levels

| Level | Color | Description |
|-------|-------|-------------|
| L0 | `#4CAF50` | Deterministic — rule-based |
| L1 | `#2196F3` | Supervised ML |
| L2 | `#9C27B0` | Language Understanding (NLP/NLU) |
| L3 | `#FF9800` | Single LLM Agent |
| L4 | `#F44336` | Tool-Augmented LLM |
| L5 | `#E91E63` | Multi-Agent |
| HumanGate | `#607D8B` | Human approval required |
| Trigger | `#795548` | Workflow trigger |

## Demo Video

- **Video** (`artifacts/promethean-demo/`): Animated product demo video at `/promethean-demo/`
  - 7-scene looping motion graphics video (~26s total)
  - Scenes: Brand reveal, Problem visualization, Workflow intake, 4-agent pipeline, Visual editor, Command Center dashboard, Closing lockup
  - Uses Promethean palette: bg #0a0e14, cyan #00d4ff, Orbitron + JetBrains Mono fonts
  - Built with React, Framer Motion, Tailwind CSS
  - Auto-plays and loops seamlessly, no interactivity

## Vite Proxy

The Vite dev server proxies `/api` → `http://localhost:8080`.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
