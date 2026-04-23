/**
 * security-gate-1 — HumanGate. Pauses the security branch for human approval.
 *
 * Per vault/patterns/pattern-human-gate.md: writes a proposal file, blocks
 * until the file is renamed to `approved/` or `rejected/`. Real
 * deployments would wire a Slack approval-button → webhook instead.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { GateDecisionSchema, type GateDecision } from "../schemas.js";
import type { WorkflowState } from "../state.js";

/**
 * Block until a decision arrives. In scaffold mode, the test harness can
 * set GATE_TEST_MODE=approve or =reject:<feedback> to short-circuit.
 */
export async function securityGate(
  state: WorkflowState
): Promise<Partial<WorkflowState>> {
  if (!state.issue || !state.classification) {
    throw new Error("securityGate requires issue + classification");
  }

  // Env read at call time so tests can set it per-test.
  const testMode = process.env.GATE_TEST_MODE ?? null;
  const gateSignalDir = process.env.gateSignalDir ?? "./gate-signals";

  // Test-mode short-circuit for hermetic tests.
  if (testMode === "approve") {
    return {
      gate: GateDecisionSchema.parse({
        approved: true,
        reviewer: "test-reviewer",
      }),
    };
  }
  if (testMode?.startsWith("reject")) {
    const feedback = testMode.split(":").slice(1).join(":") || "test reject";
    return {
      gate: GateDecisionSchema.parse({ approved: false, feedback }),
    };
  }

  await fs.mkdir(gateSignalDir, { recursive: true });
  const proposalPath = path.join(
    gateSignalDir,
    `${state.executionId}.proposal.json`
  );
  await fs.writeFile(
    proposalPath,
    JSON.stringify(
      {
        executionId: state.executionId,
        issue: state.issue,
        classification: state.classification,
        suggestedLabels: ["type:security"],
        suggestedTeam: "@org/security-team",
        suggestedDraft: state.draft?.body ?? null,
        note:
          "Rename this file to <executionId>.approved.json OR <executionId>.rejected.json to resume.",
      },
      null,
      2
    ),
    "utf8"
  );

  // TODO(production): fire Slack approval-button message here instead of
  // waiting on the filesystem. See vault/integrations/integration-slack-api.md.

  const approvedPath = path.join(
    gateSignalDir,
    `${state.executionId}.approved.json`
  );
  const rejectedPath = path.join(
    gateSignalDir,
    `${state.executionId}.rejected.json`
  );

  // Poll (real production: file watcher or Slack webhook)
  const timeoutAt = Date.now() + 4 * 60 * 60 * 1000; // 4h SLA
  while (Date.now() < timeoutAt) {
    try {
      const raw = await fs.readFile(approvedPath, "utf8");
      const decision: GateDecision = GateDecisionSchema.parse({
        approved: true,
        ...JSON.parse(raw),
      });
      return { gate: decision };
    } catch {
      /* not yet */
    }
    try {
      const raw = await fs.readFile(rejectedPath, "utf8");
      const decision: GateDecision = GateDecisionSchema.parse({
        approved: false,
        ...JSON.parse(raw),
      });
      return { gate: decision };
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 5000));
  }

  throw new Error(
    `security-gate-1 timed out after 4h — no approval signal in ${gateSignalDir}`
  );
}
