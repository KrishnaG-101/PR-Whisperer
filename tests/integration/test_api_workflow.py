import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database import Base, get_db
import backend.app.database as db_module
from backend.app.main import app
from backend.app.seed import seed_database

# Create isolated in-memory test database with StaticPool so all connections share the DB
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Create schema and seed PRs
Base.metadata.create_all(bind=test_engine)
with TestingSessionLocal() as session:
    seed_database(session)

# Override get_db dependency to point to test_engine session
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["db_connected"] is True
    assert "X-Trace-ID" in response.headers


def test_list_seeded_prs():
    response = client.get("/api/v1/prs")
    assert response.status_code == 200
    prs = response.json()
    assert len(prs) >= 3
    ids = [p["id"] for p in prs]
    assert "PR-101" in ids
    assert "PR-102" in ids
    assert "PR-103" in ids


def test_create_custom_pr():
    custom_diff = """diff --git a/backend/routes/user.py b/backend/routes/user.py
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/backend/routes/user.py
@@ -1,5 +1,5 @@
+def get_user_profile(user_id: str):
+    return {"user_id": user_id, "active": True}
"""
    payload = {
        "title": "feat(user): add get_user_profile route",
        "repo_name": "acme/user-service",
        "author": "engineer-bob",
        "branch_source": "feat/user-profile",
        "branch_target": "main",
        "diff_text": custom_diff,
    }
    response = client.post("/api/v1/prs", json=payload)
    assert response.status_code == 201
    created = response.json()
    assert created["title"] == payload["title"]
    assert "user.py" in created["changed_files"][0]


def test_voice_analyze_workflow():
    spoken_critique = (
        "Looking at payments.py around line 14, we left a hardcoded Stripe live secret in the file—move that to environment variables immediately. "
        "Also on line 38, you're interpolating user_id directly into raw SQL which opens a SQL injection hole; parameterize that query. "
        "Finally, in payment.py schema, dropping the currency field breaks our OpenAPI v1 contract, and we need a unit test for duplicate webhook signatures."
    )
    payload = {
        "spoken_transcript": spoken_critique,
        "reviewer_name": "Staff Engineer Sarah",
        "simulate_failure": False,
    }
    response = client.post("/api/v1/prs/PR-101/voice-analyze", json=payload)
    assert response.status_code == 200
    session = response.json()

    assert session["pr_id"] == "PR-101"
    assert "trace_id" in session
    assert session["readiness_score"] < 60  # Critical flaws detected
    assert len(session["comments"]) >= 3
    assert len(session["guardrail_alerts"]) >= 2
    assert "# Coding Agent Fix Specification" in session["agent_fix_prompt"]

    # Verify PR detail now shows the saved session
    pr_resp = client.get("/api/v1/prs/PR-101")
    assert pr_resp.status_code == 200
    pr_data = pr_resp.json()
    assert len(pr_data["review_sessions"]) >= 1
    assert pr_data["latest_readiness_score"] == session["readiness_score"]


def test_queryspeak_voice_search():
    payload = {"voice_query": "Show all critical security issues in payment PRs"}
    response = client.post("/api/v1/queryspeak", json=payload)
    assert response.status_code == 200
    result = response.json()

    assert result["interpreted_filters"]["severity"] == "Critical"
    assert result["interpreted_filters"]["category"] == "Security"
    assert result["interpreted_filters"]["keyword"] == "payment"
    assert len(result["matching_prs"]) >= 1
    assert len(result["matching_comments"]) >= 1
    assert "QuerySpeak identified" in result["insight_summary"]


def test_incident_drill_and_oncall_remediation():
    # 1. Trigger simulated user-impact failure on voice review
    fail_payload = {
        "spoken_transcript": "Testing incident alert triggering",
        "simulate_failure": True,
    }
    fail_resp = client.post("/api/v1/prs/PR-101/voice-analyze", json=fail_payload)
    assert fail_resp.status_code == 500
    assert "Simulated user-impact error" in fail_resp.json()["detail"]

    # 2. Check telemetry summary reflects active incident and error metric
    telem_resp = client.get("/api/v1/telemetry/summary")
    assert telem_resp.status_code == 200
    telem_data = telem_resp.json()
    assert len(telem_data["active_incidents"]) >= 1

    # 3. Trigger autonomous On-Call Responder Agent
    drill_payload = {
        "alert_type": "VOICE_ANALYZE_FAILURE",
        "pr_id": "PR-101",
        "simulated_error": "RateLimitExceeded: Gemini API quota exceeded on voice parsing.",
    }
    remediate_resp = client.post("/api/v1/incidents/simulate-and-respond", json=drill_payload)
    assert remediate_resp.status_code == 200
    remedy = remediate_resp.json()

    assert remedy["status"] == "RESOLVED_BY_ONCALL_AGENT"
    assert "Root Cause Identified" in remedy["root_cause_analysis"]
    assert "remediation_diff" in remedy
    assert remedy["verified_by_tests"] is True

    # 4. Check that active incidents are cleared in telemetry summary
    telem_after = client.get("/api/v1/telemetry/summary").json()
    assert len(telem_after["active_incidents"]) == 0
    assert len(telem_after["recent_remediations"]) >= 1


def test_prometheus_metrics_endpoint():
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "pr_whisperer_requests_total" in response.text
