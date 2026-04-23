import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../logger";
import { z } from "zod";

// ---------------------------------------------------------------------------
// CLARIFY — multi-turn description refinement
// ---------------------------------------------------------------------------

export const ClarifyTurnSchema = z.object({
  role: z.enum(["agent", "user"]),
  text: z.string(),
});

export const ClarifyRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  riskTolerance: z.string().min(1),
  humanOversightPreference: z.string().min(1),
  budgetPerRun: z.string().optional().nullable(),
  history: z.array(ClarifyTurnSchema).default([]),
});

export type ClarifyRequest = z.infer<typeof ClarifyRequestSchema>;

export const ClarifyResponseSchema = z.object({
  sufficient: z.boolean(),
  reply: z.string(),
  // When sufficient=true the agent rewrites the description into a single coherent paragraph
  // that incorporates everything the user has shared across turns.
  refinedDescription: z.string().nullable().default(null),
});

export type ClarifyResponse = z.infer<typeof ClarifyResponseSchema>;

const CLARIFY_SYSTEM_PROMPT = `You are the Intake Clarifier for Promethean — a workflow analysis and orchestration studio.

Your ONLY job in this phase is to make sure the user's workflow description contains enough detail to architect the workflow. You do NOT discuss domain, compliance, or guardrails in this phase.

A description is "sufficient" only when it conveys BOTH:
  (a) what data or inputs the workflow consumes (source, format, sensitivity if relevant), and
  (b) what problem it solves or what concrete outcome it produces.

Behavior rules:
- If something is missing or vague, ask ONE focused follow-up question. Do not ask more than one question per turn. Be specific — refer to what the user actually wrote.
- If the user says they don't know or "skip", accept it and move on rather than re-asking the same thing.
- Conversational tone, but tight. No filler. No restating their answer back to them.
- If the description is now sufficient, set sufficient=true, write a brief acknowledging reply (1 sentence), and produce a "refinedDescription" — a single coherent paragraph that merges the original description with everything the user clarified across turns. This refined description will be stored as the workflow's description.

Return ONLY valid JSON of this shape:
{
  "sufficient": boolean,
  "reply": string,
  "refinedDescription": string | null
}`;

export async function runClarifyAgent(req: ClarifyRequest): Promise<ClarifyResponse> {
  const historyText = req.history.length > 0
    ? "\n\nConversation so far:\n" + req.history.map((t) => `${t.role === "agent" ? "Agent" : "User"}: ${t.text}`).join("\n")
    : "";

  const userPrompt = `Workflow form so far:

Name: ${req.name}
Description (current): ${req.description}
Risk tolerance: ${req.riskTolerance}
Human oversight: ${req.humanOversightPreference}
Budget per run (USD): ${req.budgetPerRun?.trim() ? req.budgetPerRun : "not specified"}${historyText}

Decide whether the description is sufficient and produce the JSON described in the system instructions.`;

  logger.info({ name: req.name, turns: req.history.length }, "Running clarify agent");

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini-2026-03-17",
    max_completion_tokens: 1024,
    messages: [
      { role: "system", content: CLARIFY_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from clarify agent");

  const raw = JSON.parse(content);
  return ClarifyResponseSchema.parse(raw);
}

// ---------------------------------------------------------------------------
// SUGGEST — domain / compliance / guardrails (assumes description is final)
// ---------------------------------------------------------------------------

export const SuggestRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  riskTolerance: z.string().min(1),
  humanOversightPreference: z.string().min(1),
  budgetPerRun: z.string().optional().nullable(),
});

export type SuggestRequest = z.infer<typeof SuggestRequestSchema>;

export const IntakeSuggestionSchema = z.object({
  domainSuggestion: z.object({
    domain: z.string(),
    rationale: z.string(),
  }),
  complianceSuggestion: z.object({
    summary: z.string(),
    frameworks: z
      .array(
        z.object({
          name: z.string(),
          source: z.string(),
          relevance: z.string(),
        }),
      )
      .default([]),
    proposedText: z.string(),
  }),
  guardrailsSuggestion: z.object({
    summary: z.string(),
    proposedText: z.string(),
    bullets: z.array(z.string()).default([]),
  }),
});

export type IntakeSuggestion = z.infer<typeof IntakeSuggestionSchema>;

