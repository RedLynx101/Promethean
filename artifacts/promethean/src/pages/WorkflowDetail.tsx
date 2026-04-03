import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { STATUS_COLORS } from "@/lib/constants";
import {
  Play,
  ExternalLink,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart2,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Execution {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs?: number | null;
  totalLatencyMs?: number | null;
  costUsd?: number | null;
  totalCostUsd?: number | null;
  totalCost?: number | null;
  errorMessage?: string | null;
  error?: Record<string, unknown> | null;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  phase: string;
  domain: string;
  config: Record<string, unknown>;
}

export default function WorkflowDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: workflow } = useQuery<Workflow>({
    queryKey: ["workflow", id],
    queryFn: () => apiFetch(`/workflows/${id}`),
  });

  const { data: executions = [] } = useQuery<Execution[]>({
    queryKey: ["executions", id],
    queryFn: () => apiFetch(`/executions?workflowId=${id}&limit=20`),
  });

  const runWorkflow = useMutation({
    mutationFn: () =>
      apiFetch(`/executions`, {
        method: "POST",
        body: JSON.stringify({ workflowId: id }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["executions", id] }),
  });

  const successRate =
    executions.length > 0
      ? (executions.filter((e) => e.status === "success").length / executions.length) * 100
      : 0;

  const getDuration = (e: Execution) => e.durationMs ?? e.totalLatencyMs ?? null;
  const getCost = (e: Execution) => e.costUsd ?? e.totalCostUsd ?? e.totalCost ?? null;

  const avgDuration =
    executions.filter((e) => getDuration(e)).length > 0
      ? executions.reduce((sum, e) => sum + (getDuration(e) ?? 0), 0) /
        executions.filter((e) => getDuration(e)).length
      : 0;

  const chartData = executions.slice(0, 10).reverse().map((e, i) => ({
    run: `#${i + 1}`,
    duration: getDuration(e) ? Math.round((getDuration(e) ?? 0) / 1000) : 0,
    status: e.status,
  }));

  return (
    <div className="min-h-screen p-6" style={{ background: "#0a0e14" }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
          style={{ color: "rgba(230,237,243,0.5)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex-1">
          <h1 className="font-orbitron text-xl font-bold" style={{ color: "#e6edf3" }}>
            {workflow?.name}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(230,237,243,0.5)" }}>
            {workflow?.domain} · {workflow?.description}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/workflow/${id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff" }}
          >
            <ExternalLink className="w-4 h-4" />
            Open Editor
          </button>
          <button
            onClick={() => runWorkflow.mutate()}
            disabled={runWorkflow.isPending || workflow?.phase !== "deployed"}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,212,255,0.2))",
              border: "1px solid rgba(0,255,136,0.4)",
              color: "#00ff88",
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: "0.05em",
              fontSize: "11px",
            }}
          >
            <Play className="w-4 h-4" />
            RUN
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid rgba(0,212,255,0.15)" }}>
          <p className="text-xs font-jetbrains uppercase tracking-widest mb-1" style={{ color: "rgba(230,237,243,0.4)" }}>
            Phase
          </p>
          <span
            className="inline-block text-sm px-2 py-0.5 rounded-full font-jetbrains uppercase"
            style={{
              background: `${STATUS_COLORS[workflow?.phase ?? ""] ?? "#607D8B"}20`,
              color: STATUS_COLORS[workflow?.phase ?? ""] ?? "#607D8B",
              border: `1px solid ${STATUS_COLORS[workflow?.phase ?? ""] ?? "#607D8B"}40`,
            }}
          >
            {workflow?.phase}
          </span>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid rgba(0,212,255,0.15)" }}>
          <p className="text-xs font-jetbrains uppercase tracking-widest mb-1" style={{ color: "rgba(230,237,243,0.4)" }}>
            Total Runs
          </p>
          <p className="font-orbitron text-xl font-bold" style={{ color: "#00d4ff" }}>
            {executions.length}
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid rgba(0,212,255,0.15)" }}>
          <p className="text-xs font-jetbrains uppercase tracking-widest mb-1" style={{ color: "rgba(230,237,243,0.4)" }}>
            Success Rate
          </p>
          <p className="font-orbitron text-xl font-bold" style={{ color: successRate >= 90 ? "#00ff88" : successRate >= 70 ? "#FF9800" : "#F44336" }}>
            {successRate.toFixed(0)}%
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid rgba(0,212,255,0.15)" }}>
          <p className="text-xs font-jetbrains uppercase tracking-widest mb-1" style={{ color: "rgba(230,237,243,0.4)" }}>
            Avg Duration
          </p>
          <p className="font-orbitron text-xl font-bold" style={{ color: "#FF9800" }}>
            {avgDuration > 0 ? `${(avgDuration / 1000).toFixed(1)}s` : "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid rgba(0,212,255,0.15)" }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4" style={{ color: "#00d4ff" }} />
            <h2 className="font-orbitron text-sm font-bold" style={{ color: "#e6edf3" }}>
              RECENT EXECUTION TIMES
            </h2>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="run" tick={{ fill: "rgba(230,237,243,0.4)", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <YAxis tick={{ fill: "rgba(230,237,243,0.4)", fontSize: 10, fontFamily: "JetBrains Mono" }} unit="s" />
                <Tooltip
                  contentStyle={{ background: "#161b22", border: "1px solid rgba(0,212,255,0.3)", borderRadius: 8, fontFamily: "JetBrains Mono", fontSize: 12, color: "#e6edf3" }}
                  formatter={(val) => [`${val}s`, "Duration"]}
                />
                <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.status === "success" ? "#00ff88" : entry.status === "failed" ? "#F44336" : "#FF9800"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48" style={{ color: "rgba(230,237,243,0.3)" }}>
              <p className="text-sm font-jetbrains">No executions yet</p>
            </div>
          )}
        </div>

        {/* Execution Log */}
        <div className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid rgba(0,212,255,0.15)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4" style={{ color: "#00d4ff" }} />
            <h2 className="font-orbitron text-sm font-bold" style={{ color: "#e6edf3" }}>
              EXECUTION LOG
            </h2>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-56">
            {executions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="w-8 h-8 mb-2" style={{ color: "rgba(230,237,243,0.2)" }} />
                <p className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.4)" }}>
                  No executions recorded
                </p>
                {workflow?.phase !== "deployed" && (
                  <p className="text-xs font-jetbrains mt-1" style={{ color: "rgba(230,237,243,0.3)" }}>
                    Complete the pipeline to run this workflow
                  </p>
                )}
              </div>
            ) : (
              executions.map((exec) => (
                <div
                  key={exec.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: "#0a0e14", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  {exec.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#00ff88" }} />
                  ) : exec.status === "failed" ? (
                    <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#F44336" }} />
                  ) : exec.status === "running" ? (
                    <Activity className="w-4 h-4 flex-shrink-0 animate-pulse" style={{ color: "#00d4ff" }} />
                  ) : (
                    <Clock className="w-4 h-4 flex-shrink-0" style={{ color: "#607D8B" }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-jetbrains uppercase font-medium"
                        style={{
                          color: exec.status === "success" ? "#00ff88" : exec.status === "failed" ? "#F44336" : "#00d4ff",
                        }}
                      >
                        {exec.status}
                      </span>
                      {getDuration(exec) && (
                        <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.4)" }}>
                          {((getDuration(exec) ?? 0) / 1000).toFixed(2)}s
                        </span>
                      )}
                      {getCost(exec) && (
                        <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.4)" }}>
                          ${(getCost(exec) ?? 0).toFixed(4)}
                        </span>
                      )}
                    </div>
                    {exec.errorMessage && (
                      <p className="text-xs truncate mt-0.5" style={{ color: "#F44336" }}>
                        {exec.errorMessage}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-jetbrains flex-shrink-0" style={{ color: "rgba(230,237,243,0.3)" }}>
                    {new Date(exec.startedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
