import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { setImmediate as yieldImmediate } from 'node:timers/promises';
import {
  DomainError,
  EVALUATOR_VERSION,
  edgeMatches,
  checksum,
  diagnoseWorkflow,
  evaluateExpected,
  evidenceCatalog,
  exampleCatalog,
  executeDeterministicStep,
  executionOrder,
  exportPackage,
  importPackage,
  validateWorkflow,
  workflowPatchSchema,
  type Comparison,
  type ComparisonResult,
  type JsonRecord,
  type RunEvent,
  type RunMode,
  type Usage,
  type Workflow,
  type WorkflowDetail,
  type WorkflowPackage,
  type WorkflowPatch,
  type WorkflowRun,
  type Workspace,
} from '@promethean/core';
import { PROMPT_VERSION, SdkAgentExecutor, type AgentExecutor } from '@promethean/agents';
import { Store } from './store.js';

export const emptyUsage = (): Usage => ({
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  model: null,
  latencyMs: 0,
});
export function addUsage(target: Usage, value: Usage): void {
  target.inputTokens += value.inputTokens;
  target.outputTokens += value.outputTokens;
  target.costUsd += value.costUsd;
  target.latencyMs += value.latencyMs;
  if (value.model) target.model = value.model;
}
function event(
  run: WorkflowRun,
  type: RunEvent['type'],
  message: string,
  nodeId: string | null = null,
  output?: JsonRecord,
): void {
  run.events.push({
    id: randomUUID(),
    sequence: run.events.length + 1,
    at: new Date().toISOString(),
    nodeId,
    type,
    message,
    ...(output ? { output } : {}),
  });
}
function terminal(run: WorkflowRun): boolean {
  return ['completed', 'failed', 'cancelled', 'denied'].includes(run.status);
}
function designHash(workflow: Workflow): string {
  return checksum({
    description: workflow.description,
    brief: workflow.brief,
    nodes: workflow.nodes.map(({ provenance: _p, ...node }) => node),
    edges: workflow.edges,
    tests: workflow.tests,
    candidates: workflow.candidates,
  });
}
function assertInput(input: unknown): asserts input is JsonRecord {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Buffer.byteLength(JSON.stringify(input), 'utf8') > 64000
  )
    throw new DomainError('Run input must be a JSON object no larger than 64 KB.', 400);
}

