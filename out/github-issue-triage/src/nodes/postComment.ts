/**
 * post-comment-1 — L0 GitHub bot comment.
 *
 * Idempotent: looks up existing bot comments on the issue, PATCHes if
 * found, POSTs otherwise. See integration-github-api.md.
 *
 * If the draft node was skipped (errorHandling: alert-and-skip), falls
 * back to a generic acknowledgement so the reporter still gets a reply.
 */
import type { WorkflowState } from "../state.js";

const LIVE = process.env.LIVE === "true";

const GENERIC_ACK = "Thanks for the report — we're taking a look.";

export async function postComment(
  state: WorkflowState
): Promise<Partial<WorkflowState>> {
  if (!state.issue) throw new Error("postComment requires issue");

  const body = state.draft?.body ?? GENERIC_ACK;

  if (LIVE) {
    // TODO(production):
    //   1. GET /repos/:owner/:repo/issues/:number/comments filtered by
    //      comment.user.id === GITHUB_BOT_USER_ID.
    //   2. If found: PATCH /repos/:owner/:repo/issues/comments/:commentId.
    //   3. Else: POST /repos/:owner/:repo/issues/:number/comments.
    // Idempotency-Key on POST: `${state.executionId}-${issueNumber}-comment`.
    throw new Error("LIVE=true path not implemented in scaffold");
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      evt: "github.comment.stub",
      repo: state.issue.repo,
      issueNumber: state.issue.issueNumber,
      bodyPreview: body.slice(0, 80),
    })
  );
  return { commented: true };
}
