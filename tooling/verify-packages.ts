import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  exportPackage,
  validatePackage,
  type WorkflowPackage,
} from '../packages/core/src/index.js';

const target = resolve('work/portable-verification');
mkdirSync(target, { recursive: true });
const launcher = resolve('packages/cli/bin/promethean.mjs');
const reports = [];
for (const id of ['csv-routing', 'inbound-triage', 'knowledge-support']) {
  const path = `examples/${id}.promethean.json`;
  const prior = JSON.parse(readFileSync(path, 'utf8')) as WorkflowPackage;
  const pkg = exportPackage(prior.workflow, prior.comparisons);
  validatePackage(pkg);
  writeFileSync(path, JSON.stringify(pkg, null, 2));
  const directory = resolve(target, id);
  mkdirSync(directory, { recursive: true });
  copyFileSync(path, resolve(directory, 'workflow.promethean.json'));
  const checked = spawnSync(process.execPath, [launcher, 'validate', 'workflow.promethean.json'], {
    cwd: directory,
    encoding: 'utf8',
  });
  const executed = spawnSync(process.execPath, [launcher, 'test', 'workflow.promethean.json'], {
    cwd: directory,
    encoding: 'utf8',
  });
  const expectedExit = id === 'inbound-triage' ? 1 : 0;
  if (checked.status !== 0 || executed.status !== expectedExit)
    throw new Error(`${id} portability check failed: ${checked.stderr} ${executed.stderr}`);
  reports.push({
    id,
    validated: true,
    expectedTestExit: expectedExit,
    actualTestExit: executed.status,
    result: JSON.parse(executed.stdout),
  });
}
writeFileSync(
  'docs/evaluation/portable-results.json',
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      description:
        'Each package was copied into its own directory and evaluated through the installed CLI, with no server or key.',
      reports,
    },
    null,
    2,
  ),
);
process.stdout.write(
  'Three exported packages validated in separate directories. CSV and support passed their deterministic suites; triage retained its expected unsupported-route failure.\n',
);
