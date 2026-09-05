import { workflowSchema } from './schema.js';
import { evidenceCatalog } from './catalog.js';
import type { Workflow } from './types.js';

export class DomainError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export function executionOrder(workflow: Workflow): string[] {
  const indegree = new Map(workflow.nodes.map((n) => [n.id, 0]));
  for (const edge of workflow.edges)
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  const queue = [...indegree].filter(([, count]) => count === 0).map(([id]) => id),
    result: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    result.push(id);
    for (const edge of workflow.edges.filter((e) => e.source === id)) {
      const next = indegree.get(edge.target)! - 1;
      indegree.set(edge.target, next);
      if (next === 0) queue.push(edge.target);
    }
  }
  return result;
}

export function validateWorkflow(value: unknown): Workflow {
  const parsed = workflowSchema.safeParse(value);
  if (!parsed.success)
    throw new DomainError(
      `Invalid workflow: ${parsed.error.issues
        .slice(0, 4)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  const workflow = parsed.data as Workflow;
  const ids = new Set(workflow.nodes.map((n) => n.id));
  if (ids.size !== workflow.nodes.length) throw new DomainError('Node IDs must be unique.');
  for (const [label, values] of [
    ['edge', workflow.edges.map((e) => e.id)],
    ['candidate', workflow.candidates.map((c) => c.id)],
    ['test', workflow.tests.map((t) => t.id)],
  ] as const) {
    if (new Set(values).size !== values.length)
      throw new DomainError(`${label} IDs must be unique.`);
  }
  if (!workflow.candidates.some((c) => c.id === workflow.decision.candidateId))
    throw new DomainError('The recommended candidate does not exist.');
  for (const candidate of workflow.candidates) {
    if (candidate.requiresModel !== (candidate.implementation === 'model'))
      throw new DomainError('Candidate model requirement must match its implementation.');
  }
  for (const edge of workflow.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target))
      throw new DomainError('Every edge must reference existing nodes.');
    if (edge.source === edge.target)
      throw new DomainError('Self-referential edges are not supported.');
    if (
      edge.condition &&
      !['true', 'false', 'ready', 'review', 'billing', 'technical', 'sales'].includes(
        edge.condition,
      )
    )
      throw new DomainError('An edge condition must name a supported route.');
    if (edge.condition && workflow.nodes.find((n) => n.id === edge.source)?.kind !== 'condition')
      throw new DomainError('Only a condition node may define conditional edges.');
  }
  const roots = workflow.nodes.filter((n) => !workflow.edges.some((e) => e.target === n.id));
  if (roots.length !== 1) throw new DomainError('A workflow must have one entry node.');
  const order = executionOrder(workflow);
  if (order.length !== workflow.nodes.length)
    throw new DomainError('Cycles are unsupported. Use bounded, explicit acyclic steps.');
  const knownEvidence = new Set(evidenceCatalog.map((e) => e.id));
  if (
    [...workflow.decision.evidenceIds, ...workflow.candidates.flatMap((c) => c.evidenceIds)].some(
      (id) => !knownEvidence.has(id),
    )
  )
    throw new DomainError('Decision or candidate references unknown evidence.');
  if (
    workflow.nodes.filter((n) => n.kind === 'outbox').length > 1 ||
    workflow.nodes.filter((n) => n.kind === 'approval').length > 1
  )
    throw new DomainError('This runtime supports one reviewed outbox action per workflow.');
  const knownTests = new Set(workflow.tests.map((t) => t.id));
  for (const node of workflow.nodes) {
    if (node.provenance.evidenceIds.some((id) => !knownEvidence.has(id)))
      throw new DomainError(`Unknown evidence reference on ${node.id}.`);
    if (node.provenance.testedBy.some((id) => !knownTests.has(id)))
      throw new DomainError(`Unknown acceptance case on ${node.id}.`);
    if (node.provenance.status === 'supported' && node.provenance.evidenceIds.length === 0)
      throw new DomainError('A supported decision requires source evidence.');
    const config = node.config;
    const allowed: Record<string, string[]> = {
      validate: ['requiredFields', 'maxLength'],
      transform: ['operation'],
      condition: ['field', 'equals', 'trueRoute', 'falseRoute'],
      classify: ['domain'],
      retrieve: ['corpusId'],
      draft: ['domain'],
      approval: ['action'],
      outbox: ['adapter'],
    };
    if (Object.keys(config).some((k) => !allowed[node.kind].includes(k)))
      throw new DomainError(`Unsupported configuration on ${node.id}.`);
    if (
      node.kind === 'validate' &&
      (!Array.isArray(config.requiredFields) ||
        config.requiredFields.some(
          (x) => typeof x !== 'string' || !['message', 'email', 'csv'].includes(x),
        ) ||
        typeof config.maxLength !== 'number' ||
        config.maxLength > 32000 ||
        config.maxLength < 1)
    )
      throw new DomainError('Validation requires known fields and a maxLength of 1–32000.');
    if (
      node.kind === 'transform' &&
      !['csv-normalize', 'identity'].includes(String(config.operation))
    )
      throw new DomainError('Only declared transformations may execute.');
    if (
      node.kind === 'condition' &&
      (typeof config.field !== 'string' ||
        !['valid', 'route', 'supported'].includes(config.field) ||
        !['string', 'boolean'].includes(typeof config.equals) ||
        typeof config.trueRoute !== 'string' ||
        typeof config.falseRoute !== 'string')
    )
      throw new DomainError('Condition configuration is incomplete.');
    if (node.kind === 'classify' && config.domain !== 'triage')
      throw new DomainError('Unknown classifier domain.');
    if (node.kind === 'retrieve' && config.corpusId !== 'support-v1')
      throw new DomainError('Only the curated support-v1 corpus is installed.');
    if (node.kind === 'draft' && !['triage', 'support'].includes(String(config.domain)))
      throw new DomainError('Unknown draft domain.');
    if (node.kind === 'approval' && config.action !== 'local-outbox')
      throw new DomainError('An approval must declare its exact local-outbox action.');
    if (node.kind === 'outbox' && config.adapter !== 'local-outbox')
      throw new DomainError('Only the local outbox adapter is installed.');
  }
  // Dominators are the nodes that occur on EVERY entry-to-node path, not merely one adjacent gate.
  const dominators = new Map<string, Set<string>>();
  for (const id of order) {
    const parents = workflow.edges.filter((e) => e.target === id).map((e) => e.source);
    const common = parents.length ? new Set(dominators.get(parents[0])!) : new Set<string>();
    for (const parent of parents.slice(1))
      for (const ancestor of common)
        if (!dominators.get(parent)!.has(ancestor)) common.delete(ancestor);
    common.add(id);
    dominators.set(id, common);
  }
  for (const outbox of workflow.nodes.filter((n) => n.kind === 'outbox')) {
    const dominating = [...dominators.get(outbox.id)!].map((id) =>
      workflow.nodes.find((n) => n.id === id)!,
    );
    const gate = dominating.find((n) => n.kind === 'approval');
    if (!gate)
      throw new DomainError(
        `Every path to ${outbox.id} must pass an approval. An additive gate with a bypass is unsafe.`,
      );
    const gateIndex = order.indexOf(gate.id),
      outboxIndex = order.indexOf(outbox.id);
    if (
      workflow.nodes.some(
        (n) =>
          order.indexOf(n.id) > gateIndex &&
          order.indexOf(n.id) < outboxIndex &&
          !['approval', 'outbox'].includes(n.kind),
      )
    )
      throw new DomainError(
        'Action-producing steps must finish before approval; edits after approval would invalidate its scope.',
      );
    if (!dominating.some((n) => n.kind === 'validate'))
      throw new DomainError('Outbox paths require input validation.');
    if (!dominating.some((n) => n.kind === 'draft'))
      throw new DomainError('Outbox paths require an explicit draft.');
  }
  // Required values must be validated or produced on every upstream path.
  const fields = new Map<string, Set<string>>();
  for (const id of order) {
    const node = workflow.nodes.find((n) => n.id === id)!;
    const parents = workflow.edges.filter((e) => e.target === id).map((e) => e.source);
    const available = parents.length ? new Set(fields.get(parents[0])!) : new Set<string>();
    for (const parent of parents.slice(1))
      for (const field of available) if (!fields.get(parent)!.has(field)) available.delete(field);
    const requires =
      node.kind === 'classify' || node.kind === 'retrieve'
        ? ['message']
        : node.kind === 'transform' && node.config.operation === 'csv-normalize'
          ? ['csv']
          : node.kind === 'condition'
            ? [String(node.config.field)]
            : node.kind === 'draft'
              ? [node.config.domain === 'support' ? 'sources' : 'route']
              : node.kind === 'outbox'
                ? ['email', 'draft']
                : [];
    for (const field of requires)
      if (!available.has(field))
        throw new DomainError(
          `Step ${id} requires ${field} to be validated or produced on every incoming path.`,
        );
    if (node.kind === 'validate')
      for (const field of node.config.requiredFields as string[]) available.add(field);
    const produces: Record<string, string[]> = {
      transform: node.config.operation === 'csv-normalize' ? ['valid', 'rows', 'errors'] : [],
      classify: ['route', 'needsReview'],
      retrieve: ['sources', 'citations', 'supported'],
      draft: ['draft', 'citations'],
      condition: ['route', 'conditionMatched'],
    };
    for (const field of produces[node.kind] ?? []) available.add(field);
    fields.set(id, available);
  }
  if (
    workflow.nodes.some((n) => n.kind === 'outbox') &&
    !workflow.brief.constraints.some((c) => /approval|review/i.test(c))
  )
    throw new DomainError('The brief must retain the human approval constraint.');
  return workflow;
}
