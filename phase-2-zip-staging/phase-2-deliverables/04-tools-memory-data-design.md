# PROMETHEAN — Tools, Memory, and Data Design

### Phase 2 Deliverable | Track A: Technical Build
### April 2026

---

## 1. Overview

This document describes what information each agent can access, how the system stores and retrieves state, what tools are available, and why these design choices make sense for Promethean's workflow analysis problem.

---

## 2. What Each Agent Can Access

### Shared Resources (All Agents)
| Resource | Type | Access |
|----------|------|--------|
| OpenAI GPT-5.4-mini API | LLM | Read (generate completions) |
| System prompt | Configuration | Read-only (embedded per agent) |
| Pino logger | Observability | Write (structured log entries) |

### Per-Agent Access Matrix

| Resource | Agent 1 (Decompose) | Agent 2 (Select) | Agent 3 (Orchestrate) | Agent 4 (Govern) |
|----------|:---:|:---:|:---:|:---:|
| User workflow description | Read | Read | Read | Read |
| Domain context | Read | Read | Read | Read |
| Constraints JSON | Read | Read | Read | Read |
| Human feedback (on reject) | Read | Read | Read | Read |
| Previous nodes/edges | — | Read | Read | Read |
| L0–L5 Classification Rubric | — | Read | — | — |
| Tool binding registry | — | — | Read | — |
| Default governance config | — | — | — | Read |

### Data Flow Between Agents

```
Agent 1                Agent 2                Agent 3                Agent 4
─────────              ─────────              ─────────              ─────────
Receives:              Receives:              Receives:              Receives:
• description          • nodes[]              • nodes[] +            • nodes[] +
• domain               • edges[]                systemLevel,           tools[],
• constraints          • description            confidence,            conditions[],
                       • constraints            rationale              errorHandling
                                              • edges[]              • edges[] (refined)
                                              • description          • description
                                              • constraints          • constraints

Produces:              Produces:              Produces:              Produces:
• nodes[]              • nodes[] enriched     • nodes[] enriched     • nodes[] (may add)
• edges[]                w/ systemLevel,        w/ tools[],          • edges[] (may add)
• summary                confidence,            conditions[],        • governanceConfig{}
                         rationale              errorHandling        • summary
                       • systemTypeSummary    • edges[] refined
                       • estimatedCostPerRun    w/ types
                       • estimatedLatencyMs   • summary
                       • summary
```

---

## 3. PostgreSQL Schema — Complete Data Model

### 3.1 Workflows Table
The central table storing workflow definitions and their current pipeline state.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated unique identifier |
| `name` | TEXT (NOT NULL) | Human-readable workflow name |
| `description` | TEXT | Optional long description |
| `status` | TEXT | Current status: "draft", "building", "awaiting_approval", "active" |
| `phase` | TEXT | Current pipeline phase: "wizard", "decompose", "select", "orchestrate", "govern", "deployed" |
| `version` | TEXT | Semantic version string (default "1.0.0") |
| `domain` | TEXT | Domain category (e.g., "CRM", "Cybersecurity") |
| `tags` | TEXT[] | Searchable tags array |
| `nodes` | JSONB | Array of PrometheanNode objects — the workflow steps |
| `edges` | JSONB | Array of PrometheanEdge objects — the connections |
| `governance_config` | JSONB | GovernanceConfig object — thresholds, alerts, logging |
| `estimated_cost_per_run` | DECIMAL(10,6) | Estimated cost in USD |
| `estimated_latency_ms` | INTEGER | Estimated latency in milliseconds |
| `system_type_summary` | JSONB | Distribution of L0–L5 levels (e.g., {"L0": 3, "L2": 2}) |
| `trigger_type` | TEXT | How the workflow is triggered |
| `workflow_brief` | TEXT | The original natural-language workflow description |
| `created_at` | TIMESTAMP WITH TZ | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TZ | Last update timestamp (auto-updated) |

