/**
 * page-oncall-1 — L0 PagerDuty trigger. Fires ONLY from the approved
 * security branch. dedup_key coalesces retries per
 * vault/integrations/integration-pagerduty.md.
 */
import type { WorkflowState } from "../state.js";

const LIVE = process.env.LIVE === "true";

export async function pageOncall(
  state: WorkflowState
): Promise<Partial<WorkflowState>> {
  if (!state.issue || !state.classification) {
    throw new Error("pageOncall requires issue + classification");
  }
  if (state.classification.severity !== "security") {
    // Defensive — this node should only be reached from the security-gate
    // approve branch. Skip rather than page if somehow reached otherwise.
    return { paged: false };
  }

  const dedupKey = `${state.issue.repo}-security-${state.issue.issueNumber}`;

  if (LIVE) {
    // TODO(production): POST https://events.pagerduty.com/v2/enqueue
    // with { routing_key, event_action: "trigger", dedup_key, payload: { ... } }.
    // See integration-pagerduty.md for the full envelope + severity mapping.
    throw new Error("LIVE=true path not implemented in scaffold");
  }

  // Stub — log the intent; real scaffold would actually enqueue.
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({ evt: "pagerduty.stub", dedupKey, executionId: state.executionId })
  );
  return { paged: true };
}
