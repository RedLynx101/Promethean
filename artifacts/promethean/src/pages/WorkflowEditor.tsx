import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { apiFetch } from "@/lib/api";
import { PHASES, SYSTEM_LEVEL_COLORS, TRIGGER_COLOR } from "@/lib/constants";
import PrometheanNode from "@/components/workflow/PrometheanNode";
import {
  Check,
  X,
  Zap,
  AlertTriangle,
  ChevronRight,
  Loader2,
} from "lucide-react";

const nodeTypes = { promethean: PrometheanNode };

const CANONICAL_EDGE_TYPES = ["default", "conditional", "error", "parallel", "loop"] as const;
type CanonicalEdgeType = typeof CANONICAL_EDGE_TYPES[number];

function toCanonicalEdgeType(edge: Edge): CanonicalEdgeType {
  const candidates = [
    (edge as Record<string, unknown>).edgeType,
    (edge.data as Record<string, unknown> | undefined)?.edgeType,
    (edge.data as Record<string, unknown> | undefined)?.type,
    edge.type,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && CANONICAL_EDGE_TYPES.includes(c as CanonicalEdgeType)) {
      return c as CanonicalEdgeType;
    }
  }
  return "default";
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  phase: string;
  status: string;
  config: Record<string, unknown>;
}

interface WorkflowVersion {
  id: string;
  version: number;
  phase: string;
  decomposition: unknown;
  systemSelection: unknown;
  orchestrationPlan: unknown;
  governanceConfig: unknown;
  humanGates: unknown;
  currentlyActive: boolean;
}

interface PipelineStatus {
  workflowId: string;
  phase: string;
  status?: string;
  pendingApproval?: boolean;
  currentVersion?: WorkflowVersion | null;
  workflow: Workflow & {
    status?: string;
    nodes?: Array<Record<string, unknown>>;
    edges?: Array<Record<string, unknown>>;
  };
}

function phaseStep(phase: string): number {
  return PHASES.find((p) => p.id === phase)?.step ?? 0;
}

function buildNodesAndEdges(version: WorkflowVersion | null) {
  if (!version) return { nodes: [], edges: [] };

  const orchestration = version.orchestrationPlan as Record<string, unknown> | null;
  if (!orchestration) return { nodes: [], edges: [] };

  const steps: Array<Record<string, unknown>> = (orchestration.steps as Array<Record<string, unknown>>) || [];
  const systemSel = version.systemSelection as Record<string, unknown> | null;
  const systemSteps: Array<Record<string, unknown>> = (systemSel?.steps as Array<Record<string, unknown>>) || [];

  const systemByName: Record<string, Record<string, unknown>> = {};
  systemSteps.forEach((s) => {
    systemByName[(s.stepName ?? s.name) as string] = s;
  });

  const COLS = 3;
  const NODE_W = 260;
  const NODE_H = 140;
  const PAD_X = 80;
  const PAD_Y = 60;

  const nodes = steps.map((step, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * (NODE_W + PAD_X);
    const y = row * (NODE_H + PAD_Y);
    const sysInfo = systemByName[step.name as string] ?? {};
    const sysLevel = sysInfo.systemLevel ?? step.systemLevel;
    const tools = (step.tools as string[]) ?? [];
    return {
      id: `step-${i}`,
      type: "promethean",
      position: { x, y },
      data: {
        label: (step.name ?? step.stepName ?? `Step ${i + 1}`) as string,
        description: (step.description ?? step.action ?? "") as string,
        systemLevel: (sysLevel ?? null) as number | null,
        confidence: ((sysInfo.confidence ?? null) as number | null),
        rationale: (sysInfo.rationale ?? null) as string | null,
        tools,
        errorHandling: (step.errorHandling ?? null) as string | null,
        nodeCategory: (step.nodeCategory ?? null) as string | null,
      },
    };
  });

  const orchestrationEdges: Array<Record<string, unknown>> =
    (orchestration.edges as Array<Record<string, unknown>>) || [];

  // Edge type color mapping: default | conditional | error | parallel | loop
  function edgeStyle(edgeType: string | null | undefined): { stroke: string; strokeWidth: number; strokeDasharray?: string } {
    switch (edgeType) {
      case "error": return { stroke: "#F44336", strokeWidth: 2, strokeDasharray: "5 3" };
      case "conditional": return { stroke: "#FF9800", strokeWidth: 2 };
      case "parallel": return { stroke: "#9C27B0", strokeWidth: 2 };
      case "loop": return { stroke: "#E91E63", strokeWidth: 2, strokeDasharray: "8 4" };
      default: return { stroke: "rgba(0,212,255,0.3)", strokeWidth: 2 };
    }
  }

  const edges = orchestrationEdges.length > 0
    ? orchestrationEdges.map((edge, i) => {
        const et = edge.type as string | null;
        return {
          id: (edge.id as string) ?? `e${i}`,
          source: (edge.source as string) ?? `step-${i}`,
          target: (edge.target as string) ?? `step-${i + 1}`,
          type: "smoothstep",
          label: et && !["default", "smoothstep"].includes(et) ? et : undefined,
          labelStyle: { fill: "#e6edf3", fontSize: 9, fontFamily: "'JetBrains Mono'" },
          labelBgStyle: { fill: "#0a0e14", fillOpacity: 0.8 },
          markerEnd: { type: MarkerType.ArrowClosed, color: edgeStyle(et).stroke },
          style: edgeStyle(et),
        };
      })
    : steps.slice(1).map((_, i) => ({
        id: `e${i}-${i + 1}`,
        source: `step-${i}`,
        target: `step-${i + 1}`,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(0,212,255,0.5)" },
        style: { stroke: "rgba(0,212,255,0.3)", strokeWidth: 2 },
      }));

  return { nodes, edges };
}

