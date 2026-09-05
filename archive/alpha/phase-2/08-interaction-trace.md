# PROMETHEAN — Interaction Trace / Walkthrough

### Phase 2 Deliverable | Track A: Technical Build
### April 2026

---

## Overview

This document traces a complete workflow through Promethean's 4-agent pipeline, showing the actual data structures passed between stages. The example uses a **CRM Lead Qualification** workflow — a realistic enterprise use case that exercises all four agents and demonstrates the progressive enrichment of the workflow definition.

---

## User Input

The user submits the following through the Workflow Wizard:

```json
{
  "workflowId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "description": "When a new lead comes in through the website form, validate the email format and check for duplicates in the CRM database. Score the lead based on company size, industry match, and recent engagement signals. If the lead score is above 80, generate a personalized outreach summary and route to the appropriate sales rep. If below 40, add to the automated nurture email campaign. For scores between 40-80, flag for manual review by the sales manager.",
  "domain": "CRM",
  "constraints": {
    "budget": "$0.10 per lead",
    "maxLatency": "30 seconds",
    "riskTolerance": "low"
  }
}
```

**API Call:** `POST /api/pipeline/start`

---

## Stage 1: Decomposition Agent Output

The Decomposition Agent receives the natural-language description and produces a structured task graph.

**What the agent does:** Breaks the workflow into 8 atomic substeps with logical dependencies.

```json
{
  "nodes": [
    {
      "id": "trigger-lead-intake",
      "type": "custom",
      "position": { "x": 100, "y": 300 },
      "data": {
        "label": "Receive Lead Submission",
        "description": "Capture incoming lead data from the website form including name, email, company, and source",
        "status": "idle"
      }
    },
    {
      "id": "validate-email",
      "type": "custom",
      "position": { "x": 350, "y": 300 },
      "data": {
        "label": "Validate Email Format",
        "description": "Check that the submitted email address matches valid email format patterns and is not from a disposable email provider",
        "status": "idle"
      }
    },
    {
      "id": "check-duplicates",
      "type": "custom",
      "position": { "x": 600, "y": 300 },
      "data": {
        "label": "Check CRM Duplicates",
        "description": "Query the CRM database to check if this email or company already exists as a lead or customer",
        "status": "idle"
      }
    },
    {
      "id": "score-lead",
      "type": "custom",
      "position": { "x": 850, "y": 300 },
      "data": {
        "label": "Score Lead",
        "description": "Calculate a lead score (0-100) based on company size, industry match against ideal customer profile, and recent engagement signals such as page views and content downloads",
        "status": "idle"
      }
    },
    {
      "id": "route-high-score",
      "type": "custom",
      "position": { "x": 1100, "y": 100 },
      "data": {
        "label": "Route to Sales Rep",
        "description": "For leads scoring above 80, identify the appropriate sales rep based on territory and specialization and assign the lead",
        "status": "idle"
      }
    },
    {
      "id": "generate-summary",
      "type": "custom",
      "position": { "x": 1350, "y": 100 },
      "data": {
        "label": "Generate Outreach Summary",
        "description": "Create a personalized outreach summary for the sales rep including key company facts, engagement history, and suggested talking points",
        "status": "idle"
      }
    },
    {
      "id": "add-to-nurture",
      "type": "custom",
      "position": { "x": 1100, "y": 500 },
      "data": {
        "label": "Add to Nurture Campaign",
        "description": "For leads scoring below 40, enroll in the automated email nurture sequence based on their industry and interest signals",
        "status": "idle"
      }
    },
    {
      "id": "flag-manual-review",
      "type": "custom",
      "position": { "x": 1100, "y": 300 },
      "data": {
        "label": "Flag for Manual Review",
        "description": "For leads scoring between 40-80, create a task for the sales manager to manually evaluate and decide on routing",
        "status": "idle"
      }
    }
  ],
  "edges": [
    { "id": "e-1-2", "source": "trigger-lead-intake", "target": "validate-email", "type": "default", "data": { "label": "on submission" } },
    { "id": "e-2-3", "source": "validate-email", "target": "check-duplicates", "type": "default", "data": { "label": "valid email" } },
    { "id": "e-3-4", "source": "check-duplicates", "target": "score-lead", "type": "default", "data": { "label": "not duplicate" } },
    { "id": "e-4-5", "source": "score-lead", "target": "route-high-score", "type": "default", "data": { "label": "score > 80" } },
    { "id": "e-5-6", "source": "route-high-score", "target": "generate-summary", "type": "default", "data": { "label": "rep assigned" } },
    { "id": "e-4-7", "source": "score-lead", "target": "add-to-nurture", "type": "default", "data": { "label": "score < 40" } },
    { "id": "e-4-8", "source": "score-lead", "target": "flag-manual-review", "type": "default", "data": { "label": "40 <= score <= 80" } }
  ],
  "summary": "CRM lead qualification pipeline with 8 steps: intake, validation, deduplication, scoring, and three-way routing based on score thresholds (high → sales rep with summary, low → nurture campaign, mid → manual review)."
}
```

