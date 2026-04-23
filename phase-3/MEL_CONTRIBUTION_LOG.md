# Mel — contribution & change log (working document)

**Purpose:** Single place to track repo changes for **Phase 3 team documentation**, **Mel’s contribution notes**, and **copy-paste into GitHub PR / branch descriptions**. Update this file as you merge or add more work.

**How to use**

1. Before opening a PR: skim this file, add a **PR summary** block at the bottom (date, branch name, one paragraph).
2. For Canvas / Phase 3 “individual contribution”: pull bullets from the sections that match your role (docs, evidence, dev UX, code fixes).
3. Keep it honest: if something was **suggested or drafted by an AI assistant**, say so in the final report’s `AI_USAGE.md` (already points at disclosure norms).

---

## Session / workstream summary (chronological)

### Phase 3 documentation & evidence package

| Area | What changed | Paths |
|------|----------------|--------|
| Phase 3 index | Deliverable table, folder layout, link to real trace exports | `phase-3/README.md` |
| Final report | Problem, architecture (incl. mermaid), evaluation, failure analysis, rubric cross-ref | `phase-3/final_report.md` |
| Test scenarios | Five cases aligned to `phase-2/05-evaluation-plan.md`; notes on real vs illustrative traces | `phase-3/evidence/test_cases.md` |
| Evaluation results | CSV with metrics + `exported_trace_or_log` column for submission filenames | `phase-3/evidence/evaluation_results.csv` |
| Failure log | Two cases (F1 over-tooling, F2 vendor hallucination) with mitigations | `phase-3/evidence/failure_log.md` |
| Version notes | v0.1.0 / Phase 3 scope | `phase-3/evidence/version_notes.md` |
| Video | 5-minute outline for recording | `phase-3/video_outline.md` |
| AI usage (Phase 3) | Disclosure for doc drafting vs real run evidence | `phase-3/AI_USAGE.md` |
| Individual reflections | Short reflection files (team should personalize) | `phase-3/reflections/*.md` |
| Screenshot index | Note that written evidence is in `phase-3/`; capture checklist for PNGs | `phase-3/screenshots/screenshot_index.md` (tweak) |

### Traces: course alignment (Track A = real system evidence)

| Area | What changed | Paths |
|------|----------------|--------|
| Provenance | **Illustrative** JSON moved to `traces/illustrative/`; **real** exports go in `traces/exports/` | `phase-3/traces/illustrative/*.json`, `phase-3/traces/exports/.gitkeep` |
| How to export | README with API/DB instructions; `GET /api/pipeline/:id/status` as primary capture | `phase-3/traces/README.md` |
| Script | `export-pipeline-trace.ts` + `pnpm run export-pipeline-trace` | `scripts/src/export-pipeline-trace.ts`, `scripts/package.json` |

### Root / onboarding

| Area | What changed | Paths |
|------|----------------|--------|
| README | Phase 3 pointer; real trace location; `.env` / two-terminal `PORT` note | `README.md` |
| Env template | `.env.example` (no secrets) + comments for two terminals | `.env.example` |
| Git ignore | Ignore `.env`, `.env.local` | `.gitignore` |

### API server (bugfix)

| Area | What changed | Paths |
|------|----------------|--------|
| Alerts route | Import **`DismissAlertParams`** (from OpenAPI `dismissAlert`) instead of non-existent `DeleteAlertParams` — fixes **esbuild build failure** | `artifacts/api-server/src/routes/alerts/index.ts` |

### Promethean UI (dev reliability + wizard UX)

