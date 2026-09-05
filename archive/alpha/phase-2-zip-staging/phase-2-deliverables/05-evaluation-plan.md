# PROMETHEAN — Evaluation Plan

### Phase 2 Deliverable | Track A: Technical Build
### April 2026

---

## 1. Evaluation Objectives

This plan defines how Promethean will be tested and evaluated in Phase 3. The goals are:

1. Verify that the 4-agent pipeline produces meaningful, accurate workflow analysis
2. Measure classification accuracy against human expert judgment
3. Test system behavior on both easy and difficult inputs
4. Compare against baseline alternatives to demonstrate value
5. Identify failure modes and boundary behaviors

---

## 2. Test Scenarios

### Scenario 1: CRM Lead Qualification — Happy Path

**Purpose:** Validate the full pipeline end-to-end on a well-understood, bounded workflow.

**Input:**
```
"When a new lead comes in through the website form, validate the email format
and check for duplicates in the CRM. Score the lead based on company size,
industry, and engagement history. If the score is above 80, route to a sales
rep with a personalized summary. If below 40, add to the nurture campaign.
For scores in between, flag for manual review by the sales team."
```

**Domain:** CRM / Sales

**Expected Behavior:**
| Phase | Expected Outcome |
|-------|-----------------|
| Decomposition | 7–10 substeps: validate email, check duplicates, score lead, threshold routing, generate summary, assign to rep, add to nurture, flag for review |
| System Selection | Email validation → L0, duplicate check → L0, lead scoring → L1, summary generation → L3, routing → L0, manual flag → L0 |
| Orchestration | Clear sequential flow with conditional branching at the score thresholds; error handling for CRM API failures |
| Governance | Standard logging, cost threshold ~$0.05/run, low error rate tolerance |

**Success Criteria:**
- Pipeline completes all 4 phases without error
- At least 60% of substeps classified at L0–L2 (most of this workflow is deterministic)
- No substep classified at L5 (this is not a multi-agent problem)
- Total pipeline execution time < 3 minutes
- Output is coherent enough for human reviewer to approve without major edits

**Measurement Method:** Manual review by team member acting as domain expert. Score each agent output on a 1–5 scale for accuracy, completeness, and usefulness.

---

### Scenario 2: Cybersecurity Incident Response — Complex Multi-Agent Routing

**Purpose:** Test the system on a complex, high-stakes workflow that genuinely requires higher automation levels and careful governance.

**Input:**
```
"When a security alert is triggered by the SIEM system, triage the alert by
checking severity, source IP reputation, and affected assets. For critical
alerts, immediately isolate the affected endpoint and notify the security
team via PagerDuty. Run an automated forensic scan to collect logs, memory
dumps, and network traffic captures. Correlate findings across multiple
data sources to identify the attack vector. Generate an incident report
with timeline, impact assessment, and recommended remediation steps.
For false positives, update the SIEM rules and document the false positive
pattern for future tuning."
```

**Domain:** Cybersecurity

**Expected Behavior:**
| Phase | Expected Outcome |
|-------|-----------------|
| Decomposition | 10–15 substeps including triage, isolation, notification, forensic scan, correlation, report generation, false positive handling |
| System Selection | Alert triage → L0/L1, IP reputation check → L0, endpoint isolation → L0, forensic scan → L4 (tool-augmented), correlation → L3/L4, report generation → L3, SIEM rule update → L0 |
| Orchestration | Parallel branches (notify while scanning), error paths for isolation failures, timeout handling for forensic scans |
| Governance | Verbose logging, tight latency thresholds, PagerDuty alerts, high oversight |

**Success Criteria:**
- System correctly identifies this as a higher-complexity workflow than CRM
- At least 2 substeps classified at L3+ (correlation and report generation)
- Governance config reflects the critical nature (verbose logging, PagerDuty)
- Error handling paths exist for endpoint isolation failures
- No over-classification — alert triage and IP checks should remain L0/L1

**Measurement Method:** Compare system classifications against a pre-defined expert rubric for this specific workflow. Calculate agreement rate.

---

