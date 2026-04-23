/**
 * assign-team-1 — L0 GitHub team assignment.
 *
 * Deterministic map via TEAM_MAP. errorHandling: retry-with-backoff.
 */
import { TEAM_MAP } from "../schemas.js";
import type { WorkflowState } from "../state.js";

const LIVE = process.env.LIVE === "true";

export async function assignTeam(
  state: WorkflowState
): Promise<Partial<WorkflowState>> {
  if (!state.classification) throw new Error("assignTeam requires classification");
  const team = TEAM_MAP[state.classification.severity];

  if (LIVE) {
    // TODO(production): POST /repos/:owner/:repo/issues/:number/assignees
    // with the team's bot handle expanded. See integration-github-api.md.
    throw new Error("LIVE=true path not implemented in scaffold");
  }

  return { assignedTeam: team };
}
