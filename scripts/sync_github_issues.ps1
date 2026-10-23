# ==============================================================================
# PR-Whisperer: GitHub Issues Synchronization Script (PowerShell)
# Synchronizes TASK-01 through TASK-10 from docs/backlog-tracker.md to GitHub Issues
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "======================================================================"
Write-Host "PR-Whisperer Backlog -> GitHub Issues Synchronizer (PowerShell)"
Write-Host "======================================================================"

# Verify gh CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "[-] Error: GitHub CLI ('gh') is not installed." -ForegroundColor Red
    Write-Host "    Please install it via: https://cli.github.com/ or use the in-repo tracker:"
    Write-Host "    docs/backlog-tracker.md"
    exit 1
}

# Verify gh authentication
try {
    gh auth status 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[-] Error: 'gh' is not authenticated. Please run 'gh auth login' first." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[-] Error: 'gh' is not authenticated." -ForegroundColor Red
    exit 1
}

Write-Host "[+] Authenticated with GitHub CLI successfully." -ForegroundColor Green

# Ensure required labels exist
$labels = @(
    @{ Name = "role:pm"; Color = "0075ca" },
    @{ Name = "role:swe"; Color = "e99695" },
    @{ Name = "role:qa"; Color = "d4c5f9" },
    @{ Name = "role:oncall"; Color = "f9d0c4" },
    @{ Name = "track:hackathon"; Color = "5319e7" },
    @{ Name = "rubric:zoomcamp"; Color = "0e8a16" }
)

foreach ($l in $labels) {
    try {
        gh label create $l.Name --color $l.Color --force 2>$null
    } catch {
        # ignore if already exists
    }
}

Write-Host "[+] Labels verified." -ForegroundColor Green

