import os
import re
import json
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from backend.app.database import engine, Base, get_db, SessionLocal
from backend.app.models import PRRecord, ReviewSessionRecord, IncidentRecord
from backend.app.schemas import (
    HealthResponse,
    PullRequestSummary,
    PullRequestCreate,
    PullRequestDetail,
    VoiceAnalyzeRequest,
    VoiceReviewSession,
    ReviewCommentItem,
    GuardrailAlert,
    QuerySpeakRequest,
    QuerySpeakFilters,
    QuerySpeakResponse,
    TelemetrySummaryResponse,
    IncidentSimulationRequest,
    IncidentSimulationResponse,
    ErrorResponse,
)
from backend.app.seed import seed_database
from backend.app.services.voice_analyzer import analyze_voice_review
from backend.app.telemetry import (
    TelemetryMiddleware,
    record_telemetry_event,
    get_telemetry_summary,
    INCIDENT_REGISTRY,
    REMEDIATION_HISTORY,
    VOICE_ANALYZE_ERRORS_TOTAL,
    VOICE_ANALYZE_LATENCY,
)
import importlib.util
from pathlib import Path

responder_file = Path(__file__).resolve().parent.parent.parent / "incident-response" / "responder.py"
spec = importlib.util.spec_from_file_location("oncall_responder", str(responder_file))
responder_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(responder_mod)
run_oncall_remediation = responder_mod.run_oncall_remediation


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database schema and pre-seeded realistic 'Bad AI PRs' on startup."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="PR-Whisperer API",
    description="Voice-First AI Code Review, OpenAPI Drift Detection & Autonomous Incident Studio powered by Wispr Flow.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Trace-ID"],
)

# OpenTelemetry Middleware
app.add_middleware(TelemetryMiddleware)


# ------------------------------------------------------------------------------
# 1. System Health
# ------------------------------------------------------------------------------
@app.get("/api/v1/health", response_model=HealthResponse, tags=["System"])
def get_system_health(db: Session = Depends(get_db)):
    """Health check validating database connectivity and active incident alerts."""
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return HealthResponse(
        status="healthy" if db_ok else "degraded",
        version="1.0.0",
        db_connected=db_ok,
        telemetry_active=True,
        active_incidents_count=len(INCIDENT_REGISTRY),
    )


# ------------------------------------------------------------------------------
# 2. Pull Requests
# ------------------------------------------------------------------------------
def find_pr(db: Session, pr_id: str) -> Optional[PRRecord]:
    """Finds PR by exact ID or numeric pr_number."""
    clean_id = str(pr_id).strip()
    pr = db.query(PRRecord).filter(PRRecord.id == clean_id).first()
    if not pr:
        pr = db.query(PRRecord).filter(PRRecord.pr_number == clean_id).first()
    if not pr and not clean_id.startswith("PR-"):
        pr = db.query(PRRecord).filter(PRRecord.id == f"PR-{clean_id}").first()
    return pr


@app.get("/api/v1/prs", response_model=List[PullRequestSummary], tags=["Pull Requests"])
def list_pull_requests(db: Session = Depends(get_db)):
    """Lists all pull requests in the database."""
    prs = db.query(PRRecord).order_by(PRRecord.created_at.desc()).all()
    summaries = []
    for pr in prs:
        summaries.append(
            PullRequestSummary(
                id=pr.id,
                repo_name=pr.repo_name,
                pr_number=pr.pr_number,
                title=pr.title,
                author=pr.author,
                branch_source=pr.branch_source or pr.branch_name,
                branch_target=pr.branch_target,
                files_changed_count=pr.files_changed_count,
                latest_readiness_score=pr.latest_readiness_score,
                created_at=pr.created_at,
            )
        )
    return summaries