**Database update:** `workflows.phase = "decompose"`, `workflows.status = "awaiting_approval"`

**Human reviews in Visual Editor** → sees 8 nodes with connecting edges → **APPROVES**

**API Call:** `POST /api/pipeline/:id/approve` with `{ "phase": "decompose" }`

---

## Stage 2: System Selection Agent Output

The System Selection Agent receives the 8 nodes and classifies each on the L0–L5 spectrum.

**What the agent does:** Evaluates each step starting at L0, only increasing the level when the task genuinely requires it.

```json
{
  "nodes": [
    {
      "id": "trigger-lead-intake",
      "type": "custom",
      "position": { "x": 100, "y": 300 },
      "data": {
        "label": "Receive Lead Submission",
        "description": "Capture incoming lead data from the website form",
        "systemLevel": 0,
        "confidence": 98,
        "rationale": "This is a pure data capture step — receiving form data and storing it. No intelligence required. A simple webhook or form handler with input sanitization is sufficient. L0 deterministic automation.",
        "tools": [],
        "status": "idle"
      }
    },
    {
      "id": "validate-email",
      "type": "custom",
      "position": { "x": 350, "y": 300 },
      "data": {
        "label": "Validate Email Format",
        "description": "Check email format and disposable provider list",
        "systemLevel": 0,
        "confidence": 97,
        "rationale": "Email validation is a deterministic operation — regex pattern matching against RFC 5322 and lookup against a known disposable email provider list. No ambiguity, no AI needed. L0.",
        "tools": [],
        "status": "idle"
      }
    },
    {
      "id": "check-duplicates",
      "type": "custom",
      "position": { "x": 600, "y": 300 },
      "data": {
        "label": "Check CRM Duplicates",
        "description": "Query CRM database for existing records",
        "systemLevel": 0,
        "confidence": 95,
        "rationale": "Duplicate detection is a database query — exact match on email or fuzzy match on company name. This can be handled with SQL queries and string similarity functions. No ML or language understanding needed. L0.",
        "tools": [],
        "status": "idle"
      }
    },
    {
      "id": "score-lead",
      "type": "custom",
      "position": { "x": 850, "y": 300 },
      "data": {
        "label": "Score Lead",
        "description": "Calculate lead score based on multiple signals",
        "systemLevel": 1,
        "confidence": 82,
        "rationale": "Lead scoring combines multiple signals (company size, industry match, engagement) into a single score. While a simple weighted formula (L0) could work, the engagement signals introduce variability that benefits from a trained ML model. A lightweight classification or regression model provides better accuracy than fixed rules. L1 — supervised ML, not language understanding.",
        "tools": [],
        "status": "idle"
      }
    },
    {
      "id": "route-high-score",
      "type": "custom",
      "position": { "x": 1100, "y": 100 },
      "data": {
        "label": "Route to Sales Rep",
        "description": "Assign lead to appropriate sales rep based on territory",
        "systemLevel": 0,
        "confidence": 93,
        "rationale": "Sales rep routing is a deterministic lookup — match the lead's territory/industry to a sales rep assignment table. Pure rules-based routing. L0.",
        "tools": [],
        "status": "idle"
      }
    },
    {
      "id": "generate-summary",
      "type": "custom",
      "position": { "x": 1350, "y": 100 },
      "data": {
        "label": "Generate Outreach Summary",
        "description": "Create personalized summary with talking points",
        "systemLevel": 3,
        "confidence": 90,
        "rationale": "Generating a personalized outreach summary requires natural language generation — synthesizing company facts, engagement history, and industry context into coherent, personalized text. This is a single LLM call (summarize + personalize). No tool use needed, no multi-agent coordination. L3 — single LLM agent.",
        "tools": [],
        "status": "idle"
      }
    },
    {
      "id": "add-to-nurture",
      "type": "custom",
      "position": { "x": 1100, "y": 500 },
      "data": {
        "label": "Add to Nurture Campaign",
        "description": "Enroll lead in automated email sequence",
        "systemLevel": 0,
        "confidence": 96,
        "rationale": "Adding a lead to a nurture campaign is an API call to the email marketing platform with the lead's data and segment ID. Deterministic, no ambiguity. L0.",
        "tools": [],
        "status": "idle"
      }
    },
    {
      "id": "flag-manual-review",
      "type": "custom",
      "position": { "x": 1100, "y": 300 },
      "data": {
        "label": "Flag for Manual Review",
        "description": "Create task for sales manager review",
        "systemLevel": 0,
        "confidence": 97,
        "rationale": "Creating a review task is a deterministic operation — insert a record into the task management system with the lead data and score. No intelligence needed. L0.",
        "tools": [],
        "status": "idle"
      }
    }
  ],
  "edges": [
    { "id": "e-1-2", "source": "trigger-lead-intake", "target": "validate-email", "type": "default", "data": { "label": "on submission" } },
    { "id": "e-2-3", "source": "validate-email", "target": "check-duplicates", "type": "default", "data": { "label": "valid email" } },
    { "id": "e-3-4", "source": "check-duplicates", "target": "score-lead", "type": "default", "data": { "label": "not duplicate" } },
    { "id": "e-4-5", "source": "score-lead", "target": "route-high-score", "type": "default", "data": { "label": "score > 80" } },
    { "id": "e-5-6", "source": "route-high-score", "target": "generate-summary", "type": "default", "data": { "label": "rep assigned" } },
    { "id": "e-4-7", "source": "score-lead", "target": "add-to-nurture", "type": "default", "data": { "label": "score < 40" } },
    { "id": "e-4-8", "source": "score-lead", "target": "flag-manual-review", "type": "default", "data": { "label": "40 <= score <= 80" } }
  ],
  "summary": "CRM lead qualification pipeline classified predominantly at L0 (6 of 8 steps). Only lead scoring requires supervised ML (L1) and outreach summary generation requires an LLM (L3). This distribution confirms that most CRM workflows are deterministic — the 'agent everywhere' approach would over-engineer 75% of the steps.",
  "systemTypeSummary": { "L0": 6, "L1": 1, "L3": 1 },
  "estimatedCostPerRun": 0.003,
  "estimatedLatencyMs": 4500
}
```

