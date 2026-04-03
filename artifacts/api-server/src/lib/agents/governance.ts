import { openai } from "@workspace/integrations-openai-ai-server";
import { type PrometheanNode, type PrometheanEdge, type GovernanceResult, type GovernanceConfig } from "./types";
import { logger } from "../logger";

const SYSTEM_PROMPT = `You are the Governance Agent for Promethean — a workflow analysis and orchestration studio.

Your job is to configure governance, observability, and drift detection for the workflow based on its risk profile.

You must analyze:
1. The automation levels used (higher levels = more risk = tighter thresholds)
2. The domain (financial, medical, customer-facing = tighter thresholds)
3. The estimated cost and latency per run
4. Whether human oversight gates are needed

Configure:
- Logging level: "minimal", "standard", "verbose", "debug"
- Auto-snapshot: whether to snapshot state at each step
- Latency threshold (ms): alert if single run exceeds this
- Cost threshold ($): alert if single run exceeds this
- Error rate threshold (0-1): alert if error rate exceeds this
- Alert channels: ["slack", "email", "pagerduty", "webhook"] — choose appropriate ones
- Cost limit per run: hard limit to abort run
- Execution timeout ms: maximum allowed run time

Also add governance nodes where appropriate (human gate nodes, checkpoint nodes).

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

  const parsed = JSON.parse(content) as GovernanceResult;

  // Use original nodes if governance agent didn't add new ones
  if (!parsed.nodes || parsed.nodes.length === 0) {
    parsed.nodes = nodes;
    parsed.edges = edges;
  } else {
    // Preserve original positions
    parsed.nodes = parsed.nodes.map((node: PrometheanNode) => {
      const original = nodes.find((n) => n.id === node.id);
      return {
        ...node,
        type: "custom",
        position: node.position ?? original?.position ?? { x: 0, y: 0 },
      };
    });
  }

  // Set defaults if missing
  const defaultConfig: GovernanceConfig = {
    loggingLevel: "standard",
    autoSnapshot: true,
    latencyThreshold: 30000,
    costThreshold: 0.5,
    errorRateThreshold: 0.05,
    alertChannels: ["slack"],
    costLimitPerRun: 2.0,
    executionTimeoutMs: 300000,
  };

  parsed.governanceConfig = { ...defaultConfig, ...parsed.governanceConfig };

  return parsed;
}
