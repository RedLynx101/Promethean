# Portable workflow packages

A Promethean package is a versioned JSON document containing the brief, workflow specification, step provenance, curated evidence, acceptance fixtures where safe, eligible comparison records, declared runtime requirements, and a runbook. Its checksum detects modification after export. It is a data package for the Promethean runtime, not a self-contained executable or proof that the workflow is correct.

## Export and validate

From a configured checkout:

```sh
pnpm promethean examples csv-routing --out work/csv-workflow.json
pnpm promethean export work/csv-workflow.json --out work/csv-package.json
pnpm promethean validate work/csv-package.json
pnpm promethean test work/csv-package.json --format text
pnpm promethean provenance work/csv-package.json normalize
pnpm promethean import work/csv-package.json --out work/imported-workflow.json
```

`export` accepts either a validated workflow or an existing validated package. The CLI preserves eligible comparison records when re-exporting a package; direct CLI `compare` results are separate local reports. The studio's export includes eligible saved comparisons for its workflow revision.

Validation checks the format and checksum, installed schema and rubric, supported operations, graph references and cycles, evidence source revisions, and approval paths. It refuses unknown executable operations. Editing package contents without rebuilding the checksum invalidates the package. To change the workflow, import it, edit the draft, validate the draft, and export again.

Import creates a new workflow ID and draft revision and resets test provenance. Importing a prior result does not make the new workflow tested, enabled, or approved. The CLI emits that workflow JSON; it does not save it in the application database. Use the studio's import for application state.

## Verify from a clean working directory

The CLI launcher resolves its own installed code while preserving the caller's working directory. The exported package can live separately from the repository and does not need the database or original source inputs.

PowerShell, beginning in the repository root:

```powershell
$prometheanCli = (Resolve-Path 'packages/cli/bin/promethean.mjs').Path
$prometheanPackage = (Resolve-Path 'work/csv-package.json').Path
$portableCheck = Join-Path (Get-Location) 'work/portable-check'
New-Item -ItemType Directory -Force -Path $portableCheck | Out-Null
Copy-Item -LiteralPath $prometheanPackage -Destination (Join-Path $portableCheck 'workflow-package.json')
Push-Location $portableCheck
try {
  node $prometheanCli validate workflow-package.json
  node $prometheanCli test workflow-package.json --format text
} finally {
  Pop-Location
}
```

POSIX shell, beginning in the repository root:

```sh
promethean_cli="$PWD/packages/cli/bin/promethean.mjs"
mkdir -p work/portable-check
cp work/csv-package.json work/portable-check/workflow-package.json
(
  cd work/portable-check
  node "$promethean_cli" validate workflow-package.json
  node "$promethean_cli" test workflow-package.json --format text
)
```

The CSV example's recommended normalized-rules candidate should pass every supplied case. The simple-rules baseline should fail the formatting-variant case. Both are real deterministic computations; no model request or external effect is executed. The CLI's automated suite also launches the executable in a newly created temporary directory containing only an exported package.

## What is included and omitted

Exports include fixture inputs and expected outputs only when the tests and sample input exactly match the installed curated synthetic example. A modified or custom workflow omits its sample input and test cases by default. Its runbook says that local acceptance cases are needed. This avoids silently publishing arbitrary private samples, and the CLI refuses to report success for an empty test suite.

Raw run inputs, original traces, credentials, and delivery records are not exported. Comparison export is limited to the matching workflow revision and curated fixture data. Recognized credential patterns and secret-bearing fields cause rejection; this check is a supplement to review, not a guarantee that all sensitive text can be detected. Workflow descriptions, constraints, names, node configuration, and decision rationales are part of the definition and must be reviewed before sharing.

For custom acceptance cases, keep the input workflow JSON in a private local working directory, add representative cases to `tests`, then run `validate` and `test`. The ordinary export intentionally does not opt those samples into sharing. There is no `--include-private-data` escape hatch.

## Execution boundaries

The package lists its prerequisites. Local deterministic tests require the installed Promethean 2.0 CLI and Node.js 24; no key or application server is needed. Model candidates require the separate application live mode, an allowed model, an available key configured at runtime, and remaining usage allowance. The CLI neither reads credentials nor silently falls back to a model.

Acceptance tests suppress effects even when a graph contains approval or outbox nodes. They verify computation before an action; they do not approve that action. The current local outbox adapter records a demonstration message in application state and does not deliver email. Replay inspection and fresh execution remain distinct: viewing or testing an exported package does not reissue actions from a recorded run.
