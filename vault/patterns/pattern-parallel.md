---
type: pattern
id: pattern-parallel
tags: [patterns, parallel]
linksTo: [pattern-index]
---

# Parallel Fan-out / Fan-in

Use `edge.type: "parallel"` to mark branches that should execute concurrently.

## Shape

```
                ┌─→ B ─┐
       A ─────→ ┤      ├─→ D
                └─→ C ─┘
```

A produces output. B and C consume it independently and run concurrently. D waits for both.

## When to use

- Independent enrichment / analysis steps with no data dependency between them.
- Latency-sensitive workflows where serial execution would blow the [[governance-latency]] budget.

## Examples in templates

- Static analysis + security scan + complexity scoring run in parallel from the PR webhook in [[template-code-review-pipeline]].
- Schema validation + statistical profiling in [[template-data-quality-check]].
- Intent + sentiment classifiers in [[template-customer-support-triage]].

## Gotchas

- The fan-in node receives **all** parallel outputs as separate inputs — design its input schema to merge them.
- Cost adds linearly across branches; latency is `max()` not `sum()`.
- Failure semantics: configure whether one branch failing fails the whole join, or whether the join proceeds with partial inputs (depends on workflow).
