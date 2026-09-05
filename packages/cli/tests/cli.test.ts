import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createExampleWorkflow, type Workflow, type WorkflowPackage } from '@promethean/core';
import { parseArguments } from '../src/arguments.js';
import {
  runCli,
  type CliComparisonReport,
  type CliProvenanceReport,
  type CliTestReport,
} from '../src/cli.js';

const executeFile = promisify(execFile);
let scratch: string;
const createdScratch: string[] = [];

beforeEach(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'promethean-cli-'));
  createdScratch.push(scratch);
});

afterAll(async () => {
  const trustedTempRoot = await realpath(tmpdir());
  for (const generatedPath of createdScratch) {
    const canonical = await realpath(generatedPath);
    if (
      dirname(canonical) !== trustedTempRoot ||
      !basename(canonical).startsWith('promethean-cli-')
    ) {
      throw new Error('Refusing cleanup outside the generated CLI test directories.');
    }
    await rm(canonical, { recursive: true, force: true });
  }
});

async function invoke(args: string[], cwd = scratch) {
  let stdout = '';
  let stderr = '';
  const code = await runCli(args, {
    cwd,
    stdout: (chunk) => {
      stdout += chunk;
    },
    stderr: (chunk) => {
      stderr += chunk;
    },
  });
  return { code, stdout, stderr, json: <T>() => JSON.parse(stdout) as T };
}

async function writeWorkflow(exampleId = 'csv-routing'): Promise<Workflow> {
  const workflow = createExampleWorkflow(exampleId);
  await writeFile(join(scratch, 'workflow.json'), JSON.stringify(workflow));
  return workflow;
}

describe('argument and output boundaries', () => {
  it('parses options before the command and a literal description after --', () => {
    const args = parseArguments(['--format=text', 'diagnose', '--', '--this is source data']);
    expect(args.command).toBe('diagnose');
    expect(args.format).toBe('text');
    expect(args.positional).toEqual(['--this is source data']);
  });

  it.each([
    ['examples', '--live'],
    ['examples', '--out'],
    ['examples', '--format', 'xml'],
    ['examples', '--format=json', '--format=text'],
    ['examples', '--force'],
    ['evidence', '--candidate', 'model'],
    ['diagnose', 'a process', '--file', 'another.md'],
  ])('rejects unsupported or ambiguous arguments: %j', async (...args) => {
    const result = await invoke(args);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr).error).toBeTruthy();
  });

  it('refuses accidental overwriting and writes machine data without stream decoration', async () => {
    const saved = await invoke(['examples', 'csv-routing', '--out', 'nested/workflow.json']);
    expect(saved.code).toBe(0);
    expect(saved.stdout).toBe('');
    const before = await readFile(join(scratch, 'nested/workflow.json'), 'utf8');
    expect(JSON.parse(before).exampleId).toBe('csv-routing');
    const conflict = await invoke(['examples', 'inbound-triage', '--out', 'nested/workflow.json']);
    expect(conflict.code).toBe(1);
    expect(await readFile(join(scratch, 'nested/workflow.json'), 'utf8')).toBe(before);
    const replaced = await invoke([
      'examples',
      'inbound-triage',
      '--out',
      'nested/workflow.json',
      '--force',
    ]);
    expect(replaced.code).toBe(0);
    expect(
      JSON.parse(await readFile(join(scratch, 'nested/workflow.json'), 'utf8')).exampleId,
    ).toBe('inbound-triage');
  });

  it('returns one JSON error without echoing malformed input', async () => {
    const privateContent = 'not-json PRIVATE-CONTENT-DO-NOT-ECHO';
    await writeFile(join(scratch, 'broken.json'), privateContent);
    const result = await invoke(['validate', 'broken.json']);
    expect(result.code).toBe(2);
    expect(JSON.parse(result.stderr)).toEqual({ error: 'Input is not valid JSON.' });
    expect(result.stderr).not.toContain(privateContent);
  });
});

describe('shared diagnosis and evidence', () => {
  it('preserves user constraints without silently inserting executable example tests', async () => {
    const description =
      'Validate a CSV with amount and region, but only route north orders after manual review.';
    await writeFile(join(scratch, 'process.md'), description);
    const result = await invoke(['diagnose', '--file', 'process.md']);
    expect(result.code).toBe(0);
    const workflow = result.json<Workflow>();
    expect(workflow.description).toBe(description);
    expect(workflow.brief.constraints).toContain(description);
    expect(workflow.exampleId).toBeNull();
    expect(workflow.tests).toEqual([]);
    expect(workflow.model).toBeNull();
    expect(workflow.decision.status).toBe('needs-information');
  });

  it('keeps a vague process diagnostic instead of manufacturing an AI workflow', async () => {
    const result = await invoke(['diagnose', 'Make our company better.']);
    expect(result.code).toBe(0);
    const workflow = result.json<Workflow>();
    expect(
      workflow.candidates.every(
        (candidate: { requiresModel: boolean }) => !candidate.requiresModel,
      ),
    ).toBe(true);
    expect(workflow.brief.unknowns.length).toBeGreaterThan(0);
    expect(
      workflow.nodes.every((node: { kind: string }) => !['outbox', 'classify'].includes(node.kind)),
    ).toBe(true);
  });

  it('rejects an empty diagnostic and finds historical failure sources', async () => {
    expect((await invoke(['diagnose', '   '])).code).toBe(2);
    const evidence = await invoke(['evidence', 'graph loss']);
    expect(evidence.code).toBe(0);
    const sources = JSON.parse(evidence.stdout) as Array<{ source: string }>;
    expect(sources.some((source) => source.source.startsWith('archive/alpha/'))).toBe(true);
  });

  it('resolves selected node provenance through the shared evidence catalog', async () => {
    const workflow = await writeWorkflow();
    const selected = workflow.nodes[1];
    const result = await invoke(['provenance', 'workflow.json', selected.id]);
    expect(result.code).toBe(0);
    const provenance = result.json<CliProvenanceReport>();
    expect(provenance.steps).toHaveLength(1);
    expect(provenance.steps[0].evidence.map((e: { id: string }) => e.id)).toEqual(
      selected.provenance.evidenceIds,
    );
    expect(provenance.steps[0].status).toBe('untested');
    expect((await invoke(['provenance', 'workflow.json', 'absent'])).code).toBe(2);
  });
});