| Area | What changed | Paths |
|------|----------------|--------|
| Apple Silicon / pnpm | Optional native deps pinned so Vite can load Rollup, Lightning CSS, Tailwind Oxide on **darwin-arm64** | `artifacts/promethean/package.json` (e.g. `@rollup/rollup-darwin-arm64`, `lightningcss-darwin-arm64`, `@tailwindcss/oxide-darwin-arm64`) |
| Workflow wizard | “Stuck at 7/8”: do not set `isDone` before API success; show **8/8** after last field; **onError** message; **Retry starting pipeline**; `scriptStep` advances to end of script on submit | `artifacts/promethean/src/pages/WorkflowWizard.tsx` |
| Workflow wizard — multiline Enter-to-send | Fixed: on multiline prompts (**description**, **guardrails**) the placeholder promised `Enter to send / Shift+Enter for newline`, but `handleKeyDown` skipped multiline inputs, so Enter inserted a newline and users got stuck at step 7 (guardrails). Removed the multiline exception so Enter always submits | `artifacts/promethean/src/pages/WorkflowWizard.tsx` (`handleKeyDown`) |
| Workflow editor — node auto-layout | Graph was cramped/overlapping because LLM-returned node positions clustered and the 3-col grid fallback ignored node size. Added `@dagrejs/dagre` and a small `autoLayout()` helper (left-to-right DAG, ranksep 120 / nodesep 60) that re-positions nodes whenever they load from the server or the orchestration-plan fallback | `artifacts/promethean/src/lib/workflowLayout.ts` (new), `artifacts/promethean/src/pages/WorkflowEditor.tsx`, `artifacts/promethean/package.json` (`@dagrejs/dagre`) |
| Wizard redesign — form + refinement chat | Replaced the 8-prompt linear chat with a **two-phase intake**: (1) Form for Name / Description / Risk / Oversight / Budget with validation (description must be ≥30 chars). (2) LLM-powered **refinement chat** where Prometheus assesses the description for sufficiency (data source + problem + outcome), asks ONE focused follow-up if thin, then suggests Domain / Compliance / Guardrails. User can edit each suggestion inline before clicking LAUNCH PIPELINE. New agent + route; same `/workflows` + `/pipeline/start` still triggers at the end | **Backend:** `artifacts/api-server/src/lib/agents/intakeRefinement.ts` (new), `artifacts/api-server/src/routes/wizard/index.ts` (new), `artifacts/api-server/src/routes/index.ts` (wired). **Frontend:** `artifacts/promethean/src/pages/WorkflowWizard.tsx` (full rewrite — `FormPanel` + `ChatPanel` components, suggestion cards with per-field edit) |
| Compliance / guardrails grounding doc | Added a curated reference of ~15 frameworks (HIPAA, HITECH, GDPR, CCPA, PCI-DSS, SOX, GLBA, SOC 2, ISO 27001/42001, NIST AI RMF / 800-53, FERPA, FCRA, FINRA 17a-4, EU AI Act, COPPA) plus a guardrail pattern library (data handling, financial, access, AI-specific, communication, change control) and a risk/oversight calibration matrix. Agent now grounds its compliance + guardrail suggestions in this doc; the prompt forbids invented frameworks. Doc is bundled into the server via esbuild `.md` text loader so the single `.md` stays the source of truth. Verified: PHI workflow → `HIPAA, HITECH`; payments workflow → `PCI-DSS, SOC 2`, each with guardrails lifted verbatim from the reference | `artifacts/api-server/src/lib/agents/grounding/complianceStandards.md` (new), `artifacts/api-server/src/lib/agents/grounding/markdown.d.ts` (new), `artifacts/api-server/src/lib/agents/intakeRefinement.ts` (imports + system prompt), `artifacts/api-server/build.mjs` (`.md` text loader) |

### Pivot: emit phase (design in UI, deploy from curated cookbook)

The original architecture ended at an approved workflow JSON; `POST /executions` simulated runs with `Math.random()`. This pivot adds the fifth phase — **emit** — that turns the approved UI output into real runnable code (LangGraph / Inngest / Temporal / n8n / Claude Agent SDK / plain script) via a curated vault consumed by a harnessed agent over MCP. The UI owns design (phases 1–4, unchanged); the vault owns deploy.

