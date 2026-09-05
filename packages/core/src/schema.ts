import { z } from 'zod';

export const recordSchema = z.record(z.string(), z.unknown());
export function hasExpectedAssertion(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0 || value.every(hasExpectedAssertion);
  if (value && typeof value === 'object')
    return Object.keys(value).length > 0 && Object.values(value).every(hasExpectedAssertion);
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}
export const archetypeSchema = z.enum([
  'manual',
  'rules',
  'model-task',
  'assistant',
  'ai-workflow',
  'tool-agent',
  'multi-agent',
]);
export const stepKindSchema = z.enum([
  'validate',
  'transform',
  'condition',
  'classify',
  'retrieve',
  'draft',
  'approval',
  'outbox',
]);
export const briefSchema = z
  .object({
    goal: z.string().min(1).max(12000),
    inputs: z.string().max(4000),
    outputs: z.string().max(4000),
    volume: z.string().max(1000),
    constraints: z.array(z.string().max(12000)).max(40),
    successCriteria: z.array(z.string().max(2000)).max(30),
    unknowns: z.array(z.string().max(2000)).max(30),
  })
  .strict();
export const testCaseSchema = z
  .object({
    id: z.string().min(1).max(80),
    name: z.string().min(1).max(120),
    input: recordSchema,
    expected: recordSchema.refine(
      hasExpectedAssertion,
      'Expected fields must contain substantive values; empty nested objects are not assertions.',
    ),
    description: z.string().max(2000),
  })
  .strict();
export const provenanceSchema = z
  .object({
    requirement: z.string().min(1),
    rationale: z.string().min(1),
    evidenceIds: z.array(z.string()),
    alternatives: z.array(z.string()),
    rubricVersion: z.literal('2.0'),
    testedBy: z.array(z.string()),
    status: z.enum(['supported', 'untested', 'unresolved', 'stale']),
  })
  .strict();
export const nodeSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    label: z.string().min(1).max(120),
    description: z.string().max(2000),
    kind: stepKindSchema,
    archetype: archetypeSchema,
    config: recordSchema,
    provenance: provenanceSchema,
  })
  .strict();
export const workflowSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(120),
    description: z.string().max(12000),
    revision: z.number().int().positive(),
    schemaVersion: z.literal('2.0'),
    rubricVersion: z.literal('2.0'),
    exampleId: z.string().nullable(),
    status: z.enum(['draft', 'validated', 'tested', 'enabled', 'paused']),
    createdAt: z.string(),
    updatedAt: z.string(),
    brief: briefSchema,
    decision: z
      .object({
        recommendation: z.string(),
        rationale: z.string(),
        candidateId: z.string(),
        evidenceIds: z.array(z.string()),
        status: z.enum(['proposed', 'needs-information', 'tested']),
        questions: z.array(z.string()),
      })
      .strict(),
    candidates: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            archetype: archetypeSchema,
            summary: z.string(),
            tradeoffs: z.array(z.string()),
            evidenceIds: z.array(z.string()),
            requiresModel: z.boolean(),
            implementation: z.enum(['rules', 'enhanced-rules', 'model']),
          })
          .strict(),
      )
      .min(1)
      .max(6),
    nodes: z.array(nodeSchema).min(1).max(40),
    edges: z
      .array(
        z
          .object({
            id: z.string(),
            source: z.string(),
            target: z.string(),
            label: z.string().optional(),
            condition: z.string().optional(),
          })
          .strict(),
      )
      .max(100),
    tests: z.array(testCaseSchema).max(20),
    sampleInput: recordSchema,
    designSource: z.enum(['local-rubric', 'openai']),
    model: z.enum(['gpt-5.6-luna', 'gpt-5.6-terra']).nullable(),
  })
  .strict();
export const workflowPatchSchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(12000).optional(),
    nodeEdits: z
      .array(
        z
          .object({
            id: z.string(),
            label: z.string().trim().min(1).max(120).optional(),
            description: z.string().max(2000).optional(),
            kind: stepKindSchema.optional(),
            config: recordSchema.optional(),
          })
          .strict(),
      )
      .max(40)
      .optional(),
    candidateId: z.string().optional(),
    status: z.enum(['draft', 'validated', 'tested', 'enabled', 'paused']).optional(),
    tests: z.array(testCaseSchema).max(20).optional(),
    sampleInput: recordSchema.optional(),
    brief: briefSchema.optional(),
  })
  .strict();
