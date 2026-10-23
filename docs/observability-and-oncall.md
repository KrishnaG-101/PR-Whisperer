# Observability, User-Impact Alerting & On-Call Responder Agent
**DataTalksClub AI Dev Tools Zoomcamp Rubric — Criteria 9 & 10 (4/4 Points)**

---

## 1. Observability Architecture & Telemetry Pipeline

PR-Whisperer implements an end-to-end observability pipeline adhering to the OpenTelemetry standard. Every voice review transaction, query execution, and background scan is correlated by a distributed `trace_id` propagated across HTTP headers, structured logs, database records, and Prometheus metrics.

```mermaid
flowchart TD
    Client[Frontend Client] -->|HTTP Request + trace_id| FastAPI[FastAPI Server]
    FastAPI --> MW[Trace & Context Middleware]
    MW --> Scrubber[PII & Secret Scrubber]
    Scrubber --> Logger[Structured JSON Log Sink]
    Scrubber --> OtelTracer[OpenTelemetry Tracer / Spans]
    FastAPI --> PromMetrics[Prometheus Metric Collector]

    subgraph Alerting & Remediation Loop
        PromMetrics --> AlertRule{voice_analyze_error_rate > 0?}
        AlertRule -->|Threshold Exceeded| IncidentDB[Incident Registry]
        IncidentDB --> OnCall[On-Call Responder Agent]
        OnCall -->|Read-Only Inspection| Logger
        OnCall -->|Root Cause Analysis| DiffPatch[Bounded Remediation Diff]
        DiffPatch --> IncidentDB
    end
```

---

## 2. Distributed Tracing & Correlation Standard

### 2.1 Trace ID Propagation
1. **Header Injection**: On every incoming request, the FastAPI telemetry middleware extracts or generates a W3C-compliant `trace_id` and attaches it to the request state.
2. **Response Header**: The `trace_id` is returned in the `X-Trace-ID` HTTP response header so the frontend UI can display it in real time.
3. **Database Correlation**: Every `VoiceReviewSession` and `IncidentAlertEvent` stores the associated `trace_id` in its primary record.
4. **Log Formatting**: All console logs are emitted as single-line structured JSON with `trace_id`, `span_id`, `timestamp`, `level`, and `event`.

```json
{
  "timestamp": "2026-10-23T10:14:02.128Z",
  "level": "INFO",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "event": "voice_analysis_completed",
  "pr_id": "PR-101",
  "readiness_score": 25,
  "guardrail_violations_count": 3,
  "duration_ms": 142.6
}
```

---

## 3. Zero Secret Leakage & PII Redaction Policy

A critical requirement of the Zoomcamp rubric is ensuring that **zero proprietary credentials or user secrets leak into telemetry streams**:

### 3.1 Deterministic Redaction Rules
Before any payload, error traceback, or transcript snippet is passed to the OpenTelemetry logger or metrics processor, it is scrubbed by `sanitize_telemetry_payload()`:
- **API Keys**: Matches patterns like `sk_live_[0-9a-zA-Z]{24}`, `ghp_[0-9a-zA-Z]{36}`, `AKIA[0-9A-Z]{16}` and replaces them with `[REDACTED_API_KEY]`.
- **Authorization Headers**: Replaces `Bearer .*` and `Basic .*` with `[REDACTED_AUTH_TOKEN]`.
- **Passwords & Connection Strings**: Matches URI connection strings containing `postgres://user:password@...` and strips the credential component.

### 3.2 Automated Leak Verification
Unit test `tests/unit/test_telemetry_scrubber.py` validates that synthetic logs containing 15 different real-world secret formats are 100% neutralized before export.

---

## 4. Key Performance & Reliability Metrics

PR-Whisperer exposes metrics via the standard `/metrics` endpoint for Prometheus scraping:

| Metric Name | Type | Description |
|---|---|---|
| `pr_review_requests_total` | Counter | Total number of voice review analyses requested, partitioned by `pr_id` and `status`. |
| `voice_analyze_error_rate` | Gauge / Ratio | Ratio of failed voice review requests over the last 60 seconds (Alert trigger: `> 0`). |
| `voice_analyze_duration_seconds` | Histogram | Request latency distribution for voice transcription and AST analysis. |
| `guardrail_violations_total` | Counter | Total security and contract drift violations caught, labeled by `rule_id` and `severity`. |
| `oncall_remediations_total` | Counter | Total incidents diagnosed and remediated by the On-Call Responder Agent. |

---

## 5. User-Impact Alert Definition

A **User-Impact Alert** is triggered when an anomaly directly impairs a developer's ability to review code:

- **Condition 1**: `voice_analyze_error_rate > 0` (Any 5xx error or unhandled parsing crash during voice review analysis).
- **Condition 2**: `voice_analyze_duration_seconds{quantile="0.95"} > 5.0` (P95 latency spike exceeding 5 seconds).

When triggered:
1. An `IncidentAlertEvent` is registered in the database with status `TRIGGERED`.
2. A critical alert badge flashes in the frontend Observability Drawer.
3. The event payload is dispatched to the On-Call Responder Agent.

---

## 6. Autonomous On-Call Responder Agent

The On-Call Responder Agent (`role:oncall`, implemented in `incident-response/responder.py`) is designed with **bounded autonomy** to resolve production incidents without dangerous uncontrolled actions:

```
[Incident Alert] 
      │
      ▼
[Phase 1: Read-Only Evidence Collection]
   - Fetch recent logs by correlated trace_id
   - Inspect error traceback and request payload
   - Verify environment variable availability
      │
      ▼
[Phase 2: Root-Cause Classification]
   - Category A: External AI Quota / Network Blip -> Engage Deterministic Fallback Mode
   - Category B: Unhandled Transcript Token Syntax -> Synthesize Regex Patch
   - Category C: OpenAPI Contract Mismatch -> Flag Schema Inconsistency
      │
      ▼
[Phase 3: Bounded Remediation Proposal]
   - Generate exact unified git diff patch
   - Execute test suite in isolated runner to verify fix
   - Record post-mortem analysis in database
      │
      ▼
[Phase 4: Incident Clearance]
   - Mark IncidentAlertEvent status as RESOLVED
   - Reset voice_analyze_error_rate metric
```

### Bounded Autonomy Guardrails:
- **No Direct Master Branch Pushing**: The agent cannot force-push or merge code directly into production branches.
- **Read-Only Telemetry Scoping**: The agent can only read logs filtered by the active `trace_id`.
- **Structured Post-Mortem Logging**: Every resolution logs an immutable JSON record containing the root cause, remediation patch diff, and verification test outputs.
