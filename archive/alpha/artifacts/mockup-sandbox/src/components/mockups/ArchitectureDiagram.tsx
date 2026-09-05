import { type CSSProperties } from "react";

const COLORS = {
  bg: "#0a0e1a",
  cardBg: "#111827",
  border: "#1e293b",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  accent: "#6366f1",
  accentLight: "#818cf8",
  frontend: "#3b82f6",
  frontendBg: "rgba(59, 130, 246, 0.08)",
  frontendBorder: "rgba(59, 130, 246, 0.25)",
  backend: "#8b5cf6",
  backendBg: "rgba(139, 92, 246, 0.08)",
  backendBorder: "rgba(139, 92, 246, 0.25)",
  pipeline: "#f59e0b",
  pipelineBg: "rgba(245, 158, 11, 0.08)",
  pipelineBorder: "rgba(245, 158, 11, 0.25)",
  shared: "#10b981",
  sharedBg: "rgba(16, 185, 129, 0.08)",
  sharedBorder: "rgba(16, 185, 129, 0.25)",
  infra: "#ef4444",
  infraBg: "rgba(239, 68, 68, 0.08)",
  infraBorder: "rgba(239, 68, 68, 0.25)",
  gate: "#f97316",
  gateBg: "rgba(249, 115, 22, 0.12)",
  gateBorder: "rgba(249, 115, 22, 0.4)",
  arrow: "#475569",
};

const styles: Record<string, CSSProperties> = {
  root: {
    background: COLORS.bg,
    minHeight: "100vh",
    padding: "40px 32px",
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    color: COLORS.text,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    background: `linear-gradient(135deg, ${COLORS.accentLight}, ${COLORS.frontend})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: 400,
  },
  version: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.accent,
    background: "rgba(99, 102, 241, 0.15)",
    padding: "2px 8px",
    borderRadius: 4,
    marginLeft: 10,
    letterSpacing: "0.05em",
  },
  diagram: {
    width: "100%",
    maxWidth: 1100,
    display: "flex",
    flexDirection: "column" as const,
    gap: 0,
    position: "relative" as const,
  },
};

function LayerCard({
  label,
  color,
  bgColor,
  borderColor,
  children,
  style,
}: {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: "20px 24px",
        position: "relative",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -10,
          left: 20,
          background: COLORS.bg,
          padding: "0 8px",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function TechBadge({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10,
        fontWeight: 500,
        color,
        background: `${color}15`,
        border: `1px solid ${color}30`,
        padding: "1px 6px",
        borderRadius: 3,
        marginRight: 4,
        marginTop: 3,
      }}
    >
      {text}
    </span>
  );
}

function ComponentBox({
  title,
  techs,
  color,
  width,
  icon,
}: {
  title: string;
  techs: string[];
  color: string;
  width?: number | string;
  icon?: string;
}) {
  return (
    <div
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: "12px 14px",
        width: width ?? "auto",
        flex: width ? undefined : 1,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.text,
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 2 }}>
        {techs.map((t) => (
          <TechBadge key={t} text={t} color={color} />
        ))}
      </div>
    </div>
  );
}

function FlowArrow({
  direction = "down",
  label,
  color = COLORS.arrow,
}: {
  direction?: "down" | "right";
  label?: string;
  color?: string;
}) {
  if (direction === "right") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 4px",
          flexShrink: 0,
        }}
      >
        <svg width="36" height="20" viewBox="0 0 36 20">
          <defs>
            <marker
              id="arrowRight"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L8,3 L0,6" fill={color} />
            </marker>
          </defs>
          <line
            x1="2"
            y1="10"
            x2="28"
            y2="10"
            stroke={color}
            strokeWidth="1.5"
            markerEnd="url(#arrowRight)"
            strokeDasharray="4,3"
          />
        </svg>
        {label && (
          <span
            style={{
              fontSize: 9,
              color: COLORS.textDim,
              marginLeft: -4,
              whiteSpace: "nowrap" as const,
            }}
          >
            {label}
          </span>
        )}
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        padding: "4px 0",
      }}
    >
      <svg width="20" height="28" viewBox="0 0 20 28">
        <defs>
          <marker
            id="arrowDown"
            markerWidth="8"
            markerHeight="6"
            refX="4"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L4,6 L8,0" fill={color} />
          </marker>
        </defs>
        <line
          x1="10"
          y1="2"
          x2="10"
          y2="20"
          stroke={color}
          strokeWidth="1.5"
          markerEnd="url(#arrowDown)"
          strokeDasharray="4,3"
        />
      </svg>
      {label && (
        <span style={{ fontSize: 9, color: COLORS.textDim, marginTop: -2 }}>
          {label}
        </span>
      )}
    </div>
  );
}

function GateChip({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        flexShrink: 0,
      }}
    >
      <svg width="30" height="20" viewBox="0 0 30 20">
        <defs>
          <marker
            id="gateArrow"
            markerWidth="6"
            markerHeight="4"
            refX="6"
            refY="2"
            orient="auto"
          >
            <path d="M0,0 L6,2 L0,4" fill={COLORS.pipeline} />
          </marker>
        </defs>
        <line
          x1="2"
          y1="10"
          x2="22"
          y2="10"
          stroke={COLORS.pipeline}
          strokeWidth="1.5"
          markerEnd="url(#gateArrow)"
        />
      </svg>
      <div
        style={{
          background: COLORS.gateBg,
          border: `1px dashed ${COLORS.gateBorder}`,
          borderRadius: 4,
          padding: "2px 8px",
          fontSize: 9,
          fontWeight: 600,
          color: COLORS.gate,
          whiteSpace: "nowrap" as const,
          textTransform: "uppercase" as const,
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <svg width="30" height="20" viewBox="0 0 30 20">
        <defs>
          <marker
            id="gateArrow2"
            markerWidth="6"
            markerHeight="4"
            refX="6"
            refY="2"
            orient="auto"
          >
            <path d="M0,0 L6,2 L0,4" fill={COLORS.pipeline} />
          </marker>
        </defs>
        <line
          x1="2"
          y1="10"
          x2="22"
          y2="10"
          stroke={COLORS.pipeline}
          strokeWidth="1.5"
          markerEnd="url(#gateArrow2)"
        />
      </svg>
    </div>
  );
}

function PipelineStage({
  title,
  icon,
  description,
}: {
  title: string;
  icon: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.pipelineBorder}`,
        borderRadius: 8,
        padding: "10px 12px",
        textAlign: "center" as const,
        minWidth: 110,
        flex: 1,
      }}
    >
      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: COLORS.pipeline,
          marginBottom: 2,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 9, color: COLORS.textDim, lineHeight: 1.3 }}>
        {description}
      </div>
    </div>
  );
}

