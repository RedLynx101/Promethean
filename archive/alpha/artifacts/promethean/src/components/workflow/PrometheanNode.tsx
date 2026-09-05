import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { SYSTEM_LEVEL_COLORS, SYSTEM_LEVEL_LABELS, HUMAN_GATE_COLOR, TRIGGER_COLOR } from "@/lib/constants";
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface NodeData {
  label: string;
  description: string;
  systemLevel?: number | null;
  confidence?: number | null;
  rationale?: string | null;
  tools?: string[];
  status?: string;
  conditions?: string[];
  errorHandling?: string;
  nodeCategory?: string;
}

function getNodeColor(data: NodeData): string {
  if (data.nodeCategory === "trigger") return TRIGGER_COLOR;
  if (data.nodeCategory === "human_gate") return HUMAN_GATE_COLOR;
  if (data.systemLevel != null) return SYSTEM_LEVEL_COLORS[data.systemLevel] ?? "#607D8B";
  return "#607D8B";
}

function ConfidenceBadge({ value }: { value: number }) {
  const color = value >= 80 ? "#00ff88" : value >= 60 ? "#FF9800" : "#F44336";
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded font-jetbrains"
      style={{
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {value}%
    </span>
  );
}

function StatusIcon({ status }: { status?: string }) {
  if (status === "running")
    return <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#00d4ff" }} />;
  if (status === "success")
    return <CheckCircle2 className="w-3 h-3" style={{ color: "#00ff88" }} />;
  if (status === "error")
    return <AlertTriangle className="w-3 h-3" style={{ color: "#F44336" }} />;
  return null;
}

const PrometheanNode = memo(({ data, selected }: NodeProps & { data: NodeData }) => {
  const [expanded, setExpanded] = useState(false);
  const nodeColor = getNodeColor(data);

  return (
    <div
      className="relative rounded-xl overflow-hidden min-w-[200px] max-w-[260px] transition-all"
      style={{
        background: "#161b22",
        border: `2px solid ${selected ? nodeColor : `${nodeColor}40`}`,
        boxShadow: selected ? `0 0 20px ${nodeColor}40` : `0 0 10px ${nodeColor}20`,
      }}
    >
      {/* Level color stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: nodeColor }}
      />

      {/* Header */}
      <div className="pl-4 pr-3 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <StatusIcon status={data.status} />
              <h3
                className="text-sm font-medium truncate"
                style={{ color: "#e6edf3" }}
              >
                {data.label}
              </h3>
            </div>
            <p
              className="text-xs line-clamp-2"
              style={{ color: "rgba(230,237,243,0.5)" }}
            >
              {data.description}
            </p>
          </div>
        </div>

        {/* System level + confidence */}
        {data.systemLevel != null && (
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-jetbrains font-medium"
              style={{
                background: `${nodeColor}20`,
                color: nodeColor,
                border: `1px solid ${nodeColor}40`,
              }}
            >
              {SYSTEM_LEVEL_LABELS[data.systemLevel] ?? `L${data.systemLevel}`}
            </span>
            {data.confidence != null && <ConfidenceBadge value={data.confidence} />}
          </div>
        )}

        {/* Tools */}
        {data.tools && data.tools.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {data.tools.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-xs px-1.5 py-0.5 rounded font-jetbrains"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(230,237,243,0.4)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {t}
              </span>
            ))}
            {data.tools.length > 3 && (
              <span className="text-xs" style={{ color: "rgba(230,237,243,0.3)" }}>
                +{data.tools.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Expand button */}
        {(data.rationale || data.errorHandling) && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-xs mt-2 transition-opacity hover:opacity-80"
            style={{ color: "rgba(230,237,243,0.3)" }}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Collapse" : "Expand"}
          </button>
        )}
      </div>

      {/* Expanded rationale */}
      {expanded && (
        <div
          className="px-4 pb-3 text-xs font-jetbrains border-t"
          style={{ borderColor: "rgba(255,255,255,0.05)", color: "rgba(230,237,243,0.6)" }}
        >
          {data.rationale && (
            <div className="mt-2">
              <span style={{ color: nodeColor }}>Rationale: </span>
              <span>{data.rationale}</span>
            </div>
          )}
          {data.errorHandling && (
            <div className="mt-1">
              <span style={{ color: "#FF9800" }}>Error handling: </span>
              <span>{data.errorHandling}</span>
            </div>
          )}
        </div>
      )}

      {/* Handles */}
      <Handle type="target" position={Position.Left} style={{ background: nodeColor, border: "2px solid #0a0e14", width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} style={{ background: nodeColor, border: "2px solid #0a0e14", width: 10, height: 10 }} />
    </div>
  );
});

PrometheanNode.displayName = "PrometheanNode";

export default PrometheanNode;
