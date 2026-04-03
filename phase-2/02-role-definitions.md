# PROMETHEAN — Agent Role Definitions

### Phase 2 Deliverable | Track A: Technical Build
### April 2026

---

## Overview

Promethean employs four specialized AI agents arranged in a sequential pipeline, plus a non-agent Human Review Interface. Each agent has a distinct responsibility, bounded authority, and well-defined inputs and outputs. This document specifies each component in detail, drawing from the actual codebase implementation.

---

## Agent 1: Workflow Decomposition Agent

### Purpose
Convert a user's natural-language workflow description into discrete, atomic substeps that can be individually classified on the L0–L5 automation spectrum. This is the entry point for all Promethean analysis.

### Task Boundary
Operates ONLY on workflow decomposition. Does not classify substeps, select system types, assemble architectures, or attach governance. Its sole output is a structured task graph of nodes and edges.

### Inputs
| Input | Source | Format |
|-------|--------|--------|
| Workflow description | User (via Wizard form) | Natural language string |
| Domain | User (optional) | String (e.g., "CRM", "Cybersecurity") |
| Constraints | User (optional) | JSON object (budget, latency, risk tolerance) |
| Feedback | Human reviewer (on rejection) | Natural language string |

### Outputs
| Output | Format | Description |
|--------|--------|-------------|
| `nodes[]` | Array of PrometheanNode | 5–15 discrete workflow steps with labels, descriptions, and positions |
| `edges[]` | Array of PrometheanEdge | Directional connections between nodes showing flow |
| `summary` | String | Brief summary of the overall workflow structure |

### Tools Used
| Tool | Purpose |
|------|---------|
| OpenAI GPT-5.2 API | LLM reasoning for decomposition |
| JSON structured output mode | Ensures valid, parseable output |
| Pino logger | Structured logging of agent execution |

### Autonomy Level
**Bounded autonomous within decomposition scope.** The agent freely decides how to break down a workflow but all outputs are presented for human review before advancing to the next stage.

### What It May Do
- Break workflows into 5–15 discrete steps
- Identify trigger nodes and end/result nodes
- Create sequential and parallel flow edges
- Assign logical positions for visual layout (200px spacing)
- Re-generate output when given rejection feedback

### What It May NOT Do
- Classify substeps on the L0–L5 spectrum
- Select system types or tools for steps
- Assemble workflow architectures
- Attach governance or monitoring
- Create more than 50 substeps (hard limit)
- Override human feedback

### Success Criteria
- Decomposition produces 5–15 meaningful, atomic substeps
- Each step has a clear, action-oriented label (verb + noun)
- Dependencies between steps are logically correct
- No orphaned nodes or circular dependencies
- Processing time < 60 seconds
- Decomposition accuracy ≥ 80% agreement with human expert judgment

---

## Agent 2: System Selection Agent

### Purpose
Classify each workflow substep on the Promethean 6-level automation spectrum (L0–L5), determining the least complex viable system type for each step. The core thesis: always start at L0 and justify every level increase.

### Task Boundary
Operates ONLY on classification. Does not decompose workflows, assemble architectures, or configure governance. Receives a task graph and annotates each node with a system level.

### Inputs
| Input | Source | Format |
|-------|--------|--------|
| `nodes[]` | Decomposition Agent output | Array of PrometheanNode |
| `edges[]` | Decomposition Agent output | Array of PrometheanEdge |
| Workflow description | Original user input | String |
| Constraints | User (optional) | JSON object |
| Feedback | Human reviewer (on rejection) | Natural language string |

### Outputs
| Output | Format | Description |
|--------|--------|-------------|
| `nodes[]` | Annotated PrometheanNode[] | Each node gains `systemLevel` (0–5), `confidence` (0–100), and `rationale` |
| `edges[]` | PrometheanEdge[] | Preserved from input |
| `summary` | String | Overall system composition summary |
| `systemTypeSummary` | Record<string, number> | Count of nodes at each level (e.g., {"L0": 3, "L1": 2}) |
| `estimatedCostPerRun` | Number | Estimated cost in USD per workflow execution |
| `estimatedLatencyMs` | Number | Estimated total latency in milliseconds |

### Tools Used
| Tool | Purpose |
|------|---------|
| OpenAI GPT-5.2 API | Multi-path reasoning for classification |
| L0–L5 Classification Rubric | Embedded in system prompt as decision framework |
| JSON structured output mode | Ensures valid output |

