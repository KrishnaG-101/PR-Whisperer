# AGENTS.md — Canonical Context Router for PR-Whisperer
**Autonomous Agent Navigation & Operating Instructions**

---

## 1. Project Overview & Architectural Boundaries

**PR-Whisperer** ("Speak Your Code Review. Ship Clean PRs.") is an AI-native developer tool designed for the **WeMakeDevs x Wispr Flow Hackathon** (Builders Track) and evaluated against the **DataTalksClub AI Dev Tools Zoomcamp Rubric (24/24 points)**.

It enables software engineers to review large, AI-generated pull requests hands-free using Wispr Flow voice dictation. Voice transcripts are deterministically parsed, scanned for security vulnerabilities and OpenAPI contract drift, converted into line-pinned GitHub review comments, and exported as 1-click Coding Agent prompts.

### Tech Stack Constraints:
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 ORM, Pytest, OpenTelemetry Python SDK.
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React icons, native Fetch API strictly typed against `openapi.yaml`.
- **Database**: Zero-config SQLite (`sqlite:///./pr_whisperer.db`) for local testing; PostgreSQL 16 (`postgresql://postgres:postgres@db:5432/pr_whisperer`) in Docker Compose.
- **Telemetry**: OpenTelemetry Tracing (`trace_id` header propagation), Prometheus Metrics, Structured JSON Logs with zero leaked secrets.
- **On-Call Subsystem**: Headless Python agent (`incident-response/responder.py`) and MCP server (`mcp-server/server.py`).

---

## 2. Mandatory Modular Context Routing

Agents working on this repository **MUST NOT** make architectural assumptions. Read the relevant modular document before executing any code changes:

| Context File | When the Agent Must Read This Document |
|---|---|
| [`./product-spec.md`](./product-spec.md) | Read before implementing or modifying user stories, UI components, acceptance criteria, or score weighting rules. |
| [`./openapi.yaml`](./openapi.yaml) | Read before writing or changing any FastAPI route, Pydantic schema, response model, or frontend API call. |
| [`./docs/agent-team.md`](./docs/agent-team.md) | Read before assuming role responsibilities (`role:pm`, `role:swe`, `role:qa`, `role:oncall`) or executing agent handoffs. |
| [`./docs/process.md`](./docs/process.md) | Read to understand the Spec-Driven Loop workflow, Wispr Flow voice engineering protocols, and task lifecycle states. |
| [`./docs/architecture.md`](./docs/architecture.md) | Read before modifying database schemas, ER models, component boundaries, or data flow pipelines. |
| [`./docs/backlog-tracker.md`](./docs/backlog-tracker.md) | Read before picking up any work item (`TASK-01` to `TASK-10`) and update it with execution logs upon task completion. |
| [`./docs/observability-and-oncall.md`](./docs/observability-and-oncall.md) | Read before editing OpenTelemetry exporters, Prometheus metric names, PII sanitizers, or incident responder logic. |
| [`./docs/testing-and-cicd.md`](./docs/testing-and-cicd.md) | Read before adding unit tests, integration tests, GitHub Actions workflows, or Docker Compose services. |

---

## 3. Standard Operational Commands

Agents must use these exact commands for installation, execution, verification, and diagnostics:

### 3.1 Environment Setup & Installation
```bash
# Backend Setup (Python 3.11+)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate
pip install -r backend/requirements.txt

# Frontend Setup (Node.js 18+)
cd frontend && npm install && cd ..
```

### 3.2 Running the Application Locally
```bash
# Run FastAPI Backend (starts on http://localhost:8000 with interactive docs at /docs)
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

# Run React Frontend (starts on http://localhost:5173)
cd frontend && npm run dev
```

### 3.3 Running Automated Tests
```bash
# Run All Unit Tests (Deterministic guardrails, regex checks, drift calculations)
pytest tests/unit/ -v

# Run All Integration Tests (FastAPI endpoints, SQLite transactions, voice parsing fallbacks)
pytest tests/integration/ -v

# Run Test Suite with Coverage Reporting
pytest --cov=backend/app --cov-report=term-missing
```

### 3.4 Single-Command Full-Stack Docker Compose
```bash
# Start Frontend (:5173), Backend (:8000), PostgreSQL (:5432), and Prometheus
docker compose up --build

# Run in background daemon mode
docker compose up -d --build

# Stop and purge volumes
docker compose down -v
```

### 3.5 Incident & Telemetry Diagnostics
```bash
# Query System Health and Telemetry Status
curl -s http://localhost:8000/api/v1/health

# Fetch Telemetry Summary (trace IDs, error counters, alert states)
curl -s http://localhost:8000/api/v1/telemetry/summary

# Trigger Simulated User-Impact Incident Drill & Run On-Call Responder
curl -s -X POST http://localhost:8000/api/v1/incidents/simulate-and-respond
```

---

## 4. Code & Security Guardrails

Agents modifying this codebase MUST comply with the following non-negotiable rules:

1. **Zero Secret Leakage in Telemetry & Logs**:
   - Never log `GEMINI_API_KEY`, GitHub personal tokens, Authorization headers, or raw passwords in console outputs, OpenTelemetry span attributes, or Prometheus labels.
   - All transcript strings and diff lines processed by telemetry must pass through the `sanitize_telemetry_payload()` utility to mask regex patterns matching credentials.

2. **100% Deterministic Fallback Guarantee**:
   - The application must function completely even if `GEMINI_API_KEY` is empty, unset, or throttled.
   - Guardrails (secret detection, SQL concatenation checks, missing auth) and transcript parsing must feature robust heuristic/regex fallbacks so that automated test suites and offline judge reviews pass with zero failures.

3. **Strict Contract First (OpenAPI Single Source of Truth)**:
   - No backend endpoint or frontend API call may be created without a corresponding, exact definition in `openapi.yaml`.
   - Any schema changes must be updated in `openapi.yaml` first, then in Pydantic models, and finally in frontend TypeScript/JavaScript interfaces.

4. **Task Traceability & In-Repo Accountability**:
   - Every single code commit, PR, or subagent task must explicitly reference its task ID (`TASK-01` through `TASK-10`).
   - When a task is completed, the agent must update `docs/backlog-tracker.md` with:
     - Status: `DONE`
     - Timestamp
     - Specific verification command executed
     - Output snippet proving test passage.

5. **Bounded Agent Autonomy**:
   - Autonomous agents must operate only within their designated role scope (see `docs/agent-team.md`).
   - The On-Call Responder Agent (`role:oncall`) is restricted to read-only diagnostics and non-destructive remediation patch proposals.

---

## 5. Agent Role Routing Quick Reference

- Need to adjust specifications or acceptance criteria? -> Route to **PM Agent** (`role:pm`).
- Need to write FastAPI routes, models, or React diff viewer? -> Route to **SWE Agent** (`role:swe`).
- Need to write Pytest suites or verify OpenAPI conformance? -> Route to **QA Agent** (`role:qa`).
- Need to diagnose simulated production alert or trace error? -> Route to **On-Call Agent** (`role:oncall`).
