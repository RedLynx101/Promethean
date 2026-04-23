# Archived skills — alternative headless entry points

The four files here (`decompose.md`, `classify.md`, `orchestrate.md`, `govern.md`) are **archived alternatives**. They document how a harnessed agent could perform phases 1–4 of the Promethean pipeline directly against the vault, bypassing the Promethean UI.

## Why they're archived

The canonical Promethean flow runs phases 1–4 in the **Promethean UI** (Wizard → visual editor → approval gates) via the in-process agents in `artifacts/api-server/src/lib/agents/*.ts`. Humans design workflows there, where the graph editing, diff review, and feedback loops are good.

The vault's role in the canonical flow is the **cookbook at emit time** — `skills/emit.md` reads `vault/integrations/` and `vault/patterns/` to translate an approved workflow into real runnable code. See [`../README.md`](../README.md).

## When you'd use these archived skills

- **CI / batch:** generate workflow blueprints from a list of briefs without a human driving a UI.
- **Prompt-driven demos:** "here's a brief, produce the full four-phase spec" as a one-shot Claude Code session.
- **Alternative transport evidence:** the `h_pivot_*` evidence bundle in [`../../phase-3/traces/exports/`](../../phase-3/traces/exports/) was produced using these archived skills via MCP, as secondary proof that the vault is agent-consumable.

## Contract with the vault

All four skills read from `vault/spectrum/`, `vault/patterns/`, `vault/governance/`, `vault/integrations/`, and `vault/templates/`. None of that vault content is deprecated — the spectrum, governance policies, and patterns remain the canonical reference material cited by both humans in the UI and the emit skill.

## Status

Kept for reference and as a documented alternative entry point. Not deleted — the file contents are still correct and the MCP server still exposes the vault sections they read. Promote one back out of `archive/` if the CI / batch use case becomes real.
