---
type: pattern
id: pattern-conditional
tags: [patterns, branching]
linksTo: [pattern-index]
---

# Conditional Branching

Use `edge.type: "conditional"` with `edge.data.condition` set to the expression that must be truthy for this edge to be taken.

## Shape

```
       A ─→ ?
            ├─(if hot) → notify-rep
            └─(else)   → store-only
```

## Condition expressions

Currently free-form strings (e.g., `"score >= 80"`, `"severity === 'critical'"`). The runtime is responsible for evaluating them against the upstream node's output payload.

For executable artifacts (LangGraph, n8n), the agent emitting the artifact must translate the condition string into the target framework's idiom.

## Examples in templates

- `if hot lead` (`score >= 80`) → notify in [[template-crm-lead-qualification]]
- `if critical` (`severity === 'critical'`) → SOC escalation in [[template-cybersecurity-incident-response]]
- `if quality < 90%` (`qualityScore < 90`) → page data team in [[template-data-quality-check]]

## Anti-patterns

- Conditional logic spread across many edges that could collapse into a single L0 routing node.
- Conditions that depend on multiple upstream nodes — flatten via a routing node first.
