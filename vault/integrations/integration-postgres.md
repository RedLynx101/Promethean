---
type: integration
id: integration-postgres
tags: [integration, data, l0]
linksTo: [integration-index, L0-deterministic]
---

# PostgreSQL (Drizzle)

The Promethean source-of-truth DB. Workflow definitions, executions, alerts, snapshots all live here. Schema in `lib/db`.

## Conventions

- Drizzle ORM, no raw SQL in route handlers.
- Migrations: `pnpm --filter @workspace/db run push` (dev) — production migrations should be authored explicitly.
- All tables UUID-keyed, `createdAt` / `updatedAt` on every mutable row.

## Idempotency

`INSERT ... ON CONFLICT DO NOTHING` for trigger-deduped writes. `UPDATE ... WHERE updated_at = $expected` for optimistic concurrency on workflow edits.

## L0 use

Routing tables, lookup data, deterministic enrichment. Always parameterised queries — never string-concat.

## Connection limits

PgBouncer in production. Pool sizing: ~`max(workers × concurrent_steps_per_worker, 10)`.
