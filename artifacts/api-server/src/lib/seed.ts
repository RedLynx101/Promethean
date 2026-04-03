import { db } from "@workspace/db";
import { templatesTable, workflowsTable, executionsTable, alertsTable } from "@workspace/db";
import { logger } from "./logger";

const TEMPLATES = [
  {
    name: "CRM Lead Qualification",
    description:
      "Automated pipeline for qualifying inbound sales leads using multi-agent AI scoring, enrichment, and CRM routing.",
    domain: "Sales",
    tags: ["crm", "lead-gen", "sales", "ai-scoring"],
    rating: "4.8",
    usageCount: 342,
    estimatedCostPerRun: "0.082",
    estimatedLatencyMs: 4200,
    isPublic: true,
    nodes: [
      { id: "trigger-1", type: "custom", position: { x: 50, y: 200 }, data: { label: "New Lead Intake", description: "CRM form submission or API trigger", systemLevel: 0, confidence: 98, status: "idle", tools: ["webhook", "postgres"] } },
      { id: "validate-1", type: "custom", position: { x: 300, y: 200 }, data: { label: "Data Validation", description: "Validate email, phone, company fields", systemLevel: 0, confidence: 99, status: "idle", tools: ["zod", "regex"] } },
      { id: "enrich-1", type: "custom", position: { x: 550, y: 100 }, data: { label: "Company Enrichment", description: "Fetch company data from Clearbit/Apollo", systemLevel: 1, confidence: 88, status: "idle", tools: ["clearbit-api", "apollo-api"] } },
      { id: "score-1", type: "custom", position: { x: 550, y: 300 }, data: { label: "AI Lead Scoring", description: "GPT scores lead quality using ICP criteria", systemLevel: 3, confidence: 82, status: "idle", tools: ["openai.chat"] } },
      { id: "route-1", type: "custom", position: { x: 800, y: 200 }, data: { label: "Routing Decision", description: "Route hot/warm/cold leads to correct queue", systemLevel: 0, confidence: 97, status: "idle", tools: ["postgres", "redis"] } },
      { id: "notify-1", type: "custom", position: { x: 1050, y: 200 }, data: { label: "Sales Rep Notification", description: "Slack alert with lead summary for hot leads", systemLevel: 0, confidence: 99, status: "idle", tools: ["slack-api"] } },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "validate-1", type: "default", data: { label: "on submit" } },
      { id: "e2-3", source: "validate-1", target: "enrich-1", type: "default", data: { label: "valid" } },
      { id: "e2-4", source: "validate-1", target: "score-1", type: "parallel", data: { label: "parallel" } },
      { id: "e3-5", source: "enrich-1", target: "route-1", type: "default", data: { label: "enriched" } },
      { id: "e4-5", source: "score-1", target: "route-1", type: "default", data: { label: "scored" } },
      { id: "e5-6", source: "route-1", target: "notify-1", type: "conditional", data: { label: "if hot lead", condition: "score >= 80" } },
    ],
  },
  {
    name: "Compliance Memo Generator",
    description:
      "Multi-agent pipeline that analyzes regulatory updates, cross-references internal policies, and drafts compliance memos for legal review.",
    domain: "Legal & Compliance",
    tags: ["compliance", "legal", "regulatory", "document-gen"],
    rating: "4.6",
    usageCount: 178,
    estimatedCostPerRun: "0.245",
    estimatedLatencyMs: 12000,
    isPublic: true,
    nodes: [
      { id: "trigger-1", type: "custom", position: { x: 50, y: 250 }, data: { label: "Regulatory Update Trigger", description: "Monitor regulatory feeds or manual upload", systemLevel: 0, confidence: 95, status: "idle", tools: ["rss-feed", "webhook"] } },
      { id: "extract-1", type: "custom", position: { x: 300, y: 250 }, data: { label: "Document NLP Extraction", description: "Extract requirements from regulatory text", systemLevel: 2, confidence: 84, status: "idle", tools: ["spacy", "huggingface"] } },
      { id: "policy-1", type: "custom", position: { x: 550, y: 150 }, data: { label: "Policy Gap Analysis", description: "Compare against current internal policies", systemLevel: 4, confidence: 78, status: "idle", tools: ["openai.chat", "vector-search"] } },
      { id: "research-1", type: "custom", position: { x: 550, y: 350 }, data: { label: "Regulatory Research", description: "Search precedents and similar rulings", systemLevel: 4, confidence: 80, status: "idle", tools: ["openai.chat", "web-search"] } },
      { id: "draft-1", type: "custom", position: { x: 800, y: 250 }, data: { label: "Memo Drafting Agent", description: "GPT drafts compliance memo from analysis", systemLevel: 3, confidence: 88, status: "idle", tools: ["openai.chat"] } },
      { id: "review-1", type: "custom", position: { x: 1050, y: 250 }, data: { label: "Human Legal Review", description: "Attorney reviews and approves memo", systemLevel: 0, confidence: 99, status: "idle", tools: ["docusign", "slack-api"] } },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "extract-1", type: "default", data: { label: "" } },
      { id: "e2-3", source: "extract-1", target: "policy-1", type: "parallel", data: { label: "parallel" } },
      { id: "e2-4", source: "extract-1", target: "research-1", type: "parallel", data: { label: "parallel" } },
      { id: "e3-5", source: "policy-1", target: "draft-1", type: "default", data: { label: "" } },
      { id: "e4-5", source: "research-1", target: "draft-1", type: "default", data: { label: "" } },
      { id: "e5-6", source: "draft-1", target: "review-1", type: "default", data: { label: "for review" } },
    ],
  },
  {
    name: "Cybersecurity Incident Response",
    description:
      "Automated incident detection, triage, evidence collection, and coordinated response with human escalation gates for critical threats.",
    domain: "Security",
    tags: ["security", "incident-response", "soc", "automation"],
    rating: "4.9",
    usageCount: 521,
    estimatedCostPerRun: "0.038",
    estimatedLatencyMs: 1800,
    isPublic: true,
    nodes: [
      { id: "detect-1", type: "custom", position: { x: 50, y: 250 }, data: { label: "Threat Detection", description: "SIEM alert triggers pipeline", systemLevel: 1, confidence: 92, status: "idle", tools: ["splunk", "datadog-security"] } },
      { id: "triage-1", type: "custom", position: { x: 300, y: 250 }, data: { label: "Automated Triage", description: "ML classifier determines severity and type", systemLevel: 1, confidence: 89, status: "idle", tools: ["sklearn", "tensorflow"] } },
      { id: "evidence-1", type: "custom", position: { x: 550, y: 150 }, data: { label: "Evidence Collection", description: "Gather logs, network captures, artifacts", systemLevel: 0, confidence: 97, status: "idle", tools: ["aws-cloudtrail", "osquery"] } },
      { id: "analyze-1", type: "custom", position: { x: 550, y: 350 }, data: { label: "AI Threat Analysis", description: "Correlate IoCs and determine attack vector", systemLevel: 4, confidence: 76, status: "idle", tools: ["openai.chat", "virustotal-api"] } },
      { id: "contain-1", type: "custom", position: { x: 800, y: 250 }, data: { label: "Auto-Containment", description: "Block IPs, isolate hosts, revoke tokens", systemLevel: 0, confidence: 95, status: "idle", tools: ["aws-security-groups", "okta-api"] } },
      { id: "escalate-1", type: "custom", position: { x: 1050, y: 150 }, data: { label: "SOC Escalation", description: "Page SOC analyst for critical incidents", systemLevel: 0, confidence: 99, status: "idle", tools: ["pagerduty", "slack-api"] } },
      { id: "report-1", type: "custom", position: { x: 1050, y: 350 }, data: { label: "Incident Report", description: "Auto-generate incident report", systemLevel: 3, confidence: 85, status: "idle", tools: ["openai.chat", "confluence-api"] } },
    ],
    edges: [
      { id: "e1-2", source: "detect-1", target: "triage-1", type: "default", data: { label: "" } },
      { id: "e2-3", source: "triage-1", target: "evidence-1", type: "parallel", data: { label: "parallel" } },
      { id: "e2-4", source: "triage-1", target: "analyze-1", type: "parallel", data: { label: "parallel" } },
      { id: "e3-5", source: "evidence-1", target: "contain-1", type: "default", data: { label: "" } },
      { id: "e4-5", source: "analyze-1", target: "contain-1", type: "default", data: { label: "" } },
      { id: "e5-6", source: "contain-1", target: "escalate-1", type: "conditional", data: { label: "if critical", condition: "severity === 'critical'" } },
      { id: "e5-7", source: "contain-1", target: "report-1", type: "default", data: { label: "always" } },
    ],
  },
  {
    name: "Customer Support Triage",
    description:
      "Intelligent ticket routing, priority classification, sentiment analysis, and automated first-response generation for support teams.",
    domain: "Customer Success",
    tags: ["support", "ticketing", "nlp", "customer-success"],
    rating: "4.7",
    usageCount: 893,
    estimatedCostPerRun: "0.024",
    estimatedLatencyMs: 2100,
    isPublic: true,
    nodes: [
      { id: "ticket-1", type: "custom", position: { x: 50, y: 250 }, data: { label: "Ticket Ingestion", description: "Receive ticket from Zendesk/Intercom/email", systemLevel: 0, confidence: 99, status: "idle", tools: ["zendesk-api", "intercom-api"] } },
      { id: "classify-1", type: "custom", position: { x: 300, y: 150 }, data: { label: "Intent Classification", description: "NLP classify: bug, feature, billing, etc.", systemLevel: 2, confidence: 91, status: "idle", tools: ["huggingface-transformers"] } },
      { id: "sentiment-1", type: "custom", position: { x: 300, y: 350 }, data: { label: "Sentiment Analysis", description: "Detect frustration, urgency, churn risk", systemLevel: 2, confidence: 87, status: "idle", tools: ["huggingface-transformers"] } },
      { id: "priority-1", type: "custom", position: { x: 550, y: 250 }, data: { label: "Priority Scoring", description: "Combine intent + sentiment + customer tier", systemLevel: 0, confidence: 96, status: "idle", tools: ["postgres", "redis"] } },
      { id: "response-1", type: "custom", position: { x: 800, y: 150 }, data: { label: "Auto-Response Draft", description: "GPT drafts personalized first response", systemLevel: 3, confidence: 84, status: "idle", tools: ["openai.chat"] } },
      { id: "route-1", type: "custom", position: { x: 800, y: 350 }, data: { label: "Agent Routing", description: "Route to specialist queue based on type", systemLevel: 0, confidence: 98, status: "idle", tools: ["zendesk-api"] } },
      { id: "notify-1", type: "custom", position: { x: 1050, y: 250 }, data: { label: "Agent Notification", description: "Alert assigned agent with context summary", systemLevel: 0, confidence: 99, status: "idle", tools: ["slack-api"] } },
    ],
    edges: [
      { id: "e1-2", source: "ticket-1", target: "classify-1", type: "parallel", data: { label: "parallel" } },
      { id: "e1-3", source: "ticket-1", target: "sentiment-1", type: "parallel", data: { label: "parallel" } },
      { id: "e2-4", source: "classify-1", target: "priority-1", type: "default", data: { label: "" } },
      { id: "e3-4", source: "sentiment-1", target: "priority-1", type: "default", data: { label: "" } },
      { id: "e4-5", source: "priority-1", target: "response-1", type: "parallel", data: { label: "parallel" } },
      { id: "e4-6", source: "priority-1", target: "route-1", type: "parallel", data: { label: "parallel" } },
      { id: "e5-7", source: "response-1", target: "notify-1", type: "default", data: { label: "" } },
      { id: "e6-7", source: "route-1", target: "notify-1", type: "default", data: { label: "" } },
    ],
  },
  {
    name: "Code Review Pipeline",
    description:
      "Automated PR analysis: static analysis, security scanning, complexity scoring, AI code review, and test generation with gating controls.",
    domain: "Engineering",
    tags: ["devops", "code-review", "ci-cd", "security"],
    rating: "4.5",
    usageCount: 267,
    estimatedCostPerRun: "0.156",
    estimatedLatencyMs: 18000,
    isPublic: true,
    nodes: [
      { id: "pr-1", type: "custom", position: { x: 50, y: 250 }, data: { label: "PR Webhook", description: "GitHub/GitLab PR opened/updated", systemLevel: 0, confidence: 99, status: "idle", tools: ["github-webhooks"] } },
      { id: "static-1", type: "custom", position: { x: 300, y: 100 }, data: { label: "Static Analysis", description: "ESLint, SonarQube, TypeScript strict checks", systemLevel: 0, confidence: 99, status: "idle", tools: ["eslint", "sonarqube", "tsc"] } },
      { id: "security-1", type: "custom", position: { x: 300, y: 250 }, data: { label: "Security Scan", description: "SAST: check for OWASP top 10 vulnerabilities", systemLevel: 1, confidence: 88, status: "idle", tools: ["semgrep", "snyk"] } },
      { id: "complexity-1", type: "custom", position: { x: 300, y: 400 }, data: { label: "Complexity Scoring", description: "Cyclomatic complexity and maintainability index", systemLevel: 0, confidence: 97, status: "idle", tools: ["complexity-report"] } },
      { id: "ai-review-1", type: "custom", position: { x: 600, y: 250 }, data: { label: "AI Code Review", description: "Multi-agent: architecture + security + style", systemLevel: 5, confidence: 75, status: "idle", tools: ["openai.chat", "anthropic"] } },
      { id: "tests-1", type: "custom", position: { x: 900, y: 150 }, data: { label: "Test Generation", description: "Generate missing unit tests for new code", systemLevel: 3, confidence: 82, status: "idle", tools: ["openai.chat"] } },
      { id: "gate-1", type: "custom", position: { x: 900, y: 350 }, data: { label: "Quality Gate", description: "Block merge if critical issues found", systemLevel: 0, confidence: 99, status: "idle", tools: ["github-api"] } },
      { id: "comment-1", type: "custom", position: { x: 1150, y: 250 }, data: { label: "PR Comment Summary", description: "Post consolidated review comment on PR", systemLevel: 3, confidence: 90, status: "idle", tools: ["github-api", "openai.chat"] } },
    ],
    edges: [
      { id: "e1-2", source: "pr-1", target: "static-1", type: "parallel", data: { label: "parallel" } },
      { id: "e1-3", source: "pr-1", target: "security-1", type: "parallel", data: { label: "parallel" } },
      { id: "e1-4", source: "pr-1", target: "complexity-1", type: "parallel", data: { label: "parallel" } },
      { id: "e2-5", source: "static-1", target: "ai-review-1", type: "default", data: { label: "" } },
      { id: "e3-5", source: "security-1", target: "ai-review-1", type: "default", data: { label: "" } },
      { id: "e4-5", source: "complexity-1", target: "ai-review-1", type: "default", data: { label: "" } },
      { id: "e5-6", source: "ai-review-1", target: "tests-1", type: "parallel", data: { label: "parallel" } },
      { id: "e5-7", source: "ai-review-1", target: "gate-1", type: "parallel", data: { label: "parallel" } },
      { id: "e6-8", source: "tests-1", target: "comment-1", type: "default", data: { label: "" } },
      { id: "e7-8", source: "gate-1", target: "comment-1", type: "default", data: { label: "" } },
    ],
  },
  {
    name: "Data Quality Check",
    description:
      "Automated pipeline for validating data ingestion quality, detecting schema drift, profiling data, and alerting on anomalies.",
    domain: "Data Engineering",
    tags: ["data-quality", "etl", "monitoring", "data-engineering"],
    rating: "4.4",
    usageCount: 156,
    estimatedCostPerRun: "0.012",
    estimatedLatencyMs: 8500,
    isPublic: true,
    nodes: [
      { id: "ingest-1", type: "custom", position: { x: 50, y: 250 }, data: { label: "Data Ingestion Trigger", description: "New batch or streaming data arrived", systemLevel: 0, confidence: 99, status: "idle", tools: ["kafka", "s3-events"] } },
      { id: "schema-1", type: "custom", position: { x: 300, y: 150 }, data: { label: "Schema Validation", description: "Validate against expected schema with Pydantic", systemLevel: 0, confidence: 99, status: "idle", tools: ["pydantic", "great-expectations"] } },
      { id: "profile-1", type: "custom", position: { x: 300, y: 350 }, data: { label: "Statistical Profiling", description: "Compute distributions, null rates, cardinality", systemLevel: 1, confidence: 93, status: "idle", tools: ["pandas-profiling", "ydata-profiling"] } },
      { id: "drift-1", type: "custom", position: { x: 550, y: 150 }, data: { label: "Schema Drift Detection", description: "Compare against historical schema versions", systemLevel: 0, confidence: 97, status: "idle", tools: ["postgres", "dbt"] } },
      { id: "anomaly-1", type: "custom", position: { x: 550, y: 350 }, data: { label: "Anomaly Detection", description: "ML model detects statistical outliers", systemLevel: 1, confidence: 86, status: "idle", tools: ["sklearn", "pyod"] } },
      { id: "report-1", type: "custom", position: { x: 800, y: 250 }, data: { label: "Quality Report", description: "Generate data quality score and summary", systemLevel: 3, confidence: 82, status: "idle", tools: ["openai.chat", "pandas"] } },
      { id: "alert-1", type: "custom", position: { x: 1050, y: 150 }, data: { label: "Alert on Failures", description: "Page data team if quality below threshold", systemLevel: 0, confidence: 99, status: "idle", tools: ["pagerduty", "slack-api"] } },
      { id: "store-1", type: "custom", position: { x: 1050, y: 350 }, data: { label: "Store Quality Metrics", description: "Persist results to data catalog", systemLevel: 0, confidence: 99, status: "idle", tools: ["postgres", "datahub"] } },
    ],
    edges: [
      { id: "e1-2", source: "ingest-1", target: "schema-1", type: "parallel", data: { label: "parallel" } },
      { id: "e1-3", source: "ingest-1", target: "profile-1", type: "parallel", data: { label: "parallel" } },
      { id: "e2-4", source: "schema-1", target: "drift-1", type: "default", data: { label: "" } },
      { id: "e3-5", source: "profile-1", target: "anomaly-1", type: "default", data: { label: "" } },
      { id: "e4-6", source: "drift-1", target: "report-1", type: "default", data: { label: "" } },
      { id: "e5-6", source: "anomaly-1", target: "report-1", type: "default", data: { label: "" } },
      { id: "e6-7", source: "report-1", target: "alert-1", type: "conditional", data: { label: "if quality < 90%", condition: "qualityScore < 90" } },
      { id: "e6-8", source: "report-1", target: "store-1", type: "default", data: { label: "always" } },
    ],
  },
];

