// Topological auto-layout for Promethean workflow graphs.
//
// Replaces whatever positions the LLM emitted with a deterministic
// left-to-right layered layout so nodes never overlap.
//
// Algorithm:
//   1. Build an adjacency list (and reverse list) from edges.
//   2. Assign each node a depth = longest path from any root (Kahn-style
//      topo sort). Nodes in cycles fall back to depth 0.
//   3. Group nodes by depth → columns.
//   4. Within each column, order nodes by the average row of their
//      predecessors in the previous column (stable, reduces edge crossings).
//   5. Place nodes at (depth * COL_WIDTH, row * ROW_HEIGHT) plus a
//      vertical offset so each column is centered around the global mid-row.

interface NodeLike {
  id: string;
  position?: { x: number; y: number };
  data?: { nodeCategory?: string | null } & Record<string, unknown>;
}

interface EdgeLike {
  source: string;
  target: string;
}

interface LayoutOptions {
  colWidth?: number;   // horizontal gap between columns
  rowHeight?: number;  // vertical gap between rows
  startX?: number;
  startY?: number;
}

const DEFAULT_OPTS: Required<LayoutOptions> = {
  colWidth: 360,
  rowHeight: 160,
  startX: 60,
  startY: 60,
};

export function layoutNodes<N extends NodeLike, E extends EdgeLike>(
  nodes: N[],
  edges: E[],
  opts: LayoutOptions = {},
): N[] {
  const { colWidth, rowHeight, startX, startY } = { ...DEFAULT_OPTS, ...opts };

  if (nodes.length === 0) return nodes;

  const nodeIds = new Set(nodes.map((n) => n.id));
  const cleanEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  // Adjacency lists
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const id of nodeIds) {
    outgoing.set(id, []);
    incoming.set(id, []);
  }
  for (const e of cleanEdges) {
    outgoing.get(e.source)!.push(e.target);
    incoming.get(e.target)!.push(e.source);
  }

  // Longest-path depth via memoization with cycle guard
  const depth = new Map<string, number>();
  const visiting = new Set<string>();

  function computeDepth(id: string): number {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0; // cycle: bail
    visiting.add(id);
    const preds = incoming.get(id) ?? [];
    let d = 0;
    for (const p of preds) {
      d = Math.max(d, computeDepth(p) + 1);
    }
    visiting.delete(id);
    depth.set(id, d);
    return d;
  }
  for (const n of nodes) computeDepth(n.id);

  // Group by depth
  const byDepth = new Map<number, N[]>();
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(n);
  }

  const sortedDepths = Array.from(byDepth.keys()).sort((a, b) => a - b);

  // Order within each column by average row of predecessors (barycenter)
  const rowOf = new Map<string, number>();
  for (const d of sortedDepths) {
    const cohort = byDepth.get(d)!;
    if (d === 0) {
      // Roots: keep original order, with trigger-category nodes pinned first
      cohort.sort((a, b) => {
        const ta = a.data?.nodeCategory === "trigger" ? -1 : 0;
        const tb = b.data?.nodeCategory === "trigger" ? -1 : 0;
        if (ta !== tb) return ta - tb;
        return nodes.indexOf(a) - nodes.indexOf(b);
      });
    } else {
      cohort.sort((a, b) => {
        const aPredRows = (incoming.get(a.id) ?? [])
          .map((p) => rowOf.get(p))
          .filter((r): r is number => r !== undefined);
        const bPredRows = (incoming.get(b.id) ?? [])
          .map((p) => rowOf.get(p))
          .filter((r): r is number => r !== undefined);
        const aBary = aPredRows.length > 0 ? aPredRows.reduce((s, r) => s + r, 0) / aPredRows.length : nodes.indexOf(a);
        const bBary = bPredRows.length > 0 ? bPredRows.reduce((s, r) => s + r, 0) / bPredRows.length : nodes.indexOf(b);
        if (aBary !== bBary) return aBary - bBary;
        return nodes.indexOf(a) - nodes.indexOf(b);
      });
    }
    cohort.forEach((n, idx) => rowOf.set(n.id, idx));
  }

  // Compute global vertical center so each column is centered around the
  // tallest column's midpoint (looks nicer than top-aligned).
  const maxRows = Math.max(...Array.from(byDepth.values()).map((c) => c.length));
  const midY = ((maxRows - 1) * rowHeight) / 2;

  return nodes.map((n) => {
    const d = depth.get(n.id) ?? 0;
    const cohort = byDepth.get(d)!;
    const idx = cohort.indexOf(n);
    const colMid = ((cohort.length - 1) * rowHeight) / 2;
    const yOffset = midY - colMid;
    return {
      ...n,
      position: {
        x: startX + d * colWidth,
        y: startY + yOffset + idx * rowHeight,
      },
    };
  });
}
