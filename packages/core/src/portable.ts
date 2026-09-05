import { createHash, randomUUID } from 'node:crypto';
import { createExampleWorkflow, evidenceCatalog } from './catalog.js';
import { DomainError, validateWorkflow } from './validation.js';
import { EVALUATOR_VERSION, evaluateExpected } from './execution.js';
import type { Comparison, Workflow, WorkflowPackage } from './types.js';

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export function checksum(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}
export function assertNoSecrets(value: unknown, path = 'package'): void {
  if (
    typeof value === 'string' &&
    /\bsk-(?:proj-)?[a-zA-Z0-9_-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|Bearer\s+[a-zA-Z0-9._-]{16,}/i.test(
      value,
    )
  )
    throw new DomainError(
      `Potential credential found in ${path}; remove it before export or import.`,
    );
  if (value && typeof value === 'object')
    for (const [key, item] of Object.entries(value)) {
      if (
        /^(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|authorization|credential)$/i.test(
          key,
        ) &&
        item
      )
        throw new DomainError(`Secret-bearing field ${path}.${key} is not portable.`);
      assertNoSecrets(item, `${path}.${key}`);
    }
}
export function exportPackage(workflow: Workflow, comparisons: Comparison[] = []): WorkflowPackage {
  const portable = structuredClone(validateWorkflow(workflow));
  let curated = false;
  if (workflow.exampleId) {
    const fixture = createExampleWorkflow(workflow.exampleId);
    curated =
      checksum(fixture.tests) === checksum(workflow.tests) &&
      checksum(fixture.sampleInput) === checksum(workflow.sampleInput);
  }
  // Definitions are intentionally portable. Arbitrary run inputs, case inputs and traces are not.
  if (!curated) {
    portable.tests = [];
    portable.sampleInput = {};
    for (const node of portable.nodes) {
      node.provenance.testedBy = [];
      if (node.provenance.status === 'supported') node.provenance.status = 'untested';
    }
  }
  const body = {
    format: 'promethean-workflow' as const,
    version: '2.0' as const,
    exportedAt: new Date().toISOString(),
    workflow: portable,
    evidence: structuredClone(
      evidenceCatalog.filter(
        (e) =>
          portable.nodes.some((n) => n.provenance.evidenceIds.includes(e.id)) ||
          portable.decision.evidenceIds.includes(e.id),
      ),
    ),
    comparisons: curated
      ? comparisons
          .filter((c) => c.workflowRevision === workflow.revision)
          .map((c) => ({
            ...structuredClone(c),
            results: c.results.map((r) => ({
              ...r,
              cases: r.cases.map((k) => ({
                ...k,
                actual: Object.fromEntries(
                  Object.keys(k.expected).map((key) => [key, k.actual[key]]),
                ),
              })),
            })),
          }))
      : [],
    requirements: [
      'Node.js 24+',
      'Promethean 2.0 shared runtime or CLI',
      ...(workflow.candidates.some((c) => c.requiresModel)
        ? [
            'Optional live mode: OPENAI_API_KEY or OPENAI_API_KEY_FILE, Luna/Terra access, and remaining usage allowance',
          ]
        : []),
      ...(workflow.nodes.some((n) => n.kind === 'outbox')
        ? ['local-outbox adapter only; external delivery is not implemented']
        : []),
    ],
    runbook: `Validate the package checksum and graph before importing. Run deterministic tests with the Promethean CLI; comparison suppresses all effects. Review the brief, provenance, and constraints. Live execution is optional and uses ordinary budget, approval, and idempotency checks. ${curated ? 'Included inputs are verified synthetic fixtures.' : 'Private sample inputs and test cases were omitted. Supply local acceptance cases before running.'} Workflow descriptions and configuration are part of the exported definition; review them before sharing.`,
  };
  assertNoSecrets(body);
  return { ...body, checksum: checksum(body) };
}
export function validatePackage(value: unknown): { valid: true; checks: string[] } {
  if (!value || typeof value !== 'object')
    throw new DomainError('A workflow package object is required.');
  const pkg = value as WorkflowPackage;
  if (
    pkg.format !== 'promethean-workflow' ||
    pkg.version !== '2.0' ||
    !/^[a-f0-9]{64}$/.test(pkg.checksum ?? '')
  )
    throw new DomainError('Unsupported workflow package format or checksum.');
  const { checksum: supplied, ...body } = pkg;
  if (checksum(body) !== supplied)
    throw new DomainError('Package checksum does not match its contents.');
  validateWorkflow(pkg.workflow);
  if (
    !Array.isArray(pkg.evidence) ||
    !Array.isArray(pkg.comparisons) ||
    !Array.isArray(pkg.requirements) ||
    typeof pkg.runbook !== 'string'
  )
    throw new DomainError('Package metadata is incomplete.');
  if (
    pkg.evidence.some(
      (e) =>
        !evidenceCatalog.some(
          (known) =>
            known.id === e.id && known.revision === e.revision && checksum(known) === checksum(e),
        ),
    )
  )
    throw new DomainError('Package evidence does not match the installed curated source revision.');
  const suppliedEvidence = new Set(pkg.evidence.map((e) => e.id));
  if (
    [
      ...pkg.workflow.decision.evidenceIds,
      ...pkg.workflow.nodes.flatMap((n) => n.provenance.evidenceIds),
    ].some((id) => !suppliedEvidence.has(id))
  )
    throw new DomainError('The package omits evidence referenced by its workflow.');
  for (const comparison of pkg.comparisons) {
    if (
      comparison.workflowId !== pkg.workflow.id ||
      comparison.workflowRevision !== pkg.workflow.revision ||
      comparison.rubricVersion !== pkg.workflow.rubricVersion ||
      comparison.evaluatorVersion !== EVALUATOR_VERSION ||
      comparison.caseSetHash !== checksum(pkg.workflow.tests)
    )
      throw new DomainError(
        'Comparison source revisions or case-set hash do not match the exported workflow.',
      );
    if (
      !Array.isArray(comparison.results) ||
      comparison.results.length < 2 ||
      comparison.results.length > 3
    )
      throw new DomainError('Comparison requires 2–3 candidate results.');
    const candidateIds = comparison.results.map((r) => r.candidateId);
    if (
      new Set(candidateIds).size !== candidateIds.length ||
      candidateIds.some((id) => !pkg.workflow.candidates.some((c) => c.id === id))
    )
      throw new DomainError('Comparison candidates are unknown or duplicated.');
    for (const result of comparison.results) {
      if (
        !Array.isArray(result.cases) ||
        result.total !== pkg.workflow.tests.length ||
        result.cases.length !== result.total ||
        new Set(result.cases.map((c) => c.caseId)).size !== result.total
      )
        throw new DomainError('Comparison case count is inconsistent.');
      for (const item of result.cases) {
        const fixture = pkg.workflow.tests.find((t) => t.id === item.caseId);
        if (
          !fixture ||
          checksum(item.expected) !== checksum(fixture.expected) ||
          item.passed !== (!item.error && evaluateExpected(item.actual, item.expected))
        )
          throw new DomainError('Comparison outcomes do not match the declared case expectations.');
      }
      if (
        result.passed !== result.cases.filter((c) => c.passed).length ||
        !result.usage ||
        [
          result.usage.inputTokens,
          result.usage.outputTokens,
          result.usage.costUsd,
          result.usage.latencyMs,
        ].some((n) => !Number.isFinite(n) || n < 0)
      )
        throw new DomainError('Comparison totals or usage fields are invalid.');
    }
  }
  assertNoSecrets(pkg);
  return {
    valid: true,
    checks: [
      'Checksum matches',
      'Schema and rubric are supported',
      'Graph is acyclic and references are valid',
      'Approval dominates every outbox path',
      'Only installed operations and adapters are allowed',
      'Evidence provenance matches installed sources',
      'No recognized secret-bearing fields',
    ],
  };
}
export function importPackage(value: unknown): Workflow {
  validatePackage(value);
  const workflow = structuredClone((value as WorkflowPackage).workflow),
    now = new Date().toISOString();
  workflow.id = randomUUID();
  workflow.revision = 1;
  workflow.createdAt = now;
  workflow.updatedAt = now;
  workflow.status = 'draft';
  workflow.decision.status = workflow.decision.questions.length ? 'needs-information' : 'proposed';
  for (const node of workflow.nodes) {
    node.provenance.status = 'untested';
    node.provenance.testedBy = [];
  }
  return workflow;
}