const SAMPLE_WORKFLOWS = [
  {
    name: "Customer Support Triage",
    description: "Live customer support ticket routing and response pipeline",
    domain: "Customer Success",
    status: "active",
    phase: "deployed",
    version: "2.1.0",
    nodes: [
      { id: "trigger-1", type: "custom", position: { x: 50, y: 200 }, data: { label: "Ticket Intake", description: "New support ticket via Zendesk or email", systemLevel: 0, confidence: 99, tools: ["zendesk", "webhook"] } },
      { id: "classify-1", type: "custom", position: { x: 320, y: 200 }, data: { label: "Intent Classification", description: "NLP to classify ticket type and urgency", systemLevel: 2, confidence: 88, tools: ["huggingface", "spacy"] } },
      { id: "sentiment-1", type: "custom", position: { x: 590, y: 100 }, data: { label: "Sentiment Analysis", description: "Detect customer sentiment and frustration", systemLevel: 2, confidence: 84, tools: ["openai.chat"] } },
      { id: "triage-1", type: "custom", position: { x: 590, y: 300 }, data: { label: "Priority Scoring", description: "Score ticket priority using ML model", systemLevel: 1, confidence: 91, tools: ["ml-model", "postgres"] } },
      { id: "route-1", type: "custom", position: { x: 860, y: 200 }, data: { label: "Routing Engine", description: "Route to correct agent queue", systemLevel: 0, confidence: 98, tools: ["redis", "postgres"] } },
      { id: "response-1", type: "custom", position: { x: 1130, y: 200 }, data: { label: "Auto-Response Draft", description: "GPT drafts first response for agent review", systemLevel: 3, confidence: 80, tools: ["openai.chat"] } },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "classify-1", type: "default", data: {} },
      { id: "e2-3", source: "classify-1", target: "sentiment-1", type: "default", data: {} },
      { id: "e2-4", source: "classify-1", target: "triage-1", type: "default", data: {} },
      { id: "e3-5", source: "sentiment-1", target: "route-1", type: "default", data: {} },
      { id: "e4-5", source: "triage-1", target: "route-1", type: "default", data: {} },
      { id: "e5-6", source: "route-1", target: "response-1", type: "default", data: {} },
    ],
  },
  {
    name: "Sales Lead Enrichment",
    description: "AI-powered lead scoring and CRM enrichment",
    domain: "Sales",
    status: "active",
    phase: "deployed",
    version: "1.3.0",
    nodes: [
      { id: "trigger-1", type: "custom", position: { x: 50, y: 200 }, data: { label: "New Lead Intake", description: "CRM form or API webhook trigger", systemLevel: 0, confidence: 98, tools: ["webhook", "postgres"] } },
      { id: "validate-1", type: "custom", position: { x: 300, y: 200 }, data: { label: "Data Validation", description: "Validate email, phone, company", systemLevel: 0, confidence: 99, tools: ["zod", "regex"] } },
      { id: "enrich-1", type: "custom", position: { x: 550, y: 100 }, data: { label: "Company Enrichment", description: "Fetch data from Clearbit/Apollo", systemLevel: 1, confidence: 88, tools: ["clearbit-api", "apollo-api"] } },
      { id: "score-1", type: "custom", position: { x: 550, y: 300 }, data: { label: "AI Lead Scoring", description: "GPT scores lead quality using ICP", systemLevel: 3, confidence: 82, tools: ["openai.chat"] } },
      { id: "route-1", type: "custom", position: { x: 800, y: 200 }, data: { label: "Routing Decision", description: "Route hot/warm/cold leads to queue", systemLevel: 0, confidence: 97, tools: ["postgres", "redis"] } },
      { id: "notify-1", type: "custom", position: { x: 1050, y: 200 }, data: { label: "Sales Notification", description: "Slack alert for hot leads", systemLevel: 0, confidence: 99, tools: ["slack-api"] } },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "validate-1", type: "default", data: {} },
      { id: "e2-3", source: "validate-1", target: "enrich-1", type: "default", data: {} },
      { id: "e2-4", source: "validate-1", target: "score-1", type: "default", data: {} },
      { id: "e3-5", source: "enrich-1", target: "route-1", type: "default", data: {} },
      { id: "e4-5", source: "score-1", target: "route-1", type: "default", data: {} },
      { id: "e5-6", source: "route-1", target: "notify-1", type: "default", data: {} },
    ],
  },
  {
    name: "Code Review Bot",
    description: "Automated PR review with security scanning",
    domain: "Engineering",
    status: "building",
    phase: "orchestrate",
    version: "0.4.0",
    nodes: [
      { id: "trigger-1", type: "custom", position: { x: 50, y: 200 }, data: { label: "PR Opened", description: "GitHub webhook on pull request", systemLevel: 0, confidence: 99, tools: ["github-api"] } },
      { id: "static-1", type: "custom", position: { x: 300, y: 100 }, data: { label: "Static Analysis", description: "ESLint, Semgrep, type checking", systemLevel: 0, confidence: 97, tools: ["eslint", "semgrep", "tsc"] } },
      { id: "security-1", type: "custom", position: { x: 300, y: 300 }, data: { label: "Security Scan", description: "Dependency audit and SAST", systemLevel: 0, confidence: 95, tools: ["snyk", "trivy"] } },
      { id: "ai-review-1", type: "custom", position: { x: 580, y: 200 }, data: { label: "AI Code Review", description: "GPT reviews code quality and logic", systemLevel: 4, confidence: 79, tools: ["openai.chat", "github-api"] } },
      { id: "gate-1", type: "custom", position: { x: 850, y: 200 }, data: { label: "Human Gate", description: "Senior dev reviews AI suggestions", systemLevel: 0, confidence: 99, nodeCategory: "human_gate", tools: ["slack-api", "github-api"] } },
      { id: "comment-1", type: "custom", position: { x: 1100, y: 200 }, data: { label: "PR Comment", description: "Post review comments to GitHub PR", systemLevel: 0, confidence: 99, tools: ["github-api"] } },
    ],
    edges: [
      { id: "e1-2", source: "trigger-1", target: "static-1", type: "default", data: {} },
      { id: "e1-3", source: "trigger-1", target: "security-1", type: "default", data: {} },
      { id: "e2-4", source: "static-1", target: "ai-review-1", type: "default", data: {} },
      { id: "e3-4", source: "security-1", target: "ai-review-1", type: "default", data: {} },
      { id: "e4-5", source: "ai-review-1", target: "gate-1", type: "default", data: {} },
      { id: "e5-6", source: "gate-1", target: "comment-1", type: "default", data: {} },
    ],
  },
];