export default function ArchitectureDiagram() {
  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.title}>
          Promethean Studio
          <span style={styles.version}>v0.1.0</span>
        </div>
        <div style={styles.subtitle}>
          Agentic Workflow Automation Platform — System Architecture
        </div>
      </div>

      <div style={styles.diagram}>
        {/* User Entry */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 4,
          }}
        >
          <div
            style={{
              background: "rgba(99, 102, 241, 0.12)",
              border: `1px solid rgba(99, 102, 241, 0.3)`,
              borderRadius: 20,
              padding: "6px 20px",
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.accentLight,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>👤</span>
            User Input
          </div>
        </div>
        <FlowArrow label="HTTP / WebSocket" color={COLORS.frontend} />

        {/* Frontend Layer */}
        <LayerCard
          label="Frontend — React PWA"
          color={COLORS.frontend}
          bgColor={COLORS.frontendBg}
          borderColor={COLORS.frontendBorder}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 8,
            }}
          >
            <ComponentBox
              title="Workflow Wizard"
              techs={["React", "TanStack Form", "Zod"]}
              color={COLORS.frontend}
              icon="🧙"
            />
            <ComponentBox
              title="React Flow Graph Editor"
              techs={["React Flow", "Custom Nodes"]}
              color={COLORS.frontend}
              icon="🔀"
            />
            <ComponentBox
              title="Command Center Dashboard"
              techs={["TanStack Query", "Recharts"]}
              color={COLORS.frontend}
              icon="📊"
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              marginTop: 10,
              flexWrap: "wrap" as const,
            }}
          >
            <TechBadge text="Vite" color={COLORS.frontend} />
            <TechBadge text="TypeScript" color={COLORS.frontend} />
            <TechBadge text="TailwindCSS" color={COLORS.frontend} />
            <TechBadge text="Wouter" color={COLORS.frontend} />
            <TechBadge text="Service Worker" color={COLORS.frontend} />
          </div>
        </LayerCard>

        <FlowArrow label="REST API (JSON)" color={COLORS.accent} />

        {/* Backend Layer */}
        <LayerCard
          label="Backend — Express API Server"
          color={COLORS.backend}
          bgColor={COLORS.backendBg}
          borderColor={COLORS.backendBorder}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 8,
            }}
          >
            <ComponentBox
              title="Route Handlers"
              techs={["Express", "CORS", "Helmet"]}
              color={COLORS.backend}
              icon="🛣️"
            />
            <ComponentBox
              title="Workflow Engine"
              techs={["State Machine", "Event Queue"]}
              color={COLORS.backend}
              icon="⚙️"
            />
            <ComponentBox
              title="Auth & Middleware"
              techs={["Sessions", "Validation"]}
              color={COLORS.backend}
              icon="🔒"
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              marginTop: 10,
              flexWrap: "wrap" as const,
            }}
          >
            <TechBadge text="Node.js" color={COLORS.backend} />
            <TechBadge text="TypeScript" color={COLORS.backend} />
            <TechBadge text="Zod Validation" color={COLORS.backend} />
          </div>
        </LayerCard>

        <FlowArrow label="Pipeline Trigger" color={COLORS.pipeline} />

        {/* Agentic Pipeline Layer */}
        <LayerCard
          label="4-Stage Agentic Pipeline"
          color={COLORS.pipeline}
          bgColor={COLORS.pipelineBg}
          borderColor={COLORS.pipelineBorder}
          style={{ padding: "24px 20px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              marginTop: 8,
              flexWrap: "nowrap" as const,
            }}
          >
            <PipelineStage
              title="Decomposition"
              icon="🧩"
              description="Break workflow into atomic tasks"
            />
            <GateChip label="HITL Review" />
            <PipelineStage
              title="System Selection"
              icon="🎯"
              description="Map tasks to target systems"
            />
            <GateChip label="HITL Review" />
            <PipelineStage
              title="Orchestration"
              icon="🎼"
              description="Execute & coordinate actions"
            />
            <GateChip label="HITL Review" />
            <PipelineStage
              title="Governance"
              icon="🛡️"
              description="Audit, compliance & rollback"
            />
          </div>
          <div
            style={{
              textAlign: "center" as const,
              marginTop: 12,
              fontSize: 10,
              color: COLORS.gate,
              fontWeight: 500,
            }}
          >
            HITL = Human-in-the-Loop Review Gate — requires approval before
            proceeding
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              marginTop: 8,
              flexWrap: "wrap" as const,
            }}
          >
            <TechBadge text="OpenAI GPT" color={COLORS.pipeline} />
            <TechBadge text="AI Agents" color={COLORS.pipeline} />
            <TechBadge text="Prompt Templates" color={COLORS.pipeline} />
          </div>
        </LayerCard>

        <FlowArrow label="Read / Write" color={COLORS.shared} />

        {/* Shared Libraries Layer */}
        <LayerCard
          label="Shared Libraries"
          color={COLORS.shared}
          bgColor={COLORS.sharedBg}
          borderColor={COLORS.sharedBorder}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 8,
            }}
          >
            <ComponentBox
              title="@workspace/db"
              techs={["Drizzle ORM", "Schema", "Migrations"]}
              color={COLORS.shared}
              icon="🗄️"
            />
            <ComponentBox
              title="@workspace/api-zod"
              techs={["Zod Schemas", "API Contracts"]}
              color={COLORS.shared}
              icon="📋"
            />
            <ComponentBox
              title="@workspace/api-client-react"
              techs={["TanStack Query", "Typed Hooks"]}
              color={COLORS.shared}
              icon="🔗"
            />
            <ComponentBox
              title="@workspace/integrations"
              techs={["OpenAI", "External APIs"]}
              color={COLORS.shared}
              icon="🔌"
            />
          </div>
        </LayerCard>

        <FlowArrow label="Drizzle ORM / SDK" color={COLORS.infra} />

        {/* Infrastructure Layer */}
        <LayerCard
          label="Infrastructure"
          color={COLORS.infra}
          bgColor={COLORS.infraBg}
          borderColor={COLORS.infraBorder}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 8,
            }}
          >
            <ComponentBox
              title="PostgreSQL"
              techs={["Replit DB", "Drizzle ORM", "Migrations"]}
              color={COLORS.infra}
              icon="🐘"
            />
            <ComponentBox
              title="OpenAI Integration"
              techs={["GPT-4o", "Chat Completions", "Structured Output"]}
              color={COLORS.infra}
              icon="🤖"
            />
            <ComponentBox
              title="Monitoring & Logs"
              techs={["Error Tracking", "Audit Trail"]}
              color={COLORS.infra}
              icon="📈"
            />
          </div>
        </LayerCard>

        {/* Data Flow Legend */}
        <div
          style={{
            marginTop: 32,
            padding: "16px 24px",
            background: "rgba(30, 41, 59, 0.4)",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: COLORS.textMuted,
              textTransform: "uppercase" as const,
              letterSpacing: "0.1em",
              marginBottom: 12,
            }}
          >
            Data Flow Summary
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap" as const,
            }}
          >
            {[
              { label: "User", color: COLORS.accentLight },
              { label: "Frontend PWA", color: COLORS.frontend },
              { label: "API Server", color: COLORS.backend },
              { label: "Pipeline Agents", color: COLORS.pipeline },
              { label: "Database", color: COLORS.infra },
              { label: "Dashboard", color: COLORS.frontend },
            ].map((item, i, arr) => (
              <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: item.color,
                    background: `${item.color}15`,
                    padding: "3px 10px",
                    borderRadius: 4,
                    border: `1px solid ${item.color}30`,
                  }}
                >
                  {item.label}
                </span>
                {i < arr.length - 1 && (
                  <svg width="20" height="12" viewBox="0 0 20 12">
                    <line
                      x1="0"
                      y1="6"
                      x2="14"
                      y2="6"
                      stroke={COLORS.textDim}
                      strokeWidth="1.5"
                    />
                    <path d="M12,2 L18,6 L12,10" fill={COLORS.textDim} />
                  </svg>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Tech Stack Footer */}
        <div
          style={{
            marginTop: 16,
            textAlign: "center" as const,
            fontSize: 10,
            color: COLORS.textDim,
          }}
        >
          Promethean Studio v0.1.0 — Built with React, Express, PostgreSQL,
          OpenAI GPT, and Drizzle ORM
        </div>
      </div>
    </div>
  );
}
