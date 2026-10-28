import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from backend.app.database import Base


class PRRecord(Base):
    __tablename__ = "pr_records"

    id = Column(String(64), primary_key=True, index=True)
    pr_number = Column(String(32), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    repo_name = Column(String(255), nullable=False)
    author = Column(String(128), nullable=False)
    branch_name = Column(String(128), nullable=False)
    branch_source = Column(String(128), nullable=True)
    branch_target = Column(String(128), default="main", nullable=False)
    status = Column(String(32), default="OPEN", nullable=False)
    diff_text = Column(Text, nullable=False)
    files_changed_json = Column(Text, default="[]", nullable=False)
    sample_voice_prompt = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    review_sessions = relationship(
        "ReviewSessionRecord",
        back_populates="pr",
        cascade="all, delete-orphan",
        order_by="desc(ReviewSessionRecord.created_at)",
    )

    @property
    def changed_files(self) -> List[str]:
        try:
            return json.loads(self.files_changed_json) if self.files_changed_json else []
        except Exception:
            return []

    @property
    def files_changed_count(self) -> int:
        return len(self.changed_files)

    @property
    def latest_readiness_score(self) -> Optional[int]:
        if self.review_sessions and len(self.review_sessions) > 0:
            return self.review_sessions[0].readiness_score
        return None


class ReviewSessionRecord(Base):
    __tablename__ = "review_session_records"

    id = Column(String(64), primary_key=True, index=True)
    pr_id = Column(String(64), ForeignKey("pr_records.id", ondelete="CASCADE"), index=True, nullable=False)
    trace_id = Column(String(64), index=True, nullable=False)
    reviewer_name = Column(String(128), default="Wispr Reviewer", nullable=False)
    spoken_transcript = Column(Text, nullable=False)
    readiness_score = Column(Integer, default=100, nullable=False)
    summary_markdown = Column(Text, default="", nullable=False)
    agent_fix_prompt = Column(Text, default="", nullable=False)
    comments_json = Column(Text, default="[]", nullable=False)
    guardrails_json = Column(Text, default="[]", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    pr = relationship("PRRecord", back_populates="review_sessions")

    @property
    def comments(self) -> List[Dict[str, Any]]:
        try:
            return json.loads(self.comments_json) if self.comments_json else []
        except Exception:
            return []

    @property
    def guardrail_alerts(self) -> List[Dict[str, Any]]:
        try:
            return json.loads(self.guardrails_json) if self.guardrails_json else []
        except Exception:
            return []


class IncidentRecord(Base):
    __tablename__ = "incident_records"

    id = Column(String(64), primary_key=True, index=True)
    trace_id = Column(String(64), index=True, nullable=False)
    alert_name = Column(String(128), default="HighVoiceAnalyzeFailureRate", nullable=False)
    endpoint = Column(String(255), default="/api/v1/prs/{pr_id}/voice-analyze", nullable=False)
    error_message = Column(Text, nullable=False)
    status = Column(String(64), default="TRIGGERED", nullable=False)
    evidence_packet_json = Column(Text, default="{}", nullable=False)
    agent_diagnosis = Column(Text, nullable=True)
    proposed_fix_diff = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    @property
    def evidence_packet(self) -> Dict[str, Any]:
        try:
            return json.loads(self.evidence_packet_json) if self.evidence_packet_json else {}
        except Exception:
            return {}