| Area | What changed | Paths |
|------|----------------|--------|
| Architectural rationale | One-page explainer of why the pivot, emit boundary diagram, honest tradeoffs, reproduction recipe | `PIVOT.md` (new) |
| Root README | Rewritten to lead with design-in-UI + build-from-cookbook narrative; end-to-end diagram; project status bumped to v0.2.0 ALPHA with honest known-gaps section; preserves all existing team content (team, screenshots, spectrum, tech stack, getting-started) | `README.md` |
| Simulated executor flagged | Header + inline comments on `POST /executions` route marking it LEGACY / SIMULATED with pointer to the real emit path. No behaviour change. | `artifacts/api-server/src/routes/executions/index.ts` |
| Vault (43 curated notes) | Obsidian-compatible markdown cookbook. `integrations/` (10 per-tool notes: auth, idempotency, rate limits, common failures), `patterns/` (5 edge-type + error-strategy notes), `governance/` (8 policy notes + risk-profile table), `spectrum/` (L0–L5 doctrine + HumanGate + Trigger + index), `templates/` (6 reference workflows). Every note has YAML frontmatter (`type`, `id`, `tags`, `linksTo`) and `[[wikilinks]]` between notes. | `vault/*` |
| Skills | Five markdown skill files. `emit.md` is the **canonical pivot skill** — reads `vault/integrations/` for every tool in the graph, emits runnable code + tests + README into `out/<slug>/`. Archived `decompose.md`, `classify.md`, `orchestrate.md`, `govern.md` as **alternative headless entry points** — not canonical path. | `skills/README.md`, `skills/emit.md`, `skills/archive/*` |
| MCP vault server | TypeScript stdio MCP server exposing the vault to any MCP-aware harness. Five tools: `vault_list`, `vault_get`, `vault_search`, `spectrum_schema`, `vault_reload`. Resolves `[[wikilinks]]` via frontmatter id. 43 notes load cleanly; typecheck clean. | `artifacts/mcp-vault/` (new workspace package) |
| Project-scoped MCP wiring | `.mcp.json` at repo root wires the `promethean-vault` MCP server into any Claude Code session started from the repo root. | `.mcp.json` (new) |
| Emit endpoint | `POST /api/workflows/:id/emit { targetFramework }` — validates the workflow is approved, writes a manifest to `emit-requests/<slug>-<timestamp>.json` with the full approved workflow JSON + harness instructions. Companion `GET /api/workflows/:id/emit` for build history. Registered in routes index. | `artifacts/api-server/src/routes/emit/index.ts` (new), `artifacts/api-server/src/routes/index.ts` |
| Emit-request queue | Directory with `.gitkeep` + README documenting manifest shape and manual harness-processing loop (until a file-watcher daemon is added). | `emit-requests/` (new) |
| Frontend: Build button | `BuildButton.tsx` component — dropdown picker for the 7 target frameworks; calls `POST /api/workflows/:id/emit`; shows queued request id / build history / error state. Wired into `WorkflowDetail.tsx` between the Open Editor and RUN buttons. Disabled until all four design phases are approved; tooltip explains why. Run button tooltip updated to flag it as legacy/simulated. | `artifacts/promethean/src/components/BuildButton.tsx` (new), `artifacts/promethean/src/pages/WorkflowDetail.tsx` |
| First real emit | End-to-end demo: simulated manifest → `skills/emit.md` → generated `out/github-issue-triage/` (22 files: README, package.json, tsconfig, .env.example, .gitignore, promethean.json, src/{state,schemas,governance,workflow,index}.ts, src/nodes/×9, tests/smoke.test.ts, EMIT_MANIFEST.json). **Typechecks clean. 4/4 smoke tests pass** (bug path, security+approve, security+reject, governance cost tracking). | `out/github-issue-triage/*`, `emit-requests/github-issue-triage-2026-04-22T22-57-00-000Z.json` |
| Phase-3 evidence (pivot) | Three-file bundle documenting vault consumability via MCP + the actual emit; reframed in scope to match the UI-primary architecture. New `h_emit_*` summary is the **primary** evidence for the pivot's headline claim. | `phase-3/traces/exports/h_pivot_github-triage_20260422_SUMMARY.md` (reframed), `phase-3/traces/exports/h_pivot_github-triage_20260422_phase{1,2}-*.md`, `phase-3/traces/exports/h_pivot_mcp-vault_20260422_jsonrpc-trace.jsonl`, `phase-3/traces/exports/h_emit_github-triage_20260422_SUMMARY.md` (new, headline) |
| Phase-3 index pointer | Added "Pivot architecture note" paragraph in `phase-3/README.md` pointing at `PIVOT.md` and the `h_pivot_*` / `h_emit_*` bundles. | `phase-3/README.md` |

Verification:

