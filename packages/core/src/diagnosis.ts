import { randomUUID } from 'node:crypto';
import { createExampleWorkflow, provenance, RUBRIC_VERSION } from './catalog.js';
import { DomainError, validateWorkflow } from './validation.js';
import type { Workflow } from './types.js';

export function diagnoseWorkflow(
  description: string,
  options: { name?: string; exampleId?: string } = {},
): Workflow {
  const text = description.trim();
  if (!text || text.length > 12000)
    throw new DomainError('Describe the workflow in 1–12000 characters.', 400);
  if (options.exampleId)
    return createExampleWorkflow(options.exampleId, { description: text, name: options.name });
  const now = new Date().toISOString();
  const csv = /\bcsv\b/i.test(text) && /validat|clean|normaliz|rout/i.test(text);
  const triage =
    /inbound|incoming|support|customer/i.test(text) &&
    /triage|classif|rout/i.test(text) &&
    /request|ticket|message|email/i.test(text);
  const support =
    /knowledge|polic|source|corpus/i.test(text) && /answer|support|question/i.test(text);
  const explicitFields = csv && /\bamount\b/i.test(text) && /\bregion\b/i.test(text);
  // A scaffold is executable only when the installed operation genuinely matches supplied requirements.
  if (explicitFields || triage || support) {
    const workflow = createExampleWorkflow(
      explicitFields ? 'csv-routing' : triage ? 'inbound-triage' : 'knowledge-support',
      {
        name:
          options.name ??
          (csv ? 'CSV workflow' : triage ? 'Request triage' : 'Source-grounded support'),
        description: text,
      },
    );
    workflow.exampleId = null;
    workflow.tests = [];
    workflow.sampleInput = {};
    workflow.brief.goal = text;
    workflow.brief.constraints = [text, ...workflow.brief.constraints];
    workflow.brief.unknowns = [
      csv
        ? 'Confirm CSV header names and the north/south/east/west routing map.'
        : triage
          ? 'Confirm billing/technical/sales/review routes and provide representative messages.'
          : 'Replace or explicitly accept the supplied synthetic support corpus.',
      'Provide acceptance cases and an acceptable error rate.',
    ];
    workflow.decision.status = 'needs-information';
    workflow.decision.recommendation =
      'Review this bounded starter design and supply acceptance cases before enabling it.';
    workflow.decision.rationale =
      'The installed recipe matches part of your description. Its taxonomy, corpus, and adapter limits remain assumptions; no example data was substituted for your inputs.';
    workflow.decision.questions = [...workflow.brief.unknowns];
    for (const node of workflow.nodes) {
      node.provenance.status = 'unresolved';
      node.provenance.testedBy = [];
    }
    return validateWorkflow(workflow);
  }
  const manual = /checklist|manual|procedure|handoff|meeting|organize/i.test(text);
  const questions = [
    'What input starts the process, and what exact output should it produce?',
    'Can you provide one normal example and one exception, with the desired result?',
    'Which actions require approval, and what constraints must the solution preserve?',
  ];
  return validateWorkflow({
    id: randomUUID(),
    name: options.name ?? (manual ? 'Clarify the process' : 'New workflow brief'),
    description: text,
    revision: 1,
    schemaVersion: '2.0',
    rubricVersion: RUBRIC_VERSION,
    exampleId: null,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    brief: {
      goal: text,
      inputs: 'Not specified',
      outputs: 'Not specified',
      volume: 'Not specified',
      constraints: [text, 'No external actions are authorized by this diagnostic'],
      successCriteria: ['Agree on one normal case and one exception before implementation'],
      unknowns: questions,
    },
    decision: {
      recommendation: manual
        ? 'Start with a clearer procedure and explicit ownership.'
        : 'Clarify the process before choosing automation.',
      rationale:
        'There is not enough evidence to justify a specialized system. A procedure or deterministic solution may satisfy the goal with less maintenance.',
      candidateId: 'manual',
      evidenceIds: ['rubric-v2', 'legacy-ambiguous'],
      status: 'needs-information',
      questions,
    },
    candidates: [
      {
        id: 'manual',
        name: 'Process clarification',
        archetype: 'manual',
        summary: 'Define inputs, outputs, responsibility, and exceptions first.',
        tradeoffs: ['Requires human work', 'Avoids automating an unverified process'],
        evidenceIds: ['rubric-v2'],
        requiresModel: false,
        implementation: 'rules',
      },
    ],
    nodes: [
      {
        id: 'clarify',
        label: 'Define the acceptance case',
        description: 'This is a diagnostic placeholder. It has no business effect.',
        kind: 'transform',
        archetype: 'manual',
        config: { operation: 'identity' },
        provenance: {
          ...provenance(text, 'Inputs and success criteria are missing.', ['legacy-ambiguous']),
          status: 'unresolved',
        },
      },
    ],
    edges: [],
    tests: [],
    sampleInput: {},
    designSource: 'local-rubric',
    model: null,
  });
}