### Scenario 3: Simple Data Validation Pipeline — Mostly L0/L1

**Purpose:** Verify that the system correctly identifies a simple workflow and does NOT over-classify it.

**Input:**
```
"Validate incoming CSV files: check that the file has the expected columns,
verify data types match the schema, flag any null values in required fields,
check that numeric values are within acceptable ranges, and generate a
validation report listing all errors found."
```

**Domain:** Data Engineering

**Expected Behavior:**
| Phase | Expected Outcome |
|-------|-----------------|
| Decomposition | 5–7 substeps: parse CSV, check columns, verify types, check nulls, range validation, generate report |
| System Selection | ALL substeps classified at L0, possibly L1 for report formatting |
| Orchestration | Simple sequential flow, straightforward error handling |
| Governance | Minimal logging, standard thresholds |

**Success Criteria:**
- Zero substeps classified at L3 or above
- At least 80% of substeps at L0
- System explicitly states in rationale that this is a deterministic problem
- Governance config uses minimal or standard logging (not verbose)
- This validates the "start at L0" principle

**Measurement Method:** Count L0/L1 classifications. Any L3+ classification is a failure case for this scenario.

---

### Scenario 4: Ambiguous Workflow Description — Graceful Uncertainty Handling

**Purpose:** Test how the system handles vague, underspecified input that lacks enough detail for confident classification.

**Input:**
```
"Handle customer issues when they come in. Figure out what the customer
needs and deal with it appropriately. Make sure things get resolved."
```

**Domain:** Not specified

**Expected Behavior:**
| Phase | Expected Outcome |
|-------|-----------------|
| Decomposition | Should produce some substeps but with lower confidence; may produce generic steps like "receive request", "classify issue", "resolve issue" |
| System Selection | Should have LOW confidence scores (<60%) on most classifications; should flag multiple steps for human review |
| Orchestration | Should produce a reasonable but generic workflow structure |
| Governance | Should note the high uncertainty in the summary |

**Success Criteria:**
- The system does NOT crash or produce empty output
- Average confidence score across substeps is < 70%
- At least 2 substeps are flagged as needing human review (confidence < 60%)
- The summary acknowledges the input's vagueness
- The system does not hallucinate specific domain details not present in the input

**Measurement Method:** Check confidence scores, review summaries for acknowledgment of uncertainty, verify no hallucinated details.

---

### Scenario 5: Adversarial / Edge Cases

**Purpose:** Test boundary conditions and error handling.

**Sub-case 5a: Empty Input**
```
Input: ""
Expected: API returns a 400 validation error before reaching agents.
```

**Sub-case 5b: Contradictory Constraints**
```
Input: "Build a real-time stock trading system that processes millions of
transactions per second. Budget: $0.01 per run. Maximum latency: 1ms.
Must use no external APIs. Must also call 5 different ML models and
run a multi-agent debate for every transaction."
Expected: System produces output but with very low confidence. Cost/latency
estimates clearly show the constraints are unrealistic. Summary should note
the contradictions.
```

**Sub-case 5c: Extremely Long Description**
```
Input: A 5000-word workflow description with 50+ distinct steps.
Expected: Decomposition agent handles gracefully. May consolidate into
the 5–15 step range per its instructions. Should not crash or timeout.
```

**Sub-case 5d: Non-Workflow Input**
```
Input: "What is the meaning of life?"
Expected: System either produces a validation error or generates a
low-confidence, minimal decomposition. Should not pretend this is
a valid workflow.
```

**Success Criteria:**
- No unhandled exceptions or server crashes
- Empty input returns a proper error response
- Contradictory constraints are noted, not silently ignored
- Long input is handled within reasonable time (< 5 minutes)
- Non-workflow input produces low confidence or appropriate error

**Measurement Method:** Execute each sub-case and record the system response. Classify each as pass/fail.

---

## 3. Baseline Comparisons

To demonstrate that Promethean's multi-agent analysis adds value, compare its output against three naive baselines:

