# PROMETHEAN — Coordination Logic

### Phase 2 Deliverable | Track A: Technical Build
### April 2026

---

## 1. Pipeline Overview

Promethean uses a **centralized sequential pipeline** with four AI agents and four human-in-the-loop gates. The pipeline is managed by the Express API server's pipeline router, which maintains state in PostgreSQL and advances through phases based on human approval.

### Who Starts the Pipeline
The pipeline is initiated by a **human user** through the Workflow Wizard interface. The user fills out a 4-step intake form (workflow description, constraints, governance preferences, and review) and submits it. This triggers a `POST /pipeline/start` request that launches the first agent.

### How the Pipeline Ends
The pipeline ends when the human approves the final governance phase, at which point the workflow transitions to "deployed" status. Alternatively, the user can abandon the workflow at any stage. There is no automatic deployment — every workflow requires explicit human final approval.

---

## 2. Phase State Machine

The pipeline moves through six discrete phases, stored in the `workflows.phase` column:

```
PHASES = ["wizard", "decompose", "select", "orchestrate", "govern", "deployed"]
```

| Phase | Status | Description |
|-------|--------|-------------|
| `wizard` | `draft` | User is filling the intake form |
| `decompose` | `building` → `awaiting_approval` | Decomposition Agent running → output ready for review |
| `select` | `building` → `awaiting_approval` | System Selection Agent running → output ready for review |
| `orchestrate` | `building` → `awaiting_approval` | Orchestration Agent running → output ready for review |
| `govern` | `building` → `awaiting_approval` | Governance Agent running → output ready for review |
| `deployed` | `active` | Workflow is live and monitored |

---

## 3. Handoff Mechanism

Each agent-to-agent handoff follows the same pattern:

1. **Agent N produces output** — structured JSON (nodes, edges, metadata)
2. **Output stored in database** — `workflows.nodes`, `workflows.edges`, `workflows.governanceConfig`
3. **Status set to `awaiting_approval`** — frontend displays the result in the Visual Editor
4. **Human reviews** — inspects, optionally edits, then approves or rejects
5. **On approval** — API calls the next agent, passing the current nodes/edges as input
6. **On rejection** — API re-calls the same agent with the human's feedback string

### Data Passed Between Stages

The handoff data structure is JSON stored in PostgreSQL JSONB columns:

```typescript
interface HandoffData {
  nodes: PrometheanNode[];    // Workflow steps
  edges: PrometheanEdge[];    // Connections between steps
}

interface PrometheanNode {
  id: string;
  type: "custom";
  position: { x: number; y: number };
  data: {
    label: string;            // Step name
    description: string;      // What the step does
    systemLevel?: number;     // L0–L5 (added by Agent 2)
    confidence?: number;      // 0–100 (added by Agent 2)
    rationale?: string;       // Why this level (added by Agent 2)
    tools?: string[];         // Tool bindings (added by Agent 3)
    conditions?: string[];    // Conditions (added by Agent 3)
    errorHandling?: string;   // Error strategy (added by Agent 3)
    status?: string;          // Node status
  };
}

interface PrometheanEdge {
  id: string;
  source: string;             // Source node ID
  target: string;             // Target node ID
  type: string;               // "default", "conditional", "error", "parallel", "loop"
  data?: {
    condition?: string;       // Condition expression
    label?: string;           // Edge label
  };
}
```

### Progressive Enrichment

Each agent adds to the data structure without removing what previous agents produced:

| Stage | What Gets Added |
|-------|-----------------|
| Agent 1 (Decompose) | `nodes[].data.label`, `.description`, edges topology |
| Agent 2 (Select) | `nodes[].data.systemLevel`, `.confidence`, `.rationale`, cost/latency estimates |
| Agent 3 (Orchestrate) | `nodes[].data.tools[]`, `.conditions[]`, `.errorHandling`, refined edge types |
| Agent 4 (Govern) | `governanceConfig{}`, possible governance checkpoint nodes |

---

## 4. Decision Logic — How the System Decides What to Do Next

