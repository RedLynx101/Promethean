import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { Library, Search, Zap, ArrowRight, Star } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  domain: string;
  tags: string[];
  rating?: number | null;
  usageCount?: number | null;
  estimatedCostPerRun?: number | null;
  estimatedLatencyMs?: number | null;
  config: {
    steps?: number;
    estimatedCost?: number;
    riskLevel?: string;
    humanGates?: number;
  };
}

const DOMAIN_COLORS: Record<string, string> = {
  "Customer Success": "#00d4ff",
  "Sales": "#ff00aa",
  "Engineering": "#9C27B0",
  "Legal & Compliance": "#FF9800",
  "Security": "#F44336",
  "Data Engineering": "#2196F3",
  "Finance": "#4CAF50",
  "Marketing": "#E91E63",
  "Operations": "#607D8B",
  "HR": "#795548",
};

export default function Templates() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [deploying, setDeploying] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: () => apiFetch("/templates"),
  });

  const deployTemplate = useMutation({
    mutationFn: async (template: Template) => {
      setDeploying(template.id);
      const result = await apiFetch<{ id: string; name: string }>(`/templates/${template.id}/deploy`, {
        method: "POST",
        body: JSON.stringify({ name: template.name }),
      });
      return result;
    },
    onSuccess: (workflow) => {
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      navigate(`/workflow/${workflow.id}`);
    },
    onError: () => setDeploying(null),
  });

  const domains = Array.from(new Set(templates.map((t) => t.domain))).filter(Boolean);

  const filtered = templates.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesDomain = !selectedDomain || t.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  return (
    <div className="min-h-screen p-6" style={{ background: "#0a0e14" }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h1 className="font-orbitron text-2xl font-bold" style={{ color: "#00d4ff" }}>
            TEMPLATE LIBRARY
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(230,237,243,0.5)" }}>
            Pre-configured workflow blueprints ready to deploy
          </p>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="relative flex-1 max-w-md"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(230,237,243,0.3)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={{
              background: "#161b22",
              border: "1px solid rgba(0,212,255,0.2)",
              color: "#e6edf3",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(0,212,255,0.5)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(0,212,255,0.2)")}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedDomain(null)}
            className="px-3 py-1.5 rounded-lg text-xs font-jetbrains transition-all"
            style={{
              background: !selectedDomain ? "rgba(0,212,255,0.15)" : "#161b22",
              border: `1px solid ${!selectedDomain ? "rgba(0,212,255,0.4)" : "rgba(255,255,255,0.08)"}`,
              color: !selectedDomain ? "#00d4ff" : "rgba(230,237,243,0.5)",
            }}
          >
            All
          </button>
          {domains.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDomain(d === selectedDomain ? null : d)}
              className="px-3 py-1.5 rounded-lg text-xs font-jetbrains transition-all"
              style={{
                background: selectedDomain === d ? `${DOMAIN_COLORS[d] ?? "#00d4ff"}20` : "#161b22",
                border: `1px solid ${selectedDomain === d ? `${DOMAIN_COLORS[d] ?? "#00d4ff"}50` : "rgba(255,255,255,0.08)"}`,
                color: selectedDomain === d ? DOMAIN_COLORS[d] ?? "#00d4ff" : "rgba(230,237,243,0.5)",
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)" }}
            >
              <Zap className="w-6 h-6 animate-pulse" style={{ color: "#00d4ff" }} />
            </div>
            <p className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.4)" }}>
              Loading templates...
            </p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Library className="w-12 h-12 mb-4" style={{ color: "rgba(230,237,243,0.2)" }} />
          <p className="font-orbitron text-sm mb-1" style={{ color: "rgba(230,237,243,0.5)" }}>
            No templates found
          </p>
          <p className="text-xs" style={{ color: "rgba(230,237,243,0.3)" }}>
            Try adjusting your search or filter
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((template) => {
            const domainColor = DOMAIN_COLORS[template.domain] ?? "#00d4ff";
            const isDeploying = deploying === template.id && deployTemplate.isPending;
            return (
              <div
                key={template.id}
                className="rounded-xl overflow-hidden transition-all hover:scale-[1.01]"
                style={{
                  background: "#161b22",
                  border: "1px solid rgba(0,212,255,0.12)",
                }}
              >
                {/* Color stripe */}
                <div
                  className="h-1"
                  style={{ background: `linear-gradient(90deg, ${domainColor}, transparent)` }}
                />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-jetbrains uppercase"
                          style={{
                            background: `${domainColor}20`,
                            color: domainColor,
                            border: `1px solid ${domainColor}40`,
                          }}
                        >
                          {template.domain}
                        </span>
                      </div>
                      <h3
                        className="font-medium text-base"
                        style={{ color: "#e6edf3" }}
                      >
                        {template.name}
                      </h3>
                    </div>
                    {/* Star rating */}
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className="w-3 h-3"
                            style={{
                              color: s <= Math.round(template.rating ?? 0) ? "#FF9800" : "rgba(230,237,243,0.15)",
                              fill: s <= Math.round(template.rating ?? 0) ? "#FF9800" : "none",
                            }}
                          />
                        ))}
                      </div>
                      {template.usageCount != null && (
                        <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.35)" }}>
                          {template.usageCount.toLocaleString()} uses
                        </span>
                      )}
                    </div>
                  </div>

                  <p
                    className="text-sm leading-relaxed mb-4"
                    style={{ color: "rgba(230,237,243,0.55)" }}
                  >
                    {template.description}
                  </p>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs font-jetbrains mb-4" style={{ color: "rgba(230,237,243,0.4)" }}>
                    {template.config?.steps != null && (
                      <span>{template.config.steps} steps</span>
                    )}
                    {template.config?.humanGates != null && (
                      <span>{template.config.humanGates} human gates</span>
                    )}
                    {template.config?.riskLevel && (
                      <span
                        style={{
                          color:
                            template.config.riskLevel === "Low"
                              ? "#00ff88"
                              : template.config.riskLevel === "Critical"
                              ? "#F44336"
                              : "#FF9800",
                        }}
                      >
                        {template.config.riskLevel} risk
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {template.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full font-jetbrains"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            color: "rgba(230,237,243,0.4)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Deploy button */}
                  <button
                    onClick={() => deployTemplate.mutate(template)}
                    disabled={isDeploying}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${domainColor}20, ${domainColor}10)`,
                      border: `1px solid ${domainColor}40`,
                      color: domainColor,
                      fontFamily: "'Orbitron', sans-serif",
                      letterSpacing: "0.05em",
                      fontSize: "11px",
                    }}
                  >
                    {isDeploying ? (
                      <>
                        <div
                          className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
                          style={{ borderColor: domainColor }}
                        />
                        DEPLOYING...
                      </>
                    ) : (
                      <>
                        DEPLOY TEMPLATE
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
