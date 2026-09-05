import type {
  Workspace,
  Workflow,
  WorkflowDetail,
  WorkflowRun,
  WorkflowPatch,
  Comparison,
  RunMode,
  JsonRecord,
  WorkflowPackage,
  Evidence,
} from '@promethean/core';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : `Request failed (${response.status}).`,
    );
  return payload as T;
}
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
export const api = {
  workspace: () => request<Workspace>('/workspace'),
  workflow: (id: string) => request<WorkflowDetail>(`/workflows/${encodeURIComponent(id)}`),
  create: (body: { description: string; name?: string; exampleId?: string; mode: RunMode }) =>
    post<Workflow>('/workflows', body),
  patch: (id: string, patch: WorkflowPatch) =>
    request<Workflow>(`/workflows/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  run: (id: string, input: JsonRecord, candidateId: string, mode: RunMode) =>
    post<WorkflowRun>(`/workflows/${id}/run`, {
      input,
      candidateId,
      mode,
      idempotencyKey: crypto.randomUUID(),
    }),
  getRun: (id: string) => request<WorkflowRun>(`/runs/${id}`),
  approve: (id: string, decision: 'approve' | 'deny', expectedRevision: number) =>
    post<WorkflowRun>(`/runs/${id}/approve`, { decision, expectedRevision }),
  cancel: (id: string) => post<WorkflowRun>(`/runs/${id}/cancel`),
  retry: (id: string, expectedRevision: number) =>
    post<WorkflowRun>(`/runs/${id}/retry`, { expectedRevision }),
  compare: (id: string, mode: RunMode) => post<Comparison>(`/workflows/${id}/compare`, { mode }),
  export: (id: string) => request<WorkflowPackage>(`/workflows/${id}/export`),
  import: (value: unknown) => post<Workflow>('/packages/import', { package: value }),
  search: (query: string) => request<Evidence[]>(`/evidence?q=${encodeURIComponent(query)}`),
};
export function downloadJson(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
