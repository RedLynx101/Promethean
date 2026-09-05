import { afterEach, describe, expect, test } from 'vitest';
import { request as httpRequest, type Server } from 'node:http';
import { type AddressInfo } from 'node:net';
import type { Comparison, Workflow, WorkflowRun, Workspace } from '@promethean/core';
import { Store, WorkflowService } from '@promethean/runtime';
import { createApp } from './app.js';

const servers: Array<{ server: Server; service: WorkflowService }> = [];
afterEach(async () => {
  for (const { server, service } of servers.splice(0)) {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await service.close();
  }
});
async function appFixture(accessToken?: string) {
  const service = new WorkflowService(new Store(':memory:')),
    app = createApp({ service, accessToken });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  servers.push({ server, service });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  async function request<T = Record<string, unknown>>(
    path: string,
    method = 'GET',
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: (await response.json()) as T };
  }
  return { service, request, base };
}

describe('HTTP workspace contract', () => {
  test('health, bootstrap, and evidence are available without paid calls', async () => {
    const { request } = await appFixture();
    expect((await request('/api/health')).body).toEqual({ status: 'ok', version: '2.0.0' });
    const workspace = await request<Workspace>('/api/workspace');
    expect(workspace.body.workflows).toHaveLength(3);
    expect(workspace.body.budget.spentUsd).toBe(0);
    expect((await request('/api/evidence?q=graph')).body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'legacy-graph-loss' })]),
    );
  });
  test('blank intake, invalid JSON, oversized input and missing resources fail clearly', async () => {
    const { request, base } = await appFixture();
    expect((await request('/api/workflows', 'POST', { description: '  ' })).status).toBe(400);
    expect(
      (await request('/api/workflows', 'POST', { description: 'x'.repeat(140000) })).status,
    ).toBe(413);
    expect((await request('/api/workflows/missing')).status).toBe(404);
    const invalid = await fetch(`${base}/api/workflows`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad',
    });
    expect(invalid.status).toBe(400);
  });
  test('custom diagnosis creates an unresolved brief instead of fabricating a specialized process', async () => {
    const { request } = await appFixture();
    const result = await request<Workflow>('/api/workflows', 'POST', {
      description: 'Make my work easier',
    });
    expect(result.status).toBe(201);
    expect(result.body.decision.status).toBe('needs-information');
    expect(result.body.tests).toEqual([]);
  });
  test('read-only local hosts reject DNS rebinding and cross-origin changes', async () => {
    const { request, base } = await appFixture();
    // Fetch intentionally normalizes Host; use a raw local HTTP request to exercise rebinding defense.
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const req = httpRequest(
        `${base}/api/workspace`,
        { headers: { Host: 'attacker.invalid' } },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      );
      req.once('error', reject);
      req.end();
    });
    expect(status).toBe(403);
    expect(
      (
        await request(
          '/api/workflows',
          'POST',
          { description: 'test' },
          { origin: 'https://attacker.invalid' },
        )
      ).status,
    ).toBe(403);
  });
  test('configured access tokens are required without being returned', async () => {
    const { request } = await appFixture('synthetic-test-token');
    expect((await request('/api/workspace')).status).toBe(401);
    const valid = await request('/api/workspace', 'GET', undefined, {
      authorization: 'Bearer synthetic-test-token',
    });
    expect(valid.status).toBe(200);
    expect(JSON.stringify(valid.body)).not.toContain('synthetic-test-token');
  });
  test('an actual HTTP run pauses, rejects a stale approval, and records denial', async () => {
    const { request, service } = await appFixture();
    const workflow = service.workspace().workflows.find((w) => w.exampleId === 'inbound-triage')!;
    const queued = await request<WorkflowRun>(`/api/workflows/${workflow.id}/run`, 'POST', {
      idempotencyKey: 'http-run',
    });
    expect(queued.status).toBe(202);
    const waiting = await service.waitForRun(queued.body.id);
    expect(waiting.status).toBe('awaiting-approval');
    expect(
      (
        await request(`/api/runs/${waiting.id}/approve`, 'POST', {
          decision: 'approve',
          expectedRevision: 2,
        })
      ).status,
    ).toBe(409);
    const denied = await request(`/api/runs/${waiting.id}/approve`, 'POST', {
      decision: 'deny',
      expectedRevision: 1,
    });
    expect(denied.body.status).toBe('denied');
    expect(service.store.outboxCount()).toBe(0);
  });
  test('HTTP comparison, export, validation and import preserve independently executable tests', async () => {
    const { request, service } = await appFixture();
    const workflow = service.workspace().workflows.find((w) => w.exampleId === 'csv-routing')!;
    const compared = await request<Comparison>(`/api/workflows/${workflow.id}/compare`, 'POST', {});
    expect(compared.status).toBe(200);
    expect(compared.body.results.map((r: { passed: number }) => r.passed)).toEqual([2, 3]);
    const exported = await request(`/api/workflows/${workflow.id}/export`);
    expect(
      (await request('/api/packages/validate', 'POST', { package: exported.body })).body.valid,
    ).toBe(true);
    const imported = await request('/api/packages/import', 'POST', { package: exported.body });
    expect(imported.status).toBe(201);
    expect(imported.body.id).not.toBe(workflow.id);
    expect(imported.body.tests).toHaveLength(3);
  });
});
