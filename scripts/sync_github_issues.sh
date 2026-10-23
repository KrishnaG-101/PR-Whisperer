#!/usr/bin/env bash
# ==============================================================================
# PR-Whisperer: GitHub Issues Synchronization Script
# Synchronizes TASK-01 through TASK-10 from docs/backlog-tracker.md to GitHub Issues
# ==============================================================================

set -euo pipefail

echo "======================================================================"
echo "PR-Whisperer Backlog -> GitHub Issues Synchronizer"
echo "======================================================================"

# Verify gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "[-] Error: GitHub CLI ('gh') is not installed."
    echo "    Please install it via: https://cli.github.com/ or use the in-repo tracker:"
    echo "    docs/backlog-tracker.md"
    exit 1
fi

# Verify gh authentication
if ! gh auth status &> /dev/null; then
    echo "[-] Error: 'gh' is not authenticated. Please run 'gh auth login' first."
    exit 1
fi

echo "[+] Authenticated with GitHub CLI successfully."

# Ensure required labels exist
labels=("role:pm" "role:swe" "role:qa" "role:oncall" "track:hackathon" "rubric:zoomcamp")
colors=("0075ca" "e99695" "d4c5f9" "f9d0c4" "5319e7" "0e8a16")

for i in "${!labels[@]}"; do
    label="${labels[$i]}"
    color="${colors[$i]}"
    gh label create "$label" --color "$color" --force || true
done

echo "[+] Labels verified."

# Function to create an issue if not already present
create_task_issue() {
    local task_id="$1"
    local title="$2"
    local role_label="$3"
    local body="$4"

    echo "[*] Processing $task_id: $title..."

    # Check if issue already exists
    existing=$(gh issue list --search "$task_id in:title" --json number --jq '.[0].number' 2>/dev/null || true)

    if [ -n "$existing" ]; then
        echo "    [~] Issue already exists as #$existing. Skipping creation."
    else
        gh issue create \
            --title "[$task_id] $title" \
            --body "$body" \
            --label "$role_label,track:hackathon,rubric:zoomcamp"
        echo "    [+] Created issue for $task_id."
    fi
}

# TASK-01
create_task_issue "TASK-01" \
"Repository Foundation, Documentation & Agent Context Architecture" \
"role:pm" \
"### Task Overview
Establish repository scaffolding, comprehensive documentation, agent team protocols, context router, and backlog tracker.

