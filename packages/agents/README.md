# Bounded Agents SDK layer

`@promethean/agents` uses `@openai/agents` 0.17.0 with an explicit `OpenAIProvider`, reusable `Runner` configuration, structured Zod outputs, and typed local retrieval tools.

The diagnostic coordinator proposes explanatory changes against a particular workflow revision. It can choose only installed candidates, cannot replace the graph, and cannot remove constraints. Execution uses focused classification, policy retrieval, and drafting capabilities. Retrieval outputs must cite actual results from the supplied corpus; unsupported sources fail semantic validation. Drafts never send messages.

Only `gpt-5.6-luna` and `gpt-5.6-terra` are allowed; Luna is the default. Configuration is server-side through `OPENAI_API_KEY` or `OPENAI_API_KEY_FILE`. No credential is copied into the repository. Ordinary tests do not use a real key.

Each call is capped at 1–3 model turns, 1,600 output tokens per turn, a 48 KB serialized input, and 60 seconds. Automatic model retries are disabled. SDK trace export and response storage are disabled. The application stores its own local step records with workflow/rubric/prompt/model provenance.

## Cost accounting

Before scheduling a call, reserve a conservative upper bound in the persistent usage ledger. Configuration validation occurs before the reservation. Reconcile successful calls using reported tokens, reported cache-read/write details where available, and standard text prices. Uncertain transport or process outcomes retain their reservation and remain visible for reconciliation; a failure never receives synthetic success or zero-cost certainty.

Prices checked September 5, 2026: Luna $0.20 input / $0.02 cached input / $1.20 output per million; Terra $2 / $0.20 / $12. Cache writes use 1.25 times the ordinary input rate. The bounded context remains below the long-context pricing threshold. Calculated costs are usage-based calculations, not billing statements, and do not include unrelated usage outside this application's ledger. [Luna pricing](https://developers.openai.com/api/docs/models/gpt-5.6-luna) · [Terra pricing](https://developers.openai.com/api/docs/models/gpt-5.6-terra)

The durable runtime supplies `UsageLedger`; tests can supply an `AgentExecutor` test double to verify interruption behavior without paid calls. Explicit provider verification lives at `apps/api/src/live-verify.ts` and is excluded from ordinary CI.