### L0–L5 Classification Rubric
| Level | Archetype | When to Use |
|-------|-----------|-------------|
| L0 | Deterministic Automation | Rule-based, 100% predictable, zero AI |
| L1 | Supervised ML | Classification/regression, >95% accuracy, narrow domain |
| L2 | Language Understanding | NLP/NLU for intent/entity/sentiment — understands but doesn't generate |
| L3 | Single LLM Agent | One GPT call for generation, summarization, reasoning |
| L4 | Tool-Augmented Agent | LLM + tool calls (search, APIs, code execution) |
| L5 | Multi-Agent Orchestration | Multiple specialized agents collaborating |

### Autonomy Level
**Bounded autonomous within classification scope.** The system prompt instructs the agent to consider multiple classification candidates per step before selecting the best one. All classifications are presented for human review. Low-confidence classifications (<60%) are explicitly flagged.

### What It May Do
- Classify each step on the L0–L5 spectrum with confidence scores
- Provide detailed rationale for each classification
- Estimate cost and latency for the overall workflow
- Generate a system type distribution summary
- Re-classify when given rejection feedback

### What It May NOT Do
- Modify the workflow structure (nodes/edges topology)
- Default to higher levels without justification
- Skip the "start at L0" principle
- Override human feedback on classifications
- Classify a step at L4/L5 without genuine task requirements

### Success Criteria
- Classification accuracy ≥ 75% vs. human expert judgment
- Right-sizing: at least 30% of substeps classified lower than a naive "agent everywhere" approach
- Zero unwarranted L4/L5 classifications
- Processing time < 15 seconds per substep
- Confidence calibration: 90% confident → correct 85–95% of the time

---

## Agent 3: Orchestration & Scaffolding Agent

### Purpose
Enrich the classified workflow with tool bindings, refined edge conditions, error handling, retry logic, and parallel execution opportunities. Transforms the annotated task graph into an executable workflow specification.

### Task Boundary
Operates on workflow enrichment and scaffold generation. Does not decompose, classify, or apply governance. Receives an annotated task graph and produces an executable workflow definition.

### Inputs
| Input | Source | Format |
|-------|--------|--------|
| `nodes[]` | System Selection Agent output | Annotated PrometheanNode[] with system levels |
| `edges[]` | System Selection Agent output | PrometheanEdge[] |
| Workflow description | Original user input | String |
| Constraints | User (optional) | JSON object |
| Feedback | Human reviewer (on rejection) | Natural language string |

### Outputs
| Output | Format | Description |
|--------|--------|-------------|
| `nodes[]` | Enriched PrometheanNode[] | Each node gains `tools[]`, `conditions[]`, `errorHandling` |
| `edges[]` | Refined PrometheanEdge[] | Edges gain types (conditional, error, parallel, loop) and conditions |
| `summary` | String | Orchestration summary |

### Tool Binding Strategy by System Level
| Level | Recommended Tools |
|-------|-------------------|
| L0 | zod, regex, PostgreSQL queries, validation libraries |
| L1 | sklearn, TensorFlow Lite, OpenCV |
| L2 | spaCy, Hugging Face transformers |
| L3 | openai.chat, anthropic.messages |
| L4 | openai + function_tools, search APIs, code execution |
| L5 | AgentKit, LangGraph, AutoGen, CrewAI |

### Edge Types
| Type | Description |
|------|-------------|
| `default` | Normal sequential flow |
| `conditional` | Taken only when a condition is true |
| `error` | Error/exception handling path |
| `parallel` | Parallel branch start |
| `loop` | Loop-back edge for retry/iteration |

### Autonomy Level
**Bounded autonomous within orchestration scope.** Can freely arrange, optimize, and scaffold. All outputs presented for human review in the visual editor before governance attachment.

### What It May Do
- Bind specific tools to each step based on system level
- Refine edges with conditions and error paths
- Identify parallel execution opportunities
- Add retry logic and fallback paths
- Define input/output contracts between steps
- Suggest workflow optimizations

### What It May NOT Do
- Override system selection decisions (no upgrading L1 to L4)
- Bind tools not available in the registry
- Create circular dependencies without explicit termination
- Modify the fundamental workflow structure
- Skip error handling for any step

