import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiFetch } from "@/lib/api";
import { STATUS_COLORS, SYSTEM_LEVEL_COLORS } from "@/lib/constants";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Bell,
  Zap,
  Plus,
} from "lucide-react";

interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions24h: number;
  successRate: number;
  avgLatencyMs: number | null;
  totalCost24h: number;
  activeAlerts: number;
  workflows: Array<{
    id: string;
    name: string;
    status: string;
    phase: string;
    successRate: number;
    lastRunAt: string | null;
    totalRuns: number;
    activeAlerts: number;
  }>;
}

interface ActivityPoint {
  date: string;
  executions: number;
  successes: number;
  failures: number;
  cost: number;
}

interface Alert {
  id: string;
  workflowId: string;
  alertType: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
}

function KPICard({
  title,
  value,
  icon: Icon,
  subtitle,
  color = "#00d4ff",
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; color?: string }>;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div
      className="relative rounded-xl p-5 overflow-hidden"
      style={{
        background: "#161b22",
        border: "1px solid rgba(0, 212, 255, 0.15)",
      }}
    >
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: `radial-gradient(ellipse at top right, ${color}, transparent)`,
        }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-jetbrains uppercase tracking-widest mb-1" style={{ color: "rgba(230,237,243,0.5)" }}>
            {title}
          </p>
          <p className="text-2xl font-orbitron font-bold" style={{ color }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs mt-1" style={{ color: "rgba(230,237,243,0.4)" }}>
              {subtitle}
            </p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${color}20`, border: `1px solid ${color}40` }}
        >
          <Icon className="w-5 h-5" color={color} />
        </div>
      </div>
    </div>
  );
}

function StatusPulse({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#607D8B";
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === "active" && (
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: color }}
        />
      )}
      <span
        className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

export default function Dashboard() {
  const qc = useQueryClient();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiFetch("/dashboard/stats"),
    refetchInterval: 30_000,
  });

  const { data: activity = [] } = useQuery<ActivityPoint[]>({
    queryKey: ["dashboard-activity"],
    queryFn: () => apiFetch("/dashboard/activity?days=14"),
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: () => apiFetch("/alerts?status=active"),
  });

  const acknowledgeAlert = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/alerts/${id}/acknowledge`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const resolveAlert = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/alerts/${id}/resolve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "#0a0e14" }}>
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)" }}
          >
            <Zap className="w-8 h-8 animate-pulse" style={{ color: "#00d4ff" }} />
          </div>
          <p className="font-orbitron text-sm" style={{ color: "#00d4ff" }}>
            INITIALIZING COMMAND CENTER...
          </p>
        </div>
      </div>
    );
  }

  const activeAlertsList = alerts.filter((a) => a.status === "active");

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "#0a0e14" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-orbitron text-2xl font-bold" style={{ color: "#00d4ff" }}>
            COMMAND CENTER
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(230,237,243,0.5)" }}>
            Workflow fleet overview & performance monitoring
          </p>
        </div>
        <Link href="/wizard">
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(255,0,170,0.2))",
              border: "1px solid rgba(0,212,255,0.4)",
              color: "#00d4ff",
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: "0.05em",
              fontSize: "11px",
            }}
          >
            <Plus className="w-4 h-4" />
            NEW WORKFLOW
          </button>
        </Link>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Total Executions (24h)"
          value={stats?.totalExecutions24h ?? 0}
          icon={Activity}
          color="#00d4ff"
        />
        <KPICard
          title="Success Rate"
          value={`${(stats?.successRate ?? 100).toFixed(1)}%`}
          icon={CheckCircle2}
          color="#00ff88"
          subtitle="Last 24 hours"
        />
        <KPICard
          title="Avg Latency"
          value={
            stats?.avgLatencyMs
              ? `${(stats.avgLatencyMs / 1000).toFixed(1)}s`
              : "—"
          }
          icon={Clock}
          color="#FF9800"
        />
        <KPICard
          title="Total Cost (24h)"
          value={`$${(stats?.totalCost24h ?? 0).toFixed(4)}`}
          icon={DollarSign}
          color="#ff00aa"
          subtitle={`${stats?.activeAlerts ?? 0} active alerts`}
        />
      </div>

      {/* Activity Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Area Chart */}
        <div
          className="lg:col-span-2 rounded-xl p-5"
          style={{ background: "#161b22", border: "1px solid rgba(0,212,255,0.15)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-orbitron text-sm font-bold" style={{ color: "#e6edf3" }}>
              EXECUTION TIMELINE
            </h2>
            <TrendingUp className="w-4 h-4" style={{ color: "#00d4ff" }} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activity}>
              <defs>
                <linearGradient id="execGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F44336" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F44336" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgba(230,237,243,0.4)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis
                tick={{ fill: "rgba(230,237,243,0.4)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "#161b22",
                  border: "1px solid rgba(0,212,255,0.3)",
                  borderRadius: 8,
                  fontFamily: "JetBrains Mono",
                  fontSize: 12,
                  color: "#e6edf3",
                }}
              />
              <Area
                type="monotone"
                dataKey="executions"
                stroke="#00d4ff"
                strokeWidth={2}
                fill="url(#execGrad)"
                name="Executions"
              />
              <Area
                type="monotone"
                dataKey="successes"
                stroke="#00ff88"
                strokeWidth={1.5}
                fill="url(#successGrad)"
                name="Successes"
              />
              <Area
                type="monotone"
                dataKey="failures"
                stroke="#F44336"
                strokeWidth={1.5}
                fill="url(#failGrad)"
                name="Failures"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alert Feed */}
        <div
          className="rounded-xl p-5"
          style={{ background: "#161b22", border: "1px solid rgba(0,212,255,0.15)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-orbitron text-sm font-bold" style={{ color: "#e6edf3" }}>
              ALERT FEED
            </h2>
            <div className="flex items-center gap-2">
              {activeAlertsList.length > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-jetbrains"
                  style={{ background: "rgba(244,67,54,0.2)", color: "#F44336", border: "1px solid rgba(244,67,54,0.3)" }}
                >
                  {activeAlertsList.length}
                </span>
              )}
              <Bell className="w-4 h-4" style={{ color: activeAlertsList.length > 0 ? "#F44336" : "#00d4ff" }} />
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-48">
            {activeAlertsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-8 h-8 mb-2" style={{ color: "#00ff88" }} />
                <p className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.5)" }}>
                  All systems nominal
                </p>
              </div>
            ) : (
              activeAlertsList.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg p-3"
                  style={{
                    background: alert.severity === "critical"
                      ? "rgba(244,67,54,0.1)"
                      : "rgba(255,152,0,0.1)",
                    border: `1px solid ${alert.severity === "critical" ? "rgba(244,67,54,0.3)" : "rgba(255,152,0,0.3)"}`,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      style={{ color: alert.severity === "critical" ? "#F44336" : "#FF9800" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "#e6edf3" }}>
                        {alert.title}
                      </p>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "rgba(230,237,243,0.5)" }}>
                        {alert.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => acknowledgeAlert.mutate(alert.id)}
                          className="text-xs px-2 py-0.5 rounded font-jetbrains transition-all hover:opacity-80"
                          style={{ background: "rgba(0,212,255,0.1)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.2)" }}
                        >
                          ACK
                        </button>
                        <button
                          onClick={() => resolveAlert.mutate(alert.id)}
                          className="text-xs px-2 py-0.5 rounded font-jetbrains transition-all hover:opacity-80"
                          style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.2)" }}
                        >
                          RESOLVE
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Workflow Fleet */}
      <div
        className="rounded-xl p-5"
        style={{ background: "#161b22", border: "1px solid rgba(0,212,255,0.15)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-orbitron text-sm font-bold" style={{ color: "#e6edf3" }}>
            WORKFLOW FLEET
          </h2>
          <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.4)" }}>
            {stats?.totalWorkflows ?? 0} workflows · {stats?.activeWorkflows ?? 0} active
          </span>
        </div>

        {!stats?.workflows?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)" }}
            >
              <Zap className="w-8 h-8" style={{ color: "#00d4ff" }} />
            </div>
            <p className="font-orbitron text-sm mb-2" style={{ color: "#e6edf3" }}>
              No workflows yet
            </p>
            <p className="text-sm mb-4" style={{ color: "rgba(230,237,243,0.4)" }}>
              Create your first workflow or deploy a template
            </p>
            <Link href="/wizard">
              <button
                className="px-4 py-2 rounded-lg text-sm transition-all hover:opacity-90"
                style={{
                  background: "rgba(0,212,255,0.15)",
                  border: "1px solid rgba(0,212,255,0.4)",
                  color: "#00d4ff",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "11px",
                }}
              >
                + NEW WORKFLOW
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.workflows.map((w) => (
              <Link key={w.id} href={`/workflow/${w.id}/detail`}>
                <div
                  className="rounded-lg p-4 cursor-pointer transition-all hover:border-cyan-400/40"
                  style={{
                    background: "#0a0e14",
                    border: "1px solid rgba(0,212,255,0.1)",
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <StatusPulse status={w.status} />
                      <h3 className="text-sm font-medium truncate" style={{ color: "#e6edf3" }}>
                        {w.name}
                      </h3>
                    </div>
                    {w.activeAlerts > 0 && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-jetbrains"
                        style={{ background: "rgba(244,67,54,0.2)", color: "#F44336" }}
                      >
                        {w.activeAlerts}⚠
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.5)" }}>
                    <span>{w.totalRuns} runs</span>
                    <span
                      style={{ color: w.successRate >= 90 ? "#00ff88" : w.successRate >= 70 ? "#FF9800" : "#F44336" }}
                    >
                      {w.successRate.toFixed(0)}% success
                    </span>
                  </div>

                  <div className="mt-3">
                    <div
                      className="h-1 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${w.successRate}%`,
                          background: w.successRate >= 90 ? "#00ff88" : w.successRate >= 70 ? "#FF9800" : "#F44336",
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-jetbrains uppercase"
                      style={{
                        background: `${STATUS_COLORS[w.phase] ?? "#607D8B"}20`,
                        color: STATUS_COLORS[w.phase] ?? "#607D8B",
                        border: `1px solid ${STATUS_COLORS[w.phase] ?? "#607D8B"}40`,
                      }}
                    >
                      {w.phase}
                    </span>
                    {w.lastRunAt && (
                      <span className="text-xs" style={{ color: "rgba(230,237,243,0.3)" }}>
                        {new Date(w.lastRunAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
