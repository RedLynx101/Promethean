/**
 * draft-response-1 — L3 single LLM agent.
 *
 * Short (<=3 sentence) triage reply in the issue's voice, tailored to
 * severity. One Anthropic call, structured output, no tool use.
 * errorHandling: alert-and-skip (a missing draft falls back to a generic
 * ack at post-comment time; don't block labels/assign).
 */
import { DraftResultSchema, type DraftResult } from "../schemas.js";
import type { WorkflowState } from "../state.js";

const LIVE = process.env.LIVE === "true";

export async function draftResponse(
  state: WorkflowState
): Promise<Partial<WorkflowState>> {
  if (!state.classification || !state.issue) {
    throw new Error("draftResponse requires classification + issue");
  }

  let draft: DraftResult;

  if (LIVE) {
    // TODO(production): Anthropic messages API with tool-use structured output.
    //   const res = await anthropic.messages.create({
    //     model: "claude-3-5-sonnet-latest",
    //     system: `Draft a 1-3 sentence triage reply on a GitHub issue.
    //              Severity: ${state.classification.severity}.
    //              Match the reporter's tone (empathetic if frustrated, crisp if terse).
    //              Acknowledge, set expectations, link next step.`,
    //     messages: [{ role: "user", content: JSON.stringify(state.issue) }],
    //     tools: [{ name: "submit", input_schema: DraftResultSchema.shape }],
    //     tool_choice: { type: "tool", name: "submit" },
    //   });
    //   draft = DraftResultSchema.parse(res.content[0].input);
    throw new Error("LIVE=true path not implemented in scaffold");
  }

  // Deterministic stub — templated per severity.
  const templates: Record<string, string> = {
    bug: `Thanks for the report, @${state.issue.author}. We're taking a look and will follow up with a reproduction or a fix plan shortly. Contributions welcome if you've spotted the cause.`,
    "feature-request": `Thanks @${state.issue.author} — captured as a feature request. We review these on a rolling basis; no commitment on timing but we'll update this issue when it's discussed.`,
    question: `Thanks @${state.issue.author} — routing to our community team. They'll get back to you here; please also check our docs at https://example.com/docs in the meantime.`,
    security: `Thanks for the responsible disclosure, @${state.issue.author}. Our security team is reviewing now and will follow up out-of-band. Please don't share exploit details in this public thread.`,
  };

  draft = DraftResultSchema.parse({
    body: templates[state.classification.severity] ?? templates.question,
  });
  return { draft };
}
