import pytest
from backend.app.services.voice_analyzer import (
    extract_diff_files,
    match_file_from_speech,
    extract_line_number,
    scan_deterministic_guardrails,
    parse_spoken_critique_into_comments,
    calculate_readiness_score,
    generate_agent_fix_prompt,
    RULE_SEC_01,
    RULE_SEC_02,
    RULE_API_01,
)
from backend.app.telemetry import sanitize_telemetry_payload
from backend.app.seed import PR_101_DIFF


def test_extract_diff_files():
    files = extract_diff_files(PR_101_DIFF)
    assert "backend/routers/payments.py" in files
    assert "backend/schemas/payment.py" in files


def test_match_file_from_speech():
    changed_files = ["backend/routers/payments.py", "backend/schemas/payment.py"]
    match1 = match_file_from_speech("Looking at payments.py around line 14", changed_files)
    assert match1 == "backend/routers/payments.py"

    match2 = match_file_from_speech("In payment.py schema, currency is dropped", changed_files)
    assert match2 == "backend/schemas/payment.py"


def test_extract_line_number():
    assert extract_line_number("Around line 14 we left a key", default=1) == 14
    assert extract_line_number("On line 38 you interpolate user_id", default=1) == 38
    assert extract_line_number("In general this looks fine", default=1) == 1


def test_deterministic_guardrails_secret():
    changed_files = ["backend/routers/payments.py"]
    alerts = scan_deterministic_guardrails(PR_101_DIFF, changed_files)
    
    rule_ids = [a["rule_id"] for a in alerts]
    assert RULE_SEC_01 in rule_ids
    assert RULE_SEC_02 in rule_ids

    secret_alert = next(a for a in alerts if a["rule_id"] == RULE_SEC_01)
    assert secret_alert["severity"] == "Critical"
    assert "sk_live_" in secret_alert["description"] or "secret key" in secret_alert["title"].lower()


def test_openapi_contract_drift():
    changed_files = ["backend/routers/payments.py", "backend/schemas/payment.py"]
    alerts = scan_deterministic_guardrails(PR_101_DIFF, changed_files)
    
    drift_alert = next((a for a in alerts if a["rule_id"] == RULE_API_01), None)
    assert drift_alert is not None
    assert drift_alert["severity"] == "Critical"
    assert "currency" in drift_alert["description"].lower() or "schema" in drift_alert["description"].lower()


def test_secret_redaction_telemetry():
    raw_log = "Processing payment with key sk_live_DEMO_MOCK_STRIPE_KEY_TESTING_ONLY and Bearer secret_token_xyz_12345678901234567890"
    redacted = sanitize_telemetry_payload(raw_log)
    assert "sk_live_DEMO_MOCK_STRIPE_KEY_TESTING_ONLY" not in redacted
    assert "[REDACTED_SECRET]" in redacted
    assert "Bearer [REDACTED_SECRET]" in redacted or "[REDACTED_SECRET]" in redacted


def test_spoken_transcript_parsing():
    transcript = (
        "Looking at payments.py around line 14, we left a hardcoded Stripe live secret in the file. "
        "Also on line 38, you are interpolating user_id directly into raw SQL. "
        "Finally, in payment.py schema, dropping the currency field breaks our OpenAPI contract."
    )
    changed_files = ["backend/routers/payments.py", "backend/schemas/payment.py"]
    comments = parse_spoken_critique_into_comments(transcript, changed_files, PR_101_DIFF)

    assert len(comments) >= 3
    categories = [c["category"] for c in comments]
    assert "Security" in categories
    assert "Contract Drift" in categories

    secret_comment = next(c for c in comments if "secret" in c["spoken_excerpt"].lower())
    assert secret_comment["severity"] == "Critical"
    assert secret_comment["line_start"] == 14
    assert "diff" in secret_comment["suggested_patch"] or "stripe.api_key" in secret_comment["suggested_patch"]


def test_readiness_score_calculation():
    critical_comment = [{"file_path": "a.py", "line_start": 10, "severity": "Critical"}]
    warning_comment = [{"file_path": "b.py", "line_start": 20, "severity": "Warning"}]
    suggestion_comment = [{"file_path": "c.py", "line_start": 30, "severity": "Suggestion"}]

    assert calculate_readiness_score([], []) == 100
    assert calculate_readiness_score(critical_comment, []) == 75
    assert calculate_readiness_score(critical_comment + warning_comment, []) == 65
    assert calculate_readiness_score(critical_comment + warning_comment + suggestion_comment, []) == 62


def test_agent_fix_prompt_generation():
    comments = [
        {
            "file_path": "backend/routers/payments.py",
            "line_start": 14,
            "severity": "Critical",
            "category": "Security",
            "polished_comment": "Hardcoded secret key",
            "suggested_patch": "--- a/file.py\n+++ b/file.py",
        }
    ]
    alerts = []
    prompt = generate_agent_fix_prompt(
        pr_title="feat(payments): Stripe Integration",
        repo_name="acme/payments",
        branch="feat/stripe",
        comments=comments,
        alerts=alerts,
        readiness_score=75,
    )

    assert "# Coding Agent Fix Specification" in prompt
    assert "acme/payments" in prompt
    assert "75/100" in prompt
    assert "**Readiness Score**: `75/100`" in prompt
    assert "pytest" in prompt