export class WorkflowService {
  readonly agents: AgentExecutor;
  private active = false;
  private closed = false;
  private aborts = new Map<string, AbortController>();
  private idleWaiters: Array<() => void> = [];
  constructor(
    readonly store: Store,
    options: { agents?: AgentExecutor; bootstrap?: boolean; autoStart?: boolean } = {},
  ) {
    store.acquireWorker();
    this.agents = options.agents ?? new SdkAgentExecutor(store);
    if (options.bootstrap !== false) store.bootstrap();
    store.markInterruptedReservations();
    for (const run of store.runs())
      if (run.status === 'running') {
        // Resume from the last durable completed step. Side effects are transactional and deduplicated.
        run.status = 'queued';
        event(
          run,
          'resumed',
          'Recovered after a process restart. Completed steps are retained; an interrupted model step may be executed again under a new cost reservation.',
        );
        store.saveRun(run);
      }
    if (options.autoStart !== false) this.kick();
  }
  workspace(): Workspace {
    return {
      workflows: this.store.workflows(),
      examples: structuredClone(exampleCatalog),
      evidence: structuredClone(evidenceCatalog),
      budget: this.store.budget(),
      liveAvailable: this.agents.available(),
      model: this.agents.model,
    };
  }
  detail(id: string): WorkflowDetail {
    return {
      workflow: this.store.getWorkflow(id),
      runs: this.store.runs(id),
      comparisons: this.store.comparisons(id),
      versions: this.store.versions(id),
    };
  }
  async create(
    description: string,
    options: { name?: string; exampleId?: string; mode?: RunMode } = {},
  ): Promise<Workflow> {
    let workflow = diagnoseWorkflow(description, options);
    if (options.mode === 'live') workflow = (await this.agents.diagnose(workflow)).workflow;
    return this.store.transaction(() => this.store.insertWorkflow(workflow));
  }
  patch(id: string, input: WorkflowPatch): Workflow {
    const parsed = workflowPatchSchema.safeParse(input);
    if (!parsed.success) throw new DomainError('The workflow edit is invalid.', 400);
    const patch = parsed.data,
      current = this.store.getWorkflow(id);
    if (current.revision !== patch.expectedRevision)
      throw new DomainError('This workflow changed. Refresh before applying the edit.', 409);
    const next = structuredClone(current);
    next.revision++;
    next.updatedAt = new Date().toISOString();
    const changed =
      patch.description !== undefined ||
      !!patch.nodeEdits?.length ||
      patch.candidateId !== undefined ||
      patch.tests !== undefined ||
      patch.sampleInput !== undefined ||
      patch.brief !== undefined;
    if (patch.name) next.name = patch.name;
    if (patch.description) {
      next.description = patch.description;
      next.brief.goal = patch.description;
      next.brief.constraints = [...new Set([...next.brief.constraints, patch.description])];
      next.brief.unknowns = [
        ...new Set([
          ...next.brief.unknowns,
          'The description changed; review whether the design still satisfies it.',
        ]),
      ];
      next.decision.questions = [
        ...new Set([
          ...next.decision.questions,
          'The description changed; confirm the structured brief and acceptance cases before enabling.',
        ]),
      ];
    }
    if (patch.candidateId) {
      if (!next.candidates.some((c) => c.id === patch.candidateId))
        throw new DomainError('Candidate not found.');
      next.decision.candidateId = patch.candidateId;
    }
    for (const edit of patch.nodeEdits ?? []) {
      const node = next.nodes.find((n) => n.id === edit.id);
      if (!node) throw new DomainError('Cannot edit a node that does not exist.');
      if (edit.label !== undefined) node.label = edit.label;
      if (edit.description !== undefined) node.description = edit.description;
      if (edit.kind !== undefined) node.kind = edit.kind;
      if (edit.config !== undefined) node.config = edit.config;
    }
    if (patch.tests) {
      next.tests = patch.tests;
      for (const node of next.nodes) node.provenance.testedBy = patch.tests.map((test) => test.id);
    }
    if (patch.sampleInput) {
      assertInput(patch.sampleInput);
      next.sampleInput = patch.sampleInput;
    }
    if (patch.brief) {
      const supplied = patch.brief;
      if (
        !supplied.unknowns.length &&
        (!supplied.inputs.trim() ||
          !supplied.outputs.trim() ||
          /^(not specified|unknown)$/i.test(supplied.inputs.trim()) ||
          /^(not specified|unknown)$/i.test(supplied.outputs.trim()) ||
          !supplied.successCriteria.length)
      )
        throw new DomainError(
          'Resolve the input, output, and success criteria before clearing the unknowns.',
        );
      next.brief = {
        ...supplied,
        constraints: [
          ...new Set([
            ...current.brief.constraints,
            ...next.brief.constraints,
            ...supplied.constraints,
          ]),
        ],
      };
      next.decision.questions = [...supplied.unknowns];
    }
    if (changed) {
      next.status = 'draft';
      next.decision.status = next.decision.questions.length ? 'needs-information' : 'proposed';
      for (const node of next.nodes) node.provenance.status = 'stale';
    }
    if (patch.status) {
      if (['tested', 'enabled'].includes(patch.status)) {
        const proof = this.store
          .comparisons(id)
          .find(
            (c) =>
              designHash(this.store.getWorkflow(id, c.workflowRevision)) === designHash(current) &&
              c.results.some(
                (r) =>
                  r.candidateId === next.decision.candidateId &&
                  r.total > 0 &&
                  r.passed === r.total,
              ),
          );
        if (changed || !proof || next.decision.questions.length)
          throw new DomainError(
            'Pass all acceptance cases for the unchanged selected design and resolve its questions before marking it tested or enabled.',
            409,
          );
        next.decision.status = 'tested';
      }
      next.status = patch.status;
    }
    return this.store.saveRevision(
      validateWorkflow(next),
      current.revision,
      changed
        ? 'Reviewed design correction; previous provenance retained and marked stale'
        : `Updated ${patch.status ? 'workflow status' : 'workflow name'}`,
    );
  }
  queueRun(
    id: string,
    options: {
      candidateId?: string;
      input?: JsonRecord;
      mode?: RunMode;
      idempotencyKey: string;
      replayOf?: string;
      comparisonId?: string;
    },
  ): WorkflowRun {
    const workflow = validateWorkflow(this.store.getWorkflow(id));
    if (workflow.status === 'paused') throw new DomainError('This workflow is paused.', 409);
    if (!options.idempotencyKey || options.idempotencyKey.length > 160)
      throw new DomainError('Provide an idempotency key of 1–160 characters.', 400);
    const candidate = workflow.candidates.find(
      (c) => c.id === (options.candidateId ?? workflow.decision.candidateId),
    );
    if (!candidate) throw new DomainError('Candidate not found.', 404);
    const mode = options.mode ?? 'local';
    if (candidate.requiresModel && mode !== 'live')
      throw new DomainError(
        'The model candidate requires explicit live mode; no local fake is available.',
        400,
      );
    if (candidate.requiresModel && !this.agents.available())
      throw new DomainError('Live mode is not configured.', 503);
    if (candidate.archetype === 'manual')
      throw new DomainError(
        'This brief needs clarification before there is an executable workflow.',
        409,
      );
    const input = options.input ?? workflow.sampleInput;
    assertInput(input);
    const run: WorkflowRun = {
      id: randomUUID(),
      workflowId: id,
      workflowRevision: workflow.revision,
      candidateId: candidate.id,
      mode,
      status: 'queued',
      input: structuredClone(input),
      output: {},
      steps: [],
      events: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      usage: emptyUsage(),
      idempotencyKey: options.idempotencyKey,
      approvalNodeId: null,
      replayOf: options.replayOf ?? null,
    };
    event(
      run,
      'started',
      options.comparisonId
        ? 'Comparison case queued. All outbox effects are suppressed.'
        : options.replayOf
          ? 'New execution forked from recorded evidence. No prior approval is reused.'
          : 'Run queued against an immutable workflow revision.',
      null,
      {
        schemaVersion: workflow.schemaVersion,
        rubricVersion: workflow.rubricVersion,
        promptVersion: candidate.requiresModel ? PROMPT_VERSION : null,
        model: candidate.requiresModel ? this.agents.model : null,
      },
    );
    const stored = this.store.addRun(run, options.comparisonId ?? null);
    this.kick();
    return stored;
  }
  approve(id: string, decision: 'approve' | 'deny', expectedRevision: number): WorkflowRun {
    const run = this.store.transaction(() => {
      const run = this.store.getRun(id);
      if (
        run.workflowRevision !== expectedRevision ||
        this.store.getWorkflow(run.workflowId).revision !== expectedRevision
      )
        throw new DomainError('Approval is stale because the workflow revision changed.', 409);
      if (
        run.events.some((e) => e.type === (decision === 'approve' ? 'approved' : 'denied')) &&
        run.status !== 'awaiting-approval'
      )
        return run;
      if (run.status !== 'awaiting-approval' || !run.approvalNodeId)
        throw new DomainError('This run is not awaiting approval.', 409);
      const step = run.steps.find(
        (s) => s.nodeId === run.approvalNodeId && s.status === 'awaiting-approval',
      );
      if (!step) throw new DomainError('Approval state is inconsistent.', 409);
      if (decision === 'deny') {
        run.status = 'denied';
        run.completedAt = new Date().toISOString();
        event(
          run,
          'denied',
          'A person denied this prepared action. No outbox effect was issued.',
          run.approvalNodeId,
        );
      } else {
        step.status = 'completed';
        step.output = {
          approved: true,
          workflowRevision: expectedRevision,
          actionHash: checksum(run.output),
        };
        run.status = 'queued';
        event(
          run,
          'approved',
          'Approved the exact prepared action and workflow revision.',
          run.approvalNodeId,
          step.output,
        );
        run.approvalNodeId = null;
      }
      this.store.saveRun(run);
      return run;
    });
    this.kick();
    return run;
  }
  cancel(id: string): WorkflowRun {
    const run = this.store.getRun(id);
    if (terminal(run)) return run;
    run.status = 'cancelled';
    run.completedAt = new Date().toISOString();
    event(
      run,
      'cancelled',
      'Run cancelled. Completed steps remain recorded; no further effects will execute.',
    );
    this.store.saveRun(run);
    this.aborts.get(id)?.abort();
    return run;
  }
  retry(id: string, expectedRevision: number): WorkflowRun {
    const prior = this.store.getRun(id),
      workflow = this.store.getWorkflow(prior.workflowId);
    if (!['failed', 'cancelled', 'denied'].includes(prior.status))
      throw new DomainError('Only a failed, cancelled, or denied run can be retried.', 409);
    if (workflow.revision !== expectedRevision)
      throw new DomainError('Refresh the current design revision before retrying.', 409);
    return this.queueRun(prior.workflowId, {
      candidateId: workflow.candidates.some((c) => c.id === prior.candidateId)
        ? prior.candidateId
        : workflow.decision.candidateId,
      input: prior.input,
      mode: prior.mode,
      idempotencyKey: `retry:${id}:${expectedRevision}`,
      replayOf: id,
    });
  }
  export(id: string): WorkflowPackage {
    return exportPackage(this.store.getWorkflow(id), this.store.comparisons(id));
  }
  import(value: unknown): Workflow {
    return this.store.transaction(() =>
      this.store.insertWorkflow(
        importPackage(value),
        'Imported validated portable definition; approvals and private runs excluded',
      ),
    );
  }