const ALLOWED_DOMAINS = [
  "Customer Success",
  "Sales",
  "Engineering",
  "Legal & Compliance",
  "Security",
  "Data Engineering",
  "Finance",
  "Marketing",
  "Operations",
  "HR",
];

const SUGGEST_SYSTEM_PROMPT = `You are the Intake Suggester for Promethean — a workflow analysis and orchestration studio.

The user's workflow description has already been confirmed as sufficient in a prior step. Your job now is to produce three concrete suggestions:

1. domainSuggestion — Pick the single best-fit domain from this fixed list and explain why in one sentence.
   Allowed domains: ${ALLOWED_DOMAINS.join(", ")}.

2. complianceSuggestion — Identify which compliance / regulatory frameworks are likely applicable to this workflow given its description, data, and domain. **Ground your reasoning in established industry standards.** When relevant, cite specifically:
   - NIST AI Risk Management Framework (AI RMF 1.0) — for any AI/ML system
   - NIST SP 800-53 — for federal-style security controls
   - NIST SP 800-171 — for controlled unclassified information
   - NIST Cybersecurity Framework (CSF 2.0) — general cybersecurity
   - ISO/IEC 42001 — AI management systems
   - ISO/IEC 27001 — information security management
   - HIPAA — protected health information
   - GDPR — EU personal data
   - CCPA — California consumer data
   - SOC 2 — service organization controls
   - PCI DSS — payment card data
   - FERPA — student records
   - GLBA — financial customer data
   - SOX — financial reporting
   For each framework you list, give a 1-line "relevance" stating exactly which control area or article applies (e.g. "NIST AI RMF MAP 1.1 — context characterization for high-stakes inference", "GDPR Article 22 — automated decision-making safeguards"). If no specific framework applies, return frameworks=[] and put "none" in proposedText.
   proposedText is what we will store on the workflow record — a short, comma-separated list of framework names plus any qualifiers (e.g. "NIST AI RMF, SOC 2 Type II, GDPR Article 22"), or the literal "none".

3. guardrailsSuggestion — Propose 3-6 concrete, enforceable guardrails tailored to the workflow's risk tolerance, oversight preference, budget, and likely data sensitivity. These are hard rules the orchestrator MUST enforce. Write each as a single imperative sentence. Prefer guardrails that map to standards you already cited in compliance (e.g. PII redaction → GDPR Art. 5; cost cap → budget; human-in-the-loop gate → NIST AI RMF GOVERN 1.1). If genuinely no guardrails are needed, return bullets=[] and proposedText="none".
   proposedText is the same content joined as a "- " bulleted multiline string suitable for storing, or the literal "none".

Return ONLY valid JSON of this exact shape:
{
  "domainSuggestion": { "domain": string, "rationale": string },
  "complianceSuggestion": {
    "summary": string,
    "frameworks": [ { "name": string, "source": string, "relevance": string } ],
    "proposedText": string
  },
  "guardrailsSuggestion": {
    "summary": string,
    "proposedText": string,
    "bullets": string[]
  }
}

Be concrete. Avoid generic boilerplate. Tie every recommendation to something specific in the user's input.`;

export async function runSuggestAgent(req: SuggestRequest): Promise<IntakeSuggestion> {
  const userPrompt = `Confirmed workflow inputs:

Name: ${req.name}
Description: ${req.description}
Risk tolerance: ${req.riskTolerance}
Human oversight: ${req.humanOversightPreference}
Budget per run (USD): ${req.budgetPerRun?.trim() ? req.budgetPerRun : "not specified"}

Produce the JSON described in the system instructions.`;

  logger.info({ name: req.name, descLen: req.description.length }, "Running suggest agent");

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini-2026-03-17",
    max_completion_tokens: 4096,
    messages: [
      { role: "system", content: SUGGEST_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from suggest agent");

  const raw = JSON.parse(content);
  const parsed = IntakeSuggestionSchema.parse(raw);

  // Coerce domain to the allowed list (LLM might paraphrase).
  if (!ALLOWED_DOMAINS.includes(parsed.domainSuggestion.domain)) {
    const lower = parsed.domainSuggestion.domain.toLowerCase();
    const match = ALLOWED_DOMAINS.find((d) => lower.includes(d.toLowerCase()) || d.toLowerCase().includes(lower));
    if (match) parsed.domainSuggestion.domain = match;
    else parsed.domainSuggestion.domain = "Operations";
  }

  return parsed;
}
