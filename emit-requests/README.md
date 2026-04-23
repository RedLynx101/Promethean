# emit-requests

Queue of pending emission jobs. The Express API writes a manifest here each time the Promethean UI's "Build" button is pressed; a harnessed agent (running `skills/emit.md`) reads the manifest and produces real runnable code in `out/<workflow-slug>/`.

## Manifest shape

```json
{
  "requestId": "<slug>-<iso-timestamp>",
  "workflowId": "<uuid>",
  "workflowName": "...",
  "workflowVersion": "2.1.0",
  "targetFramework": "langgraph-js | inngest | temporal | n8n | claude-agent-sdk | python-script",
  "targetDir": "out/<slug>",
  "requestedAt": "<iso>",
  "status": "pending",
  "workflow": { /* full approved workflow JSON: nodes, edges, governanceConfig, ... */ },
  "harnessInstructions": {
    "skillToLoad": "skills/emit.md",
    "mcpServer": "promethean-vault",
    "nextSteps": ["..."]
  }
}
```

## How to process a manifest manually

Until a file-watcher daemon is wired, process by hand:

1. `ls emit-requests/*.json` to see pending work.
2. Open a harness session (e.g., `claude` from the repo root) with the `promethean-vault` MCP server attached (it is, via the root `.mcp.json`).
3. Paste:
   > *Read skills/emit.md and process `emit-requests/<filename>`. Generate code into the manifest's `targetDir`. Write the EMIT_MANIFEST.json the skill specifies when done.*
4. Review the generated code, run its tests, and ship.

## Directory contents

Only `.json` manifests and this README. The directory is kept in git via `.gitkeep` so the Express endpoint can write into it on a fresh clone.

`.json` files here are ignored by git by default — add a git-ignore rule if you want them committed for audit purposes.
