# Architecture decisions

## One maintained TypeScript system

The alpha used several overlapping packages and a direct Chat Completions pipeline. V2 gives the web studio, API, runtime, CLI and SDK a shared transport-safe domain. Zod validates untrusted data at boundaries. The SDK returns revision-bound explanatory patches, not complete replacement graphs; graph validation rejects missing identities, unknown operations, cycles and routes that bypass approval.

Canvas positions are browser preferences keyed by workflow ID. They cannot alter executable dependencies. The step list provides the primary editing path; the graph exposes dependency structure and inspection without turning arbitrary connections into executable code.

## SQLite for the first audience

The accepted proposal suggested retaining PostgreSQL with a worker. Dependency inspection showed that a service-free local workspace is a better fit for individuals and small teams trying the project. Node 24's SQLite stores versioned definitions, jobs, run events, approvals, comparisons and cost reservations using prepared statements and transactions. The original PostgreSQL source remains in the archive.

Tradeoff: the worker uses a single local data directory and synchronous short transactions; it is not a distributed queue. A process ownership record prevents concurrent worker instances. Recovery resumes after durable completed steps. An interrupted model call can be reissued under a new reservation; its prior uncertain charge is retained. External delivery exactly-once semantics are not claimed.

The migration table records the local schema version. Future schema changes require an additive versioned migration and fixture upgrade test. Do not infer that an old alpha database can be opened as v2.

## Restrict operations before adding connectors

CSV normalization, deterministic conditions, request classification, curated retrieval, response drafting, approval and local outbox cover three complete examples. Model nodes have typed schemas, input/output limits, timeouts, bounded turns and conservative cost reservations. Arbitrary shell commands and invented tool names are rejected.

Approval must dominate every route to an effect. It binds a prepared action hash to a specific workflow revision. Outbox insertion and its state transition are transactional and deduplicated. Recorded replay is entirely read-only. A hosted connector must add provider-specific authorization, idempotency/reconciliation and ambiguous-outcome behavior before being called supported.

## Evidence before complexity

Candidates execute different implementations on one case set. The evaluator checks observable expected fields, rejects vacuous assertions and records errors, latency, token usage and cost. A candidate must pass every case to qualify. The triage fixture intentionally requests an unsupported specialist route, demonstrating that neither candidate qualifies and that taxonomy repair is preferable to hiding the failure.

Versions are immutable. Edits mark provenance stale, and comparisons retain their source revision and hashes. Identical executable designs may reuse proof across a status-only revision; changed inputs, tests or configurations require new proof. Package validation checks integrity and case/result consistency; it does not cryptographically authenticate the author's claims.

## Astra visual direction

Warm limestone, deep ink, bronze and restrained sage establish the Greco-modern identity. Fraunces is used for selected display text; DM Sans carries operating information. Thin architectural rules and a torch mark provide identity while the main views remain practical: Brief, Design, Tests and Runs. Native dialogs, a step-list alternative, keyboard search, visible focus, reduced-motion support and responsive layouts make the core journey available beyond a desktop canvas.

## Preserve history and scope

Alpha source, reports, assets and media were moved intact to `archive/alpha/` and removed from the active package graph. Git history and team credit remain. Packages were created only where an independent responsibility exists; a distributed worker, integrations marketplace, billing, enterprise administration and public application deployment remain future work. Publishing this repository shares the source and evidence; it does not turn the local runtime into a hosted service.