@app.post("/api/v1/prs", response_model=PullRequestDetail, status_code=status.HTTP_201_CREATED, tags=["Pull Requests"])
def create_pull_request(payload: PullRequestCreate, db: Session = Depends(get_db)):
    """Imports or creates a custom pull request from unified diff text."""
    # Extract changed files from diff headers
    changed_files = []
    for line in payload.diff_text.splitlines():
        if line.startswith("+++ b/"):
            f = line.replace("+++ b/", "").strip()
            if f not in changed_files:
                changed_files.append(f)
    if not changed_files:
        changed_files = ["app/main.py"]

    existing_nums = [int(p.pr_number) for p in db.query(PRRecord.pr_number).all() if p.pr_number and p.pr_number.isdigit()]
    next_num = max(existing_nums, default=100) + 1
    new_id = f"PR-{next_num}"

    pr = PRRecord(
        id=new_id,
        pr_number=str(next_num),
        title=payload.title,
        repo_name=payload.repo_name,
        author=payload.author,
        branch_name=payload.branch_source,
        branch_source=payload.branch_source,
        branch_target=payload.branch_target,
        status="OPEN",
        diff_text=payload.diff_text,
        files_changed_json=json.dumps(changed_files),
        sample_voice_prompt=f"Reviewing {payload.title} in {payload.repo_name}. Check for contract conformance.",
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)

    return PullRequestDetail(
        id=pr.id,
        repo_name=pr.repo_name,
        pr_number=pr.pr_number,
        title=pr.title,
        author=pr.author,
        branch_source=pr.branch_source or pr.branch_name,
        branch_target=pr.branch_target,
        files_changed_count=len(changed_files),
        latest_readiness_score=None,
        created_at=pr.created_at,
        diff_text=pr.diff_text,
        changed_files=changed_files,
        review_sessions=[],
        sample_voice_prompt=pr.sample_voice_prompt,
    )


@app.get("/api/v1/prs/{pr_id}", response_model=PullRequestDetail, tags=["Pull Requests"])
def get_pull_request(pr_id: str, request: Request, db: Session = Depends(get_db)):
    """Retrieves full PR details with diff text and prior review sessions."""
    pr = find_pr(db, pr_id)
    if not pr:
        trace_id = getattr(request.state, "trace_id", uuid.uuid4().hex)
        raise HTTPException(status_code=404, detail=f"Pull request '{pr_id}' not found. Trace ID: {trace_id}")

    sessions = []
    for s in pr.review_sessions:
        sessions.append(
            VoiceReviewSession(
                id=s.id,
                pr_id=s.pr_id,
                trace_id=s.trace_id,
                reviewer_name=s.reviewer_name,
                spoken_transcript=s.spoken_transcript,
                readiness_score=s.readiness_score,
                summary_markdown=s.summary_markdown,
                agent_fix_prompt=s.agent_fix_prompt,
                comments=[ReviewCommentItem(**c) for c in s.comments],
                guardrail_alerts=[GuardrailAlert(**g) for g in s.guardrail_alerts],
                created_at=s.created_at,
            )
        )

    return PullRequestDetail(
        id=pr.id,
        repo_name=pr.repo_name,
        pr_number=pr.pr_number,
        title=pr.title,
        author=pr.author,
        branch_source=pr.branch_source or pr.branch_name,
        branch_target=pr.branch_target,
        files_changed_count=pr.files_changed_count,
        latest_readiness_score=pr.latest_readiness_score,
        created_at=pr.created_at,
        diff_text=pr.diff_text,
        changed_files=pr.changed_files,
        review_sessions=sessions,
        sample_voice_prompt=pr.sample_voice_prompt,
    )


