/**
 * Workflow runtime — a minimal LangGraph-shaped walker.
 *
 * This implements the Promethean edge-type semantics
 * (default / parallel / conditional / error / loop) against the approved
 * graph in promethean.json. Node signatures are compatible with
 * @langchain/langgraph so swapping to the real dep is mechanical.
 *
 * Kept in-repo to keep the scaffold's install footprint minimal and to
 * make the graph-walking logic explicit + testable. See README.md
 * § "Honesty notes" for the production-swap path.
 */
import { randomUUID } from "node:crypto";
import { initState, type WorkflowState } from "./state.js";
import { withGovernance, type GovernanceConfig } from "./governance.js";
import { validate } from "./nodes/validate.js";
import { classify } from "./nodes/classify.js";
import { manualTriageFallback } from "./nodes/manualTriageFallback.js";
import { applyLabels } from "./nodes/applyLabels.js";
import { assignTeam } from "./nodes/assignTeam.js";
import { draftResponse } from "./nodes/draftResponse.js";
import { pageOncall } from "./nodes/pageOncall.js";
import { postComment } from "./nodes/postComment.js";
import { securityGate } from "./nodes/securityGate.js";

// Load the approved workflow JSON at module load — used for governance config.
import prometheanJson from "../promethean.json" with { type: "json" };

const governanceConfig: GovernanceConfig = prometheanJson.workflow
  .governanceConfig as GovernanceConfig;

export interface RunResult {
  executionId: string;
  state: WorkflowState;
  flags: {
    labeled: boolean;
    assigned: boolean;
    drafted: boolean;
    commented: boolean;
    paged: boolean;
    gateApproved?: boolean;
    fallbackTaken: boolean;
  };
}

/**
 * Run the workflow end-to-end against a webhook body.
 *
 * Error semantics per-node governed by `errorHandling` in promethean.json:
 *   - classify failure routes to manualTriageFallback (fallback-to-l0)
 *   - draft-response failure is skipped (alert-and-skip); postComment falls
 *     back to generic ack
 *   - github / pagerduty nodes retry-with-backoff inside withGovernance
 *   - everything else alert-and-fail
 */
export async function runWorkflow(
  webhookBody: unknown,
  opts: { executionId?: string } = {}
): Promise<RunResult> {
  const state = initState(opts.executionId ?? randomUUID());

  // --- validate (L0, default edge) -----------------------------------------
  Object.assign(
    state,
    await withGovernance({
      nodeId: "validate-1",
      errorHandling: "alert-and-fail",
      state,
      config: governanceConfig,
      run: () => validate(webhookBody, state),
    })
  );

  // --- classify (L2). On fallback-to-l0 error, divert to manualTriageFallback.
  try {
    Object.assign(
      state,
      await withGovernance({
        nodeId: "classify-1",
        errorHandling: "fallback-to-l0",
        estimatedCostUsd: 0.0005,
        state,
        config: governanceConfig,
        run: () => classify(state),
      })
    );
  } catch (err) {
    const tagged = err as Error & { errorHandling?: string };
    if (tagged.errorHandling !== "fallback-to-l0") throw err;
    Object.assign(
      state,
      await withGovernance({
        nodeId: "manual-triage-fallback-1",
        errorHandling: "alert-and-fail",
        state,
        config: governanceConfig,
        run: () => manualTriageFallback(state),
      })
    );
    return finalize(state);
  }

  const severity = state.classification!.severity;

  // --- security branch: HumanGate before fan-out ---------------------------
  if (severity === "security") {
    Object.assign(
      state,
      await withGovernance({
        nodeId: "security-gate-1",
        errorHandling: "route-to-human-gate",
        state,
        config: governanceConfig,
        run: () => securityGate(state),
      })
    );
    if (!state.gate?.approved) {
      // Reject loop: in a real system, re-classify with gate.feedback and
      // retry. For scaffold, we log and terminate.
      state.accumulated.steps.push({
        nodeId: "e-gate-reject-loop",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        latencyMs: 0,
        costUsd: 0,
        status: "ok",
      });
      return finalize(state);
    }
  }

  // --- parallel fan-out (non-security default; security-approved also) -----
  // Labels / assign / draft run concurrently; page only on security approval.
  const fanout: Array<Promise<Partial<WorkflowState>>> = [
    withGovernance({
      nodeId: "apply-labels-1",
      errorHandling: "retry-with-backoff",
      state,
      config: governanceConfig,
      run: () => applyLabels(state),
    }).then((r) => r ?? {}),
    withGovernance({
      nodeId: "assign-team-1",
      errorHandling: "retry-with-backoff",
      state,
      config: governanceConfig,
      run: () => assignTeam(state),
    }).then((r) => r ?? {}),
    withGovernance({
      nodeId: "draft-response-1",
      errorHandling: "alert-and-skip",
      estimatedCostUsd: 0.01,
      state,
      config: governanceConfig,
      run: () => draftResponse(state),
    }).then((r) => r ?? {}),
  ];

  if (severity === "security") {
    fanout.push(
      withGovernance({
        nodeId: "page-oncall-1",
        errorHandling: "retry-with-backoff",
        state,
        config: governanceConfig,
        run: () => pageOncall(state),
      }).then((r) => r ?? {})
    );
  }

  const results = await Promise.all(fanout);
  for (const patch of results) Object.assign(state, patch);

  // --- join: post comment --------------------------------------------------
  Object.assign(
    state,
    await withGovernance({
      nodeId: "post-comment-1",
      errorHandling: "retry-with-backoff",
      state,
      config: governanceConfig,
      run: () => postComment(state),
    })
  );

  return finalize(state);
}

function finalize(state: WorkflowState): RunResult {
  state.accumulated.steps.push({
    nodeId: "end-1",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    latencyMs: 0,
    costUsd: 0,
    status: "ok",
  });
  return {
    executionId: state.executionId,
    state,
    flags: {
      labeled: !!state.labels?.length,
      assigned: !!state.assignedTeam,
      drafted: !!state.draft,
      commented: !!state.commented,
      paged: !!state.paged,
      gateApproved: state.gate?.approved,
      fallbackTaken: !!state.fallbackTaken,
    },
  };
}
