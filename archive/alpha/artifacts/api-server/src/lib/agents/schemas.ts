import { z } from "zod";

export const PrometheanNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    label: z.string(),
    description: z.string(),
    systemLevel: z.number().nullish(),
    confidence: z.number().nullish(),
    rationale: z.string().nullish(),
    tools: z.array(z.string()).optional(),
    status: z.string().optional().default("idle"),
    conditions: z.array(z.string()).optional(),
    errorHandling: z.string().optional(),
    nodeCategory: z.string().nullish(),
  }),
});

export const VALID_EDGE_TYPES = ["default", "conditional", "error", "parallel", "loop"] as const;

export const PrometheanEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.enum(VALID_EDGE_TYPES).default("default"),
  edgeType: z.string().optional(),
  data: z.object({
    condition: z.string().nullish(),
    label: z.string().nullish(),
    edgeType: z.string().nullish(),
  }).optional(),
});

export const GovernanceConfigSchema = z.object({
  loggingLevel: z.string().default("info"),
  autoSnapshot: z.boolean().default(true),
  latencyThreshold: z.number().default(30000),
  costThreshold: z.number().default(0.5),
  errorRateThreshold: z.number().default(0.05),
  alertChannels: z.array(z.string()).default(["slack"]),
  costLimitPerRun: z.number().optional(),
  executionTimeoutMs: z.number().optional(),
});

export const DecompositionResultSchema = z.object({
  nodes: z.array(PrometheanNodeSchema),
  edges: z.array(PrometheanEdgeSchema),
  summary: z.string(),
});

export const SystemSelectionResultSchema = z.object({
  nodes: z.array(PrometheanNodeSchema),
  edges: z.array(PrometheanEdgeSchema),
  summary: z.string(),
  estimatedCostPerRun: z.number().optional(),
  estimatedLatencyMs: z.number().optional(),
});

export const OrchestrationResultSchema = z.object({
  nodes: z.array(PrometheanNodeSchema),
  edges: z.array(PrometheanEdgeSchema),
  summary: z.string(),
});

export const GovernanceResultSchema = z.object({
  nodes: z.array(PrometheanNodeSchema),
  edges: z.array(PrometheanEdgeSchema),
  governanceConfig: GovernanceConfigSchema,
  summary: z.string(),
});
