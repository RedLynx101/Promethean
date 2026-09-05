# Shared workflow core

`@promethean/core` is the UI-independent contract used by the web API, worker, and Codex CLI. It has no credentials and performs no external actions.

- `types.ts` and `schema.ts`: transport types and strict request/definition validation.
- `catalog.ts`: rubric 2.0, curated evidence, a synthetic support corpus, and three example definitions with common acceptance cases.
- `diagnosis.ts`: deterministic intake. Unsupported or vague input produces focused questions and an explicitly non-executable brief. Recognized installed recipes remain unresolved until their assumptions and acceptance cases are reviewed.
- `validation.ts`: graph identity/references, acyclic traversal, required-field dataflow, installed operation checks, and approval dominance on every outbox path.
- `execution.ts`: actual CSV normalization, classifiers, policy retrieval, drafts, and the independent subset-field grader. Local test execution suppresses approval and outbox effects.
- `portable.ts`: canonical SHA-256 packages, semantic import checks, evidence consistency, and safe export defaults.

## Contract boundaries

L0–L5 describes implementation capability. `manual` is a valid result outside that scale. Neither a level nor a model's confidence grants permission to act. The original alpha's alternative level names remain under `archive/alpha` with their original provenance.

The installed runtime handles a bounded acyclic graph with at most one reviewed local-outbox action. There is no generated-code evaluator, arbitrary shell, HTTP tool, remote knowledge crawler, or external mail sender. New operations need explicit schemas, dataflow rules, execution code, and meaningful tests.

The two local candidates are different implementations: strict CSV parsing versus normalization, direct keywords versus expanded phrase rules, and title matching versus keyword retrieval. Their fixtures are small synthetic acceptance sets, not a production benchmark. Triage deliberately contains an unsupported specialist requirement so neither baseline earns an unjustified all-pass recommendation.

Exports include workflow descriptions/configuration because these are part of the definition. Review that text before sharing. Arbitrary run inputs, traces, and custom test fixtures are omitted; unchanged curated synthetic tests remain executable. Secret-field and common credential-pattern checks add protection but do not classify every form of private prose. A checksum proves content consistency, not authorship or trust. Imported comparison claims must be rerun before enabling the imported workflow.

## Verification

From the repository root, `pnpm exec vitest run packages/core/src/core.test.ts` exercises semantic failures, baseline discrimination, honest intake, source-grounded outputs, portable round trips, and privacy defaults.
