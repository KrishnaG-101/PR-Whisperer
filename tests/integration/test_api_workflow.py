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


def test_find_pr_with_hash_prefix():
    # BUG-02 verification: URL-encoded # (%23) in path, e.g. %23101 and %23PR-101
    resp1 = client.get("/api/v1/prs/%23101")
    assert resp1.status_code == 200
    assert resp1.json()["id"] == "PR-101"

    resp2 = client.get("/api/v1/prs/%23PR-101")
    assert resp2.status_code == 200
    assert resp2.json()["id"] == "PR-101"

    resp3 = client.get("/api/v1/prs/101")
    assert resp3.status_code == 200
    assert resp3.json()["id"] == "PR-101"


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
    assert session["comments"][0].get("line_number") is not None
    assert session["word_count"] > 10
    assert session["speedup_multiplier"] >= 1.0
    assert session["review_verdict"] == "CHANGES_REQUESTED"
    assert "# Coding Agent Fix Specification" in session["agent_fix_prompt"]

    # Verify PR detail now shows the saved session
    pr_resp = client.get("/api/v1/prs/PR-101")
    assert pr_resp.status_code == 200
    pr_data = pr_resp.json()
    assert len(pr_data["review_sessions"]) >= 1
    assert pr_data["latest_readiness_score"] == session["readiness_score"]


def test_voice_analyze_append_mode():
    # Feature D: Multi-pass voice append
    addendum_payload = {
        "spoken_transcript": "Also please add an integration test for the webhook callback.",
        "append_to_latest": True,
    }
    response = client.post("/api/v1/prs/PR-101/voice-analyze", json=addendum_payload)
    assert response.status_code == 200
    session = response.json()
    assert "[Addendum Note]" in session["spoken_transcript"]


def test_github_pr_import_endpoint():
    # Feature C: Import live GitHub PR with deterministic fallback
    payload = {"github_url": "https://github.com/fastapi/fastapi/pull/9999"}
    response = client.post("/api/v1/prs/import-github", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "PR-" in data["id"]
    assert "fastapi" in data["repo_name"] or "octocat" in data["repo_name"]
    assert len(data["diff_text"]) > 20


def test_readiness_certificate_endpoint():
    # Feature D: Release Readiness Certificate (.md)
    response = client.get("/api/v1/prs/PR-101/readiness-certificate")
    assert response.status_code == 200
    data = response.json()
    assert data["pr_id"] == "PR-101"
    assert data["filename"].endswith(".md")
    assert "Release Readiness Certificate" in data["certificate_markdown"]
    assert "SecuritySentinel" in data["certificate_markdown"]


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


def test_prometheus_metrics_endpoint():
    response = client.get("/metrics")
    assert response.status_code == 200
    metrics_text = response.text
    assert "pr_whisperer_requests_total" in metrics_text


def test_github_auth_connect():
    payload = {"github_username": "KrishnaG-101"}
    response = client.post("/api/v1/auth/github/connect", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert data["username"] == "KrishnaG-101"
    assert isinstance(data["repos"], list)
    assert len(data["repos"]) >= 1


def test_github_repo_pulls_and_import_activity():
    # Test pulls endpoint with fallback
    response = client.get("/api/v1/github/repos/KrishnaG-101/PR-Whisperer/pulls")
    assert response.status_code == 200
    data = response.json()
    assert data["repo"] == "PR-Whisperer"
    assert data["owner"] == "KrishnaG-101"
    assert isinstance(data["pulls"], list)

    # Test import activity endpoint (commit fallback diff)
    import_resp = client.post(
        "/api/v1/github/repos/KrishnaG-101/PR-Whisperer/import-activity",
        json={"pull_number": None}
    )
    assert import_resp.status_code in (200, 201)
    imported_pr = import_resp.json()
    assert imported_pr["id"].startswith("PR-")
    assert imported_pr["repo_name"] == "KrishnaG-101/PR-Whisperer"
    assert len(imported_pr["diff_text"]) > 20


def test_publish_github_review_preview_and_command():
    # Ensure PR-101 has an analyzed session first
    client.post(
        "/api/v1/prs/PR-101/voice-analyze",
        json={"spoken_transcript": "Security check: line 14 has a raw Stripe key"}
    )
    
    # Trigger publish review endpoint without PAT (generates preview & CLI command)
    pub_resp = client.post(
        "/api/v1/prs/PR-101/publish-github-review",
        json={"event": "COMMENT", "github_token": None}
    )
    assert pub_resp.status_code == 200
    result = pub_resp.json()
    assert result["pr_id"] == "PR-101"
    assert result["status"] == "preview_generated"
    assert "gh pr review" in result["cli_command"]
    assert len(result["markdown_body"]) > 10

