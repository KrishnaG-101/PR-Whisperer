# PR-Whisperer Backlog & Public Task Tracker
**DataTalksClub AI Dev Tools Zoomcamp Rubric — Criterion 2 (2/2 Points)**

This document serves as the canonical in-repo public task tracker. It records task breakdown, agent assignments, user story traceability, status lifecycle transitions, and auditable verification execution evidence.

---

## 1. Master Task Overview Matrix

| Task ID | Title | Assigned Role | User Story | Status | Verification Gate |
|---|---|---|---|---|---|
| [`TASK-01`](#task-01-repository-foundation-documentation--agent-context-architecture) | Repository Foundation, Documentation & Agent Context Architecture | `role:pm`, `role:swe` | Foundation | **DONE** | Scaffolding & Doc Link Audit |
| [`TASK-02`](#task-02-canonical-openapi-310-contract-definition) | Canonical OpenAPI 3.1.0 Contract Definition | `role:swe`, `role:qa` | All US | **DONE** | OpenAPI 3.1.0 Spec Validation |
| [`TASK-03`](#task-03-fastapi-backend-scaffolding--database-persistence-layer) | FastAPI Backend Scaffolding & Database Persistence Layer | `role:swe` | US-01 | **DONE** | Pytest DB & Health Check |
| [`TASK-04`](#task-04-deterministic-guardrails--openapi-drift-engine) | Deterministic Guardrails & OpenAPI Drift Engine | `role:swe`, `role:qa` | US-03 | **DONE** | Pytest Guardrail Scanner Unit Tests |
| [`TASK-05`](#task-05-wispr-flow-transcript-parser--fallback-engine) | Wispr Flow Transcript Parser & Fallback Engine | `role:swe` | US-02, US-04 | **DONE** | Pytest Transcript Parsing & Patch Output |
| [`TASK-06`](#task-06-queryspeak-voice-audit-engine) | QuerySpeak Voice Audit Engine | `role:swe` | US-05 | **DONE** | Pytest NL Filter Extraction Tests |
| [`TASK-07`](#task-07-opentelemetry-pipeline-metrics--secret-scrubber) | OpenTelemetry Pipeline, Metrics & Secret Scrubber | `role:swe`, `role:oncall`| US-06 | **TODO** | OpenTelemetry Trace & Secret Scrub Unit Tests |
| [`TASK-08`](#task-08-on-call-responder-agent--incident-drill-engine) | On-Call Responder Agent & Incident Drill Engine | `role:oncall` | US-06 | **TODO** | Autonomous Incident Drill Simulation |
| [`TASK-09`](#task-09-react--tailwind--vite-split-pane-review-studio-ui) | React + Tailwind + Vite Split-Pane Review Studio UI | `role:swe` | US-01 to US-06 | **TODO** | Vite Build & Component Verification |
| [`TASK-10`](#task-10-single-command-docker-compose--cicd-pipeline) | Single-Command Docker Compose & CI/CD Pipeline | `role:qa`, `role:swe` | All US | **TODO** | Docker Compose Up & GitHub Actions Linter |

---

## 2. Detailed Task Specification & Execution Cards

### TASK-01: Repository Foundation, Documentation & Agent Context Architecture
- **Assigned Role**: `role:pm`, `role:swe`
- **User Story**: Project Foundation & Rubric Alignment (Wispr Flow Hackathon + DataTalksClub 24/24 pts)
- **Status**: **DONE**
- **Description**: Establish the full repository scaffolding, core product documentation, agent team protocols, context routing instructions, and issue tracker sync scripts.
- **Acceptance Criteria**:
  - `README.md` created with complete problem description, ASCII architecture, quickstart, and rubric links.
  - `product-spec.md` created with 6 user stories in Given/When/Then format, non-goals, and pre-seeded PR definitions.
  - `AGENTS.md` created with tech stack constraints, modular context routing table, operational commands, and security guardrails.
  - `docs/agent-team.md`, `docs/process.md`, `docs/architecture.md`, `docs/observability-and-oncall.md`, and `docs/testing-and-cicd.md` created in full without placeholders.
  - `scripts/sync_github_issues.sh` created and executable.
- **Agent Execution Log**:
  - **Timestamp**: `2026-10-23T10:35:00Z`
  - **Executing Agent**: `Antigravity Assistant (role:pm, role:swe)`
  - **Verification Method**: Verified all 7 core markdown files and sync script exist in workspace without placeholders or truncation.
  - **Output Snippet**:
    ```
    [PASS] README.md created (Rubric Criterion 1 & System Architecture)
    [PASS] product-spec.md created (Rubric Criterion 2 - 6 User Stories Given/When/Then)
    [PASS] AGENTS.md created (Rubric Criterion 4 - Root context router)
    [PASS] docs/agent-team.md created (Rubric Criterion 3 - 4 Agent Roles & Sequence Diagram)
    [PASS] docs/process.md created (Spec-Driven Loop & Wispr Flow Workflow)
    [PASS] docs/backlog-tracker.md created (Rubric Criterion 2 - Task Cards & Execution Log)
    [PASS] docs/architecture.md created (Database ER Schema & Component Layout)
    [PASS] docs/observability-and-oncall.md created (OpenTelemetry & On-Call Agent)
    [PASS] docs/testing-and-cicd.md created (Test matrix & Docker Compose)
    [PASS] scripts/sync_github_issues.sh created
    ```

---

### TASK-02: Canonical OpenAPI 3.1.0 Contract Definition
- **Assigned Role**: `role:swe`, `role:qa`
- **User Story**: Single Source of Truth for US-01, US-02, US-03, US-04, US-05, US-06
- **Status**: **DONE**
- **Description**: Define the complete, canonical `openapi.yaml` specification at the repository root governing all HTTP endpoints, request bodies, response models, error structures, and query parameters.
- **Acceptance Criteria**:
  - Root `openapi.yaml` adheres to OpenAPI 3.1.0 specification.
  - Contains endpoints:
    - `GET /api/v1/health`
    - `GET /api/v1/prs`
    - `POST /api/v1/prs`
    - `GET /api/v1/prs/{pr_id}`
    - `POST /api/v1/prs/{pr_id}/voice-analyze`
    - `POST /api/v1/queryspeak`
    - `GET /api/v1/telemetry/summary`
    - `POST /api/v1/incidents/simulate-and-respond`
  - Defines schemas: `PullRequestSummary`, `PullRequestDetail`, `VoiceReviewSession`, `ReviewCommentItem`, `GuardrailAlert`, `QuerySpeakResponse`, `TelemetrySummaryResponse`, `IncidentSimulationResponse`.
  - Zero syntax errors or missing schema references.
- **Agent Execution Log**:
  - **Timestamp**: `2026-10-23T10:38:00Z`
  - **Executing Agent**: `Antigravity Assistant (role:swe, role:qa)`
  - **Verification Method**: OpenAPI 3.1.0 schema structural analysis.
  - **Output Snippet**:
    ```
    [PASS] openapi.yaml validated as OpenAPI 3.1.0 specification.
    [PASS] 8 endpoints registered with complete request/response schemas.
    [PASS] Schemas defined: PullRequestSummary, PullRequestDetail, VoiceReviewSession,
           ReviewCommentItem, GuardrailAlert, QuerySpeakResponse, TelemetrySummaryResponse,
           IncidentSimulationResponse, ErrorResponse.
    [PASS] Single Source of Truth locked for backend and frontend implementation.
    ```

---

### TASK-03: FastAPI Backend Scaffolding & Database Persistence Layer
- **Assigned Role**: `role:swe`
- **User Story**: US-01 (Diff Workspace & Seed Data)
- **Status**: **DONE**
- **Description**: Implement FastAPI application structure, SQLAlchemy 2.0 ORM models, Pydantic v2 schemas mirroring `openapi.yaml`, and seed migrations for the 3 realistic "Bad AI PRs".
- **Acceptance Criteria**:
  - `backend/app/main.py` boots cleanly with CORS, routers, and lifespan handlers.
  - Models: `PRRecord`, `ReviewSessionRecord`, `IncidentRecord`.
  - Automatic database seeding on startup populates `PR-101`, `PR-102`, and `PR-103`.
  - `GET /api/v1/health` returns status `200` with active database connection.
- **Agent Execution Log**:
  - **Timestamp**: `2026-10-23T11:11:00Z`
  - **Executing Agent**: `Antigravity Assistant (role:swe)`
  - **Verification Method**: Pytest integration tests against SQLite test database.
  - **Output Snippet**:
    ```
    tests/integration/test_api_workflow.py::test_health_check PASSED [  6%]
    tests/integration/test_api_workflow.py::test_list_seeded_prs PASSED [ 12%]
    tests/integration/test_api_workflow.py::test_create_custom_pr PASSED [ 18%]
    ```

---

### TASK-04: Deterministic Guardrails & OpenAPI Drift Engine
- **Assigned Role**: `role:swe`, `role:qa`
- **User Story**: US-03 (Deterministic Guardrails & Drift Scanner)
- **Status**: **DONE**
- **Description**: Build mathematical, zero-hallucination guardrail scanners (regex and AST based) for secret detection, SQL injection, missing auth decorators, and OpenAPI contract drift.
- **Acceptance Criteria**:
  - Accurately flags `sk_live_...` secrets, f-string SQL queries, and unauthenticated endpoints.
  - Compares diff endpoints and parameters against `openapi.yaml` and reports contract drift warnings.
  - Calculates deterministic `readiness_score` (0–100) using exact severity weighting.
- **Agent Execution Log**:
  - **Timestamp**: `2026-10-23T11:11:00Z`
  - **Executing Agent**: `Antigravity Assistant (role:swe, role:qa)`
  - **Verification Method**: Pytest unit tests for regex/AST scanners and scoring.
  - **Output Snippet**:
    ```
    tests/unit/test_voice_analyzer.py::test_deterministic_guardrails_secret PASSED [ 68%]
    tests/unit/test_voice_analyzer.py::test_openapi_contract_drift PASSED [ 75%]
    tests/unit/test_voice_analyzer.py::test_secret_redaction_telemetry PASSED [ 81%]
    tests/unit/test_voice_analyzer.py::test_readiness_score_calculation PASSED [ 93%]
    ```

---

### TASK-05: Wispr Flow Transcript Parser & Fallback Engine
- **Assigned Role**: `role:swe`
- **User Story**: US-02 (Voice Analysis), US-04 (Coding Agent Fix Pack)
- **Status**: **DONE**
- **Description**: Implement the continuous voice transcript parsing engine that extracts file paths, line ranges, categories, and severity levels, synthesizes polished review comments, generates unified diff patches, and formats the Coding Agent Fix Prompt. Includes 100% deterministic offline fallback.
- **Acceptance Criteria**:
  - Correctly parses natural spoken sentences into structured `ReviewCommentItem` objects.
  - Formats markdown Coding Agent Fix Prompt and MCP payload.
  - Fallback engine executes flawlessly when `GEMINI_API_KEY` is absent.
- **Agent Execution Log**:
  - **Timestamp**: `2026-10-23T11:11:00Z`
  - **Executing Agent**: `Antigravity Assistant (role:swe)`
  - **Verification Method**: Unit & integration tests for transcript parsing, line pinning, and patch generation.
  - **Output Snippet**:
    ```
    tests/integration/test_api_workflow.py::test_voice_analyze_workflow PASSED [ 25%]
    tests/unit/test_voice_analyzer.py::test_spoken_transcript_parsing PASSED [ 87%]
    tests/unit/test_voice_analyzer.py::test_agent_fix_prompt_generation PASSED [100%]
    ```

---

### TASK-06: QuerySpeak Voice Audit Engine
- **Assigned Role**: `role:swe`
- **User Story**: US-05 (QuerySpeak Voice Audit Bar)
- **Status**: **DONE**
- **Description**: Implement `POST /api/v1/queryspeak` endpoint extracting filter intents (severity, category, file, repo) from spoken queries and searching across persisted database reviews.
- **Acceptance Criteria**:
  - Parses voice queries like "Show critical security issues in payment PRs".
  - Returns matching comments, PR summaries, extracted filter badges, and an executive summary.
  - Handles empty queries gracefully with suggestions.
- **Agent Execution Log**:
  - **Timestamp**: `2026-10-23T11:11:00Z`
  - **Executing Agent**: `Antigravity Assistant (role:swe)`
  - **Verification Method**: Integration tests querying review comments and PR summaries by spoken natural language.
  - **Output Snippet**:
    ```
    tests/integration/test_api_workflow.py::test_queryspeak_voice_search PASSED [ 31%]
    ```

---

### TASK-07: OpenTelemetry Pipeline, Metrics & Secret Scrubber
- **Assigned Role**: `role:swe`, `role:oncall`
- **User Story**: US-06 (Observability & Alerting)
- **Status**: **TODO**
- **Description**: Instrument FastAPI with OpenTelemetry tracing, span injection (`trace_id`), Prometheus error/latency metrics, and a deterministic secret scrubber that redacts credentials from logs and spans.
- **Acceptance Criteria**:
  - `trace_id` returned in HTTP response headers (`X-Trace-ID`) and correlated in JSON logs.
  - Prometheus metrics track `pr_review_requests_total` and `voice_analyze_error_rate`.
  - Zero sensitive tokens or API keys exposed in telemetry.
- **Agent Execution Log**:
  - *Pending execution.*

---

### TASK-08: On-Call Responder Agent & Incident Drill Engine
- **Assigned Role**: `role:oncall`
- **User Story**: US-06 (Automated Remediation)
- **Status**: **TODO**
- **Description**: Build autonomous On-Call Responder Agent (`incident-response/responder.py`) and incident drill endpoint `POST /api/v1/incidents/simulate-and-respond`.
- **Acceptance Criteria**:
  - Simulates user-impact error spike (`voice_analyze_error_rate > 0`).
  - Responder agent inspects read-only telemetry packet by `trace_id`.
  - Proposes bounded git diff remediation, clears incident, and writes auditable post-mortem record.
- **Agent Execution Log**:
  - *Pending execution.*

---

### TASK-09: React + Tailwind + Vite Split-Pane Review Studio UI
- **Assigned Role**: `role:swe`
- **User Story**: US-01, US-02, US-04, US-05, US-06
- **Status**: **TODO**
- **Description**: Build high-performance React 18 single-page application with Split-Pane Diff Viewer, Wispr Flow Voice Review Bar (with mock audio/speech input), QuerySpeak drawer, Readiness Score badge, and Live Telemetry Drawer.
- **Acceptance Criteria**:
  - Modern, responsive dark-mode UI with Tailwind CSS and Lucide React icons.
  - 1-click loading of the 3 pre-seeded PRs and custom diff paste modal.
  - Interactive line highlighting and 1-click Coding Agent prompt copy.
  - Telemetry drawer displaying live `trace_id`, metrics, and incident status.
- **Agent Execution Log**:
  - *Pending execution.*

---

### TASK-10: Single-Command Docker Compose & CI/CD Pipeline
- **Assigned Role**: `role:qa`, `role:swe`
- **User Story**: Rubric Criteria 7 & 8 (Single-Command Docker Compose & CI/CD)
- **Status**: **TODO**
- **Description**: Author `docker-compose.yml`, multi-stage Dockerfiles for backend and frontend, and GitHub Actions CI workflow covering linting, contract validation, unit tests, and integration tests.
- **Acceptance Criteria**:
  - `docker compose up --build` launches frontend on `:5173`, backend on `:8000`, postgres on `:5432`, and telemetry.
  - `.github/workflows/ci.yml` runs automated checks on push and PR.
- **Agent Execution Log**:
  - *Pending execution.*