### 3.2 Workflow Versions Table
Immutable version snapshots created on deployment.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `workflow_id` | UUID (FK → workflows) | Parent workflow |
| `version` | TEXT | Version string at time of snapshot |
| `definition` | JSONB | Full serialized workflow state (nodes, edges, governance) |
| `changelog` | TEXT | Description of changes in this version |
| `created_at` | TIMESTAMP WITH TZ | Snapshot timestamp |

### 3.3 Executions Table
Records of workflow runs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `workflow_id` | UUID (FK → workflows) | Which workflow was executed |
| `workflow_version` | TEXT | Version at time of execution |
| `triggered_by` | TEXT | How it was triggered (default "manual") |
| `trigger_payload` | JSONB | Trigger-specific data |
| `status` | TEXT | "running", "completed", "failed" |
| `started_at` | TIMESTAMP WITH TZ | Execution start |
| `completed_at` | TIMESTAMP WITH TZ | Execution end |
| `total_cost` | DECIMAL(10,6) | Total cost of this run |
| `total_latency_ms` | INTEGER | Total duration |
| `result` | JSONB | Execution result data |
| `error` | JSONB | Error information if failed |

### 3.4 Execution Steps Table
Per-step records within an execution.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `execution_id` | UUID (FK → executions) | Parent execution |
| `step_id` | TEXT | Node ID within the workflow |
| `step_name` | TEXT | Human-readable step name |
| `system_level` | INTEGER | L0–L5 classification |
| `status` | TEXT | "running", "completed", "failed" |
| `input` | JSONB | Input data for this step |
| `output` | JSONB | Output data from this step |
| `llm_calls` | JSONB | Details of any LLM API calls made |
| `tool_calls` | JSONB | Details of any tool invocations |
| `cost` | DECIMAL(10,6) | Cost of this step |
| `latency_ms` | INTEGER | Duration of this step |
| `started_at` | TIMESTAMP WITH TZ | Step start |
| `completed_at` | TIMESTAMP WITH TZ | Step end |

### 3.5 Alerts Table
Governance and drift alerts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `workflow_id` | UUID (FK → workflows) | Related workflow |
| `alert_type` | TEXT | Category of alert |
| `severity` | TEXT | "info", "warning", "critical" |
| `title` | TEXT | Brief alert title |
| `description` | TEXT | Detailed alert description |
| `evidence` | JSONB | Supporting data/evidence |
| `status` | TEXT | "active", "acknowledged", "resolved" |
| `created_at` | TIMESTAMP WITH TZ | When the alert was generated |
| `acknowledged_at` | TIMESTAMP WITH TZ | When a human acknowledged it |
| `resolved_at` | TIMESTAMP WITH TZ | When the alert was resolved |

### 3.6 Templates Table
Pre-built workflow patterns.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `name` | TEXT | Template name |
| `description` | TEXT | What the template does |
| `domain` | TEXT | Domain category |
| `tags` | TEXT[] | Searchable tags |
| `nodes` | JSONB | Pre-configured workflow nodes |
| `edges` | JSONB | Pre-configured workflow edges |
| `rating` | DECIMAL(3,2) | Community rating |
| `usage_count` | INTEGER | How many times this template has been used |
| `estimated_cost_per_run` | DECIMAL(10,6) | Estimated cost |
| `estimated_latency_ms` | INTEGER | Estimated latency |
| `is_public` | BOOLEAN | Whether the template is publicly available |
| `created_at` | TIMESTAMP WITH TZ | Creation timestamp |

