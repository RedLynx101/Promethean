# Individual Contribution Reflection — Rushabh Kankariya

**Role:** Tech Stack Testing / Exploration

## What I contributed

### Phase 1 — Stack exploration and feasibility validation

- Evaluated early technical options and feasibility constraints for the proposed architecture (frontend/backend/database/LLM integration) to reduce implementation risk before the build phase.
- Helped pressure-test initial assumptions around development workflow, dependency footprint, and integration complexity for a multi-agent pipeline product.

### Phase 2 — Prototype QA and technical validation

- Supported prototype stabilization by testing core flows across the Command Center, Template Library, and Workflow Wizard surfaces and flagging integration inconsistencies.
- Reviewed evaluation-plan practicality from an execution standpoint (what could be run reliably in the available environment and time window).
- Helped validate that implemented behavior matched the Phase 2 architecture and coordination docs, especially around phase sequencing and review gates.

### Phase 3 — Evidence reliability and demo execution

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

- Phase 1: ~8 hours
- Phase 2: ~12 hours
- Phase 3: ~10 hours
