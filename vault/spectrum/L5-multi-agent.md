---
type: spectrum-level
id: L5-multi-agent
level: 5
color: "#E91E63"
tags: [spectrum, llm, multi-agent, agentic]
linksTo: [spectrum-index, L4-tool-augmented-llm, HumanGate]
---

# L5 — Multi-Agent Orchestration

Multiple **specialised agents** collaborating with handoffs, complex reasoning, emergent behaviour. Each sub-agent has its own role, prompt, and (often) tool allowlist.

## When to use

- The task genuinely decomposes into specialised roles whose context shouldn't be merged (e.g., "architecture reviewer" vs. "security reviewer" vs. "style reviewer").
- A single L4 agent's context window or prompt becomes unmanageable.
- You need parallel exploration of approaches with a synthesiser at the end.

## Typical tools

`langgraph`, `crewai`, `autogen`, `openai.swarm`, `anthropic.claude-code-sdk` (for harnessed agents), custom orchestration on top of L4 primitives.

## Cost / latency profile

- **Cost:** $0.10–$10+ per run. Each sub-agent multiplies cost.
- **Latency:** 30s–10min typical. Parallelise sub-agents wherever the data dependencies allow.
- **Confidence:** depends on the synthesiser — the final agent reconciling sub-agent outputs is the bottleneck.

## Required guardrails

- **Hard cost cap** + **execution timeout** — see [[governance-cost-limit]] and [[governance-execution-timeout]].
- **Sub-agent isolation** — each agent gets only the tools and context it needs.
- **[[HumanGate]] before destructive actions** is effectively mandatory.
- Trace every sub-agent call individually for debugging.

## Anti-patterns

- "More agents = better" — L5 is the most expensive level and most failure-prone. Justify it.
- Giving every sub-agent access to every tool. Scope them.
- Skipping the synthesiser step — you'll get conflicting outputs with no resolution.

## Examples in templates

- AI Code Review (architecture + security + style sub-agents) in [[template-code-review-pipeline]].
