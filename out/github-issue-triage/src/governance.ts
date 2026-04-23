/**
 * Governance middleware — implements the governanceConfig contract from the
 * approved workflow. Wraps every node call with:
 *   - cost tracking + hard limit (CostLimitExceeded)
 *   - latency measurement + soft threshold (latency_spike alert)
 *   - retry-with-backoff per node errorHandling
 *   - structured per-step logging (loggingLevel: verbose)
 *   - snapshot persistence (autoSnapshot: true)
 *   - alert fan-out to configured channels
 *
 * This is the "cost/latency/timeout middleware" emit.md promises to wire.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { WorkflowState } from "./state.js";

export interface GovernanceConfig {
  loggingLevel: "minimal" | "standard" | "verbose" | "debug";
  autoSnapshot: boolean;
  latencyThreshold: number;
  costThreshold: number;
  errorRateThreshold: number;
  alertChannels: string[];
  costLimitPerRun: number;
  executionTimeoutMs: number;
}

export class CostLimitExceeded extends Error {
  constructor(readonly accumulated: number, readonly limit: number) {
    super(
      `cost_limit_exceeded: accumulated=${accumulated.toFixed(
        4
      )} limit=${limit.toFixed(2)}`
    );
    this.name = "CostLimitExceeded";
  }
}

export class ExecutionTimedOut extends Error {
  constructor() {
    super("execution_timeout");
    this.name = "ExecutionTimedOut";
  }
}

export type NodeErrorHandling =
  | "alert-and-fail"
  | "alert-and-skip"
  | "fallback-to-l0"
  | "retry-with-backoff"
  | "route-to-human-gate";

export interface NodeWrapArgs<R> {
  nodeId: string;
  errorHandling: NodeErrorHandling;
  estimatedCostUsd?: number;
  state: WorkflowState;
  config: GovernanceConfig;
  run: () => Promise<R>;
}

const SNAPSHOT_DIR = process.env.SNAPSHOT_DIR ?? "./snapshots";

function log(level: GovernanceConfig["loggingLevel"], payload: object): void {
  // stdout structured JSON — downstream aggregators (Loki, Datadog) pick up.
  if (level === "minimal") return;
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...payload }));
}

async function snapshot(
  state: WorkflowState,
  nodeId: string,
  phase: "before" | "after"
): Promise<void> {
  const dir = path.join(SNAPSHOT_DIR, state.executionId);
  await fs.mkdir(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  await fs.writeFile(
    path.join(dir, `${nodeId}-${phase}-${ts}.json`),
    JSON.stringify(state, null, 2),
    "utf8"
  );
}

async function alert(
  config: GovernanceConfig,
  payload: { severity: string; type: string; workflow: string; message: string }
): Promise<void> {
  log(config.loggingLevel, { evt: "alert", ...payload });
  // TODO(production): fan to config.alertChannels — see
  // vault/integrations/slack-api.md and pagerduty.md.
}

/**
 * Wrap a node's execution in governance. Handles:
 *   - snapshot before/after
 *   - cost cap + latency threshold
 *   - per-node errorHandling strategy
 *   - structured logging
 */
export async function withGovernance<R>(args: NodeWrapArgs<R>): Promise<R | null> {
  const { nodeId, errorHandling, estimatedCostUsd = 0, state, config, run } = args;

  // Cost cap check BEFORE we do any work
  if (state.accumulated.costUsd + estimatedCostUsd > config.costLimitPerRun) {
    throw new CostLimitExceeded(
      state.accumulated.costUsd + estimatedCostUsd,
      config.costLimitPerRun
    );
  }

  if (config.autoSnapshot) await snapshot(state, nodeId, "before");

  const startedAt = new Date();
  const started = Date.now();
  let attempt = 0;
  const maxAttempts = errorHandling === "retry-with-backoff" ? 3 : 1;
  let lastErr: unknown;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const result = await run();
      const latencyMs = Date.now() - started;

      state.accumulated.costUsd += estimatedCostUsd;
      state.accumulated.steps.push({
        nodeId,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        latencyMs,
        costUsd: estimatedCostUsd,
        status: attempt > 1 ? "retried" : "ok",
      });

      log(config.loggingLevel, {
        evt: "node.ok",
        nodeId,
        attempt,
        latencyMs,
        costUsd: estimatedCostUsd,
        accumulatedCostUsd: state.accumulated.costUsd,
      });

      if (latencyMs > config.latencyThreshold) {
        await alert(config, {
          severity: "warning",
          type: "latency_spike",
          workflow: state.executionId,
          message: `node ${nodeId} took ${latencyMs}ms (threshold ${config.latencyThreshold}ms)`,
        });
      }
      if (state.accumulated.costUsd > config.costThreshold) {
        await alert(config, {
          severity: "warning",
          type: "cost_threshold_exceeded",
          workflow: state.executionId,
          message: `run accumulated $${state.accumulated.costUsd.toFixed(4)} (threshold $${config.costThreshold})`,
        });
      }

      if (config.autoSnapshot) await snapshot(state, nodeId, "after");
      return result;
    } catch (err) {
      lastErr = err;
      if (err instanceof CostLimitExceeded) throw err;

      log(config.loggingLevel, {
        evt: "node.err",
        nodeId,
        attempt,
        error: (err as Error).message,
      });

      // Backoff before next retry
      if (attempt < maxAttempts) {
        const base = 1000;
        const cap = 30000;
        const delay =
          Math.min(base * Math.pow(2, attempt - 1), cap) *
          (0.5 + Math.random());
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Exhausted retries — apply the errorHandling strategy
      const latencyMs = Date.now() - started;
      state.accumulated.steps.push({
        nodeId,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        latencyMs,
        costUsd: 0,
        status: errorHandling === "alert-and-skip" ? "skipped" : "error",
        error: (err as Error).message,
      });

      if (errorHandling === "alert-and-skip") {
        await alert(config, {
          severity: "warning",
          type: "node_skipped",
          workflow: state.executionId,
          message: `node ${nodeId} skipped after ${attempt} attempts: ${(err as Error).message}`,
        });
        return null;
      }

      await alert(config, {
        severity: "error",
        type: "node_failed",
        workflow: state.executionId,
        message: `node ${nodeId} failed after ${attempt} attempts: ${(err as Error).message}`,
      });

      // For alert-and-fail, fallback-to-l0, route-to-human-gate — caller
      // inspects the thrown error and routes. We rethrow a tagged error.
      const tagged = new Error(
        `node ${nodeId} failed [${errorHandling}]: ${(err as Error).message}`
      );
      (tagged as Error & { nodeId?: string; errorHandling?: string }).nodeId = nodeId;
      (tagged as Error & { nodeId?: string; errorHandling?: string }).errorHandling =
        errorHandling;
      throw tagged;
    }
  }
  // Unreachable
  throw lastErr as Error;
}

export function withTimeout<R>(
  config: GovernanceConfig,
  run: (signal: AbortSignal) => Promise<R>
): Promise<R> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    config.executionTimeoutMs
  );
  return run(controller.signal)
    .catch((err) => {
      if (controller.signal.aborted) throw new ExecutionTimedOut();
      throw err;
    })
    .finally(() => clearTimeout(timer));
}
