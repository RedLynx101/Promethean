# Durable local workflow runtime

`@promethean/runtime` stores immutable workflow revisions, persisted runs, step/event records, comparisons, usage reservations, and an explicitly local outbox in SQLite through Node 24's `node:sqlite` API. SQLite is still marked experimental by Node; no external database service is required.

`Store` owns prepared statements, schema migrations, transactions and persistence. `WorkflowService` owns diagnosis, revision-bound edits, queueing, approvals, cancellation, replay, comparisons and the single worker. A data directory admits one live worker; a second process cannot reset or claim its jobs. Stale ownership is recovered only after the former PID has exited.

## Run guarantees

- A run is bound to an immutable workflow revision and a unique per-revision idempotency key. Reusing a key with different parameters fails.
- Completed steps persist before the next step begins. A restart retains them, recovers queued work, and records an honest recovery event. An interrupted model request may be repeated under a fresh cost reservation; its unknown prior cost is not erased.
- A human approval binds the workflow revision and exact prepared recipient/draft state. A changed revision invalidates a waiting approval. Denial and cancellation prevent later actions; cancellation aborts in-flight model requests where supported.
- The local outbox insert and completed step commit in one transaction. Repeated requests and same-revision retry lineages cannot duplicate the record. This adapter never sends email or contacts a provider.
- Retry creates a new run with `replayOf`; it does not modify the recorded failure or reuse its approval. Corrections create new immutable workflow revisions.
- Comparison processes the same versioned cases through different candidate implementations, suppresses every effect, and grades expected fields in ordinary code. Failed or incomplete requirements block enablement. Promotion can reuse passing evidence across status/name-only revisions when the executable design hash is unchanged.

## Persistence and limits

The default API path is `work/data/promethean.sqlite`. Keep it out of version control and back it up as private workspace data. The application is a single local workspace, not a multi-tenant hosted service. The initial persistent ledger is capped at $5 per configured data directory and is independent of provider-wide account spending.

Runs currently retain their local inputs and outputs for debugging. There is no automatic retention purge or encrypted local database. The portable export deliberately excludes arbitrary run traces and inputs. Unknown-cost reservations remain visible through `GET /api/usage` until reconciled with provider evidence; there is no automatic release based on a guess.

Tests cover actual deterministic execution, denied/cancelled actions, stale approvals, concurrent ownership, restart at the approval boundary, interrupted work recovery, immutable correction/retry traces, baseline discrimination, and budget reservation accounting.
