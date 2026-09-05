/** Frozen independent cases, evaluated without modifying implementations or prompts. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { createExampleWorkflow, type TestCase } from '../packages/core/src/index.js';
import { Store, WorkflowService } from '../packages/runtime/src/index.js';
if (process.env.PROMETHEAN_LIVE_TEST !== '1')
  throw new Error('Set PROMETHEAN_LIVE_TEST=1 for this bounded live comparison.');
const raw = readFileSync('evals/heldout-v1.json', 'utf8');
const cases = JSON.parse(raw) as { version: string; cases: Record<string, TestCase[]> };
const store = new Store(resolve('work/live-verification/ledger-and-runs.sqlite'), 5);
const service = new WorkflowService(store, { bootstrap: false });
const before = store.budget(),
  results = [];
try {
  for (const id of ['inbound-triage', 'knowledge-support']) {
    const workflow = createExampleWorkflow(id);
    workflow.exampleId = null;
    workflow.tests = cases.cases[id];
    workflow.sampleInput = workflow.tests[0].input;
    for (const step of workflow.nodes) step.provenance.testedBy = workflow.tests.map((t) => t.id);
    store.insertWorkflow(workflow);
    results.push({
      exampleId: id,
      comparison: await service.compare(workflow.id, undefined, 'live'),
    });
  }
  const report = {
    recordedAt: new Date().toISOString(),
    version: cases.version,
    caseFileSha256: createHash('sha256').update(raw).digest('hex'),
    independentSyntheticCases: true,
    noImplementationTuning: true,
    before,
    after: store.budget(),
    outboxEffects: store.outboxCount(),
    results,
  };
  mkdirSync('docs/evaluation', { recursive: true });
  writeFileSync('docs/evaluation/heldout-results.json', JSON.stringify(report, null, 2));
  process.stdout.write(
    JSON.stringify(
      {
        after: report.after,
        outboxEffects: report.outboxEffects,
        results: results.map((r) => ({
          exampleId: r.exampleId,
          scores: r.comparison.results.map((c) => ({
            candidate: c.name,
            passed: c.passed,
            total: c.total,
            usage: c.usage,
          })),
        })),
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await service.close();
}