### Success Criteria
- 100% of generated workflows pass schema validation
- Assembly time < 45 seconds for workflows ≤ 20 substeps
- Zero circular dependencies without termination conditions
- Human approval rate ≥ 80% without major structural edits
- Every step has appropriate tool bindings for its system level

---

## Agent 4: Governance & Drift Monitor

### Purpose
Configure governance, observability, and drift detection for the workflow based on its risk profile. Attaches monitoring thresholds, alert channels, and logging configuration.

### Task Boundary
Operates on governance configuration and monitoring. Does not decompose, classify, or assemble workflows. Receives an orchestrated workflow and produces a governance overlay.

### Inputs
| Input | Source | Format |
|-------|--------|--------|
| `nodes[]` | Orchestration Agent output | Enriched PrometheanNode[] |
| `edges[]` | Orchestration Agent output | Refined PrometheanEdge[] |
| Workflow description | Original user input | String |
| Constraints/Budget | User (optional) | JSON object |
| Feedback | Human reviewer (on rejection) | Natural language string |

### Outputs
| Output | Format | Description |
|--------|--------|-------------|
| `nodes[]` | PrometheanNode[] | May add governance-specific nodes (checkpoints, gates) |
| `edges[]` | PrometheanEdge[] | Updated edges if new nodes added |
| `governanceConfig` | GovernanceConfig object | Full governance configuration |
| `summary` | String | Governance configuration summary |

### GovernanceConfig Fields
| Field | Type | Description |
|-------|------|-------------|
| `loggingLevel` | "minimal" / "standard" / "verbose" / "debug" | Logging verbosity |
| `autoSnapshot` | boolean | Whether to snapshot state at each step |
| `latencyThreshold` | number (ms) | Alert if single run exceeds this |
| `costThreshold` | number ($) | Alert if single run exceeds this |
| `errorRateThreshold` | number (0–1) | Alert if error rate exceeds this |
| `alertChannels` | string[] | ["slack", "email", "pagerduty", "webhook"] |
| `costLimitPerRun` | number ($) | Hard limit to abort run |
| `executionTimeoutMs` | number (ms) | Maximum allowed run time |

### Autonomy Level
**Semi-autonomous.** Governance configuration is proposed autonomously based on risk analysis. Alert generation (post-deployment) is autonomous. Any corrective action requires human approval.

### What It May Do
- Analyze automation levels to determine risk profile
- Set logging levels appropriate to domain sensitivity
- Configure alert thresholds based on cost, latency, and error rates
- Select appropriate alert channels
- Add governance checkpoint nodes to the workflow
- Suggest governance improvements

### What It May NOT Do
- Modify workflow behavior without human approval
- Suppress or hide alerts that meet threshold criteria
- Delete or modify execution logs (append-only principle)
- Override human-set governance preferences
- Disable monitoring for any step

### Success Criteria
- 100% of workflow steps have logging attached
- Alert precision ≥ 80% (alerts that are actionable)
- Version snapshots captured at every significant modification
- False positive rate < 20% of total alerts
- Governance configuration appropriate to domain risk

---

## Non-Agent Component: Human Review Interface

### Purpose
Present each agent's output to the human reviewer with full rationale, allowing inspection, editing, approval, or rejection at every stage of the pipeline.

### Capabilities
| Feature | Description |
|---------|-------------|
| Visual Editor | React Flow canvas with color-coded L0–L5 nodes, tool tags, and confidence badges |
| Phase Tracker | Top bar showing current pipeline position (decompose → select → orchestrate → govern → deployed) |
| Approve Button | Advances the pipeline to the next agent stage |
| Reject Button | Sends the current phase back to the same agent with feedback |
| Edit Controls | Human can modify nodes, edges, and configurations before approving |
| Alert Feed | Live feed of governance alerts with ACK/RESOLVE controls |

### Human Review Points
| Checkpoint | What the Human Reviews |
|------------|------------------------|
| After Decomposition | Substep structure — merge, split, reorder, add, remove steps |
| After System Selection | L0–L5 classifications — override routing decisions, adjust confidence |
| After Orchestration | Proposed workflow graph — edit connections, tools, error handling |
| After Governance | Alert thresholds, monitoring configuration, logging levels |
| Post-Deployment | Respond to drift alerts, approve corrective actions |

### Design Philosophy
The Human Review Interface embodies Promethean's core principle that **AI recommends, humans decide**. Every agent output is a proposal, not a decision. The system ensures that no workflow reaches deployment without explicit human approval at each stage.
