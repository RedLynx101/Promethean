# Promethean local API

`createApp()` in `src/app.ts` exports the Express application for tests. `src/index.ts` starts it on loopback port 4318. Use the repository root startup command for the web/API pair.

The API implements the shared [HTTP contract](../../docs/architecture/build-contract.md), with one additional read-only `GET /api/usage` endpoint for the persistent budget and reservation ledger. JSON bodies are limited to 128 KB. Inputs and patches are validated before storage. API errors use `{ "error": "..." }`; raw provider exceptions and credentials are not returned.

The loopback default rejects unexpected Host headers and cross-origin mutations. To bind another interface, configure `PROMETHEAN_ACCESS_TOKEN`; clients must send it as a Bearer token. This access token is a basic single-workspace control, not a hosted identity/authorization system. There is no blanket CORS. The Vite development proxy should preserve Host (`changeOrigin: false`, its default).

## Environment

| Variable                  | Default        | Purpose                                                               |
| ------------------------- | -------------- | --------------------------------------------------------------------- |
| `PROMETHEAN_API_PORT`     | `4318`         | API listening port                                                    |
| `PROMETHEAN_HOST`         | `127.0.0.1`    | Loopback binding                                                      |
| `PROMETHEAN_DATA_DIR`     | `work/data`    | Private SQLite workspace                                              |
| `PROMETHEAN_MODEL`        | `gpt-5.6-luna` | Allowed Luna/Terra model                                              |
| `PROMETHEAN_BUDGET_USD`   | `5`            | Initial allowance; values above 5 are refused                         |
| `OPENAI_API_KEY_FILE`     | unset          | Path to a server-side credential, loaded only for explicit live calls |
| `OPENAI_API_KEY`          | unset          | Alternative server-side credential                                    |
| `PROMETHEAN_ACCESS_TOKEN` | unset          | Required for non-loopback binding                                     |

## Explicit paid verification

Set `PROMETHEAN_LIVE_TEST=1` and configure a server-side credential, then run `pnpm exec tsx apps/api/src/live-verify.ts` from the root. This checks structured diagnosis, model classification/drafting, and actual tool-backed retrieval/drafting. It denies each local-outbox proposal and reports measured usage. The cumulative test ledger and `latest-report.json` are saved under `work/live-verification` (override with `PROMETHEAN_LIVE_DATA_DIR`). Do not run this command in routine CI.

The normal test suite starts a temporary loopback server with an in-memory database and never makes paid calls.
