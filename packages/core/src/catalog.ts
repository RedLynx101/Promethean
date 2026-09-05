import { randomUUID } from 'node:crypto';
import type {
  Candidate,
  Evidence,
  ExampleSummary,
  Provenance,
  Workflow,
  WorkflowNode,
} from './types.js';

export const RUBRIC_VERSION = '2.0';
export const rubric = [
  { level: 'L0', archetype: 'rules', description: 'Deterministic rules or transformations.' },
  {
    level: 'L1',
    archetype: 'model-task',
    description: 'One bounded model task with validated outputs.',
  },
  { level: 'L2', archetype: 'assistant', description: 'A human directs each meaningful action.' },
  {
    level: 'L3',
    archetype: 'ai-workflow',
    description: 'A fixed sequence that includes model tasks.',
  },
  { level: 'L4', archetype: 'tool-agent', description: 'A bounded agent selects permitted tools.' },
  {
    level: 'L5',
    archetype: 'multi-agent',
    description: 'Specialized agents coordinate bounded work.',
  },
] as const;

export const evidenceCatalog: Evidence[] = [
  {
    id: 'rubric-v2',
    title: 'The least complex sufficient solution',
    source: 'docs/architecture/canonical-rubric.md',
    excerpt:
      'A process change or deterministic rule is a valid outcome. Capability and permission are separate. Use task evidence before increasing complexity.',
    category: 'methodology',
    revision: '2.0',
    verified: true,
  },
  {
    id: 'legacy-graph-loss',
    title: 'Historical graph loss regression',
    source: 'archive/alpha/phase-3',
    excerpt:
      'The original evaluation recorded graph content lost between agent stages. Revision-bound patches and semantic graph checks address this failure mode.',
    category: 'failure',
    revision: '3029924',
    verified: true,
  },
  {
    id: 'legacy-ambiguous',
    title: 'Ambiguous intake needs clarification',
    source: 'archive/alpha/phase-3',
    excerpt:
      'The alpha produced overconfident designs for vague or irrelevant descriptions. Missing inputs, outputs, and acceptance criteria must remain visible.',
    category: 'failure',
    revision: '3029924',
    verified: true,
  },
  {
    id: 'csv-fixtures',
    title: 'CSV validation and routing fixture',
    source: 'packages/core/src/catalog.ts',
    excerpt:
      'Synthetic rows exercise numeric parsing, regional routing, and invalid data. No model is necessary for the declared rules.',
    category: 'example',
    revision: '2.0',
    verified: true,
  },
  {
    id: 'triage-fixtures',
    title: 'Inbound request triage fixture',
    source: 'packages/core/src/catalog.ts',
    excerpt:
      'Synthetic requests include direct keywords, semantic variants, and unsupported requests. Simple keyword rules fail some variants; escalation remains an explicit outcome.',
    category: 'example',
    revision: '2.0',
    verified: true,
  },
  {
    id: 'support-corpus',
    title: 'Curated support corpus',
    source: 'packages/core/src/catalog.ts#supportCorpus',
    excerpt:
      'A small synthetic product policy corpus supports cited answers and refusal when the answer is absent. It is an example, not a company policy source.',
    category: 'example',
    revision: '2.0',
    verified: true,
  },
  {
    id: 'common-grader',
    title: 'Independent field-based acceptance grader',
    source: 'packages/core/src/execution.ts#evaluateExpected',
    excerpt:
      'Every candidate receives the same case set and expected fields. The deterministic grader compares expected subsets, not model confidence or self-assigned capability labels.',
    category: 'evaluation',
    revision: '2.0',
    verified: true,
  },
];

export const supportCorpus = [
  {
    id: 'kb-returns',
    title: 'Returns',
    text: 'Unused products may be returned within 30 days of delivery. Start a return in the order portal. A receipt is required.',
    keywords: ['return', 'refund', 'send back', 'unopened', 'receipt'],
  },
  {
    id: 'kb-shipping',
    title: 'Shipping',
    text: 'Standard shipping takes 3 to 5 business days. Tracking appears in the order portal after dispatch.',
    keywords: ['shipping', 'delivery', 'tracking', 'arrive', 'parcel'],
  },
  {
    id: 'kb-password',
    title: 'Password reset',
    text: 'Use Forgot password on the sign-in page. Reset links expire after 30 minutes. Support never needs your password.',
    keywords: ['password', 'sign in', 'login', 'locked out', 'account access'],
  },
];

