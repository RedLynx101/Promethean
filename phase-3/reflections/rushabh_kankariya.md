# Individual Contribution Reflection — Rushabh Kankariya

**Role:** Tech Stack Testing / Exploration

## What I contributed

- Took primary ownership of the final demo recording workflow: sequenced the live walkthrough, validated that required scenes were captured (problem/user, architecture, end-to-end pipeline, evidence layer, failure case, final output), and coordinated final recording passes.
- Focused on environment and stack reliability for Phase 3 runs: validated local startup flow, dependency state, and service connectivity before evaluation sessions.
- Helped test agent behavior across scenarios and sanity-checked outputs against the L0-L5 rubric expectations for deterministic vs. agentic steps.
- Assisted with evidence readiness by reviewing traces and confirming that scenario coverage and stored artifacts matched the planned evaluation set.
- Supported final submission prep by validating that the documented process in `phase-3/scripts/README.md` matched what we actually executed.

## What I learned

- Reliable delivery depends on boring infrastructure details; environment stability directly determines whether evaluation evidence is trustworthy.
- Re-running the same scenario with small variations is useful for surfacing calibration drift and governance differences.
- Keeping evidence generation repeatable is as important as model quality when producing final deliverables.

## What I would do differently

- Automate more of the evidence checks (trace completeness, required files present, and key metric extraction) to reduce manual verification overhead.
- Start performance and reliability profiling earlier so edge-case failures are discovered before final reporting week.
- Maintain a running QA log during implementation so final reflection and reporting require less reconstruction.

## Hours invested

- Phase 3: ~10 hours