**Key observation:** 6 of 8 steps (75%) are classified as L0. Only 2 steps require any form of AI. This demonstrates Promethean's core value — right-sizing automation.

**Human reviews** → sees color-coded nodes, checks rationale for L1 and L3 → **APPROVES**

---

## Stage 3: Orchestration Agent Output

The Orchestration Agent enriches each step with tool bindings, error handling, and refined edge conditions.

**What the agent does:** Binds specific implementation tools to each step and adds error/retry paths.

```json
{
  "nodes": [
    {
      "id": "trigger-lead-intake",
      "type": "custom",
      "position": { "x": 100, "y": 300 },
      "data": {
        "label": "Receive Lead Submission",
        "description": "Capture incoming lead data from the website form",
        "systemLevel": 0,
        "confidence": 98,
        "rationale": "Pure data capture — webhook handler with input sanitization.",
        "tools": ["express-webhook", "zod-validation", "sanitize-html"],
        "conditions": ["Form submission received via POST"],
        "errorHandling": "Return 400 with validation errors if required fields are missing. Log malformed requests.",
        "status": "idle"
      }
    },
    {
      "id": "validate-email",
      "type": "custom",
      "position": { "x": 350, "y": 300 },
      "data": {
        "label": "Validate Email Format",
        "description": "RFC 5322 regex validation + disposable provider check",
        "systemLevel": 0,
        "confidence": 97,
        "rationale": "Deterministic regex + list lookup.",
        "tools": ["email-validator", "disposable-email-domains"],
        "conditions": ["Email field is present and non-empty"],
        "errorHandling": "If email is invalid, reject the lead with a specific error code. Do not proceed to duplicate check.",
        "status": "idle"
      }
    },
    {
      "id": "check-duplicates",
      "type": "custom",
      "position": { "x": 600, "y": 300 },
      "data": {
        "label": "Check CRM Duplicates",
        "description": "SQL query for exact email match + fuzzy company name match",
        "systemLevel": 0,
        "confidence": 95,
        "rationale": "Database query with string similarity.",
        "tools": ["postgresql", "pg-trgm-similarity"],
        "conditions": ["Email validated successfully"],
        "errorHandling": "If CRM database is unreachable, queue the lead for retry in 60 seconds. Max 3 retries.",
        "status": "idle"
      }
    },
    {
      "id": "score-lead",
      "type": "custom",
      "position": { "x": 850, "y": 300 },
      "data": {
        "label": "Score Lead",
        "description": "ML model scoring based on company size, industry, engagement",
        "systemLevel": 1,
        "confidence": 82,
        "rationale": "Trained regression model for multi-signal scoring.",
        "tools": ["sklearn-gradient-boost", "feature-engineering-pipeline"],
        "conditions": ["Lead is not a duplicate"],
        "errorHandling": "If ML model fails, fall back to a weighted formula (company_size * 0.4 + industry_match * 0.3 + engagement * 0.3). Log the fallback.",
        "status": "idle"
      }
    },
    {
      "id": "route-high-score",
      "type": "custom",
      "position": { "x": 1100, "y": 100 },
      "data": {
        "label": "Route to Sales Rep",
        "description": "Territory and specialization-based rep assignment",
        "systemLevel": 0,
        "confidence": 93,
        "rationale": "Deterministic lookup table.",
        "tools": ["crm-api", "territory-mapping-table"],
        "conditions": ["Lead score > 80"],
        "errorHandling": "If no rep matches the territory, assign to default sales manager and create an alert.",
        "status": "idle"
      }
    },
    {
      "id": "generate-summary",
      "type": "custom",
      "position": { "x": 1350, "y": 100 },
      "data": {
        "label": "Generate Outreach Summary",
        "description": "LLM-generated personalized summary with talking points",
        "systemLevel": 3,
        "confidence": 90,
        "rationale": "Single LLM call for text generation.",
        "tools": ["openai-chat-completions", "prompt-template-library"],
        "conditions": ["Sales rep assigned successfully"],
        "errorHandling": "If LLM call fails, use a template-based summary with placeholders filled from lead data. Log the fallback.",
        "status": "idle"
      }
    },
    {
      "id": "add-to-nurture",
      "type": "custom",
      "position": { "x": 1100, "y": 500 },
      "data": {
        "label": "Add to Nurture Campaign",
        "description": "API call to email marketing platform",
        "systemLevel": 0,
        "confidence": 96,
        "rationale": "Deterministic API call.",
        "tools": ["mailchimp-api", "segment-selector"],
        "conditions": ["Lead score < 40"],
        "errorHandling": "If email platform API fails, queue for retry. Max 3 retries with exponential backoff.",
        "status": "idle"
      }
    },
    {
      "id": "flag-manual-review",
      "type": "custom",
      "position": { "x": 1100, "y": 300 },
      "data": {
        "label": "Flag for Manual Review",
        "description": "Create task in task management system",
        "systemLevel": 0,
        "confidence": 97,
        "rationale": "Deterministic task creation.",
        "tools": ["task-management-api", "notification-service"],
        "conditions": ["40 <= lead score <= 80"],
        "errorHandling": "If task creation fails, send a direct email notification to the sales manager as fallback.",
        "status": "idle"
      }
    }
  ],
  "edges": [
    { "id": "e-1-2", "source": "trigger-lead-intake", "target": "validate-email", "type": "default", "data": { "label": "on submission", "condition": null } },
    { "id": "e-2-3", "source": "validate-email", "target": "check-duplicates", "type": "conditional", "data": { "label": "valid email", "condition": "email_valid === true" } },
    { "id": "e-2-err", "source": "validate-email", "target": "trigger-lead-intake", "type": "error", "data": { "label": "invalid email", "condition": "email_valid === false" } },
    { "id": "e-3-4", "source": "check-duplicates", "target": "score-lead", "type": "conditional", "data": { "label": "not duplicate", "condition": "is_duplicate === false" } },
    { "id": "e-4-5", "source": "score-lead", "target": "route-high-score", "type": "conditional", "data": { "label": "high score", "condition": "lead_score > 80" } },
    { "id": "e-5-6", "source": "route-high-score", "target": "generate-summary", "type": "default", "data": { "label": "rep assigned", "condition": null } },
    { "id": "e-4-7", "source": "score-lead", "target": "add-to-nurture", "type": "conditional", "data": { "label": "low score", "condition": "lead_score < 40" } },
    { "id": "e-4-8", "source": "score-lead", "target": "flag-manual-review", "type": "conditional", "data": { "label": "mid score", "condition": "lead_score >= 40 && lead_score <= 80" } }
  ],
  "summary": "Orchestrated CRM lead qualification with specific tool bindings for each step. Added error handling paths including ML model fallback to weighted formula, LLM fallback to template summaries, and retry logic for external API calls. Edge types refined to conditional for score-based routing."
}
```

