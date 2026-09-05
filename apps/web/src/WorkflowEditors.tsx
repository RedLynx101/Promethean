import { useState, type FormEvent } from 'react';
import type { Brief, JsonRecord, TestCase, Workflow, WorkflowPatch } from '@promethean/core';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { ErrorMessage, Modal } from './components';

const lines = (value: string) =>
  value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
export function BriefEditor({
  workflow,
  onClose,
  save,
}: {
  workflow: Workflow;
  onClose: () => void;
  save: (patch: WorkflowPatch) => Promise<void>;
}) {
  const key = `promethean-brief-draft-${workflow.id}-${workflow.revision}`;
  const [draft, setDraft] = useState<{ description: string; brief: Brief }>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch {
      /* Use the persisted version. */
    }
    return { description: workflow.description, brief: workflow.brief };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState(false);
  function update(value: typeof draft) {
    setDraft(value);
    localStorage.setItem(key, JSON.stringify(value));
    setReview(false);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!review) {
      setReview(true);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await save({ expectedRevision: workflow.revision, ...draft });
      localStorage.removeItem(key);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={review ? 'Review brief changes' : 'Clarify the workflow'} onClose={onClose} wide>
      <form onSubmit={(e) => void submit(e)}>
        {review ? (
          <>
            <p>
              These changes create a new revision. Existing runs and tests retain their original
              meaning.
            </p>
            <div className="change-review">
              <div>
                <div className="section-label">BEFORE</div>
                <p>{workflow.description}</p>
                <pre>{JSON.stringify(workflow.brief, null, 2)}</pre>
              </div>
              <div>
                <div className="section-label">AFTER</div>
                <p>{draft.description}</p>
                <pre>{JSON.stringify(draft.brief, null, 2)}</pre>
              </div>
            </div>
            <button className="text-button" type="button" onClick={() => setReview(false)}>
              Back to editing
            </button>
          </>
        ) : (
          <>
            <p className="muted">
              Answer what changes the design. Your draft stays on this device until saved or
              discarded.
            </p>
            <label className="form-label">
              Workflow description
              <textarea
                rows={3}
                required
                maxLength={12000}
                value={draft.description}
                onChange={(e) => update({ ...draft, description: e.target.value })}
              />
            </label>
            {(['goal', 'inputs', 'outputs', 'volume'] as const).map((field) => (
              <label className="form-label" key={field}>
                {
                  {
                    goal: 'Desired outcome',
                    inputs: 'Available inputs',
                    outputs: 'Required outputs',
                    volume: 'Frequency and volume',
                  }[field]
                }
                <input
                  required
                  maxLength={2000}
                  value={draft.brief[field]}
                  onChange={(e) =>
                    update({ ...draft, brief: { ...draft.brief, [field]: e.target.value } })
                  }
                />
              </label>
            ))}
            {(['constraints', 'successCriteria', 'unknowns'] as const).map((field) => (
              <label className="form-label" key={field}>
                {
                  {
                    constraints: 'Constraints — one per line',
                    successCriteria: 'Acceptance criteria — one per line',
                    unknowns: 'Unanswered questions — remove only when resolved',
                  }[field]
                }
                <textarea
                  rows={3}
                  value={draft.brief[field].join('\n')}
                  onChange={(e) =>
                    update({ ...draft, brief: { ...draft.brief, [field]: lines(e.target.value) } })
                  }
                />
              </label>
            ))}
          </>
        )}
        {error && <ErrorMessage message={error} />}
        <div className="modal-actions">
          <button
            className="text-button"
            type="button"
            onClick={() => {
              localStorage.removeItem(key);
              onClose();
            }}
          >
            Discard draft
          </button>
          <button className="button primary" disabled={busy}>
            {review ? 'Save revision' : 'Review changes'}
            <ArrowRight size={14} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

type EditableCase = Omit<TestCase, 'input' | 'expected'> & {
  inputText: string;
  expectedText: string;
};
export function TestSetEditor({
  workflow,
  onClose,
  save,
}: {
  workflow: Workflow;
  onClose: () => void;
  save: (patch: WorkflowPatch) => Promise<void>;
}) {
  const key = `promethean-tests-draft-${workflow.id}-${workflow.revision}`;
  const [cases, setCases] = useState<EditableCase[]>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch {
      /* use source */
    }
    return workflow.tests.map((t) => ({
      ...t,
      inputText: JSON.stringify(t.input, null, 2),
      expectedText: JSON.stringify(t.expected, null, 2),
    }));
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  function update(next: EditableCase[]) {
    setCases(next);
    localStorage.setItem(key, JSON.stringify(next));
    setReview(false);
  }
  function object(text: string, label: string): JsonRecord {
    const value: unknown = JSON.parse(text);
    if (!value || Array.isArray(value) || typeof value !== 'object')
      throw new Error(`${label} must be a JSON object.`);
    return value as JsonRecord;
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const tests = cases.map(({ inputText, expectedText, ...test }) => ({
        ...test,
        input: object(inputText, `${test.name} input`),
        expected: object(expectedText, `${test.name} expected output`),
      }));
      if (tests.some((t) => !Object.keys(t.expected).length))
        throw new Error('Every case needs at least one observable expected output.');
      if (!review) {
        setReview(true);
        return;
      }
      setBusy(true);
      await save({
        expectedRevision: workflow.revision,
        tests,
        sampleInput: tests[0]?.input ?? workflow.sampleInput,
      });
      localStorage.removeItem(key);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={review ? 'Review test set' : 'Define the acceptance cases'}
      onClose={onClose}
      wide
    >
      <form onSubmit={(e) => void submit(e)}>
        <p className="muted">
          Use representative cases with observable outputs. Every implementation receives exactly
          this set. Use synthetic data here; exports omit custom fixtures by default.
        </p>
        {review ? (
          <div className="quiet-callout">
            Revision {workflow.revision} contains {workflow.tests.length} cases. The next revision
            will contain {cases.length}: {cases.map((c) => c.name).join(', ')}. Earlier comparisons
            remain unchanged and become stale.
          </div>
        ) : (
          cases.map((test, index) => (
            <fieldset className="case-editor" key={test.id}>
              <legend>Case {index + 1}</legend>
              <label className="form-label">
                Case name
                <input
                  value={test.name}
                  required
                  maxLength={160}
                  onChange={(e) =>
                    update(cases.map((c, i) => (i === index ? { ...c, name: e.target.value } : c)))
                  }
                />
              </label>
              <label className="form-label">
                What this case checks
                <input
                  value={test.description}
                  maxLength={1000}
                  onChange={(e) =>
                    update(
                      cases.map((c, i) =>
                        i === index ? { ...c, description: e.target.value } : c,
                      ),
                    )
                  }
                />
              </label>
              <div className="case-json">
                {(['inputText', 'expectedText'] as const).map((field) => (
                  <label className="form-label" key={field}>
                    {field === 'inputText' ? 'Input JSON' : 'Expected output JSON'}
                    <textarea
                      aria-label={field === 'inputText' ? 'Input JSON' : 'Expected output JSON'}
                      className="code-input"
                      rows={5}
                      value={test[field]}
                      onChange={(e) =>
                        update(
                          cases.map((c, i) =>
                            i === index ? { ...c, [field]: e.target.value } : c,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
              <button
                className="text-button"
                type="button"
                onClick={() => update(cases.filter((_, i) => i !== index))}
              >
                <Trash2 size={14} />
                Remove case
              </button>
            </fieldset>
          ))
        )}
        {!review && (
          <button
            className="button secondary"
            type="button"
            disabled={cases.length >= 20}
            onClick={() =>
              update([
                ...cases,
                {
                  id: `case-${crypto.randomUUID().slice(0, 8)}`,
                  name: '',
                  description: '',
                  inputText: JSON.stringify(workflow.sampleInput, null, 2),
                  expectedText: '{}',
                },
              ])
            }
          >
            <Plus size={15} />
            Add case
          </button>
        )}
        {error && <ErrorMessage message={error} />}
        <div className="modal-actions">
          <button
            className="text-button"
            type="button"
            onClick={() => {
              localStorage.removeItem(key);
              onClose();
            }}
          >
            Discard draft
          </button>
          {review && (
            <button className="button secondary" type="button" onClick={() => setReview(false)}>
              Back to editing
            </button>
          )}
          <button className="button primary" disabled={busy || !cases.length}>
            {review ? 'Save revision' : 'Review changes'}
            <ArrowRight size={14} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
