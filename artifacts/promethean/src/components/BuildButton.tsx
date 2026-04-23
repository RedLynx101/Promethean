/**
 * BuildButton — the canonical pivot surface on the frontend.
 *
 * Pressed on a workflow whose four design phases are approved. Posts to
 * POST /api/workflows/:id/emit with the selected target framework; the
 * API writes a manifest to emit-requests/ for a harnessed agent (running
 * skills/emit.md) to pick up and turn into real runnable code.
 *
 * See PIVOT.md § "The emit boundary" for the full flow.
 */
import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Hammer, Check, ChevronDown, Clock } from "lucide-react";

const TARGET_FRAMEWORKS = [
  { id: "langgraph-js", label: "LangGraph (TypeScript)", tagline: "recommended — matches the stack" },
  { id: "inngest", label: "Inngest", tagline: "durable functions; best HumanGate story" },
  { id: "langgraph-py", label: "LangGraph (Python)", tagline: "for Python-first teams" },
  { id: "temporal", label: "Temporal", tagline: "heaviest; best for regulated prod" },
  { id: "n8n", label: "n8n (exported JSON)", tagline: "no-code visual; limited branching" },
  { id: "claude-agent-sdk", label: "Claude Agent SDK", tagline: "harnessed sub-agent per L4/L5 node" },
  { id: "python-script", label: "Plain Python script", tagline: "simplest; no durability" },
] as const;

type Target = (typeof TARGET_FRAMEWORKS)[number]["id"];

interface EmitRequest {
  requestId: string;
  workflowId: string;
  targetFramework: string;
  targetDir: string;
  requestedAt: string;
  status: string;
}

interface BuildButtonProps {
  workflowId: string;
  phase: string | undefined;
}

export default function BuildButton({ workflowId, phase }: BuildButtonProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const { data: history } = useQuery<{ workflowId: string; emitRequests: EmitRequest[] }>({
    queryKey: ["emit-requests", workflowId],
    queryFn: () => apiFetch(`/workflows/${workflowId}/emit`),
    enabled: !!workflowId,
  });

  const build = useMutation({
    mutationFn: (targetFramework: Target) =>
      apiFetch<{ requestId: string; requestFile: string; targetDir: string }>(
        `/workflows/${workflowId}/emit`,
        {
          method: "POST",
          body: JSON.stringify({ targetFramework }),
        }
      ),
    onSuccess: (res) => {
      setLastRequestId(res.requestId);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["emit-requests", workflowId] });
    },
  });

  const disabled = phase !== "deployed" && phase !== "govern";
  const canBuild = !disabled && !build.isPending;
  const emitRequests = history?.emitRequests ?? [];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => canBuild && setOpen((v) => !v)}
        disabled={!canBuild}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all hover:opacity-90 disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, rgba(156,39,176,0.2), rgba(255,152,0,0.2))",
          border: "1px solid rgba(156,39,176,0.4)",
          color: "#FF9800",
          fontFamily: "'Orbitron', sans-serif",
          letterSpacing: "0.05em",
          fontSize: "11px",
        }}
        title={
          disabled
            ? "Complete all four design phases before building"
            : "Emit real runnable code from this approved workflow"
        }
      >
        <Hammer className="w-4 h-4" />
        BUILD
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden z-50"
          style={{
            background: "#161b22",
            border: "1px solid rgba(156,39,176,0.4)",
            minWidth: 340,
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="px-4 py-3"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(156,39,176,0.08)",
            }}
          >
            <p
              className="font-orbitron text-xs font-bold mb-1"
              style={{ color: "#FF9800", letterSpacing: "0.08em" }}
            >
              EMIT TARGET FRAMEWORK
            </p>
            <p
              className="text-xs font-jetbrains"
              style={{ color: "rgba(230,237,243,0.55)" }}
            >
              Writes a manifest to <code>emit-requests/</code>. A harnessed
              agent running <code>skills/emit.md</code> picks it up and
              generates code in <code>out/&lt;slug&gt;/</code>.
            </p>
          </div>
          <div className="py-1 max-h-80 overflow-y-auto">
            {TARGET_FRAMEWORKS.map((tf) => (
              <button
                key={tf.id}
                onClick={() => build.mutate(tf.id)}
                disabled={build.isPending}
                className="w-full text-left px-4 py-2.5 transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-jetbrains text-sm"
                    style={{ color: "#e6edf3" }}
                  >
                    {tf.label}
                  </span>
                  {tf.id === "langgraph-js" && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-jetbrains uppercase"
                      style={{
                        background: "rgba(0,255,136,0.1)",
                        color: "#00ff88",
                        border: "1px solid rgba(0,255,136,0.3)",
                      }}
                    >
                      default
                    </span>
                  )}
                </div>
                <p
                  className="text-xs mt-0.5 font-jetbrains"
                  style={{ color: "rgba(230,237,243,0.45)" }}
                >
                  {tf.tagline}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {lastRequestId && !build.isPending && (
        <div
          className="absolute right-0 top-full mt-2 rounded-lg px-3 py-2 flex items-center gap-2 z-40"
          style={{
            background: "rgba(0,255,136,0.1)",
            border: "1px solid rgba(0,255,136,0.3)",
            color: "#00ff88",
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <Check className="w-3 h-3" />
          Queued: {lastRequestId.slice(0, 28)}…
        </div>
      )}

      {build.isError && (
        <div
          className="absolute right-0 top-full mt-2 rounded-lg px-3 py-2 z-40"
          style={{
            background: "rgba(244,67,54,0.1)",
            border: "1px solid rgba(244,67,54,0.4)",
            color: "#F44336",
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Build failed: {(build.error as Error).message}
        </div>
      )}

      {emitRequests.length > 0 && !open && !lastRequestId && (
        <div
          className="absolute right-0 top-full mt-2 text-[10px] flex items-center gap-1 font-jetbrains"
          style={{ color: "rgba(230,237,243,0.4)" }}
        >
          <Clock className="w-3 h-3" />
          {emitRequests.length} previous build{emitRequests.length === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}
