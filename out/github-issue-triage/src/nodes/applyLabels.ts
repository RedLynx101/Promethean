/**
 * apply-labels-1 — L0 GitHub label PUT.
 *
 * Deterministic map from severity -> labels via LABEL_MAP. Idempotent PUT on
 * the issue's label set per vault/integrations/integration-github-api.md.
 * errorHandling: retry-with-backoff.
 */
import { LABEL_MAP } from "../schemas.js";
import type { WorkflowState } from "../state.js";

const LIVE = process.env.LIVE === "true";

export async function applyLabels(
  state: WorkflowState
): Promise<Partial<WorkflowState>> {
  if (!state.classification) throw new Error("applyLabels requires classification");
  if (!state.issue) throw new Error("applyLabels requires issue");

  const labels = LABEL_MAP[state.classification.severity];

  if (LIVE) {
    // TODO(production): GitHub PUT /repos/:owner/:repo/issues/:number/labels
    // using GITHUB_TOKEN. Idempotency-Key = `${state.executionId}-${state.issue.issueNumber}-labels`.
    // See vault/integrations/integration-github-api.md.
    throw new Error("LIVE=true path not implemented in scaffold");
  }

  return { labels };
}
