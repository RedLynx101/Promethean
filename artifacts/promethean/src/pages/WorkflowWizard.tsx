import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Send, Zap, Loader2, Bot, ArrowRight, Check, Pencil, Rocket } from "lucide-react";

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
  text?: string;
  cards?: SuggestionKind[];
  showLaunch?: boolean;
}

type SuggestionKind = "domain" | "compliance" | "guardrails";

type ChatStage =
  | "loadingClarify"
  | "awaitingDescription"
  | "loadingSuggest"
  | "reviewingSuggestions"
  | "editingDomain"
  | "editingCompliance"
  | "editingGuardrails"
  | "launching";

const RISK_OPTIONS = ["Low", "Medium", "High", "Critical"];
const OVERSIGHT_OPTIONS = [
  "Fully automated",
  "Review at major milestones",
  "Approval at each stage",
  "Human in the loop for all decisions",
];

interface ClarifyResponse {
  sufficient: boolean;
  reply: string;
  refinedDescription: string | null;
}

interface IntakeSuggestion {
  domainSuggestion: { domain: string; rationale: string };
  complianceSuggestion: {
    summary: string;
    frameworks: { name: string; source: string; relevance: string }[];
    proposedText: string;
  };
  guardrailsSuggestion: {
    summary: string;
    proposedText: string;
    bullets: string[];
  };
}

