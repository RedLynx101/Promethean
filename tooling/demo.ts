/** An inspectable recorded demo made by actual local execution, with no model calls. */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { Store, WorkflowService } from '../packages/runtime/src/index.js';

const directory = resolve('work/demo');
const store = new Store(resolve(directory, 'promethean.sqlite'));
const service = new WorkflowService(store);
try {
  if (!store.db.prepare('SELECT value FROM metadata WHERE key=?').get('demo-prepared')) {
    const workflows = service.workspace().workflows;
    for (const workflow of workflows) await service.compare(workflow.id, undefined, 'local');
    const csv = workflows.find((w) => w.exampleId === 'csv-routing')!;
    const broken = service.patch(csv.id, {
      expectedRevision: csv.revision,
      nodeEdits: [{ id: 'validate', config: { requiredFields: ['csv'], maxLength: 5 } }],
    });
    const failed = service.queueRun(csv.id, {
      mode: 'local',
      idempotencyKey: 'recorded-demo-failure',
    });
    if ((await service.waitForRun(failed.id)).status !== 'failed')
      throw new Error('The demo failure was not observed.');
    const corrected = service.patch(csv.id, {
      expectedRevision: broken.revision,
      nodeEdits: [{ id: 'validate', config: { requiredFields: ['csv'], maxLength: 16000 } }],
    });
    const retry = service.retry(failed.id, corrected.revision);
    if ((await service.waitForRun(retry.id)).status !== 'completed')
      throw new Error('The demo correction failed.');
    await service.compare(csv.id, undefined, 'local');
    const triage = workflows.find((w) => w.exampleId === 'inbound-triage')!;
    const run = service.queueRun(triage.id, {
      mode: 'local',
      idempotencyKey: 'recorded-demo-review',
    });
    if ((await service.waitForRun(run.id)).status !== 'awaiting-approval')
      throw new Error('The demo did not reach approval.');
    service.approve(run.id, 'deny', triage.revision);
    store.db
      .prepare('INSERT INTO metadata(key,value) VALUES(?,?)')
      .run('demo-prepared', new Date().toISOString());
  }
  process.stdout.write(
    'Recorded local demo is ready: comparisons, failed/corrected CSV revisions, and a denied triage run. No model calls or external delivery.\n',
  );
} finally {
  await service.close();
}
if (!process.argv.includes('--prepare-only')) {
  const environment: NodeJS.ProcessEnv = { ...process.env, PROMETHEAN_DATA_DIR: directory };
  delete environment.OPENAI_API_KEY;
  delete environment.OPENAI_API_KEY_FILE;
  const child = spawn(process.execPath, ['tooling/dev.mjs'], {
    stdio: 'inherit',
    env: environment,
  });
  process.on('SIGINT', () => child.kill());
  process.on('SIGTERM', () => child.kill());
  child.on('exit', (code) => {
    process.exitCode = code ?? 0;
  });
}
