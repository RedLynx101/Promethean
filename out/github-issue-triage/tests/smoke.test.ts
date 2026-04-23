/**
 * Smoke test — exercises each of the three main paths end-to-end:
 *   1. Bug → parallel fan-out → post-comment → end.
 *   2. Security → HumanGate approve → parallel + page → post-comment → end.
 *   3. Security → HumanGate reject → terminate without label/assign/draft.
 *
 * All external calls stubbed (LIVE unset). HumanGate shortcircuited via
 * GATE_TEST_MODE. No network, no filesystem writes beyond snapshots.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { runWorkflow } from "../src/workflow.js";

function bugPayload() {
  return {
    action: "opened",
    issue: {
      number: 101,
      title: "App crashes on logout",
      body: "Reproducible every time: click Logout, get 500 error and a stacktrace.",
      user: { login: "reporter-alice" },
      labels: [],
    },
    repository: { full_name: "acme/webapp" },
  };
}

function securityPayload() {
  return {
    action: "opened",
    issue: {
      number: 202,
      title: "Possible auth bypass via cookie",
      body: "I can see other users' dashboards by swapping the session cookie — looks like an auth bypass / credential leak.",
      user: { login: "reporter-bob" },
      labels: [],
    },
    repository: { full_name: "acme/webapp" },
  };
}

describe("github-issue-triage workflow", () => {
  beforeEach(() => {
    // Snapshot into a test-scoped dir so the tests are hermetic.
    process.env.SNAPSHOT_DIR = "./snapshots/test";
    process.env.GATE_SIGNAL_DIR = "./gate-signals/test";
  });

  it("routes a bug through the non-security parallel path", async () => {
    delete process.env.GATE_TEST_MODE;
    const r = await runWorkflow(bugPayload(), { executionId: "test-bug-1" });

    expect(r.state.classification?.severity).toBe("bug");
    expect(r.flags.labeled).toBe(true);
    expect(r.state.labels).toEqual(["type:bug"]);
    expect(r.flags.assigned).toBe(true);
    expect(r.state.assignedTeam).toBe("@org/eng-triage");
    expect(r.flags.drafted).toBe(true);
    expect(r.flags.commented).toBe(true);
    expect(r.flags.paged).toBe(false);
    expect(r.flags.fallbackTaken).toBe(false);
    expect(r.state.accumulated.costUsd).toBeCloseTo(0.0105, 4); // 0.0005 L2 + 0.01 L3
    expect(r.state.accumulated.costUsd).toBeLessThan(0.5); // under cap
  });

  it("security path with approval: labels + assign + draft + page + comment", async () => {
    process.env.GATE_TEST_MODE = "approve";
    const r = await runWorkflow(securityPayload(), {
      executionId: "test-sec-approve-1",
    });

    expect(r.state.classification?.severity).toBe("security");
    expect(r.state.gate?.approved).toBe(true);
    expect(r.flags.labeled).toBe(true);
    expect(r.state.labels).toEqual(["type:security"]);
    expect(r.flags.assigned).toBe(true);
    expect(r.state.assignedTeam).toBe("@org/security-team");
    expect(r.flags.drafted).toBe(true);
    expect(r.flags.paged).toBe(true);
    expect(r.flags.commented).toBe(true);
    expect(r.flags.gateApproved).toBe(true);
  });

  it("security path with rejection: terminates without side-effects", async () => {
    process.env.GATE_TEST_MODE = "reject:looks like a bug report miscategorised";
    const r = await runWorkflow(securityPayload(), {
      executionId: "test-sec-reject-1",
    });

    expect(r.state.classification?.severity).toBe("security");
    expect(r.state.gate?.approved).toBe(false);
    expect(r.state.gate?.feedback).toContain("miscategorised");
    expect(r.flags.labeled).toBe(false);
    expect(r.flags.assigned).toBe(false);
    expect(r.flags.paged).toBe(false);
    expect(r.flags.commented).toBe(false);
  });

  it("governance: cost is tracked and stays under limit on a normal run", async () => {
    delete process.env.GATE_TEST_MODE;
    const r = await runWorkflow(bugPayload(), {
      executionId: "test-cost-tracking-1",
    });
    expect(r.state.accumulated.costUsd).toBeGreaterThan(0);
    expect(r.state.accumulated.costUsd).toBeLessThan(0.5);
    const nodes = r.state.accumulated.steps.map((s) => s.nodeId);
    expect(nodes).toContain("validate-1");
    expect(nodes).toContain("classify-1");
    expect(nodes).toContain("post-comment-1");
    expect(nodes).toContain("end-1");
  });
});
