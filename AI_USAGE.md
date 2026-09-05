# AI use disclosure

Noah directed this subsequent Promethean redesign and defined its audience, product goals, visual direction and acceptance scope. Codex assisted with architecture, TypeScript implementation, interface design, documentation and verification. Astra owned frontend and integration; bounded agents implemented runtime and CLI/skill modules and independently reviewed selected invariants. Human and model contributions are not inferred from lines of code.

The prior Agentic Systems Studio team implementation remains in `archive/alpha/` with its original credit and history. This redesign must not be represented as sole authorship of that team work.

Application model calls are distinct from development assistance. The runtime uses the OpenAI Agents SDK only in explicit live mode. Deterministic demonstrations execute actual local algorithms. Synthetic acceptance cases are authored test fixtures, not independent production evidence. See [verification](docs/verification.md) for measured provider results and limitations.

The README masthead was created with the built-in Imagegen tool and manually reviewed; its [prompt and provenance](docs/brand/README.md) are retained. Product screenshots are direct captures of the running application with synthetic demo data. They do not depict generated or unimplemented interfaces.