### Assigned Agent
- \`role:pm\`, \`role:swe\`

### Acceptance Criteria
- [x] README.md with Problem Description (Rubric 1) and ASCII architecture.
- [x] product-spec.md with 6 user stories (Given/When/Then), non-goals, and pre-seeded PR definitions.
- [x] AGENTS.md root context router with tech stack constraints and security rules.
- [x] Modular documentation in docs/ (agent-team.md, process.md, backlog-tracker.md, architecture.md, observability-and-oncall.md, testing-and-cicd.md).
- [x] scripts/sync_github_issues.sh script created."

# TASK-02
create_task_issue "TASK-02" \
"Canonical OpenAPI 3.1.0 Contract Definition" \
"role:swe" \
"### Task Overview
Define the complete, canonical openapi.yaml specification at the repository root governing all 8 endpoints and schemas.

### Assigned Agent
- \`role:swe\`, \`role:qa\`

### Acceptance Criteria
- [x] OpenAPI 3.1.0 root spec valid.
- [x] Endpoints defined: /health, /prs, /prs/{id}, /prs/{id}/voice-analyze, /queryspeak, /telemetry/summary, /incidents/simulate-and-respond.
- [x] Complete Pydantic/DTO parity schemas."

# TASK-03
create_task_issue "TASK-03" \
"FastAPI Backend Scaffolding & Database Persistence Layer" \
"role:swe" \
"### Task Overview
Implement FastAPI application structure, SQLAlchemy 2.0 ORM models, Pydantic schemas mirroring openapi.yaml, and seed migrations.

### Assigned Agent
- \`role:swe\`

### Acceptance Criteria
- [ ] FastAPI boots cleanly with CORS and lifespan handlers.
- [ ] SQLAlchemy models: PullRequestRecord, VoiceReviewSessionRecord, ReviewCommentItemRecord, IncidentAlertRecord.
- [ ] Database auto-seeding for PR-101, PR-102, PR-103.
- [ ] GET /api/v1/health returns 200 with DB status."

# TASK-04
create_task_issue "TASK-04" \
"Deterministic Guardrails & OpenAPI Drift Engine" \
"role:swe" \
"### Task Overview
Build mathematical, zero-hallucination guardrail scanners (regex and AST based) for secret detection, SQL injection, missing auth decorators, and OpenAPI contract drift.

### Assigned Agent
- \`role:swe\`, \`role:qa\`

### Acceptance Criteria
- [ ] Flags sk_live_... keys and f-string SQL injection.
- [ ] Detects undocumented endpoints vs openapi.yaml.
- [ ] Calculates 0-100 readiness_score with exact severity weighting."

# TASK-05
create_task_issue "TASK-05" \
"Wispr Flow Transcript Parser & Fallback Engine" \
"role:swe" \
"### Task Overview
Implement continuous voice transcript parsing engine mapping spoken sentences to line-pinned review comments, suggested patches, and Coding Agent Fix Prompt.

### Assigned Agent
- \`role:swe\`

### Acceptance Criteria
- [ ] Parses spoken file/line critiques into ReviewCommentItem cards.
- [ ] Synthesizes suggested replacement diff patches.
- [ ] Formats Coding Agent Fix Prompt for Claude Code / Cursor / MCP.
- [ ] 100% deterministic fallback when GEMINI_API_KEY is not set."

# TASK-06
create_task_issue "TASK-06" \
"QuerySpeak Voice Audit Engine" \
"role:swe" \
"### Task Overview
Implement POST /api/v1/queryspeak endpoint extracting filter intents from natural voice queries to search across historical PR reviews.

### Assigned Agent
- \`role:swe\`

### Acceptance Criteria
- [ ] Extracts severity, category, keyword filters from speech.
- [ ] Returns matching comments, PRs, and executive insight summary.
- [ ] Handles edge cases and empty queries gracefully."

# TASK-07
create_task_issue "TASK-07" \
"OpenTelemetry Pipeline, Metrics & Secret Scrubber" \
"role:swe" \
"### Task Overview
Instrument FastAPI with OpenTelemetry tracing, span injection (trace_id), Prometheus error metrics, and deterministic PII/secret scrubber.

### Assigned Agent
- \`role:swe\`, \`role:oncall\`

### Acceptance Criteria
- [ ] Injects trace_id into X-Trace-ID response headers and structured logs.
- [ ] Zero API keys, passwords, or bearer tokens leaked in telemetry.
- [ ] Tracks voice_analyze_error_rate metric for alerting."

# TASK-08
create_task_issue "TASK-08" \
"On-Call Responder Agent & Incident Drill Engine" \
"role:oncall" \
"### Task Overview
Build autonomous On-Call Responder Agent (incident-response/responder.py) and incident drill endpoint.

### Assigned Agent
- \`role:oncall\`

### Acceptance Criteria
- [ ] POST /api/v1/incidents/simulate-and-respond triggers user-impact alert.
- [ ] Responder agent reads read-only evidence packet by trace_id.
- [ ] Generates bounded remediation diff and records post-mortem log."

# TASK-09
create_task_issue "TASK-09" \
"React + Tailwind + Vite Split-Pane Review Studio UI" \
"role:swe" \
"### Task Overview
Build modern React 18 single-page application with Split-Pane Diff Viewer, Wispr Flow Voice Bar, QuerySpeak drawer, and Telemetry Drawer.

### Assigned Agent
- \`role:swe\`

### Acceptance Criteria
- [ ] 1-click loading of pre-seeded PRs and custom diff modal.
- [ ] Interactive line highlighting with color-coded severity badges.
- [ ] 1-click copy for Coding Agent Fix Prompt.
- [ ] Live Telemetry drawer showing trace_id and incident drills."

# TASK-10
create_task_issue "TASK-10" \
"Single-Command Docker Compose & CI/CD Pipeline" \
"role:qa" \
"### Task Overview
Author docker-compose.yml, Dockerfiles, and GitHub Actions CI workflow covering linting, contract check, unit tests, and integration tests.

### Assigned Agent
- \`role:qa\`, \`role:swe\`

### Acceptance Criteria
- [ ] docker compose up --build launches Frontend (:5173), Backend (:8000), DB (:5432), and Prometheus.
- [ ] GitHub Actions pipeline passes all checks on PR and main."

echo "======================================================================"
echo "[+] GitHub Issues Synchronization Complete!"
echo "======================================================================"
