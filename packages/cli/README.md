# @promethean/cli

The terminal surface for Promethean's shared core. It performs local diagnosis, evidence retrieval, provenance inspection, schema/policy validation, deterministic comparisons, and portable package operations. It imports no database, Agents SDK, credential loader, or effect adapter.

From the repository root, run `pnpm promethean --help`. For use from another working directory, run `node /path/to/Promethean/packages/cli/bin/promethean.mjs --help`; the launcher preserves the caller's directory. Node.js and workspace dependencies must already be installed.

See [the skill and CLI guide](../../docs/skill.md) for the user workflow and [portable packages](../../docs/workflow-packages.md) for data inclusion and clean-directory validation.

`src/arguments.ts` owns strict argument parsing, `src/io.ts` bounded input and explicit output writes, and `src/cli.ts` command orchestration. Domain behavior belongs in `@promethean/core`; do not fork its rubric or execution logic in this package. `src/index.ts` connects the tested dispatcher to process streams.

Run `pnpm exec vitest run packages/cli/tests/cli.test.ts` for parsing and error behavior, shared diagnostics, real deterministic results, export integrity/privacy, suppressed effects, and execution from a clean directory. A case pass proves only the declared fixture criteria, not live operational readiness.
