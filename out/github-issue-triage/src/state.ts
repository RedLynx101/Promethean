/**
 * Shared workflow state. Passed between nodes. Each node returns a partial
 * patch that the runtime merges into state.
 */

export type Severity = "bug" | "feature-request" | "question" | "security";

export interface IssuePayload {
  repo: string;
  issueNumber: number;
  title: string;
  body: string;
  author: string;
  existingLabels: string[];
}

export interface ClassifyResult {
  severity: Severity;
  confidence: number;
  rationale: string;
}

export interface DraftResult {
  body: string;
}

export interface GateDecision {
  approved: boolean;
  reviewer?: string;
  feedback?: string;
}

export interface WorkflowState {
  executionId: string;

  // Upstream
  issue?: IssuePayload;
  classification?: ClassifyResult;

  // Fan-out outputs
  labels?: string[];
  assignedTeam?: string;
  draft?: DraftResult;

  // Security branch
  gate?: GateDecision;
  paged?: boolean;

  // Terminal flags
  commented?: boolean;
  fallbackTaken?: boolean;

  // Governance accumulators
  accumulated: {
    costUsd: number;
    steps: Array<{
      nodeId: string;
      startedAt: string;
      completedAt: string;
      latencyMs: number;
      costUsd: number;
      status: "ok" | "error" | "skipped" | "retried";
      error?: string;
    }>;
  };
}

export function initState(executionId: string): WorkflowState {
  return {
    executionId,
    accumulated: { costUsd: 0, steps: [] },
  };
}
