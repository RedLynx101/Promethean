---
type: integration
id: integration-github-api
tags: [integration, action, devops]
linksTo: [integration-index]
---

# GitHub API

PR webhooks (Trigger), PR comments, status checks, branch protection gates.

## Auth

GitHub App preferred over personal access token. Required permissions per workflow:

- PR comment / review: `pull_requests: write`
- Status checks / merge gating: `checks: write`, `contents: write`
- Webhook receiver: validate the `X-Hub-Signature-256` HMAC against the app secret.

## Idempotency

- Posting a PR comment is **not idempotent**. Look up existing bot comments via `gh api repos/.../pulls/N/comments` filtered by the bot's user id, then `PATCH` instead of `POST`.
- Status checks are idempotent on `(commit_sha, context)` — same `context` overwrites.

## Rate limits

5,000 req/hour per installation. Use conditional requests (`If-None-Match` with ETag) for read-heavy steps.

## Webhook payload

The webhook receiver sits at the [[Trigger]] node. Always validate the HMAC signature and store the GitHub `X-GitHub-Delivery` UUID as the execution idempotency key.
