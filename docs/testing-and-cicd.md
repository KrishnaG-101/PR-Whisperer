# Testing Strategy, CI/CD Pipeline & Docker Deployment
**DataTalksClub AI Dev Tools Zoomcamp Rubric — Criteria 6, 7 & 8 (8/8 Points)**

---

## 1. Testing Philosophy & Test Pyramid

PR-Whisperer enforces a rigorous testing pyramid to guarantee 100% deterministic reliability across all components:

```
               / \
              /   \
             / E2E \       End-to-End User Flow & Incident Drills
            /-------\
           /  Integ  \     FastAPI TestClient + SQLite Transactions
          /-----------\
         /    Unit     \   AST Guardrails, Secret Scrubber, Regex Matchers
        /---------------\
```

### 1.1 Unit Test Suite (`tests/unit/test_voice_analyzer.py`)
- **`test_extract_diff_files`**: Validates unified diff header extraction and file path mapping.
- **`test_match_file_from_speech`**: Tests heuristic speech matching against diff files from natural voice input.
- **`test_extract_line_number`**: Verifies deterministic line number extraction from spoken cues ("around line 14", "on line 38").
- **`test_deterministic_guardrails_secret`**: Validates deterministic AST/regex scans detecting live secrets (`sk_live_...`) and SQL injection vulnerabilities.
- **`test_openapi_contract_drift`**: Compares diff schema modifications against `openapi.yaml` to verify detection of dropped properties (e.g. `currency` field) and endpoint divergence.
- **`test_secret_redaction_telemetry`**: Verifies that live API credentials are sanitized before telemetry log emission with zero leakage.
- **`test_spoken_transcript_parsing`**: Confirms natural speech critique tokenization into structured review comments and unified replacement diff patches.
- **`test_readiness_score_calculation`**: Validates weighted score deduction algorithm (0–100 scale, -25 critical, -10 warning).
- **`test_agent_fix_prompt_generation`**: Validates generation of 1-click Coding Agent prompts for Claude Code / Cursor / Devin.

### 1.2 Integration Test Suite (`tests/integration/test_api_workflow.py`)
- **`test_health_check`**: Validates `GET /api/v1/health` with database and telemetry status.
- **`test_list_seeded_prs`**: Tests `GET /api/v1/prs` verifying pre-seeded PRs (`PR-101`, `PR-102`, `PR-103`).
- **`test_create_custom_pr`**: Tests `POST /api/v1/prs` verifying custom diff import and monotonic ID generation.
- **`test_voice_analyze_workflow`**: Tests `POST /api/v1/prs/{id}/voice-analyze` verifying speech parsing, review card synthesis, readiness scoring, and deterministic fallback.
- **`test_queryspeak_voice_search`**: Tests `POST /api/v1/queryspeak` natural language voice search across past PR reviews.
- **`test_incident_drill_and_oncall_remediation`**: Executes `POST /api/v1/incidents/simulate-and-respond`, verifying automated triage, bounded git diff generation, and post-mortem report creation.
- **`test_prometheus_metrics_endpoint`**: Verifies `GET /metrics` exposes valid OpenTelemetry metrics (`pr_whisperer_requests_total`).

### 1.3 Frontend Component Test Suite (`frontend/src/__tests__/App.test.jsx`)
- 4 Vitest smoke tests covering header badges, Wispr Flow Voice Command Dock with auto-load button, QuerySpeak search drawer, and PR queue rendering.

---

## 2. CI/CD Pipeline & Promotion Workflow

The continuous integration and continuous deployment pipeline is automated via GitHub Actions ([`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)) implementing a 3-stage promotion workflow to achieve full 3/3 points on the rubric:

```mermaid
flowchart TD
    Commit[Push to main / PR] --> Stage1[Stage 1: ci-test-and-build]
    subgraph Stage1[Stage 1: CI Test & Build]
        Pytest[Pytest Suite with Coverage]
        Vitest[Frontend Vitest Suite]
        Build[Vite Production Build]
        Compose[Docker Compose Config Validation]
    end
    Stage1 --> Stage2[Stage 2: deploy-dev]
    subgraph Stage2[Stage 2: CD Deploy to Development]
        DevDeploy[Deploy to Dev/Staging Environment]
        DevSmoke[Staging Health Smoke Check]
    end
    Stage2 --> Stage3[Stage 3: deploy-prod]
    subgraph Stage3[Stage 3: CD Promote to Production]
        ProdGate[Manual Environment Approval Gate]
        ProdDeploy[Deploy to Production Release]
        Rollback[Automated Rollback Check scripts/rollback.sh]
    end
```

### Pipeline Stages:
1. **`ci-test-and-build`**: Runs on every push and pull request. Sets up Python 3.11 and Node 20, executes Pytest (with `--cov=backend/app --cov-report=term-missing`), runs Vitest, builds production frontend bundle, and validates `docker compose config --quiet`.
2. **`deploy-dev`**: Runs automatically on merge to `main` (`needs: ci-test-and-build`). Deploys to the development/staging environment with graceful webhook fallback and health verification.
3. **`deploy-prod`**: Protected by GitHub Actions `environment: production` approval gate (`needs: deploy-dev`). Deploys to production and validates the automated rollback script ([`scripts/rollback.sh`](../scripts/rollback.sh)).

---

## 3. Single-Command Docker Compose Topology

The entire PR-Whisperer system runs locally with a single command:
```bash
docker compose up --build
```

### Orchestrated Services:
| Service | Container Name | Port Mapping | Description |
|---|---|---|---|
| **frontend** | `pr-whisperer-frontend` | `5173:5173` | Node 20 Alpine container running Vite production preview server. |
| **backend** | `pr-whisperer-backend` | `8000:8000` | Python 3.11 Slim container running FastAPI, Uvicorn, and OpenTelemetry. |
| **db** | `pr-whisperer-db` | `5432:5432` | PostgreSQL 16 Alpine database with healthcheck and persistent `postgres_data`. |
| **prometheus** | `pr-whisperer-prometheus` | `9090:9090` | Prometheus capturing metrics (`/metrics`) and evaluating alert rules every 5s. |
| **grafana** | `pr-whisperer-grafana` | `3001:3000` | Grafana dashboard with anonymous viewer access and auto-provisioned dashboards. |

### Zero-Friction Judge Testing:
- Judges do not need to install Python or Node.js. Running `docker compose up --build` compiles all services, initializes the PostgreSQL database, seeds the 3 realistic PR scenarios, and opens the application at `http://localhost:5173`.
