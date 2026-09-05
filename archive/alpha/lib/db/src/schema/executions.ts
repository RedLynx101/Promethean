import { pgTable, text, timestamp, jsonb, decimal, integer, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workflowsTable } from "./workflows";

export const executionsTable = pgTable("executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").references(() => workflowsTable.id).notNull(),
  workflowVersion: text("workflow_version"),
  triggeredBy: text("triggered_by").notNull().default("manual"),
  triggerPayload: jsonb("trigger_payload"),
  status: text("status").notNull().default("running"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  totalCost: decimal("total_cost", { precision: 10, scale: 6 }),
  totalLatencyMs: integer("total_latency_ms"),
  result: jsonb("result"),
  error: jsonb("error"),
});

export const insertExecutionSchema = createInsertSchema(executionsTable).omit({
  id: true,
  startedAt: true,
});
export type InsertExecution = z.infer<typeof insertExecutionSchema>;
export type Execution = typeof executionsTable.$inferSelect;

export const executionStepsTable = pgTable("execution_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  executionId: uuid("execution_id").references(() => executionsTable.id).notNull(),
  stepId: text("step_id").notNull(),
  stepName: text("step_name").notNull(),
  systemLevel: integer("system_level"),
  status: text("status").notNull().default("running"),
  input: jsonb("input"),
  output: jsonb("output"),
  llmCalls: jsonb("llm_calls"),
  toolCalls: jsonb("tool_calls"),
  cost: decimal("cost", { precision: 10, scale: 6 }),
  latencyMs: integer("latency_ms"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertExecutionStepSchema = createInsertSchema(executionStepsTable).omit({
  id: true,
  startedAt: true,
});
export type InsertExecutionStep = z.infer<typeof insertExecutionStepSchema>;
export type ExecutionStep = typeof executionStepsTable.$inferSelect;