### Baseline A: Always-L0 (Classify Everything as Deterministic)
| Metric | Expected Result |
|--------|----------------|
| Agreement with expert | Very low on complex workflows (~30%) |
| Right-sizing | Under-classifies; misses workflows that genuinely need AI |
| Cost estimate | Artificially low (ignores AI needs) |
| Value | Proves L0-only is insufficient for complex workflows |

### Baseline B: Always-L4 (Classify Everything as Tool-Augmented Agent)
| Metric | Expected Result |
|--------|----------------|
| Agreement with expert | Moderate (~50%) but systematically over-classifies |
| Right-sizing | Over-classifies; wastes resources on simple tasks |
| Cost estimate | Artificially high (applies expensive AI everywhere) |
| Value | Proves "agent everywhere" is wasteful |

### Baseline C: Always-L5 (Classify Everything as Multi-Agent)
| Metric | Expected Result |
|--------|----------------|
| Agreement with expert | Low (~20%) — few tasks genuinely need multi-agent |
| Right-sizing | Massively over-classifies |
| Cost estimate | Extremely high |
| Value | Proves maximum sophistication is almost always wrong |

### Comparison Protocol
For each test scenario:
1. Run through Promethean's full pipeline — record classifications
2. Generate baseline classifications (trivially: all-L0, all-L4, all-L5)
3. Have a human expert independently classify each substep
4. Compute agreement rate: `(matching classifications) / (total substeps)`
5. Compute cost ratio: `(Promethean estimated cost) / (baseline estimated cost)`

---

## 4. Metrics Table

| Metric | Definition | Target | Measurement Method |
|--------|-----------|--------|-------------------|
| Classification Accuracy | % of substeps matching expert judgment | ≥ 75% | Expert comparison across all test scenarios |
| Right-Sizing Rate | % of substeps classified lower than Always-L4 baseline | ≥ 30% | Comparison against Always-L4 baseline |
| Pipeline Completion Rate | % of test scenarios completing all 4 phases | 100% | Automated tracking |
| Pipeline Latency | Time from start to governance output (excluding human review) | < 5 min | Timestamp measurement |
| Per-Agent Latency | Time for each agent to produce output | < 60s | Timestamp measurement |
| Human Approval Rate | % of phases approved without rejection | ≥ 80% | Tracking approve vs. reject actions |
| Confidence Calibration | When agent says 90% confident, correct 85–95% of the time | ±10% | Statistical analysis of confidence vs. accuracy |
| Schema Validation Pass Rate | % of agent outputs that are valid JSON matching expected schema | 100% | Automated JSON schema validation |
| Error Recovery Rate | % of rejections that produce improved output on retry | ≥ 90% | Manual assessment of rejection → re-generation cycles |
| Cost Efficiency | Promethean cost estimate vs. Always-L4 baseline | ≤ 70% of baseline | Cost comparison calculation |
| Governance Completeness | % of deployed workflows with full monitoring config | 100% | Automated check |
| Zero-L5 Rate | % of substeps correctly NOT classified as L5 | ≥ 95% | Count L5 classifications |

---

## 5. Evaluation Execution Plan (Phase 3)

### Step 1: Prepare Test Data
- Finalize the 5 test scenarios with exact input strings
- Create the expert classification rubric for Scenarios 1 and 2
- Document expected outputs for Scenarios 3, 4, and 5

### Step 2: Execute Pipeline Runs
- Run each scenario through the full pipeline
- Record all agent outputs, timestamps, and intermediate states
- Save interaction traces for the evidence package

### Step 3: Human Expert Review
- Have team members independently classify substeps for Scenarios 1 and 2
- Compare against Promethean's classifications
- Calculate agreement metrics

### Step 4: Baseline Comparison
- Generate Always-L0, Always-L4, and Always-L5 baselines for each scenario
- Compare against expert judgment and Promethean output
- Calculate cost and accuracy differentials

### Step 5: Failure Analysis
- Identify at least 2 concrete failure cases
- Document why the failure occurred
- Propose mitigations or improvements

### Step 6: Compile Evidence Package
- Interaction traces with JSON data structures
- Metrics calculations
- Screenshots of key pipeline states
- Failure case documentation