**Human reviews** → checks tool bindings and error handling strategies → **APPROVES**

---

## Stage 4: Governance Agent Output

The Governance Agent analyzes the workflow's risk profile and configures monitoring.

**What the agent does:** Sets logging levels, alert thresholds, and monitoring configuration based on the workflow's automation levels and domain.

```json
{
  "nodes": [
    ...
  ],
  "edges": [
    ...
  ],
  "governanceConfig": {
    "loggingLevel": "standard",
    "autoSnapshot": true,
    "latencyThreshold": 30000,
    "costThreshold": 0.10,
    "errorRateThreshold": 0.03,
    "alertChannels": ["slack", "email"],
    "costLimitPerRun": 0.25,
    "executionTimeoutMs": 60000
  },
  "summary": "CRM lead qualification is a low-to-moderate risk workflow. Most steps are L0 deterministic with well-defined failure modes. The L1 scoring model and L3 summary generation are the primary risk areas. Standard logging is sufficient — the workflow processes non-sensitive business data. Cost threshold set at $0.10 matching the user's budget constraint. Error rate threshold at 3% is tight given that lead misrouting has business impact. 60-second timeout is generous for an 8-step pipeline where 6 steps are instant. Slack + email alerts provide adequate coverage for a CRM team."
}
```

**Human reviews** → adjusts cost threshold if needed → **APPROVES**