### Entity-Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│   workflows     │       │ workflow_versions│
│                 │───1:N─▶│                 │
│ • id (PK)       │       │ • id (PK)       │
│ • name          │       │ • workflow_id FK │
│ • nodes (JSONB) │       │ • version       │
│ • edges (JSONB) │       │ • definition    │
│ • phase         │       │ • changelog     │
│ • status        │       └─────────────────┘
│ • govConfig     │
│                 │       ┌─────────────────┐
│                 │───1:N─▶│   executions    │
│                 │       │                 │
│                 │       │ • id (PK)       │
│                 │       │ • workflow_id FK │──1:N──▶ ┌──────────────────┐
│                 │       │ • status        │         │ execution_steps  │
│                 │       │ • cost, latency │         │                  │
│                 │       └─────────────────┘         │ • id (PK)        │
│                 │                                   │ • execution_id FK│
│                 │       ┌─────────────────┐         │ • step_id        │
│                 │───1:N─▶│    alerts       │         │ • systemLevel    │
│                 │       │                 │         │ • input/output   │
│                 │       │ • id (PK)       │         │ • cost, latency  │
│                 │       │ • workflow_id FK │         └──────────────────┘
│                 │       │ • severity      │
│                 │       │ • evidence      │
└─────────────────┘       └─────────────────┘

┌─────────────────┐
│   templates     │  (Standalone — no FK relationships)
│                 │
│ • id (PK)       │
│ • name          │
│ • nodes (JSONB) │
│ • edges (JSONB) │
│ • domain, tags  │
│ • rating        │
└─────────────────┘
```

---

## 4. OpenAI Integration — LLM Calls

### Configuration
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Model | `gpt-5.4-mini-2026-03-17` | Best balance of capability, cost, and speed for structured output |
| `max_completion_tokens` | 8192 | Sufficient for complex workflow JSON output |
| `response_format` | `{ type: "json_object" }` | Forces valid JSON response, prevents prose leakage |
| Temperature | Default (1.0) | Allows creative decomposition while JSON mode constrains format |

### How Each Agent Uses the LLM

| Agent | System Prompt Role | User Prompt Content | Expected Output |
|-------|-------------------|---------------------|-----------------|
| Decomposition | "Decompose workflow into substeps" | Description + domain + constraints | `{nodes[], edges[], summary}` |
| System Selection | "Classify on L0–L5 spectrum" | Nodes + edges + description | `{nodes[], summary, costs}` |
| Orchestration | "Add tools, conditions, error handling" | Classified nodes + edges + description | `{nodes[], edges[], summary}` |
| Governance | "Configure monitoring and thresholds" | Orchestrated nodes + edges + description | `{nodes[], edges[], governanceConfig, summary}` |

### Feedback Integration
When a human rejects an agent's output, the feedback is appended to the user prompt:
```
Previous result was rejected. Feedback: [human feedback here]
Please improve based on this feedback.
```
This allows the LLM to learn from the human's specific concerns within the same conversation context.

---

## 5. The L0–L5 Classification Rubric as a Decision Tool

The System Selection Agent's most critical tool is the classification rubric embedded in its system prompt. This rubric is not a separate service — it is a structured decision framework that the LLM applies to each substep.

### Rubric Decision Process
```
For each substep:
  1. START at L0 (deterministic)
  2. Can L0 handle it?
     YES → Classify as L0, confidence = high
     NO  → Move to L1
  3. Can L1 (supervised ML) handle it?
     YES → Classify as L1, justify why L0 fails
     NO  → Move to L2
  4. Continue up the spectrum...
  5. NEVER jump levels — always justify each step up