- `pnpm --filter @workspace/mcp-vault run typecheck` — clean
- `pnpm --filter @workspace/mcp-vault run build` — emits `dist/index.js`
- MCP stdio JSON-RPC smoke — `initialize`, `tools/list` (5 tools), `vault_search`, `vault_get` (wikilinks resolved), `spectrum_schema` all return expected data
- `pnpm --filter @workspace/promethean run typecheck` — clean after `BuildButton` addition
- `pnpm --filter @workspace/api-server run typecheck` — clean for new `routes/emit/index.ts` (unrelated pre-existing `emit.smoke.ts` errors untouched)
- `cd out/github-issue-triage && pnpm install && pnpm run typecheck && pnpm test` — typecheck clean, **4/4 tests pass**

Honest caveats (called out in the `h_emit_*` summary):

- Generated code stubs external calls by default (`LIVE=true` to hit real Anthropic / GitHub / PagerDuty); all `LIVE=true` branches have full production code in comments with vault citations.
- Graph runtime is an in-repo 150-line walker, not `@langchain/langgraph` — swap is mechanical (node signatures compatible), explicitly flagged in README.
- HumanGate uses filesystem signals for scaffold hermeticity; Slack approval-button swap-path documented inline.
- Four-phase approved workflow for the first emit was synthesised from phase-2 classification + phase-3 orchestration-reference draft rather than persisted through the live UI (blocked only by shipping the new Build button UI, which this commit does).

### Operational notes (not committed as code)

- **ZooKeeper (Homebrew):** not used by Promethean; if port conflicts occur, `brew services stop zookeeper` or free the port; unrelated to app setup steps.
- **Port 8080 in use:** often a leftover `node` (API) or other process — `lsof -i :8080` then stop the process or use another port (and match Vite proxy in `vite.config.ts` if you change API port).

---

## Suggested text for “Mel’s contribution” (edit to match what you actually did)