interface CardDecision {
  status: "pending" | "accepted" | "edited";
  value: string;
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

type Phase = "form" | "chat";

export default function WorkflowWizard() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const [phase, setPhase] = useState<Phase>("form");
  const [wizardState, setWizardState] = useState<WizardState>({
    name: "",
    description: "",
    domain: "",
    budgetPerRun: "",
    riskTolerance: "Medium",
    humanOversightPreference: "Review at major milestones",
    complianceRequirements: "",
    guardrails: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stage, setStage] = useState<ChatStage>("loadingClarify");
  const [inputValue, setInputValue] = useState("");

  const [clarifyHistory, setClarifyHistory] = useState<{ role: "agent" | "user"; text: string }[]>([]);

  const [suggestion, setSuggestion] = useState<IntakeSuggestion | null>(null);
  const [decisions, setDecisions] = useState<Record<SuggestionKind, CardDecision>>({
    domain: { status: "pending", value: "" },
    compliance: { status: "pending", value: "" },
    guardrails: { status: "pending", value: "" },
  });

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, decisions]);

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
      state.complianceRequirements && state.complianceRequirements.toLowerCase() !== "none"
        ? `Compliance: ${state.complianceRequirements}`
        : "",
      state.guardrails && state.guardrails.toLowerCase() !== "none"
        ? `Guardrails: ${state.guardrails}`
        : "",
    ].filter(Boolean).join("\n");
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wizardState.name.trim()) {
      setFormError("Workflow needs a name.");
      return;
    }
    if (!wizardState.description.trim()) {
      setFormError("Workflow needs a description.");
      return;
    }
    if (wizardState.budgetPerRun && Number.isNaN(parseFloat(wizardState.budgetPerRun))) {
      setFormError("Budget must be a number, or leave it blank.");
      return;
    }
    setFormError(null);
    setPhase("chat");
    setMessages([{
      id: makeId(),
      role: "agent",
      text: `Got it — "${wizardState.name.trim()}". Let me read what you wrote and check I have what I need…`,
    }]);
    void runClarify(wizardState, []);
  }

  // ─── Clarification loop ────────────────────────────────────────────────
  async function runClarify(state: WizardState, history: { role: "agent" | "user"; text: string }[]) {
    setStage("loadingClarify");
    try {
      const result = await apiFetch<ClarifyResponse>("/intake/clarify", {
        method: "POST",
        body: JSON.stringify({
          name: state.name,
          description: state.description,
          riskTolerance: state.riskTolerance,
          humanOversightPreference: state.humanOversightPreference,
          budgetPerRun: state.budgetPerRun || undefined,
          history,
        }),
      });

      const newHistory: typeof history = [...history, { role: "agent", text: result.reply }];
      setClarifyHistory(newHistory);
      setMessages((prev) => [...prev, { id: makeId(), role: "agent", text: result.reply }]);

      if (result.sufficient) {
        const finalDesc = result.refinedDescription?.trim() || state.description;
        const finalState = { ...state, description: finalDesc };
        setWizardState(finalState);
        await runSuggest(finalState);
      } else {
        setStage("awaitingDescription");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [...prev, {
        id: makeId(),
        role: "agent",
        text: `I hit an error reaching the intake service: ${errorMsg}. Send any message to retry.`,
      }]);
      setStage("awaitingDescription");
    }
  }

  function submitDescriptionFollowup() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setInputValue("");
    setMessages((prev) => [...prev, { id: makeId(), role: "user", text: trimmed }]);
    const newHistory: typeof clarifyHistory = [...clarifyHistory, { role: "user", text: trimmed }];
    setClarifyHistory(newHistory);
    void runClarify(wizardState, newHistory);
  }

  // ─── Suggestion phase ──────────────────────────────────────────────────
  async function runSuggest(state: WizardState) {
    setStage("loadingSuggest");
    setMessages((prev) => [...prev, {
      id: makeId(),
      role: "agent",
      text: "Description locked in. Let me draft suggestions for the rest…",
    }]);
    try {
      const result = await apiFetch<IntakeSuggestion>("/intake/suggest", {
        method: "POST",
        body: JSON.stringify({
          name: state.name,
          description: state.description,
          riskTolerance: state.riskTolerance,
          humanOversightPreference: state.humanOversightPreference,
          budgetPerRun: state.budgetPerRun || undefined,
        }),
      });
      setSuggestion(result);
      setDecisions({
        domain: { status: "pending", value: result.domainSuggestion.domain },
        compliance: { status: "pending", value: result.complianceSuggestion.proposedText },
        guardrails: { status: "pending", value: result.guardrailsSuggestion.proposedText },
      });
      setMessages((prev) => [...prev, {
        id: makeId(),
        role: "agent",
        text: "Here's what I'd recommend. Review each — accept it as-is or edit it. Once all three are set, hit Launch.",
        cards: ["domain", "compliance", "guardrails"],
        showLaunch: true,
      }]);
      setStage("reviewingSuggestions");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [...prev, {
        id: makeId(),
        role: "agent",
        text: `I hit an error generating suggestions: ${errorMsg}.`,
      }]);
    }
  }

  function acceptSuggestion(kind: SuggestionKind) {
    if (!suggestion) return;
    const value =
      kind === "domain" ? suggestion.domainSuggestion.domain
      : kind === "compliance" ? suggestion.complianceSuggestion.proposedText
      : suggestion.guardrailsSuggestion.proposedText;
    setDecisions((d) => ({ ...d, [kind]: { status: "accepted", value } }));
    applyDecisionToState(kind, value);
  }

  function startEditing(kind: SuggestionKind) {
    setInputValue(decisions[kind].value);
    setStage(kind === "domain" ? "editingDomain" : kind === "compliance" ? "editingCompliance" : "editingGuardrails");
  }

  function submitEdit() {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    const kind: SuggestionKind =
      stage === "editingDomain" ? "domain"
      : stage === "editingCompliance" ? "compliance"
      : "guardrails";
    setDecisions((d) => ({ ...d, [kind]: { status: "edited", value: text } }));
    applyDecisionToState(kind, text);
    setStage("reviewingSuggestions");
  }

  function applyDecisionToState(kind: SuggestionKind, value: string) {
    setWizardState((s) => {
      if (kind === "domain") return { ...s, domain: value };
      if (kind === "compliance") return { ...s, complianceRequirements: value };
      return { ...s, guardrails: value };
    });
  }

  function cancelEdit() {
    setInputValue("");
    setStage("reviewingSuggestions");
  }

  function launchPipeline() {
    setStage("launching");
    setMessages((prev) => [...prev, {
      id: makeId(),
      role: "agent",
      text: "All set. Launching the four-agent pipeline now — Decomposition → System Selection → Orchestration → Governance.",
    }]);
    createAndStart.mutate(wizardState);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const isMultiline = stage === "awaitingDescription" || stage === "editingGuardrails" || stage === "editingCompliance";
    if (e.key === "Enter" && !e.shiftKey && !isMultiline) {
      e.preventDefault();
      onInputSubmit();
    }
  }

  function onInputSubmit() {
    if (stage === "awaitingDescription") submitDescriptionFollowup();
    else if (stage === "editingDomain" || stage === "editingCompliance" || stage === "editingGuardrails") submitEdit();
  }

  if (phase === "form") {
    return <FormPhase
      state={wizardState}
      setState={setWizardState}
      error={formError}
      onSubmit={handleFormSubmit}
    />;
  }

  const showInput =
    stage === "awaitingDescription" ||
    stage === "editingDomain" ||
    stage === "editingCompliance" ||
    stage === "editingGuardrails";
  const isMultilineInput = stage === "awaitingDescription" || stage === "editingGuardrails" || stage === "editingCompliance";
  const inputPlaceholder =
    stage === "awaitingDescription" ? "Answer the question… (Enter to send)"
      : stage === "editingDomain" ? "Type the domain you want…"
      : stage === "editingCompliance" ? "List the frameworks that apply, or 'none'…"
      : stage === "editingGuardrails" ? "List your guardrails (one per line), or 'none'…"
      : "";

  const allResolved = decisions.domain.status !== "pending"
    && decisions.compliance.status !== "pending"
    && decisions.guardrails.status !== "pending";

  return (
    <div className="flex flex-col h-screen" style={{ background: "#0a0e14" }}>
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />

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
            {stage === "reviewingSuggestions" || stage.startsWith("editing")
              ? "Step 2 of 2 · Review suggestions"
              : "Refining workflow description"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 relative z-10">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {msg.role === "agent" && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.25)" }}
              >
                <Bot className="w-4 h-4" style={{ color: "#00d4ff" }} />
              </div>
            )}
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
              style={{
                background: msg.role === "agent" ? "rgba(22,27,34,0.9)" : "rgba(0,212,255,0.12)",
                border: msg.role === "agent" ? "1px solid rgba(0,212,255,0.12)" : "1px solid rgba(0,212,255,0.3)",
                color: msg.role === "agent" ? "#e6edf3" : "#00d4ff",
                fontFamily: msg.role === "user" ? "'JetBrains Mono', monospace" : "Inter, sans-serif",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.text && <div>{msg.text}</div>}
              {msg.cards && suggestion && (
                <div className="mt-4 space-y-3">
                  {msg.cards.map((kind) => (
                    <SuggestionCardView
                      key={kind}
                      kind={kind}
                      suggestion={suggestion}
                      decision={decisions[kind]}
                      isEditing={
                        (kind === "domain" && stage === "editingDomain") ||
                        (kind === "compliance" && stage === "editingCompliance") ||
                        (kind === "guardrails" && stage === "editingGuardrails")
                      }
                      isLocked={stage === "launching" || createAndStart.isPending}
                      onAccept={() => acceptSuggestion(kind)}
                      onEdit={() => startEditing(kind)}
                    />
                  ))}
                  {msg.showLaunch && (
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={launchPipeline}
                        disabled={!allResolved || stage === "launching" || createAndStart.isPending}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40"
                        style={{
                          background: allResolved ? "rgba(0,255,136,0.15)" : "rgba(230,237,243,0.05)",
                          border: allResolved ? "1px solid rgba(0,255,136,0.5)" : "1px solid rgba(230,237,243,0.15)",
                          color: allResolved ? "#00ff88" : "rgba(230,237,243,0.4)",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        <Rocket className="w-4 h-4" />
                        {allResolved ? "Launch pipeline" : `Resolve all 3 to launch (${
                          [decisions.domain, decisions.compliance, decisions.guardrails].filter((d) => d.status !== "pending").length
                        }/3)`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {(stage === "loadingClarify" || stage === "loadingSuggest" || createAndStart.isPending) && (
          <div className="flex items-center gap-3 pl-11">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#00d4ff" }} />
            <span className="text-xs font-jetbrains" style={{ color: "rgba(0,212,255,0.6)" }}>
              {createAndStart.isPending ? "Initializing pipeline…"
                : stage === "loadingSuggest" ? "Drafting suggestions…"
                : "Thinking…"}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {showInput && (
        <div
          className="flex-shrink-0 border-t px-6 py-4 relative z-10"
          style={{ background: "rgba(22,27,34,0.95)", borderColor: "rgba(0,212,255,0.15)" }}
        >
          <div className="flex gap-3 items-end">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={inputPlaceholder}
              rows={isMultilineInput ? 3 : 1}
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
            {stage.startsWith("editing") && (
              <button
                onClick={cancelEdit}
                className="px-3 py-3 rounded-xl text-xs transition-all hover:opacity-90"
                style={{
                  background: "rgba(230,237,243,0.05)",
                  border: "1px solid rgba(230,237,243,0.2)",
                  color: "rgba(230,237,243,0.6)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                Cancel
              </button>
            )}
            <button
              onClick={onInputSubmit}
              disabled={!inputValue.trim()}
              className="flex items-center justify-center w-10 h-10 rounded-xl transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0"
              style={{
                background: "rgba(0,212,255,0.15)",
                border: "1px solid rgba(0,212,255,0.4)",
              }}
            >
              <Send className="w-4 h-4" style={{ color: "#00d4ff" }} />
            </button>
          </div>
          {isMultilineInput && (
            <p className="text-xs mt-2 font-jetbrains" style={{ color: "rgba(230,237,243,0.25)" }}>
              Shift+Enter for new line · Enter sends
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface SuggestionCardViewProps {
  kind: SuggestionKind;
  suggestion: IntakeSuggestion;
  decision: CardDecision;
  isEditing: boolean;
  isLocked: boolean;
  onAccept: () => void;
  onEdit: () => void;
}

function SuggestionCardView({ kind, suggestion, decision, isEditing, isLocked, onAccept, onEdit }: SuggestionCardViewProps) {
  const titleByKind: Record<SuggestionKind, string> = {
    domain: "Domain",
    compliance: "Compliance requirements",
    guardrails: "Guardrails",
  };
  const accent = decision.status === "accepted" ? "rgba(0,255,136,0.5)"
    : decision.status === "edited" ? "rgba(255,200,0,0.5)"
    : "rgba(0,212,255,0.25)";

  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: "rgba(0,212,255,0.04)",
        border: `1px solid ${accent}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="text-xs font-bold"
          style={{ color: "#00d4ff", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
        >
          {titleByKind[kind].toUpperCase()}
        </div>
        {decision.status === "accepted" && (
          <span style={{ color: "#00ff88", fontSize: "0.7rem", fontFamily: "'JetBrains Mono', monospace" }}>
            ✓ accepted
          </span>
        )}
        {decision.status === "edited" && (
          <span style={{ color: "rgba(255,200,0,0.9)", fontSize: "0.7rem", fontFamily: "'JetBrains Mono', monospace" }}>
            ✎ edited
          </span>
        )}
      </div>

      <div
        className="text-xs mb-2 px-2 py-1.5 rounded"
        style={{
          background: "rgba(0,0,0,0.25)",
          color: "rgba(230,237,243,0.9)",
          fontFamily: kind === "domain" ? "'JetBrains Mono', monospace" : "Inter, sans-serif",
          whiteSpace: "pre-wrap",
        }}
      >
        {decision.value}
      </div>

      {kind === "domain" && (
        <p style={{ color: "rgba(230,237,243,0.65)", fontSize: "0.75rem" }}>
          {suggestion.domainSuggestion.rationale}
        </p>
      )}

      {kind === "compliance" && (
        <div className="space-y-2 mt-1">
          <p style={{ color: "rgba(230,237,243,0.65)", fontSize: "0.75rem" }}>
            {suggestion.complianceSuggestion.summary}
          </p>
          {suggestion.complianceSuggestion.frameworks.length > 0 && (
            <ul className="space-y-1.5 mt-2">
              {suggestion.complianceSuggestion.frameworks.map((f, i) => (
                <li
                  key={i}
                  style={{
                    borderLeft: "2px solid rgba(0,212,255,0.4)",
                    paddingLeft: "0.6rem",
                    fontSize: "0.72rem",
                    color: "rgba(230,237,243,0.8)",
                  }}
                >
                  <div style={{ color: "#00d4ff", fontFamily: "'JetBrains Mono', monospace" }}>
                    {f.name}
                    <span style={{ color: "rgba(230,237,243,0.4)", marginLeft: 6 }}>· {f.source}</span>
                  </div>
                  <div>{f.relevance}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {kind === "guardrails" && (
        <p style={{ color: "rgba(230,237,243,0.65)", fontSize: "0.75rem" }}>
          {suggestion.guardrailsSuggestion.summary}
        </p>
      )}

      {!isLocked && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onAccept}
            disabled={isEditing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-40"
            style={{
              background: "rgba(0,255,136,0.12)",
              border: "1px solid rgba(0,255,136,0.4)",
              color: "#00ff88",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <Check className="w-3 h-3" />
            {decision.status === "accepted" ? "Accepted" : "Accept"}
          </button>
          <button
            onClick={onEdit}
            disabled={isEditing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-40"
            style={{
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.3)",
              color: "#00d4ff",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <Pencil className="w-3 h-3" />
            {isEditing ? "Editing…" : "Edit"}
          </button>
        </div>
      )}
    </div>
  );
}

interface FormPhaseProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

function FormPhase({ state, setState, error, onSubmit }: FormPhaseProps) {
  const fieldStyle: React.CSSProperties = {
    background: "#0a0e14",
    border: "1px solid rgba(0,212,255,0.25)",
    color: "#e6edf3",
    fontFamily: "Inter, sans-serif",
  };
  const labelStyle: React.CSSProperties = {
    color: "rgba(0,212,255,0.85)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.7rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };
  const helpStyle: React.CSSProperties = {
    color: "rgba(230,237,243,0.45)",
    fontSize: "0.75rem",
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0a0e14" }}>
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />

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
            Step 1 of 2 · Workflow basics
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex-1 overflow-y-auto px-6 py-8 relative z-10"
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h2
              className="text-xl font-bold mb-2"
              style={{ color: "#e6edf3", fontFamily: "Orbitron, sans-serif" }}
            >
              Design a new workflow
            </h2>
            <p style={helpStyle}>
              Fill in the basics. Prometheus will then chat with you to confirm your description, then suggest a domain, compliance framing (NIST AI RMF, GDPR, SOC 2, etc.), and concrete guardrails — each with accept or edit.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="wf-name" style={labelStyle}>Name</label>
            <input
              id="wf-name"
              type="text"
              value={state.name}
              onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g., Inbound lead triage"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={fieldStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,212,255,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,212,255,0.25)")}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="wf-desc" style={labelStyle}>Description</label>
            <textarea
              id="wf-desc"
              value={state.description}
              onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
              placeholder="What should this workflow accomplish? What data does it process? What outcome should it produce?"
              rows={5}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-y"
              style={fieldStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,212,255,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,212,255,0.25)")}
            />
            <p style={helpStyle}>
              The agent will ask follow-ups if this is too thin — what data, what problem. The clearer this is, the better the suggestions.
            </p>
          </div>

          <div className="space-y-2">
            <label style={labelStyle}>Risk tolerance</label>
            <div className="flex gap-2 flex-wrap">
              {RISK_OPTIONS.map((opt) => {
                const active = state.riskTolerance === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setState((s) => ({ ...s, riskTolerance: opt }))}
                    className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: active ? "rgba(0,212,255,0.18)" : "rgba(0,212,255,0.05)",
                      border: active ? "1px solid rgba(0,212,255,0.6)" : "1px solid rgba(0,212,255,0.2)",
                      color: active ? "#00d4ff" : "rgba(230,237,243,0.7)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label style={labelStyle}>Human oversight</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {OVERSIGHT_OPTIONS.map((opt) => {
                const active = state.humanOversightPreference === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setState((s) => ({ ...s, humanOversightPreference: opt }))}
                    className="px-4 py-3 rounded-lg text-xs text-left transition-all"
                    style={{
                      background: active ? "rgba(0,212,255,0.18)" : "rgba(0,212,255,0.05)",
                      border: active ? "1px solid rgba(0,212,255,0.6)" : "1px solid rgba(0,212,255,0.2)",
                      color: active ? "#00d4ff" : "rgba(230,237,243,0.7)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="wf-budget" style={labelStyle}>Budget per run (USD)</label>
            <input
              id="wf-budget"
              type="text"
              inputMode="decimal"
              value={state.budgetPerRun}
              onChange={(e) => setState((s) => ({ ...s, budgetPerRun: e.target.value }))}
              placeholder="Leave blank to skip"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={fieldStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,212,255,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,212,255,0.25)")}
            />
          </div>

          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{
                background: "rgba(255,99,99,0.08)",
                border: "1px solid rgba(255,99,99,0.4)",
                color: "#ff8787",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90"
              style={{
                background: "rgba(0,212,255,0.18)",
                border: "1px solid rgba(0,212,255,0.5)",
                color: "#00d4ff",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Continue to chat
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
