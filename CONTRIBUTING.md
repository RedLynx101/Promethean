# Contributing

Use Node 24 and pnpm 10, install from the root lockfile, then run `pnpm dev`. Maintained code lives in `apps/` and `packages/`; `archive/alpha/` is historical evidence and excluded from the active workspace.

Begin a change with an observable workflow outcome and a representative normal case plus an exception. Keep the shared contracts and runtime validator aligned. Run typecheck, lint, deterministic tests, build and the browser journeys before proposing integration. Ordinary tests must work without a key or network model access. Add tests for meaningful invariants, not implementation details.

Keep patches bound to source revisions. Graph layout belongs in the view, not execution meaning. A new adapter must declare input/output schemas, approval and idempotency behavior, timeout/cancellation and ambiguous-outcome handling. Never execute arbitrary code in the server or treat imported descriptions as instructions. Include data provenance and a migration strategy for stored definitions.

Screenshots and fixtures must use synthetic data. Do not commit keys, local databases, personal workflow inputs, provider logs, or unreviewed exports. State exactly what was tested and whether a provider operation is local, sandboxed or live. Do not call a build deployed.

Keep PRs scoped and describe the problem, resulting behavior and evidence. Preserve attribution. See the [AI-use disclosure](AI_USAGE.md) for this project's development record.
