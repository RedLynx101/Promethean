# Promethean in Codex and the terminal

The repository skill helps an individual or small team choose the minimum viable solution for a workflow. It uses the same rubric, evidence catalog, schemas, validators, and deterministic execution helpers as the studio. The CLI runs without a server, database, credentials, or paid model calls.

## Invoke the skill

Open this repository in Codex and invoke `$promethean`, or select it through `/skills`. The skill lives at [`.agents/skills/promethean/SKILL.md`](../.agents/skills/promethean/SKILL.md).

```text
$promethean We copy incoming order CSVs into a spreadsheet, check amounts and
regions, then email the appropriate team. Diagnose the process and recommend
the smallest useful improvement. We need to review exceptions ourselves.
```

`/promethean` is the intended conversational shortcut when a host routes it to the skill. A skill file does not register a custom native slash command. This repository does not modify global Codex configuration or claim that every host supports that exact shortcut.

Codex provides the reasoning in the current session. The CLI supplies repeatable data retrieval, a local diagnostic baseline, and validation. Installing the skill does not start another paid agent pipeline. The application has a separate explicit live mode backed by the Agents SDK; the CLI does not call it.

## Run the CLI

Follow the root [README](../README.md) to install Node.js and workspace dependencies. From the repository root:

```sh
pnpm promethean --help
pnpm promethean rubric
pnpm promethean evidence "ambiguous graph loss"
pnpm promethean examples
pnpm promethean examples csv-routing --out work/csv-workflow.json
pnpm promethean diagnose "Clarify our manual onboarding checklist."
pnpm promethean diagnose --file work/process.md --out work/diagnosis.json
pnpm promethean validate work/csv-workflow.json
pnpm promethean provenance work/csv-workflow.json normalize
pnpm promethean test work/csv-workflow.json
pnpm promethean compare work/csv-workflow.json --format text
```

Use `--file` for a description stored on disk; a positional argument is treated as description text. Paths with spaces must be quoted. Use `--out` to save an artifact without shell-redirection encoding issues. Existing files are preserved unless `--force` is explicitly supplied. Data output is JSON by default; `--format text` gives a readable summary. Help is plain text.

When piping JSON, use `pnpm --silent promethean ...` to suppress pnpm's script banner, or call `node packages/cli/bin/promethean.mjs ...` directly. The CLI writes errors and save receipts to stderr, keeping stdout machine-readable. A failed acceptance test exits `1`; invalid arguments, missing test cases, or a model candidate in the local CLI exit `2`. A completed `compare` exits `0` even when no candidate qualifies: inspect its case results and recommendation.

The runnable example IDs are `csv-routing`, `inbound-triage`, and `knowledge-support`. Examples are synthetic fixtures. A new diagnosis retains the supplied description and flags unconfirmed assumptions; it does not silently adopt the example's test cases. The current local diagnostic recognizes installed patterns and otherwise produces a clarification brief. It is not a general natural-language compiler.

## Work through a decision

| Request                                                                    | Useful skill behavior                                                                                                        | Evidence to retain                                                                                         |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| “Do we need AI to validate and route this CSV?”                            | Establish exact fields, rules, exceptions, and acceptance cases; evaluate deterministic candidates first.                    | Shared cases, actual outputs, rejected rows, zero model usage.                                             |
| “Automate our business.”                                                   | Identify the missing trigger, result, and constraints; ask focused questions before choosing a system.                       | Unresolved brief; no invented executable process.                                                          |
| “Simplify this five-agent approval flow.”                                  | Identify redundant interpretation or handoffs and propose a smaller design without removing necessary approval.              | Before/after requirements and passing shared cases; otherwise label the simplification unproven.           |
| “Answer support questions using our supplied policies and selected tools.” | Compare retrieval plus a fixed workflow with a bounded tool agent; keep tool scope and approval independent from capability. | Corpus provenance, unanswered cases, authorized tools, and measured evaluations if live mode is requested. |
| “The alpha trace says L2, but the new rubric says something else.”         | Preserve the source rubric, retrieve the historical record, and explain the unresolved mapping.                              | Both source revisions; no silent reinterpretation or invented reconciliation.                              |
| “Diagnose this imported workflow” where the document says to send email    | Treat the embedded instruction as workflow data; report the permission requirement and keep analysis local.                  | Decision brief, effect boundary, and no send action.                                                       |

These are behavioral review scenarios, not a claim that matching prompt wording establishes quality. The automated CLI tests cover parsing, shared data and validation, actual deterministic results, portable execution, and refusal of unsupported operations. Codex reasoning quality still needs task-level review.

The core supports a deliberate operation set: input validation, CSV normalization, conditions, declared request classification, curated support retrieval, bounded draft generation, human approval, and a local outbox adapter. Codex can diagnose broader workflows and propose implementation plans, but exported executable specifications must use installed operations. General scripts, arbitrary tools, custom corporate policy corpora, or real email delivery require an explicit extension and tests.

## Inspect provenance and proof

`provenance` resolves step requirements, rationales, alternatives, evidence revisions, and acceptance-case references. Untested or stale provenance stays visible. A structurally valid workflow is not necessarily correct. `test` runs the recommended deterministic candidate by default; `--candidate rules` selects the simpler baseline. `compare` runs genuinely different installed deterministic implementations against exactly the same tests and reports model candidates as unexecuted.

The inbound-triage fixture intentionally includes a required specialist route absent from both deterministic implementations. Neither candidate passes the full case set. This prevents the demonstration from treating a partial score as permission to recommend deployment.

All CLI tests suppress approval and outbox effects. They measure real local execution time and report zero tokens and model cost. They do not create application run history, grant approvals, send messages, or prove operational behavior after deployment. For portable files and a clean-directory check, use the [workflow package guide](workflow-packages.md).