export function searchEvidence(query = ''): Evidence[] {
  const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
  if (!terms.length) return structuredClone(evidenceCatalog);
  return evidenceCatalog
    .map((e) => ({
      e,
      score: terms.reduce(
        (n, t) => n + Number(`${e.title} ${e.excerpt} ${e.category}`.toLowerCase().includes(t)),
        0,
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => structuredClone(x.e));
}

export const exampleCatalog: ExampleSummary[] = [
  {
    id: 'csv-routing',
    name: 'Clean and route a CSV',
    description:
      'Validate incoming orders, normalize values, and route valid rows with explicit deterministic rules.',
    archetype: 'rules',
    stepCount: 3,
    inputDescription: 'A synthetic CSV of orders with id, amount and region.',
  },
  {
    id: 'inbound-triage',
    name: 'Triage incoming requests',
    description:
      'Classify requests, prepare a reply, and review it before writing to a local outbox.',
    archetype: 'ai-workflow',
    stepCount: 5,
    inputDescription: 'A synthetic message and customer email.',
  },
  {
    id: 'knowledge-support',
    name: 'Answer with source evidence',
    description:
      'Retrieve a small supplied knowledge base, draft a cited answer, and require human review.',
    archetype: 'tool-agent',
    stepCount: 5,
    inputDescription: 'A synthetic support question and email.',
  },
];

export function provenance(
  requirement: string,
  rationale: string,
  evidenceIds: string[],
): Provenance {
  return {
    requirement,
    rationale,
    evidenceIds: ['rubric-v2', ...evidenceIds],
    alternatives: ['Manual review', 'A more capable model does not remove approval requirements'],
    rubricVersion: RUBRIC_VERSION,
    testedBy: [],
    status: 'untested',
  };
}
function node(
  id: string,
  label: string,
  kind: WorkflowNode['kind'],
  config: WorkflowNode['config'],
  evidenceId: string,
  description: string,
): WorkflowNode {
  return {
    id,
    label,
    description,
    kind,
    archetype: ['classify', 'draft'].includes(kind)
      ? 'model-task'
      : kind === 'retrieve'
        ? 'tool-agent'
        : kind === 'approval'
          ? 'assistant'
          : 'rules',
    config,
    provenance: provenance(
      description,
      `A bounded ${kind} step with explicit inputs and outputs.`,
      [evidenceId],
    ),
  };
}
export function createExampleWorkflow(
  exampleId: string,
  overrides: { id?: string; name?: string; description?: string } = {},
): Workflow {
  const example = exampleCatalog.find((x) => x.id === exampleId);
  if (!example)
    throw new Error('Unknown example. Choose csv-routing, inbound-triage, or knowledge-support.');
  const csv = exampleId === 'csv-routing',
    triage = exampleId === 'inbound-triage';
  const evidenceId = csv ? 'csv-fixtures' : triage ? 'triage-fixtures' : 'support-corpus';
  const candidates: Candidate[] = [
    {
      id: 'rules',
      name: 'Simple rules',
      archetype: 'rules',
      summary: csv
        ? 'Strict field parsing and exact region matching.'
        : triage
          ? 'Direct billing, technical, and sales keywords.'
          : 'Exact policy-title matching.',
      tradeoffs: ['Easy to inspect', 'Misses phrasing outside the declared rules'],
      evidenceIds: [evidenceId],
      requiresModel: false,
      implementation: 'rules',
    },
    {
      id: 'enhanced-rules',
      name: csv ? 'Normalized rules' : triage ? 'Expanded rules' : 'Keyword retrieval',
      archetype: 'rules',
      summary: csv
        ? 'Normalize whitespace, currency, and regional aliases before validation.'
        : triage
          ? 'Recognize explicit synonyms and handle uncertain requests.'
          : 'Score policy keywords and return a cited extract.',
      tradeoffs: [
        'Still deterministic and inexpensive',
        'Coverage is limited to the curated vocabulary',
      ],
      evidenceIds: [evidenceId],
      requiresModel: false,
      implementation: 'enhanced-rules',
    },
    ...(!csv
      ? [
          {
            id: 'model',
            name: 'Bounded model workflow',
            archetype: (triage ? 'ai-workflow' : 'tool-agent') as Candidate['archetype'],
            summary: triage
              ? 'Use structured interpretation and draft under the same approval gate.'
              : 'Retrieve policies through a typed tool and draft only from supported sources.',
            tradeoffs: ['Handles varied language', 'Adds measured cost and variable output'],
            evidenceIds: [evidenceId],
            requiresModel: true,
            implementation: 'model' as const,
          },
        ]
      : []),
  ];
  const nodes = csv
    ? [
        node(
          'validate',
          'Check the input',
          'validate',
          { requiredFields: ['csv'], maxLength: 16000 },
          evidenceId,
          'Require a CSV string with a bounded size.',
        ),
        node(
          'normalize',
          'Validate and normalize rows',
          'transform',
          { operation: 'csv-normalize' },
          evidenceId,
          'Reject invalid amount or region values; keep the row-level error.',
        ),
        node(
          'route',
          'Route valid orders',
          'condition',
          { field: 'valid', equals: true, trueRoute: 'ready', falseRoute: 'review' },
          evidenceId,
          'Only clean orders enter the ready route.',
        ),
      ]
    : [
        node(
          'validate',
          'Check the request',
          'validate',
          { requiredFields: ['message', 'email'], maxLength: 8000 },
          evidenceId,
          'Require a message and syntactically valid recipient email.',
        ),
        triage
          ? node(
              'classify',
              'Choose a route',
              'classify',
              { domain: 'triage' },
              evidenceId,
              'Choose billing, technical, sales, or review; preserve uncertainty.',
            )
          : node(
              'retrieve',
              'Find supporting policy',
              'retrieve',
              { corpusId: 'support-v1' },
              evidenceId,
              'Retrieve only the supplied policies; unknown answers require review.',
            ),
        node(
          'draft',
          'Prepare the response',
          'draft',
          { domain: triage ? 'triage' : 'support' },
          evidenceId,
          'Prepare a concise response and retain its supporting citations.',
        ),
        node(
          'approval',
          'Review before delivery',
          'approval',
          { action: 'local-outbox' },
          evidenceId,
          'A person must approve this exact revision and prepared action.',
        ),
        node(
          'outbox',
          'Write to the local outbox',
          'outbox',
          { adapter: 'local-outbox' },
          evidenceId,
          'Write one local demonstration message. No email is sent.',
        ),
      ];
  const now = new Date().toISOString();
  const workflow: Workflow = {
    id: overrides.id ?? randomUUID(),
    name: overrides.name ?? example.name,
    description: overrides.description ?? example.description,
    revision: 1,
    schemaVersion: '2.0',
    rubricVersion: RUBRIC_VERSION,
    exampleId,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    brief: {
      goal: example.description,
      inputs: example.inputDescription,
      outputs: csv
        ? 'Validated rows and ready/review routes'
        : 'A proposed answer and reviewed local outbox record',
      volume: 'Manual example runs; no schedule is configured',
      constraints: [
        'Do not execute arbitrary code',
        'Local demonstration data only',
        ...(csv
          ? ['No model is necessary']
          : ['Human approval before the local outbox', 'No external delivery']),
      ],
      successCriteria: csv
        ? ['Reject malformed rows', 'Route each valid row deterministically']
        : ['Use the correct route or escalate uncertainty', 'Do not deliver without an approval'],
      unknowns: [
        'Production data distribution and operational error tolerance have not been measured',
      ],
    },
    decision: {
      recommendation: 'Start with the deterministic candidate and compare the shared test cases.',
      rationale:
        'The curated cases make the tradeoff inspectable. Escalate complexity only when measured results justify it.',
      candidateId: 'enhanced-rules',
      evidenceIds: ['rubric-v2', evidenceId, 'common-grader'],
      status: 'proposed',
      questions: [],
    },
    candidates,
    nodes,
    edges: nodes
      .slice(1)
      .map((n, i) => ({ id: `${nodes[i].id}-${n.id}`, source: nodes[i].id, target: n.id })),
    tests: csv
      ? [
          {
            id: 'csv-clean',
            name: 'Clean order',
            input: { csv: 'id,amount,region\nA1,42,north' },
            expected: {
              valid: true,
              route: 'ready',
              rows: [{ id: 'A1', amount: 42, region: 'north', route: 'north-team' }],
            },
            description: 'Both candidates should accept explicit valid fields.',
          },
          {
            id: 'csv-normalize',
            name: 'Formatting variants',
            input: { csv: 'id,amount,region\nA2,$25, North ' },
            expected: { valid: true, route: 'ready' },
            description:
              'The simple parser rejects the currency marker; normalization should accept it.',
          },
          {
            id: 'csv-invalid',
            name: 'Invalid amount',
            input: { csv: 'id,amount,region\nA3,many,north' },
            expected: { valid: false, route: 'review' },
            description: 'Neither implementation may invent a numeric value.',
          },
        ]
      : triage
        ? [
            {
              id: 'triage-billing',
              name: 'Explicit billing request',
              input: {
                message: 'I have a billing question about my invoice.',
                email: 'sample@example.invalid',
              },
              expected: { route: 'billing' },
              description: 'A direct keyword baseline.',
            },
            {
              id: 'triage-synonym',
              name: 'A charge described indirectly',
              input: {
                message: 'I was charged twice for the same order.',
                email: 'sample@example.invalid',
              },
              expected: { route: 'billing' },
              description: 'Expanded rules recognize a phrase missed by the simple baseline.',
            },
            {
              id: 'triage-technical',
              name: 'Technical failure',
              input: {
                message: 'The page shows an error when I open the dashboard.',
                email: 'sample@example.invalid',
              },
              expected: { route: 'technical' },
              description: 'A technical issue requires the technical route.',
            },
            {
              id: 'triage-unknown',
              name: 'Unsupported request',
              input: {
                message: 'Can you coordinate a custom international logistics contract?',
                email: 'sample@example.invalid',
              },
              expected: { route: 'specialist' },
              description:
                'The declared taxonomy cannot satisfy this requested route. This intentionally shows that neither deterministic candidate qualifies for all requirements.',
            },
          ]
        : [
            {
              id: 'support-return',
              name: 'Return policy',
              input: { message: 'What is your returns policy?', email: 'sample@example.invalid' },
              expected: { citations: ['kb-returns'], supported: true },
              description: 'A known policy question with direct words.',
            },
            {
              id: 'support-synonym',
              name: 'Password phrasing',
              input: { message: 'I am locked out of my account.', email: 'sample@example.invalid' },
              expected: { citations: ['kb-password'], supported: true },
              description: 'Keyword retrieval recognizes a synonym beyond a title match.',
            },
            {
              id: 'support-unknown',
              name: 'No source available',
              input: {
                message: 'What is the enterprise uptime guarantee?',
                email: 'sample@example.invalid',
              },
              expected: { citations: [], supported: false },
              description: 'The answer is absent from the corpus; it must be escalated.',
            },
          ],
    sampleInput: csv
      ? { csv: 'id,amount,region\nA1,42,north\nA2,$25, South ' }
      : {
          message: triage
            ? 'I was charged twice for the same order.'
            : 'How do I return an unopened product?',
          email: 'sample@example.invalid',
        },
    designSource: 'local-rubric',
    model: null,
  };
  for (const step of workflow.nodes)
    step.provenance.testedBy = workflow.tests.map((test) => test.id);
  return workflow;
}
