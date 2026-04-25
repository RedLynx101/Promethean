#!/usr/bin/env python3
"""Compute baseline comparison (Promethean vs Always-L0 / L4 / L5) for the
9 CRM runs (3 variants x 3 runs) produced by run_crm_baseline.sh.

Emits:
  phase-3/evidence/baseline_comparison_crm.csv

Design:
  - Per-level unit-cost table mirrors the constants used by the selection
    agent (see artifacts/api-server/src/lib/agents/systemSelection.ts).
    Same values as phase-3/scripts/compute_metrics.py so the two outputs
    are comparable.
  - Baselines are computed *from* Promethean's final node count by
    overwriting every node's systemLevel with 0, 4, or 5 and re-applying
    the cost formula.
  - Agent-4 variance fields (logging level, alert-channel count, cost
    threshold, extra governance gates) are carried through as their own
    columns so the V2 run-3 outlier (cost $0.082 vs $0.045) can be
    explained as Agent-4 overhead, not Agent-2 variance.
"""
from __future__ import annotations

import csv
import json
import os
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TRACES = REPO_ROOT / "phase-3" / "traces"
OUT_CSV = REPO_ROOT / "phase-3" / "evidence" / "baseline_comparison_crm.csv"

# Per-level unit cost estimate per node per run, in USD.
# Same table as phase-3/scripts/compute_metrics.py.
COST_PER_LEVEL: dict[int, float] = {
    0: 0.0001,
    1: 0.001,
    2: 0.002,
    3: 0.01,
    4: 0.025,
    5: 0.05,
}

# Map each run folder to its (variant, run_index).
RUNS: list[tuple[str, str, int]] = [
    # folder,         variant, run_index
    ("tc-01",         "V1", 1),
    ("tc-01-r2",      "V1", 2),
    ("tc-01-r3",      "V1", 3),
    ("tc-01-v2",      "V2", 1),
    ("tc-01-v2-r2",   "V2", 2),
    ("tc-01-v2-r3",   "V2", 3),
    ("tc-01-v3",      "V3", 1),
    ("tc-01-v3-r2",   "V3", 2),
    ("tc-01-v3-r3",   "V3", 3),
]

VARIANT_LABEL: dict[str, str] = {
    "V1": "Lead Qualification",
    "V2": "Customer Churn Prevention",
    "V3": "Sales Opportunity Progression",
}


def load_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text())
    except Exception:
        return None


