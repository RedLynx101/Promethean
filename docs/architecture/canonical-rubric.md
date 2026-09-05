# Canonical system rubric · 2.0

Choose the least complex implementation that satisfies the declared acceptance cases and constraints. First consider a clearer procedure, an existing tool feature or a deterministic transformation. “No automation yet” is a useful diagnostic result.

| View | Implementation                          | Appropriate evidence                                              |
| ---- | --------------------------------------- | ----------------------------------------------------------------- |
| L0   | Deterministic rules and transformations | Explicit rules, known fields, reproducible outcomes               |
| L1   | One bounded model task                  | Semantic interpretation needed; structured outputs can be checked |
| L2   | Human-directed assistant                | A person directs meaningful actions and resolves ambiguity        |
| L3   | Fixed workflow containing model tasks   | Stable sequence; each model task has a contract                   |
| L4   | Bounded tool-using agent                | Tool choice adds measured value over a fixed sequence             |
| L5   | Coordinating specialized agents         | Independent/specialized work earns its coordination cost          |

Manual process clarification sits outside L0–L5. These are explanatory architecture categories, not a maturity score, calibrated probability, autonomy level or permission grant. Human approval and effect permissions are separate runtime controls. A deterministic system can be dangerous if given broad authority; a capable agent can remain read-only.

The alpha project bible and implementation disagreed about L1–L4. Version 2 follows the bible's application/assistant/fixed-workflow/tool-agent distinction. Alpha traces remain under their original labels and source revision `3029924`; no historical classifications were silently migrated.

The authoritative catalog is `packages/core/src/catalog.ts`. Both the GUI and Codex CLI consume it. Node requirements, concise decision rationales, source IDs and alternatives are public design records, not hidden model reasoning. Case IDs are links to intended acceptance evidence: only recorded comparison outcomes establish whether a case passed.

Missing data, conflicting sources, vague requests and unsupported operations remain unresolved. Broader model-generated plans must not imply a runtime implementation exists. Current installed operations are documented in `packages/core/README.md`. Expand that catalog with explicit contracts and tests when a real use case warrants it.

The included cases are small, synthetic examples. A candidate passing them qualifies only for those declared cases. Measure production distributions, error costs, review effort and maintenance before deployment; token cost alone does not establish the best architecture.
