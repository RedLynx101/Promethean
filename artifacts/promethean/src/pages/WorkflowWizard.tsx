import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Send, Zap, Loader2, Bot } from "lucide-react";

interface WizardState {
  name: string;
  description: string;
  domain: string;
  budgetPerRun: string;
  riskTolerance: string;
  humanOversightPreference: string;
  complianceRequirements: string;
  guardrails: string;
}

type MessageRole = "agent" | "user";

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  choices?: string[];
  inputType?: "text" | "multiline";
  fieldKey?: keyof WizardState;
}

const DOMAINS = [
  "Customer Success", "Sales", "Engineering", "Legal & Compliance",
  "Security", "Data Engineering", "Finance", "Marketing", "Operations", "HR",
];

const RISK_OPTIONS = ["Low", "Medium", "High", "Critical"];
const OVERSIGHT_OPTIONS = [
  "Fully automated", "Review at major milestones", "Approval at each stage", "Human in the loop for all decisions",
];

const SCRIPT: Array<Omit<ChatMessage, "id">> = [
  {
    role: "agent",
    text: "Prometheus online. I'm here to help you design and orchestrate a new AI workflow. What should we call this workflow?",
    inputType: "text",
    fieldKey: "name",
  },
  {
    role: "agent",
    text: "Good. Describe the workflow in as much detail as possible — what should it accomplish, what data does it process, and what outcome does it produce?",
    inputType: "multiline",
    fieldKey: "description",
  },
  {
    role: "agent",
    text: "Which operational domain does this workflow belong to?",
    choices: DOMAINS,
    fieldKey: "domain",
  },
  {
    role: "agent",
    text: "What is the risk tolerance for this workflow?",
    choices: RISK_OPTIONS,
    fieldKey: "riskTolerance",
  },
  {
    role: "agent",
    text: "How much human oversight do you want during execution?",
    choices: OVERSIGHT_OPTIONS,
    fieldKey: "humanOversightPreference",
  },
  {
    role: "agent",
    text: "Any compliance or regulatory requirements? (e.g., HIPAA, GDPR, SOC 2 — or type 'none')",
    inputType: "text",
    fieldKey: "complianceRequirements",
  },
  {
    role: "agent",
    text: "Any hard guardrails or constraints I must enforce? (e.g., 'Never access prod DB directly', 'Require approval > $500' — or type 'none')",
    inputType: "multiline",
    fieldKey: "guardrails",
  },
  {
    role: "agent",
    text: "Budget limit per run in USD? (leave blank to skip)",
    inputType: "text",
    fieldKey: "budgetPerRun",
  },
];

function makeId() {
  return Math.random().toString(36).slice(2);
}

