# v2 implementation contract

Primary owns `packages/core/src/types.ts`, root manifests, `apps/web`, documentation integration. Runtime worker owns other core implementation, `packages/agents`, `packages/runtime`, `apps/api`, and associated tests. All package names use @promethean/_. Preserve the shared types; propose changes before breaking them. Do not modify legacy directories. New pnpm workspace includes apps/_ and packages/* only.

Design thesis: calm limestone and ink studio, bronze actions, classical headings and modern readable controls. Content: workflow intake and recent work; brief/recommendation; design list/graph and inspector; tests/comparison; run trace/replay/export. Interaction: short workspace entrance, tab underline/inspector reveal, responsive dialog transitions with reduced-motion support. Frontend owned by primary Astra.

Architecture: local-first modular TypeScript app with SQLite via Node 24 node:sqlite for durable jobs, revisions, events, usage and idempotency. This is an intentional change from required external PostgreSQL: a fresh checkout runs without a database service. Retain original PostgreSQL implementation as historical reference. Use prepared statements, migrations and transactions. Single local workspace; API binds loopback by default, rejects remote binding unless an access token is configured. No live external business actions; outbox is a clearly labeled local adapter.

Canonical rubric v2 follows the original bible: L0 deterministic, L1 fixed model task, L2 human-directed assistant, L3 fixed AI workflow, L4 tool agent, L5 multi-agent. Manual process improvement is a valid outcome outside that scale. Implementation type and permissions remain separate. Old code labels remain explicitly legacy and are never silently migrated.

## HTTP contract

All responses use shared types. Failures use HTTP 400/404/409/422/429/503 as appropriate with `{error: string}`. JSON body max 128 KB. Same-origin API and frontend dev proxy; no blanket CORS. State lives beneath PROMETHEAN_DATA_DIR (default workspace work/data; ignored).

- GET /api/health → `{status:'ok',version:'2.0.0'}`
- GET /api/workspace → Workspace (bootstrap three clearly labeled example workflows once)
- POST /api/workflows `{description,name?,exampleId?,mode?:'local'|'live'}` → Workflow; 400 on blank/oversized, focused unknowns for insufficient descriptions
- GET /api/workflows/:id → WorkflowDetail
- PATCH /api/workflows/:id WorkflowPatch → Workflow (revision conflict 409, preserves immutable history, marks affected provenance stale)
- POST /api/workflows/:id/run `{candidateId?,input?,mode?,idempotencyKey}` → WorkflowRun; asynchronous persisted job, poll GET /api/runs/:id
- GET /api/runs/:id → WorkflowRun
- POST /api/runs/:id/approve `{decision:'approve'|'deny',expectedRevision:number}` → WorkflowRun, binds action/run/workflow revision; duplicate decisions cannot repeat effects
- POST /api/runs/:id/cancel → WorkflowRun
- POST /api/runs/:id/retry `{expectedRevision:number}` → WorkflowRun (new run with replayOf, not destructive mutation; only restart approved scope)
- POST /api/workflows/:id/compare `{candidateIds?:string[],mode?:RunMode}` → Comparison (bounded case matrix, no outbound effects during comparison)
- GET /api/workflows/:id/export → WorkflowPackage (safe default, excludes inputs/traces/secrets unless curated fixture data)
- POST /api/packages/validate `{package: WorkflowPackage}` → `{valid:true,checks:string[]}` or 422
- POST /api/packages/import `{package:WorkflowPackage}` → Workflow (new ID, revalidate)
- GET /api/evidence?q= → Evidence[]

API server exports `createApp` for tests, and a start script listens at 4318. Vite port 4317 proxy to API. Primary will supply root startup tooling.

## SDK and execution

Use @openai/agents with explicit OpenAIProvider, Agent/Runner, structured Zod outputs, bounded maxTurns/maxTokens, and no secret logs. No key copying: read OPENAI_API_KEY or OPENAI_API_KEY_FILE at runtime. Only Luna/Terra, default Luna. Track actual usage and separately reserve upper-bound call costs before scheduling calls; $5 overall default cap. Trace export disabled by default to avoid leaking workflow data; persist sanitized application events. Include actual SDK diagnosis and classifier/draft/retrieval tools paths, not just unused agent definitions. Validate model-produced patches/outputs semantically in code. Do not synthesize successful live results on failure.

Durable worker processes one queued run at a time, resumes unfinished safe work after restart, persists approval before returning, ensures unique idempotency key per workflow revision, does not duplicate outbox effects. Unknown/interrupted model outcomes may require bounded retry; record the interruption honestly. Cancel checks between steps and abort in-flight model request where supported.

Examples: CSV validation/routing (no model); inbound request triage (rules vs enhanced-rules local, model candidate live); knowledge-grounded support using supplied curated corpus (retrieval and draft, human gate, local outbox). Core should export examples/evidence and deterministic diagnose/validate/execute helpers for CLI. No freeform description should silently be replaced by an unrelated template. Local mode is a rubric-driven diagnostic and deterministic runtime, clearly labeled; live mode uses SDK. Never guess a specialized workflow when key requirements are missing.

Comparison uses two truly distinct implementations, common cases/scoring, subset expected-field comparisons, correct/incorrect cases and real measured latency/cost. Include case where simple rules fail and neither solution meets requirements. Keep evaluator independent of the model's classification. Retain immutable failure trace; corrections fork new revision; exported package validators verify checksum and graph/policy contracts and support deterministic test execution from a clean directory.
