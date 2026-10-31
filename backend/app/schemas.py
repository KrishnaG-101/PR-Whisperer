from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


class HealthResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: str = Field(default="healthy", description="Operational status of service")
    version: str = Field(default="1.0.0", description="Application semantic version")
    db_connected: bool = Field(default=True, description="Database connection health")
    telemetry_active: bool = Field(default=True, description="OpenTelemetry pipeline status")
    active_incidents_count: int = Field(default=0, description="Active user-impact alerts")


class PullRequestSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repo_name: str
    pr_number: str
    title: str
    author: str
    branch_source: str
    branch_target: str = "main"
    files_changed_count: int
    latest_readiness_score: Optional[int] = None
    created_at: datetime


class PullRequestCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    repo_name: str
    author: str
    branch_source: str
    branch_target: str = "main"
    diff_text: str = Field(..., description="Unified git diff text")


class GitHubImportRequest(BaseModel):
    github_url: str = Field(..., description="Public GitHub PR URL, e.g. https://github.com/owner/repo/pull/123")


class ReadinessCertificateResponse(BaseModel):
    pr_id: str
    filename: str
    certificate_markdown: str


class ReviewCommentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    file_path: str
    line_start: int
    line_end: int
    line_number: Optional[int] = None
    category: str
    severity: str
    spoken_excerpt: str
    polished_comment: str
    suggested_patch: str
    subagent_persona: Optional[str] = "VoiceLead"
    created_at: datetime = Field(default_factory=get_utc_now)


class GuardrailAlert(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    rule_id: str
    title: str
    severity: str
    file_path: str
    line_number: int
    description: str
    subagent_persona: Optional[str] = "SecuritySentinel"
    created_at: datetime = Field(default_factory=get_utc_now)


class VoiceReviewSession(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pr_id: str
    trace_id: str
    reviewer_name: str
    spoken_transcript: str
    readiness_score: int = Field(..., ge=0, le=100)
    summary_markdown: str
    agent_fix_prompt: str
    comments: List[ReviewCommentItem] = Field(default_factory=list)
    guardrail_alerts: List[GuardrailAlert] = Field(default_factory=list)
    word_count: int = Field(default=0)
    estimated_speaking_seconds: float = Field(default=0.0)
    estimated_typing_seconds_saved: float = Field(default=0.0)
    speedup_multiplier: float = Field(default=1.0)
    review_verdict: str = Field(default="COMMENTED")
    created_at: datetime = Field(default_factory=get_utc_now)


class PullRequestDetail(PullRequestSummary):
    diff_text: str
    changed_files: List[str] = Field(default_factory=list)
    review_sessions: List[VoiceReviewSession] = Field(default_factory=list)
    sample_voice_prompt: Optional[str] = None


class VoiceAnalyzeRequest(BaseModel):
    spoken_transcript: str
    reviewer_name: Optional[str] = "Wispr Reviewer"
    simulate_failure: Optional[bool] = False
    append_to_latest: Optional[bool] = False


class QuerySpeakRequest(BaseModel):
    voice_query: str


class QuerySpeakFilters(BaseModel):
    severity: Optional[str] = None
    category: Optional[str] = None
    keyword: Optional[str] = None
    repo: Optional[str] = None


class QuerySpeakResponse(BaseModel):
    query: str
    interpreted_filters: QuerySpeakFilters
    matching_comments: List[ReviewCommentItem] = Field(default_factory=list)
    matching_prs: List[PullRequestSummary] = Field(default_factory=list)
    insight_summary: str
    total_matches: int


class TelemetryLogEntry(BaseModel):
    timestamp: datetime = Field(default_factory=get_utc_now)
    level: str = "INFO"
    trace_id: str
    event: str
    message: str


class TelemetryMetrics(BaseModel):
    total_requests: int
    total_errors: int
    error_rate: float
    avg_duration_ms: float


class TelemetrySummaryResponse(BaseModel):
    recent_traces: List[TelemetryLogEntry] = Field(default_factory=list)
    metrics: TelemetryMetrics
    active_incidents: List[Dict[str, Any]] = Field(default_factory=list)
    recent_remediations: List[Dict[str, Any]] = Field(default_factory=list)


class IncidentSimulationRequest(BaseModel):
    alert_type: Optional[str] = "VOICE_ANALYZE_FAILURE"
    pr_id: Optional[str] = "PR-101"
    simulated_error: Optional[str] = "Simulated quota failure on upstream voice transcription."


class IncidentSimulationResponse(BaseModel):
    incident_id: str
    trace_id: str
    status: str
    root_cause_analysis: str
    remediation_diff: str
    verified_by_tests: bool
    post_mortem_log: str


class ErrorResponse(BaseModel):
    detail: str
    trace_id: str
