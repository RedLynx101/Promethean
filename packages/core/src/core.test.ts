import { describe, expect, test } from 'vitest';
import {
  checksum,
  createExampleWorkflow,
  diagnoseWorkflow,
  evaluateExpected,
  executeDeterministicWorkflow,
  exportPackage,
  importPackage,
  validatePackage,
  validateWorkflow,
} from './index.js';

describe('shared workflow contracts', () => {
  test('the same cases discriminate materially different CSV parsers', () => {
    const workflow = createExampleWorkflow('csv-routing');
    validateWorkflow(workflow);
    const scores = ['rules', 'enhanced-rules'].map(
      (id) =>
        workflow.tests.filter((t) =>
          evaluateExpected(executeDeterministicWorkflow(workflow, id, t.input), t.expected),
        ).length,
    );
    expect(scores).toEqual([2, 3]);
  });
  test('the same triage cases include a requirement that neither baseline satisfies', () => {
    const workflow = createExampleWorkflow('inbound-triage');
    const scores = ['rules', 'enhanced-rules'].map(
      (id) =>
        workflow.tests.filter((t) =>
          evaluateExpected(executeDeterministicWorkflow(workflow, id, t.input), t.expected),
        ).length,
    );
    expect(scores).toEqual([2, 3]);
    expect(workflow.tests).toHaveLength(4);
  });
  test('support answers carry source IDs or explicitly decline without a source', () => {
    const workflow = createExampleWorkflow('knowledge-support');
    const known = executeDeterministicWorkflow(workflow, 'enhanced-rules', workflow.tests[1].input);
    expect(known.citations).toEqual(['kb-password']);
    const unknown = executeDeterministicWorkflow(
      workflow,
      'enhanced-rules',
      workflow.tests[2].input,
    );
    expect(unknown).toMatchObject({ supported: false, citations: [], effectsSuppressed: true });
  });
  test('a gate on one path cannot authorize a bypass', () => {
    const workflow = createExampleWorkflow('inbound-triage');
    workflow.edges.push({ id: 'unsafe-shortcut', source: 'draft', target: 'outbox' });
    expect(() => validateWorkflow(workflow)).toThrow(/Every path/);
  });
  test('changes to an action after approval are rejected', () => {
    const workflow = createExampleWorkflow('inbound-triage');
    workflow.edges = [
      { id: 'a', source: 'validate', target: 'classify' },
      { id: 'b', source: 'classify', target: 'approval' },
      { id: 'c', source: 'approval', target: 'draft' },
      { id: 'd', source: 'draft', target: 'outbox' },
    ];
    expect(() => validateWorkflow(workflow)).toThrow(/before approval/);
  });
  test('graph loss, cycles, fabricated evidence and input incompatibility fail semantically', () => {
    const base = createExampleWorkflow('csv-routing');
    const lost = structuredClone(base);
    lost.nodes = lost.nodes.filter((n) => n.id !== 'normalize');
    expect(() => validateWorkflow(lost)).toThrow(/reference existing/);
    const cyclic = structuredClone(base);
    cyclic.edges.push({ id: 'loop', source: 'route', target: 'validate' });
    expect(() => validateWorkflow(cyclic)).toThrow();
    const evidence = structuredClone(base);
    evidence.decision.evidenceIds = ['invented-source'];
    expect(() => validateWorkflow(evidence)).toThrow(/unknown evidence/);
    const incompatible = structuredClone(base);
    incompatible.nodes[0].config.requiredFields = ['message'];
    expect(() => validateWorkflow(incompatible)).toThrow(/requires csv/);
  });
  test('vague and irrelevant input remains unresolved with no specialized graph', () => {
    for (const text of [
      'Automate everything',
      'What is the meaning of life?',
      'We should build ten agents for our meetings',
    ]) {
      const workflow = diagnoseWorkflow(text);
      expect(workflow.decision.status).toBe('needs-information');
      expect(workflow.candidates[0].archetype).toBe('manual');
      expect(workflow.exampleId).toBeNull();
      expect(workflow.nodes).toHaveLength(1);
      expect(workflow.brief.constraints).toContain(text);
    }
    expect(() => diagnoseWorkflow('   ')).toThrow();
  });
  test('recognized custom intake retains constraints and does not invent input data', () => {
    const description =
      'Triage incoming customer requests, but never send a reply without my approval.';
    const workflow = diagnoseWorkflow(description);
    expect(workflow.brief.constraints).toContain(description);
    expect(workflow.sampleInput).toEqual({});
    expect(workflow.tests).toEqual([]);
    expect(workflow.decision.status).toBe('needs-information');
  });
  test('the grader compares expected fields and does not trust confidence', () => {
    expect(
      evaluateExpected({ route: 'billing', confidence: 1, other: 2 }, { route: 'sales' }),
    ).toBe(false);
    expect(evaluateExpected({ route: 'billing', other: 2 }, { route: 'billing' })).toBe(true);
    expect(evaluateExpected({ citations: ['a', 'b'] }, { citations: ['a'] })).toBe(false);
    expect(evaluateExpected({ route: 'billing' }, {})).toBe(false);
    expect(evaluateExpected({ route: { anything: true } }, { route: {} })).toBe(false);
    expect(evaluateExpected({ citations: [] }, { citations: [] })).toBe(true);
    const invalid = createExampleWorkflow('csv-routing');
    invalid.tests[0].expected = { nested: {} };
    expect(() => validateWorkflow(invalid)).toThrow(/substantive/);
  });
  test('portable definitions retain curated fixtures, revalidate and use fresh identities', () => {
    const workflow = createExampleWorkflow('csv-routing'),
      pkg = exportPackage(workflow);
    expect(validatePackage(pkg).valid).toBe(true);
    const imported = importPackage(pkg);
    expect(imported.id).not.toBe(workflow.id);
    expect(imported.tests).toHaveLength(3);
    for (const c of imported.tests)
      expect(
        evaluateExpected(
          executeDeterministicWorkflow(imported, 'enhanced-rules', c.input),
          c.expected,
        ),
      ).toBe(true);
    pkg.workflow.nodes[0].config.maxLength = 20;
    expect(() => validatePackage(pkg)).toThrow(/checksum/i);
  });
  test('exports omit custom fixtures and block known credential fields', () => {
    const workflow = createExampleWorkflow('csv-routing');
    workflow.sampleInput = { csv: 'private customer rows' };
    const pkg = exportPackage(workflow);
    expect(pkg.workflow.sampleInput).toEqual({});
    expect(pkg.workflow.tests).toEqual([]);
    expect(validatePackage(pkg).valid).toBe(true);
    workflow.description = 'sk-' + 'a'.repeat(48);
    expect(() => exportPackage(workflow)).toThrow(/credential/i);
  });
  test('checksum alone does not grant permission to import an unsafe graph', () => {
    const pkg = exportPackage(createExampleWorkflow('inbound-triage'));
    pkg.workflow.edges.push({ id: 'bypass', source: 'draft', target: 'outbox' });
    const { checksum: _old, ...body } = pkg;
    pkg.checksum = checksum(body);
    expect(() => validatePackage(pkg)).toThrow(/Every path/);
  });
  test('checksums survive JSON serialization of absent optional values', () => {
    expect(checksum({ one: 1, omitted: undefined })).toBe(
      checksum(JSON.parse(JSON.stringify({ one: 1, omitted: undefined }))),
    );
  });
});
