# PROMETHEAN — Complete Project Bible & Implementation Guide

### A Right-Sized Agentic Systems Studio
### Version 2.0 — April 2026

---

> **"What is the smallest sufficient form of intelligence and coordination needed for this workflow, and how do we keep it observable, governable, and improvable over time?"**

---

## Table of Contents

1. [Executive Vision & Project Summary](#1-executive-vision--project-summary)
2. [Theoretical Foundations — Course Framework Integration](#2-theoretical-foundations--course-framework-integration)
3. [Archetype Triage Canvas — Applied to Promethean](#3-archetype-triage-canvas--applied-to-promethean)
4. [Multi-Agent System Canvas — Promethean's Four Agents](#4-multi-agent-system-canvas--prometheans-four-agents)
5. [Agent System Specification Canvases](#5-agent-system-specification-canvases)
6. [Agent Architecture Canvases](#6-agent-architecture-canvases)
7. [Multi-Agent System Specification Canvas](#7-multi-agent-system-specification-canvas)
8. [Multi-Agent Architecture Canvas](#8-multi-agent-architecture-canvas)
9. [Technology Stack — Full Research & Justification](#9-technology-stack--full-research--justification)
10. [System Architecture — Complete Technical Design](#10-system-architecture--complete-technical-design)
11. [Visual Workflow Editor — Design & Implementation](#11-visual-workflow-editor--design--implementation)
12. [Memory Architecture — Design & Implementation](#12-memory-architecture--design--implementation)
13. [Tool Integration & MCP/A2A Protocol Layer](#13-tool-integration--mcpa2a-protocol-layer)
14. [API Design — External & Internal](#14-api-design--external--internal)
15. [Event-Driven Triggers — Cron, Webhooks, Events](#15-event-driven-triggers--cron-webhooks-events)
16. [Observability, Logging & Drift Detection](#16-observability-logging--drift-detection)
17. [Dashboard & Visualization — Sci-Fi Command Center](#17-dashboard--visualization--sci-fi-command-center)
18. [Workflow Serialization, Templates & Export](#18-workflow-serialization-templates--export)
19. [Human-in-the-Loop Design & Governance](#19-human-in-the-loop-design--governance)
20. [Progressive Web App (PWA) Architecture](#20-progressive-web-app-pwa-architecture)
21. [Database Schema & Data Model](#21-database-schema--data-model)
22. [User Experience — Full Walkthrough](#22-user-experience--full-walkthrough)
23. [Deployment on Replit — Complete Guide](#23-deployment-on-replit--complete-guide)
24. [Development Workflow — Codex + Replit Agent](#24-development-workflow--codex--replit-agent)
25. [Implementation Roadmap — Phased Build Plan](#25-implementation-roadmap--phased-build-plan)
26. [Evaluation Framework & Success Criteria](#26-evaluation-framework--success-criteria)
27. [Risk Register & Mitigation Strategies](#27-risk-register--mitigation-strategies)
28. [References & Links](#28-references--links)

---

# 1. Executive Vision & Project Summary

## 1.1 What Promethean Is

Promethean is a **workflow analysis and orchestration studio** that determines the right level of automation for each part of a task, then scaffolds and monitors that workflow with governance and human oversight. It is delivered as a Progressive Web App (PWA) built with React, hosted on Replit, and powered by GPT-5.4-mini as the default model.

The core thesis is that organizations are increasingly tempted to apply "agentic AI" to every workflow, even when many tasks would be better solved with deterministic logic, structured rules, or a single tool-using model. This creates avoidable cost, latency, brittleness, weak observability, and governance risk. At the same time, some workflows truly do require branching, evidence gathering, reflection, tool use, handoffs, or human approval.

Promethean addresses this gap by:

1. Accepting a workflow description from a human user
2. Decomposing it into substeps via the Workflow Decomposition Agent
3. Classifying each substep by the level of system sophistication required via the System Selection Agent
4. Assembling a proposed workflow architecture via the Orchestration and Scaffolding Agent
5. Attaching governance controls, logging, drift indicators, and version history via the Governance and Drift Monitor
6. Presenting everything through a visual node-based editor where humans can inspect, modify, approve, and deploy

## 1.2 The Automation Spectrum

Drawing directly from the course framework (L3: Large Language Models to Agentic AI), Promethean classifies every workflow substep along a six-level spectrum of increasing autonomy:

| Level | Archetype | Description | When to Use |
|-------|-----------|-------------|-------------|
| L0 | **Deterministic Automation** | Rule-based, fixed logic, no model | Known inputs, known outputs, no ambiguity |
| L1 | **LLM Application** | Model-powered content generation | Text transformation, summarization, classification |
| L2 | **Assistant** | Human-directed interactive support | Q&A, guided exploration, chat interface |
| L3 | **Agentic Workflow** | Orchestrated multi-step execution | Pipeline with tools, retrieval, structured flow |
| L4 | **Single Agent** | Goal-directed adaptive system with tools | Adaptive reasoning, tool use, self-verification |
| L5 | **Multi-Agent System** | Coordination across specialized agents | Task decomposition, parallel specialization, debate |

The key insight from Prof. Rao's framework: **"The goal is fit, not sophistication. The best design is the simplest architecture that reliably meets the task."** Promethean operationalizes this principle by always starting at L0 and moving right only when the task genuinely demands it.

## 1.3 Target Users & Stakeholders

**Primary Users:** AI builders, technical consultants, product teams, and operations teams who want to automate workflows but are unsure whether a task should be handled by deterministic software, a single model, or a multi-agent system.

**Secondary Stakeholders:**
- Team leads responsible for reliability, governance, and cost
- Internal reviewers who need logs, traces, and approval checkpoints
- Organizations that want reusable workflow templates across accounts or business units

**Initial Demonstration Context:** A bounded enterprise-style workflow such as a CRM/cybersecurity support flow, compliance-style review flow, or another structured business process where the system can classify subproblems and route them to the correct type of automation.

## 1.4 Why This Is an Agentic Problem

This project is agentic because the core challenge is not a single prediction or single response. It involves:

1. **Task decomposition** — the system must interpret a user workflow and break it into meaningful subproblems
2. **Adaptive routing** — different subproblems should be assigned to different system types based on complexity, ambiguity, risk, and required autonomy
3. **Tool use and coordination** — some substeps may require retrieval, classification, rule execution, sandboxed tool calls, or multi-step planning
4. **Governance-aware decision making** — the system must know when to escalate to a human, when to preserve old versions, and when a process is drifting
5. **Cross-step optimization** — the system should question whether parts of the workflow should exist at all, whether steps can be simplified, and whether a simpler architecture would outperform a more agentic one

A purely deterministic program would be too rigid for workflow interpretation and adaptive routing. A single general-purpose agent would risk over-centralizing decisions, reducing interpretability, and overusing expensive reasoning where simpler methods suffice. A structured multi-component architecture is therefore justified.

---

# 2. Theoretical Foundations — Course Framework Integration

This section maps every relevant course concept to Promethean's design, ensuring the project is grounded in the full L1–L6 curriculum.

## 2.1 From ABM to Modern AI Agents (L1)

The five eras of agent-based modeling (L1) provide historical context for Promethean's architecture:

- **Era 1.0 (Symbolic AI):** Promethean's deterministic routing rules and rule engines draw from expert system traditions
- **Era 2.0 (Multi-Agent & Distributed AI):** The multi-agent coordination patterns (role-based, debate-based, voting) inform how Promethean's four agents interact
- **Era 3.0 (Adaptive Agents & Complex Systems):** Emergence and feedback loops appear in Promethean's drift detection — workflow behavior may evolve in unexpected ways
- **Era 4.0 (Reinforcement Learning):** Future Promethean phases could use RL to optimize routing decisions based on execution feedback
- **Era 5.0 (Agentic AI):** Promethean itself is a product of this era — LLM-powered agents with memory, tool use, and orchestration

## 2.2 Emergent vs. Programmed Behavior (L2)

Promethean bridges both paradigms:

- **Programmed behavior:** Deterministic routing rules, structured workflow schemas, explicit governance policies, cron-based triggers, and the visual node editor all represent explicitly programmed, top-down behavior
- **Emergent behavior:** When workflows execute at scale, patterns emerge — certain routing decisions prove more effective, drift indicators reveal unexpected correlations, and user modification patterns suggest better defaults

The integrative and differential understanding challenges from L2 apply directly: given individual agent behaviors (decomposition, selection, orchestration, governance), what aggregate patterns emerge in workflow quality? And given observed workflow drift, what underlying agent decisions might explain it?

## 2.3 LLMs to Agentic AI Spectrum (L3)

The L3 spectrum (Automations → LLM Apps → Assistants → Agentic Workflows → AI Agents → Multi-Agent Systems) is the intellectual core of Promethean. The System Selection Agent uses this spectrum as its classification rubric.

**Key L3 concepts applied to Promethean:**

- **Perceive-Think-Act Cycle:** Each Promethean agent loops until its subtask is complete, not just responding once
- **System-Theoretic Framework (5 Subsystems):**
  - I. Perception & Grounding → User workflow input parsing, context extraction
  - II. Reasoning & Planning → Decomposition logic, routing decisions, orchestration planning
  - III. Action Execution & Tool Use → MCP tool calls, API integrations, sandboxed execution
  - IV. Learning & Adaptation → Memory systems, execution history, template refinement
  - V. Inter-Agent Communication → The four agents coordinate via structured handoffs
- **Reasoning Shapes Agent Behavior:** Promethean uses multi-path reasoning in the System Selection Agent (generating multiple routing alternatives before selecting)

## 2.4 Designing Single Agent Systems (L4)

L4 provides the design methodology for each of Promethean's individual agents. The key artifacts:

**Agent-Readiness Checks (5 checks per agent):**
1. Clear Goal — one accountable outcome
2. Known Interfaces — defined inputs and outputs
3. Bounded Actions — limited authority (what the agent MAY and MAY NOT do)
4. Testable Success — measurable outcomes independent of agent intent
5. Visible Escalation — clear exception handling and human handoff

**Agent System Specification Canvas (10 fields):** Purpose, task boundary, users/stakeholders, inputs/outputs, operating rules, autonomy level, tool permissions, memory policy, human checkpoints, success criteria

**Agent Architecture Canvas:** Model choice, orchestration logic, grounding approach, tool integration, memory design, planning/reflection mechanisms, control boundaries, key trade-offs

**Design Patterns from L4:**
- Prompt Chaining → sequential decomposition steps
- Routing → system selection branching logic
- Parallelization → independent substep analysis
- Orchestrator-Workers → the Orchestration Agent delegates to sub-workflows
- Evaluator-Optimizer → drift monitor evaluates and suggests improvements
- Augmented LLM → every agent enhanced with tools, retrieval, memory

## 2.5 Memory and Tools (L5)

L5's memory taxonomy directly shapes Promethean's state management:

**Memory as State Surface (distinct from RAG, context engineering, LLM memory):**
- Agent memory carries facts, experience, and continuity across tasks
- RAG grounds the current task in external knowledge
- Context engineering manages the working window
- LLM memory expands internal retention

**Three Structural Forms:**
- Token-level memory (explicit, governable) → Promethean's workflow definitions, execution logs
- Parametric memory (internalized in weights) → model capabilities
- Latent memory (continuous, efficient) → vector embeddings of past executions

**Functional Triad:**
- Factual memory (what the agent knows) → semantic memory in ChromaDB
- Experiential memory (how the agent improves) → episodic memory of past workflow executions
- Working memory (what the agent is thinking about now) → session state in Upstash Redis

**Memory Lifecycle:**
- Formation → selective encoding of workflow execution observations
- Evolution → consolidation, updating, conflict resolution, forgetting
- Retrieval → task-aware querying of relevant past experience

**Tool Learning Pipeline (L5):**
- Task Planning → break user request into sub-tasks
- Tool Selection → choose appropriate MCP tools
- Tool Calling → invoke with parameters
- Response Generation → synthesize tool outputs with internal reasoning

**MCP Interoperability:** Host-client-server pattern with capability discovery, tool/resource/prompt exposure, and cross-system composition.

## 2.6 Multi-Agent Systems (L6)

L6 provides the coordination framework for Promethean's four-agent architecture:

**Key L6 concepts applied:**

- **BDI (Belief-Desire-Intention):** Each agent maintains beliefs about the current workflow state, desires aligned with its purpose, and intentions that commit it to specific plans
- **Theory of Mind:** The System Selection Agent models what the Orchestration Agent will need — it reasons about downstream requirements when making routing decisions
- **Coordination Patterns:**
  - **Role-Based Cooperation** (primary) — each agent has a defined role in a sequential pipeline
  - **Debate-Based** (secondary) — for ambiguous routing decisions, agents can present competing proposals
  - **Voting** (governance layer) — when multiple valid architectures exist, the system presents options for human selection

**Multi-Agent Design Patterns:**
- Supervisor pattern → Orchestration Agent coordinates the pipeline
- Sequential handoff → Decomposition → Selection → Orchestration → Governance
- Human-in-the-loop gates → approval checkpoints between each major phase

**From Design to Deployment:**
- Frameworks implement coordination and control flow (LangGraph)
- SDKs provide model capabilities and integration layers (OpenAI API)
- Protocols enable communication across agents (MCP, A2A)

---

# 3. Archetype Triage Canvas — Applied to Promethean

Following the L4 Archetype Triage Canvas template exactly:

## Section A — Framing: Grounding the Need

**Use Case / Problem:**
Organizations deploying AI automation face a persistent meta-problem: they don't know which level of automation each workflow substep actually requires. This leads to either over-engineering (full agentic stacks for simple tasks) or under-engineering (rigid automation for tasks needing adaptive reasoning). Promethean provides a workflow analysis and orchestration studio that decomposes workflows, recommends the least complex viable architecture for each substep, and monitors deployed workflows for drift.

**User / Stakeholders:**

| Role | Description |
|------|-------------|
| REQUESTER | AI builder, consultant, or ops team member who submits a workflow for analysis |
| REVIEWER | Team lead or architect who approves the proposed architecture before deployment |
| DOWNSTREAM | Engineering team that implements the approved workflow; end users who interact with deployed workflows |

**Desired Outcome:**

| Dimension | Target |
|-----------|--------|
| OUTPUT | Proposed workflow architecture mapping each substep to its least complex viable system type, with rationale, governance controls, and approval points |
| SPEED | Initial decomposition and recommendation within 2-5 minutes for bounded workflows |
| QUALITY | Verifiable reasoning, explicit uncertainty, human-approved before execution |

## Section B — Complexity & Control Analysis

| Question | Answer | Explanation |
|----------|--------|-------------|
| Fixed and Predictable? | **NO** | Each workflow is different — different domains, different substeps, different risk profiles |
| Single Turn Enough? | **NO** | Requires multi-step decomposition, classification, orchestration assembly, and governance attachment |
| Sequence Known? | **PARTLY** | The high-level phases are known (decompose → classify → orchestrate → govern), but within each phase, the agent must make adaptive decisions |
| External Action Needed? | **YES** | Must search templates, retrieve reference architectures, call classification models, access tool registries |
| One Actor Enough? | **NO** | Decomposition, system selection, orchestration, and governance are distinct reasoning problems requiring different expertise and different failure modes |
| Coordination Needed? | **YES** | The four agents must pass structured outputs, maintain shared context, and coordinate handoffs |
| High Oversight Needed? | **YES** | Architecture recommendations carry real deployment consequences — human approval is mandatory before execution |
| Wrong-Action Cost High? | **MEDIUM-HIGH** | A miscategorized substep could lead to over-spending (agentic where deterministic suffices) or under-reliability (deterministic where agency is needed) |

## Section C — Least Sufficient Architecture

```
Automation/   LLM App   Assistant   Single    ✅ Multi-Agent   Societal
Workflow                             Agent       System        System
```

**WHY NOT LESS:** The task requires four distinct reasoning problems (decomposition, classification, orchestration, governance) with different inputs, different expertise, and different failure modes. A single agent would conflate these concerns, reducing auditability and making failure analysis harder.

**WHY NOT MORE:** Four bounded agents with structured handoffs are sufficient. No emergent coordination, societal simulation, or unbounded agent-to-agent negotiation is needed.

**KEY FACTOR:** The combination of multi-step adaptive reasoning + tool use + four distinct expertise domains + governance requirements + human oversight pushes beyond single-agent, but the structured pipeline with clear handoffs keeps complexity manageable.

**NEXT STEP:** Multi-Agent System Specification Canvas → Multi-Agent Architecture Canvas → Implementation

---

# 4. Multi-Agent System Canvas — Promethean's Four Agents

Following the L6 Multi-Agent System Canvas template:

## 1) System Purpose
Help a user determine the right level of automation for a workflow, then scaffold a monitored workflow that is explainable, efficient, and reviewable.

## 2) User Need
Users need a way to avoid building overly complex agentic systems when simpler methods would work, while still enabling true multi-step or multi-agent behavior when required.

## 3) Core Input
A workflow description, task request, or process outline from a human user — provided via the web interface as natural language, structured form input, or uploaded documentation.

## 4) Core Output
A proposed workflow architecture that maps substeps to the least complex viable system type, visualized as an interactive node graph, along with rationale, governance controls, version history, and approval points.

## 5) Why Agency Matters
The system must interpret ambiguous workflows, break them into parts, compare alternative system types, reason about tradeoffs, and decide when to escalate to a human. A purely deterministic program would be too rigid for workflow interpretation.

## 6) Distinct Roles or Components

| # | Agent | Purpose |
|---|-------|---------|
| 1 | **Workflow Decomposition Agent** | Convert natural-language workflow into structured substeps with dependencies |
| 2 | **System Selection Agent** | Determine the least complex viable system type for each substep |
| 3 | **Orchestration & Scaffolding Agent** | Assemble the final workflow from selected step types |
| 4 | **Governance & Drift Monitor** | Attach oversight structures and monitor behavior over time |
| 5 | **Human Review Interface** | Present rationale, alerts, and approval/reject/edit controls (UI component, not agent) |

## 7) Coordination Logic
The pipeline follows a structured sequential flow with feedback loops:

```
User Input → [1] Decomposition → Human Review Gate → [2] System Selection → 
Human Review Gate → [3] Orchestration → Human Review Gate → [4] Governance → 
Human Final Approval → Deploy/Export
```

At each gate, the human can edit, reject (sending back to the previous agent), or approve. The Governance agent runs continuously post-deployment, feeding drift signals back through the pipeline for re-evaluation.

## 8) Tools, Data, Memory, or State

| Component | Tools & Resources |
|-----------|-------------------|
| **Shared** | LLM API (GPT-5.4-mini), PostgreSQL database, workflow state store, MCP tool registry |
| **Decomposition** | NLP parsing, workflow schema templates, domain-specific ontologies (via RAG) |
| **Selection** | Classification rubric, cost/latency models, benchmark templates, confidence scorer |
| **Orchestration** | Template library, node graph generator, tool binding registry, sandbox harness |
| **Governance** | Logging pipeline, alert thresholds, version store, analytics layer, drift detectors |

## 9) Human-in-the-Loop Points

| Checkpoint | What Human Does |
|------------|-----------------|
| After Decomposition | Reviews substep structure, merges/splits/reorders steps |
| After System Selection | Overrides routing decisions, adjusts confidence thresholds |
| After Orchestration | Edits proposed workflow graph, modifies connections and parameters |
| After Governance | Sets alert thresholds, approves monitoring configuration |
| Post-Deployment | Responds to drift alerts, approves corrective actions |
| Workflow Setup Conversation | Back-and-forth with specialist about what drift might look like, guardrails, and edge cases |

## 10) Success Signals
- Clear, accurate task decomposition matching human expert judgment
- Routing decisions that match or improve on human architect recommendations
- Reduced unnecessary complexity vs. naive "agent everywhere" alternative
- Useful governance overlays that catch real issues without alert fatigue
- Reviewer confidence in the proposed workflow
- Cost savings from right-sizing (using L0-L2 where L4-L5 was assumed)

## 11) Key Risks
- Misclassifying a step's needed sophistication (under or over)
- Making the UI too complex to trust
- Producing recommendations that are plausible but not operationally useful
- Letting logging become inconsistent across workflow types
- Scope explosion if trying to support every workflow type simultaneously

## 12) Evidence to Collect
- Example workflow traces showing decomposition, routing, and orchestration decisions
- Architecture recommendations compared against human judgment (agreement rate)
- Cost and latency comparisons against simpler baselines
- Failure cases where the wrong system type was chosen
- Drift and exception alerts over repeated runs
- User satisfaction surveys and time-to-deploy metrics

---

# 5. Agent System Specification Canvases

Following the L4 Agent System Specification Canvas template for each of Promethean's four agents.

## 5.1 Agent Canvas 1 — Workflow Decomposition Agent

### Purpose
Convert a user's natural-language workflow description into explicit substeps, dependencies, decision points, and outputs. This is the entry point for all Promethean analysis.

### Task Boundary
The agent operates ONLY on workflow decomposition. It does not classify substeps, select system types, assemble architectures, or attach governance. Its sole output is a structured task graph.

### Users & Stakeholders
- **Input from:** Human user (workflow description via web UI)
- **Output to:** System Selection Agent (structured decomposition)
- **Reviewed by:** Human reviewer before handoff

### Inputs
- User workflow description (natural language, structured form, or uploaded document)
- Optional: domain context, constraints, goals, existing documentation
- Optional: similar workflow templates from the template library (via RAG retrieval)

### Outputs
- Structured task graph (JSON) containing:
  - Ordered list of substeps with unique IDs
  - Dependencies between steps (DAG structure)
  - Identified decision points and branching logic
  - Input/output specifications per step
  - Ambiguities and missing information flagged explicitly
  - Confidence scores per decomposition decision

### Operating Rules
- **MUST:** Segment workflows into meaningful, atomic units
- **MUST:** Surface uncertainty rather than hiding it behind confident-seeming outputs
- **MUST:** Flag missing information explicitly rather than inventing details
- **MUST:** Preserve the user's original intent and domain language
- **MAY:** Suggest splitting overly complex steps or merging trivially simple ones
- **MAY:** Retrieve similar decomposition patterns from the template library
- **MUST NOT:** Make system selection decisions (that's Agent 2's job)
- **MUST NOT:** Modify the user's workflow goals or add steps not implied by the description
- **MUST NOT:** Access external systems beyond the template library and RAG store

### Autonomy Level
**Bounded autonomous within decomposition scope.** The agent can freely decompose, re-decompose, and refine its output. But the final decomposition must be presented for human review before passing to the next stage.

### Tool Permissions
- LLM API (GPT-5.4-mini) for reasoning
- RAG retrieval from template library (read-only)
- Workflow schema validator (to ensure output conforms to expected format)
- No external API calls, no database writes, no email/notification sending

### Memory Policy
- **Session memory:** Maintains conversation context with the user during the decomposition refinement process
- **Semantic memory:** Reads from (but does not write to) the template library for pattern matching
- **No persistent memory:** Each decomposition is independent; no cross-session learning in Phase 1

### Human Checkpoints
1. User reviews initial decomposition and can edit/merge/split steps
2. If confidence on any step is below 70%, the agent flags it and asks the user for clarification
3. User explicitly approves the decomposition before it passes to System Selection

### Escalation Conditions
- If the workflow description is too vague to decompose (< 3 identifiable steps), ask the user for more detail
- If the domain is entirely outside the agent's training data, flag and suggest the user provide domain documentation
- If the user's edits create circular dependencies, flag the issue and suggest resolution

### Success Criteria
- Decomposition matches human expert judgment in ≥ 80% of cases (measured by step count, dependency accuracy, and completeness)
- Zero invented steps (all steps traceable to user input)
- All ambiguities explicitly flagged (not hidden)
- Processing time < 30 seconds for workflows with ≤ 20 substeps
- User approval rate ≥ 85% without major edits

---

## 5.2 Agent Canvas 2 — System Selection Agent

### Purpose
Determine the least complex viable system type for each substep in the decomposition, using the L0-L5 automation spectrum.

### Task Boundary
Operates ONLY on system classification per substep. Does not decompose workflows, assemble architectures, or configure governance.

### Users & Stakeholders
- **Input from:** Workflow Decomposition Agent (approved task graph)
- **Output to:** Orchestration & Scaffolding Agent (annotated task graph with system selections)
- **Reviewed by:** Human reviewer (can override any selection)

### Inputs
- Approved structured task graph from Agent 1
- User-specified constraints: budget, latency requirements, risk tolerance, compliance requirements
- Classification rubric (the L0-L5 spectrum with scoring criteria)
- Optional: benchmark data from similar workflow executions

### Outputs
Per substep:
- Recommended system type (L0-L5)
- Confidence score (0-100%)
- Rationale (2-3 sentences explaining why this level, not higher or lower)
- Alternative recommendation (next-simplest option if the primary fails)
- Cost and latency estimates
- Required tools/APIs for the recommended system type

### Operating Rules
- **MUST:** Start at L0 (deterministic) and move up ONLY when the substep genuinely requires it
- **MUST:** Justify every classification using the 5 triage criteria: decomposition needs, external action, verification burden, coordination requirements, human oversight
- **MUST:** Provide confidence scores and flag low-confidence decisions
- **MUST:** Consider cost, latency, and explainability alongside capability
- **MAY:** Use multi-path reasoning (generate 2-3 candidate classifications, then select)
- **MUST NOT:** Default to agentic solutions when simpler methods suffice
- **MUST NOT:** Make tool binding or orchestration decisions (that's Agent 3's job)
- **MUST NOT:** Ignore user-specified constraints (e.g., if budget is $0, cannot recommend paid API calls)

### Autonomy Level
**Bounded autonomous within classification scope.** Can freely analyze, score, and recommend. All recommendations presented for human override before handoff.

### Tool Permissions
- LLM API (GPT-5.4-mini) for reasoning and classification
- Classification rubric (structured scoring framework, read-only)
- Cost/latency estimation models
- Benchmark comparison templates (from template library)
- No external API calls, no execution of classified systems

### Memory Policy
- **Session memory:** Maintains context across substeps for consistency checking
- **Semantic memory:** Reads classification patterns from historical decisions (when available)
- **Episodic memory (Phase 2+):** Learns from past classification accuracy to improve future recommendations

### Human Checkpoints
1. Human reviews all per-substep classifications in a summary view
2. Human can override any individual classification with one click
3. System highlights disagreements between its recommendation and common patterns
4. Human explicitly approves the full annotated graph before handoff

### Escalation Conditions
- If a substep sits ambiguously between two system types (e.g., the scoring criteria give near-identical scores for L2 and L3), present both options with trade-offs
- If user constraints conflict with task requirements (e.g., "no API calls" but the task requires external data retrieval), flag the conflict
- If the decomposition contains steps that probably shouldn't exist, flag for simplification

### Success Criteria
- Classification accuracy ≥ 75% compared to human expert judgment
- Right-sizing improvement: at least 30% of substeps classified at a lower level than naive "agent everywhere" approach
- Zero unwarranted L4/L5 classifications (every agentic recommendation justified by genuine task requirements)
- Processing time < 15 seconds per substep
- Confidence calibration: when the agent says 90% confident, it should be correct 85-95% of the time

---

## 5.3 Agent Canvas 3 — Orchestration & Scaffolding Agent

### Purpose
Assemble the final workflow from the selected step types, generating a coherent system plan with execution logic, tool bindings, connections, and checkpoint definitions.

### Task Boundary
Operates on workflow assembly and scaffold generation. Does not decompose, classify, or apply governance.

### Users & Stakeholders
- **Input from:** System Selection Agent (annotated task graph with system selections)
- **Output to:** Governance & Drift Monitor (proposed workflow for governance attachment) AND Human Review Interface (visual workflow for review)
- **Reviewed by:** Human reviewer (can edit the workflow graph before governance attachment)

### Inputs
- Annotated task graph with per-substep system selections and rationale
- User constraints (platform capabilities, available integrations, deployment preferences)
- Available tool registry (MCP tools and API integrations)
- Template library for common workflow patterns

### Outputs
- Complete workflow definition (JSON) containing:
  - Node definitions with system type, parameters, and tool bindings
  - Edge definitions with conditions, data flow, and error handling
  - Execution sequence with parallel paths where applicable
  - Checkpoint definitions for human review points
  - Retry policies and timeout configurations
  - Estimated total cost and latency
- Visual node graph representation (React Flow compatible JSON)
- Exportable scaffold (code templates, configuration files)

### Operating Rules
- **MUST:** Assemble flows that are executable, not just conceptually coherent
- **MUST:** Define clear handoff points between steps with explicit data schemas
- **MUST:** Include error handling and retry logic for every step
- **MUST:** Respect system selection decisions from Agent 2 (no upgrading a step from L1 to L4)
- **MAY:** Suggest workflow optimizations (parallelization, caching, step elimination)
- **MAY:** Propose alternative connection patterns if the default sequential flow is suboptimal
- **MUST NOT:** Override system selection decisions without flagging to the human
- **MUST NOT:** Bind tools that aren't in the approved registry
- **MUST NOT:** Create circular dependencies or infinite loops without explicit termination conditions

### Autonomy Level
**Bounded autonomous within orchestration scope.** Can freely arrange, optimize, and scaffold. All outputs presented for human review in the visual editor before governance attachment.

### Tool Permissions
- LLM API (GPT-5.4-mini) for reasoning
- Template library (read-only for pattern retrieval)
- MCP tool registry (read-only for discovering available integrations)
- Workflow validator (checks for circular dependencies, type mismatches, missing handlers)
- React Flow JSON generator (creates visual representation)

### Memory Policy
- **Session memory:** Maintains orchestration context during assembly
- **Semantic memory:** Reads common workflow patterns from template library
- **Persistent memory:** Saves generated workflow definitions to PostgreSQL for versioning

### Human Checkpoints
1. Human reviews the assembled workflow in the visual node editor
2. Human can drag, reconnect, add, or remove nodes
3. Human approves execution sequence, retry policies, and timeout configurations
4. Human confirms tool bindings and checkpoint placements

### Success Criteria
- Generated workflows are syntactically valid and executable (100% schema compliance)
- Assembly time < 45 seconds for workflows with ≤ 20 substeps
- Zero circular dependencies or infinite loops without termination
- Human approval rate ≥ 80% without major structural edits
- Exported scaffolds compile/run without errors

---

## 5.4 Agent Canvas 4 — Governance & Drift Monitor

### Purpose
Attach oversight structures to the workflow and continuously monitor behavior so the user can inspect how it changes over time and intervene when needed.

### Task Boundary
Operates on governance attachment, monitoring configuration, and drift detection. Does not decompose, classify, or assemble workflows.

### Users & Stakeholders
- **Input from:** Orchestration Agent (proposed workflow architecture)
- **Output to:** Human Review Interface (governance-enriched workflow with monitoring dashboard)
- **Ongoing interaction with:** All deployed workflows (continuous monitoring)

### Inputs
- Proposed workflow architecture from Agent 3
- User-defined governance policies and thresholds
- User-defined drift expectations (from the setup conversation)
- Historical execution logs (for deployed workflows)
- Alert configuration preferences

### Outputs
- Governance overlay containing:
  - Standardized logging configuration per step
  - Version snapshots with diff capabilities
  - Drift indicators with configurable thresholds
  - Alert rules with escalation paths
  - Audit trail specifications
  - Compliance checkpoint definitions
- Ongoing monitoring outputs:
  - Real-time execution traces
  - Drift alerts with evidence
  - Cost and latency trend analysis
  - Version comparison reports
  - Suggested mitigations for detected issues

### Operating Rules
- **MUST:** Attach logging to every step (no gaps in the audit trail)
- **MUST:** Create version snapshots at every significant workflow modification
- **MUST:** Define drift indicators based on user-specified expectations and domain defaults
- **MUST:** Keep alert signal-to-noise ratio high (no alert fatigue)
- **MAY:** Suggest governance improvements based on observed execution patterns
- **MAY:** Auto-adjust alert thresholds based on historical noise levels (with human approval)
- **MUST NOT:** Modify workflow behavior without human approval
- **MUST NOT:** Suppress or hide alerts that meet threshold criteria
- **MUST NOT:** Delete or modify execution logs (append-only)

### Autonomy Level
**Continuous monitoring is fully autonomous.** Alert generation is autonomous. Any corrective action requires human approval.

### Tool Permissions
- LLM API (GPT-5.4-mini) for drift analysis reasoning
- PostgreSQL (read/write for logs, versions, alerts)
- Langfuse API (for trace ingestion and analysis)
- Notification system (email, webhook for alerts — with human-configured recipients)
- Dashboard rendering (Tremor/Recharts components for visualization)

### Memory Policy
- **Persistent memory:** All execution logs stored in PostgreSQL (append-only, never deleted)
- **Semantic memory:** Drift patterns and alert history stored for trend analysis
- **Episodic memory:** Past drift events and their resolutions for pattern matching

### Human Checkpoints
1. Human reviews and approves initial governance configuration
2. Human sets alert thresholds and escalation preferences
3. Human responds to drift alerts (acknowledge, investigate, or dismiss)
4. Human approves any corrective actions suggested by the monitor

### Success Criteria
- 100% of workflow steps have logging attached (no monitoring gaps)
- Alert precision ≥ 80% (alerts that are acknowledged or acted upon)
- Version snapshots captured at every significant modification
- Drift detection latency < 5 minutes from behavior change to alert
- False positive rate < 20% of total alerts

---

# 6. Agent Architecture Canvases

Following the L4 Agent Architecture Canvas template for technical design decisions.

## 6.1 Architecture — Workflow Decomposition Agent

### Model Strategy
**Primary:** GPT-5.4-mini (function calling mode with structured output)
**Fallback:** GPT-5.4-nano for simple workflows (cost optimization)
**Reasoning effort:** Medium (multi-step decomposition requires thoroughness but not maximum reasoning)

### Orchestration Logic
Single-path with re-prompting correction:
1. Initial decomposition pass (structured output → JSON task graph)
2. Self-verification pass (check for missing dependencies, circular references, orphaned steps)
3. Confidence scoring pass (per-step confidence based on input clarity)
4. If any step confidence < 50%, re-prompt with targeted questions

### Grounding Approach
- RAG retrieval from template library (similar workflow patterns)
- User-provided documentation (if uploaded)
- Domain ontology lookup (industry-specific step templates)
- Grounding source: ChromaDB embedded vector store

### Tool Integration (via MCP)
- `workflow-schema-validator` — validates output JSON against the Promethean workflow schema
- `template-retriever` — searches the template library for similar decomposition patterns
- `document-parser` — extracts workflow descriptions from uploaded PDFs/docs

### Memory Design
- **Working memory:** Current decomposition state, user conversation context (Zustand on frontend, session state on backend)
- **Factual memory:** Template library patterns (ChromaDB, read-only)
- **No episodic memory in Phase 1**

### Planning & Reflection
- **Planning:** Single decomposition plan generated, then verified
- **Reflection:** Self-verification pass checks for common failure modes (over-segmentation, missing dependencies, invented steps)
- **No multi-path planning** — decomposition is usually unambiguous enough for single-path

### Control Boundaries
- Maximum 50 substeps per workflow (hard limit to prevent runaway decomposition)
- Maximum 3 re-prompting cycles before escalating to human
- Timeout: 60 seconds total processing time
- Token budget: 16,000 input + 8,000 output tokens per decomposition attempt

### Key Trade-offs
| Decision | Choice | Trade-off |
|----------|--------|-----------|
| Single vs. multi-path reasoning | Single-path + correction | Faster, lower cost; may miss edge cases |
| Template retrieval | RAG from local store | Good pattern matching; may bias toward existing templates |
| Confidence calibration | Prompt-based self-assessment | Easy to implement; may not be well-calibrated |

---

## 6.2 Architecture — System Selection Agent

### Model Strategy
**Primary:** GPT-5.4-mini (function calling with structured output)
**Reasoning effort:** High (classification decisions have significant downstream impact)

### Orchestration Logic
Multi-path reasoning with selection:
1. For each substep, generate 2-3 candidate classifications (e.g., "L1 because...", "L3 because...")
2. Score each candidate against the 5 triage criteria
3. Select the lowest-level candidate that scores above the reliability threshold
4. If no candidate scores above threshold, escalate to human

### Grounding Approach
- Classification rubric (structured scoring framework, always in context)
- Benchmark data from similar classifications (ChromaDB retrieval)
- Cost/latency models (structured lookup tables)

### Tool Integration (via MCP)
- `classification-rubric` — the 5-criteria scoring framework
- `cost-estimator` — estimates cost per substep at each system level
- `latency-estimator` — estimates latency per substep at each system level
- `benchmark-retriever` — finds similar substep classifications from history

### Memory Design
- **Working memory:** Current substep being classified, surrounding context from the task graph
- **Semantic memory:** Past classification decisions and their accuracy (Phase 2+)
- **Episodic memory:** Specific cases where classifications were overridden by humans (Phase 2+) — for learning

### Planning & Reflection
- **Multi-path planning:** 2-3 candidate classifications per substep
- **Self-critique:** Each candidate must articulate why the level below it would be insufficient
- **Consistency check:** After all substeps are classified, verify that adjacent steps have compatible system types

### Control Boundaries
- Always classify at the LOWEST viable level (never default upward)
- If confidence < 60% on any classification, present alternatives to human
- Maximum 3 classification attempts per substep before escalating
- Token budget: 8,000 input + 4,000 output per substep

---

## 6.3 Architecture — Orchestration & Scaffolding Agent

### Model Strategy
**Primary:** GPT-5.4-mini (function calling with structured output for workflow JSON)
**Reasoning effort:** Medium-High (assembly requires both creativity and precision)

### Orchestration Logic
Template-guided assembly with optimization:
1. Retrieve the most similar workflow template from the library
2. Adapt template structure to match the current task graph and system selections
3. Bind tools from the MCP registry to each step
4. Optimize: identify parallelization opportunities, eliminate redundant steps
5. Generate React Flow-compatible visual representation
6. Validate the complete workflow (schema, dependencies, types)

### Tool Integration (via MCP)
- `template-library` — retrieves and adapts workflow templates
- `mcp-registry` — discovers available tools and their capabilities
- `workflow-validator` — comprehensive validation (schema, dependencies, types, cycles)
- `react-flow-generator` — converts workflow JSON to visual node positions
- `scaffold-generator` — creates exportable code templates and configurations

### Memory Design
- **Working memory:** Current assembly state, tool registry snapshot
- **Semantic memory:** Workflow patterns and common configurations
- **Persistent memory:** All generated workflows saved to PostgreSQL with versioning

---

## 6.4 Architecture — Governance & Drift Monitor

### Model Strategy
**Primary:** GPT-5.4-mini for drift analysis and alert reasoning
**Secondary:** Deterministic rules engine for threshold-based alerting (no LLM needed for simple comparisons)

### Orchestration Logic
Continuous monitoring loop:
1. Ingest execution traces from Langfuse
2. Apply deterministic threshold checks (latency spikes, error rates, cost overruns)
3. For subtle drift, use LLM to analyze trace patterns and compare against baseline
4. Generate alerts with evidence and suggested mitigations
5. Log all analysis to PostgreSQL (append-only)

### Tool Integration (via MCP)
- `langfuse-client` — reads execution traces and metrics
- `alert-manager` — sends notifications via configured channels
- `version-store` — manages workflow version snapshots and diffs
- `analytics-engine` — computes trend statistics and drift indicators
- `dashboard-renderer` — updates real-time monitoring visualizations

### Memory Design
- **Persistent memory:** All execution logs (PostgreSQL, append-only)
- **Semantic memory:** Drift pattern library (ChromaDB) — what does "normal" look like for each workflow type
- **Episodic memory:** Past drift events and their resolutions

---

# 7. Multi-Agent System Specification Canvas

Following the L6 Multi-Agent System Specification Canvas template:

## System Purpose & Bounded Task
Analyze workflows, recommend right-sized automation architectures, scaffold monitored workflows, and detect behavioral drift over time. Bounded to enterprise-style workflows in the initial demonstration.

## Agent Roles & Profiling

| Agent | Role Type | Autonomy | Communication Style |
|-------|-----------|----------|---------------------|
| Decomposition | Worker (specialized) | Bounded — operates only on decomposition | Produces structured JSON output |
| System Selection | Analyst (specialized) | Bounded — operates only on classification | Produces annotated classifications with rationale |
| Orchestration | Builder (specialized) | Bounded — operates only on assembly | Produces workflow definitions and visual representations |
| Governance | Monitor (continuous) | Semi-autonomous — alerts freely, actions require approval | Produces alerts, reports, and suggested mitigations |

All agents are **heterogeneous** — different prompts, tools, memory configurations, and operating rules.

## Interaction Strategy
**Primary:** Centralized sequential pipeline with structured handoffs
**Secondary:** The Governance Monitor operates independently post-deployment, feeding back to the pipeline when re-evaluation is needed
**Communication mechanism:** Shared state in PostgreSQL + structured JSON messages via LangGraph's state management

## Operating Rules & Autonomy Levels

| Rule | Description |
|------|-------------|
| Sequential dependency | Agent N+1 cannot start until Agent N's output is approved |
| Human gates | Every agent-to-agent handoff passes through human review |
| No cross-boundary actions | Agents do not perform tasks outside their specified boundary |
| Shared state visibility | All agents can read the current workflow state; only the appropriate agent can modify its section |
| Escalation propagation | If any agent escalates, the pipeline pauses until the human responds |

## Success Criteria

| Metric | Target |
|--------|--------|
| End-to-end processing time (4-agent pipeline) | < 5 minutes for ≤ 20-step workflows |
| Decomposition accuracy | ≥ 80% agreement with human experts |
| Classification accuracy | ≥ 75% agreement with human experts |
| Right-sizing improvement | ≥ 30% of steps classified lower than naive approach |
| Workflow executability | 100% of generated workflows pass schema validation |
| Governance completeness | 100% of steps have logging and monitoring attached |
| Human approval rate | ≥ 80% without major edits |
| Alert precision | ≥ 80% of alerts are actionable |

---

# 8. Multi-Agent Architecture Canvas

Following the L6 Multi-Agent Architecture Canvas template:

## Agent Model Strategy
**Heterogeneous agents** — each agent has a different system prompt, tool set, and memory configuration. All use GPT-5.4-mini as the base model but with different function-calling schemas and reasoning effort levels.

**Profile construction:** Each agent's identity is defined by its system prompt (containing its Specification Canvas), its MCP tool bindings, and its memory store connections.

## Individual Behavior Implementation

Each agent follows the **Perceive → Think → Act → Reflect** cycle:

```
PERCEIVE: Read inputs from shared state (LangGraph state object)
THINK: Reason about the task using LLM with structured prompts
ACT: Produce outputs (structured JSON) and write to shared state
REFLECT: Self-verify outputs against quality criteria
```

The control flow per agent is a **single-path with re-prompting correction** (Agents 1, 3, 4) or **multi-path with selection** (Agent 2). No agent uses full tree search or Monte Carlo methods — the tasks are structured enough that bounded reasoning suffices.

## Orchestration & Organizational Architecture

**Pattern:** Role-Based Sequential Pipeline (L6 design pattern)
**Implementation:** LangGraph directed graph with human-in-the-loop nodes

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│ Decompose  │────▶│   Select   │────▶│ Orchestrate│────▶│   Govern   │
│   Agent    │     │   Agent    │     │   Agent    │     │   Agent    │
└────────────┘     └────────────┘     └────────────┘     └────────────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
  ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
  │  Human   │      │  Human   │      │  Human   │      │  Human   │
  │  Review  │      │  Review  │      │  Review  │      │  Review  │
  └──────────┘      └──────────┘      └──────────┘      └──────────┘
```

The orchestration is **static** — the pipeline order is fixed. The logic within each node is **dynamic** — agents adapt their reasoning based on the specific workflow being analyzed.

## Communication Infrastructure

**Mechanism:** LangGraph's built-in state management
**Schema:** Typed JSON objects with version fields
**Protocol:** Synchronous within the pipeline; asynchronous for post-deployment monitoring

```typescript
interface PrometheanState {
  // Pipeline state
  userInput: WorkflowDescription;
  decomposition: TaskGraph | null;
  decompositionApproved: boolean;
  systemSelections: AnnotatedTaskGraph | null;
  selectionsApproved: boolean;
  workflow: WorkflowDefinition | null;
  workflowApproved: boolean;
  governance: GovernanceOverlay | null;
  governanceApproved: boolean;
  
  // Metadata
  currentPhase: 'decompose' | 'select' | 'orchestrate' | 'govern' | 'complete';
  humanFeedback: HumanEdit[];
  errors: AgentError[];
  
  // Monitoring (post-deployment)
  executionTraces: ExecutionTrace[];
  driftAlerts: DriftAlert[];
}
```

## Environment & Grounding Infrastructure

**Shared data all agents access:**
- PostgreSQL database (workflow definitions, execution logs, versions)
- ChromaDB vector store (templates, patterns, domain knowledge)
- MCP tool registry (available integrations and their capabilities)
- Langfuse traces (execution history and performance metrics)

---

# 9. Technology Stack — Full Research & Justification

## 9.1 Default Model: GPT-5.4-mini

Released March 17, 2026, GPT-5.4-mini is the optimal default for Promethean:

| Specification | Value |
|---------------|-------|
| Context window | 400,000 tokens |
| Max output | 128,000 tokens |
| Input pricing | $0.75/1M tokens ($0.075 cached) |
| Output pricing | $4.50/1M tokens |
| Function calling | Full support with structured outputs |
| Tool orchestration (tau2-bench) | 93.4% |
| Coding (SWE-Bench Pro) | 54.38% |
| Speed | 2x faster than GPT-5 mini |

**Why GPT-5.4-mini over alternatives:**
- vs. Claude 4.5 Haiku ($0.80-1.00/1M input): GPT-5.4-mini has better function calling reliability for structured JSON outputs
- vs. Gemini 3.0 Flash: GPT-5.4-mini has better coding benchmarks needed for scaffold generation
- vs. GPT-5.4 (flagship): 3% less accurate on SWE-Bench but 5-10x cheaper — justified for Promethean's cost-sensitive multi-agent pipeline

**Model documentation:** https://developers.openai.com/api/docs/models/gpt-5.4-mini
**API reference:** https://developers.openai.com/api/docs
**Pricing:** https://developers.openai.com/api/docs/pricing

## 9.2 Orchestration Framework: LangGraph

LangGraph's directed-graph architecture maps directly to Promethean's pipeline:

- **Nodes** = agents + human review gates
- **Edges** = conditional transitions based on approval state
- **State** = typed PrometheanState object shared across all nodes
- **Checkpointing** = durable execution with auto-resume from failures
- **Human-in-the-loop** = native `interrupt_before` and `interrupt_after` at any node

**LangGraph docs:** https://docs.langchain.com/oss/python/langgraph/overview
**LangGraph GitHub:** https://github.com/langchain-ai/langgraph
**MCP integration:** https://docs.langchain.com/oss/python/langchain/mcp

**Secondary framework (for A2A support):** Google ADK
- **ADK docs:** https://google.github.io/adk-docs
- **ADK + A2A:** https://google.github.io/adk-docs/a2a/

## 9.3 Visual Editor: React Flow

React Flow provides the visual workflow canvas:

- 24,000+ GitHub stars, MIT license
- Nodes are standard React components (full customization)
- Built-in MiniMap, Controls, Background panels
- JSON serialization for nodes and edges (perfect for workflow persistence)
- Drag-and-drop, zoom, pan, connection validation
- Used in production at Stripe and Typeform

**React Flow docs:** https://reactflow.dev
**GitHub:** https://github.com/xyflow/xyflow
**Examples gallery:** https://reactflow.dev/examples

## 9.4 State Management: Zustand + XState

**Zustand v5** (~57,600 stars, ~3KB gzipped):
- Single store for the entire workflow graph state
- `immer` middleware for immutable updates to deeply nested workflow JSON
- `devtools` middleware for Redux DevTools integration
- `subscribeWithSelector` for granular WebSocket-based updates

**XState v5** (~27,000 stars):
- State machines for per-node execution lifecycle (idle → running → success/error)
- Guard-based transitions for conditional logic
- Parallel states for concurrent workflow steps

**Zustand docs:** https://zustand.docs.pmnd.rs
**XState docs:** https://stately.ai/docs

## 9.5 UI Framework: Shadcn/ui + Tremor + ARWES

**Shadcn/ui** — base component library (copy-paste Tailwind components)
**Tremor** — dashboard charts and KPI cards (acquired by Vercel)
**ARWES** — sci-fi/cyberpunk theming for the command center aesthetic

**Shadcn/ui:** https://ui.shadcn.com
**Tremor:** https://tremor.so
**ARWES:** https://arwes.dev
**Augmented UI (CSS):** https://augmented-ui.com

## 9.6 API: Fastify + tRPC

**Fastify** — 30K req/s, built-in schema validation, auto-OpenAPI docs
**tRPC v11** — end-to-end type-safe internal API

**Fastify docs:** https://fastify.io
**tRPC docs:** https://trpc.io

## 9.7 Database: Replit PostgreSQL + Drizzle ORM

Replit's built-in PostgreSQL: 10GB free, native Drizzle integration, auto-configured connection.

**Replit SQL docs:** https://docs.replit.com/cloud-services/storage-and-databases/sql-database
**Drizzle ORM:** https://orm.drizzle.team

## 9.8 Vector Memory: ChromaDB + Mem0

**ChromaDB** — embedded vector database, runs locally, zero config
**Mem0** — memory management layer atop ChromaDB

**ChromaDB docs:** https://docs.trychroma.com
**Mem0 docs:** https://docs.mem0.ai

## 9.9 Session Cache: Upstash Redis

HTTP-based Redis API, 500K commands/month free, no TCP connection needed.

**Upstash:** https://upstash.com

## 9.10 Triggers: Inngest + node-cron + BullMQ

**Inngest** — event-driven durable execution, 50K exec/month free
**node-cron** — simple in-process scheduling
**BullMQ** — Redis-backed job queues for complex scheduling

**Inngest docs:** https://www.inngest.com/docs
**Inngest GitHub:** https://github.com/inngest/inngest
**BullMQ docs:** https://docs.bullmq.io

## 9.11 Observability: Langfuse + Helicone

**Langfuse** — self-hosted, MIT, unlimited traces, full nested tracing
**Helicone** — cost optimization gateway with semantic caching

**Langfuse docs:** https://langfuse.com/docs
**Helicone docs:** https://docs.helicone.ai

## 9.12 Protocols: MCP + A2A

**MCP** — agent-to-tool interoperability (Anthropic/Linux Foundation)
**A2A** — agent-to-agent interoperability (Google/Linux Foundation)

**MCP spec:** https://modelcontextprotocol.io/specification/2025-11-25
**MCP servers:** https://github.com/modelcontextprotocol/servers
**A2A spec:** https://a2a-protocol.org/latest/specification
**A2A GitHub:** https://github.com/a2aproject/A2A

---

# 10. System Architecture — Complete Technical Design

## 10.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PROMETHEAN PWA (React)                          │
│  ┌──────────┐  ┌───────────────┐  ┌────────────┐  ┌─────────────┐ │
│  │ Workflow  │  │ Visual Node   │  │  Dashboard  │  │  Template   │ │
│  │ Wizard    │  │ Editor (React │  │  (Tremor +  │  │  Library    │ │
│  │ (Chat UI) │  │ Flow + Zustand│  │  ARWES)     │  │  Browser    │ │
│  └────┬─────┘  └──────┬────────┘  └──────┬──────┘  └──────┬──────┘ │
│       │               │                  │                │         │
│  ─────┴───────────────┴──────────────────┴────────────────┴──────── │
│                        tRPC Client Layer                            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────┴──────────────────────────────────────┐
│                    FASTIFY API SERVER                                │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  ┌────────────┐ │
│  │ tRPC Router │  │ Webhook      │  │ Auth       │  │ File       │ │
│  │ (internal)  │  │ Endpoints    │  │ Middleware  │  │ Upload     │ │
│  └──────┬──────┘  └──────┬───────┘  └────┬──────┘  └────┬───────┘ │
│         │                │               │               │          │
│  ───────┴────────────────┴───────────────┴───────────────┴───────── │
│                     Service Layer                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   LangGraph Orchestrator                     │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │Decompose │→ │ Select   │→ │Orchestr. │→ │ Govern   │   │   │
│  │  │ Agent    │  │ Agent    │  │ Agent    │  │ Agent    │   │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │   │
│  │       │human gate    │human gate   │human gate   │human gate│   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ OpenAI   │  │  MCP     │  │ Inngest  │  │  Langfuse        │   │
│  │ Client   │  │ Manager  │  │ Client   │  │  Client          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────────────┘   │
└───────┼──────────────┼──────────────┼──────────────┼────────────────┘
        │              │              │              │
┌───────┴──┐  ┌───────┴──┐  ┌───────┴──┐  ┌───────┴──────────┐
│ OpenAI   │  │  MCP     │  │ Inngest  │  │ Langfuse         │
│ API      │  │ Servers  │  │ Cloud    │  │ (self-hosted)    │
│ GPT-5.4  │  │ (tools)  │  │ (events) │  │                  │
│ -mini    │  │          │  │          │  │                  │
└──────────┘  └──────────┘  └──────────┘  └──────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ PostgreSQL   │  │ ChromaDB     │  │ Upstash Redis            │  │
│  │ (Replit)     │  │ (embedded)   │  │ (session cache)          │  │
│  │              │  │              │  │                          │  │
│  │ - Workflows  │  │ - Templates  │  │ - Session state          │  │
│  │ - Exec logs  │  │ - Patterns   │  │ - Conversation context   │  │
│  │ - Versions   │  │ - Embeddings │  │ - Rate limiting          │  │
│  │ - Users      │  │              │  │                          │  │
│  │ - Alerts     │  │              │  │                          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## 10.2 Request Flow — Creating a New Workflow

Here is the complete flow from a non-technical user's perspective:

```
1. USER opens Promethean PWA in browser
   │
2. USER clicks "New Workflow" → enters the Workflow Wizard
   │
3. WIZARD: Chat interface asks "Describe the workflow you want to automate"
   │  - User types natural language description
   │  - Optional: upload documentation, select domain
   │  - Specialist back-and-forth conversation about:
   │    · What drift might look like
   │    · Guardrails needed
   │    · Edge cases and failure modes
   │    · Human oversight preferences
   │
4. DECOMPOSITION AGENT runs (LangGraph node 1)
   │  → Produces structured task graph (JSON)
   │  → Displayed in the Visual Node Editor as a preliminary graph
   │
5. HUMAN REVIEW GATE 1
   │  - User sees decomposed steps as nodes
   │  - Can drag, merge, split, reorder, delete, add steps
   │  - Clicks "Approve Decomposition"
   │
6. SYSTEM SELECTION AGENT runs (LangGraph node 2)
   │  → Classifies each step (L0-L5) with confidence and rationale
   │  → Each node in the editor gets a color-coded system type badge
   │
7. HUMAN REVIEW GATE 2
   │  - User sees classifications with explanations
   │  - Can override any classification with dropdown selector
   │  - Clicks "Approve Classifications"
   │
8. ORCHESTRATION AGENT runs (LangGraph node 3)
   │  → Assembles complete workflow with connections, tool bindings, error handling
   │  → Visual editor shows the full connected workflow graph
   │  → Generates exportable scaffold
   │
9. HUMAN REVIEW GATE 3
   │  - User can edit the visual workflow graph
   │  - Reconnect nodes, add conditions, configure parameters
   │  - Test individual nodes in sandbox mode
   │  - Clicks "Approve Workflow"
   │
10. GOVERNANCE AGENT runs (LangGraph node 4)
    │  → Attaches logging, versioning, drift indicators, alerts
    │  → Dashboard preview shows monitoring configuration
    │
11. HUMAN REVIEW GATE 4
    │  - User reviews governance configuration
    │  - Sets alert thresholds and notification preferences
    │  - Clicks "Approve & Deploy" or "Save as Template"
    │
12. DEPLOYMENT
    │  - Workflow is saved to PostgreSQL with version 1.0
    │  - Trigger is configured (manual, cron, webhook, or event)
    │  - Monitoring begins via Langfuse integration
    │  - Dashboard goes live with real-time metrics
    │
13. ONGOING MONITORING
    - Governance Agent continuously watches execution traces
    - Drift alerts surface in the dashboard
    - User can pause, edit, re-version, or retire the workflow
```

---

# 11. Visual Workflow Editor — Design & Implementation

## 11.1 Node Types

Each workflow step is represented as a custom React Flow node with a distinct visual style based on its system type:

| System Level | Node Color | Icon | Description |
|-------------|------------|------|-------------|
| L0 - Deterministic | `#4CAF50` (Green) | ⚙️ | Rule-based, fixed logic |
| L1 - LLM App | `#2196F3` (Blue) | 🧠 | Model-powered content |
| L2 - Assistant | `#9C27B0` (Purple) | 💬 | Interactive support |
| L3 - Agentic Workflow | `#FF9800` (Orange) | 🔄 | Orchestrated multi-step |
| L4 - Single Agent | `#F44336` (Red) | 🤖 | Goal-directed adaptive |
| L5 - Multi-Agent | `#E91E63` (Pink) | 🌐 | Coordinated agents |
| Human Gate | `#607D8B` (Gray) | 👤 | Human review checkpoint |
| Trigger | `#795548` (Brown) | ⚡ | Event/cron/webhook trigger |

Each node displays:
- Step name and brief description
- System type badge with level indicator
- Confidence score (color-coded: green ≥80%, yellow 60-79%, red <60%)
- Status indicator (idle, running, success, error)
- Expand button for detailed view (rationale, tools, parameters)

## 11.2 Edge Types

| Edge Type | Style | Description |
|-----------|-------|-------------|
| Sequential | Solid arrow | Step A must complete before Step B starts |
| Conditional | Dashed arrow with diamond | Branch based on output condition |
| Parallel | Split arrow | Steps execute concurrently |
| Error | Red dashed arrow | Error handling path |
| Human Gate | Double line | Requires human approval to proceed |

## 11.3 Editor Panels

The editor workspace has five panels:

1. **Canvas** (center): React Flow workspace with zoom, pan, minimap
2. **Node Palette** (left sidebar): Drag-and-drop node types, templates, and custom nodes
3. **Properties Panel** (right sidebar): Selected node's configuration — system type, parameters, tools, conditions
4. **Execution Timeline** (bottom): Shows execution state, logs, and timing for running/completed workflows
5. **Chat Panel** (bottom-right): Conversation with Promethean's agents for refinement

## 11.4 Implementation Details

```typescript
// Node data structure (React Flow compatible)
interface PrometheanNode {
  id: string;
  type: 'deterministic' | 'llm-app' | 'assistant' | 'agentic-workflow' | 
        'single-agent' | 'multi-agent' | 'human-gate' | 'trigger';
  position: { x: number; y: number };
  data: {
    label: string;
    description: string;
    systemLevel: 0 | 1 | 2 | 3 | 4 | 5;
    confidence: number;
    rationale: string;
    tools: string[];          // MCP tool IDs
    parameters: Record<string, any>;
    retryPolicy: { maxRetries: number; backoffMs: number };
    timeout: number;          // milliseconds
    status: 'idle' | 'running' | 'success' | 'error';
  };
}

// Edge data structure
interface PrometheanEdge {
  id: string;
  source: string;
  target: string;
  type: 'sequential' | 'conditional' | 'parallel' | 'error' | 'human-gate';
  data: {
    condition?: string;       // For conditional edges
    label?: string;
    priority?: number;        // For parallel execution ordering
  };
}

// Complete workflow definition
interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  trigger: TriggerConfig;
  nodes: PrometheanNode[];
  edges: PrometheanEdge[];
  governance: GovernanceOverlay;
  metadata: {
    domain: string;
    tags: string[];
    estimatedCost: number;
    estimatedLatency: number;
    systemTypeSummary: Record<number, number>; // count per level
  };
}
```

---

# 12. Memory Architecture — Design & Implementation

## 12.1 Memory Taxonomy Applied to Promethean

Following L5's memory framework:

### Session Memory (Working Memory)
**What it stores:** Current conversation context, active workflow editing state, in-progress agent reasoning
**Technology:** Upstash Redis (HTTP API, 500K commands/month free)
**Lifecycle:** Created when user starts a session; expires after 24 hours of inactivity
**Privacy:** Per-user isolation via session tokens

### Semantic Memory (Factual Memory)
**What it stores:** Workflow templates, domain ontologies, classification patterns, best practices
**Technology:** ChromaDB (embedded, persistent local storage)
**Lifecycle:** Permanent; updated when new templates are added or patterns are learned
**Privacy:** Shared across all users (template library is communal)

### Episodic Memory (Experiential Memory)
**What it stores:** Past workflow execution traces, classification decisions and their outcomes, drift events and resolutions
**Technology:** ChromaDB (timestamped embeddings) + PostgreSQL (structured logs)
**Lifecycle:** Retained for 90 days (configurable); older entries summarized and archived
**Privacy:** Per-workspace isolation (each organization sees only its own history)

### RAG Grounding (Not Memory)
**What it stores:** External reference documents, API documentation, industry standards
**Technology:** ChromaDB with document chunking (512 tokens, 50-token overlap)
**Lifecycle:** Updated when user uploads new reference documents
**Purpose:** Grounds agent reasoning in current, authoritative information

## 12.2 Memory Formation Pipeline

Following L5's memory lifecycle:

```
1. OBSERVATION: Agent produces output during workflow analysis
   │
2. ENCODING: Relevant observations are extracted and embedded
   │  - Decomposition decisions → factual memory
   │  - Classification accuracy → episodic memory
   │  - Workflow patterns → semantic memory
   │
3. CONSOLIDATION: New memories are merged with existing knowledge
   │  - Duplicate detection (cosine similarity > 0.95 → merge)
   │  - Conflict resolution (newer overrides older for facts)
   │  - Summarization (compress old episodic memories)
   │
4. RETRIEVAL: Task-aware querying during agent reasoning
   │  - Semantic search (ChromaDB similarity)
   │  - Recency weighting (newer memories preferred)
   │  - Relevance filtering (top-k results with threshold)
   │
5. FORGETTING: Low-value memories are pruned
   - Access frequency below threshold after 30 days → archive
   - Contradicted facts → delete
   - User-requested deletion → immediate removal
```

---

# 13. Tool Integration & MCP/A2A Protocol Layer

## 13.1 MCP Server Architecture for Promethean

Promethean exposes its own MCP server and consumes external MCP servers:

### Promethean's MCP Server (Exposing Capabilities)

```typescript
// Promethean MCP Server — allows external agents to use Promethean
const server = new McpServer({
  name: "promethean",
  version: "1.0.0",
});

// Tools exposed via MCP
server.tool("analyze-workflow", 
  "Analyze a workflow description and return a decomposition with system type recommendations",
  { workflow: z.string(), constraints: z.object({...}).optional() },
  async ({ workflow, constraints }) => { /* ... */ }
);

server.tool("get-workflow-status",
  "Get the current status and metrics of a deployed workflow",
  { workflowId: z.string() },
  async ({ workflowId }) => { /* ... */ }
);

server.tool("list-templates",
  "Search the template library for reusable workflow patterns",
  { query: z.string(), domain: z.string().optional() },
  async ({ query, domain }) => { /* ... */ }
);

// Resources exposed via MCP
server.resource("workflow://{id}", "A deployed workflow definition", async (uri) => { /* ... */ });
server.resource("template://{id}", "A reusable workflow template", async (uri) => { /* ... */ });

// Prompts exposed via MCP
server.prompt("decompose", "Decompose a workflow into substeps", async (args) => { /* ... */ });
server.prompt("classify", "Classify a substep's required system level", async (args) => { /* ... */ });
```

### External MCP Servers Consumed by Promethean

Promethean's agents can use any MCP-compatible tool. The built-in registry includes:

| MCP Server | Purpose | Used By |
|------------|---------|---------|
| `@modelcontextprotocol/server-github` | GitHub integration for code workflows | Orchestration Agent |
| `@modelcontextprotocol/server-slack` | Slack notifications and approvals | Governance Agent |
| `@modelcontextprotocol/server-postgres` | Database queries and operations | All agents |
| `@modelcontextprotocol/server-filesystem` | File system access for document processing | Decomposition Agent |
| `@modelcontextprotocol/server-fetch` | HTTP requests for API integrations | Orchestration Agent |
| Custom MCP servers | User-defined integrations | Deployed workflows |

## 13.2 A2A Protocol for Inter-Agent Communication

For Promethean's four internal agents, LangGraph's native state management is sufficient. A2A becomes relevant when Promethean workflows interact with external agent systems:

```json
// Promethean's Agent Card (/.well-known/agent-card.json)
{
  "name": "Promethean Workflow Studio",
  "description": "Analyzes workflows and recommends right-sized automation architectures",
  "url": "https://promethean.replit.app",
  "version": "1.0.0",
  "capabilities": {
    "streaming": true,
    "pushNotifications": true,
    "stateTransitionHistory": true
  },
  "skills": [
    {
      "id": "workflow-analysis",
      "name": "Workflow Analysis",
      "description": "Decomposes and classifies workflow steps"
    },
    {
      "id": "workflow-monitoring",
      "name": "Workflow Monitoring",
      "description": "Monitors deployed workflows for drift and issues"
    }
  ]
}
```

---

# 14. API Design — External & Internal

## 14.1 Internal API (tRPC)

```typescript
// tRPC router definition
const appRouter = router({
  // Workflow CRUD
  workflow: router({
    create: protectedProcedure
      .input(z.object({ name: z.string(), description: z.string() }))
      .mutation(async ({ input, ctx }) => { /* ... */ }),
    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => { /* ... */ }),
    update: protectedProcedure
      .input(z.object({ id: z.string(), nodes: z.array(nodeSchema), edges: z.array(edgeSchema) }))
      .mutation(async ({ input }) => { /* ... */ }),
    list: protectedProcedure
      .query(async ({ ctx }) => { /* ... */ }),
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => { /* ... */ }),
  }),
  
  // Pipeline execution
  pipeline: router({
    startDecomposition: protectedProcedure
      .input(z.object({ workflowId: z.string(), description: z.string() }))
      .mutation(async ({ input }) => { /* ... */ }),
    approvePhase: protectedProcedure
      .input(z.object({ workflowId: z.string(), phase: z.enum(['decompose','select','orchestrate','govern']), edits: z.any().optional() }))
      .mutation(async ({ input }) => { /* ... */ }),
    rejectPhase: protectedProcedure
      .input(z.object({ workflowId: z.string(), phase: z.string(), feedback: z.string() }))
      .mutation(async ({ input }) => { /* ... */ }),
  }),

  // Templates
  template: router({
    search: publicProcedure
      .input(z.object({ query: z.string(), domain: z.string().optional() }))
      .query(async ({ input }) => { /* ... */ }),
    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => { /* ... */ }),
    publish: protectedProcedure
      .input(z.object({ workflowId: z.string(), name: z.string(), description: z.string(), tags: z.array(z.string()) }))
      .mutation(async ({ input }) => { /* ... */ }),
  }),

  // Monitoring
  monitoring: router({
    getMetrics: protectedProcedure
      .input(z.object({ workflowId: z.string(), timeRange: z.string() }))
      .query(async ({ input }) => { /* ... */ }),
    getAlerts: protectedProcedure
      .input(z.object({ workflowId: z.string().optional(), status: z.enum(['active','acknowledged','resolved']).optional() }))
      .query(async ({ input }) => { /* ... */ }),
    acknowledgeAlert: protectedProcedure
      .input(z.object({ alertId: z.string() }))
      .mutation(async ({ input }) => { /* ... */ }),
  }),
});
```

## 14.2 External API (REST — Webhook Endpoints)

```
POST /api/v1/webhooks/trigger/{workflowId}
  → Triggers a workflow execution from an external system
  → Body: { payload: any, metadata: { source: string, timestamp: string } }
  → Auth: API key in X-Promethean-Key header
  → Response: { executionId: string, status: 'queued' }

GET /api/v1/webhooks/status/{executionId}
  → Returns execution status and results
  → Auth: API key
  → Response: { status: 'running'|'completed'|'failed', result?: any, traces?: TraceLink }

POST /api/v1/mcp
  → MCP Streamable HTTP endpoint (for external MCP clients)
  → Follows MCP specification for tool/resource/prompt discovery and invocation

GET /.well-known/agent-card.json
  → A2A Agent Card for external agent discovery
```

---

# 15. Event-Driven Triggers — Cron, Webhooks, Events

## 15.1 Trigger Types

Each Promethean workflow can be activated by one or more trigger types:

| Trigger | Technology | Configuration | Example |
|---------|-----------|---------------|---------|
| **Manual** | Button in UI | None | User clicks "Run" |
| **Cron** | Inngest scheduled functions / Replit Scheduled Deployments | Cron expression | `0 9 * * 1` (Monday 9am) |
| **Webhook** | Fastify POST endpoint | URL + optional secret | External system posts data |
| **Event** | Inngest event-driven | Event name + filter | `ticket.created` with priority=high |
| **API Call** | REST endpoint | API key + payload | Programmatic trigger |

## 15.2 Inngest Configuration

```typescript
import { Inngest } from 'inngest';

const inngest = new Inngest({ id: 'promethean' });

// Cron-triggered workflow execution
export const scheduledWorkflow = inngest.createFunction(
  { id: 'run-scheduled-workflow', name: 'Scheduled Workflow Runner' },
  { cron: '0 9 * * 1' },  // Every Monday at 9am
  async ({ step }) => {
    const workflow = await step.run('load-workflow', async () => {
      return db.query.workflows.findFirst({ where: eq(workflows.id, 'wf-123') });
    });
    
    const result = await step.run('execute-workflow', async () => {
      return executeWorkflow(workflow);
    });
    
    await step.run('log-execution', async () => {
      return logExecution(workflow.id, result);
    });
  }
);

// Event-triggered workflow execution
export const eventTriggeredWorkflow = inngest.createFunction(
  { id: 'event-triggered-workflow', name: 'Event Triggered Runner' },
  { event: 'workflow/trigger' },
  async ({ event, step }) => {
    const { workflowId, payload } = event.data;
    // ... execute workflow with payload
  }
);
```

---

# 16. Observability, Logging & Drift Detection

## 16.1 Logging Architecture

Every workflow execution produces a structured trace:

```typescript
interface ExecutionTrace {
  traceId: string;
  workflowId: string;
  workflowVersion: string;
  triggeredBy: 'manual' | 'cron' | 'webhook' | 'event' | 'api';
  triggeredAt: string;
  completedAt: string | null;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  steps: StepTrace[];
  totalCost: number;
  totalLatency: number;
  metadata: Record<string, any>;
}

interface StepTrace {
  stepId: string;
  stepName: string;
  systemLevel: number;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  input: any;
  output: any;
  llmCalls: LLMCallTrace[];    // Token usage, cost, latency per call
  toolCalls: ToolCallTrace[];   // MCP tool invocations
  errors: ErrorTrace[];
  cost: number;
  latency: number;
}
```

## 16.2 Drift Detection

The Governance Agent monitors for five types of drift:

| Drift Type | Detection Method | Alert Threshold |
|------------|-----------------|-----------------|
| **Latency drift** | Moving average comparison | >2x baseline for 3 consecutive runs |
| **Cost drift** | Per-execution cost tracking | >50% above budget per run |
| **Accuracy drift** | Output quality scoring (LLM judge) | Score drops >20% from baseline |
| **Error rate drift** | Failure count over time window | >10% failure rate in rolling 24hr window |
| **Behavioral drift** | Output embedding distance from baseline | Cosine distance >0.3 from reference outputs |

## 16.3 Langfuse Integration

```typescript
import Langfuse from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_HOST, // self-hosted URL
});

// Trace a complete workflow execution
const trace = langfuse.trace({
  name: 'workflow-execution',
  metadata: { workflowId, version, trigger },
});

// Trace each agent step
const span = trace.span({
  name: 'decomposition-agent',
  metadata: { systemLevel: 0, tools: ['template-retriever'] },
});

// Trace LLM calls within agents
const generation = span.generation({
  name: 'decompose-workflow',
  model: 'gpt-5.4-mini',
  input: messages,
  output: response,
  usage: { inputTokens, outputTokens, totalCost },
});
```

---

# 17. Dashboard & Visualization — Sci-Fi Command Center

## 17.1 Dashboard Layout

The Promethean Command Center uses a dark-theme sci-fi aesthetic (ARWES-inspired) with Tremor charts:

### Main Dashboard Panels

1. **Workflow Fleet Overview** (top full-width)
   - Grid of workflow cards showing: name, status (green/yellow/red pulse), last run time, success rate sparkline
   - Filter by domain, system type, status

2. **Real-Time Execution Monitor** (center-left, large)
   - Live animation showing workflow nodes executing (nodes pulse when active)
   - Data flows visualized along edges with particle effects
   - Current step highlighted with expanding ring animation

3. **Metrics Grid** (center-right)
   - KPI cards (Tremor `<Metric>` components): Total executions (24hr), Success rate, Avg latency, Total cost
   - Trend indicators with sparklines

4. **Timeline** (bottom-left)
   - Execution history as a timeline (Tremor `<AreaChart>`)
   - Overlay: success/failure/timeout as stacked areas
   - Zoom and brush for time range selection

5. **Alert Feed** (bottom-right)
   - Real-time alert stream with severity badges
   - One-click acknowledge/investigate/dismiss
   - Expandable alert details with evidence

6. **System Health** (sidebar)
   - API latency gauge
   - Token usage meter
   - Cost burn rate
   - Active agents indicator

## 17.2 Sci-Fi Design System

```css
/* ARWES-inspired CSS custom properties */
:root {
  --promethean-bg-primary: #0a0e14;
  --promethean-bg-secondary: #0d1117;
  --promethean-bg-surface: #161b22;
  --promethean-border: #30363d;
  --promethean-accent-cyan: #00d4ff;
  --promethean-accent-magenta: #ff00aa;
  --promethean-accent-green: #00ff88;
  --promethean-text-primary: #e6edf3;
  --promethean-text-secondary: #8b949e;
  --promethean-glow: 0 0 10px rgba(0, 212, 255, 0.3);
  --promethean-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --promethean-font-display: 'Orbitron', 'Exo 2', sans-serif;
}
```

---

# 18. Workflow Serialization, Templates & Export

## 18.1 Workflow JSON Schema

Every workflow is persisted as a JSON document following this schema:

```json
{
  "$schema": "https://promethean.app/schemas/workflow/v1.json",
  "id": "wf-uuid-here",
  "name": "CRM Lead Qualification Pipeline",
  "description": "Qualifies inbound leads through data enrichment, scoring, and routing",
  "version": "1.2.0",
  "domain": "sales",
  "tags": ["crm", "lead-scoring", "automation"],
  "createdAt": "2026-04-01T10:00:00Z",
  "updatedAt": "2026-04-02T14:30:00Z",
  "trigger": {
    "type": "webhook",
    "config": {
      "path": "/webhooks/leads/new",
      "method": "POST",
      "authentication": "api-key"
    }
  },
  "nodes": [ /* PrometheanNode[] */ ],
  "edges": [ /* PrometheanEdge[] */ ],
  "governance": {
    "logging": { "level": "detailed", "retention": "90d" },
    "versioning": { "autoSnapshot": true },
    "drift": {
      "latencyThreshold": 2.0,
      "costThreshold": 1.5,
      "errorRateThreshold": 0.1
    },
    "alerts": {
      "channels": ["email", "slack"],
      "escalation": { "afterMinutes": 30, "to": "team-lead" }
    }
  },
  "metadata": {
    "estimatedCostPerRun": 0.15,
    "estimatedLatencyMs": 12000,
    "systemTypeSummary": { "0": 3, "1": 2, "3": 1, "4": 1 }
  }
}
```

## 18.2 Template Library

Templates are workflows with parameterized fields:

```json
{
  "templateId": "tpl-uuid-here",
  "name": "Compliance Memo Generator",
  "description": "Generates cited compliance memos for regulatory analysis",
  "domain": "legal",
  "tags": ["compliance", "memo", "regulatory"],
  "parameters": [
    { "name": "regulatoryBody", "type": "string", "description": "Target regulatory body (e.g., EU AI Act, SEC)" },
    { "name": "productLine", "type": "string", "description": "Product or service being analyzed" },
    { "name": "outputFormat", "type": "enum", "options": ["memo", "report", "briefing"] }
  ],
  "workflow": { /* WorkflowDefinition with {{parameter}} placeholders */ },
  "rating": 4.5,
  "usageCount": 127,
  "author": "promethean-team"
}
```

## 18.3 Export Formats

| Format | Description | Use Case |
|--------|-------------|----------|
| Promethean JSON | Full workflow definition | Import into another Promethean instance |
| LangGraph Python | Executable LangGraph code | Deploy outside Promethean |
| n8n JSON | n8n-compatible workflow | Migrate to n8n |
| OpenAPI Spec | API documentation for the workflow's webhook | Share with external teams |
| Markdown Report | Human-readable architecture document | Stakeholder communication |
| Docker Compose | Containerized deployment | Self-hosted production |

---

# 19. Human-in-the-Loop Design & Governance

## 19.1 The Setup Conversation

Before any agent runs, Promethean conducts a structured conversation with the user (a "specialist human") to gather critical context. This conversation covers:

1. **Workflow Description** — What are you trying to automate? What triggers it? What's the expected output?
2. **Drift Expectations** — What would "drift" look like for this workflow? What would signal that something has gone wrong?
3. **Guardrails** — What should the system NEVER do? What data should it never access? What actions are forbidden?
4. **Human Oversight Preferences** — How much autonomy are you comfortable with? Which steps need mandatory human review?
5. **Edge Cases** — What are the known edge cases? What happens when input is incomplete or contradictory?
6. **Success Definition** — How will you know this workflow is working well? What metrics matter?

This conversation generates a structured "Workflow Brief" that becomes the primary input for the Decomposition Agent.

## 19.2 Approval Workflow

Every agent-to-agent handoff passes through a human gate. The UI presents:

1. **Summary View** — What the agent did, in plain English
2. **Detailed View** — Full structured output with expandable sections
3. **Diff View** — What changed from the previous version (for re-runs)
4. **Actions:**
   - ✅ **Approve** — Pass output to the next agent
   - ✏️ **Edit & Approve** — Modify output, then pass forward
   - 🔄 **Regenerate** — Ask the agent to try again with optional feedback
   - ❌ **Reject** — Stop the pipeline, return to the previous step with feedback

## 19.3 Governance Controls

| Control | Description | Default |
|---------|-------------|---------|
| **Logging Level** | Minimal / Standard / Detailed / Debug | Standard |
| **Version Snapshots** | Auto-snapshot on every edit or scheduled | Every edit |
| **Alert Channels** | Email, Slack, webhook, in-app | In-app |
| **Escalation Timeout** | How long before unacknowledged alerts escalate | 30 minutes |
| **Cost Limit** | Maximum spend per execution | $1.00 |
| **Token Limit** | Maximum tokens per agent call | 32,000 |
| **Execution Timeout** | Maximum time for a complete workflow execution | 5 minutes |
| **Retry Policy** | Max retries and backoff strategy | 3 retries, exponential |

---

# 20. Progressive Web App (PWA) Architecture

## 20.1 PWA Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Promethean — Agentic Workflow Studio',
        short_name: 'Promethean',
        description: 'Right-sized agentic workflow analysis and orchestration',
        theme_color: '#0a0e14',
        background_color: '#0a0e14',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        runtimeCaching: [
          { urlPattern: /^https:\/\/api\./, handler: 'NetworkFirst', options: { cacheName: 'api-cache', networkTimeoutSeconds: 3 } },
          { urlPattern: /\.(js|css|woff2)$/, handler: 'CacheFirst', options: { cacheName: 'static-cache' } },
        ]
      }
    })
  ]
});
```

---

# 21. Database Schema & Data Model

```sql
-- Core tables for Promethean

-- Users and authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workspaces (multi-tenant)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workflow definitions
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(20) DEFAULT '1.0.0',
  status VARCHAR(50) DEFAULT 'draft',
  definition JSONB NOT NULL,          -- Full WorkflowDefinition JSON
  trigger_config JSONB,
  governance_config JSONB,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow versions (immutable snapshots)
CREATE TABLE workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id),
  version VARCHAR(20) NOT NULL,
  definition JSONB NOT NULL,
  changelog TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Execution logs (append-only)
CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id),
  workflow_version VARCHAR(20),
  triggered_by VARCHAR(50),            -- manual, cron, webhook, event, api
  trigger_payload JSONB,
  status VARCHAR(50) DEFAULT 'running', -- running, completed, failed, timeout
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  total_cost DECIMAL(10,6),
  total_latency_ms INTEGER,
  result JSONB,
  error JSONB
);

-- Step-level execution traces (append-only)
CREATE TABLE execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES executions(id),
  step_id VARCHAR(100),
  step_name VARCHAR(255),
  system_level INTEGER,
  status VARCHAR(50),
  input JSONB,
  output JSONB,
  llm_calls JSONB,                    -- Array of LLM call traces
  tool_calls JSONB,                   -- Array of MCP tool call traces
  cost DECIMAL(10,6),
  latency_ms INTEGER,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Drift alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id),
  alert_type VARCHAR(50),              -- latency, cost, accuracy, error_rate, behavioral
  severity VARCHAR(20),                -- info, warning, critical
  title VARCHAR(255),
  description TEXT,
  evidence JSONB,
  status VARCHAR(50) DEFAULT 'active', -- active, acknowledged, resolved, dismissed
  created_at TIMESTAMP DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  acknowledged_by UUID REFERENCES users(id)
);

-- Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  domain VARCHAR(100),
  tags TEXT[],
  parameters JSONB,
  definition JSONB NOT NULL,
  rating DECIMAL(3,2) DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  author_id UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API keys for external access
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  key_hash VARCHAR(255) NOT NULL,      -- SHA-256 hash of the actual key
  name VARCHAR(255),
  scopes TEXT[],                       -- ['trigger', 'read', 'admin']
  rate_limit INTEGER DEFAULT 100,      -- requests per hour
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflows_workspace ON workflows(workspace_id);
CREATE INDEX idx_executions_workflow ON executions(workflow_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_started ON executions(started_at);
CREATE INDEX idx_execution_steps_execution ON execution_steps(execution_id);
CREATE INDEX idx_alerts_workflow ON alerts(workflow_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_templates_domain ON templates(domain);
CREATE INDEX idx_templates_tags ON templates USING GIN(tags);
```

---

# 22. User Experience — Full Walkthrough

## 22.1 Onboarding (First-Time User)

1. User visits `promethean.replit.app`
2. PWA install prompt appears (add to home screen)
3. Quick registration (email + workspace name)
4. Guided tour highlights: Workflow Wizard, Visual Editor, Dashboard, Template Library
5. Suggested: "Try a template" → pre-built CRM Lead Qualification workflow

## 22.2 Creating a Workflow (Detailed Steps)

### Step 1: Workflow Wizard
- Chat-based interface with the Promethean specialist agent
- Agent asks structured questions about the workflow
- User can paste documentation, link to existing tools, describe processes
- Agent generates a "Workflow Brief" summarizing the conversation

### Step 2: Decomposition Review
- Visual editor shows preliminary node graph
- Each node = one substep with title, description
- User can drag nodes to rearrange, merge two nodes (select both + click merge), split a node (right-click + split), delete nodes, add new blank nodes
- Confidence indicators show which decomposition decisions the agent is unsure about

### Step 3: System Selection Review
- Each node gets a colored badge (L0-L5) with confidence percentage
- Clicking a node opens the rationale panel: why this level, not higher or lower
- User can override with a dropdown: change from L3 to L1, for example
- Summary bar shows: "12 steps: 4 deterministic, 3 LLM app, 2 agentic workflow, 2 single agent, 1 multi-agent"
- Cost estimator shows projected cost per execution

### Step 4: Orchestration Review
- Full connected workflow graph with all edges, conditions, error handling
- Properties panel shows per-node configuration: tools, parameters, retry policy
- "Test Node" button runs an individual node in sandbox mode with sample data
- "Simulate" button dry-runs the entire workflow with synthetic data
- Export options: download scaffold, copy configuration, share link

### Step 5: Governance Configuration
- Toggle panels for: logging level, version snapshots, alert channels, drift thresholds
- Preview of the monitoring dashboard with sample data
- "What drift looks like" summary from the setup conversation

### Step 6: Deploy
- Choose trigger type: manual, cron, webhook, event
- Set cost limits and execution timeout
- Review final summary
- Click "Deploy" → workflow goes live
- Dashboard immediately begins showing metrics

## 22.3 Monitoring a Running Workflow
- Dashboard shows real-time execution animation
- Alerts appear in the feed with severity badges
- Click an alert → see evidence, trace, suggested mitigation
- Click a workflow → see execution history, cost trend, latency trend
- Click an execution → see full step-by-step trace with inputs/outputs
- Version history shows diffs between workflow versions

---

# 23. Deployment on Replit — Complete Guide

## 23.1 Project Structure

```
promethean/
├── client/                    # React PWA
│   ├── public/
│   │   ├── manifest.json
│   │   ├── icons/
│   │   └── sw.js
│   ├── src/
│   │   ├── components/
│   │   │   ├── editor/        # React Flow visual editor
│   │   │   ├── dashboard/     # Tremor + ARWES monitoring
│   │   │   ├── wizard/        # Chat-based workflow wizard
│   │   │   ├── templates/     # Template library browser
│   │   │   └── common/        # Shared UI components
│   │   ├── stores/            # Zustand stores
│   │   ├── machines/          # XState machines
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # tRPC client, utils
│   │   ├── styles/            # ARWES theme, Tailwind config
│   │   └── App.tsx
│   ├── vite.config.ts
│   └── package.json
├── server/                    # Fastify API
│   ├── src/
│   │   ├── routes/            # Fastify routes (webhooks, MCP)
│   │   ├── trpc/              # tRPC router definitions
│   │   ├── agents/            # LangGraph agent definitions
│   │   │   ├── decomposition.ts
│   │   │   ├── selection.ts
│   │   │   ├── orchestration.ts
│   │   │   ├── governance.ts
│   │   │   └── pipeline.ts    # LangGraph graph definition
│   │   ├── mcp/               # MCP server and client configs
│   │   ├── memory/            # ChromaDB + Mem0 integration
│   │   ├── triggers/          # Inngest function definitions
│   │   ├── observability/     # Langfuse + Helicone integration
│   │   ├── db/                # Drizzle schema and migrations
│   │   └── index.ts           # Server entry point
│   └── package.json
├── shared/                    # Shared types and schemas
│   ├── types.ts
│   ├── schemas.ts             # Zod schemas for workflow definitions
│   └── constants.ts
├── .env                       # Environment variables
├── replit.nix                 # Nix configuration for Replit
├── .replit                    # Replit run configuration
└── README.md
```

## 23.2 Replit Configuration

```nix
# replit.nix
{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.nodePackages.typescript
    pkgs.postgresql
  ];
}
```

```toml
# .replit
run = "npm run dev"
entrypoint = "server/src/index.ts"

[nix]
channel = "stable-24_05"

[deployment]
run = ["sh", "-c", "npm run build && npm run start"]
deploymentTarget = "autoscale"
```

## 23.3 Environment Variables

```bash
# .env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4-mini

# Database (auto-configured by Replit)
DATABASE_URL=postgresql://...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Langfuse (self-hosted)
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_HOST=https://langfuse.promethean.replit.app

# Helicone
HELICONE_API_KEY=sk-...

# Inngest
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# App
APP_SECRET=...  # For session signing
APP_URL=https://promethean.replit.app
```

---

# 24. Development Workflow — Codex + Replit Agent

## 24.1 Phase 1: Rapid Prototyping with Replit Agent

Use Replit Agent to scaffold the initial application:

**Prompt:** "Build a React PWA with a Fastify backend. The app is a workflow automation studio. Include: a dashboard with Tremor charts, a React Flow visual editor, a chat interface, and user authentication. Use Tailwind CSS with a dark sci-fi theme. Connect to the Replit PostgreSQL database with Drizzle ORM."

Replit Agent will generate the initial project structure, routing, database connection, and basic UI. This gets from 0→1 in minutes.

## 24.2 Phase 2: Production Hardening with Codex

Export to GitHub, then use OpenAI Codex for:
- Implementing the LangGraph agent pipeline
- Building the MCP server and client layer
- Integrating Langfuse observability
- Writing comprehensive tests
- Security hardening (input validation, rate limiting, CSRF protection)
- Performance optimization (code splitting, lazy loading, query optimization)

## 24.3 AGENTS.md for Codex

```markdown
# Promethean — Codex Instructions

## Project Overview
Promethean is an agentic workflow studio built with React (Vite PWA) + Fastify + LangGraph.

## Architecture
- Client: React + React Flow + Zustand + Tremor + ARWES
- Server: Fastify + tRPC + LangGraph + MCP
- Database: PostgreSQL (Drizzle ORM) + ChromaDB + Upstash Redis
- Deployment: Replit Autoscale

## Conventions
- TypeScript strict mode everywhere
- Zod schemas for all API inputs/outputs
- Drizzle ORM for database queries (no raw SQL)
- tRPC for internal API, REST for webhooks
- All agent prompts in separate .prompt.ts files

## Testing
- Vitest for unit tests
- Playwright for E2E tests
- Agent tests use mock LLM responses
```

---

# 25. Implementation Roadmap — Phased Build Plan

## Phase 1: Foundation (Weeks 1-3)
- [ ] Scaffold React PWA with Vite + Tailwind + dark theme
- [ ] Set up Fastify server with tRPC
- [ ] Configure Replit PostgreSQL with Drizzle schema
- [ ] Build basic React Flow editor with custom node types
- [ ] Implement user authentication
- [ ] Create workflow CRUD operations

## Phase 2: Agent Pipeline (Weeks 4-6)
- [ ] Implement Decomposition Agent with GPT-5.4-mini
- [ ] Implement System Selection Agent with multi-path reasoning
- [ ] Implement Orchestration Agent with template library
- [ ] Build LangGraph pipeline with human-in-the-loop gates
- [ ] Create the Workflow Wizard chat interface
- [ ] Connect pipeline output to React Flow editor

## Phase 3: Governance & Monitoring (Weeks 7-9)
- [ ] Implement Governance Agent with logging attachment
- [ ] Set up Langfuse integration for trace ingestion
- [ ] Build drift detection engine (5 drift types)
- [ ] Create alert management system
- [ ] Build monitoring dashboard with Tremor + ARWES
- [ ] Implement version history and diff viewer

## Phase 4: Integration & Polish (Weeks 10-12)
- [ ] Build MCP server (expose Promethean capabilities)
- [ ] Integrate external MCP tools (GitHub, Slack, etc.)
- [ ] Implement Inngest triggers (cron, events)
- [ ] Build webhook endpoint system
- [ ] Create template library with search and publishing
- [ ] Implement export system (JSON, LangGraph, n8n, Markdown)
- [ ] Performance optimization and PWA polish

## Phase 5: Evaluation & Launch (Weeks 13-14)
- [ ] Conduct evaluation against baseline approaches
- [ ] User testing with 5-10 testers
- [ ] Documentation and tutorial creation
- [ ] Bug fixes and polish
- [ ] Public launch on Replit

---

# 26. Evaluation Framework & Success Criteria

## 26.1 Baseline Comparisons

Promethean's recommendations should be compared against three baselines:
1. **Always Deterministic** — every step classified as L0
2. **Always Single Agent** — every step classified as L4
3. **Always Multi-Agent** — every step classified as L5

The key question: does Promethean choose **more appropriate** system designs than these naive baselines?

## 26.2 Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Decomposition accuracy | ≥80% | Human expert comparison |
| Classification accuracy | ≥75% | Human expert comparison |
| Right-sizing improvement | ≥30% | Steps classified lower than "always agent" |
| Cost reduction | ≥40% | Projected cost vs. "always agent" baseline |
| Execution success rate | ≥95% | Deployed workflow completion rate |
| Human approval rate | ≥80% | Approval without major edits |
| Alert precision | ≥80% | Actionable alerts / total alerts |
| Time to first workflow | <15 min | User onboarding to first deployment |
| User satisfaction | ≥4/5 | Post-session survey |

---

# 27. Risk Register & Mitigation Strategies

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | **Scope explosion** | High | High | Anchor on one domain workflow; use studio framing as future vision |
| 2 | **Weak classification boundaries** | Medium | High | Confidence scores + human override + multi-path reasoning |
| 3 | **Overclaiming intelligence** | Medium | Medium | Always present as "reasoned proposal" not "correct answer" |
| 4 | **Observability noise** | Medium | Medium | Standardize logging early; tune alert thresholds aggressively |
| 5 | **Drift detection ambiguity** | Medium | Medium | Distinguish healthy adaptation from harmful drift via baselines |
| 6 | **Evaluation difficulty** | High | Medium | Pre-define success criteria; use baseline comparisons |
| 7 | **UI overload** | Medium | High | Progressive disclosure; layered detail (summary → detail → raw) |
| 8 | **LLM cost overruns** | Low | Medium | Token budgets per agent, cost limits per execution, caching |
| 9 | **MCP/A2A protocol instability** | Medium | Low | Abstract protocol layer behind clean interfaces |
| 10 | **Replit resource limits** | Low | Medium | Monitor usage; scale-up path via Neon/Supabase for database |

---

# 28. References & Links

## Course Materials
- Prof. Anand S. Rao, CMU Heinz College — Agent Based Modeling and Agentic Technology (Spring 2026)
- L1: Introduction and Evolution of ABM
- L2: Emergent & Programmed Behaviors (NetLogo, AnyLogic)
- L3: Large Language Models to Agentic AI
- L4: Designing Single Agent Systems
- L5: Memory, RAG, and Agent State
- L6: Designing and Building Multi-Agent Systems

## Primary Technology Documentation
- **GPT-5.4-mini:** https://developers.openai.com/api/docs/models/gpt-5.4-mini
- **LangGraph:** https://docs.langchain.com/oss/python/langgraph/overview
- **React Flow:** https://reactflow.dev
- **Zustand:** https://zustand.docs.pmnd.rs
- **Fastify:** https://fastify.io
- **tRPC:** https://trpc.io
- **Drizzle ORM:** https://orm.drizzle.team
- **ChromaDB:** https://docs.trychroma.com
- **Mem0:** https://docs.mem0.ai
- **Upstash Redis:** https://upstash.com/docs
- **Inngest:** https://www.inngest.com/docs
- **Langfuse:** https://langfuse.com/docs
- **Tremor:** https://tremor.so
- **Shadcn/ui:** https://ui.shadcn.com
- **ARWES:** https://arwes.dev
- **vite-plugin-pwa:** https://vite-pwa-org.netlify.app/guide

## Protocol Specifications
- **MCP Specification:** https://modelcontextprotocol.io/specification/2025-11-25
- **MCP Registry:** https://registry.modelcontextprotocol.io
- **MCP Servers (GitHub):** https://github.com/modelcontextprotocol/servers
- **MCP TypeScript SDK:** https://github.com/modelcontextprotocol/typescript-sdk
- **A2A Specification:** https://a2a-protocol.org/latest/specification
- **A2A GitHub:** https://github.com/a2aproject/A2A
- **A2A SDK:** https://a2a-protocol.org/latest/sdk

## NVIDIA Agent Ecosystem
- **NeMo Agent Toolkit:** https://developer.nvidia.com/nemo-agent-toolkit
- **NeMo Agent Toolkit GitHub:** https://github.com/NVIDIA/NeMo-Agent-Toolkit
- **OpenClaw:** https://build.nvidia.com/spark/openclaw
- **NemoClaw:** https://www.nvidia.com/en-us/ai/nemoclaw
- **OpenShell:** https://github.com/NVIDIA/OpenShell
- **NIM:** https://developer.nvidia.com/nim

## Agent Framework Documentation
- **Google ADK:** https://google.github.io/adk-docs
- **Google ADK + A2A:** https://google.github.io/adk-docs/a2a
- **OpenAI Agents SDK:** https://openai.github.io/openai-agents-python
- **CrewAI:** https://docs.crewai.com
- **Mastra:** https://mastra.ai
- **MS Semantic Kernel:** https://learn.microsoft.com/en-us/semantic-kernel

## Deployment & Hosting
- **Replit Deployments:** https://docs.replit.com/category/replit-deployments
- **Replit SQL Database:** https://docs.replit.com/cloud-services/storage-and-databases/sql-database
- **Replit Scheduled Deployments:** https://docs.replit.com/cloud-services/deployments/scheduled-deployments
- **Replit Custom Domains:** https://docs.replit.com/cloud-services/deployments/custom-domains
- **Replit Agent:** https://replit.com/products/agent
- **OpenAI Codex:** https://openai.com/codex

## Observability & Monitoring
- **Langfuse Self-Hosting:** https://langfuse.com/self-hosting
- **Langfuse Pricing:** https://langfuse.com/pricing
- **Helicone:** https://helicone.ai
- **Braintrust:** https://www.braintrust.dev
- **Arize Phoenix:** https://arize.com/docs/phoenix

## Academic References
- Xi, Zhiheng, et al. "The rise and potential of large language model based agents: A survey." arXiv:2309.07864 (2023)
- Wang, Lei, et al. "A survey on large language model based autonomous agents." arXiv:2308.11432 (2023)
- Cheng, Yuheng, et al. "Exploring large language model based intelligent agents." arXiv:2401.03428 (2024)
- Zhou, Jingwen, et al. "A taxonomy of architecture options for foundation model-based agents." arXiv:2408.02920 (2024)
- Park, Joon Sung, et al. "Generative agents: Interactive simulacra of human behavior." UIST 2023
- Hu, Yuyang, et al. "Memory in the Age of AI Agents: A Survey." arXiv, 2026
- Qu, Changle, et al. "Tool Learning with Large Language Models: A Survey." Frontiers in Computational Science, 2024
- Tran, Khanh-Tung, et al. "Multi-Agent Collaboration Mechanisms: A Survey of LLMs." arXiv:2501.06322 (2025)
- Zhang, Yadong, et al. "LLM as a Mastermind: A Survey of Strategic Reasoning." COLM 2024
- Anthropic. "Building Effective Agents." December 2024
- Lewis et al. "Retrieval-Augmented Generation." NeurIPS 2020

---

*This document is the living project bible for Promethean. It should be updated as design decisions are made, technologies evolve, and implementation progresses. Each section can be expanded independently as the team dives deeper into specific components.*

**Document Statistics:**
- ~28 major sections
- Complete course framework integration (L1-L6)
- 4 filled Agent System Specification Canvases
- 4 filled Agent Architecture Canvases
- 1 filled Multi-Agent System Specification Canvas
- 1 filled Multi-Agent Architecture Canvas
- 1 filled Archetype Triage Canvas
- Complete database schema (10 tables)
- Complete API specification (internal tRPC + external REST)
- Full project structure
- 5-phase implementation roadmap
- 10-risk register
- 80+ reference links

---

**END OF DOCUMENT**
