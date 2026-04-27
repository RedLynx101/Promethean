import { openai } from "@workspace/integrations-openai-ai-server";
import { type PrometheanNode, type PrometheanEdge, type SystemSelectionResult } from "./types";
import { SystemSelectionResultSchema, type PrometheanNodeSchema } from "./schemas";
import { logger } from "../logger";
import { z } from "zod";

type NodeType = z.infer<typeof PrometheanNodeSchema>;

const SYSTEM_PROMPT = `You are the System Selection Agent for Promethean — a workflow analysis and orchestration studio.

Your job is to classify each workflow step on the Promethean 6-level automation spectrum:

- L0 Deterministic: Rule-based, 100% predictable logic. Zero AI. Pure if/then/else, regex, DB lookups, validation.
- L1 Supervised ML: Classification or regression with trained models. High accuracy (>95%), narrow domain, no language model.
- L2 Language Understanding: NLP/NLU for intent classification, entity extraction, sentiment. Understands but doesn't generate.
- L3 Single LLM Agent: One GPT call to generate, summarize, draft, or reason. Self-contained, no external tool use.
- L4 Tool-Augmented Agent: LLM + tool calls (search, APIs, code execution). Dynamic, multi-step within one agent.
- L5 Multi-Agent Orchestration: Multiple specialized agents collaborating with handoffs, complex reasoning, emergent behavior.

Classification Rules (CRITICAL):
1. ALWAYS start at L0. Justify every level increase.
2. Only go to L1 if L0 cannot handle uncertainty/variation.
3. Only go to L3+ if genuine language generation or complex reasoning is required.
4. Only go to L5 if genuinely multiple independent agents need to collaborate.
5. Assign a confidence score 0-100 indicating how certain you are of this classification.
6. Low confidence (<60%) indicates this step needs human review.
7. Edge types must be one of: "default", "conditional", "error", "parallel", "loop"

Return ONLY valid JSON with this exact structure (keep all original node positions and IDs):
{
  "nodes": [
    {
      "id": "original-node-id",
      "type": "custom",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Step Name",
        "description": "What this step does",
        "systemLevel": 0,
        "confidence": 95,
        "rationale": "This step performs deterministic rule-based validation — L0 is appropriate. No ML or language understanding needed.",
        "tools": [],
        "status": "idle"
      }
    }
  ],
  "edges": [],
  "summary": "Overall system composition summary",
  "estimatedCostPerRun": 0.045,
  "estimatedLatencyMs": 2500
}`;

export async function runSystemSelectionAgent(
  nodes: PrometheanNode[],
  edges: PrometheanEdge[],
  description: string,
  constraints?: Record<string, unknown>,
  feedback?: string
): Promise<SystemSelectionResult> {
  logger.info({ nodeCount: nodes.length }, "Running system selection agent");

  const userPrompt = `Classify each workflow step on the automation spectrum.

Workflow Description: ${description}
${constraints ? `Constraints: ${JSON.stringify(constraints)}` : ""}
${feedback ? `\nPrevious classification was rejected. Feedback: ${feedback}\nPlease improve based on this feedback.` : ""}

Nodes to classify:
${JSON.stringify(nodes, null, 2)}

Existing edges (preserve these):
${JSON.stringify(edges, null, 2)}

For each node, assign systemLevel (0-5), confidence (0-100), and detailed rationale.`;

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
  if (!content) throw new Error("No response from system selection agent");

  const raw = JSON.parse(content);
  const parsed = SystemSelectionResultSchema.parse(raw);

  // Preserve original positions if not returned
  parsed.nodes = parsed.nodes.map((node: NodeType) => {
    const original = nodes.find((n) => n.id === node.id);
    return {
      ...node,
      type: "custom",
      position: node.position ?? original?.position ?? { x: 0, y: 0 },
    };
  });

  // Preserve original edges if agent returned none
  if (parsed.edges.length === 0) {
    parsed.edges = edges.map((e) => ({ ...e, type: (e.type ?? "default") as "default" | "conditional" | "error" | "parallel" | "loop" }));
  }

  return {
    ...parsed,
    systemTypeSummary: {},
    estimatedCostPerRun: parsed.estimatedCostPerRun ?? 0,
    estimatedLatencyMs: parsed.estimatedLatencyMs ?? 0,
  };
}
