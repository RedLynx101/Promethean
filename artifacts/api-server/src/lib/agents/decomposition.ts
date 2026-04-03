import { openai } from "@workspace/integrations-openai-ai-server";
import { type DecompositionResult, type PrometheanNode, type PrometheanEdge } from "./types";
import { logger } from "../logger";

const SYSTEM_PROMPT = `You are the Decomposition Agent for Promethean — a workflow analysis and orchestration studio.

Your job is to analyze a workflow description and decompose it into discrete, atomic substeps that can be individually classified on the automation spectrum.

Rules:
1. Break the workflow into 5-15 distinct steps (nodes)
2. Each step must be specific and atomic — one action, one responsibility
3. Include trigger nodes (where the workflow begins) and end/result nodes
4. Identify natural dependencies and sequential/parallel flows
5. Use clear, action-oriented names for each step (verb + noun)
6. Create logical flow edges connecting the steps

Return ONLY valid JSON matching this exact structure:
{
  "nodes": [
    {
      "id": "node-1",
      "type": "custom",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Step Name",
        "description": "What this step does specifically",
        "status": "idle"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1-2",
      "source": "node-1",
      "target": "node-2",
      "type": "default",
      "data": {
        "label": "on success",
        "condition": null
      }
    }
  ],
  "summary": "Brief summary of the overall workflow structure"
}

Position nodes in a logical left-to-right or top-to-bottom layout with 200px spacing between nodes.
The first node should have type "trigger" in data.nodeCategory.
Use meaningful IDs like "trigger-1", "validate-input", "notify-team" etc.`;

export async function runDecompositionAgent(
  description: string,
  domain?: string,
  constraints?: Record<string, unknown>,
  feedback?: string
): Promise<DecompositionResult> {
  const userPrompt = `Analyze and decompose this workflow:

Description: ${description}
${domain ? `Domain: ${domain}` : ""}
${constraints ? `Constraints: ${JSON.stringify(constraints)}` : ""}
${feedback ? `\nPrevious result was rejected. Feedback: ${feedback}\nPlease improve based on this feedback.` : ""}

Decompose this into discrete workflow steps.`;

  logger.info({ description: description.slice(0, 100) }, "Running decomposition agent");

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
  if (!content) throw new Error("No response from decomposition agent");

  const parsed = JSON.parse(content) as DecompositionResult;

  // Ensure nodes have proper positions
  parsed.nodes = parsed.nodes.map((node: PrometheanNode, i: number) => ({
    ...node,
    type: "custom",
    position: node.position ?? { x: 100 + (i % 3) * 250, y: 100 + Math.floor(i / 3) * 200 },
    data: { ...node.data, status: "idle" },
  }));

  parsed.edges = parsed.edges.map((edge: PrometheanEdge) => ({
    ...edge,
    type: edge.type ?? "default",
    data: edge.data ?? {},
  }));

  return parsed;
}
