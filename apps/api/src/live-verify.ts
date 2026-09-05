/** Explicit, bounded provider verification. Never run in ordinary CI. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createExampleWorkflow, evaluateExpected } from '@promethean/core';
import { Store, WorkflowService } from '@promethean/runtime';

if (process.env.PROMETHEAN_LIVE_TEST !== '1')
  throw new Error('Set PROMETHEAN_LIVE_TEST=1 explicitly before paid verification.');
if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY_FILE)
  throw new Error(
    'Configure OPENAI_API_KEY or OPENAI_API_KEY_FILE server-side; never put a credential on the command line.',
  );
const directory = resolve(process.env.PROMETHEAN_LIVE_DATA_DIR ?? 'work/live-verification');
mkdirSync(directory, { recursive: true });
const store = new Store(resolve(directory, 'ledger-and-runs.sqlite'), 5),
  service = new WorkflowService(store, { bootstrap: false });
const results: Record<string, unknown>[] = [],
  startedAt = new Date().toISOString(),
  before = store.budget();
try {
  const diagnosed = await service.create(
    'Triage incoming customer messages into billing, technical, sales or review. Require a human to review the prepared answer and only use the local outbox.',
    { mode: 'live', name: 'Live SDK diagnostic verification' },
  );
  results.push({
    check: 'structured-diagnosis',
    passed:
      diagnosed.designSource === 'openai' &&
      diagnosed.brief.constraints.some((c) => c.includes('Require a human')),
    workflowId: diagnosed.id,
    model: diagnosed.model,
  });
  for (const exampleId of ['inbound-triage', 'knowledge-support']) {
    const workflow = store.insertWorkflow(createExampleWorkflow(exampleId));
    const testCase = workflow.tests[exampleId === 'inbound-triage' ? 1 : 0];
    const run = service.queueRun(workflow.id, {
      candidateId: 'model',
      mode: 'live',
      input: testCase.input,
      idempotencyKey: `live-check:${startedAt}:${exampleId}`,
    });
    const final = await service.waitForRun(run.id);
    const passed =
      final.status === 'awaiting-approval' && evaluateExpected(final.output, testCase.expected);
    results.push({
      check: exampleId,
      passed,
      runId: run.id,
      workflowId: workflow.id,
      status: final.status,
      usage: final.usage,
      expected: testCase.expected,
      actual: {
        route: final.output.route,
        citations: final.output.citations,
        supported: final.output.supported,
      },
      error: final.error,
    });
    if (final.status === 'awaiting-approval') service.approve(final.id, 'deny', workflow.revision);
    if (!passed)
      throw new Error(`Live verification failed for ${exampleId}. Inspect its persisted trace.`);
  }
  const report = {
    startedAt,
    completedAt: new Date().toISOString(),
    passed: results.every((r) => r.passed),
    model: service.agents.model,
    before,
    after: store.budget(),
    outboxEffects: store.outboxCount(),
    results,
  };
  writeFileSync(resolve(directory, 'latest-report.json'), JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  const report = {
    startedAt,
    completedAt: new Date().toISOString(),
    passed: false,
    before,
    after: store.budget(),
    results,
    error: error instanceof Error ? error.message : 'Verification failed',
  };
  writeFileSync(resolve(directory, 'latest-report.json'), JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await service.close();
}