export default function WorkflowWizard() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: makeId(), ...SCRIPT[0] },
  ]);
  const [scriptStep, setScriptStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [wizardState, setWizardState] = useState<WizardState>({
    name: "", description: "", domain: "", budgetPerRun: "",
    riskTolerance: "Medium", humanOversightPreference: "Review at major milestones",
    complianceRequirements: "", guardrails: "",
  });
  const [isDone, setIsDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createAndStart = useMutation({
    mutationFn: async (state: WizardState) => {
      const workflow = await apiFetch<{ id: string }>("/workflows", {
        method: "POST",
        body: JSON.stringify({ name: state.name, description: state.description, domain: state.domain }),
      });
      await apiFetch("/pipeline/start", {
        method: "POST",
        body: JSON.stringify({
          workflowId: workflow.id,
          description: buildBrief(state),
          domain: state.domain,
          constraints: {
            budgetPerRun: state.budgetPerRun ? parseFloat(state.budgetPerRun) : null,
            riskTolerance: state.riskTolerance,
            complianceRequirements: state.complianceRequirements || null,
            guardrails: state.guardrails || null,
            humanOversightPreference: state.humanOversightPreference,
          },
        }),
      });
      return workflow.id;
    },
    onSuccess: (workflowId) => {
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["workflows"] });
      setLocation(`/workflow/${workflowId}`);
    },
  });

  function buildBrief(state: WizardState): string {
    return [
      state.description,
      `Domain: ${state.domain}`,
      `Risk Tolerance: ${state.riskTolerance}`,
      `Human Oversight: ${state.humanOversightPreference}`,
      state.budgetPerRun ? `Budget per run: $${state.budgetPerRun}` : "",
      state.complianceRequirements && state.complianceRequirements !== "none" ? `Compliance: ${state.complianceRequirements}` : "",
      state.guardrails && state.guardrails !== "none" ? `Guardrails: ${state.guardrails}` : "",
    ].filter(Boolean).join("\n");
  }

  function submitAnswer(answer: string) {
    const current = SCRIPT[scriptStep];
    if (!answer.trim() && current.fieldKey !== "budgetPerRun") return;

    const userMsg: ChatMessage = { id: makeId(), role: "user", text: answer || "(skipped)" };
    const newState = { ...wizardState };
    if (current.fieldKey) {
      newState[current.fieldKey] = answer;
    }
    setWizardState(newState);
    setInputValue("");

    const nextStep = scriptStep + 1;

    if (nextStep >= SCRIPT.length) {
      const confirmMsg: ChatMessage = {
        id: makeId(),
        role: "agent",
        text: `All set. I have everything I need to architect "${newState.name}". Launching the four-agent pipeline now — Decomposition → System Selection → Orchestration → Governance. Standing by for your review at each gate.`,
      };
      setMessages((prev) => [...prev, userMsg, confirmMsg]);
      setIsDone(true);
      createAndStart.mutate(newState);
    } else {
      const nextPrompt: ChatMessage = { id: makeId(), ...SCRIPT[nextStep] };
      setMessages((prev) => [...prev, userMsg, nextPrompt]);
      setScriptStep(nextStep);
    }
  }

  function handleChoiceClick(choice: string) {
    submitAnswer(choice);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const current = SCRIPT[scriptStep];
    if (e.key === "Enter" && !e.shiftKey && current.inputType !== "multiline") {
      e.preventDefault();
      submitAnswer(inputValue);
    }
  }

  const currentPrompt = SCRIPT[scriptStep];
  const isMultiline = currentPrompt?.inputType === "multiline";
  const hasChoices = Boolean(currentPrompt?.choices);

  return (
    <div className="flex flex-col h-screen" style={{ background: "#0a0e14" }}>
      {/* Fixed grid background */}
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />

      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0 relative z-10"
        style={{ background: "rgba(22,27,34,0.95)", borderColor: "rgba(0,212,255,0.15)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)" }}
        >
          <Zap className="w-4 h-4" style={{ color: "#00d4ff" }} />
        </div>
        <div>
          <h1 className="font-orbitron text-sm font-bold tracking-wider" style={{ color: "#00d4ff" }}>
            PROMETHEUS INTAKE
          </h1>
          <p className="text-xs" style={{ color: "rgba(230,237,243,0.4)" }}>
            Conversational workflow design assistant
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="text-xs font-jetbrains px-2 py-1 rounded"
            style={{ background: "rgba(0,255,136,0.08)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.2)" }}
          >
            {scriptStep} / {SCRIPT.length} complete
          </span>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 relative z-10">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {msg.role === "agent" && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.25)" }}
              >
                <Bot className="w-4 h-4" style={{ color: "#00d4ff" }} />
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
              }`}
              style={{
                background:
                  msg.role === "agent"
                    ? "rgba(22,27,34,0.9)"
                    : "rgba(0,212,255,0.12)",
                border:
                  msg.role === "agent"
                    ? "1px solid rgba(0,212,255,0.12)"
                    : "1px solid rgba(0,212,255,0.3)",
                color: msg.role === "agent" ? "#e6edf3" : "#00d4ff",
                fontFamily: msg.role === "user" ? "'JetBrains Mono', monospace" : "Inter, sans-serif",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Choice chips for current prompt */}
        {!isDone && hasChoices && !createAndStart.isPending && (
          <div className="flex gap-2 flex-wrap pl-11">
            {SCRIPT[scriptStep].choices?.map((choice) => (
              <button
                key={choice}
                onClick={() => handleChoiceClick(choice)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                style={{
                  background: "rgba(0,212,255,0.08)",
                  border: "1px solid rgba(0,212,255,0.25)",
                  color: "#00d4ff",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {choice}
              </button>
            ))}
          </div>
        )}

        {/* Launching indicator */}
        {createAndStart.isPending && (
          <div className="flex items-center gap-3 pl-11">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#00d4ff" }} />
            <span className="text-xs font-jetbrains" style={{ color: "rgba(0,212,255,0.6)" }}>
              Initializing pipeline…
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!isDone && !hasChoices && (
        <div
          className="flex-shrink-0 border-t px-6 py-4 relative z-10"
          style={{ background: "rgba(22,27,34,0.95)", borderColor: "rgba(0,212,255,0.15)" }}
        >
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                currentPrompt?.fieldKey === "budgetPerRun"
                  ? "Enter amount in USD, or leave blank to skip…"
                  : isMultiline
                  ? "Describe in detail… (Shift+Enter for new line, Enter to send)"
                  : "Type your answer… (Enter to send)"
              }
              rows={isMultiline ? 3 : 1}
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{
                background: "#0a0e14",
                border: "1px solid rgba(0,212,255,0.25)",
                color: "#e6edf3",
                fontFamily: "Inter, sans-serif",
                lineHeight: "1.5",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(0,212,255,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(0,212,255,0.25)")}
            />
            <button
              onClick={() => submitAnswer(inputValue)}
              disabled={!inputValue.trim() && currentPrompt?.fieldKey !== "budgetPerRun"}
              className="flex items-center justify-center w-10 h-10 rounded-xl transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0"
              style={{
                background: "rgba(0,212,255,0.15)",
                border: "1px solid rgba(0,212,255,0.4)",
              }}
            >
              <Send className="w-4 h-4" style={{ color: "#00d4ff" }} />
            </button>
          </div>
          {isMultiline && (
            <p className="text-xs mt-2 font-jetbrains" style={{ color: "rgba(230,237,243,0.25)" }}>
              Shift+Enter for new line · Enter sends
            </p>
          )}
        </div>
      )}
    </div>
  );
}
