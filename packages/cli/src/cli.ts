import { randomUUID } from 'node:crypto';
import {
  checksum,
  createExampleWorkflow,
  diagnoseWorkflow,
  EVALUATOR_VERSION,
  evaluateExpected,
  evidenceCatalog,
  exampleCatalog,
  executeDeterministicWorkflow,
  exportPackage,
  importPackage,
  rubric,
  RUBRIC_VERSION,
  searchEvidence,
  validatePackage,
  validateWorkflow,
  type Candidate,
  type Comparison,
  type ComparisonResult,
  type Evidence,
  type Provenance,
  type TestCase,
  type Workflow,
  type WorkflowPackage,
} from '@promethean/core';
import {
  assertCommandOptions,
  oneFileArgument,
  parseArguments,
  UsageError,
  type Arguments,
} from './arguments.js';
import { errorMessage, readBoundedText, readJson, saveOutput } from './io.js';

export const HELP = `Promethean — find and test the simplest reliable workflow

Usage: pnpm promethean <command> [arguments] [options]

  rubric                          Canonical capability rubric and version
  examples [id]                   List examples or emit an executable workflow
  evidence [query]                Search curated methodology and evidence
  diagnose <description>          Create a local rubric diagnosis
  diagnose --file <text-file>     Diagnose a text description from disk
  validate <json-file>            Validate a workflow or portable package
  provenance <json-file> [node]   Inspect decisions, sources, and test status
  test <json-file>                Test one deterministic candidate
  compare <json-file>             Test all deterministic candidates
  export <json-file>              Create a safe portable workflow package
  import <package-file>           Emit a fresh draft workflow from a package

Options:
  --candidate <id>                Select a candidate for test
  --format json|text              Data format (default: json)
  --out <path>                    Save output; refuse to overwrite by default
  --force                         Permit replacing the explicit --out file
  --help, -h                      Show this help
  --                              Treat remaining arguments as literal text

All CLI commands are local. Tests suppress approval/outbox effects and never
make paid model calls. A failing test exits 1; invalid usage exits 2. Compare
reports failures in its results and exits 0 when the comparison completed.
`;

export interface CliIO {
  cwd: string;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

/** Public JSON report contracts for callers that consume the CLI programmatically. */
export interface CliTestReport extends ComparisonResult {
  workflowId: string;
  workflowRevision: number;
  caseSetHash: string;
  rubricVersion: string;
  evaluatorVersion: string;
  effects: 'suppressed';
  mode: 'local';
}

export interface CliComparisonReport {
  comparison: Comparison;
  skippedCandidates: string[];
  effects: 'suppressed';
  note: string;
}

export interface CliProvenanceReport {
  workflowId: string;
  revision: number;
  rubricVersion: string;
  decision: Workflow['decision'];
  steps: Array<
    Provenance & {
      nodeId: string;
      label: string;
      evidence: Array<Evidence | { id: string; status: 'missing' }>;
      acceptanceCases: TestCase[];
    }
  >;
}

interface LoadedWorkflow {
  workflow: Workflow;
  evidence: Evidence[];
  package?: WorkflowPackage;
}

function isPackage(value: unknown): value is WorkflowPackage {
  return !!value && typeof value === 'object' && 'format' in value;
}

function decodeWorkflow(value: unknown): LoadedWorkflow {
  if (isPackage(value)) {
    validatePackage(value);
    return { workflow: value.workflow, evidence: value.evidence, package: value };
  }
  return { workflow: validateWorkflow(value), evidence: evidenceCatalog };
}

async function loadWorkflow(path: string, cwd: string): Promise<LoadedWorkflow> {
  return decodeWorkflow(await readJson(path, cwd));
}

function requireNoPositionals(args: Arguments): void {
  if (args.positional.length)
    throw new UsageError(`${args.command} does not accept positional arguments.`);
}

/** Same installed executor and subset grader as the application; no runtime/effect adapter is loaded. */
export function evaluateCandidate(workflow: Workflow, candidate: Candidate): ComparisonResult {
  if (candidate.requiresModel)
    throw new UsageError(
      'The CLI cannot run a model candidate. Choose a deterministic candidate or use application live mode.',
    );
  if (!workflow.tests.length)
    throw new UsageError(
      'This workflow has no acceptance cases. Add local cases before testing; no result can be claimed from an empty suite.',
    );
  const cases: ComparisonResult['cases'] = [];
  let latencyMs = 0;
  for (const test of workflow.tests) {
    const started = performance.now();
    let actual: Record<string, unknown> = {};
    let error: string | null = null;
    try {
      actual = executeDeterministicWorkflow(workflow, candidate.id, test.input);
    } catch (cause) {
      error = errorMessage(cause);
    }
    latencyMs += performance.now() - started;
    cases.push({
      caseId: test.id,
      name: test.name,
      passed: error === null && evaluateExpected(actual, test.expected),
      expected: test.expected,
      actual,
      runId: `cli-${randomUUID()}`,
      error,
    });
  }
  return {
    candidateId: candidate.id,
    name: candidate.name,
    cases,
    passed: cases.filter((test) => test.passed).length,
    total: cases.length,
    usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, model: null, latencyMs },
  };
}