```

### Classification Criteria Per Level
| Level | Key Question | Indicators |
|-------|-------------|------------|
| L0 | Are inputs and outputs fully known? | Fixed rules, regex, DB lookups, validation |
| L1 | Is this a narrow classification problem? | High accuracy needed, labeled training data exists |
| L2 | Does it require language understanding? | Intent classification, entity extraction, sentiment |
| L3 | Does it require language generation? | Summarization, drafting, single-turn reasoning |
| L4 | Does it require external tool use? | Search, API calls, code execution, multi-step |
| L5 | Does it require multiple agents? | Task decomposition, parallel specialization, debate |

---

## 6. Memory and State Handling

### State Architecture

Promethean uses a **database-centric state model** where PostgreSQL is the single source of truth for all pipeline state. This choice was deliberate — it provides durability, queryability, and auditability.

```
┌─────────────────────────────────────────────────────────┐
│                     STATE LAYERS                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CLIENT STATE (Zustand)                                 │
│  ├── Current page/view                                  │
│  ├── UI state (modals, selections)                      │
│  └── Cached query results (React Query)                 │
│                                                         │
│  API STATE (Express request context)                    │
│  ├── Current request parameters                         │
│  ├── Validated request body (Zod)                       │
│  └── Request-scoped logger context                      │
│                                                         │
│  PIPELINE STATE (PostgreSQL)                            │
│  ├── workflows.phase — current pipeline position        │
│  ├── workflows.status — current status                  │
│  ├── workflows.nodes — current workflow nodes (JSONB)   │
│  ├── workflows.edges — current workflow edges (JSONB)   │
│  └── workflows.governance_config — current config       │
│                                                         │
│  PERSISTENT STATE (PostgreSQL)                          │
│  ├── workflow_versions — immutable deployment snapshots  │
│  ├── executions — run history                           │
│  ├── execution_steps — per-step run details             │
│  ├── alerts — governance alerts                         │
│  └── templates — reusable workflow patterns             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Why Database-Centric State (Not In-Memory)

| Concern | Database Approach | In-Memory Alternative | Why We Chose Database |
|---------|-------------------|----------------------|----------------------|
| Durability | Survives server restarts | Lost on restart | Pipeline runs may take minutes with human review |
| Auditability | Full query history | Requires separate logging | Course rubric values governance and traceability |
| Concurrency | PostgreSQL handles it | Requires manual locking | Multiple users may view/edit workflows |
| Scalability | Scales with PostgreSQL | Limited by server memory | Workflow JSONB can be large |
| Simplicity | One data store | Multiple stores to sync | Fewer moving parts, fewer bugs |

### JSONB for Flexible Schemas

The `nodes`, `edges`, `governance_config`, `system_type_summary`, and `definition` columns use PostgreSQL's JSONB type. This allows:

- **Schema flexibility:** Agent outputs can evolve without database migrations
- **Query capability:** PostgreSQL can query inside JSONB documents
- **Type safety:** TypeScript interfaces define the expected structure at the application layer
- **Performance:** JSONB is stored in a binary format optimized for PostgreSQL

---

## 7. Validation Layer — Zod Schemas

Input validation uses Zod schemas shared between frontend and backend via the `@workspace/api-zod` package:

| Schema | Purpose |
|--------|---------|
| `StartPipelineBody` | Validates pipeline start requests (workflowId, description, domain, constraints) |
| `ApprovePhaseBody` | Validates approval requests (phase, optional edits) |
| `ApprovePhaseParams` | Validates URL params for approval (workflowId) |
| `RejectPhaseBody` | Validates rejection requests (phase, feedback) |
| `RejectPhaseParams` | Validates URL params for rejection (workflowId) |
| `GetPipelineStatusParams` | Validates status query params (workflowId) |

Zod provides runtime type checking that complements TypeScript's compile-time checks, ensuring that invalid data never reaches the agent pipeline.

---

## 8. Design Rationale Summary

| Decision | Choice | Why |
|----------|--------|-----|
| Single LLM model for all agents | GPT-5.4-mini | Simplifies integration; function calling support; good balance of cost and capability |
| JSON structured output mode | `response_format: json_object` | Eliminates parsing errors; ensures valid output |
| PostgreSQL for pipeline state | Database-centric | Durable, auditable, queryable, survives restarts |
| JSONB for workflow definitions | Flexible schema | Agent outputs evolve without migrations |
| Drizzle ORM | Type-safe database access | TypeScript-native, minimal overhead, schema-as-code |
| Pnpm monorepo | Shared packages | DB schemas and API types shared between frontend and backend |
| Zod validation | Shared request schemas | Runtime type safety at API boundaries |
| Feedback as re-prompting | Append to user prompt | Simple, effective — LLM adjusts based on specific feedback |
