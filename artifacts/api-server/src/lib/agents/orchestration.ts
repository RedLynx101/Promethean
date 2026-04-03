import { openai } from "@workspace/integrations-openai-ai-server";
import { type PrometheanNode, type PrometheanEdge, type OrchestrationResult } from "./types";
import { OrchestrationResultSchema, type PrometheanNodeSchema } from "./schemas";
import { logger } from "../logger";
import { z } from "zod";

type NodeType = z.infer<typeof PrometheanNodeSchema>;

const SYSTEM_PROMPT = `You are the Orchestration Agent for Promethean — a workflow analysis and orchestration studio.

Your job is to enrich the classified workflow with:
1. Tool bindings for each step (specific APIs, SDKs, libraries to use)
2. Refined edges with conditions, error paths, and retry logic
3. Parallel execution opportunities
4. Error handling and fallback paths
5. Input/output contracts between steps

Edge types to use:
- "default": Normal sequential flow
- "conditional": Only taken when a condition is true (add condition in data)
- "error": Error/exception handling path
- "parallel": Parallel branch start
- "loop": Loop-back edge for retry/iteration

For each node, add specific tool recommendations based on systemLevel:
- L0: Libraries (zod, regex, postgres queries)
- L1: ML frameworks (sklearn, TensorFlow Lite, OpenCV)
- L2: NLP libraries (spaCy, Hugging Face transformers)
- L3: openai.chat, anthropic.messages
- L4: openai + function_tools, search APIs, code execution
- L5: AgentKit, LangGraph, AutoGen, CrewAI

Return ONLY valid JSON:
{
  "nodes": [
    {
      "id": "original-id",
      "type": "custom",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Step Name",
        "description": "Step description",
        "systemLevel": 0,
        "confidence": 95,
        "rationale": "Classification rationale",
        "tools": ["tool1", "tool2"],
        "conditions": ["condition if applicable"],
        "errorHandling": "How errors are handled",
        "status": "idle"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-id",
      "target": "target-id",
      "type": "default",
      "data": {
        "label": "edge label",
        "condition": "condition expression or null"
      }
    }
  ],
  "summary": "Orchestration summary"
}`;

export async function runOrchestrationAgent(
  nodes: PrometheanNode[],
  edges: PrometheanEdge[],
  description: string,
  constraints?: Record<string, unknown>,
  feedback?: string
): Promise<OrchestrationResult> {
  logger.info({ nodeCount: nodes.length }, "Running orchestration agent");

  const userPrompt = `Add tool bindings, conditions, and error handling to this workflow.

Workflow Description: ${description}
${constraints ? `Constraints: ${JSON.stringify(constraints)}` : ""}
${feedback ? `\nPrevious orchestration was rejected. Feedback: ${feedback}\nPlease improve based on this feedback.` : ""}

Classified nodes:
${JSON.stringify(nodes, null, 2)}

Current edges:
${JSON.stringify(edges, null, 2)}

Enrich with specific tools, error handling, and refined edge conditions.`;

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
  if (!content) throw new Error("No response from orchestration agent");

  const raw = JSON.parse(content);
  const parsed = OrchestrationResultSchema.parse(raw);

  // Preserve original positions if not returned
  parsed.nodes = parsed.nodes.map((node: NodeType) => {
    const original = nodes.find((n) => n.id === node.id);
    return {
      ...node,
      type: "custom",
      position: node.position ?? original?.position ?? { x: 0, y: 0 },
    };
  });

  return parsed;
}
