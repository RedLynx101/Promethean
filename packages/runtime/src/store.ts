import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  DomainError,
  checksum,
  createExampleWorkflow,
  exampleCatalog,
  validateWorkflow,
  type Budget,
  type Comparison,
  type Usage,
  type Workflow,
  type WorkflowRun,
  type WorkflowVersion,
} from '@promethean/core';
import type { UsageLedger } from '@promethean/agents';

type Row = Record<string, string | number | null>;
export class Store implements UsageLedger {
  readonly db: DatabaseSync;
  private workerToken: string | null = null;
  constructor(
    filename: string,
    readonly limitUsd = 5,
  ) {
    if (!Number.isFinite(limitUsd) || limitUsd <= 0 || limitUsd > 5)
      throw new DomainError('The initial usage limit must be between $0 and $5.');
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS workflows(id TEXT PRIMARY KEY, revision INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS versions(workflow_id TEXT NOT NULL REFERENCES workflows(id), revision INTEGER NOT NULL, created_at TEXT NOT NULL, reason TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY(workflow_id,revision));
      CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL REFERENCES workflows(id), revision INTEGER NOT NULL, status TEXT NOT NULL, idempotency_key TEXT NOT NULL, json TEXT NOT NULL, comparison_id TEXT, UNIQUE(workflow_id, revision, idempotency_key));
      CREATE INDEX IF NOT EXISTS runs_status ON runs(status);
      CREATE TABLE IF NOT EXISTS comparisons(id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL REFERENCES workflows(id), revision INTEGER NOT NULL, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reservations(id TEXT PRIMARY KEY, amount REAL NOT NULL, purpose TEXT NOT NULL, status TEXT NOT NULL, usage_json TEXT, reason TEXT, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY, action_key TEXT NOT NULL UNIQUE, run_id TEXT NOT NULL REFERENCES runs(id), revision INTEGER NOT NULL, json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      INSERT OR IGNORE INTO migrations(version,applied_at) VALUES(1,datetime('now'));`);
  }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  acquireWorker(): void {
    this.transaction(() => {
      const existing = this.db
        .prepare('SELECT value FROM metadata WHERE key=?')
        .get('worker-owner') as Row | undefined;
      if (existing) {
        let owner: { pid: number };
        try {
          owner = JSON.parse(String(existing.value));
        } catch {
          throw new DomainError(
            'The worker ownership record is malformed; inspect the local database before starting.',
            409,
          );
        }
        let alive = true;
        try {
          process.kill(owner.pid, 0);
        } catch (error) {
          alive = (error as NodeJS.ErrnoException).code !== 'ESRCH';
        }
        if (alive)
          throw new DomainError(
            'Another Promethean worker owns this data directory. Stop it or choose a different workspace.',
            409,
          );
      }
      this.workerToken = JSON.stringify({
        pid: process.pid,
        id: randomUUID(),
        startedAt: new Date().toISOString(),
      });
      this.db
        .prepare(
          'INSERT INTO metadata(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        )
        .run('worker-owner', this.workerToken);
    });
  }
  bootstrap(): void {
    if (this.db.prepare('SELECT value FROM metadata WHERE key=?').get('bootstrapped')) return;
    this.transaction(() => {
      for (const example of exampleCatalog)
        this.insertWorkflow(createExampleWorkflow(example.id), 'Synthetic example bootstrap');
      this.db.prepare('INSERT INTO metadata(key,value) VALUES(?,?)').run('bootstrapped', '2.0');
    });
  }
  insertWorkflow(workflow: Workflow, reason = 'Created workflow'): Workflow {
    validateWorkflow(workflow);
    this.db
      .prepare('INSERT INTO workflows(id,revision) VALUES(?,?)')
      .run(workflow.id, workflow.revision);
    this.insertVersion(workflow, reason);
    return structuredClone(workflow);
  }
  private insertVersion(workflow: Workflow, reason: string): void {
    this.db
      .prepare(
        'INSERT INTO versions(workflow_id,revision,created_at,reason,json) VALUES(?,?,?,?,?)',
      )
      .run(workflow.id, workflow.revision, workflow.updatedAt, reason, JSON.stringify(workflow));
  }
  saveRevision(workflow: Workflow, expectedRevision: number, reason: string): Workflow {
    validateWorkflow(workflow);
    return this.transaction(() => {
      const result = this.db
        .prepare('UPDATE workflows SET revision=? WHERE id=? AND revision=?')
        .run(workflow.revision, workflow.id, expectedRevision);
      if (result.changes !== 1)
        throw new DomainError('This workflow changed. Refresh before applying your edit.', 409);
      this.insertVersion(workflow, reason);
      return structuredClone(workflow);
    });
  }
  getWorkflow(id: string, revision?: number): Workflow {
    const row =
      revision === undefined
        ? (this.db
            .prepare(
              'SELECT v.json FROM versions v JOIN workflows w ON w.id=v.workflow_id AND w.revision=v.revision WHERE w.id=?',
            )
            .get(id) as Row | undefined)
        : (this.db
            .prepare('SELECT json FROM versions WHERE workflow_id=? AND revision=?')
            .get(id, revision) as Row | undefined);
    if (!row) throw new DomainError('Workflow not found.', 404);
    return JSON.parse(String(row.json));
  }
  workflows(): Workflow[] {
    return (
      this.db
        .prepare(
          'SELECT v.json FROM versions v JOIN workflows w ON w.id=v.workflow_id AND w.revision=v.revision ORDER BY v.created_at DESC',
        )
        .all() as Row[]
    ).map((r) => JSON.parse(String(r.json)));
  }
  versions(id: string): WorkflowVersion[] {
    return (
      this.db
        .prepare(
          'SELECT revision,created_at,reason,json FROM versions WHERE workflow_id=? ORDER BY revision DESC',
        )
        .all(id) as Row[]
    ).map((r) => ({
      revision: Number(r.revision),
      createdAt: String(r.created_at),
      reason: String(r.reason),
      workflow: JSON.parse(String(r.json)),
    }));
  }
  addRun(run: WorkflowRun, comparisonId: string | null = null): WorkflowRun {
    const existing = this.db
      .prepare('SELECT json FROM runs WHERE workflow_id=? AND revision=? AND idempotency_key=?')
      .get(run.workflowId, run.workflowRevision, run.idempotencyKey) as Row | undefined;
    if (existing) {
      const prior = JSON.parse(String(existing.json)) as WorkflowRun;
      if (
        checksum(prior.input) !== checksum(run.input) ||
        prior.candidateId !== run.candidateId ||
        prior.mode !== run.mode
      )
        throw new DomainError(
          'The idempotency key was already used for different run parameters.',
          409,
        );
      return prior;
    }
    this.db
      .prepare(
        'INSERT INTO runs(id,workflow_id,revision,status,idempotency_key,json,comparison_id) VALUES(?,?,?,?,?,?,?)',
      )
      .run(
        run.id,
        run.workflowId,
        run.workflowRevision,
        run.status,
        run.idempotencyKey,
        JSON.stringify(run),
        comparisonId,
      );
    return structuredClone(run);
  }
  getRun(id: string): WorkflowRun {
    const row = this.db.prepare('SELECT json FROM runs WHERE id=?').get(id) as Row | undefined;
    if (!row) throw new DomainError('Run not found.', 404);
    return JSON.parse(String(row.json));
  }
  saveRun(run: WorkflowRun): void {
    this.db
      .prepare('UPDATE runs SET status=?,json=? WHERE id=?')
      .run(run.status, JSON.stringify(run), run.id);
  }
  runs(workflowId?: string): WorkflowRun[] {
    const rows = workflowId
      ? this.db
          .prepare('SELECT json FROM runs WHERE workflow_id=? ORDER BY rowid DESC LIMIT 100')
          .all(workflowId)
      : this.db.prepare('SELECT json FROM runs ORDER BY rowid').all();
    return (rows as Row[]).map((r) => JSON.parse(String(r.json)));
  }
  queued(): WorkflowRun | undefined {
    const row = this.db
      .prepare("SELECT json FROM runs WHERE status='queued' ORDER BY rowid LIMIT 1")
      .get() as Row | undefined;
    return row ? JSON.parse(String(row.json)) : undefined;
  }
  isComparison(runId: string): boolean {
    return !!(
      this.db.prepare('SELECT comparison_id FROM runs WHERE id=?').get(runId) as Row | undefined
    )?.comparison_id;
  }
  addComparison(comparison: Comparison): void {
    this.db
      .prepare('INSERT INTO comparisons(id,workflow_id,revision,json) VALUES(?,?,?,?)')
      .run(
        comparison.id,
        comparison.workflowId,
        comparison.workflowRevision,
        JSON.stringify(comparison),
      );
  }
  comparisons(workflowId: string): Comparison[] {
    return (
      this.db
        .prepare('SELECT json FROM comparisons WHERE workflow_id=? ORDER BY rowid DESC')
        .all(workflowId) as Row[]
    ).map((r) => JSON.parse(String(r.json)));
  }
  reserve(amountUsd: number, purpose: string): string {
    return this.transaction(() => {
      const budget = this.budget();
      if (!Number.isFinite(amountUsd) || amountUsd < 0 || amountUsd > budget.remainingUsd)
        throw new DomainError(
          'The remaining allowance cannot cover this bounded model call. No call was scheduled.',
          429,
        );
      const id = randomUUID();
      this.db
        .prepare('INSERT INTO reservations(id,amount,purpose,status,created_at) VALUES(?,?,?,?,?)')
        .run(id, amountUsd, purpose, 'reserved', new Date().toISOString());
      return id;
    });
  }
  settle(id: string, usage: Usage): void {
    if (!Number.isFinite(usage.costUsd) || usage.costUsd < 0)
      throw new DomainError('Invalid usage accounting.');
    this.db
      .prepare(
        "UPDATE reservations SET status='settled', usage_json=? WHERE id=? AND status IN ('reserved','uncertain')",
      )
      .run(JSON.stringify(usage), id);
  }
  uncertain(id: string, reason: string): void {
    this.db
      .prepare(
        "UPDATE reservations SET status='uncertain',reason=? WHERE id=? AND status='reserved'",
      )
      .run(reason, id);
  }
  markInterruptedReservations(): void {
    this.db
      .prepare(
        "UPDATE reservations SET status='uncertain',reason='Process stopped before provider usage was reconciled' WHERE status='reserved'",
      )
      .run();
  }
  budget(): Budget {
    const records = this.db
      .prepare('SELECT amount,status,usage_json FROM reservations')
      .all() as Row[];
    let spentUsd = 0,
      reservedUsd = 0;
    for (const r of records)
      if (r.status === 'settled') spentUsd += (JSON.parse(String(r.usage_json)) as Usage).costUsd;
      else reservedUsd += Number(r.amount);
    return {
      limitUsd: this.limitUsd,
      spentUsd,
      reservedUsd,
      remainingUsd: Math.max(0, this.limitUsd - spentUsd - reservedUsd),
    };
  }
  usageRecords(): Row[] {
    return this.db
      .prepare(
        'SELECT id,amount,purpose,status,usage_json,reason,created_at FROM reservations ORDER BY rowid',
      )
      .all() as Row[];
  }
  insertOutbox(
    actionKey: string,
    run: WorkflowRun,
    payload: Record<string, unknown>,
  ): { id: string; duplicated: boolean } {
    const found = this.db.prepare('SELECT id FROM outbox WHERE action_key=?').get(actionKey) as
      Row | undefined;
    if (found) return { id: String(found.id), duplicated: true };
    const id = randomUUID();
    this.db
      .prepare(
        'INSERT INTO outbox(id,action_key,run_id,revision,json,created_at) VALUES(?,?,?,?,?,?)',
      )
      .run(
        id,
        actionKey,
        run.id,
        run.workflowRevision,
        JSON.stringify(payload),
        new Date().toISOString(),
      );
    return { id, duplicated: false };
  }
  outboxCount(): number {
    return Number((this.db.prepare('SELECT count(*) AS count FROM outbox').get() as Row).count);
  }
  close(): void {
    if (this.workerToken)
      this.db
        .prepare('DELETE FROM metadata WHERE key=? AND value=?')
        .run('worker-owner', this.workerToken);
    this.workerToken = null;
    this.db.close();
  }
}