- Framed Phase 3 submission structure: evidence folder, trace provenance rules, and alignment with the course rubric (real API/DB exports vs illustrative JSON).
- Authored or structured: `final_report.md`, `test_cases.md`, `failure_log.md`, `version_notes.md`, `video_outline.md`, `reflections/mel_wong.md`, and Phase 3 `AI_USAGE.md` (adjust as needed for accuracy).
- Added `scripts/src/export-pipeline-trace.ts` to support **real** `GET /api/pipeline/:workflowId/status` exports for the evidence package.
- Repository hygiene: `.env.example`, `.gitignore` for secrets, root `README` setup notes.
- Code fixes: `DismissAlertParams` in alerts route; macOS **optional dependency** devDependencies for Vite; **WorkflowWizard** pipeline start error handling and progress display.
- **Pivot architecture (v0.2.0 — emit phase).** Identified that the original architecture ends at approved JSON and simulates execution with `Math.random()`, then framed and executed the pivot: **design stays in the Promethean UI (phases 1–4 unchanged); deploy happens via a new emit phase that reads a curated markdown cookbook and writes real runnable code.**
  - Designed and wrote the curated vault (43 notes across spectrum, governance, patterns, integrations, templates), the five skill files (`emit.md` canonical + four archived headless alternatives), and the `@workspace/mcp-vault` MCP stdio server (5 tools, resolves wikilinks by frontmatter id).
  - Added the emit boundary: `POST /api/workflows/:id/emit` endpoint + `emit-requests/` queue + `.mcp.json` wiring Claude Code to the vault on repo-root launch + `BuildButton.tsx` on the workflow detail page.
  - Ran the first end-to-end real emit: generated `out/github-issue-triage/` (22-file LangGraph-shaped TypeScript project — Zod schemas, governance middleware enforcing cost-cap/latency/timeout/retry/snapshot/alert, five edge-type semantics, HumanGate with real block-on-file-signal, Anthropic/GitHub/PagerDuty tool stubs behind `LIVE=true`, real HMAC webhook verify). `pnpm test` → **4/4 passed**, including bug path, security-approve, security-reject, and governance cost tracking.
  - Authored `PIVOT.md` (architectural rationale + honest tradeoffs) and two phase-3 evidence bundles: `h_pivot_*` (vault is agent-consumable via MCP, secondary) and `h_emit_*` (emit phase produces typechecked + test-passing code, **primary** evidence for the pivot's headline claim).
  - Rewrote root `README.md` to lead with the new architecture while preserving all existing team content (team, screenshots, spectrum, tech stack, getting-started).

---

## PR / branch checklist (copy when you open GitHub)

- [ ] Title: short, e.g. `Phase 3 evidence, trace export, wizard + API fixes`
- [ ] Description: link to `phase-3/MEL_CONTRIBUTION_LOG.md` or paste “Session summary” bullets
- [ ] Confirm `pnpm run typecheck` (or at least `api-server` + `promethean`) passes
- [ ] No secrets in diff (no `.env` commit)

---

## Log — add your own entries below

| Date | Branch / PR | Notes |
|------|-------------|--------|
| 2026-04 | _(fill in)_ | Initial consolidation of Phase 3 docs, traces layout, scripts, and fixes above |
| 2026-04-22 | `phase-3-fix_yiying` | Wizard fix: Enter now submits on multiline prompts (description, guardrails). Placeholder hint and `handleKeyDown` were out of sync — users couldn't get past step 7 (guardrails) without clicking Send. See `artifacts/promethean/src/pages/WorkflowWizard.tsx`. |
| 2026-04-22 | `phase-3-fix_yiying` | Editor readability: added dagre auto-layout so workflow graph nodes no longer overlap. New helper `src/lib/workflowLayout.ts`; called from both load paths in `WorkflowEditor.tsx`. Added `@dagrejs/dagre` dep. |
| 2026-04-22 | `phase-3-fix_yiying` | Intake redesign: wizard is now a 5-field form followed by an LLM-powered refinement chat (`POST /api/wizard/refine` → `intakeRefinement` agent). Agent validates description sufficiency, asks targeted follow-ups, then suggests domain / compliance / guardrails; user edits inline and launches. Full rewrite of `WorkflowWizard.tsx`. |
| 2026-04-22 | `phase-3-fix_yiying` | Grounding doc for compliance + guardrails: `grounding/complianceStandards.md` lists ~15 real frameworks (HIPAA, PCI-DSS, GDPR, SOC 2, SOX, EU AI Act, etc.) and a guardrail pattern library. Bundled into the server via esbuild `.md` text loader. Prompt now forbids invented frameworks and forces grounding. Smoke-tested with PHI + cardholder-data scenarios — both returned the correct citations and verbatim guardrails. |
| 2026-04-22 | `phase-3-fix_yiying` | Grounding doc expanded to one dedicated entry per domain in the fixed list (Customer Success, Sales, Engineering, Legal & Compliance, Security, Data Engineering, Finance, Marketing, Operations, HR), each with a default framework stack, conditional additions, and a guardrail focus. Smoke-tested HR / Marketing / Security / Legal scenarios — each now cites the right frameworks and pulls matching guardrails. |
| 2026-04-22 | `phase-3-fix_yiying` (commit `7917ea7`) | **Pivot commit — vault + MCP server + emit skill.** Added 43-note curated cookbook (`vault/`), five skill files (`skills/emit.md` canonical + four archived headless alternatives under `skills/archive/`), new workspace package `@workspace/mcp-vault` (TypeScript stdio MCP server exposing vault via 5 tools), `.mcp.json` for Claude Code wiring, `POST /api/workflows/:id/emit` endpoint + `emit-requests/` queue directory, and `PIVOT.md` architectural rationale. Rewrote root `README.md` to lead with the design-in-UI + build-from-cookbook narrative. Flagged simulated `POST /executions` route as LEGACY / SIMULATED in-source. First evidence bundle `h_pivot_*` in `phase-3/traces/exports/` (MCP JSON-RPC trace + two Claude-Code-produced proposal files, scoped as secondary "vault is agent-consumable" evidence). 76 files, +5248/-108. |
| 2026-04-22 | `phase-3-fix_yiying` (follow-up) | **First real emit + Build button.** Wired `BuildButton.tsx` into `WorkflowDetail.tsx` (target-framework picker, build history, disabled until phases 1–4 approved). Produced `out/github-issue-triage/` — 22-file LangGraph-shaped TypeScript project generated from `skills/emit.md` against an approved workflow manifest. Zod schemas at every boundary, governance middleware enforcing cost-cap / latency / timeout / retry / snapshot / alert, five edge-type semantics, HumanGate with file-signal block, Anthropic/GitHub/PagerDuty stubs behind `LIVE=true`. **`pnpm run typecheck` clean; `pnpm test` 4/4 passing.** Added `h_emit_*` summary — the primary phase-3 evidence for the pivot's headline claim that approved designs translate into working code. |

---

_This file is maintained for Mel’s Phase 3 contribution documentation. Update the table and bullets when you add commits._
