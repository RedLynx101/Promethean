/**
 * classify-1 — L2 language understanding.
 *
 * Four-way closed-set intent classification. Per vault doctrine
 * (L2-language-understanding.md), this is L2 not L3 — intent
 * classification is the canonical L2 shape. Fine-tuned encoder in
 * production; Anthropic fallback here for simplicity.
 *
 * On failure, governance wrapper routes to manual-triage-fallback-1 via
 * errorHandling: fallback-to-l0.
 */
import { ClassifyResultSchema, type ClassifyResult } from "../schemas.js";
import type { WorkflowState } from "../state.js";

const LIVE = process.env.LIVE === "true";

export async function classify(
  state: WorkflowState
): Promise<Partial<WorkflowState>> {
  if (!state.issue) throw new Error("classify requires state.issue");

  let classification: ClassifyResult;

  if (LIVE) {
    // TODO(production): Anthropic call with structured output.
    // See vault/integrations/integration-anthropic-messages.md.
    //
    //   const res = await anthropic.messages.create({
    //     model: "claude-3-5-haiku-latest",
    //     system: "Classify the GitHub issue into one of: bug, feature-request, question, security.",
    //     messages: [{ role: "user", content: JSON.stringify(state.issue) }],
    //     tools: [{ name: "submit", input_schema: ClassifyResultSchema.shape }],
    //     tool_choice: { type: "tool", name: "submit" },
    //   });
    //   classification = ClassifyResultSchema.parse(res.content[0].input);
    throw new Error("LIVE=true path not implemented in scaffold");
  }

  // Deterministic stub: keyword-based, mirrors typical L2 encoder output
  const text = `${state.issue.title}\n${state.issue.body}`.toLowerCase();
  const securityKeywords = /\b(cve|exploit|xss|sql[-\s]?inject|rce|auth[-\s]?bypass|leak|vulnerab|security|credential|password|token[-\s]?leak)\b/;
  const bugKeywords = /\b(bug|broken|error|crash|traceback|stack[-\s]?trace|fails?|regression|doesn'?t work)\b/;
  const featureKeywords = /\b(feature[-\s]?request|would be nice|please add|wish|could you support)\b/;

  if (securityKeywords.test(text)) {
    classification = {
      severity: "security",
      confidence: 82,
      rationale: "Security-keyword match (CVE / exploit / vuln / credential etc.).",
    };
  } else if (bugKeywords.test(text)) {
    classification = {
      severity: "bug",
      confidence: 88,
      rationale: "Bug-keyword match (error / crash / broken).",
    };
  } else if (featureKeywords.test(text)) {
    classification = {
      severity: "feature-request",
      confidence: 81,
      rationale: "Feature-request phrasing.",
    };
  } else {
    classification = {
      severity: "question",
      confidence: 72,
      rationale: "No bug/feature/security signals — defaulting to question.",
    };
  }

  // Validate against schema before accepting
  return { classification: ClassifyResultSchema.parse(classification) };
}
