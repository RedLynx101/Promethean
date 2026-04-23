---
skill: orchestrate
phase: 3
reads: [vault/patterns/, vault/integrations/, vault/spectrum/HumanGate.md]
emits: proposals/<workflow-id>-3-orchestration.md
schema: OrchestrationResultSchema
---

# Skill: Orchestrate

**You are the Orchestration phase of Promethean.** Take a classified workflow and enrich it with concrete tool bindings, edge conditions, error paths, parallel execution, and HumanGate insertions.

## Inputs

- The approved classification JSON from phase 2.
- `description`, `constraints`, `feedback` (if rejected previously).

## Read first (mandatory)

1. All `vault/patterns/*.md` — `parallel`, `conditional`, `error-handling`, `retries`, `human-gate`.
2. **For each unique level in the classified graph**, the matching `vault/spectrum/L*-*.md` note (you may have read these in phase 2; re-skim the **Typical tools** and **Required guardrails** sections).
3. **For each candidate tool**, the matching `vault/integrations/<tool>.md` note. If a tool isn't in the registry yet, propose one and flag it in the proposal output.
4. `vault/spectrum/HumanGate.md` — insert HumanGate nodes before destructive actions and after low-confidence (<60) classifier outputs.

## Rules

For each node, set:

- `data.tools[]` — concrete tools by id from `vault/integrations/`.
- `data.errorHandling` — one of: `alert-and-fail | alert-and-skip | fallback-to-l0 | retry-with-backoff | route-to-human-gate` (see `vault/patterns/pattern-error-handling.md`).
- `data.conditions[]` — when applicable.

For edges:

- Use `parallel` whenever data dependencies allow concurrent execution.
- Use `conditional` with explicit `data.condition` strings that downstream artefact emitters can translate.
- Add `error` edges from any node with non-trivial error handling to a handler node.
- Use `loop` for retry back-edges.

**Insert HumanGate nodes** as new graph nodes when:

- The next step performs a destructive / irreversible action (deploy, send to customer, charge, delete).
- An upstream classifier confidence is <60.
- The brief explicitly requested human approval at a checkpoint.

## Output

JSON matching `OrchestrationResultSchema`:

```json
{
  "nodes": [
    {
      "id": "...",
      "type": "custom",
      "position": { "x": ..., "y": ... },
      "data": {
        "label": "...",
        "description": "...",
        "systemLevel": 3,
        "confidence": 82,
        "rationale": "...",
        "tools": ["openai.chat"],
        "conditions": ["score >= 80"],
        "errorHandling": "fallback-to-l0",
        "status": "idle"
      }
    }
  ],
  "edges": [...enriched...],
  "summary": "Orchestration summary"
}
```

## Proposal file

`proposals/<workflow-id>-3-orchestration.md`:

```markdown
---
phase: 3-orchestration
workflowId: <id>
status: pending-review
newIntegrationsProposed: [<list any new integration notes that should be added to vault/integrations/>]
---

# Orchestration Proposal

## Tool bindings
| Node | Tools | Vault refs |
|------|-------|------------|

## Error handling per node
| Node | Strategy | Rationale |

## Edges (changes from phase 2)
| Edge | Type | Condition |

## HumanGates inserted
- before <node>: <reason>

## New integrations needed
- `<tool>`: <propose adding `vault/integrations/<tool>.md`>

---
\`\`\`json
<full JSON>
\`\`\`
```

## Resume on approval

Invoke [`govern.md`](./govern.md) with the approved JSON.

## Anti-patterns

- Naming a tool that has no vault note — that's a TODO, not a binding. Either add the note or pick a documented alternative.
- Sequential edges where parallel would work. Costs latency budget for free.
- Generic `errorHandling: "retry"` without a strategy. Pick one of the named strategies.
- Forgetting HumanGates before destructive actions. This is the most common review-rejection reason.
