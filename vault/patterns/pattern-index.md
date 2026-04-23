---
type: index
id: pattern-index
tags: [patterns, orchestration]
---

# Orchestration Patterns

Reusable graph shapes and edge configurations. Edge types are defined in `VALID_EDGE_TYPES` (`schemas.ts`): `default | conditional | error | parallel | loop`.

| Pattern | Note |
|---------|------|
| Sequential default flow | trivial — `type: "default"` |
| Parallel fan-out / fan-in | [[pattern-parallel]] |
| Conditional branching | [[pattern-conditional]] |
| Error handlers | [[pattern-error-handling]] |
| Retries with backoff | [[pattern-retries]] |
| Human gate flow | [[pattern-human-gate]] |
