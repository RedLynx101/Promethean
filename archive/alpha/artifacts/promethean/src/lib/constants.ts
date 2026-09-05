// Node colors by system level
export const SYSTEM_LEVEL_COLORS: Record<number, string> = {
  0: "#4CAF50", // L0 — Deterministic (green)
  1: "#2196F3", // L1 — Supervised ML (blue)
  2: "#9C27B0", // L2 — Language Understanding (purple)
  3: "#FF9800", // L3 — Single LLM (orange)
  4: "#F44336", // L4 — Tool-Augmented (red)
  5: "#E91E63", // L5 — Multi-Agent (pink)
};

export const SYSTEM_LEVEL_LABELS: Record<number, string> = {
  0: "L0 Deterministic",
  1: "L1 Supervised ML",
  2: "L2 Language",
  3: "L3 LLM Agent",
  4: "L4 Tool-Aug",
  5: "L5 Multi-Agent",
};

export const SYSTEM_LEVEL_DESCRIPTIONS: Record<number, string> = {
  0: "Rule-based, 100% predictable. No AI. Pure if/then/else logic.",
  1: "Trained ML models with narrow, high-accuracy predictions.",
  2: "NLP/NLU for intent, entities, and sentiment. Understands but doesn't generate.",
  3: "Single GPT call for generation, summary, or reasoning.",
  4: "LLM + external tool calls (search, APIs, code execution).",
  5: "Multiple specialized agents collaborating with handoffs.",
};

export const HUMAN_GATE_COLOR = "#607D8B";
export const TRIGGER_COLOR = "#795548";

export const PHASES = [
  { id: "wizard", label: "Intake", step: 0 },
  { id: "decompose", label: "Decompose", step: 1 },
  { id: "select", label: "Select", step: 2 },
  { id: "orchestrate", label: "Orchestrate", step: 3 },
  { id: "govern", label: "Govern", step: 4 },
  { id: "deployed", label: "Deployed", step: 5 },
];

export const STATUS_COLORS: Record<string, string> = {
  active: "#00ff88",
  building: "#00d4ff",
  draft: "#607D8B",
  paused: "#FF9800",
  error: "#F44336",
  deployed: "#00ff88",
};

export const PALETTE = {
  bg: "#0a0e14",
  surface: "#161b22",
  cyan: "#00d4ff",
  magenta: "#ff00aa",
  green: "#00ff88",
  text: "#e6edf3",
};
