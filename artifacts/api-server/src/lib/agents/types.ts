export interface PrometheanNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description: string;
    systemLevel?: number | null;
    confidence?: number | null;
    rationale?: string | null;
    tools?: string[];
    status?: string;
    conditions?: string[];
    errorHandling?: string;
  };
}

export interface PrometheanEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  edgeType?: string;
  data?: {
    condition?: string | null;
    label?: string | null;
    edgeType?: string | null;
  };
}

export interface GovernanceConfig {
  loggingLevel: string;
  autoSnapshot: boolean;
  latencyThreshold: number;
  costThreshold: number;
  errorRateThreshold: number;
  alertChannels: string[];
  costLimitPerRun?: number;
  executionTimeoutMs?: number;
}

export interface DecompositionResult {
  nodes: PrometheanNode[];
  edges: PrometheanEdge[];
  summary: string;
}

export interface SystemSelectionResult {
  nodes: PrometheanNode[];
  edges: PrometheanEdge[];
  summary: string;
  systemTypeSummary: Record<string, number>;
  estimatedCostPerRun: number;
  estimatedLatencyMs: number;
}

export interface OrchestrationResult {
  nodes: PrometheanNode[];
  edges: PrometheanEdge[];
  summary: string;
}

export interface GovernanceResult {
  nodes: PrometheanNode[];
  edges: PrometheanEdge[];
  governanceConfig: GovernanceConfig;
  summary: string;
}
