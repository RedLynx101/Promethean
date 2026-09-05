# From generated specifications to inspectable workflows

Promethean began as a course project that transformed process descriptions through decomposition, selection, orchestration and governance agents. The alpha preserved valuable methodology and failure traces, but its implementation spectrum conflicted with the project bible, its approved output was still a specification, and parts of its dashboard used simulated execution data.

Noah's v2 direction was to make the smallest sufficient solution the product's central claim and give that claim observable evidence. The redesign changes both the interaction and the engineering boundary: users start with a brief, inspect candidate designs, compare actual outcomes and review real step traces. The visual language adopts limestone, bronze, architectural spacing and a restrained torch identity.

The central engineering choice is a shared versioned contract. The same workflow definitions, evidence catalog, validators and grader serve the studio and Codex skill. A graph edit is checked against its source revision; missing nodes and approval bypasses cannot become valid simply because a model emitted syntactically correct JSON. Immutable versions allow corrections without altering the record that motivated them.

The Agents SDK performs structured diagnosis, classification, typed policy retrieval and constrained drafting. Deterministic operations handle explicit rules. SQLite persists jobs, completed steps, approvals, events and model reservations across requests and restarts. A local outbox gives the project a real transactional effect to prove while keeping its operational claim narrow.

The comparison lab demonstrates why task-level evaluation matters. A normalized parser can outperform a strict parser without AI. Expanded triage rules handle more language but cannot satisfy a missing taxonomy entry. Retrieval can refuse an unsupported answer. The grader measures declared outputs, not model confidence or architecture labels. Fixtures are deliberately small and synthetic; broader production accuracy remains unmeasured.

On a frozen independently authored case set, expanded triage rules passed two of four cases while Luna passed four; keyword retrieval and Luna both passed all four support cases. The result gives different recommendations for different tasks. These small synthetic sets do not establish production reliability, but they make the architectural tradeoff observable.

The implementation also exposed failures worth fixing: invalid credentials could consume a cost reservation before a request, empty expected objects could produce vacuous test success, and revision changes could leave misleading proof. Regression tests now cover these boundaries alongside durable execution and exact-action approval. Browser review caught a proxy-origin mismatch, contrast problems and missing accessible names before the final checks passed.

The result connects product framing, interface design, domain modeling, SDK integration, durable execution, evaluation and technical communication within one project. [Verification](../verification.md) records what was actually checked. [AI-use disclosure](../../AI_USAGE.md) distinguishes development assistance and team lineage. Source publication does not imply hosted deployment; the supported application runs locally.
