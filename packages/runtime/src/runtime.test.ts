import { afterEach, describe, expect, test } from 'vitest';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createExampleWorkflow, type Usage } from '@promethean/core';
import { type AgentExecutor } from '@promethean/agents';
import { Store, WorkflowService, emptyUsage } from './index.js';

const services: WorkflowService[] = [];
afterEach(async () => {
  for (const service of services.splice(0)) await service.close();
});
function fixture(example = 'inbound-triage', options: { agents?: AgentExecutor } = {}) {
  const store = new Store(':memory:');
  const workflow = store.insertWorkflow(createExampleWorkflow(example));
  const service = new WorkflowService(store, { bootstrap: false, ...options });
  services.push(service);
  return { service, store, workflow };
}

describe('durable runtime safety and evidence', () => {
  test('approval binds the exact action; repeated approvals and run requests do not duplicate it', async () => {
    const { service, store, workflow } = fixture();
    const first = service.queueRun(workflow.id, { idempotencyKey: 'one' });
    expect(service.queueRun(workflow.id, { idempotencyKey: 'one' }).id).toBe(first.id);
    expect(() =>
      service.queueRun(workflow.id, { idempotencyKey: 'one', input: { message: 'different' } }),
    ).toThrow(/different run parameters/);
    const waiting = await service.waitForRun(first.id);
    expect(waiting.status).toBe('awaiting-approval');
    expect(store.outboxCount()).toBe(0);
    service.approve(first.id, 'approve', workflow.revision);
    service.approve(first.id, 'approve', workflow.revision);
    const done = await service.waitForRun(first.id);
    expect(done.status).toBe('completed');
    expect(done.output.delivery).toBe('local-only');
    expect(store.outboxCount()).toBe(1);
    service.approve(first.id, 'approve', workflow.revision);
    expect(store.outboxCount()).toBe(1);
  });
  test('denial and cancellation create no effects', async () => {
    const { service, store, workflow } = fixture();
    const denied = service.queueRun(workflow.id, { idempotencyKey: 'deny' });
    await service.waitForRun(denied.id);
    service.approve(denied.id, 'deny', 1);
    expect(store.getRun(denied.id).status).toBe('denied');
    const cancelled = service.queueRun(workflow.id, { idempotencyKey: 'cancel' });
    service.cancel(cancelled.id);
    await service.idle();
    expect(store.getRun(cancelled.id).status).toBe('cancelled');
    expect(store.outboxCount()).toBe(0);
  });
  test('revision conflicts preserve prior designs, constraints, and stale provenance', async () => {
    const { service, store, workflow } = fixture();
    const run = service.queueRun(workflow.id, { idempotencyKey: 'stale' });
    await service.waitForRun(run.id);
    const next = service.patch(workflow.id, {
      expectedRevision: 1,
      description: 'Triage incoming customer requests under a stricter review policy.',
    });
    expect(next.revision).toBe(2);
    expect(next.brief.constraints).toEqual(expect.arrayContaining(workflow.brief.constraints));
    expect(next.nodes.every((n) => n.provenance.status === 'stale')).toBe(true);
    expect(store.getWorkflow(workflow.id, 1)).toEqual(workflow);
    expect(() => service.patch(workflow.id, { expectedRevision: 1, name: 'Overwritten' })).toThrow(
      /changed/,
    );
    expect(() => service.approve(run.id, 'approve', 1)).toThrow(/stale/);
    expect(store.outboxCount()).toBe(0);
  });
  test('a correction forks a new execution and leaves the failure trace immutable', async () => {
    const { service, store, workflow } = fixture('csv-routing');
    const first = service.queueRun(workflow.id, {
      idempotencyKey: 'bad',
      input: { csv: 'id,amount,region\nA,22,north' },
    });
    // Lowering the bound before the run is created produces an inspectable validation failure.
    await service.waitForRun(first.id);
    service.patch(workflow.id, {
      expectedRevision: 1,
      nodeEdits: [{ id: 'validate', config: { requiredFields: ['csv'], maxLength: 8 } }],
    });
    const bad = service.queueRun(workflow.id, {
      idempotencyKey: 'too-long',
      input: workflow.tests[0].input,
    });
    const failure = await service.waitForRun(bad.id);
    expect(failure.status).toBe('failed');
    const before = JSON.stringify(failure);
    service.patch(workflow.id, {
      expectedRevision: 2,
      nodeEdits: [{ id: 'validate', config: { requiredFields: ['csv'], maxLength: 16000 } }],
    });
    const replay = service.retry(bad.id, 3);
    expect(replay.replayOf).toBe(bad.id);
    expect(replay.workflowRevision).toBe(3);
    expect((await service.waitForRun(replay.id)).status).toBe('completed');
    expect(JSON.stringify(store.getRun(bad.id))).toBe(before);
    expect(service.retry(bad.id, 3).id).toBe(replay.id);
  });
  test('comparisons use shared cases, real latency, and never outbox effects', async () => {
    const { service, store, workflow } = fixture();
    const result = await service.compare(workflow.id);
    expect(result.results.map((r) => r.passed)).toEqual([2, 3]);
    expect(result.recommendation).toMatch(/Neither/);
    expect(
      result.results.every(
        (r) => r.usage.latencyMs > 0 && r.usage.costUsd === 0 && r.usage.inputTokens === 0,
      ),
    ).toBe(true);
    expect(result.results[0].cases.map((c) => c.caseId)).toEqual(
      result.results[1].cases.map((c) => c.caseId),
    );
    expect(store.outboxCount()).toBe(0);
    expect(() => service.patch(workflow.id, { expectedRevision: 1, status: 'enabled' })).toThrow(
      /Pass all/,
    );
    expect(service.export(workflow.id).comparisons).toHaveLength(1);
  });
  test('local mode cannot silently replace a model candidate', () => {
    const { service, workflow } = fixture();
    expect(() =>
      service.queueRun(workflow.id, {
        candidateId: 'model',
        mode: 'local',
        idempotencyKey: 'fake',
      }),
    ).toThrow(/requires explicit live/);
  });
  test('custom acceptance cases and resolved briefs enable a real diagnosis-to-comparison path', async () => {
    const { service, store } = fixture('csv-routing');
    const workflow = await service.create(
      'Validate incoming CSV orders using id, amount and region columns, then route by region.',
    );
    const curated = createExampleWorkflow('csv-routing');
    const corrected = service.patch(workflow.id, {
      expectedRevision: 1,
      tests: curated.tests,
      sampleInput: curated.sampleInput,
      brief: {
        ...workflow.brief,
        inputs: 'CSV rows with id, amount and region',
        outputs: 'Ready/review route and normalized rows',
        successCriteria: ['Pass the three acceptance cases'],
        unknowns: [],
      },
    });
    expect(corrected.decision.questions).toEqual([]);
    expect(corrected.revision).toBe(2);
    const result = await service.compare(workflow.id);
    expect(result.results[1].passed).toBe(3);
    const tested = service.patch(workflow.id, { expectedRevision: 2, status: 'tested' });
    expect(tested.status).toBe('tested');
    const enabled = service.patch(workflow.id, { expectedRevision: 3, status: 'enabled' });
    expect(enabled.status).toBe('enabled');
    service.patch(workflow.id, { expectedRevision: 4, status: 'paused' });
    expect(() => service.queueRun(workflow.id, { idempotencyKey: 'paused' })).toThrow(/paused/);
    expect(store.versions(workflow.id)).toHaveLength(5);
  });
  test('budget reservations are atomic, reconcile actual usage, and retain unknown outcomes', () => {
    const store = new Store(':memory:', 0.1);
    try {
      const one = store.reserve(0.08, 'test');
      expect(() => store.reserve(0.03, 'over')).toThrow(/allowance/);
      const usage: Usage = {
        ...emptyUsage(),
        model: 'gpt-5.6-luna',
        costUsd: 0.01,
        inputTokens: 100,
        outputTokens: 50,
      };
      store.settle(one, usage);
      expect(store.budget().spentUsd).toBe(0.01);
      const unknown = store.reserve(0.04, 'interrupted');
      store.uncertain(unknown, 'transport interrupted');
      expect(store.budget().reservedUsd).toBe(0.04);
      expect(store.budget().remainingUsd).toBeCloseTo(0.05);
      store.markInterruptedReservations();
      expect(store.budget().reservedUsd).toBe(0.04);
    } finally {
      store.close();
    }
  });
  test('awaiting approvals and completed work survive a database restart', async () => {
    mkdirSync(resolve('work'), { recursive: true });
    const filename = resolve(mkdtempSync(resolve('work/runtime-test-')), 'state.sqlite');
    const beforeStore = new Store(filename),
      workflow = beforeStore.insertWorkflow(createExampleWorkflow('inbound-triage'));
    const before = new WorkflowService(beforeStore, { bootstrap: false });
    const run = before.queueRun(workflow.id, { idempotencyKey: 'restart' });
    const waiting = await before.waitForRun(run.id);
    expect(waiting.steps.filter((s) => s.status === 'completed')).toHaveLength(3);
    await before.close();
    const after = new WorkflowService(new Store(filename), { bootstrap: false });
    services.push(after);
    expect(after.store.getRun(run.id).status).toBe('awaiting-approval');
    after.approve(run.id, 'approve', 1);
    const done = await after.waitForRun(run.id);
    expect(done.status).toBe('completed');
    expect(after.store.outboxCount()).toBe(1);
    expect(done.steps.filter((s) => s.nodeId === 'classify')).toHaveLength(1);
  });
  test('a second worker cannot race jobs or recover the first worker’s live calls', async () => {
    mkdirSync(resolve('work'), { recursive: true });
    const filename = resolve(mkdtempSync(resolve('work/runtime-owner-')), 'state.sqlite');
    const first = new WorkflowService(new Store(filename), { bootstrap: false });
    services.push(first);
    const second = new Store(filename);
    try {
      expect(() => new WorkflowService(second, { bootstrap: false })).toThrow(
        /Another Promethean worker/,
      );
    } finally {
      second.close();
    }
    expect(first.store.budget().reservedUsd).toBe(0);
  });
  test('an interrupted safe step resumes with an explicit recovery event', async () => {
    mkdirSync(resolve('work'), { recursive: true });
    const filename = resolve(mkdtempSync(resolve('work/runtime-recovery-')), 'state.sqlite');
    const store = new Store(filename),
      workflow = store.insertWorkflow(createExampleWorkflow('csv-routing'));
    const before = new WorkflowService(store, { bootstrap: false });
    const run = before.queueRun(workflow.id, { idempotencyKey: 'recover' });
    before.cancel(run.id);
    await before.idle();
    const interrupted = store.getRun(run.id);
    interrupted.status = 'running';
    interrupted.completedAt = null;
    interrupted.events = interrupted.events.filter((e) => e.type !== 'cancelled');
    store.saveRun(interrupted);
    await before.close();
    const after = new WorkflowService(new Store(filename), { bootstrap: false });
    services.push(after);
    const done = await after.waitForRun(run.id);
    expect(done.status).toBe('completed');
    expect(done.events.some((e) => e.type === 'resumed')).toBe(true);
  });
  test('cancellation aborts an in-flight model step and does not overwrite cancelled state', async () => {
    let entered!: () => void;
    const enteredPromise = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const agents: AgentExecutor = {
      model: 'gpt-5.6-luna',
      available: () => true,
      diagnose: async (workflow) => ({ workflow, usage: emptyUsage() }),
      execute: async (_node, _state, _workflow, signal) => {
        entered();
        await new Promise<void>((_resolve, reject) =>
          signal!.addEventListener('abort', () => reject(new Error('cancelled')), { once: true }),
        );
        throw new Error('unreachable');
      },
    };
    const { service, store, workflow } = fixture('inbound-triage', { agents });
    const run = service.queueRun(workflow.id, {
      idempotencyKey: 'cancel-live',
      candidateId: 'model',
      mode: 'live',
    });
    await enteredPromise;
    service.cancel(run.id);
    await service.idle();
    expect(store.getRun(run.id).status).toBe('cancelled');
    expect(store.outboxCount()).toBe(0);
  });
});
