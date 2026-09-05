/** Shared, transport-safe product contracts. Canvas geometry is deliberately separate. */
export type ModelName = 'gpt-5.6-luna' | 'gpt-5.6-terra';
export type RunMode = 'local' | 'live';
export type Archetype =
  'manual' | 'rules' | 'model-task' | 'assistant' | 'ai-workflow' | 'tool-agent' | 'multi-agent';
export type StepKind =
  | 'validate'
  | 'transform'
  | 'condition'
  | 'classify'
  | 'retrieve'
  | 'draft'
  | 'approval'
  | 'outbox';
export type JsonRecord = Record<string, unknown>;
export interface Evidence {
  id: string;
  title: string;
  source: string;
  excerpt: string;
  category: 'methodology' | 'example' | 'failure' | 'evaluation';
  revision: string;
  verified: boolean;
}
export interface Provenance {
  requirement: string;
  rationale: string;
  evidenceIds: string[];
  alternatives: string[];
  rubricVersion: string;
  testedBy: string[];
  status: 'supported' | 'untested' | 'unresolved' | 'stale';
}
export interface WorkflowNode {
  id: string;
  label: string;
  description: string;
  kind: StepKind;
  archetype: Archetype;
  config: JsonRecord;
  provenance: Provenance;
}
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}
export interface Brief {
  goal: string;
  inputs: string;
  outputs: string;
  volume: string;
  constraints: string[];
  successCriteria: string[];
  unknowns: string[];
}
export interface Candidate {
  id: string;
  name: string;
  archetype: Archetype;
  summary: string;
  tradeoffs: string[];
  evidenceIds: string[];
  requiresModel: boolean;
  implementation: 'rules' | 'enhanced-rules' | 'model';
}
export interface TestCase {
  id: string;
  name: string;
  input: JsonRecord;
  expected: JsonRecord;
  description: string;
}
export interface Decision {
  recommendation: string;
  rationale: string;
  candidateId: string;
  evidenceIds: string[];
  status: 'proposed' | 'needs-information' | 'tested';
  questions: string[];
}
export interface Workflow {
  id: string;
  name: string;
  description: string;
  revision: number;
  schemaVersion: string;
  rubricVersion: string;
  exampleId: string | null;
  status: 'draft' | 'validated' | 'tested' | 'enabled' | 'paused';
  createdAt: string;
  updatedAt: string;
  brief: Brief;
  decision: Decision;
  candidates: Candidate[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  tests: TestCase[];
  sampleInput: JsonRecord;
  designSource: 'local-rubric' | 'openai';
  model: ModelName | null;
}
export interface Usage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  model: ModelName | null;
  latencyMs: number;
}
export interface RunEvent {
  id: string;
  sequence: number;
  at: string;
  nodeId: string | null;
  type:
    | 'started'
    | 'step-started'
    | 'step-completed'
    | 'approval-required'
    | 'approved'
    | 'denied'
    | 'failed'
    | 'cancelled'
    | 'completed'
    | 'resumed';
  message: string;
  input?: JsonRecord;
  output?: JsonRecord;
}
export interface StepResult {
  nodeId: string;
  label: string;
  status: 'completed' | 'failed' | 'awaiting-approval' | 'skipped';
  input: JsonRecord;
  output: JsonRecord;
  error: string | null;
  usage: Usage;
}
export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowRevision: number;
  candidateId: string;
  mode: RunMode;
  status:
    'queued' | 'running' | 'awaiting-approval' | 'completed' | 'failed' | 'cancelled' | 'denied';
  input: JsonRecord;
  output: JsonRecord;
  steps: StepResult[];
  events: RunEvent[];
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  usage: Usage;
  idempotencyKey: string;
  approvalNodeId: string | null;
  replayOf: string | null;
}
export interface CaseResult {
  caseId: string;
  name: string;
  passed: boolean;
  expected: JsonRecord;
  actual: JsonRecord;
  runId: string;
  error: string | null;
}
export interface ComparisonResult {
  candidateId: string;
  name: string;
  cases: CaseResult[];
  passed: number;
  total: number;
  usage: Usage;
}
export interface Comparison {
  id: string;
  workflowId: string;
  workflowRevision: number;
  createdAt: string;
  mode: RunMode;
  results: ComparisonResult[];
  recommendation: string;
  rubricVersion: string;
  evaluatorVersion: string;
  caseSetHash: string;
}
export interface WorkflowVersion {
  revision: number;
  createdAt: string;
  reason: string;
  workflow: Workflow;
}
export interface WorkflowDetail {
  workflow: Workflow;
  runs: WorkflowRun[];
  comparisons: Comparison[];
  versions: WorkflowVersion[];
}
export interface ExampleSummary {
  id: string;
  name: string;
  description: string;
  archetype: Archetype;
  stepCount: number;
  inputDescription: string;
}
export interface Budget {
  limitUsd: number;
  spentUsd: number;
  reservedUsd: number;
  remainingUsd: number;
}
export interface Workspace {
  workflows: Workflow[];
  examples: ExampleSummary[];
  evidence: Evidence[];
  budget: Budget;
  liveAvailable: boolean;
  model: ModelName;
}
export interface WorkflowPatch {
  expectedRevision: number;
  name?: string;
  description?: string;
  tests?: TestCase[];
  sampleInput?: JsonRecord;
  brief?: Brief;
  nodeEdits?: Array<{
    id: string;
    label?: string;
    description?: string;
    kind?: StepKind;
    config?: JsonRecord;
  }>;
  candidateId?: string;
  status?: Workflow['status'];
}
export interface WorkflowPackage {
  format: 'promethean-workflow';
  version: '2.0';
  exportedAt: string;
  workflow: Workflow;
  evidence: Evidence[];
  comparisons: Comparison[];
  requirements: string[];
  runbook: string;
  checksum: string;
}
