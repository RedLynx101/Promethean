---
type: index
id: spectrum-index
tags: [spectrum, classification]
---

# Promethean System Spectrum

Every workflow node is classified on a 6-level autonomy spectrum. **Always start at L0 and justify every level increase** — higher levels mean more cost, more variance, more risk, and tighter governance.

| Level | Note | Color | One-liner |
|-------|------|-------|-----------|
| L0 | [[L0-deterministic]] | `#4CAF50` | Rule-based, 100% predictable. Zero AI. |
| L1 | [[L1-supervised-ml]] | `#2196F3` | Trained classifier/regressor, narrow domain. |
| L2 | [[L2-language-understanding]] | `#9C27B0` | NLP/NLU — understands but doesn't generate. |
| L3 | [[L3-single-llm-agent]] | `#FF9800` | One LLM call, structured output, no tools. |
| L4 | [[L4-tool-augmented-llm]] | `#F44336` | LLM + tool calls (search, APIs, code exec). |
| L5 | [[L5-multi-agent]] | `#E91E63` | Coordinated multi-agent system with handoffs. |

Plus two special node types:

- [[HumanGate]] — manual approval checkpoint
- [[Trigger]] — workflow entry point (webhook, cron, queue, manual)

## Selection rules

1. **Always start at L0.** Justify every level increase in the node's `rationale`.
2. Only go to **L1** if L0 cannot handle uncertainty/variation.
3. Only go to **L2** if you need to extract meaning from language but not generate.
4. Only go to **L3** if you need genuine generation/reasoning.
5. Only go to **L4** if the LLM needs external context that can't be passed in the prompt.
6. Only go to **L5** if multiple genuinely independent agents need to collaborate with handoffs.
7. Assign a **confidence score 0–100**. `< 60` means flag for human review.
