/** Publish only synthetic reproducible example proof; model calls require explicit opt-in. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createExampleWorkflow,
  exampleCatalog,
  validatePackage,
} from '../packages/core/src/index.js';
import { Store, WorkflowService } from '../packages/runtime/src/index.js';

const live = process.env.PROMETHEAN_LIVE_TEST === '1';
const directory = resolve(live ? 'work/live-verification' : 'work/example-verification');
mkdirSync(directory, { recursive: true });
mkdirSync('examples', { recursive: true });
mkdirSync('docs/evaluation', { recursive: true });
// Reuse the cumulative live-test ledger. Never silently create a fresh allowance for each run.
const store = new Store(resolve(directory, live ? 'ledger-and-runs.sqlite' : 'examples.sqlite'), 5);
const service = new WorkflowService(store, { bootstrap: false });
const before = store.budget();
const examples = [];
try {
  for (const item of exampleCatalog) {
    const workflow = store.insertWorkflow(createExampleWorkflow(item.id));
    const comparison = await service.compare(
      workflow.id,
      undefined,
      live && item.id !== 'csv-routing' ? 'live' : 'local',
    );
    const pkg = service.export(workflow.id);
    const validation = validatePackage(pkg);
    if (!validation.valid) throw new Error(`Package validation failed for ${item.id}`);
    writeFileSync(`examples/${item.id}.promethean.json`, JSON.stringify(pkg, null, 2));
    examples.push({
      id: item.id,
      workflowRevision: comparison.workflowRevision,
      rubricVersion: comparison.rubricVersion,
      evaluatorVersion: comparison.evaluatorVersion,
      caseSetHash: comparison.caseSetHash,
      mode: comparison.mode,
      results: comparison.results.map((r) => ({
        candidate: r.name,
        passed: r.passed,
        total: r.total,
        usage: r.usage,
      })),
      recommendation: comparison.recommendation,
    });
  }
  const report = {
    recordedAt: new Date().toISOString(),
    synthetic: true,
    before,
    after: store.budget(),
    outboxEffects: store.outboxCount(),
    examples,
  };
  writeFileSync('docs/evaluation/example-results.json', JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} finally {
  await service.close();
}
