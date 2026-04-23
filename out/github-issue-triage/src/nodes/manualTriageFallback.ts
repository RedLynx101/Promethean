/**
 * manual-triage-fallback-1 — L0 handler for classifier failures.
 *
 * Applies 'triage:manual' label, assigns @org/eng-triage. No draft, no page.
 * Reached via error edge from classify-1 per the graph's errorHandling:
 * fallback-to-l0 strategy.
 */
import type { WorkflowState } from "../state.js";

export async function manualTriageFallback(
  state: WorkflowState
): Promise<Partial<WorkflowState>> {
  // Deterministic. No external call needed at scaffold level.
  return {
    labels: ["triage:manual"],
    assignedTeam: "@org/eng-triage",
    fallbackTaken: true,
  };
}
