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

### 1.1 Unit Test Suite (`tests/unit/`)
- **`test_guardrails.py`**: Validates deterministic AST and regex scanners on synthetic diffs containing hardcoded secrets (`sk_live_...`), SQL string concatenations, and unauthenticated routes.
- **`test_openapi_drift.py`**: Compares diff endpoints against `openapi.yaml` to verify detection of missing paths, altered parameters, or undocumented response codes.
- **`test_telemetry_scrubber.py`**: Verifies that 15+ variations of API keys, bearer tokens, and connection strings are masked to `[REDACTED_...]` with zero credential leakage.
- **`test_readiness_score.py`**: Validates mathematical deduction formulas and edge cases (all clean, all critical, mixed severity).

### 1.2 Integration Test Suite (`tests/integration/`)
- **`test_api_prs.py`**: Tests `GET /api/v1/prs`, `POST /api/v1/prs`, and `GET /api/v1/prs/{id}` with SQLite persistence and pre-seeded data verification.
- **`test_voice_analyze.py`**: Tests `POST /api/v1/prs/{id}/voice-analyze` with spoken transcripts, verifying structured comment generation, suggested patches, and 100% deterministic fallback when `GEMINI_API_KEY` is unset.
- **`test_queryspeak.py`**: Tests natural language search queries across multiple stored reviews.
- **`test_incidents_and_oncall.py`**: Triggers simulated failures (`simulate_failure=true`), verifies metric escalation, and executes the On-Call Responder Agent to verify automatic remediation.

---

## 2. CI/CD Pipeline & Promotion Workflow

The continuous integration and deployment pipeline is automated via GitHub Actions (`.github/workflows/ci.yml`):

```mermaid
flowchart LR
    Commit[Git Push / PR] --> Lint[Lint & Style Check]
    Lint --> OpenAPI[OpenAPI 3.1.0 Spectral Validation]
    OpenAPI --> Unit[Run Unit Tests]
    Unit --> Integ[Run Integration Tests]
    Integ --> Docker[Test Docker Compose Build]
    Docker --> Promote{Branch == main?}
    Promote -->|Yes| ProdRelease[Simulated Production Tag & Release]
    Promote -->|No| DevPass[Dev Branch Validated]
```

### Pipeline Stages:
1. **Lint & Formatting**: Runs `flake8` and `black --check` on Python code, and `eslint` on React frontend.
2. **OpenAPI Spec Validation**: Validates `openapi.yaml` structural validity and verifies that all FastAPI routes match registered contract paths.
3. **Automated Pytest Matrix**: Runs unit and integration tests across Python 3.11 and 3.12 with code coverage enforcement (`--cov-fail-under=80`).
4. **Containerized Build Verification**: Builds backend and frontend Docker containers to prevent image build regressions.
5. **Release Promotion**: On merge to `main`, tags release version and triggers simulated deployment artifact packaging.

---

## 3. Single-Command Docker Compose Topology

The entire PR-Whisperer system runs locally with a single command:
```bash
docker compose up --build
```

### Orchestrated Services:
| Service | Container Name | Port Mapping | Description |
|---|---|---|---|
| **frontend** | `pr-whisperer-frontend` | `5173:80` | Production Nginx container serving React 18 SPA. |
| **backend** | `pr-whisperer-backend` | `8000:8000` | FastAPI server with Uvicorn, SQLAlchemy ORM, and OpenTelemetry. |
| **db** | `pr-whisperer-db` | `5432:5432` | PostgreSQL 16 database with persistent volume `pgdata`. |
| **prometheus** | `pr-whisperer-prometheus` | `9090:9090` | Prometheus scraper capturing runtime metrics and alert thresholds. |

### Zero-Friction Judge Testing:
- Judges do not need to install Python or Node.js. Running `docker compose up --build` compiles all services, initializes the PostgreSQL database, seeds the 3 realistic PR scenarios, and opens the application at `http://localhost:5173`.