  async compare(id: string, candidateIds?: string[], mode: RunMode = 'local'): Promise<Comparison> {
    const workflow = this.store.getWorkflow(id);
    if (!workflow.tests.length)
      throw new DomainError('Supply acceptance cases before comparing approaches.', 409);
    const selected =
      candidateIds ??
      workflow.candidates.filter((c) => mode === 'live' || !c.requiresModel).map((c) => c.id);
    if (selected.length < 2 || selected.length > 3 || new Set(selected).size !== selected.length)
      throw new DomainError('Compare 2–3 distinct candidates.', 400);
    const candidates = selected.map((key) => workflow.candidates.find((c) => c.id === key));
    if (
      candidates.some((c) => !c) ||
      new Set(candidates.map((c) => c!.implementation)).size !== candidates.length
    )
      throw new DomainError(
        'Comparison requires materially distinct installed candidate implementations.',
        400,
      );
    if (candidates.some((c) => c!.requiresModel) && (mode !== 'live' || !this.agents.available()))
      throw new DomainError('Model comparison requires configured, explicit live mode.', 503);
    const comparison: Comparison = {
      id: randomUUID(),
      workflowId: id,
      workflowRevision: workflow.revision,
      createdAt: new Date().toISOString(),
      mode,
      results: [],
      recommendation: '',
      rubricVersion: workflow.rubricVersion,
      evaluatorVersion: EVALUATOR_VERSION,
      caseSetHash: checksum(workflow.tests),
    };
    for (const candidate of candidates) {
      const result: ComparisonResult = {
        candidateId: candidate!.id,
        name: candidate!.name,
        cases: [],
        passed: 0,
        total: workflow.tests.length,
        usage: emptyUsage(),
      };
      for (const testCase of workflow.tests) {
        if (this.store.getWorkflow(id).revision !== workflow.revision)
          throw new DomainError(
            'The workflow changed during comparison. Recorded case runs remain available; restart on the new revision.',
            409,
          );
        const queued = this.queueRun(id, {
          candidateId: candidate!.id,
          input: testCase.input,
          mode,
          idempotencyKey: `${comparison.id}:${candidate!.id}:${testCase.id}`,
          comparisonId: comparison.id,
        });
        const run = await this.waitForRun(queued.id);
        const passed =
          run.status === 'completed' && evaluateExpected(run.output, testCase.expected);
        result.cases.push({
          caseId: testCase.id,
          name: testCase.name,
          passed,
          expected: testCase.expected,
          actual: run.output,
          runId: run.id,
          error: run.error,
        });
        if (passed) result.passed++;
        addUsage(result.usage, run.usage);
      }
      comparison.results.push(result);
    }
    const complexity = { rules: 0, 'enhanced-rules': 1, model: 2 };
    const qualifying = comparison.results
      .filter((r) => r.passed === r.total)
      .sort(
        (a, b) =>
          complexity[workflow.candidates.find((c) => c.id === a.candidateId)!.implementation] -
          complexity[workflow.candidates.find((c) => c.id === b.candidateId)!.implementation],
      );
    comparison.recommendation = qualifying.length
      ? `${qualifying[0].name} meets all ${qualifying[0].total} declared cases. Prefer the least complex passing candidate; this small fixture set does not establish production accuracy. Constraints retained: ${workflow.brief.constraints.join(' ')}`
      : `Neither compared approach meets all declared requirements. Keep human review, examine failed cases, and revise the taxonomy or design before enabling. Constraints retained: ${workflow.brief.constraints.join(' ')}`;
    this.store.addComparison(comparison);
    return comparison;
  }