describe('deterministic proof and portability', () => {
  it('runs distinct implementations against the same cases and fails a weaker baseline', async () => {
    await writeWorkflow();
    const failed = await invoke(['test', 'workflow.json', '--candidate', 'rules']);
    const passed = await invoke(['test', 'workflow.json', '--candidate', 'enhanced-rules']);
    expect(failed.code).toBe(1);
    expect(passed.code).toBe(0);
    const failedReport = failed.json<CliTestReport>();
    const passedReport = passed.json<CliTestReport>();
    expect(failedReport.caseSetHash).toBe(passedReport.caseSetHash);
    expect(passedReport.passed).toBe(passedReport.total);
    expect(failedReport.passed).toBeLessThan(failedReport.total);
    expect(passedReport.usage).toMatchObject({
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      model: null,
    });
    const compared = await invoke(['compare', 'workflow.json']);
    expect(compared.code).toBe(0);
    expect(compared.json<CliComparisonReport>().comparison.results).toHaveLength(2);
  });

  it('records the case where neither candidate qualifies and suppresses all effects', async () => {
    await writeWorkflow('inbound-triage');
    const before = await readdir(scratch);
    const result = await invoke(['compare', 'workflow.json']);
    expect(result.code).toBe(0);
    const comparison = result.json<CliComparisonReport>();
    expect(comparison.skippedCandidates).toEqual(['model']);
    expect(
      comparison.comparison.results.every(
        (candidate: { passed: number; total: number }) => candidate.passed < candidate.total,
      ),
    ).toBe(true);
    expect(comparison.effects).toBe('suppressed');
    expect(await readdir(scratch)).toEqual(before);
    expect((await invoke(['test', 'workflow.json', '--candidate', 'model'])).code).toBe(2);
  });

  it('does not turn an empty test suite into a successful proof', async () => {
    const workflow = await writeWorkflow();
    workflow.tests = [];
    for (const node of workflow.nodes) node.provenance.testedBy = [];
    await writeFile(join(scratch, 'workflow.json'), JSON.stringify(workflow));
    const result = await invoke(['test', 'workflow.json']);
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
  });

  it('exports, validates and tests synthetic fixtures, then imports a fresh draft', async () => {
    const workflow = await writeWorkflow();
    expect((await invoke(['export', 'workflow.json', '--out', 'package.json'])).code).toBe(0);
    expect((await invoke(['validate', 'package.json'])).code).toBe(0);
    expect((await invoke(['test', 'package.json'])).code).toBe(0);
    const imported = await invoke(['import', 'package.json']);
    expect(imported.code).toBe(0);
    const importedWorkflow = imported.json<Workflow>();
    expect(importedWorkflow.id).not.toBe(workflow.id);
    expect(importedWorkflow.status).toBe('draft');
    expect(
      importedWorkflow.nodes.every(
        (node: { provenance: { status: string } }) => node.provenance.status === 'untested',
      ),
    ).toBe(true);
    const pkg = JSON.parse(
      await readFile(join(scratch, 'package.json'), 'utf8'),
    ) as WorkflowPackage;
    pkg.workflow.name = 'Tampered after export';
    await writeFile(join(scratch, 'tampered.json'), JSON.stringify(pkg));
    expect((await invoke(['validate', 'tampered.json'])).code).toBe(1);
  });

  it('omits arbitrary private fixture data and does not pretend the stripped package is tested', async () => {
    const workflow = await writeWorkflow();
    workflow.sampleInput = { csv: 'private data' };
    workflow.tests[0].input = { csv: 'private data' };
    await writeFile(join(scratch, 'workflow.json'), JSON.stringify(workflow));
    const result = await invoke(['export', 'workflow.json']);
    expect(result.code).toBe(0);
    const pkg = result.json<WorkflowPackage>();
    expect(pkg.workflow.tests).toEqual([]);
    expect(pkg.workflow.sampleInput).toEqual({});
    expect(result.stdout).not.toContain('private data');
  });

  it('rejects executable configuration outside the installed operation set', async () => {
    const workflow = await writeWorkflow();
    workflow.nodes[1].config = { operation: 'shell', command: 'echo should-never-run' };
    await writeFile(join(scratch, 'workflow.json'), JSON.stringify(workflow));
    expect((await invoke(['test', 'workflow.json'])).code).toBe(1);
    expect((await invoke(['export', 'workflow.json'])).code).toBe(1);
  });

  it('launches from a separate clean cwd with only the exported package present', async () => {
    await writeWorkflow();
    await invoke(['export', 'workflow.json', '--out', 'package.json']);
    const clean = join(scratch, 'clean');
    await mkdir(clean);
    await writeFile(join(clean, 'package.json'), await readFile(join(scratch, 'package.json')));
    const launcher = resolve(fileURLToPath(new URL('../bin/promethean.mjs', import.meta.url)));
    const result = await executeFile(process.execPath, [launcher, 'test', 'package.json'], {
      cwd: clean,
    });
    const report = JSON.parse(result.stdout) as { passed: number; total: number };
    expect(report.passed).toBe(report.total);
    expect(await readdir(clean)).toEqual(['package.json']);
  });
});
