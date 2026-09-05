import { supportCorpus } from './catalog.js';
import { hasExpectedAssertion } from './schema.js';
import { DomainError, executionOrder, validateWorkflow } from './validation.js';
import type { Candidate, JsonRecord, Workflow, WorkflowEdge, WorkflowNode } from './types.js';

export const EVALUATOR_VERSION = 'expected-fields-2.0';
export function edgeMatches(edge: WorkflowEdge, sourceOutput: JsonRecord): boolean {
  return (
    !edge.condition ||
    edge.condition === String(sourceOutput.route) ||
    edge.condition === String(sourceOutput.conditionMatched)
  );
}

export function classifyRequest(
  message: string,
  implementation: Candidate['implementation'],
): JsonRecord {
  const text = message.toLowerCase();
  const rules: Array<[string, RegExp]> =
    implementation === 'rules'
      ? [
          ['billing', /\bbilling\b|\binvoice\b/],
          ['technical', /\berror\b|\bbug\b/],
          ['sales', /\bprice\b|\bpurchase\b/],
        ]
      : [
          ['billing', /\bbilling\b|\binvoice\b|charg(?:e|ed)|refund|payment/],
          ['technical', /\berror\b|\bbug\b|broken|crash|locked out|cannot log|can't log/],
          ['sales', /\bprice\b|\bpurchase\b|pricing|quote|buy|subscription/],
        ];
  const matches = rules.filter(([, pattern]) => pattern.test(text)).map(([route]) => route);
  return {
    route: matches.length === 1 ? matches[0] : 'review',
    needsReview: matches.length !== 1,
    reason:
      matches.length === 1
        ? 'Matched the declared deterministic vocabulary.'
        : 'No unique supported route; a person must clarify the request.',
  };
}
export function retrieveSupport(
  message: string,
  implementation: Candidate['implementation'] = 'enhanced-rules',
): JsonRecord {
  const text = message.toLowerCase();
  const ranked = supportCorpus
    .map((doc) => ({
      ...doc,
      score:
        implementation === 'rules'
          ? Number(text.includes(doc.title.toLowerCase()))
          : doc.keywords.filter((k) => text.includes(k)).length,
    }))
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  return {
    citations: ranked.map((doc) => doc.id),
    supported: ranked.length > 0,
    sources: ranked.map((doc) => ({ id: doc.id, title: doc.title, text: doc.text })),
  };
}
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [],
    row: string[] = [];
  let cell = '',
    quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') {
      if (quoted && csv[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' && !quoted) {
      row.push(cell.replace(/\r$/, ''));
      rows.push([...row]);
      row.length = 0;
      cell = '';
    } else cell += c;
  }
  if (quoted) throw new DomainError('CSV contains an unterminated quoted field.');
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push([...row]);
  }
  return rows.filter((r) => r.some(Boolean));
}
export function executeDeterministicStep(
  node: WorkflowNode,
  state: JsonRecord,
  candidate: Candidate,
): JsonRecord {
  switch (node.kind) {
    case 'validate': {
      for (const field of node.config.requiredFields as string[]) {
        if (typeof state[field] !== 'string' || !String(state[field]).trim())
          throw new DomainError(`Missing required input: ${field}.`);
        if (String(state[field]).length > Number(node.config.maxLength))
          throw new DomainError(`Input ${field} exceeds the configured maximum.`);
      }
      if (typeof state.email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email))
        throw new DomainError('The recipient email is invalid.');
      return { validated: true };
    }
    case 'transform': {
      if (node.config.operation === 'identity')
        return {
          diagnosticOnly: node.archetype === 'manual',
          message:
            'Review the brief and supply acceptance examples before implementing this process.',
        };
      const lines = parseCsv(String(state.csv ?? ''));
      if (lines.length < 2 || lines.length > 501)
        throw new DomainError('CSV must contain a header and 1–500 data rows.');
      const headers = lines[0].map((h) => h.trim().toLowerCase());
      if (['id', 'amount', 'region'].some((h) => !headers.includes(h)))
        throw new DomainError('CSV headers must include id, amount, and region.');
      const errors: JsonRecord[] = [];
      const rows = lines.slice(1).flatMap((line, index) => {
        const read = (field: string) => line[headers.indexOf(field)] ?? '';
        const enhanced = candidate.implementation !== 'rules';
        const amountText = enhanced ? read('amount').trim().replace(/^\$/, '') : read('amount');
        const amount = /^\d+(?:\.\d{1,2})?$/.test(amountText) ? Number(amountText) : NaN;
        const region = enhanced ? read('region').trim().toLowerCase() : read('region');
        if (
          !read('id').trim() ||
          !Number.isFinite(amount) ||
          !['north', 'south', 'east', 'west'].includes(region) ||
          line.length !== headers.length
        ) {
          errors.push({ row: index + 2, error: 'Invalid id, amount, region, or column count.' });
          return [];
        }
        return [{ id: read('id').trim(), amount, region, route: `${region}-team` }];
      });
      return {
        rows,
        errors,
        valid: errors.length === 0,
        accepted: rows.length,
        rejected: errors.length,
      };
    }
    case 'condition': {
      const matched = state[String(node.config.field)] === node.config.equals;
      return {
        conditionMatched: matched,
        route: matched ? node.config.trueRoute : node.config.falseRoute,
      };
    }
    case 'classify':
      return classifyRequest(String(state.message ?? ''), candidate.implementation);
    case 'retrieve':
      return retrieveSupport(String(state.message ?? ''), candidate.implementation);
    case 'draft': {
      if (node.config.domain === 'support') {
        const sources = Array.isArray(state.sources)
          ? (state.sources as Array<{ text: string }>)
          : [];
        return {
          draft: sources.length
            ? sources.map((s) => s.text).join(' ')
            : 'I do not have a source for that answer. A person will review your question.',
          citations: state.citations ?? [],
          supported: sources.length > 0,
        };
      }
      return {
        draft:
          state.route === 'review'
            ? 'Thank you for the request. A person will review the details and clarify the next step.'
            : `Thank you for contacting us. Your request is ready for the ${state.route} team to review.`,
        citations: [],
      };
    }
    case 'approval':
      return { approvalRequired: true };
    case 'outbox':
      throw new DomainError('Outbox effects require the durable runtime and a recorded approval.');
  }
}
/** Expected is a subset; extra observability fields do not affect task correctness. */
export function evaluateExpected(actual: unknown, expected: unknown): boolean {
  if (!hasExpectedAssertion(expected)) return false;
  if (Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((value, i) => evaluateExpected(actual[i], value))
    );
  if (expected && typeof expected === 'object')
    return (
      !!actual &&
      typeof actual === 'object' &&
      Object.entries(expected).every(([key, value]) =>
        evaluateExpected((actual as JsonRecord)[key], value),
      )
    );
  return Object.is(actual, expected);
}
export function executeDeterministicWorkflow(
  workflow: Workflow,
  candidateId: string,
  input: JsonRecord,
): JsonRecord {
  validateWorkflow(workflow);
  const candidate = workflow.candidates.find((c) => c.id === candidateId);
  if (!candidate || candidate.requiresModel)
    throw new DomainError('Select an installed deterministic candidate.');
  const state = structuredClone(input);
  const completed = new Map<string, JsonRecord>();
  for (const id of executionOrder(workflow)) {
    const incoming = workflow.edges.filter((e) => e.target === id);
    if (
      incoming.length &&
      !incoming.some((e) => completed.has(e.source) && edgeMatches(e, completed.get(e.source)!))
    )
      continue;
    const node = workflow.nodes.find((n) => n.id === id)!;
    if (node.kind === 'approval' || node.kind === 'outbox') {
      state.effectsSuppressed = true;
      completed.set(id, { effectsSuppressed: true });
      continue;
    }
    const output = executeDeterministicStep(node, state, candidate);
    Object.assign(state, output);
    completed.set(id, output);
  }
  return state;
}