function textOutput(command: string, value: unknown): string {
  if (command === 'diagnose' || command === 'examples' || command === 'import') {
    const workflow = value as Workflow;
    if (workflow.decision) {
      return [
        workflow.name,
        workflow.decision.recommendation,
        workflow.decision.rationale,
        `Source: ${workflow.designSource}; rubric ${workflow.rubricVersion}; revision ${workflow.revision}`,
        ...workflow.decision.questions.map((question) => `Open question: ${question}`),
        `Steps: ${workflow.nodes.map((node) => node.label).join(' → ')}`,
        `Acceptance cases: ${workflow.tests.length}`,
      ].join('\n');
    }
  }
  if (command === 'evidence') {
    return (
      (value as Evidence[])
        .map(
          (evidence) =>
            `${evidence.id} — ${evidence.title}\n${evidence.excerpt}\nSource: ${evidence.source} @ ${evidence.revision}; ${evidence.category}`,
        )
        .join('\n\n') || 'No matching evidence.'
    );
  }
  if (command === 'test') {
    const result = value as ComparisonResult;
    return [
      `${result.name}: ${result.passed}/${result.total} cases passed`,
      ...result.cases.map(
        (test) =>
          `${test.passed ? 'PASS' : 'FAIL'} ${test.name}${test.error ? ` — ${test.error}` : ''}`,
      ),
      `Measured local latency: ${result.usage.latencyMs.toFixed(2)} ms; model cost: $0; effects suppressed`,
    ].join('\n');
  }
  if (command === 'compare') {
    const result = value as { comparison: Comparison; skippedCandidates: string[] };
    return [
      ...result.comparison.results.map(
        (candidate) =>
          `${candidate.name}: ${candidate.passed}/${candidate.total} passed; ${candidate.usage.latencyMs.toFixed(2)} ms; $0`,
      ),
      result.comparison.recommendation,
      ...(result.skippedCandidates.length
        ? [`Not executed (model required): ${result.skippedCandidates.join(', ')}`]
        : []),
      'Local deterministic execution; all effects suppressed.',
    ].join('\n');
  }
  // Structured formatting retains complete information for less frequent inspection commands.
  return JSON.stringify(value, null, 2);
}

