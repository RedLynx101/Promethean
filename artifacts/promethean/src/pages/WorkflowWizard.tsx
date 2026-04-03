import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ArrowRight, ArrowLeft, Zap, Check } from "lucide-react";

interface WizardState {
  name: string;
  description: string;
  domain: string;
  budgetPerRun: string;
  latencyRequirement: string;
  riskTolerance: string;
  complianceRequirements: string;
  guardrails: string;
  humanOversightPreference: string;
  edgeCases: string;
}

const DOMAINS = [
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

const RISK_OPTIONS = ["Low", "Medium", "High", "Critical"];
const OVERSIGHT_OPTIONS = [
  "Fully automated — minimal human review",
  "Human review at major milestones only",
  "Human approval at each pipeline stage",
  "Human in the loop for all decisions",
];

const STEPS = [
  { id: "describe", label: "Describe" },
  { id: "constraints", label: "Constraints" },
  { id: "governance", label: "Governance" },
  { id: "review", label: "Review" },
];

export default function WorkflowWizard() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>({
    name: "",
    description: "",
    domain: "",
    budgetPerRun: "",
    latencyRequirement: "",
    riskTolerance: "Medium",
    complianceRequirements: "",
    guardrails: "",
    humanOversightPreference: "Human review at major milestones only",
    edgeCases: "",
  });

  const createAndStart = useMutation({
    mutationFn: async () => {
      // 1. Create workflow
      const workflow = await apiFetch<{ id: string }>("/workflows", {
        method: "POST",
        body: JSON.stringify({ name: state.name, description: state.description, domain: state.domain }),
      });

      // 2. Start pipeline
      const pipelineResult = await apiFetch<{ workflowId: string; phase: string; workflow: { id: string } }>("/pipeline/start", {
        method: "POST",
        body: JSON.stringify({
          workflowId: workflow.id,
          description: buildBrief(),
          domain: state.domain,
          constraints: {
            budgetPerRun: state.budgetPerRun ? parseFloat(state.budgetPerRun) : null,
            latencyRequirement: state.latencyRequirement || null,
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

  function buildBrief(): string {
    return `${state.description}

Domain: ${state.domain}
Risk Tolerance: ${state.riskTolerance}
Human Oversight: ${state.humanOversightPreference}
${state.budgetPerRun ? `Budget per run: $${state.budgetPerRun}` : ""}
${state.latencyRequirement ? `Latency requirement: ${state.latencyRequirement}` : ""}
${state.complianceRequirements ? `Compliance: ${state.complianceRequirements}` : ""}
${state.guardrails ? `Guardrails: ${state.guardrails}` : ""}
${state.edgeCases ? `Edge cases to handle: ${state.edgeCases}` : ""}`;
  }

  const update = (key: keyof WizardState) => (value: string) =>
    setState((s) => ({ ...s, [key]: value }));

  const canAdvance = () => {
    if (step === 0) return state.name.length > 0 && state.description.length > 10;
    if (step === 1) return state.domain.length > 0;
    return true;
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ background: "#0a0e14" }}
    >
      {/* Grid background */}
      <div className="fixed inset-0 grid-pattern opacity-30 pointer-events-none" />

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)" }}
          >
            <Zap className="w-7 h-7" style={{ color: "#00d4ff" }} />
          </div>
          <h1 className="font-orbitron text-xl font-bold mb-2" style={{ color: "#00d4ff" }}>
            NEW WORKFLOW
          </h1>
          <p className="text-sm" style={{ color: "rgba(230,237,243,0.5)" }}>
            Describe your workflow and our AI agents will analyze and orchestrate it
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-jetbrains font-bold transition-all"
                  style={{
                    background: i < step ? "rgba(0,255,136,0.2)" : i === step ? "rgba(0,212,255,0.2)" : "rgba(255,255,255,0.05)",
                    border: `2px solid ${i < step ? "#00ff88" : i === step ? "#00d4ff" : "rgba(255,255,255,0.1)"}`,
                    color: i < step ? "#00ff88" : i === step ? "#00d4ff" : "rgba(230,237,243,0.3)",
                  }}
                >
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className="text-xs mt-1 font-jetbrains"
                  style={{ color: i === step ? "#00d4ff" : "rgba(230,237,243,0.3)" }}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-16 h-px mx-2 mb-5"
                  style={{ background: i < step ? "rgba(0,255,136,0.4)" : "rgba(255,255,255,0.1)" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{ background: "#161b22", border: "1px solid rgba(0,212,255,0.2)" }}
        >
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="font-orbitron text-base font-bold" style={{ color: "#e6edf3" }}>
                Describe Your Workflow
              </h2>
              <div>
                <label className="block text-xs font-jetbrains uppercase tracking-widest mb-2" style={{ color: "rgba(230,237,243,0.5)" }}>
                  Workflow Name *
                </label>
                <input
                  type="text"
                  value={state.name}
                  onChange={(e) => update("name")(e.target.value)}
                  placeholder="e.g., Customer Support Triage"
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                  style={{
                    background: "#0a0e14",
                    border: "1px solid rgba(0,212,255,0.2)",
                    color: "#e6edf3",
                    fontFamily: "Inter",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(0,212,255,0.5)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(0,212,255,0.2)")}
                />
              </div>
              <div>
                <label className="block text-xs font-jetbrains uppercase tracking-widest mb-2" style={{ color: "rgba(230,237,243,0.5)" }}>
                  Workflow Description *
                </label>
                <textarea
                  value={state.description}
                  onChange={(e) => update("description")(e.target.value)}
                  placeholder="Describe what your workflow does, its inputs, outputs, and key decision points. The more detail you provide, the better our AI agents can analyze it."
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none transition-all"
                  style={{
                    background: "#0a0e14",
                    border: "1px solid rgba(0,212,255,0.2)",
                    color: "#e6edf3",
                    fontFamily: "Inter",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(0,212,255,0.5)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(0,212,255,0.2)")}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-orbitron text-base font-bold" style={{ color: "#e6edf3" }}>
                Constraints & Requirements
              </h2>
              <div>
                <label className="block text-xs font-jetbrains uppercase tracking-widest mb-2" style={{ color: "rgba(230,237,243,0.5)" }}>
                  Domain *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DOMAINS.map((d) => (
                    <button
                      key={d}
                      onClick={() => update("domain")(d)}
                      className="px-3 py-2 rounded-lg text-sm text-left transition-all"
                      style={{
                        background: state.domain === d ? "rgba(0,212,255,0.15)" : "#0a0e14",
                        border: `1px solid ${state.domain === d ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.08)"}`,
                        color: state.domain === d ? "#00d4ff" : "rgba(230,237,243,0.6)",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains uppercase tracking-widest mb-2" style={{ color: "rgba(230,237,243,0.5)" }}>
                    Budget per run ($)
                  </label>
                  <input
                    type="number"
                    value={state.budgetPerRun}
                    onChange={(e) => update("budgetPerRun")(e.target.value)}
                    placeholder="e.g., 0.50"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                    style={{ background: "#0a0e14", border: "1px solid rgba(0,212,255,0.2)", color: "#e6edf3" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-jetbrains uppercase tracking-widest mb-2" style={{ color: "rgba(230,237,243,0.5)" }}>
                    Latency Requirement
                  </label>
                  <input
                    type="text"
                    value={state.latencyRequirement}
                    onChange={(e) => update("latencyRequirement")(e.target.value)}
                    placeholder="e.g., under 5 seconds"
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                    style={{ background: "#0a0e14", border: "1px solid rgba(0,212,255,0.2)", color: "#e6edf3" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-jetbrains uppercase tracking-widest mb-2" style={{ color: "rgba(230,237,243,0.5)" }}>
                  Risk Tolerance
                </label>
                <div className="flex gap-2">
                  {RISK_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => update("riskTolerance")(r)}
                      className="flex-1 py-2 rounded-lg text-sm transition-all"
                      style={{
                        background: state.riskTolerance === r ? "rgba(0,212,255,0.15)" : "#0a0e14",
                        border: `1px solid ${state.riskTolerance === r ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.08)"}`,
                        color: state.riskTolerance === r ? "#00d4ff" : "rgba(230,237,243,0.6)",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-jetbrains uppercase tracking-widest mb-2" style={{ color: "rgba(230,237,243,0.5)" }}>
                  Compliance Requirements
                </label>
                <input
                  type="text"
                  value={state.complianceRequirements}
                  onChange={(e) => update("complianceRequirements")(e.target.value)}
                  placeholder="e.g., GDPR, HIPAA, SOC 2, PCI-DSS"
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                  style={{ background: "#0a0e14", border: "1px solid rgba(0,212,255,0.2)", color: "#e6edf3" }}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-orbitron text-base font-bold" style={{ color: "#e6edf3" }}>
                Governance & Oversight
              </h2>
              <div>
                <label className="block text-xs font-jetbrains uppercase tracking-widest mb-2" style={{ color: "rgba(230,237,243,0.5)" }}>
                  Human Oversight Preference
                </label>
                <div className="space-y-2">
                  {OVERSIGHT_OPTIONS.map((o) => (
                    <button
                      key={o}
                      onClick={() => update("humanOversightPreference")(o)}
                      className="w-full px-4 py-3 rounded-lg text-sm text-left transition-all"
                      style={{
                        background: state.humanOversightPreference === o ? "rgba(0,212,255,0.15)" : "#0a0e14",
                        border: `1px solid ${state.humanOversightPreference === o ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.08)"}`,
                        color: state.humanOversightPreference === o ? "#00d4ff" : "rgba(230,237,243,0.6)",
                      }}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-jetbrains uppercase tracking-widest mb-2" style={{ color: "rgba(230,237,243,0.5)" }}>
                  Guardrails & Safety Constraints
                </label>
                <textarea
                  value={state.guardrails}
                  onChange={(e) => update("guardrails")(e.target.value)}
                  placeholder="e.g., Never send emails without human approval, always validate PII before processing, rate limit to 100 requests/min"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none"
                  style={{ background: "#0a0e14", border: "1px solid rgba(0,212,255,0.2)", color: "#e6edf3" }}
                />
              </div>
              <div>
                <label className="block text-xs font-jetbrains uppercase tracking-widest mb-2" style={{ color: "rgba(230,237,243,0.5)" }}>
                  Edge Cases to Handle
                </label>
                <textarea
                  value={state.edgeCases}
                  onChange={(e) => update("edgeCases")(e.target.value)}
                  placeholder="e.g., What happens when the input is malformed? How should rate limit errors be handled?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none"
                  style={{ background: "#0a0e14", border: "1px solid rgba(0,212,255,0.2)", color: "#e6edf3" }}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-orbitron text-base font-bold" style={{ color: "#e6edf3" }}>
                Review & Launch Pipeline
              </h2>
              <div
                className="rounded-xl p-5 space-y-4"
                style={{ background: "#0a0e14", border: "1px solid rgba(0,212,255,0.15)" }}
              >
                <div className="grid grid-cols-2 gap-4 text-sm font-jetbrains">
                  <div>
                    <span style={{ color: "rgba(230,237,243,0.5)" }}>Name</span>
                    <p style={{ color: "#e6edf3" }}>{state.name}</p>
                  </div>
                  <div>
                    <span style={{ color: "rgba(230,237,243,0.5)" }}>Domain</span>
                    <p style={{ color: "#e6edf3" }}>{state.domain}</p>
                  </div>
                  <div>
                    <span style={{ color: "rgba(230,237,243,0.5)" }}>Risk Tolerance</span>
                    <p style={{ color: "#e6edf3" }}>{state.riskTolerance}</p>
                  </div>
                  <div>
                    <span style={{ color: "rgba(230,237,243,0.5)" }}>Budget</span>
                    <p style={{ color: "#e6edf3" }}>{state.budgetPerRun ? `$${state.budgetPerRun}/run` : "—"}</p>
                  </div>
                </div>
                <div className="text-sm font-jetbrains">
                  <span style={{ color: "rgba(230,237,243,0.5)" }}>Description</span>
                  <p className="mt-1" style={{ color: "#e6edf3" }}>
                    {state.description}
                  </p>
                </div>
              </div>

              <div
                className="rounded-xl p-4"
                style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.2)" }}
              >
                <p className="text-xs font-jetbrains" style={{ color: "#00d4ff" }}>
                  🚀 The AI pipeline will now run 4 agents:
                </p>
                <ol className="mt-2 space-y-1 text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.6)" }}>
                  <li>1. <strong style={{ color: "#00d4ff" }}>Decomposition Agent</strong> — breaks down your workflow into atomic steps</li>
                  <li>2. <strong style={{ color: "#FF9800" }}>System Selection Agent</strong> — classifies each step on L0-L5 spectrum</li>
                  <li>3. <strong style={{ color: "#E91E63" }}>Orchestration Agent</strong> — adds tools, conditions, and error handling</li>
                  <li>4. <strong style={{ color: "#9C27B0" }}>Governance Agent</strong> — configures monitoring and drift detection</li>
                </ol>
              </div>

              {createAndStart.error && (
                <p className="text-sm text-red-400 font-jetbrains">
                  Error: {(createAndStart.error as Error).message}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-all disabled:opacity-40"
            style={{
              background: "#161b22",
              border: "1px solid rgba(0,212,255,0.2)",
              color: "#e6edf3",
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => canAdvance() && setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,255,0.3), rgba(255,0,170,0.3))",
                border: "1px solid rgba(0,212,255,0.5)",
                color: "#00d4ff",
              }}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => createAndStart.mutate()}
              disabled={createAndStart.isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,255,0.3), rgba(255,0,170,0.3))",
                border: "1px solid rgba(0,212,255,0.5)",
                color: "#00d4ff",
                fontFamily: "'Orbitron', sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              {createAndStart.isPending ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#00d4ff" }} />
                  LAUNCHING...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  LAUNCH PIPELINE
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
