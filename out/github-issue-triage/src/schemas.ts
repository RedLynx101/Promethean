/**
 * Zod schemas for every cross-node boundary. Every external boundary
 * (webhook payload, LLM response, tool arg) MUST pass through one of these.
 */
import { z } from "zod";

export const SeveritySchema = z.enum([
  "bug",
  "feature-request",
  "question",
  "security",
]);
export type Severity = z.infer<typeof SeveritySchema>;

export const IssuePayloadSchema = z.object({
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, "repo must be 'owner/name'"),
  issueNumber: z.number().int().positive(),
  title: z.string().min(1).max(1024),
  body: z.string().max(65536).default(""),
  author: z.string().min(1),
  existingLabels: z.array(z.string()).default([]),
});

export const GithubWebhookBodySchema = z.object({
  action: z.literal("opened"),
  issue: z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    user: z.object({ login: z.string() }),
    labels: z.array(z.object({ name: z.string() })).default([]),
  }),
  repository: z.object({
    full_name: z.string(),
  }),
});
export type GithubWebhookBody = z.infer<typeof GithubWebhookBodySchema>;

export const ClassifyResultSchema = z.object({
  severity: SeveritySchema,
  confidence: z.number().min(0).max(100),
  rationale: z.string().min(1).max(2000),
});
export type ClassifyResult = z.infer<typeof ClassifyResultSchema>;

export const DraftResultSchema = z.object({
  body: z
    .string()
    .min(1)
    .max(4000)
    .describe("<=3 sentence triage reply in the issue's voice"),
});
export type DraftResult = z.infer<typeof DraftResultSchema>;

export const GateDecisionSchema = z.object({
  approved: z.boolean(),
  reviewer: z.string().optional(),
  feedback: z.string().optional(),
});
export type GateDecision = z.infer<typeof GateDecisionSchema>;

// Label / team lookup tables — deterministic per vault/integrations/github-api.md
export const LABEL_MAP: Record<Severity, string[]> = {
  bug: ["type:bug"],
  "feature-request": ["type:feature"],
  question: ["type:question"],
  security: ["type:security"],
};

export const TEAM_MAP: Record<Severity, string> = {
  bug: "@org/eng-triage",
  "feature-request": "@org/product",
  question: "@org/community",
  security: "@org/security-team",
};