async function dispatch(
  args: Arguments,
  cwd: string,
): Promise<{ value: unknown; exitCode?: number }> {
  switch (args.command) {
    case 'rubric':
      assertCommandOptions(args);
      requireNoPositionals(args);
      return {
        value: {
          version: RUBRIC_VERSION,
          manual: 'Process improvement is a valid outcome outside the capability scale.',
          levels: rubric,
          permission: 'Capability does not grant authority to act.',
        },
      };
    case 'examples':
      assertCommandOptions(args);
      if (args.positional.length > 1)
        throw new UsageError('examples accepts at most one example ID.');
      return {
        value: args.positional.length ? createExampleWorkflow(args.positional[0]) : exampleCatalog,
      };
    case 'evidence':
      assertCommandOptions(args);
      return { value: searchEvidence(args.positional.join(' ')) };
    case 'diagnose': {
      assertCommandOptions(args, ['file']);
      if (args.file && args.positional.length)
        throw new UsageError('Provide a description or --file, not both.');
      const description = args.file
        ? await readBoundedText(args.file, cwd)
        : args.positional.join(' ');
      if (!description.trim()) throw new UsageError('diagnose needs a description or --file.');
      return { value: diagnoseWorkflow(description) };
    }
    case 'validate': {
      assertCommandOptions(args);
      const loaded = await loadWorkflow(oneFileArgument(args), cwd);
      return {
        value: loaded.package
          ? validatePackage(loaded.package)
          : {
              valid: true,
              workflowId: loaded.workflow.id,
              revision: loaded.workflow.revision,
              checks: [
                'Shared workflow schema, graph, installed operations, and policy validation passed',
              ],
              note: 'Structural validity does not establish task correctness. Run acceptance tests separately.',
            },
      };
    }
    case 'provenance': {
      assertCommandOptions(args);
      if (args.positional.length < 1 || args.positional.length > 2)
        throw new UsageError('provenance needs a JSON file path and optional node ID.');
      const loaded = await loadWorkflow(args.positional[0], cwd);
      const selectedId = args.positional[1];
      const nodes = loaded.workflow.nodes.filter((node) => !selectedId || node.id === selectedId);
      if (!nodes.length) throw new UsageError(`No node exists with ID ${selectedId}.`);
      return {
        value: {
          workflowId: loaded.workflow.id,
          revision: loaded.workflow.revision,
          rubricVersion: loaded.workflow.rubricVersion,
          decision: loaded.workflow.decision,
          steps: nodes.map((node) => ({
            nodeId: node.id,
            label: node.label,
            ...node.provenance,
            evidence: node.provenance.evidenceIds.map(
              (id) =>
                loaded.evidence.find((item) => item.id === id) ?? {
                  id,
                  status: 'missing' as const,
                },
            ),
            acceptanceCases: loaded.workflow.tests.filter((test) =>
              node.provenance.testedBy.includes(test.id),
            ),
          })),
        } satisfies CliProvenanceReport,
      };
    }
    case 'test': {
      assertCommandOptions(args, ['candidate']);
      const { workflow } = await loadWorkflow(oneFileArgument(args), cwd);
      const candidateId = args.candidate ?? workflow.decision.candidateId;
      const candidate = workflow.candidates.find((item) => item.id === candidateId);
      if (!candidate) throw new UsageError(`Unknown candidate: ${candidateId}`);
      const result = evaluateCandidate(workflow, candidate);
      return {
        value: {
          ...result,
          workflowId: workflow.id,
          workflowRevision: workflow.revision,
          caseSetHash: checksum(workflow.tests),
          rubricVersion: workflow.rubricVersion,
          evaluatorVersion: EVALUATOR_VERSION,
          effects: 'suppressed',
          mode: 'local',
        } satisfies CliTestReport,
        exitCode: result.passed === result.total ? 0 : 1,
      };
    }
    case 'compare': {
      assertCommandOptions(args);
      const { workflow } = await loadWorkflow(oneFileArgument(args), cwd);
      const candidates = workflow.candidates.filter((candidate) => !candidate.requiresModel);
      if (candidates.length < 2)
        throw new UsageError(
          'A comparison needs at least two deterministic implementations. Use test for a single candidate.',
        );
      if (new Set(candidates.map((candidate) => candidate.implementation)).size < 2)
        throw new UsageError(
          'Comparison candidates must have different installed implementations.',
        );
      const results = candidates.map((candidate) => evaluateCandidate(workflow, candidate));
      const qualifying = results.filter((result) => result.passed === result.total);
      const selected =
        qualifying.find(
          (result) =>
            candidates.find((candidate) => candidate.id === result.candidateId)?.implementation ===
            'rules',
        ) ?? qualifying[0];
      const comparison: Comparison = {
        id: randomUUID(),
        workflowId: workflow.id,
        workflowRevision: workflow.revision,
        createdAt: new Date().toISOString(),
        mode: 'local',
        results,
        recommendation: selected
          ? `${selected.name} satisfies all ${selected.total} supplied cases. It is the simplest passing installed deterministic candidate; validate representative operational cases before use.`
          : 'Neither deterministic implementation satisfies every supplied case. Review failures and requirements before recommending a solution.',
        rubricVersion: workflow.rubricVersion,
        evaluatorVersion: EVALUATOR_VERSION,
        caseSetHash: checksum(workflow.tests),
      };
      return {
        value: {
          comparison,
          skippedCandidates: workflow.candidates
            .filter((candidate) => candidate.requiresModel)
            .map((candidate) => candidate.id),
          effects: 'suppressed',
          note: 'Measured local results. No paid calls or outbox writes occurred; these cases do not establish production accuracy.',
        } satisfies CliComparisonReport,
      };
    }
    case 'export': {
      assertCommandOptions(args);
      if (args.format !== 'json')
        throw new UsageError(
          'Export requires JSON format so the package remains valid and portable.',
        );
      const loaded = await loadWorkflow(oneFileArgument(args), cwd);
      const pkg = exportPackage(loaded.workflow, loaded.package?.comparisons ?? []);
      validatePackage(pkg);
      return { value: pkg };
    }
    case 'import': {
      assertCommandOptions(args);
      return { value: importPackage(await readJson(oneFileArgument(args), cwd)) };
    }
    default:
      throw new UsageError(`Unknown command: ${args.command}. Use --help for available commands.`);
  }
}

/** Injectable streams and cwd let tests exercise the same parsing, filesystem and failure paths as the executable. */
export async function runCli(argv: string[], io: CliIO): Promise<number> {
  try {
    const args = parseArguments(argv);
    if (args.help || args.command === 'help') {
      io.stdout(HELP);
      return 0;
    }
    const { value, exitCode = 0 } = await dispatch(args, io.cwd);
    const output = `${args.format === 'json' ? JSON.stringify(value, null, 2) : textOutput(args.command, value)}\n`;
    if (args.out) {
      const path = await saveOutput(args.out, io.cwd, output, args.force);
      io.stderr(`${JSON.stringify({ saved: path })}\n`);
    } else io.stdout(output);
    return exitCode;
  } catch (error) {
    io.stderr(`${JSON.stringify({ error: errorMessage(error) })}\n`);
    return error instanceof UsageError ? 2 : 1;
  }
}