The pipeline router uses a simple `getNextPhase()` function:

```typescript
const PHASES = ["wizard", "decompose", "select", "orchestrate", "govern", "deployed"];

function getNextPhase(currentPhase: string): string {
  const idx = PHASES.indexOf(currentPhase);
  return PHASES[idx + 1] ?? "deployed";
}
```

When a human approves a phase, the router:
1. Reads the current phase from the request body
2. Computes the next phase
3. Calls the appropriate agent for the next phase
4. Stores the result and sets `status = "awaiting_approval"`

The routing logic in the approve handler:

| Next Phase | Action |
|------------|--------|
| `select` | Run System Selection Agent with current nodes/edges |
| `orchestrate` | Run Orchestration Agent with current nodes/edges |
| `govern` | Run Governance Agent with current nodes/edges |
| `deployed` | Set status to `active`, insert a version snapshot |

---

## 5. Human Intervention Points

### The Four Human-Gate Checkpoints

Each gate operates identically:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Agent Output │────▶│ Human Review │────▶│ Next Action  │
│ (nodes,      │     │              │     │              │
│  edges,      │     │ ┌──────────┐ │     │ ┌──────────┐ │
│  metadata)   │     │ │ APPROVE  │─┼────▶│ │Run next  │ │
│              │     │ └──────────┘ │     │ │agent     │ │
│              │     │ ┌──────────┐ │     │ └──────────┘ │
│              │     │ │ REJECT   │─┼────▶│ ┌──────────┐ │
│              │     │ │+feedback │ │     │ │Re-run    │ │
│              │     │ └──────────┘ │     │ │same agent│ │
│              │     │ ┌──────────┐ │     │ │w/feedback│ │
│              │     │ │ EDIT     │ │     │ └──────────┘ │
│              │     │ │(modify   │ │     │              │
│              │     │ │ nodes/   │ │     │              │
│              │     │ │ edges)   │ │     │              │
│              │     │ └──────────┘ │     │              │
└─────────────┘     └──────────────┘     └─────────────┘
```

### Gate 1: After Decomposition
- **What the human sees:** Workflow substeps as nodes in the Visual Editor
- **What the human can do:** Merge, split, reorder, add, or remove steps; edit labels and descriptions
- **Effect of edits:** Modified nodes/edges are passed to the System Selection Agent

### Gate 2: After System Selection
- **What the human sees:** Color-coded L0–L5 nodes with confidence badges and rationale
- **What the human can do:** Override classification levels, adjust step descriptions, review confidence scores
- **Effect of edits:** Modified annotations are passed to the Orchestration Agent

### Gate 3: After Orchestration
- **What the human sees:** Enriched workflow with tool bindings, edge conditions, and error paths
- **What the human can do:** Change tool bindings, modify edge conditions, add/remove error handling paths
- **Effect of edits:** Modified workflow is passed to the Governance Agent

### Gate 4: After Governance
- **What the human sees:** Governance configuration with thresholds, alert channels, and logging levels
- **What the human can do:** Adjust thresholds, change alert channels, modify logging levels
- **Effect of approval:** Workflow is deployed (status = "active"), version snapshot is saved

---

## 6. Error Handling and Retry Logic

### Agent-Level Errors
If an agent call fails (e.g., LLM returns invalid JSON, network error, empty response):
- The API returns an error response to the frontend
- The workflow remains in its current phase and status
- The human can retry the same operation
- Express error middleware handles unhandled exceptions

### Rejection as Retry
The rejection mechanism serves as the primary retry path:
- Human provides feedback explaining what was wrong
- The same agent is re-called with the feedback appended to the prompt
- The agent's system prompt includes instructions to improve based on feedback
- There is no hard limit on rejections (the human can reject and re-generate as many times as needed)

### LLM Response Validation
- All agent responses are parsed with `JSON.parse()` — invalid JSON throws an error
- Missing response content throws `"No response from [agent name]"`
- Missing node positions are filled with defaults (grid layout)
- Missing edge types default to `"default"`
- Missing governance config fields are filled with sensible defaults

### Default Governance Config (Fallback)
```typescript
const defaultConfig: GovernanceConfig = {
  loggingLevel: "standard",
  autoSnapshot: true,
  latencyThreshold: 30000,      // 30 seconds
  costThreshold: 0.5,            // $0.50
  errorRateThreshold: 0.05,      // 5%
  alertChannels: ["slack"],
  costLimitPerRun: 2.0,          // $2.00
  executionTimeoutMs: 300000,    // 5 minutes
};
```

---

## 7. Sequence Diagram — Full Pipeline Execution

```
User        Frontend       API Server     Decomp.Agent   Select.Agent   Orch.Agent   Gov.Agent    Database
 │              │               │               │              │             │            │           │
 │  Fill Wizard │               │               │              │             │            │           │
 │─────────────▶│               │               │              │             │            │           │
 │              │ POST /start   │               │              │             │            │           │
 │              │──────────────▶│               │              │             │            │           │
 │              │               │ UPDATE phase= │              │             │            │           │
 │              │               │ "decompose"   │              │             │            │           │
 │              │               │──────────────────────────────────────────────────────────────────▶│
 │              │               │               │              │             │            │           │
 │              │               │ runDecomp()   │              │             │            │           │
 │              │               │──────────────▶│              │             │            │           │
 │              │               │               │ GPT-5.2 call │             │            │           │
 │              │               │               │─────────┐    │             │            │           │
 │              │               │               │         │    │             │            │           │
 │              │               │               │◀────────┘    │             │            │           │
 │              │               │◀──────────────│              │             │            │           │
 │              │               │ {nodes, edges}│              │             │            │           │
 │              │               │               │              │             │            │           │
 │              │               │ STORE nodes,edges; status="awaiting_approval"          │           │
 │              │               │──────────────────────────────────────────────────────────────────▶│
 │              │◀──────────────│               │              │             │            │           │
 │              │ {phase:"decompose",           │              │             │            │           │
 │              │  status:"awaiting_approval"}  │              │             │            │           │
 │◀─────────────│               │               │              │             │            │           │
 │              │               │               │              │             │            │           │
 │  REVIEW      │               │               │              │             │            │           │
 │  (approve)   │               │               │              │             │            │           │
 │─────────────▶│               │               │              │             │            │           │
 │              │ POST /approve │               │              │             │            │           │
 │              │ {phase:       │               │              │             │            │           │
 │              │  "decompose"} │               │              │             │            │           │
 │              │──────────────▶│               │              │             │            │           │
 │              │               │ runSelect()   │              │             │            │           │
 │              │               │──────────────────────────────▶│             │            │           │
 │              │               │               │              │ GPT-5.2     │            │           │
 │              │               │               │              │────────┐    │            │           │
 │              │               │               │              │        │    │            │           │
 │              │               │               │              │◀───────┘    │            │           │
 │              │               │◀─────────────────────────────│             │            │           │
 │              │               │ {nodes+levels, cost, latency}│             │            │           │
 │              │               │               │              │             │            │           │
 │              │               │ STORE; status="awaiting_approval"          │            │           │
 │              │               │──────────────────────────────────────────────────────────────────▶│
 │              │◀──────────────│               │              │             │            │           │
 │◀─────────────│               │               │              │             │            │           │
 │              │               │               │              │             │            │           │
 │  REVIEW      │               │               │              │             │            │           │
 │  (approve)   │               │               │              │             │            │           │
 │─────────────▶│ POST /approve │               │              │             │            │           │
 │              │──────────────▶│               │              │             │            │           │
 │              │               │ runOrchestration()            │             │            │           │
 │              │               │──────────────────────────────────────────▶│            │           │
 │              │               │               │              │             │ GPT-5.2   │           │
 │              │               │               │              │             │───────┐   │           │
 │              │               │               │              │             │       │   │           │
 │              │               │               │              │             │◀──────┘   │           │
 │              │               │◀─────────────────────────────────────────│            │           │
 │              │               │ {nodes+tools, refined edges}  │            │           │
 │              │               │ STORE; status="awaiting_approval"         │            │           │
 │              │               │──────────────────────────────────────────────────────────────────▶│
 │              │◀──────────────│               │              │             │            │           │
 │◀─────────────│               │               │              │             │            │           │
 │              │               │               │              │             │            │           │
 │  REVIEW      │               │               │              │             │            │           │
 │  (approve)   │               │              │              │             │            │           │
 │─────────────▶│ POST /approve │               │              │             │            │           │
 │              │──────────────▶│               │              │             │            │           │
 │              │               │ runGovernance()│              │             │            │           │
 │              │               │──────────────────────────────────────────────────────▶│           │
 │              │               │               │              │             │            │ GPT-5.2  │
 │              │               │               │              │             │            │──────┐   │
 │              │               │               │              │             │            │      │   │
 │              │               │               │              │             │            │◀─────┘   │
 │              │               │◀─────────────────────────────────────────────────────│           │
 │              │               │ {govConfig, nodes, edges}    │             │            │           │
 │              │               │ STORE; status="awaiting_approval"                      │           │
 │              │               │──────────────────────────────────────────────────────────────────▶│
 │              │◀──────────────│               │              │             │            │           │
 │◀─────────────│               │               │              │             │            │           │
 │              │               │               │              │             │            │           │
 │  FINAL       │               │               │              │             │            │           │
 │  APPROVE     │               │               │              │             │            │           │
 │─────────────▶│ POST /approve │               │              │             │            │           │
 │              │ {phase:       │               │              │             │            │           │
 │              │  "govern"}    │               │              │             │            │           │
 │              │──────────────▶│               │              │             │            │           │
 │              │               │ phase="deployed", status="active"          │            │           │
 │              │               │ INSERT workflow_versions (snapshot)         │            │           │
 │              │               │──────────────────────────────────────────────────────────────────▶│
 │              │◀──────────────│               │              │             │            │           │
 │◀─────────────│ DEPLOYED!     │               │              │             │            │           │
 │              │               │               │              │             │            │           │
