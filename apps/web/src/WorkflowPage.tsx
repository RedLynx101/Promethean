import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useNodesState,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileCheck2,
  GitBranch,
  History,
  List,
  Play,
  RotateCcw,
  ShieldCheck,
  Square,
  X,
} from 'lucide-react';
import type {
  Comparison,
  Evidence,
  JsonRecord,
  RunMode,
  Workflow,
  WorkflowDetail,
  WorkflowNode,
  WorkflowPatch,
  WorkflowRun,
  Workspace,
} from '@promethean/core';
import { api, downloadJson } from './api';
import { BriefEditor, TestSetEditor } from './WorkflowEditors';
import {
  duration,
  Empty,
  ErrorMessage,
  Level,
  Loading,
  Modal,
  money,
  names,
  ProvenancePanel,
  relativeDate,
  Status,
} from './components';

interface Props {
  id: string;
  route: string;
  workspace: Workspace;
  refreshWorkspace: () => Promise<void>;
  notify: (message: string) => void;
  onEvidence: (item: Evidence) => void;
}
export function WorkflowPage({
  id,
  route,
  workspace,
  refreshWorkspace,
  notify,
  onEvidence,
}: Props) {
  const [detail, setDetail] = useState<WorkflowDetail | null>(null);
  const [error, setError] = useState('');
  const [runDialog, setRunDialog] = useState(false);
  const [history, setHistory] = useState(false);
  const [busy, setBusy] = useState('');
  const [selectedRunId, setSelectedRunId] = useState('');
  const tab = route.split('/')[3] || 'brief';
  const load = useCallback(async () => {
    try {
      setDetail(await api.workflow(id));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => {
    setDetail(null);
    setSelectedRunId('');
    void load();
  }, [load]);
  const pending = detail?.runs.some((r) => r.status === 'queued' || r.status === 'running');
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => void load(), 1000);
    return () => clearInterval(timer);
  }, [pending, load]);
  async function action(name: string, fn: () => Promise<void>, rethrow = false) {
    setBusy(name);
    try {
      await fn();
      await load();
      await refreshWorkspace();
    } catch (e) {
      notify((e as Error).message);
      if (rethrow) throw e;
    } finally {
      setBusy('');
    }
  }
  if (error)
    return (
      <div className="page">
        <ErrorMessage message={error} retry={() => void load()} />
        <a className="text-link" href="#/">
          Back to studio
        </a>
      </div>
    );
  if (!detail) return <Loading />;
  const { workflow, runs, comparisons, versions } = detail;
  const activeRun = runs.find((r) => r.id === selectedRunId) ?? runs[0];
  return (
    <div className="workflow-page">
      <header className="workflow-header">
        <a href="#/" className="back-link">
          <ArrowLeft size={14} />
          Studio
        </a>
        <div className="workflow-title-row">
          <div>
            <div className="eyebrow">
              {workflow.exampleId ? 'EXAMPLE WORKFLOW' : 'YOUR WORKFLOW'} <span> / </span> REVISION{' '}
              {workflow.revision}
            </div>
            <h1>{workflow.name}</h1>
          </div>
          <div className="workflow-actions">
            <button
              className="icon-button"
              title="Version history"
              aria-label="Version history"
              onClick={() => setHistory(true)}
            >
              <History size={18} />
            </button>
            <button
              className="button secondary"
              disabled={Boolean(busy)}
              onClick={() =>
                void action('export', async () => {
                  downloadJson(
                    await api.export(id),
                    `${workflow.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.promethean.json`,
                  );
                  notify('Portable workflow package exported.');
                })
              }
            >
              <Download size={15} />
              <span>Export</span>
            </button>
            <button
              className="button primary"
              onClick={() => setRunDialog(true)}
              disabled={!workflow.nodes.length || Boolean(busy)}
            >
              <Play size={14} />
              Run a test
            </button>
          </div>
        </div>
        <div className="workflow-subline">
          <Status value={workflow.status} />
          <select
            aria-label="Workflow state"
            value={workflow.status}
            disabled={Boolean(busy)}
            onChange={(e) =>
              void action('status', async () => {
                await api.patch(id, {
                  expectedRevision: workflow.revision,
                  status: e.target.value as Workflow['status'],
                });
                notify('Workflow state updated.');
              })
            }
          >
            <option value="draft">Draft</option>
            <option value="validated">Validated</option>
            <option value="tested">Tested</option>
            <option value="enabled">Enabled locally</option>
            <option value="paused">Paused</option>
          </select>
          <span>{workflow.nodes.length} steps</span>
          <span className="dot-separator">·</span>
          <span>
            {workflow.designSource === 'openai' ? 'Designed with OpenAI' : 'Local rubric diagnosis'}
          </span>
        </div>
      </header>
      <nav className="workflow-tabs" aria-label="Workflow views">
        {[
          { id: 'brief', label: 'Brief' },
          { id: 'design', label: 'Design' },
          { id: 'tests', label: 'Tests', count: comparisons.length },
          { id: 'runs', label: 'Runs', count: runs.length },
        ].map((item) => (
          <a
            key={item.id}
            href={`#/workflow/${id}/${item.id}`}
            className={tab === item.id ? 'active' : ''}
            aria-current={tab === item.id ? 'page' : undefined}
          >
            {item.label}
            {item.count ? <span>{item.count}</span> : null}
          </a>
        ))}
      </nav>
      <div className="workflow-content">
        {tab === 'brief' ? (
          <BriefView
            workflow={workflow}
            evidence={workspace.evidence}
            onEvidence={onEvidence}
            onSave={(patch) =>
              action(
                'brief',
                async () => {
                  await api.patch(id, patch);
                  notify('Brief updated. Review the affected decisions before testing.');
                },
                true,
              )
            }
            busy={Boolean(busy)}
          />
        ) : tab === 'design' ? (
          <DesignView
            workflow={workflow}
            comparisons={comparisons}
            evidence={workspace.evidence}
            onEvidence={onEvidence}
            onSave={(node, update) =>
              action(
                'node',
                async () => {
                  await api.patch(id, {
                    expectedRevision: workflow.revision,
                    nodeEdits: [{ id: node.id, ...update }],
                  });
                  notify('New workflow revision saved.');
                },
                true,
              )
            }
            busy={Boolean(busy)}
          />
        ) : tab === 'tests' ? (
          <TestsView
            workflow={workflow}
            onSave={(patch) =>
              action(
                'tests',
                async () => {
                  await api.patch(id, patch);
                  notify('Acceptance cases saved as a new revision.');
                },
                true,
              )
            }
            comparisons={comparisons}
            liveAvailable={workspace.liveAvailable}
            busy={Boolean(busy)}
            onCompare={(mode) =>
              action('compare', async () => {
                await api.compare(id, mode);
                notify('Comparison completed on the same test cases.');
              })
            }
          />
        ) : (
          <RunsView
            workflow={workflow}
            sourceWorkflow={
              versions.find((v) => v.revision === activeRun?.workflowRevision)?.workflow ?? workflow
            }
            runs={runs}
            activeRun={activeRun}
            selectedRunId={selectedRunId}
            selectRun={setSelectedRunId}
            busy={Boolean(busy)}
            runTest={() => setRunDialog(true)}
            approve={(decision) =>
              activeRun &&
              action('approval', async () => {
                await api.approve(activeRun.id, decision, activeRun.workflowRevision);
                notify(
                  decision === 'approve'
                    ? 'Action approved for this run.'
                    : 'Action denied. No outbox item created.',
                );
              })
            }
            cancel={() =>
              activeRun &&
              action('cancel', async () => {
                await api.cancel(activeRun.id);
              })
            }
            retry={() =>
              activeRun &&
              action('retry', async () => {
                const run = await api.retry(activeRun.id, workflow.revision);
                setSelectedRunId(run.id);
                notify('A new run was created. The original trace is unchanged.');
              })
            }
          />
        )}
      </div>
      {runDialog && (
        <RunDialog
          workflow={workflow}
          liveAvailable={workspace.liveAvailable}
          onClose={() => setRunDialog(false)}
          onRun={async (input, candidateId, mode) => {
            const run = await api.run(id, input, candidateId, mode);
            setSelectedRunId(run.id);
            setRunDialog(false);
            location.hash = `/workflow/${id}/runs`;
            await load();
            await refreshWorkspace();
          }}
        />
      )}
      {history && (
        <Modal title="Version history" onClose={() => setHistory(false)} wide>
          <p className="muted modal-intro">
            Every accepted edit creates a revision. Previous decisions remain inspectable.
          </p>
          <div className="version-list">
            {versions.length ? (
              versions.map((v) => (
                <details key={v.revision}>
                  <summary>
                    <span className="revision-mark">{v.revision}</span>
                    <span>
                      <strong>{v.reason}</strong>
                      <small>{new Date(v.createdAt).toLocaleString()}</small>
                    </span>
                    <ChevronDown size={17} />
                  </summary>
                  <div className="version-content">
                    <p>{v.workflow.description}</p>
                    <div className="section-label">DECISION AT THIS REVISION</div>
                    <p>{v.workflow.decision.recommendation}</p>
                    <p className="muted">{v.workflow.decision.rationale}</p>
                    {v.revision !== workflow.revision && (
                      <button
                        className="button secondary"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          void action('restore', async () => {
                            await api.patch(id, {
                              expectedRevision: workflow.revision,
                              name: v.workflow.name,
                              description: v.workflow.description,
                              brief: v.workflow.brief,
                              tests: v.workflow.tests,
                              sampleInput: v.workflow.sampleInput,
                              candidateId: v.workflow.decision.candidateId,
                              nodeEdits: v.workflow.nodes.map((n) => ({
                                id: n.id,
                                label: n.label,
                                description: n.description,
                                kind: n.kind,
                                config: n.config,
                              })),
                            });
                            setHistory(false);
                            notify('Earlier design restored as a new draft revision.');
                          })
                        }
                      >
                        <RotateCcw size={14} />
                        Restore as a new revision
                      </button>
                    )}
                    <ul className="quiet-list">
                      {v.workflow.nodes.map((n) => (
                        <li key={n.id}>
                          <Level archetype={n.archetype} />
                          {n.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              ))
            ) : (
              <p>No earlier revisions.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function BriefView({
  workflow,
  evidence,
  onEvidence,
  onSave,
  busy,
}: {
  workflow: Workflow;
  evidence: Evidence[];
  onEvidence: (e: Evidence) => void;
  onSave: (patch: WorkflowPatch) => Promise<void>;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const candidate = workflow.candidates.find((c) => c.id === workflow.decision.candidateId);
  return (
    <div className="brief-grid">
      <div className="brief-main">
        <section className="recommendation">
          <div className="section-label">
            <span className="bronze-dot" />
            RECOMMENDED APPROACH
          </div>
          <h2>{workflow.decision.recommendation}</h2>
          <p>{workflow.decision.rationale}</p>
          {candidate && (
            <div className="recommendation-bottom">
              <span className="inline-note">
                <Level archetype={candidate.archetype} />
                {names[candidate.archetype]}
              </span>
              <a className="text-link" href={`#/workflow/${workflow.id}/design`}>
                Inspect the design
                <ArrowRight size={14} />
              </a>
            </div>
          )}
        </section>
        {(workflow.decision.questions.length > 0 || workflow.brief.unknowns.length > 0) && (
          <section className="questions-block">
            <div className="section-label">BEFORE WE GO FURTHER</div>
            <h3>A few things to clarify</h3>
            <ul>
              {[...new Set([...workflow.decision.questions, ...workflow.brief.unknowns])].map(
                (q, i) => (
                  <li key={i}>{q}</li>
                ),
              )}
            </ul>
            <p className="muted">Add these details to your brief, then review the design again.</p>
          </section>
        )}
        <section className="brief-section">
          <div className="section-heading">
            <h3>The workflow brief</h3>
            <button
              className="text-button"
              onClick={() => {
                setEditing(!editing);
              }}
            >
              {editing ? 'Cancel' : 'Edit brief'}
            </button>
          </div>
          <p>{workflow.description}</p>
          {editing && (
            <BriefEditor workflow={workflow} save={onSave} onClose={() => setEditing(false)} />
          )}
          <dl className="brief-facts">
            <div>
              <dt>INPUT</dt>
              <dd>{workflow.brief.inputs}</dd>
            </div>
            <div>
              <dt>OUTPUT</dt>
              <dd>{workflow.brief.outputs}</dd>
            </div>
            <div>
              <dt>VOLUME</dt>
              <dd>{workflow.brief.volume}</dd>
            </div>
          </dl>
        </section>
        <section className="brief-section">
          <h3>What success looks like</h3>
          <ul className="success-list">
            {workflow.brief.successCriteria.map((criterion, i) => (
              <li key={i}>
                <CheckCircle2 size={17} />
                {criterion}
              </li>
            ))}
          </ul>
        </section>
        <section className="brief-section">
          <h3>Alternatives considered</h3>
          <label className="form-label">
            Approach to build
            <select
              disabled={busy}
              value={workflow.decision.candidateId}
              onChange={(e) =>
                void onSave({
                  expectedRevision: workflow.revision,
                  candidateId: e.target.value,
                }).catch(() => undefined)
              }
            >
              {workflow.candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="candidate-list">
            {workflow.candidates.map((c) => (
              <div key={c.id} className="candidate-row">
                <Level archetype={c.archetype} />
                <div>
                  <strong>{c.name}</strong>
                  <p>{c.summary}</p>
                  <small>{c.tradeoffs.join(' · ')}</small>
                </div>
                {c.id === workflow.decision.candidateId && (
                  <span className="chosen-label">Recommended</span>
                )}
              </div>
            ))}
          </div>
          <a className="text-link" href={`#/workflow/${workflow.id}/tests`}>
            Compare on the same cases
            <ArrowRight size={14} />
          </a>
        </section>
      </div>
      <aside className="brief-aside">
        <div className="section-label">DESIGN BOUNDARIES</div>
        <h3>Keep the work in scope.</h3>
        <ul className="boundary-list">
          {workflow.brief.constraints.map((constraint, i) => (
            <li key={i}>
              <ShieldCheck size={16} />
              {constraint}
            </li>
          ))}
        </ul>
        <div className="aside-divider" />
        <div className="section-label">SUPPORTING EVIDENCE</div>
        {workflow.decision.evidenceIds.map((id) => {
          const item = evidence.find((e) => e.id === id);
          return item ? (
            <button className="source-button" key={id} onClick={() => onEvidence(item)}>
              <span>{item.title}</span>
              <ArrowUpRight size={14} />
            </button>
          ) : null;
        })}
        <p className="metadata">
          Rubric {workflow.rubricVersion}
          <br />
          Updated {relativeDate(workflow.updatedAt)}
        </p>
      </aside>
    </div>
  );
}

type FlowData = { label: string; step: WorkflowNode; selected: boolean };
function FlowStep({ data }: NodeProps<Node<FlowData>>) {
  return (
    <div className={`flow-step ${data.selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-step-top">
        <Level archetype={data.step.archetype} />
        <span>{data.step.kind}</span>
      </div>
      <strong>{data.label}</strong>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
const nodeTypes = { step: FlowStep };
function WorkflowGraph({
  workflow,
  selected,
  onSelect,
}: {
  workflow: Workflow;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const initial = useMemo(() => {
    let positions: Record<string, { x: number; y: number }> = {};
    try {
      positions = JSON.parse(localStorage.getItem(`promethean-canvas-${workflow.id}`) ?? '{}');
    } catch {
      /* Ignore a corrupt view preference. */
    }
    return workflow.nodes.map((n, i) => ({
      id: n.id,
      type: 'step',
      position: positions[n.id] ?? { x: i % 2 === 0 ? 70 : 390, y: Math.floor(i / 2) * 150 },
      data: { label: n.label, step: n, selected: n.id === selected },
    }));
  }, [workflow, selected]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial);
  useEffect(() => setNodes(initial), [initial, setNodes]);
  const edges = workflow.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    style: { stroke: 'var(--bronze)', strokeWidth: 1.5 },
    labelStyle: { fill: 'var(--muted)', fontSize: 11 },
    type: 'smoothstep',
  }));
  return (
    <div className="graph-canvas" aria-label="Workflow graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => onSelect(node.id)}
        onNodeDragStop={() => {
          const positions = Object.fromEntries(nodes.map((n) => [n.id, n.position]));
          localStorage.setItem(`promethean-canvas-${workflow.id}`, JSON.stringify(positions));
        }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.25}
        maxZoom={1.5}
        nodesConnectable={false}
        deleteKeyCode={null}
      >
        <Background gap={22} size={1} color="var(--line)" />
        <Controls showInteractive={false} />
      </ReactFlow>
      <span className="canvas-note">Drag to arrange · select a step to inspect</span>
    </div>
  );
}
function DesignView({
  workflow,
  comparisons,
  evidence,
  onEvidence,
  onSave,
  busy,
}: {
  workflow: Workflow;
  comparisons: Comparison[];
  evidence: Evidence[];
  onEvidence: (e: Evidence) => void;
  onSave: (
    node: WorkflowNode,
    update: { label: string; description: string; config: JsonRecord },
  ) => Promise<void>;
  busy: boolean;
}) {
  const [view, setView] = useState<'list' | 'graph'>('list');
  const [selected, setSelected] = useState(workflow.nodes[0]?.id ?? '');
  const [edit, setEdit] = useState(false);
  const node = workflow.nodes.find((n) => n.id === selected) ?? workflow.nodes[0];
  if (!workflow.nodes.length)
    return (
      <Empty title="Clarify the brief first">
        A useful design needs a clear input, output, and process.
      </Empty>
    );
  return (
    <>
      <div className="design-toolbar">
        <p>{workflow.nodes.length} steps. Each has a reason to be here.</p>
        <div className="segmented" aria-label="Design view">
          <button
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
          >
            <List size={15} />
            Steps
          </button>
          <button
            className={view === 'graph' ? 'active' : ''}
            onClick={() => setView('graph')}
            aria-pressed={view === 'graph'}
          >
            <GitBranch size={15} />
            Graph
          </button>
        </div>
      </div>
      <div className="design-grid">
        <div>
          {view === 'graph' ? (
            <WorkflowGraph workflow={workflow} selected={node?.id ?? ''} onSelect={setSelected} />
          ) : (
            <ol className="step-list">
              {workflow.nodes.map((step, index) => (
                <li key={step.id}>
                  <button
                    className={`step-row ${node?.id === step.id ? 'selected' : ''}`}
                    onClick={() => setSelected(step.id)}
                    aria-pressed={node?.id === step.id}
                  >
                    <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <div className="step-title">
                        <strong>{step.label}</strong>
                        <Level archetype={step.archetype} />
                      </div>
                      <p>{step.description}</p>
                      <span className="step-kind">
                        {step.kind === 'approval' ? (
                          <ShieldCheck size={12} />
                        ) : (
                          <span className="tiny-dot" />
                        )}
                        {step.kind}
                      </span>
                    </div>
                    <ChevronRight size={17} />
                  </button>
                  {index < workflow.nodes.length - 1 && <div className="step-connector" />}
                </li>
              ))}
            </ol>
          )}
        </div>
        {node && (
          <aside className="inspector">
            <div className="inspector-title">
              <div>
                <div className="section-label">SELECTED STEP</div>
                <h3>{node.label}</h3>
              </div>
              <button className="text-button" onClick={() => setEdit(true)}>
                Edit
              </button>
            </div>
            <ProvenancePanel
              provenance={node.provenance}
              evidence={evidence}
              onEvidence={onEvidence}
            />
            <div className="step-test-evidence">
              <h4>Recorded evaluation</h4>
              {comparisons.find((c) => c.workflowRevision === workflow.revision) ? (
                comparisons
                  .find((c) => c.workflowRevision === workflow.revision)!
                  .results.map((result) => (
                    <p key={result.candidateId}>
                      <strong>{result.name}</strong>:{' '}
                      {
                        result.cases
                          .filter((c) => node.provenance.testedBy.includes(c.caseId))
                          .filter((c) => c.passed).length
                      }{' '}
                      /{' '}
                      {
                        result.cases.filter((c) => node.provenance.testedBy.includes(c.caseId))
                          .length
                      }{' '}
                      linked cases passed.{' '}
                      <a href={`#/workflow/${workflow.id}/tests`}>Inspect results</a>
                    </p>
                  ))
              ) : (
                <p className="muted">
                  No comparison proves this revision yet.
                  {comparisons.length > 0 ? ' Earlier results are stale.' : ''}
                </p>
              )}
            </div>
            <details className="configuration">
              <summary>
                <Braces size={14} />
                Step configuration
                <ChevronDown size={14} />
              </summary>
              <pre>{JSON.stringify(node.config, null, 2)}</pre>
            </details>
          </aside>
        )}
      </div>
      {edit && node && (
        <EditStep
          node={node}
          busy={busy}
          onClose={() => setEdit(false)}
          save={async (update) => {
            await onSave(node, update);
            setEdit(false);
          }}
        />
      )}
    </>
  );
}
function EditStep({
  node,
  busy,
  onClose,
  save,
}: {
  node: WorkflowNode;
  busy: boolean;
  onClose: () => void;
  save: (value: { label: string; description: string; config: JsonRecord }) => Promise<void>;
}) {
  const [label, setLabel] = useState(node.label);
  const [description, setDescription] = useState(node.description);
  const [config, setConfig] = useState(JSON.stringify(node.config, null, 2));
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const parsed: unknown = JSON.parse(config);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object')
        throw new Error('Configuration must be a JSON object.');
      if (!review) {
        setReview(true);
        return;
      }
      await save({ label, description, config: parsed as JsonRecord });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal title={review ? 'Review your changes' : 'Edit step'} onClose={onClose}>
      <form onSubmit={(e) => void submit(e)}>
        {review ? (
          <>
            <p className="muted">
              Saving creates a new revision and marks affected evidence for review.
            </p>
            <div className="change-review">
              <div>
                <div className="section-label">BEFORE</div>
                <h3>{node.label}</h3>
                <p>{node.description}</p>
                <pre>{JSON.stringify(node.config, null, 2)}</pre>
              </div>
              <div>
                <div className="section-label">AFTER</div>
                <h3>{label}</h3>
                <p>{description}</p>
                <pre>{config}</pre>
              </div>
            </div>
          </>
        ) : (
          <>
            <label className="form-label">
              Step name
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                maxLength={120}
              />
            </label>
            <label className="form-label">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
                maxLength={1000}
              />
            </label>
            <label className="form-label">
              Configuration
              <textarea
                className="code-input"
                value={config}
                onChange={(e) => setConfig(e.target.value)}
                rows={5}
              />
            </label>
          </>
        )}
        {error && <ErrorMessage message={error} />}
        <div className="modal-actions">
          {review && (
            <button type="button" className="button secondary" onClick={() => setReview(false)}>
              Back to editing
            </button>
          )}
          <button className="button primary" disabled={busy || !label.trim()}>
            {review ? 'Save revision' : 'Review changes'}
            <ArrowRight size={14} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TestsView({
  workflow,
  onSave,
  comparisons,
  liveAvailable,
  busy,
  onCompare,
}: {
  workflow: Workflow;
  onSave: (patch: WorkflowPatch) => Promise<void>;
  comparisons: Comparison[];
  liveAvailable: boolean;
  busy: boolean;
  onCompare: (mode: RunMode) => Promise<void>;
}) {
  const [mode, setMode] = useState<RunMode>('local');
  const [editingTests, setEditingTests] = useState(false);
  const [selected, setSelected] = useState('');
  const comparison = comparisons.find((c) => c.id === selected) ?? comparisons[0];
  return (
    <div className="tests-view">
      <section className="comparison-intro">
        <div>
          <div className="section-label">ARCHITECTURE COMPARISON</div>
          <h2>Let the results decide.</h2>
          <p>Different implementations. The same inputs and success criteria.</p>
        </div>
        <div className="compare-controls">
          <select
            aria-label="Comparison mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as RunMode)}
            disabled={busy}
          >
            <option value="local">Local implementations</option>
            <option value="live" disabled={!liveAvailable}>
              Include live model
            </option>
          </select>
          <button
            className="button primary"
            disabled={busy || !workflow.tests.length}
            onClick={() => void onCompare(mode)}
          >
            <Play size={14} />
            {busy ? 'Comparing…' : 'Compare approaches'}
          </button>
        </div>
      </section>
      {comparison ? (
        <>
          <div className="results-heading">
            <div className="inline-note">
              <span className="status-dot" />
              Measured results{' '}
              <span className="muted">
                · {comparison.mode === 'live' ? 'Live model comparison' : 'Local execution'}
              </span>
            </div>
            {comparisons.length > 1 && (
              <select
                aria-label="Comparison history"
                value={comparison.id}
                onChange={(e) => setSelected(e.target.value)}
              >
                {comparisons.map((c) => (
                  <option key={c.id} value={c.id}>
                    {new Date(c.createdAt).toLocaleString()} · rev {c.workflowRevision}
                  </option>
                ))}
              </select>
            )}
          </div>
          {comparison.workflowRevision !== workflow.revision && (
            <div className="quiet-callout">
              These results belong to revision {comparison.workflowRevision}. Run the comparison
              again to verify your current changes.
            </div>
          )}
          <div className="comparison-table">
            <div className="comparison-heading">
              <span>APPROACH</span>
              <span>CASES PASSED</span>
              <span>LATENCY</span>
              <span>MODEL COST</span>
            </div>
            {comparison.results.map((result) => (
              <div className="comparison-row" key={result.candidateId}>
                <strong>{result.name}</strong>
                <div className="result-score">
                  <span>
                    {result.passed}
                    <small> / {result.total}</small>
                  </span>
                  <div className="score-track">
                    <div
                      style={{
                        width: `${result.total ? (100 * result.passed) / result.total : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span>{duration(result.usage.latencyMs)}</span>
                <span>{money(result.usage.costUsd)}</span>
              </div>
            ))}
          </div>
          <div className="result-recommendation">
            <ShieldCheck size={20} />
            <div>
              <strong>What the evidence supports</strong>
              <p>{comparison.recommendation}</p>
            </div>
          </div>
          <div className="case-results">
            {comparison.results.map((result) => (
              <details key={result.candidateId}>
                <summary>
                  <span>{result.name} · case results</span>
                  <ChevronDown size={15} />
                </summary>
                <p className="metadata">
                  {result.usage.model ?? 'No model'} · {result.usage.inputTokens.toLocaleString()}{' '}
                  input tokens · {result.usage.outputTokens.toLocaleString()} output tokens. Latency
                  and cost are totals across this case set.
                </p>
                {result.cases.map((c) => (
                  <div className="case-result" key={c.caseId}>
                    <div>
                      <span className={c.passed ? 'pass-icon' : 'fail-icon'}>
                        {c.passed ? <Check size={15} /> : <X size={15} />}
                      </span>
                      <strong>{c.name}</strong>
                      <Status value={c.passed ? 'passed' : 'failed'} />
                    </div>
                    <details>
                      <summary>Inspect expected and actual output</summary>
                      <div className="case-json">
                        <div>
                          <span className="section-label">EXPECTED</span>
                          <pre>{JSON.stringify(c.expected, null, 2)}</pre>
                        </div>
                        <div>
                          <span className="section-label">ACTUAL</span>
                          <pre>{JSON.stringify(c.actual, null, 2)}</pre>
                        </div>
                      </div>
                      {c.error && <ErrorMessage message={c.error} />}
                    </details>
                  </div>
                ))}
              </details>
            ))}
          </div>
          <p className="metadata">
            Workflow revision {comparison.workflowRevision} · rubric {comparison.rubricVersion} ·
            evaluator {comparison.evaluatorVersion}
            <br />
            Case set {comparison.caseSetHash.slice(0, 16)}
          </p>
        </>
      ) : (
        <Empty
          title="A recommendation is a hypothesis."
          action={
            <button
              className="button secondary"
              onClick={() => void onCompare(mode)}
              disabled={busy || !workflow.tests.length}
            >
              Test it against the alternatives
              <ArrowRight size={14} />
            </button>
          }
        >
          Run the included cases to see which approach meets the requirements.
        </Empty>
      )}
      <section className="test-cases">
        <button className="button secondary" onClick={() => setEditingTests(true)} disabled={busy}>
          <FileCheck2 size={15} />
          Edit acceptance cases
        </button>
        <div className="section-heading">
          <h3>
            The test set <span>{workflow.tests.length}</span>
          </h3>
          <span className="muted small-text">Shared by every candidate</span>
        </div>
        {workflow.tests.map((test) => (
          <details key={test.id}>
            <summary>
              <FileCheck2 size={16} />
              <span>
                <strong>{test.name}</strong>
                <small>{test.description}</small>
              </span>
              <ChevronDown size={15} />
            </summary>
            <div className="case-json">
              <div>
                <span className="section-label">INPUT</span>
                <pre>{JSON.stringify(test.input, null, 2)}</pre>
              </div>
              <div>
                <span className="section-label">EXPECTED</span>
                <pre>{JSON.stringify(test.expected, null, 2)}</pre>
              </div>
            </div>
          </details>
        ))}
      </section>
      {editingTests && (
        <TestSetEditor workflow={workflow} onClose={() => setEditingTests(false)} save={onSave} />
      )}
    </div>
  );
}

function RunDialog({
  workflow,
  liveAvailable,
  onClose,
  onRun,
}: {
  workflow: Workflow;
  liveAvailable: boolean;
  onClose: () => void;
  onRun: (input: JsonRecord, candidateId: string, mode: RunMode) => Promise<void>;
}) {
  const [input, setInput] = useState(JSON.stringify(workflow.sampleInput, null, 2));
  const [candidateId, setCandidateId] = useState(workflow.decision.candidateId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const candidate = workflow.candidates.find((c) => c.id === candidateId) ?? workflow.candidates[0];
  const fields = Object.entries(workflow.sampleInput);
  const simple = fields.length > 0 && fields.every(([, v]) => typeof v === 'string');
  const [structured, setStructured] = useState(workflow.sampleInput);
  const [advanced, setAdvanced] = useState(!simple);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const value: unknown = advanced ? JSON.parse(input) : structured;
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Input must be a JSON object.');
      await onRun(value as JsonRecord, candidate.id, candidate.requiresModel ? 'live' : 'local');
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal title="Run a workflow test" onClose={onClose}>
      <form onSubmit={(e) => void submit(e)}>
        <label className="form-label">
          Approach
          <select
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
            disabled={busy}
          >
            {workflow.candidates.map((c) => (
              <option key={c.id} value={c.id} disabled={c.requiresModel && !liveAvailable}>
                {c.name}
                {c.requiresModel ? ' · live model' : ''}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">{candidate?.summary}</p>
        {!advanced ? (
          fields.map(([key]) => (
            <label className="form-label" key={key}>
              {key.replaceAll('_', ' ')}
              <textarea
                rows={3}
                value={String(structured[key] ?? '')}
                onChange={(e) => setStructured({ ...structured, [key]: e.target.value })}
                disabled={busy}
              />
            </label>
          ))
        ) : (
          <label className="form-label">
            Input data (JSON)
            <textarea
              className="code-input"
              rows={9}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
          </label>
        )}
        {simple && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              if (!advanced) setInput(JSON.stringify(structured, null, 2));
              setAdvanced(!advanced);
            }}
          >
            {advanced ? 'Use form fields' : 'Edit as JSON'}
          </button>
        )}
        <div className="quiet-callout">
          <ShieldCheck size={18} />
          <p>
            {candidate?.requiresModel
              ? 'This test uses your OpenAI key and remaining budget.'
              : 'This approach runs locally without model calls.'}{' '}
            Approval steps pause the run. Outbox items stay on this device.
          </p>
        </div>
        {error && <ErrorMessage message={error} />}
        <div className="modal-actions">
          <button className="button primary" disabled={busy}>
            <Play size={14} />
            {busy ? 'Starting…' : 'Start test run'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function RunsView({
  workflow,
  sourceWorkflow,
  runs,
  activeRun,
  selectRun,
  busy,
  runTest,
  approve,
  cancel,
  retry,
}: {
  workflow: Workflow;
  sourceWorkflow: Workflow;
  runs: WorkflowRun[];
  activeRun?: WorkflowRun;
  selectedRunId: string;
  selectRun: (id: string) => void;
  busy: boolean;
  runTest: () => void;
  approve: (decision: 'approve' | 'deny') => void;
  cancel: () => void;
  retry: () => void;
}) {
  const [replay, setReplay] = useState(false);
  const [eventIndex, setEventIndex] = useState(0);
  useEffect(() => {
    setReplay(false);
    setEventIndex(0);
  }, [activeRun?.id]);
  if (!activeRun)
    return (
      <Empty
        title="See the work happen."
        action={
          <button className="button primary" onClick={runTest} disabled={!workflow.nodes.length}>
            <Play size={14} />
            Run your first test
          </button>
        }
      >
        Run a sample through the workflow. Every step, decision, and result appears here.
      </Empty>
    );
  const events = replay ? activeRun.events.slice(0, eventIndex + 1) : activeRun.events;
  return (
    <div className="runs-grid">
      <aside className="run-list">
        <div className="section-label">RUN HISTORY · {runs.length}</div>
        {runs.map((run, index) => (
          <button
            key={run.id}
            className={run.id === activeRun.id ? 'selected' : ''}
            onClick={() => selectRun(run.id)}
          >
            <div>
              <strong>Run {runs.length - index}</strong>
              <Status value={run.status} />
            </div>
            <small>
              {new Date(run.startedAt).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · revision {run.workflowRevision}
            </small>
            <span>
              {run.mode === 'live' ? 'Live model' : 'Local execution'}
              {run.replayOf ? ' · retry' : ''}
            </span>
          </button>
        ))}
      </aside>
      <section className="run-detail">
        <div className="run-heading">
          <div>
            <div className="section-label">{replay ? 'RECORDED REPLAY' : 'EXECUTION TRACE'}</div>
            <h2>
              {activeRun.status === 'completed'
                ? 'Work, accounted for.'
                : activeRun.status === 'awaiting-approval'
                  ? 'A decision is needed.'
                  : activeRun.status === 'failed'
                    ? 'A useful failure.'
                    : activeRun.status === 'denied'
                      ? 'The action was denied.'
                      : activeRun.status === 'cancelled'
                        ? 'The run was cancelled.'
                        : 'Run in progress'}
            </h2>
          </div>
          <button
            className="button secondary"
            onClick={() => {
              setReplay(!replay);
              setEventIndex(0);
            }}
          >
            <History size={15} />
            {replay ? 'Exit replay' : 'Replay trace'}
          </button>
        </div>
        <div className="run-metrics">
          <div>
            <span>STATUS</span>
            <Status value={activeRun.status} />
          </div>
          <div>
            <span>ELAPSED</span>
            <strong>{duration(activeRun.usage.latencyMs)}</strong>
          </div>
          <div>
            <span>MODEL COST</span>
            <strong>{money(activeRun.usage.costUsd)}</strong>
          </div>
          <div>
            <span>TOKENS</span>
            <strong>
              {(activeRun.usage.inputTokens + activeRun.usage.outputTokens).toLocaleString()}
            </strong>
          </div>
        </div>
        {replay ? (
          <div className="replay-controls">
            <div>
              <History size={16} />
              <strong>Read-only replay</strong>
              <span>No actions are executed.</span>
            </div>
            <label>
              Event {Math.min(eventIndex + 1, activeRun.events.length)} of {activeRun.events.length}
              <input
                type="range"
                min={0}
                max={Math.max(0, activeRun.events.length - 1)}
                value={eventIndex}
                onChange={(e) => setEventIndex(Number(e.target.value))}
              />
            </label>
            <button
              className="button secondary"
              disabled={eventIndex >= activeRun.events.length - 1}
              onClick={() => setEventIndex((i) => i + 1)}
            >
              Next event
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <>
            {activeRun.status === 'awaiting-approval' && (
              <div className="approval-panel">
                <ShieldCheck size={22} />
                <div>
                  <h3>Review before continuing</h3>
                  <p>
                    The next action is limited to this run and revision {activeRun.workflowRevision}
                    . The outbox saves locally.
                  </p>
                  <details>
                    <summary>Inspect the proposed output</summary>
                    <pre>{JSON.stringify(activeRun.output, null, 2)}</pre>
                  </details>
                  {activeRun.workflowRevision !== workflow.revision && (
                    <p className="error-text">
                      The workflow has changed. Start a new test against the current revision.
                    </p>
                  )}
                  <div className="approval-actions">
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => approve('deny')}
                    >
                      Deny action
                    </button>
                    <button
                      className="button primary"
                      disabled={busy || activeRun.workflowRevision !== workflow.revision}
                      onClick={() => approve('approve')}
                    >
                      <Check size={15} />
                      Approve this action
                    </button>
                  </div>
                </div>
              </div>
            )}
            {activeRun.error && <ErrorMessage message={activeRun.error} />}
          </>
        )}
        <ol className="event-timeline">
          {events.map((event) => (
            <li key={event.id} className={`event-${event.type}`}>
              <span className="event-marker">
                {event.type === 'failed' ? (
                  <X size={12} />
                ) : event.type === 'approval-required' ? (
                  <ShieldCheck size={12} />
                ) : (
                  <Check size={11} />
                )}
              </span>
              <div>
                <div className="event-heading">
                  <strong>{event.message}</strong>
                  <time>
                    {new Date(event.at).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </time>
                </div>
                <small>
                  {event.type.replaceAll('-', ' ')}
                  {event.nodeId
                    ? ` · ${sourceWorkflow.nodes.find((n) => n.id === event.nodeId)?.label ?? event.nodeId}`
                    : ''}
                </small>
                {(event.input || event.output) && (
                  <details>
                    <summary>
                      Inspect data
                      <ChevronDown size={12} />
                    </summary>
                    <div className="case-json">
                      {event.input && (
                        <div>
                          <span className="section-label">INPUT</span>
                          <pre>{JSON.stringify(event.input, null, 2)}</pre>
                        </div>
                      )}
                      {event.output && (
                        <div>
                          <span className="section-label">OUTPUT</span>
                          <pre>{JSON.stringify(event.output, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </li>
          ))}
        </ol>
        {!replay && (
          <>
            <div className="run-bottom-actions">
              {['queued', 'running', 'awaiting-approval'].includes(activeRun.status) && (
                <button className="button secondary" onClick={cancel} disabled={busy}>
                  <Square size={13} />
                  Cancel run
                </button>
              )}
              {['failed', 'cancelled', 'denied'].includes(activeRun.status) && (
                <button className="button secondary" onClick={retry} disabled={busy}>
                  <RotateCcw size={14} />
                  Retry as a new run
                </button>
              )}
              <a className="text-link" href={`#/workflow/${workflow.id}/design`}>
                Review the design
                <ArrowUpRight size={14} />
              </a>
            </div>
            {activeRun.status === 'completed' && (
              <details className="final-output">
                <summary>
                  <FileCheck2 size={17} />
                  Final output
                  <ChevronDown size={15} />
                </summary>
                <pre>{JSON.stringify(activeRun.output, null, 2)}</pre>
              </details>
            )}
          </>
        )}
        <p className="metadata">
          {activeRun.mode === 'live' ? 'Measured live execution' : 'Measured local execution'} ·
          workflow revision {activeRun.workflowRevision}
          {activeRun.usage.model ? ` · ${activeRun.usage.model}` : ''}
          <br />
          Run {activeRun.id}
          {activeRun.replayOf && <> · derived from {activeRun.replayOf}</>}
        </p>
      </section>
    </div>
  );
}
