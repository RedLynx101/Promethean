import { pgTable, text, timestamp, jsonb, decimal, integer, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workflowsTable = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  phase: text("phase").notNull().default("wizard"),
  version: text("version").notNull().default("1.0.0"),
  domain: text("domain"),
  tags: text("tags").array().notNull().default([]),
  nodes: jsonb("nodes").notNull().default([]),
  edges: jsonb("edges").notNull().default([]),
  governanceConfig: jsonb("governance_config").notNull().default({}),
  estimatedCostPerRun: decimal("estimated_cost_per_run", { precision: 10, scale: 6 }),
  estimatedLatencyMs: integer("estimated_latency_ms"),
  systemTypeSummary: jsonb("system_type_summary").notNull().default({}),
  triggerType: text("trigger_type"),
  workflowBrief: text("workflow_brief"),
  // Per-phase rejection counter — incremented on each /pipeline/:id/reject call,
  // reset to 0 whenever an approval advances the workflow to a new phase.
  rejectionCount: integer("rejection_count").notNull().default(0),
  // Hard cap on rejections per phase. Default 3 keeps the human-in-the-loop
  // governance gate honest while still allowing iterative refinement.
  maxRejections: integer("max_rejections").notNull().default(3),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWorkflowSchema = createInsertSchema(workflowsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type Workflow = typeof workflowsTable.$inferSelect;

export const workflowVersionsTable = pgTable("workflow_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").references(() => workflowsTable.id).notNull(),
  version: text("version").notNull(),
  definition: jsonb("definition").notNull(),
  changelog: text("changelog"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWorkflowVersionSchema = createInsertSchema(workflowVersionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertWorkflowVersion = z.infer<typeof insertWorkflowVersionSchema>;
export type WorkflowVersion = typeof workflowVersionsTable.$inferSelect;