```

---

## 8. Rejection Flow (Feedback Loop)

```
User        Frontend       API Server     Agent (same phase)   Database
 │              │               │               │                  │
 │  REJECT      │               │               │                  │
 │  + feedback  │               │               │                  │
 │─────────────▶│               │               │                  │
 │              │ POST /reject  │               │                  │
 │              │ {phase,       │               │                  │
 │              │  feedback}    │               │                  │
 │              │──────────────▶│               │                  │
 │              │               │ Re-run agent  │                  │
 │              │               │ with feedback │                  │
 │              │               │──────────────▶│                  │
 │              │               │               │ GPT-5.2 call     │
 │              │               │               │ (includes:       │
 │              │               │               │ "Previous result │
 │              │               │               │  was rejected.   │
 │              │               │               │  Feedback: ...")  │
 │              │               │               │──────┐           │
 │              │               │               │      │           │
 │              │               │               │◀─────┘           │
 │              │               │◀──────────────│                  │
 │              │               │ Updated result│                  │
 │              │               │               │                  │
 │              │               │ STORE; status="awaiting_approval"│
 │              │               │─────────────────────────────────▶│
 │              │◀──────────────│               │                  │
 │◀─────────────│ New result    │               │                  │
 │  for review  │               │               │                  │
```

---

## 9. Version Snapshotting

When the final governance phase is approved and the workflow transitions to `deployed`:

1. The current workflow definition (nodes, edges, governance config) is serialized as JSON
2. A record is inserted into `workflow_versions` with:
   - `workflowId` — reference to the parent workflow
   - `version` — the workflow's current version string
   - `definition` — full JSONB snapshot of the workflow state
   - `changelog` — "Initial deployment" for the first version
3. This creates an immutable record of the deployed workflow state

This versioning enables future diff comparison, rollback, and audit trail capabilities.