def read_timings(tc_dir: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    f = tc_dir / "timings.txt"
    if not f.exists():
        return out
    for line in f.read_text().splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def is_governance_gate(label: str) -> bool:
    l = (label or "").lower()
    return any(
        phrase in l
        for phrase in (
            "human review",
            "review gate",
            "governance checkpoint",
            "governance gate",
            "human gate",
            "approval gate",
        )
    )


def row_for(folder: str, variant: str, run_idx: int) -> dict[str, object]:
    tc_dir = TRACES / folder
    final = load_json(tc_dir / "03_final_state.json") or {}
    wf = final.get("workflow", {}) or {}
    nodes = wf.get("nodes", []) or []
    timings = read_timings(tc_dir)

    # Level histogram. Agent-4 governance gates carry no systemLevel,
    # so they land in the `None` bucket and are NOT counted in L0-L5.
    levels = Counter(
        (n.get("data") or {}).get("systemLevel") for n in nodes
    )
    n_count = len(nodes)
    agent2_classified = sum(1 for n in nodes if (n.get("data") or {}).get("systemLevel") is not None)
    agent4_injected_gates = n_count - agent2_classified

    # Promethean cost / latency (spec-level estimate from the agent)
    promethean_cost = wf.get("estimatedCostPerRun")
    promethean_latency_est = wf.get("estimatedLatencyMs")

    # Wall-clock latency of the 4 agents (from timings.txt)
    wall_clock_ms = sum(
        int(v)
        for k, v in timings.items()
        if k.endswith("_ms") and v.isdigit()
    )

    # Baseline costs: sum(cost_per_level[L] * 1) over all nodes.
    baseline_L0 = round(n_count * COST_PER_LEVEL[0], 4)
    baseline_L4 = round(n_count * COST_PER_LEVEL[4], 4)
    baseline_L5 = round(n_count * COST_PER_LEVEL[5], 4)

    # Baseline infeasibility: for Always-L0, count how many nodes Promethean
    # rated at L2+ (nodes whose task type requires inference/generation
    # and cannot be performed at L0).
    baseline_L0_infeasible = sum(
        1
        for n in nodes
        if ((n.get("data") or {}).get("systemLevel") or 0) >= 2
    )

    # Agent-4 (Governance) variance fields
    gov = wf.get("governanceConfig", {}) or {}
    alert_channels = gov.get("alertChannels") or []
    human_gate_count = sum(
        1
        for n in nodes
        if is_governance_gate((n.get("data") or {}).get("label") or "")
    )

    return {
        "run_id": folder,
        "variant": variant,
        "variant_label": VARIANT_LABEL.get(variant, variant),
        "run_index": run_idx,
        "phase_reached": wf.get("phase", "unknown"),
        "node_count": n_count,
        "agent2_classified_count": agent2_classified,
        "agent4_injected_gate_count": agent4_injected_gates,
        "L0_count": levels.get(0, 0),
        "L1_count": levels.get(1, 0),
        "L2_count": levels.get(2, 0),
        "L3_count": levels.get(3, 0),
        "L4_count": levels.get(4, 0),
        "L5_count": levels.get(5, 0),
        "promethean_cost_usd": promethean_cost if promethean_cost is not None else "",
        "promethean_latency_est_ms": promethean_latency_est if promethean_latency_est is not None else "",
        "wall_clock_latency_ms": wall_clock_ms if wall_clock_ms else "",
        "baseline_L0_cost_usd": baseline_L0,
        "baseline_L4_cost_usd": baseline_L4,
        "baseline_L5_cost_usd": baseline_L5,
        "baseline_L0_infeasible_nodes": baseline_L0_infeasible,
        "cost_vs_L0_ratio": (
            round(promethean_cost / baseline_L0, 2)
            if promethean_cost and baseline_L0 > 0
            else ""
        ),
        "cost_vs_L4_ratio": (
            round(promethean_cost / baseline_L4, 3)
            if promethean_cost and baseline_L4 > 0
            else ""
        ),
        "cost_vs_L5_ratio": (
            round(promethean_cost / baseline_L5, 3)
            if promethean_cost and baseline_L5 > 0
            else ""
        ),
        "agent4_logging_level": gov.get("loggingLevel", ""),
        "agent4_alert_channel_count": len(alert_channels),
        "agent4_cost_threshold_usd": gov.get("costThreshold", ""),
        "agent4_human_gate_count": human_gate_count,
    }


FIELDS = [
    "run_id",
    "variant",
    "variant_label",
    "run_index",
    "phase_reached",
    "node_count",
    "agent2_classified_count",
    "agent4_injected_gate_count",
    "L0_count",
    "L1_count",
    "L2_count",
    "L3_count",
    "L4_count",
    "L5_count",
    "promethean_cost_usd",
    "promethean_latency_est_ms",
    "wall_clock_latency_ms",
    "baseline_L0_cost_usd",
    "baseline_L4_cost_usd",
    "baseline_L5_cost_usd",
    "baseline_L0_infeasible_nodes",
    "cost_vs_L0_ratio",
    "cost_vs_L4_ratio",
    "cost_vs_L5_ratio",
    "agent4_logging_level",
    "agent4_alert_channel_count",
    "agent4_cost_threshold_usd",
    "agent4_human_gate_count",
]


def main() -> int:
    rows: list[dict[str, object]] = []
    for folder, variant, run_idx in RUNS:
        if not (TRACES / folder / "03_final_state.json").exists():
            print(f"  SKIP {folder} (no 03_final_state.json)", file=sys.stderr)
            continue
        rows.append(row_for(folder, variant, run_idx))

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS)
        w.writeheader()
        for r in rows:
            w.writerow(r)

    print(f"wrote {len(rows)} rows to {OUT_CSV.relative_to(REPO_ROOT)}")
    print()
    print(f"{'run_id':<14} {'var':<4} {'n':>3} {'prom$':>7} {'L0$':>7} {'L4$':>7} {'L5$':>7} {'L0_infeas':>9} {'gov_gate':>8}")
    print("-" * 80)
    for r in rows:
        print(
            f"{r['run_id']:<14} "
            f"{r['variant']:<4} "
            f"{r['node_count']:>3} "
            f"${r['promethean_cost_usd']:>6} "
            f"${r['baseline_L0_cost_usd']:>6} "
            f"${r['baseline_L4_cost_usd']:>6} "
            f"${r['baseline_L5_cost_usd']:>6} "
            f"{r['baseline_L0_infeasible_nodes']:>9} "
            f"{r['agent4_human_gate_count']:>8}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