export async function seedDatabase() {
  // Check if already seeded
  const existingTemplates = await db.select().from(templatesTable);
  if (existingTemplates.length > 0) {
    logger.info("Database already seeded, skipping");
    return;
  }

  logger.info("Seeding database with template data...");

  // Insert templates
  await db.insert(templatesTable).values(
    TEMPLATES.map((t) => ({
      ...t,
      nodes: t.nodes as never,
      edges: t.edges as never,
    }))
  );

  // Insert sample workflows
  const insertedWorkflows = await db.insert(workflowsTable).values(
    SAMPLE_WORKFLOWS.map((w) => ({
      ...w,
      nodes: (w.nodes ?? []) as never,
      edges: (w.edges ?? []) as never,
      governanceConfig: {
        loggingLevel: "standard",
        autoSnapshot: true,
        latencyThreshold: 30000,
        costThreshold: 0.5,
        errorRateThreshold: 0.05,
        alertChannels: ["slack"],
      } as never,
      systemTypeSummary: { L0: 2, L1: 1, L2: 1, L3: 1 } as never,
      estimatedCostPerRun: "0.042",
      estimatedLatencyMs: 3500,
      tags: [] as string[],
    }))
  ).returning();

  // Add simulated executions for each workflow
  const now = Date.now();
  for (const workflow of insertedWorkflows) {
    const executionData = [];
    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.random() * 14;
      const status = Math.random() > 0.1 ? "success" : "failed";
      const startedAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
      const latency = 2000 + Math.random() * 5000;
      const cost = 0.02 + Math.random() * 0.1;

      executionData.push({
        workflowId: workflow.id,
        workflowVersion: workflow.version,
        triggeredBy: "manual",
        status,
        startedAt,
        completedAt: new Date(startedAt.getTime() + latency),
        totalCost: String(cost.toFixed(6)),
        totalLatencyMs: Math.round(latency),
      });
    }
    await db.insert(executionsTable).values(executionData);

    // Add some alerts
    if (Math.random() > 0.5) {
      await db.insert(alertsTable).values([
        {
          workflowId: workflow.id,
          alertType: "latency_spike",
          severity: "warning",
          title: "Latency threshold exceeded",
          description: "Average latency increased by 35% over the last hour",
          status: "active",
        },
      ]);
    }
  }

  logger.info("Database seeded successfully");
}
