# Security boundary

Promethean v2 is a single local workspace, bound to loopback by default. It validates Host headers and rejects cross-origin mutations, limits JSON payloads and mutation rates, uses strict schemas and a restricted operation catalog, and stores durable state using prepared SQLite queries. It does not provide hosted identity, tenant separation or an unrestricted connector execution environment.

Human approvals bind to the exact prepared action and immutable workflow revision. The only effect adapter is a transactional local outbox. Replay reads recorded events and executes nothing. A new run receives its own approval requirements. Workflow files are untrusted data; package checksums detect changes, not author identity or trustworthiness.

Live model input can include workflow descriptions and synthetic or user-supplied input. Choose live mode only for data you intend to send to the configured provider. Keys remain server-side; model traces are not exported. Default portable packages exclude private fixtures and raw run events, but descriptions and rationales can still contain information you entered: review exports before sharing.

Keep the local database and private key file under your own account's filesystem permissions. Do not expose the dev server publicly. A production deployment requires authentication, workspace authorization, transport security, retention controls and adapter-specific review. A bearer token is an API control, not a completed hosting design.

For a suspected vulnerability, prepare a minimal synthetic reproduction and contact the repository maintainer privately through an available channel. Never include actual keys or user data in an issue. This repository does not claim an external security audit or compliance certification.