  kick(): void {
    if (!this.active && !this.closed) {
      this.active = true;
      setImmediate(() => {
        void this.pump();
      });
    }
  }
  private async pump(): Promise<void> {
    try {
      while (!this.closed) {
        const queued = this.store.queued();
        if (!queued) break;
        await this.execute(queued.id);
      }
    } finally {
      this.active = false;
      for (const resolve of this.idleWaiters.splice(0)) resolve();
    }
  }
  private lineage(run: WorkflowRun): string {
    let root = run,
      count = 0;
    while (root.replayOf && count++ < 50) root = this.store.getRun(root.replayOf);
    return root.id;
  }
  private async execute(id: string): Promise<void> {
    let run = this.store.getRun(id);
    if (run.status !== 'queued') return;
    const workflow = validateWorkflow(this.store.getWorkflow(run.workflowId, run.workflowRevision));
    const candidate = workflow.candidates.find((c) => c.id === run.candidateId)!;
    const comparison = this.store.isComparison(id),
      abort = new AbortController();
    this.aborts.set(id, abort);
    run.status = 'running';
    this.store.saveRun(run);
    const state: JsonRecord = { ...run.input, ...run.output };
    try {
      for (const nodeId of executionOrder(workflow)) {
        await yieldImmediate();
        run = this.store.getRun(id);
        if (terminal(run) || this.closed) return;
        const node = workflow.nodes.find((n) => n.id === nodeId)!;
        if (
          run.steps.some((s) => s.nodeId === nodeId && ['completed', 'skipped'].includes(s.status))
        )
          continue;
        const incoming = workflow.edges.filter((e) => e.target === nodeId);
        const active =
          !incoming.length ||
          incoming.some((e) =>
            run.steps.some(
              (s) => s.nodeId === e.source && s.status === 'completed' && edgeMatches(e, s.output),
            ),
          );
        if (!active) {
          run.steps.push({
            nodeId,
            label: node.label,
            status: 'skipped',
            input: {},
            output: {},
            error: null,
            usage: emptyUsage(),
          });
          this.store.saveRun(run);
          continue;
        }
        const before = structuredClone(state),
          started = performance.now();
        event(run, 'step-started', `Started ${node.label}.`, nodeId);
        this.store.saveRun(run);
        if (node.kind === 'approval' && !comparison) {
          run.steps.push({
            nodeId,
            label: node.label,
            status: 'awaiting-approval',
            input: before,
            output: {
              action: 'local-outbox',
              preparedActionHash: checksum(state),
              workflowRevision: workflow.revision,
            },
            error: null,
            usage: emptyUsage(),
          });
          run.status = 'awaiting-approval';
          run.approvalNodeId = nodeId;
          run.output = state;
          event(
            run,
            'approval-required',
            'Review the proposed draft and recipient. Approval is bound to this immutable revision and action.',
            nodeId,
          );
          this.store.saveRun(run);
          return;
        }
        let output: JsonRecord,
          usage = emptyUsage();
        if (comparison && ['approval', 'outbox'].includes(node.kind))
          output = { effectsSuppressed: true };
        else if (node.kind === 'outbox') {
          const approval = run.steps.find(
            (s) => s.status === 'completed' && s.output.approved === true,
          );
          if (
            !approval ||
            approval.output.actionHash !== checksum(state) ||
            approval.output.workflowRevision !== workflow.revision
          )
            throw new DomainError('No valid approval matches this exact prepared action.');
          if (typeof state.email !== 'string' || typeof state.draft !== 'string')
            throw new DomainError('The approved outbox action is incomplete.');
          // Outbox effect and its completed step are committed together; a crash cannot split them.
          this.store.transaction(() => {
            const action = this.store.insertOutbox(
              `${run.workflowId}:${run.workflowRevision}:${this.lineage(run)}:${nodeId}`,
              run,
              {
                email: state.email,
                draft: state.draft,
                citations: state.citations ?? [],
                adapter: 'local-outbox',
              },
            );
            output = {
              outboxId: action.id,
              delivery: 'local-only',
              deduplicated: action.duplicated,
            };
            usage.latencyMs = performance.now() - started;
            Object.assign(state, output);
            run.steps.push({
              nodeId,
              label: node.label,
              status: 'completed',
              input: before,
              output,
              error: null,
              usage,
            });
            addUsage(run.usage, usage);
            run.output = state;
            event(
              run,
              'step-completed',
              'A local outbox record was written. No message was sent.',
              nodeId,
              output,
            );
            this.store.saveRun(run);
          });
          continue;
        } else if (
          candidate.requiresModel &&
          ['classify', 'retrieve', 'draft'].includes(node.kind)
        ) {
          const result = await this.agents.execute(node, state, workflow, abort.signal);
          output = result.output;
          usage = result.usage;
        } else output = executeDeterministicStep(node, state, candidate);
        const latest = this.store.getRun(id);
        if (terminal(latest)) return;
        usage.latencyMs = performance.now() - started;
        Object.assign(state, output);
        run.steps.push({
          nodeId,
          label: node.label,
          status: 'completed',
          input: before,
          output,
          error: null,
          usage,
        });
        addUsage(run.usage, usage);
        run.output = state;
        event(
          run,
          'step-completed',
          comparison && ['approval', 'outbox'].includes(node.kind)
            ? 'Effect suppressed for comparison.'
            : `Completed ${node.label}.`,
          nodeId,
          output,
        );
        this.store.saveRun(run);
      }
      run.status = 'completed';
      run.completedAt = new Date().toISOString();
      run.output = state;
      event(run, 'completed', 'Workflow completed.');
      this.store.saveRun(run);
    } catch (error) {
      run = this.store.getRun(id);
      if (terminal(run)) return;
      run.status = 'failed';
      run.error =
        error instanceof DomainError
          ? error.message
          : 'The step failed unexpectedly; no successful result was invented.';
      run.completedAt = new Date().toISOString();
      const pending = [...run.events].reverse().find((e) => e.type === 'step-started');
      const node = workflow.nodes.find((n) => n.id === pending?.nodeId);
      if (node)
        run.steps.push({
          nodeId: node.id,
          label: node.label,
          status: 'failed',
          input: structuredClone(state),
          output: {},
          error: run.error,
          usage: emptyUsage(),
        });
      event(run, 'failed', run.error, node?.id ?? null);
      this.store.saveRun(run);
    } finally {
      this.aborts.delete(id);
    }
  }
  async waitForRun(id: string, timeoutMs = 300000): Promise<WorkflowRun> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const run = this.store.getRun(id);
      if (terminal(run) || run.status === 'awaiting-approval') return run;
      if (this.closed) throw new DomainError('The worker stopped before this job completed.', 503);
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    throw new DomainError('The comparison timed out. Persisted case runs remain inspectable.', 503);
  }
  async idle(): Promise<void> {
    if (this.active) await new Promise<void>((resolve) => this.idleWaiters.push(resolve));
  }
  async close(): Promise<void> {
    this.closed = true;
    for (const abort of this.aborts.values()) abort.abort();
    await this.idle();
    this.store.close();
  }
}