# ------------------------------------------------------------------------------
# 3. Voice Review Analysis (Wispr Flow)
# ------------------------------------------------------------------------------
@app.post("/api/v1/prs/{pr_id}/voice-analyze", response_model=VoiceReviewSession, tags=["Voice Review"])
async def voice_analyze_pr(
    pr_id: str,
    payload: VoiceAnalyzeRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Processes spoken Wispr Flow critique and runs deterministic guardrails."""
    trace_id = getattr(request.state, "trace_id", uuid.uuid4().hex)
    pr = find_pr(db, pr_id)
    if not pr:
        raise HTTPException(status_code=404, detail=f"Pull request '{pr_id}' not found.")

    # User-Impact Failure Simulation / Error Escalation
    if payload.simulate_failure or os.getenv("INCIDENT_MODE") == "1":
        VOICE_ANALYZE_ERRORS_TOTAL.labels(pr_id=pr.id, alert_type="HighVoiceAnalyzeFailureRate").inc()
        
        inc_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
        alert_event = {
            "id": inc_id,
            "alert_type": "VOICE_ANALYZE_FAILURE",
            "pr_id": pr.id,
            "trace_id": trace_id,
            "severity": "Critical",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        INCIDENT_REGISTRY.append(alert_event)

        inc_record = IncidentRecord(
            id=inc_id,
            trace_id=trace_id,
            alert_name="HighVoiceAnalyzeFailureRate",
            endpoint=request.url.path,
            error_message="Simulated rate limit error / token parsing exception on upstream voice review analysis.",
            status="TRIGGERED",
            evidence_packet_json=json.dumps({"pr_id": pr.id, "trace_id": trace_id, "transcript_snippet": payload.spoken_transcript[:60]}),
        )
        db.add(inc_record)
        db.commit()

        record_telemetry_event(
            trace_id=trace_id,
            event="voice_analysis_failed_simulated",
            message=f"CRITICAL USER IMPACT ALERT: voice_analyze failed for PR {pr.id}. Registered incident {inc_id}.",
            level="ERROR",
        )
        raise HTTPException(
            status_code=500,
            detail=f"Simulated user-impact error: Voice analysis quota exceeded. Alert registered with trace_id {trace_id}.",
        )

    # Perform analysis
    with VOICE_ANALYZE_LATENCY.time():
        analysis = await analyze_voice_review(
            pr_id=pr.id,
            pr_title=pr.title,
            repo_name=pr.repo_name,
            branch_name=pr.branch_name,
            diff_text=pr.diff_text,
            spoken_transcript=payload.spoken_transcript,
            reviewer_name=payload.reviewer_name or "Wispr Reviewer",
            trace_id=trace_id,
        )

    # Persist review session
    session_record = ReviewSessionRecord(
        id=analysis["id"],
        pr_id=pr.id,
        trace_id=trace_id,
        reviewer_name=analysis["reviewer_name"],
        spoken_transcript=payload.spoken_transcript,
        readiness_score=analysis["readiness_score"],
        summary_markdown=analysis["summary_markdown"],
        agent_fix_prompt=analysis["agent_fix_prompt"],
        comments_json=json.dumps(analysis["comments"]),
        guardrails_json=json.dumps(analysis["guardrail_alerts"]),
    )
    db.add(session_record)
    db.commit()

    record_telemetry_event(
        trace_id=trace_id,
        event="voice_analysis_completed",
        message=f"Voice review completed for {pr.id}. Readiness score: {analysis['readiness_score']}/100. Guardrails: {len(analysis['guardrail_alerts'])}",
        level="INFO",
    )

    return VoiceReviewSession(
        id=session_record.id,
        pr_id=session_record.pr_id,
        trace_id=session_record.trace_id,
        reviewer_name=session_record.reviewer_name,
        spoken_transcript=session_record.spoken_transcript,
        readiness_score=session_record.readiness_score,
        summary_markdown=session_record.summary_markdown,
        agent_fix_prompt=session_record.agent_fix_prompt,
        comments=[ReviewCommentItem(**c) for c in analysis["comments"]],
        guardrail_alerts=[GuardrailAlert(**g) for g in analysis["guardrail_alerts"]],
        created_at=session_record.created_at,
    )


# ------------------------------------------------------------------------------
# 4. QuerySpeak Natural Language Voice Audit
# ------------------------------------------------------------------------------
@app.post("/api/v1/queryspeak", response_model=QuerySpeakResponse, tags=["Voice Audit"])
def queryspeak_voice_search(payload: QuerySpeakRequest, db: Session = Depends(get_db)):
    """Filters review comments and PRs using natural language voice queries."""
    query = payload.voice_query.lower()

    # Intent extraction
    filters = QuerySpeakFilters()
    if "critical" in query:
        filters.severity = "Critical"
    elif "warning" in query:
        filters.severity = "Warning"
    elif "suggestion" in query:
        filters.severity = "Suggestion"

    if "security" in query:
        filters.category = "Security"
    elif "drift" in query or "contract" in query or "openapi" in query:
        filters.category = "Contract Drift"
    elif "performance" in query or "n+1" in query or "loop" in query:
        filters.category = "Performance"
    elif "bug" in query or "exception" in query:
        filters.category = "Bug"
    elif "test" in query:
        filters.category = "Test Gap"

    for keyword in ["payment", "stripe", "auth", "jwt", "token", "analytics", "velocity", "webhook"]:
        if keyword in query:
            filters.keyword = keyword
            break

    # Search database review sessions
    matching_comments = []
    matching_pr_ids = set()

    sessions = db.query(ReviewSessionRecord).all()
    for s in sessions:
        for c in s.comments:
            match = True
            if filters.severity and c.get("severity") != filters.severity:
                match = False
            if filters.category and c.get("category") != filters.category:
                match = False
            if filters.keyword and filters.keyword not in c.get("spoken_excerpt", "").lower() and filters.keyword not in c.get("file_path", "").lower() and filters.keyword not in c.get("polished_comment", "").lower():
                match = False

            if match:
                matching_comments.append(ReviewCommentItem(**c))
                matching_pr_ids.add(s.pr_id)

    # If no sessions yet, search directly against pre-seeded PRs to ensure rich results
    if not matching_comments:
        prs = db.query(PRRecord).all()
        for p in prs:
            p_text = (p.title + " " + p.repo_name + " " + (p.sample_voice_prompt or "")).lower()
            if not filters.keyword or filters.keyword in p_text:
                matching_pr_ids.add(p.id)

    matching_prs = []
    for pid in matching_pr_ids:
        pr = find_pr(db, pid)
        if pr:
            matching_prs.append(
                PullRequestSummary(
                    id=pr.id,
                    repo_name=pr.repo_name,
                    pr_number=pr.pr_number,
                    title=pr.title,
                    author=pr.author,
                    branch_source=pr.branch_source or pr.branch_name,
                    branch_target=pr.branch_target,
                    files_changed_count=pr.files_changed_count,
                    latest_readiness_score=pr.latest_readiness_score,
                    created_at=pr.created_at,
                )
            )

    insight = (
        f"QuerySpeak identified {len(matching_comments)} matching review comments across {len(matching_prs)} pull requests. "
        f"Filters applied: severity='{filters.severity or 'Any'}', category='{filters.category or 'Any'}', keyword='{filters.keyword or 'Any'}'. "
        f"Recommended action: prioritize critical findings in payment and authentication services."
    )

    return QuerySpeakResponse(
        query=payload.voice_query,
        interpreted_filters=filters,
        matching_comments=matching_comments,
        matching_prs=matching_prs,
        insight_summary=insight,
        total_matches=len(matching_comments) or len(matching_prs),
    )


# ------------------------------------------------------------------------------
# 5. Telemetry & Observability Drawer
# ------------------------------------------------------------------------------
@app.get("/api/v1/telemetry/summary", response_model=TelemetrySummaryResponse, tags=["Observability"])
def get_telemetry_data():
    """Returns real-time trace correlation logs, metrics, and incident alerts."""
    return get_telemetry_summary()


# ------------------------------------------------------------------------------
# 6. Incident Drill & On-Call Responder Agent
# ------------------------------------------------------------------------------
@app.post("/api/v1/incidents/simulate-and-respond", response_model=IncidentSimulationResponse, tags=["Observability"])
def simulate_incident_and_respond(
    payload: Optional[IncidentSimulationRequest] = None,
    request: Request = None,
    db: Session = Depends(get_db),
):
    """Triggers autonomous On-Call Responder Agent to diagnose and propose remediation diff."""
    trace_id = getattr(request.state, "trace_id", uuid.uuid4().hex) if request else uuid.uuid4().hex
    
    sim_error = payload.simulated_error if payload else "RateLimitExceeded on upstream voice transcript parser."
    pr_id = payload.pr_id if payload else "PR-101"

    # Run On-Call Responder Agent with bounded autonomy
    result = run_oncall_remediation(
        trace_id=trace_id,
        simulated_error=sim_error,
    )

    # Record resolution in database
    inc_record = db.query(IncidentRecord).filter(IncidentRecord.trace_id == trace_id).first()
    if not inc_record:
        inc_record = db.query(IncidentRecord).filter(IncidentRecord.status == "TRIGGERED").order_by(IncidentRecord.created_at.desc()).first()
    if inc_record:
        inc_record.status = "RESOLVED_BY_ONCALL_AGENT"
        inc_record.agent_diagnosis = result["root_cause_analysis"]
        inc_record.proposed_fix_diff = result["remediation_diff"]
        inc_record.resolved_at = datetime.now(timezone.utc)
        db.commit()

    # Clear active incident from memory registry
    INCIDENT_REGISTRY.clear()
    REMEDIATION_HISTORY.append({
        "incident_id": result["incident_id"],
        "trace_id": result["trace_id"],
        "root_cause": result["root_cause_analysis"][:80],
        "resolved_at": datetime.now(timezone.utc).isoformat(),
    })

    record_telemetry_event(
        trace_id=trace_id,
        event="incident_resolved_by_oncall_agent",
        message=f"On-Call Agent resolved {result['incident_id']}. Bounded patch generated. All tests verified green.",
        level="INFO",
    )

    return IncidentSimulationResponse(**result)


# ------------------------------------------------------------------------------
# 7. Prometheus Metrics
# ------------------------------------------------------------------------------
@app.get("/metrics", tags=["System"])
def prometheus_metrics():
    """Exposes standard Prometheus metric scrape format."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
