# Verification record · September 5, 2026

This record captures local v2 verification based on alpha commit `3029924`. All evaluation inputs below are synthetic. Repository publication and GitHub Actions status are visible in the [commit history](https://github.com/RedLynx101/Promethean/commits/main/) and [verification workflow](https://github.com/RedLynx101/Promethean/actions/workflows/ci.yml); source publication does not imply hosted application deployment.

The [release audit](evaluation/release-audit.json) verifies 531 archived tracked files against that baseline: 155 exact Git blob matches and 376 matches after normalizing Windows checkout line endings. No content mismatches or missing maintained Markdown file links were found. The record also includes SHA-256 hashes for maintained deliverables; it does not certify historical claims inside the archive.

## Reproduced checks

| Check                                    | Observed result                                                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen-lockfile installation             | Passed locally with Node 24.11.1 and pnpm 10.28.2                                                                                      |
| TypeScript                               | Passed across apps, packages, tooling and browser tests                                                                                |
| ESLint                                   | Passed with no errors or warnings                                                                                                      |
| Deterministic/API/SDK-boundary/CLI suite | 56 tests passed across 5 files                                                                                                         |
| Browser journeys                         | 3 passed using installed Chrome in a separate automation profile                                                                       |
| Accessibility                            | No Axe WCAG A/AA violations on tested desktop light/dark and 390px mobile studio states; keyboard dialog and mobile navigation checked |
| Production web build                     | Passed; approximately 439 KB JavaScript / 139 KB gzip before transport                                                                 |
| Skill validation                         | Skill Creator validator reported “Skill is valid!”; shared CLI behavior and six skill scenarios reviewed                               |
| Real provider checks                     | Luna structured diagnosis, triage, tool-backed retrieval and drafting passed                                                           |
| Portable packages                        | All three validated and executed from separate directories; expected triage failure remained visible                                   |
| Prepared no-key demo                     | Actual local comparisons, failed/corrected CSV run and denied triage run persisted for replay                                          |

Browser coverage includes custom diagnosis without fabricated cases, structured brief clarification, authored acceptance cases, comparison, step-list/graph provenance, review-before-save, failure inspection, zero-mutation replay, corrected-revision retry, export, workflow status gating and approval denial. Screenshots were manually inspected. This is focused automated accessibility coverage, not a complete assistive-technology audit.

Core/runtime tests exercise invalid graph references, cycles, unsupported operations, approval bypass paths, dataflow, stale changes, constraints, empty assertions, duplicate requests, cancellation, denial, restart recovery, exact-action approval, worker ownership, budget exhaustion, invalid-key preflight and export privacy/integrity. Model cancellation tests use a test double; actual model behavior is evidenced separately below.

## Measured architecture comparison

The evaluator is `expected-fields-2.0`, rubric `2.0`; each workflow was compared at revision 1. Exact cases, outputs, source/model identifiers, usage and checksums are retained in the [example packages](../examples/) and [machine-readable result ledger](evaluation/example-results.json). Cases are demonstration fixtures, not a held-out production benchmark or statistically sufficient accuracy study.

| Workflow | Implementation       | Cases passed | Total latency | Model tokens (in/out) | Calculated model cost |
| -------- | -------------------- | ------------ | ------------- | --------------------- | --------------------- |
| CSV      | Strict rules         | 2 / 3        | 8.8 ms        | 0 / 0                 | $0                    |
| CSV      | Normalized rules     | 3 / 3        | 7.0 ms        | 0 / 0                 | $0                    |
| Triage   | Simple rules         | 2 / 4        | 15.1 ms       | 0 / 0                 | $0                    |
| Triage   | Expanded rules       | 3 / 4        | 16.1 ms       | 0 / 0                 | $0                    |
| Triage   | Luna workflow        | 3 / 4        | 15.04 s       | 1,297 / 481           | $0.0008366            |
| Support  | Exact title matching | 2 / 3        | 18.2 ms       | 0 / 0                 | $0                    |
| Support  | Keyword retrieval    | 3 / 3        | 21.8 ms       | 0 / 0                 | $0                    |
| Support  | Luna tool workflow   | 3 / 3        | 14.11 s       | 2,532 / 420           | $0.0010104            |

Normalization is sufficient for the declared CSV examples. The support examples do not demonstrate a benefit from replacing keyword retrieval with a model; broader phrasing may change that result. The triage specialist case exceeds every candidate's installed taxonomy: none qualifies, including Luna. Repairing the process or taxonomy is the appropriate next step.

These latencies include the local persisted case execution and are totals across each set, not per-request averages or production percentiles. Model cost uses reported tokens and the configured price table, including reported caching details when available. It excludes the cost of Codex development, human review and infrastructure. Standard text prices were checked against the official [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna) and [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra) model pages. Output and timings can change on a stochastic rerun.

The initial three live SDK checks cost $0.0014158. Full comparison added $0.0018470, bringing this task's cumulative recorded application API cost to **$0.0032628**, with **$0 reserved** against the $5 ceiling. Comparison suppressed all outbox effects. The standalone live workflow checks denied their prepared actions. No real messages were sent.

## Independent held-out cases

A separate agent authored eight new synthetic cases from the declared taxonomy and corpus, without reading the implementations, prompts or existing cases. Expected fields were frozen before execution. The implementation and prompts were not tuned to these answers. The exact [case file](../evals/heldout-v1.json), its SHA-256, all outputs and measurements are preserved in the [held-out result record](evaluation/heldout-results.json).

| Workflow                | Simple rules | Expanded rules / keyword retrieval | Luna workflow |
| ----------------------- | ------------ | ---------------------------------- | ------------- |
| Request triage          | 1 / 4        | 2 / 4                              | 4 / 4         |
| Source-grounded support | 3 / 4        | 4 / 4                              | 4 / 4         |

The unseen triage paraphrases demonstrate a measured benefit from semantic classification under the declared taxonomy. The support cases still favor the simpler retrieval implementation on cost and latency. Four cases per workflow are too few to estimate production reliability; these are diagnostic examples, not a general benchmark.

This additional run cost $0.0020378. **Final cumulative application API cost: $0.0053006**, with $0 reserved and zero outbox effects, against the $5 ceiling. Reproduce explicitly with `PROMETHEAN_LIVE_TEST=1`, the server-side key environment, and `node --import tsx tooling/verify-heldout.ts`; it reuses the cumulative live-verification ledger.

## Independent review and repairs

A separate reviewer inspected API access boundaries, action approval, idempotency, replay, package privacy/integrity and skill scope. Isolated probes exposed invalid-key preflight consuming reservations and vacuous acceptance output permitting false proof. These were repaired and regression-tested. Promotion now checks unresolved questions and unchanged tested design; worker ownership prevents simultaneous runtimes racing the same data directory. This bounded review is not an external security audit.

Browser verification found a proxy-origin mismatch, inadequate muted-text contrast, and missing accessible names in narrow navigation and JSON editing. The final local checks passed after those corrections. Managed Chromium download timed out on the development machine; local verification used installed Chrome. GitHub Actions checks Linux and Windows contracts and Linux browser journeys; consult the linked workflow for each published revision's current result.

## Scope and remaining limits

- This is a single local workspace with three installed workflow recipes and a restricted operation catalog. Unknown processes receive a clarification brief; broader Codex reasoning does not imply a generated executable tool exists.
- Knowledge retrieval uses a small synthetic corpus. Corporate document ingestion, arbitrary connectors, schedules/webhooks, hosted identity and tenant isolation are future work.
- Only the local outbox is implemented. Approval and idempotency behavior for a future external provider requires that provider's own integration and reconciliation tests.
- The $5 allowance belongs to a data directory, not the OpenAI account. Unknown provider outcomes keep reservations. A fresh directory must not be used to evade a budget.
- Default exports omit custom private fixtures and raw traces. Review descriptions and configuration before sharing; a checksum proves integrity, not authorship or truth.
- Codex skill metadata and behavior were checked locally. Native `/promethean` registration was not asserted; use `$promethean` or `/skills` in a Codex task opened on the repository.
- The archive retains the course team's original work and labels. Licensing requires confirmation of the original authors' intent; no new blanket license is implied.
