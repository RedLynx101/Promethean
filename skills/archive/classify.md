---
skill: classify
phase: 2
reads: [vault/spectrum/L0-deterministic.md, vault/spectrum/L1-supervised-ml.md, vault/spectrum/L2-language-understanding.md, vault/spectrum/L3-single-llm-agent.md, vault/spectrum/L4-tool-augmented-llm.md, vault/spectrum/L5-multi-agent.md]
emits: proposals/<workflow-id>-2-classification.md
schema: SystemSelectionResultSchema
---

# Skill: Classify

**You are the System Selection phase of Promethean.** Take a decomposed workflow and assign each node a System Spectrum level (L0–L5) with confidence + rationale.

## Inputs

- The approved decomposition JSON from phase 1 (`proposals/<id>-1-decomposition.md` → JSON block).
- `description`, `constraints`, `feedback` (if rejected previously).

## Read first (mandatory)

All six level notes:

1. `vault/spectrum/L0-deterministic.md`
2. `vault/spectrum/L1-supervised-ml.md`
3. `vault/spectrum/L2-language-understanding.md`
4. `vault/spectrum/L3-single-llm-agent.md`
5. `vault/spectrum/L4-tool-augmented-llm.md`
6. `vault/spectrum/L5-multi-agent.md`

Also read `vault/spectrum/HumanGate.md` — for any node that reads as "approve / review", classify it as a HumanGate, not a level.

## Classification rules (CRITICAL — copy from `systemSelection.ts`)

1. **ALWAYS start at L0.** Justify every level increase explicitly in `data.rationale`.
2. Only go to **L1** if L0 cannot handle uncertainty/variation.
3. Only go to **L3+** if genuine language generation or complex reasoning is required.
4. Only go to **L5** if multiple genuinely independent agents need to collaborate.
5. Assign a **confidence** 0–100. **<60 means flag for human review** (downstream the orchestrator will route through a HumanGate).
6. Preserve all original node IDs and positions.

## Output

JSON matching `SystemSelectionResultSchema`:

```json
{
  "nodes": [
    {
      "id": "<original-id>",
      "type": "custom",
      "position": { "x": ..., "y": ... },
      "data": {
        "label": "...",
        "description": "...",
        "systemLevel": 0,
        "confidence": 95,
        "rationale": "Why this level and not the next one up.",
        "tools": [],
        "status": "idle"
      }
    }
  ],
  "edges": [...preserve from input...],
  "summary": "Composition summary, e.g., '4× L0, 1× L2, 1× L3 — read-heavy with one classifier and one drafter'",
  "estimatedCostPerRun": 0.045,
  "estimatedLatencyMs": 2500
}
```

Estimate cost and latency by summing per-node estimates from the level notes (L0 ≈ $0/100ms, L3 ≈ $0.01/3s, etc.).

## Proposal file

`proposals/<workflow-id>-2-classification.md`:

```markdown
---
phase: 2-classification
workflowId: <id>
status: pending-review
estimatedCostPerRun: 0.045
estimatedLatencyMs: 2500
---

# Classification Proposal

## Per-node levels
| Node | Level | Confidence | Rationale |
|------|-------|------------|-----------|
| ... |

## Distribution
- L0: N
- L1: N
- ...

## Low-confidence nodes (need orchestrator HumanGate)
- ...

## Cost / latency estimate
- Per run: $X
- Latency: Yms

---
\`\`\`json
<full JSON>
\`\`\`
```

## Resume on approval

Invoke [`orchestrate.md`](./orchestrate.md) with the approved JSON.

## Anti-patterns

- Defaulting everything to L3 because "LLMs are general." Drives cost up and latency through the roof.
- Skipping rationale or writing tautologies ("This is L3 because it uses an LLM"). Explain *why this level and not the next one down*.
- Pretending you're confident on L4/L5 nodes. Be honest — most agentic steps deserve <80 confidence.
