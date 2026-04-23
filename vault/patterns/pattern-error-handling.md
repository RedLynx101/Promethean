---
type: pattern
id: pattern-error-handling
tags: [patterns, error-handling]
linksTo: [pattern-index, pattern-retries]
---

# Error Handlers

Use `edge.type: "error"` to mark a branch that's only taken when the source node throws or returns an error.

## Shape

```
       A ─(default)─→ B
       A ─(error)──→ X (handler)
```

## Per-node error handling

Set `node.data.errorHandling` to a string describing the strategy: `"retry-3x"`, `"fallback-to-l0-rule"`, `"alert-and-skip"`, `"alert-and-fail"`.

The agent emitting the runtime artifact translates this into framework-specific code (try/except, LangGraph error edges, n8n `On Error` connectors).

## Standard handlers

| Strategy | When |
|----------|------|
| `alert-and-fail` | Default. Mark execution failed, fire alert. |
| `alert-and-skip` | Best-effort step (e.g., enrichment that's nice-to-have). |
| `fallback-to-l0` | An LLM step's L0 backup (e.g., regex if classifier fails). |
| `retry-with-backoff` | Transient failures — see [[pattern-retries]]. |
| `route-to-human-gate` | High-stakes — see [[pattern-human-gate]]. |
