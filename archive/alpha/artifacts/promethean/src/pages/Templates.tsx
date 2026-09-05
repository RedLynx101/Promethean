import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/api";
import { Library, Search, Zap, ArrowRight, Star, Plus, Trash2, Pencil, X } from "lucide-react";

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

interface TemplateFormState {
  name: string;
  description: string;
  domain: string;
  tags: string;
  isPublic: boolean;
}

const BLANK_FORM: TemplateFormState = { name: "", description: "", domain: "", tags: "", isPublic: true };

export default function Templates() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [form, setForm] = useState<TemplateFormState>(BLANK_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const createTemplate = useMutation({
    mutationFn: () =>
      apiFetch("/templates", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          domain: form.domain || null,
          tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
          isPublic: form.isPublic,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      setShowForm(false);
      setForm(BLANK_FORM);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: () =>
      apiFetch(`/templates/${editTarget!.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          domain: form.domain || null,
          tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
          isPublic: form.isPublic,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      setShowForm(false);
      setEditTarget(null);
      setForm(BLANK_FORM);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => apiFetch(`/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      setDeleteConfirm(null);
    },
  });

  function openCreate() {
    setEditTarget(null);
    setForm(BLANK_FORM);
    setShowForm(true);
  }

  function openEdit(t: Template) {
    setEditTarget(t);
    setForm({
      name: t.name,
      description: t.description ?? "",
      domain: t.domain ?? "",
      tags: (t.tags ?? []).join(", "),
      isPublic: true,
    });
    setShowForm(true);
  }

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
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-orbitron text-2xl font-bold" style={{ color: "#00d4ff" }}>
            TEMPLATE LIBRARY
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(230,237,243,0.5)" }}>
            Pre-configured workflow blueprints ready to deploy
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
          style={{
            background: "rgba(0,212,255,0.12)",
            border: "1px solid rgba(0,212,255,0.35)",
            color: "#00d4ff",
            fontFamily: "'Orbitron', sans-serif",
          }}
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditTarget(null); } }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "#161b22", border: "1px solid rgba(0,212,255,0.25)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-orbitron text-sm font-bold tracking-wider" style={{ color: "#00d4ff" }}>
                {editTarget ? "EDIT TEMPLATE" : "NEW TEMPLATE"}
              </h2>
              <button onClick={() => { setShowForm(false); setEditTarget(null); }}>
                <X className="w-4 h-4" style={{ color: "rgba(230,237,243,0.4)" }} />
              </button>
            </div>
            <div className="space-y-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.5)" }}>Name *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Template name..."
                  className="px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "#0a0e14", border: "1px solid rgba(0,212,255,0.2)", color: "#e6edf3" }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.5)" }}>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description..."
                  rows={2}
                  className="px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{ background: "#0a0e14", border: "1px solid rgba(0,212,255,0.2)", color: "#e6edf3" }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.5)" }}>Domain</span>
                <input
                  type="text"
                  value={form.domain}
                  onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                  placeholder="e.g. Engineering, Finance..."
                  className="px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "#0a0e14", border: "1px solid rgba(0,212,255,0.2)", color: "#e6edf3" }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-jetbrains" style={{ color: "rgba(230,237,243,0.5)" }}>Tags (comma-separated)</span>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="ai, automation, data..."
                  className="px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "#0a0e14", border: "1px solid rgba(0,212,255,0.2)", color: "#e6edf3" }}
                />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
                  className="w-4 h-4 accent-cyan-400"
                />
                <span className="text-sm" style={{ color: "rgba(230,237,243,0.6)" }}>Public template</span>
              </label>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => { setShowForm(false); setEditTarget(null); }}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: "rgba(230,237,243,0.4)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => editTarget ? updateTemplate.mutate() : createTemplate.mutate()}
                disabled={!form.name.trim() || createTemplate.isPending || updateTemplate.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "rgba(0,212,255,0.15)",
                  border: "1px solid rgba(0,212,255,0.4)",
                  color: "#00d4ff",
                }}
              >
                {editTarget ? "Save Changes" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}

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

                  {/* Delete confirmation inline */}
                  {deleteConfirm === template.id && (
                    <div
                      className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
                      style={{ background: "rgba(244,67,54,0.08)", border: "1px solid rgba(244,67,54,0.25)" }}
                    >
                      <span className="text-xs flex-1" style={{ color: "rgba(230,237,243,0.7)" }}>
                        Delete this template permanently?
                      </span>
                      <button
                        onClick={() => deleteTemplate.mutate(template.id)}
                        disabled={deleteTemplate.isPending}
                        className="text-xs px-2 py-1 rounded font-jetbrains"
                        style={{ background: "rgba(244,67,54,0.2)", color: "#F44336" }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs px-2 py-1 rounded font-jetbrains"
                        style={{ color: "rgba(230,237,243,0.4)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Deploy + Edit/Delete row */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => deployTemplate.mutate(template)}
                      disabled={isDeploying}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
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
                          DEPLOY
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(template)}
                      className="p-2.5 rounded-lg transition-all hover:opacity-80"
                      title="Edit template"
                      style={{ background: "rgba(0,212,255,0.07)", border: "1px solid rgba(0,212,255,0.15)", color: "#00d4ff" }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(template.id === deleteConfirm ? null : template.id)}
                      className="p-2.5 rounded-lg transition-all hover:opacity-80"
                      title="Delete template"
                      style={{ background: "rgba(244,67,54,0.07)", border: "1px solid rgba(244,67,54,0.15)", color: "#F44336" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
