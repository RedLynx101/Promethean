---
skill: emit
phase: 5
canonical: true
reads: [approved workflow JSON from DB, vault/integrations/, vault/patterns/, vault/governance/]
emits: out/<workflow-slug>/ (runnable code + tests + README)
triggered_by: POST /api/workflows/:id/emit { targetFramework }
---

# Skill: Emit

**You are the Emission phase — the canonical pivot skill.** By the time you run, phases 1–4 are already done: a human has iterated in the Promethean UI, the four in-process agents have produced and been approved on the graph, and the workflow is sitting in Postgres with `phase: "deployed"`. Your job is to turn that approved blueprint into **real runnable code** in the framework the user picked.

This is what makes "deployable" actually mean deployable. The previous four phases produce a JSON spec; you produce a project folder a developer can open, run, and ship.

## Inputs

The API endpoint `POST /api/workflows/:id/emit` hands you:

- `workflow` — the full workflow row: `nodes`, `edges`, `governanceConfig`, `estimatedCostPerRun`, `estimatedLatencyMs`, `domain`, `description`, `systemTypeSummary`.
- `targetFramework` — one of:
  - `langgraph-js` (TypeScript LangGraph — closest to the existing stack; recommended default)
  - `langgraph-py` (Python LangGraph)
  - `inngest` (TypeScript durable functions — best story for HumanGate suspend/resume)
  - `temporal` (TypeScript workflows — heaviest, best story for regulated production)
  - `n8n` (exported JSON blueprint — no-code-ish, limited branching fidelity)
  - `claude-agent-sdk` (spawn one harnessed sub-agent per L4/L5 node)
  - `python-script` (plain script; simplest, no durability)
- `targetDir` — where to write the artefact; defaults to `out/<workflow-slug>/`.

## Read first (mandatory)

The vault is your cookbook. For every tool referenced in `workflow.nodes[*].data.tools[]`, **call `vault_get` on the matching `integration-<tool>` note** before writing any code. The integration notes contain:

- auth (env vars, token shape, OAuth flow, signing)
- idempotency (dedup keys, upsert vs insert, replay semantics)
- rate limits and retry behaviour
- common failure modes
- structured-output schemas (Zod / Pydantic snippets)
- anti-patterns

Also read:

- All `vault/patterns/*.md` notes for the edge types the graph uses (`pattern-parallel`, `pattern-conditional`, `pattern-error-handling`, `pattern-retries`, `pattern-human-gate`).
- `vault/spectrum/HumanGate.md` for the HumanGate node contract.
- `vault/governance/*.md` for the middleware behaviours (cost cap, latency threshold, timeout hard-kill, snapshot, alerting).

If an integration note doesn't exist for a tool referenced in the graph, **stop and ask** — either the tool name is wrong or the cookbook needs a new recipe. Do not improvise auth or idempotency.

## Emission rules

1. **One file per non-trivial node.** Group L0 utility nodes in a shared `utils.ts` / `utils.py` if natural.
2. **Validate every external boundary** with Zod (TS) or Pydantic (Python). Schemas come from integration notes.
3. **Wire governance as middleware:**
   - Per-node `cost` + `latencyMs` measurement → one structured log line per node.
   - `costLimitPerRun` enforced as a context-attached counter checked before every model/tool call; hard kill on breach.
   - `executionTimeoutMs` enforced via `AbortController` (TS) or `asyncio.wait_for` (Python) at the top-level workflow function.
   - `errorRateThreshold` + `alertChannels` emit to the configured channels (see `vault/integrations/slack-api.md`, `pagerduty.md`).
4. **Implement HumanGate per `pattern-human-gate.md`:**
   - `langgraph-js` / `langgraph-py`: use `interrupt()`.
   - `inngest`: `step.waitForEvent` with a signed event name.
   - `temporal`: signal-based pause/resume.
   - `python-script`: write proposal to `proposals/<execId>.md`, block on file rename to `approved/`.
5. **Idempotency:** every external write call (Slack post, GitHub comment, DB insert, PagerDuty event) takes an idempotency key derived from `(executionId, stepId)` as described in the integration note.
6. **Tests:** emit at minimum a smoke test per non-trivial node that calls it with a fixture; the harness should run them after generation and surface failures.
7. **Secrets:** all external credentials via env vars. Generate a `.env.example` listing every required var. Never hard-code.

## Output structure

```
out/<workflow-slug>/
├── README.md              ← what it does, how to run, env vars, suggested deploy target
├── workflow.<ts|py>       ← top-level entry: orchestrates nodes per the graph
├── nodes/
│   ├── <node-id>.<ts|py>  ← one per non-trivial node
├── governance.<ts|py>     ← cost/latency/timeout/alerting middleware
├── schemas.<ts|py>        ← Zod / Pydantic for every node I/O
├── tests/
│   └── *.test.<ts|py>
├── .env.example           ← every required env var
├── promethean.json        ← the approved workflow JSON, verbatim, for replay + diffing
└── package.json or pyproject.toml
```

## Closing actions (do these before reporting done)

1. Run the generated test suite. Surface any failures to the user.
2. Run the linter / type-checker. Surface any failures.
3. Print a summary of files written + the **next-action prompt**: set the env vars in `.env.example`, run `pnpm test` (or equivalent), then the entry command.
4. Optionally open a PR if the target dir is in a git repo.

## Reporting back to the API

The emit endpoint expects you to persist one of:

- **Success:** write `out/<workflow-slug>/EMIT_MANIFEST.json` with `{ status: "ok", filesWritten: […], testsRun: N, testsPassed: N, targetFramework, timestamp }`. The endpoint's follow-up poll picks this up.
- **Partial / needs human:** write the manifest with `{ status: "blocked", reason: "integration-note-missing", missingNote: "integration-<tool>" }` and stop.
- **Failure:** write the manifest with `{ status: "failed", reason: string, stage: string }`.

## Anti-patterns

- Emitting code that references tools with no integration note. Ask for the note.
- Skipping governance middleware "to keep the artefact simple." Governance is non-optional — the whole pivot is about the emit output being production-shaped, not a toy.
- Hard-coding secrets. Always env vars.
- Writing into a directory that already has an unrelated project. Refuse and ask.
- Inventing auth flows. If the integration note doesn't say how, the cookbook is incomplete — stop.
- Reaching for L5 framework features (sub-agents, multi-agent collab) for a graph that's only L0–L3. Use the simplest framework idiom that matches.
