import { openai } from "@workspace/integrations-openai-ai-server";
import { type PrometheanNode, type PrometheanEdge, type GovernanceResult } from "./types";
import { GovernanceResultSchema, type PrometheanNodeSchema } from "./schemas";
import { logger } from "../logger";
import { z } from "zod";

type NodeType = z.infer<typeof PrometheanNodeSchema>;

const SYSTEM_PROMPT = `You are the Governance Agent for Promethean — a workflow analysis and orchestration studio.

Your job is to configure governance, observability, and drift detection for the workflow based on its risk profile.

You must analyze:
1. The automation levels used (higher levels = more risk = tighter thresholds)
2. The domain (financial, medical, customer-facing = tighter thresholds)
3. The estimated cost and latency per run
4. Whether human oversight gates are needed

Configure:
- loggingLevel: "minimal", "standard", "verbose", "debug"
- autoSnapshot: whether to snapshot state at each step (boolean)
- latencyThreshold (ms): alert if single run exceeds this (number)
- costThreshold ($): alert if single run exceeds this (number)
- errorRateThreshold (0-1): alert if error rate exceeds this (number)
- alertChannels: array of strings from ["slack", "email", "pagerduty", "webhook"]
- costLimitPerRun: hard limit to abort run (number)
- executionTimeoutMs: maximum allowed run time in milliseconds (number)

You may also add governance nodes (human gate nodes, checkpoint nodes) where appropriate.
Edge types must be one of: "default", "conditional", "error", "parallel", "loop"

CRITICAL OUTPUT CONTRACT:
- The "nodes" array you return must contain EVERY node from the orchestrated input, preserving id, type, position, and all data fields — PLUS any new governance nodes you add. Do NOT return only the governance nodes. Do NOT drop, rename, or merge existing nodes.
- The "edges" array must contain all original edges PLUS any new edges you add for governance (e.g., routing through a new human-gate node). If you insert a gate between two existing nodes, add the new edges; do not silently rewire originals unless a gate replaces a direct edge.
- If you add no governance nodes, return the original nodes and edges unchanged.

Return ONLY valid JSON:
{
  "nodes": [ /* ALL original orchestrated nodes + any new governance nodes */ ],
  "edges": [ /* ALL original edges + any new governance edges */ ],
  "governanceConfig": {
    "loggingLevel": "standard",
    "autoSnapshot": true,
    "latencyThreshold": 30000,
    "costThreshold": 0.50,
    "errorRateThreshold": 0.05,
    "alertChannels": ["slack", "email"],
    "costLimitPerRun": 2.00,
    "executionTimeoutMs": 300000
  },
  "summary": "Governance configuration summary"
}`;

export async function runGovernanceAgent(
  nodes: PrometheanNode[],
  edges: PrometheanEdge[],
  description: string,
  constraints?: Record<string, unknown>,
  feedback?: string
): Promise<GovernanceResult> {
  logger.info({ nodeCount: nodes.length }, "Running governance agent");

  const userPrompt = `Configure governance and observability for this orchestrated workflow.

Workflow Description: ${description}
${constraints ? `Constraints/Budget: ${JSON.stringify(constraints)}` : ""}
${feedback ? `\nPrevious governance config was rejected. Feedback: ${feedback}\nPlease improve based on this feedback.` : ""}

Orchestrated nodes:
${JSON.stringify(nodes, null, 2)}

Edges:
${JSON.stringify(edges, null, 2)}

Configure appropriate thresholds, alert channels, and logging based on risk profile.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini-2026-03-17",
    max_completion_tokens: 16384,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from governance agent");

  const raw = JSON.parse(content);
  const parsed = GovernanceResultSchema.parse(raw);

  // Defensive merge: the governance agent sometimes returns only the new gate/
  // checkpoint nodes it added, which would otherwise wipe the orchestrated graph.
  // Treat the LLM response as additive: keep every original orchestrated node,
  // and overlay by id with any updates or new nodes the agent returned.
  const returnedNodeIds = new Set(parsed.nodes.map((n) => n.id));
  const mergedNodes: PrometheanNode[] = nodes.map((original) => {
    if (returnedNodeIds.has(original.id)) {
      const updated = parsed.nodes.find((n) => n.id === original.id)!;
      return {
        ...original,
        ...updated,
        type: "custom",
        position: updated.position ?? original.position,
        data: { ...original.data, ...updated.data },
      };
    }
    return { ...original, data: { ...original.data, status: original.data.status ?? "idle" } };
  });
  const originalNodeIds = new Set(nodes.map((n) => n.id));
  const addedNodes: NodeType[] = parsed.nodes
    .filter((n) => !originalNodeIds.has(n.id))
    .map((node) => ({
      ...node,
      type: "custom",
      position: node.position ?? { x: 0, y: 0 },
    }));

  const returnedEdgeIds = new Set(parsed.edges.map((e) => e.id));
  const mergedEdges: PrometheanEdge[] = [
    ...edges
      .filter((e) => !returnedEdgeIds.has(e.id))
      .map((e) => ({ ...e, type: (e.type ?? "default") as "default" | "conditional" | "error" | "parallel" | "loop" })),
    ...parsed.edges.map((e) => ({ ...e, type: (e.type ?? "default") as "default" | "conditional" | "error" | "parallel" | "loop" })),
  ];

  parsed.nodes = [...mergedNodes, ...addedNodes] as typeof parsed.nodes;
  parsed.edges = mergedEdges as typeof parsed.edges;

  if (addedNodes.length > 0 || parsed.edges.length !== edges.length) {
    logger.info({ originalNodes: nodes.length, addedNodes: addedNodes.length, finalNodes: parsed.nodes.length }, "Governance merged nodes");
  }

  return parsed;
}