function Create-TaskIssue {
    param(
        [string]$taskId,
        [string]$title,
        [string]$roleLabel,
        [string]$body
    )

    Write-Host "[*] Processing ${taskId}: $title..."

    try {
        $existing = gh issue list --search "$taskId in:title" --json number --jq '.[0].number' 2>$null
    } catch {
        $existing = ""
    }

    if ($existing -and $existing.Trim() -ne "" -and $existing.Trim() -ne "null") {
        Write-Host "    [~] Issue already exists as #$($existing.Trim()). Skipping creation." -ForegroundColor Yellow
    } else {
        gh issue create `
            --title "[$taskId] $title" `
            --body "$body" `
            --label "$roleLabel,track:hackathon,rubric:zoomcamp"
        Write-Host "    [+] Created issue for $taskId." -ForegroundColor Green
    }
}

# TASK-01
Create-TaskIssue "TASK-01" `
"Repository Foundation, Documentation & Agent Context Architecture" `
"role:pm" `
@"
### Task Overview
Establish repository scaffolding, comprehensive documentation, agent team protocols, context router, and backlog tracker.

### Assigned Agent
- `role:pm`, `role:swe`

### Acceptance Criteria
- [x] README.md with Problem Description (Rubric 1) and ASCII architecture.
- [x] product-spec.md with 6 user stories (Given/When/Then), non-goals, and pre-seeded PR definitions.
- [x] AGENTS.md root context router with tech stack constraints and security rules.
- [x] Modular documentation in docs/ (agent-team.md, process.md, backlog-tracker.md, architecture.md, observability-and-oncall.md, testing-and-cicd.md).
- [x] scripts/sync_github_issues.sh and sync_github_issues.ps1 created.
"@

# TASK-02
Create-TaskIssue "TASK-02" `
"Canonical OpenAPI 3.1.0 Contract Definition" `
"role:swe" `
@"
### Task Overview
Define the complete, canonical openapi.yaml specification at the repository root governing all 8 endpoints and schemas.

### Assigned Agent
- `role:swe`, `role:qa`

### Acceptance Criteria
- [x] OpenAPI 3.1.0 root spec valid.
- [x] Endpoints defined: /health, /prs, /prs/{id}, /prs/{id}/voice-analyze, /queryspeak, /telemetry/summary, /incidents/simulate-and-respond.
- [x] Complete Pydantic/DTO parity schemas.
"@

# TASK-03
Create-TaskIssue "TASK-03" `
"FastAPI Backend Scaffolding & Database Persistence Layer" `
"role:swe" `
@"
### Task Overview
Implement FastAPI application structure, SQLAlchemy 2.0 ORM models, Pydantic schemas mirroring openapi.yaml, and seed migrations.

### Assigned Agent
- `role:swe`

### Acceptance Criteria
- [ ] FastAPI boots cleanly with CORS and lifespan handlers.
- [ ] SQLAlchemy models: PullRequestRecord, VoiceReviewSessionRecord, ReviewCommentItemRecord, IncidentAlertRecord.
- [ ] Database auto-seeding for PR-101, PR-102, PR-103.
- [ ] GET /api/v1/health returns 200 with DB status.
"@

# TASK-04
Create-TaskIssue "TASK-04" `
"Deterministic Guardrails & OpenAPI Drift Engine" `
"role:swe" `
@"
### Task Overview
Build mathematical, zero-hallucination guardrail scanners (regex and AST based) for secret detection, SQL injection, missing auth decorators, and OpenAPI contract drift.

### Assigned Agent
- `role:swe`, `role:qa`

### Acceptance Criteria
- [ ] Flags sk_live_... keys and f-string SQL injection.
- [ ] Detects undocumented endpoints vs openapi.yaml.
- [ ] Calculates 0-100 readiness_score with exact severity weighting.
"@

# TASK-05
Create-TaskIssue "TASK-05" `
"Wispr Flow Transcript Parser & Fallback Engine" `
"role:swe" `
@"
### Task Overview
Implement continuous voice transcript parsing engine mapping spoken sentences to line-pinned review comments, suggested patches, and Coding Agent Fix Prompt.

### Assigned Agent
- `role:swe`

### Acceptance Criteria
- [ ] Parses spoken file/line critiques into ReviewCommentItem cards.
- [ ] Synthesizes suggested replacement diff patches.
- [ ] Formats Coding Agent Fix Prompt for Claude Code / Cursor / MCP.
- [ ] 100% deterministic fallback when GEMINI_API_KEY is not set.
"@

# TASK-06
Create-TaskIssue "TASK-06" `
"QuerySpeak Voice Audit Engine" `
"role:swe" `
@"
### Task Overview
Implement POST /api/v1/queryspeak endpoint extracting filter intents from natural voice queries to search across historical PR reviews.

### Assigned Agent
- `role:swe`

### Acceptance Criteria
- [ ] Extracts severity, category, keyword filters from speech.
- [ ] Returns matching comments, PRs, and executive insight summary.
- [ ] Handles edge cases and empty queries gracefully.
"@

# TASK-07
Create-TaskIssue "TASK-07" `
"OpenTelemetry Pipeline, Metrics & Secret Scrubber" `
"role:swe" `
@"
### Task Overview
Instrument FastAPI with OpenTelemetry tracing, span injection (trace_id), Prometheus error metrics, and deterministic PII/secret scrubber.

### Assigned Agent
- `role:swe`, `role:oncall`

### Acceptance Criteria
- [ ] Injects trace_id into X-Trace-ID response headers and structured logs.
- [ ] Zero API keys, passwords, or bearer tokens leaked in telemetry.
- [ ] Tracks voice_analyze_error_rate metric for alerting.
"@

# TASK-08
Create-TaskIssue "TASK-08" `
"On-Call Responder Agent & Incident Drill Engine" `
"role:oncall" `
@"
### Task Overview
Build autonomous On-Call Responder Agent (incident-response/responder.py) and incident drill endpoint.

### Assigned Agent
- `role:oncall`

### Acceptance Criteria
- [ ] POST /api/v1/incidents/simulate-and-respond triggers user-impact alert.
- [ ] Responder agent reads read-only evidence packet by trace_id.
- [ ] Generates bounded remediation diff and records post-mortem log.
"@

# TASK-09
Create-TaskIssue "TASK-09" `
"React + Tailwind + Vite Split-Pane Review Studio UI" `
"role:swe" `
@"
### Task Overview
Build modern React 18 single-page application with Split-Pane Diff Viewer, Wispr Flow Voice Bar, QuerySpeak drawer, and Telemetry Drawer.

### Assigned Agent
- `role:swe`

### Acceptance Criteria
- [ ] 1-click loading of pre-seeded PRs and custom diff modal.
- [ ] Interactive line highlighting with color-coded severity badges.
- [ ] 1-click copy for Coding Agent Fix Prompt.
- [ ] Live Telemetry drawer showing trace_id and incident drills.
"@

# TASK-10
Create-TaskIssue "TASK-10" `
"Single-Command Docker Compose & CI/CD Pipeline" `
"role:qa" `
@"
### Task Overview
Author docker-compose.yml, Dockerfiles, and GitHub Actions CI workflow covering linting, contract check, unit tests, and integration tests.

### Assigned Agent
- `role:qa`, `role:swe`

### Acceptance Criteria
- [ ] docker compose up --build launches Frontend (:5173), Backend (:8000), DB (:5432), and Prometheus.
- [ ] GitHub Actions pipeline passes all checks on PR and main.
"@

Write-Host "======================================================================"
Write-Host "[+] GitHub Issues Synchronization Complete!" -ForegroundColor Green
Write-Host "======================================================================"
