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

Also add governance nodes where appropriate (human gate nodes, checkpoint nodes).
Edge types must be one of: "default", "conditional", "error", "parallel", "loop"

Return ONLY valid JSON:
{
  "nodes": [],
  "edges": [],
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
    model: "gpt-5.2",
    max_completion_tokens: 8192,
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

  // Use original nodes if governance agent didn't add new ones
  if (!parsed.nodes || parsed.nodes.length === 0) {
    parsed.nodes = nodes.map((n) => ({ ...n, data: { ...n.data, status: n.data.status ?? "idle" } }));
    parsed.edges = edges.map((e) => ({ ...e, type: (e.type ?? "default") as "default" | "conditional" | "error" | "parallel" | "loop" }));
  } else {
    // Preserve original positions
    parsed.nodes = parsed.nodes.map((node: NodeType) => {
      const original = nodes.find((n) => n.id === node.id);
      return {
        ...node,
        type: "custom",
        position: node.position ?? original?.position ?? { x: 0, y: 0 },
      };
    });
  }

  return parsed;
}