export default function WorkflowEditor() {
  const params = useParams<{ id: string }>();
  const workflowId = params.id;
  const qc = useQueryClient();

  const { data: status, isLoading } = useQuery<PipelineStatus>({
    queryKey: ["pipeline-status", workflowId],
    queryFn: () => apiFetch(`/pipeline/${workflowId}/status`),
    refetchInterval: (query) => {
      const phase = query.state.data?.phase;
      if (!phase) return 5000;
      if (["deployed", "wizard"].includes(phase)) return false;
      if (query.state.data?.pendingApproval) return false;
      return 5000;
    },
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([] as Edge[]);

  useEffect(() => {
    if (!status) return;

    // First try to use workflow nodes/edges if they exist (seeded data)
    const workflowNodes = status.workflow?.nodes;
    const workflowEdges = status.workflow?.edges;

    if (workflowNodes && workflowNodes.length > 0) {
      const n = workflowNodes.map((node) => ({
        ...node,
        type: "promethean",
        id: node.id as string,
        position: (node.position as { x: number; y: number }) ?? { x: 0, y: 0 },
        data: {
          label: ((node.data as Record<string, unknown>)?.label ?? node.id) as string,
          description: ((node.data as Record<string, unknown>)?.description ?? "") as string,
          systemLevel: ((node.data as Record<string, unknown>)?.systemLevel ?? null) as number | null,
          confidence: ((node.data as Record<string, unknown>)?.confidence ?? null) as number | null,
          tools: ((node.data as Record<string, unknown>)?.tools ?? []) as string[],
          status: ((node.data as Record<string, unknown>)?.status ?? "idle") as string,
          nodeCategory: ((node.data as Record<string, unknown>)?.nodeCategory ?? null) as string | null,
        },
      }));
      const edgeTypeStyle = (et: string | null | undefined) => {
        switch (et) {
          case "error": return { stroke: "#F44336", strokeWidth: 2, strokeDasharray: "5 3" };
          case "conditional": return { stroke: "#FF9800", strokeWidth: 2 };
          case "parallel": return { stroke: "#9C27B0", strokeWidth: 2 };
          case "loop": return { stroke: "#E91E63", strokeWidth: 2, strokeDasharray: "8 4" };
          default: return { stroke: "rgba(0,212,255,0.3)", strokeWidth: 2 };
        }
      };
      const e = (workflowEdges ?? []).map((edge) => {
        const et = edge.edgeType as string | null ?? edge.type as string | null;
        const style = edgeTypeStyle(et);
        return {
          ...edge,
          id: edge.id as string,
          source: edge.source as string,
          target: edge.target as string,
          type: "smoothstep",
          label: et && !["default", "smoothstep"].includes(et) ? et : undefined,
          labelStyle: { fill: "#e6edf3", fontSize: 9, fontFamily: "'JetBrains Mono'" },
          labelBgStyle: { fill: "#0a0e14", fillOpacity: 0.8 },
          markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke },
          style,
        };
      });
      setNodes(n as Node[]);
      setEdges(e as Edge[]);
    } else if (status.currentVersion) {
      // Fall back to building from orchestration plan
      const { nodes: n, edges: e } = buildNodesAndEdges(status.currentVersion);
      setNodes(n);
      setEdges(e);
    }
  }, [status, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const approvePhase = useMutation({
    mutationFn: (edits?: { notes?: string }) =>
      apiFetch(`/pipeline/${workflowId}/approve`, {
        method: "POST",
        body: JSON.stringify({
          phase: currentPhase,
          edits: {
            nodes: nodes.map((n) => ({
              id: n.id,
              type: n.type ?? "promethean",
              position: n.position,
              data: {
                label: (n.data as { label?: string }).label ?? "",
                description: (n.data as { description?: string }).description ?? "",
                systemLevel: (n.data as { systemLevel?: number | null }).systemLevel ?? null,
                confidence: (n.data as { confidence?: number | null }).confidence ?? null,
                tools: (n.data as { tools?: string[] }).tools ?? [],
                nodeCategory: (n.data as { nodeCategory?: string | null }).nodeCategory ?? null,
              },
            })),
            edges: edges.map((e) => {
              const canonical = toCanonicalEdgeType(e);
              return {
                id: e.id,
                source: e.source,
                target: e.target,
                type: canonical,
                edgeType: canonical,
                data: e.data ?? {},
              };
            }),
            notes: edits?.notes,
          },
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline-status", workflowId] }),
  });

  const rejectPhase = useMutation({
    mutationFn: (feedback: string) =>
      apiFetch(`/pipeline/${workflowId}/reject`, {
        method: "POST",
        body: JSON.stringify({ phase: currentPhase, feedback: feedback || undefined }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline-status", workflowId] }),
  });

  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [showGovConfig, setShowGovConfig] = useState(false);
  const [govConfig, setGovConfig] = useState({
    loggingLevel: "info",
    autoSnapshot: true,
    latencyThreshold: 5000,
    costThreshold: 1.0,
    errorRateThreshold: 0.05,
    alertChannels: ["slack"],
    costLimitPerRun: 1.0,
    executionTimeoutMs: 30000,
  });

  const deployWorkflow = useMutation({
    mutationFn: () =>
      apiFetch(`/pipeline/${workflowId}/approve`, {
        method: "POST",
        body: JSON.stringify({
          phase: "govern",
          edits: {
            governanceConfig: {
              loggingLevel: govConfig.loggingLevel,
              autoSnapshot: govConfig.autoSnapshot,
              latencyThreshold: govConfig.latencyThreshold,
              costThreshold: govConfig.costThreshold,
              errorRateThreshold: govConfig.errorRateThreshold,
              alertChannels: govConfig.alertChannels,
              costLimitPerRun: govConfig.costLimitPerRun,
              executionTimeoutMs: govConfig.executionTimeoutMs,
            },
            nodes: nodes.map((n) => ({
              id: n.id,
              type: n.type ?? "promethean",
              position: n.position,
              data: {
                label: (n.data as { label?: string }).label ?? "",
                description: (n.data as { description?: string }).description ?? "",
                systemLevel: (n.data as { systemLevel?: number | null }).systemLevel ?? null,
                confidence: (n.data as { confidence?: number | null }).confidence ?? null,
                tools: (n.data as { tools?: string[] }).tools ?? [],
                nodeCategory: (n.data as { nodeCategory?: string | null }).nodeCategory ?? null,
              },
            })),
            edges: edges.map((e) => {
              const canonical = toCanonicalEdgeType(e);
              return {
                id: e.id,
                source: e.source,
                target: e.target,
                type: canonical,
                edgeType: canonical,
                data: e.data ?? {},
              };
            }),
          },
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline-status", workflowId] }),
  });

  const currentPhase = status?.phase ?? "wizard";
  const currentStep = phaseStep(currentPhase);
  // Backend signals approval needed via status = "awaiting_approval" or explicit pendingApproval field
  const isPending =
    status?.pendingApproval === true ||
    status?.workflow?.status === "awaiting_approval" ||
    status?.status === "awaiting_approval";
  const isRunning = !isPending && !["wizard", "deployed"].includes(currentPhase);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "#0a0e14" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#00d4ff" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: "#0a0e14" }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
        style={{ background: "#161b22", borderColor: "rgba(0,212,255,0.15)" }}
      >
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5" style={{ color: "#00d4ff" }} />
          <h1 className="font-orbitron text-base font-bold" style={{ color: "#e6edf3" }}>
            {status?.workflow?.name ?? "Workflow Editor"}
          </h1>
        </div>

        {/* Pipeline phase tracker */}
        <div className="flex items-center gap-1">
          {PHASES.map((phase, i) => {
            const done = currentStep > phase.step;
            const active = currentStep === phase.step;
            return (
              <div key={phase.id} className="flex items-center">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-jetbrains transition-all"
                  style={{
                    background: done
                      ? "rgba(0,255,136,0.1)"
                      : active
                      ? "rgba(0,212,255,0.15)"
                      : "transparent",
                    color: done ? "#00ff88" : active ? "#00d4ff" : "rgba(230,237,243,0.3)",
                    border: active ? "1px solid rgba(0,212,255,0.3)" : "1px solid transparent",
                  }}
                >
                  {done ? <Check className="w-3 h-3" /> : active && isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {phase.label}
                </div>
                {i < PHASES.length - 1 && (
                  <ChevronRight className="w-3 h-3 mx-0.5" style={{ color: "rgba(230,237,243,0.2)" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isPending && !showReject && (
            <>
              {/* Regenerate (reject with feedback) */}
              <button
                onClick={() => setShowReject(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{
                  background: "rgba(244,67,54,0.1)",
                  border: "1px solid rgba(244,67,54,0.3)",
                  color: "#F44336",
                }}
              >
                <X className="w-3.5 h-3.5" />
                Regenerate
              </button>
              {/* Governance config toggle (only for govern phase) */}
              {currentPhase === "govern" && (
                <button
                  onClick={() => setShowGovConfig((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                  style={{
                    background: showGovConfig ? "rgba(255,0,170,0.15)" : "rgba(255,0,170,0.08)",
                    border: `1px solid rgba(255,0,170,${showGovConfig ? "0.45" : "0.25"})`,
                    color: "#ff00aa",
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Gov Config
                </button>
              )}
              {/* Edit & Approve — for non-govern phases */}
              {currentPhase !== "govern" && (
                <button
                  onClick={() => {
                    const notes = window.prompt("Optional notes to send with this approval:");
                    if (notes !== null) {
                      approvePhase.mutate({ notes: notes || undefined });
                    }
                  }}
                  disabled={approvePhase.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                  style={{
                    background: "rgba(0,212,255,0.1)",
                    border: "1px solid rgba(0,212,255,0.3)",
                    color: "#00d4ff",
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Edit &amp; Approve
                </button>
              )}
              {currentPhase === "govern" ? (
                <button
                  onClick={() => deployWorkflow.mutate()}
                  disabled={deployWorkflow.isPending}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                  style={{
                    background: "rgba(0,255,136,0.18)",
                    border: "1px solid rgba(0,255,136,0.5)",
                    color: "#00ff88",
                    fontFamily: "'Orbitron', sans-serif",
                    letterSpacing: "0.05em",
                  }}
                >
                  {deployWorkflow.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  DEPLOY
                </button>
              ) : (
                <button
                  onClick={() => approvePhase.mutate({})}
                  disabled={approvePhase.isPending}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                  style={{
                    background: "rgba(0,255,136,0.15)",
                    border: "1px solid rgba(0,255,136,0.4)",
                    color: "#00ff88",
                    fontFamily: "'Orbitron', sans-serif",
                    letterSpacing: "0.05em",
                  }}
                >
                  {approvePhase.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  APPROVE
                </button>
              )}
            </>
          )}
          {currentPhase === "deployed" && (
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-jetbrains"
              style={{
                background: "rgba(0,255,136,0.1)",
                border: "1px solid rgba(0,255,136,0.3)",
                color: "#00ff88",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              DEPLOYED
            </span>
          )}
        </div>
      </div>

      {/* Reject panel */}
      {showReject && (
        <div
          className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0"
          style={{ background: "rgba(244,67,54,0.05)", borderColor: "rgba(244,67,54,0.2)" }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#F44336" }} />
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (optional)..."
            className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{
              background: "#0a0e14",
              border: "1px solid rgba(244,67,54,0.3)",
              color: "#e6edf3",
              fontFamily: "Inter",
            }}
          />
          <button
            onClick={() => {
              rejectPhase.mutate(rejectReason);
              setShowReject(false);
              setRejectReason("");
            }}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: "rgba(244,67,54,0.2)", border: "1px solid rgba(244,67,54,0.4)", color: "#F44336" }}
          >
            Confirm Reject
          </button>
          <button
            onClick={() => setShowReject(false)}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ color: "rgba(230,237,243,0.4)" }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* System Level Override Panel — shown at Gate 2 (select phase) */}
      {currentPhase === "select" && isPending && nodes.length > 0 && (
        <div
          className="px-6 py-4 border-b flex-shrink-0 overflow-x-auto"
          style={{ background: "rgba(33,150,243,0.04)", borderColor: "rgba(33,150,243,0.2)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="font-orbitron text-xs font-semibold tracking-wider uppercase" style={{ color: "#2196F3" }}>
              L0–L5 Classification Override
            </span>
            <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.35)" }}>
              Adjust AI-assigned system levels before approving
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {nodes
              .filter((n) => {
                const d = n.data as { nodeCategory?: string | null };
                return d.nodeCategory !== "trigger" && d.nodeCategory !== "human_gate";
              })
              .map((n) => {
                const d = n.data as { label?: string; systemLevel?: number | null };
                return (
                  <div
                    key={n.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                    style={{ background: "#0a0e14", border: "1px solid rgba(33,150,243,0.2)" }}
                  >
                    <span className="text-xs font-jetbrains max-w-[120px] truncate" style={{ color: "#e6edf3" }}>
                      {d.label ?? n.id}
                    </span>
                    <select
                      value={d.systemLevel ?? ""}
                      onChange={(e) => {
                        const level = e.target.value === "" ? null : parseInt(e.target.value, 10);
                        setNodes((prev) =>
                          prev.map((node) =>
                            node.id === n.id
                              ? { ...node, data: { ...node.data, systemLevel: level } }
                              : node
                          )
                        );
                      }}
                      className="text-xs px-1.5 py-0.5 rounded outline-none font-jetbrains"
                      style={{
                        background: "#161b22",
                        border: "1px solid rgba(33,150,243,0.25)",
                        color:
                          d.systemLevel === 0
                            ? "#4CAF50"
                            : d.systemLevel === 1
                            ? "#2196F3"
                            : d.systemLevel === 2
                            ? "#9C27B0"
                            : d.systemLevel === 3
                            ? "#FF9800"
                            : d.systemLevel === 4
                            ? "#F44336"
                            : d.systemLevel === 5
                            ? "#E91E63"
                            : "rgba(230,237,243,0.5)",
                      }}
                    >
                      <option value="">Auto</option>
                      <option value="0">L0 – Deterministic</option>
                      <option value="1">L1 – Supervised ML</option>
                      <option value="2">L2 – Language Understanding</option>
                      <option value="3">L3 – Single LLM</option>
                      <option value="4">L4 – Tool-Augmented</option>
                      <option value="5">L5 – Multi-Agent</option>
                    </select>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Governance Config Panel */}
      {showGovConfig && currentPhase === "govern" && isPending && (
        <div
          className="px-6 py-4 border-b flex-shrink-0"
          style={{ background: "rgba(255,0,170,0.04)", borderColor: "rgba(255,0,170,0.2)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="font-orbitron text-xs font-semibold tracking-wider uppercase" style={{ color: "#ff00aa" }}>
              Governance Configuration
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.5)" }}>Logging Level</span>
              <select
                value={govConfig.loggingLevel}
                onChange={(e) => setGovConfig((c) => ({ ...c, loggingLevel: e.target.value }))}
                className="px-2 py-1.5 rounded text-sm outline-none font-jetbrains"
                style={{ background: "#0a0e14", border: "1px solid rgba(255,0,170,0.25)", color: "#e6edf3" }}
              >
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.5)" }}>Latency Threshold (ms)</span>
              <input
                type="number"
                step="500"
                min="0"
                value={govConfig.latencyThreshold}
                onChange={(e) => setGovConfig((c) => ({ ...c, latencyThreshold: Number(e.target.value) }))}
                className="px-2 py-1.5 rounded text-sm outline-none font-jetbrains"
                style={{ background: "#0a0e14", border: "1px solid rgba(255,0,170,0.25)", color: "#e6edf3" }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.5)" }}>Cost Threshold ($)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={govConfig.costThreshold}
                onChange={(e) => setGovConfig((c) => ({ ...c, costThreshold: Number(e.target.value) }))}
                className="px-2 py-1.5 rounded text-sm outline-none font-jetbrains"
                style={{ background: "#0a0e14", border: "1px solid rgba(255,0,170,0.25)", color: "#e6edf3" }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.5)" }}>Error Rate Threshold (0–1)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={govConfig.errorRateThreshold}
                onChange={(e) => setGovConfig((c) => ({ ...c, errorRateThreshold: Number(e.target.value) }))}
                className="px-2 py-1.5 rounded text-sm outline-none font-jetbrains"
                style={{ background: "#0a0e14", border: "1px solid rgba(255,0,170,0.25)", color: "#e6edf3" }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.5)" }}>Cost Limit / Run ($)</span>
              <input
                type="number"
                step="0.1"
                min="0"
                value={govConfig.costLimitPerRun}
                onChange={(e) => setGovConfig((c) => ({ ...c, costLimitPerRun: Number(e.target.value) }))}
                className="px-2 py-1.5 rounded text-sm outline-none font-jetbrains"
                style={{ background: "#0a0e14", border: "1px solid rgba(255,0,170,0.25)", color: "#e6edf3" }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.5)" }}>Execution Timeout (ms)</span>
              <input
                type="number"
                step="5000"
                min="0"
                value={govConfig.executionTimeoutMs}
                onChange={(e) => setGovConfig((c) => ({ ...c, executionTimeoutMs: Number(e.target.value) }))}
                className="px-2 py-1.5 rounded text-sm outline-none font-jetbrains"
                style={{ background: "#0a0e14", border: "1px solid rgba(255,0,170,0.25)", color: "#e6edf3" }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.5)" }}>Alert Channels</span>
              <input
                type="text"
                value={govConfig.alertChannels.join(", ")}
                onChange={(e) => setGovConfig((c) => ({
                  ...c,
                  alertChannels: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                }))}
                placeholder="slack, email, pagerduty..."
                className="px-2 py-1.5 rounded text-sm outline-none font-jetbrains"
                style={{ background: "#0a0e14", border: "1px solid rgba(255,0,170,0.25)", color: "#e6edf3" }}
              />
            </label>
            <label className="flex items-center gap-2 cursor-pointer col-span-2">
              <input
                type="checkbox"
                checked={govConfig.autoSnapshot}
                onChange={(e) => setGovConfig((c) => ({ ...c, autoSnapshot: e.target.checked }))}
                className="w-3.5 h-3.5 accent-pink-500"
              />
              <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.6)" }}>Auto-snapshot on Deploy</span>
            </label>
          </div>
          <p className="text-xs mt-3 font-jetbrains" style={{ color: "rgba(255,0,170,0.5)" }}>
            These constraints will be enforced at runtime during each workflow execution.
          </p>
        </div>
      )}

      {/* Human gate approval banner */}
      {isPending && (
        <div
          className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0"
          style={{
            background: "rgba(0,212,255,0.05)",
            borderColor: "rgba(0,212,255,0.2)",
          }}
        >
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#00d4ff" }} />
          <p className="text-sm font-jetbrains" style={{ color: "#00d4ff" }}>
            <span className="font-bold">Human gate:</span>{" "}
            Review the {currentPhase} analysis above, then approve or reject to continue the pipeline.
          </p>
        </div>
      )}

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="rgba(0,212,255,0.12)"
          />
          <Controls position="bottom-right" />
          <MiniMap
            position="bottom-left"
            nodeColor={(node) => {
              const d = node.data as { systemLevel?: number; nodeCategory?: string };
              if (d.nodeCategory === "trigger") return TRIGGER_COLOR;
              if (d.nodeCategory === "human_gate") return "#607D8B";
              if (d.systemLevel != null) return SYSTEM_LEVEL_COLORS[d.systemLevel] ?? "#607D8B";
              return "#607D8B";
            }}
            style={{ background: "#161b22", border: "1px solid rgba(0,212,255,0.2)" }}
          />
        </ReactFlow>
      </div>

      {/* Loading overlay when agent is running */}
      {isRunning && nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-4"
            style={{ background: "rgba(22,27,34,0.9)", border: "1px solid rgba(0,212,255,0.3)" }}
          >
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)" }}
            >
              <Zap className="w-8 h-8 animate-pulse" style={{ color: "#00d4ff" }} />
            </div>
            <div className="text-center">
              <p className="font-orbitron text-sm font-bold mb-1" style={{ color: "#00d4ff" }}>
                AI AGENTS PROCESSING
              </p>
              <p className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.5)" }}>
                Running {currentPhase} analysis...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
