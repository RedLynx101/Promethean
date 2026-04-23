/**
 * validate-1 — L0 deterministic Zod extraction.
 *
 * Rejects malformed webhook events before any LLM call. Per
 * vault/integrations/integration-webhook-receiver.md and
 * integration-github-api.md.
 */
import {
  GithubWebhookBodySchema,
  IssuePayloadSchema,
  type GithubWebhookBody,
} from "../schemas.js";
import type { WorkflowState } from "../state.js";

export async function validate(
  webhookBody: unknown,
  state: WorkflowState
): Promise<Partial<WorkflowState>> {
  const body: GithubWebhookBody = GithubWebhookBodySchema.parse(webhookBody);
  const issue = IssuePayloadSchema.parse({
    repo: body.repository.full_name,
    issueNumber: body.issue.number,
    title: body.issue.title,
    body: body.issue.body ?? "",
    author: body.issue.user.login,
    existingLabels: body.issue.labels.map((l) => l.name),
  });
  return { issue };
}
