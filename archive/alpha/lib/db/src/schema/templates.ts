import { pgTable, text, timestamp, jsonb, decimal, integer, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const templatesTable = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  domain: text("domain"),
  tags: text("tags").array().notNull().default([]),
  nodes: jsonb("nodes").notNull().default([]),
  edges: jsonb("edges").notNull().default([]),
  rating: decimal("rating", { precision: 3, scale: 2 }).notNull().default("0"),
  usageCount: integer("usage_count").notNull().default(0),
  estimatedCostPerRun: decimal("estimated_cost_per_run", { precision: 10, scale: 6 }),
  estimatedLatencyMs: integer("estimated_latency_ms"),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTemplateSchema = createInsertSchema(templatesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templatesTable.$inferSelect;