**Final approval triggers:**
1. `workflows.phase = "deployed"`, `workflows.status = "active"`
2. Version snapshot inserted into `workflow_versions`

---

## Analysis: Why Multi-Agent Architecture?

### Why Not a Single Agent?

A single-agent approach would combine decomposition, classification, orchestration, and governance into one massive prompt. Problems:

1. **Conflated concerns:** A single agent might skip decomposition and jump straight to tool selection, producing less structured output
2. **Reduced auditability:** With one agent, you cannot trace which reasoning step produced a poor classification
3. **No intermediate review:** The human cannot inspect and correct intermediate outputs
4. **Prompt complexity:** A single prompt handling all four tasks would be extremely long and prone to instruction-following failures

### Why Not a Deterministic Pipeline (No AI)?

A purely deterministic system could not handle the core challenges:

1. **Natural language interpretation:** Decomposing "handle customer issues" into structured steps requires language understanding
2. **Adaptive classification:** The L0–L5 rubric requires contextual judgment about each step's complexity
3. **Creative orchestration:** Identifying parallel execution opportunities and appropriate tool bindings requires reasoning
4. **Risk-aware governance:** Setting appropriate thresholds based on domain and workflow characteristics requires contextual analysis

### Why This Architecture Is the Right Fit

Promethean's 4-agent sequential pipeline is the **least sufficient architecture** for this problem:

- **4 agents, not 6 or 10** — each agent maps to a distinct, necessary reasoning task
- **Sequential, not parallel** — each agent builds on the previous agent's output
- **Structured handoffs, not free-form** — JSON data structures ensure reliable communication
- **Human gates, not autonomous** — every transition requires human approval
- **Bounded, not open-ended** — each agent has a constrained scope and clear stopping conditions

This architecture scores well against the course framework's principle: *"The goal is fit, not sophistication. The best design is the simplest architecture that reliably meets the task."*
