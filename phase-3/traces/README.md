# Phase 3 — Interaction Traces

Raw JSON captures of the 4-agent pipeline running the five test scenarios. One folder per scenario:

```
traces/
├── tc-01/
│   ├── input.txt                        # exact input string used
│   ├── 00_create_workflow.json          # response from POST /workflows
│   ├── 01_decompose.json                # response from POST /pipeline/start
│   ├── 02_approve_decompose.json        # response from POST /pipeline/:id/approve (decompose→select)
│   ├── 02_approve_select.json
│   ├── 02_approve_orchestrate.json
│   ├── 02_approve_govern.json
│   ├── 03_final_state.json              # response from GET /pipeline/:id/status after deploy
│   └── rejection_*.json                 # optional: any rejection/regeneration captures
├── tc-02/
├── tc-03/
├── tc-04/
├── tc-05a/  ...  tc-05d/
└── expert_rubric.csv                    # human expert classifications for TC-01, TC-02
```

See [../scripts/README.md](../scripts/README.md) for the exact `curl` sequence used to generate each file.

**Do not hand-edit trace files** — they are the primary evidence that the pipeline actually ran. If you need to annotate a run, add a sibling `<file>.notes.md` in the same folder.
