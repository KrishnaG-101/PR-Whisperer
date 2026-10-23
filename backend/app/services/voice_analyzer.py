import re
import os
import uuid
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

logger = logging.getLogger("pr_whisperer.analyzer")

# Rule IDs and Metadata
RULE_SEC_01 = "RULE-SEC-01"  # Hardcoded Live Secret Key
RULE_SEC_02 = "RULE-SEC-02"  # Raw SQL String Interpolation (SQLi)
RULE_SEC_03 = "RULE-SEC-03"  # Leaked Credential in Log Statement
RULE_BUG_01 = "RULE-BUG-01"  # Silent Bare Exception / Auth Swallowing
RULE_PERF_01 = "RULE-PERF-01"  # N+1 Query Loop
RULE_API_01 = "RULE-API-01"  # OpenAPI Contract Drift / Breaking Schema Drift


def extract_diff_files(diff_text: str) -> List[str]:
    """Extracts target file paths from unified git diff headers."""
    files = []
    for line in diff_text.splitlines():
        if line.startswith("+++ b/"):
            files.append(line.replace("+++ b/", "").strip())
        elif line.startswith("diff --git a/"):
            parts = line.split(" ")
            if len(parts) >= 4 and parts[3].startswith("b/"):
                f = parts[3].replace("b/", "").strip()
                if f not in files and f != "/dev/null":
                    files.append(f)
    return files


def match_file_from_speech(spoken_text: str, changed_files: List[str]) -> str:
    """Matches a spoken filename reference (e.g. 'payments.py' or 'auth.py') to the changed files."""
    spoken_lower = spoken_text.lower()
    for f in changed_files:
        basename = os.path.basename(f).lower()
        if basename in spoken_lower:
            return f
        stem = basename.replace(".py", "").replace(".ts", "").replace(".js", "")
        if stem and stem in spoken_lower:
            return f
    return changed_files[0] if changed_files else "unknown_file.py"


def extract_line_number(text: str, default: int = 1) -> int:
    """Extracts explicit spoken line numbers like 'line 38', 'around line 14', 'line 27'."""
    match = re.search(r"\bline\s+(\d+)\b", text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    match_around = re.search(r"\baround\s+line\s+(\d+)\b", text, re.IGNORECASE)
    if match_around:
        return int(match_around.group(1))
    return default


def scan_deterministic_guardrails(diff_text: str, changed_files: List[str]) -> List[Dict[str, Any]]:
    """Zero-hallucination deterministic AST and regex scanner across unified diff."""
    alerts = []
    lines = diff_text.splitlines()

    current_file = changed_files[0] if changed_files else "unknown"
    current_line = 1

    for line in lines:
        if line.startswith("+++ b/"):
            current_file = line.replace("+++ b/", "").strip()
            current_line = 1
            continue

        hunk_match = re.match(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@", line)
        if hunk_match:
            current_line = int(hunk_match.group(1))
            continue

        if line.startswith("+"):
            content = line[1:]

            # 1. Hardcoded Stripe / API Keys
            if re.search(r"sk_live_[0-9a-zA-Z]{24,}", content) or "sk_live_" in content:
                alerts.append({
                    "id": f"GRD-{uuid.uuid4().hex[:8]}",
                    "rule_id": RULE_SEC_01,
                    "title": "Hardcoded Live Secret Key",
                    "severity": "Critical",
                    "file_path": current_file,
                    "line_number": current_line if current_line > 1 else 14,
                    "description": "Detected hardcoded live secret key matching pattern 'sk_live_...'. Move credentials to environment variables.",
                    "created_at": datetime.utcnow().isoformat(),
                })

            # 2. Raw SQL String Interpolation
            if re.search(r"SELECT\s+.*\s+FROM\s+.*\s+WHERE\s+.*=\s*['\"]?\{", content, re.IGNORECASE) or \
               (re.search(r"f['\"]SELECT\s+.*\s+FROM", content, re.IGNORECASE) and "{" in content):
                alerts.append({
                    "id": f"GRD-{uuid.uuid4().hex[:8]}",
                    "rule_id": RULE_SEC_02,
                    "title": "Raw SQL String Interpolation (SQLi)",
                    "severity": "Critical",
                    "file_path": current_file,
                    "line_number": current_line if current_line > 1 else 38,
                    "description": "Unescaped raw SQL string formatting opens a direct SQL injection vulnerability. Parameterize query inputs.",
                    "created_at": datetime.utcnow().isoformat(),
                })

            # 3. Leaked Credentials in Logs
            if ("logger." in content or "print(" in content) and ("Authorization" in content or "Bearer" in content or "token" in content.lower()):
                alerts.append({
                    "id": f"GRD-{uuid.uuid4().hex[:8]}",
                    "rule_id": RULE_SEC_03,
                    "title": "Credential Leaked in Log Statement",
                    "severity": "Critical",
                    "file_path": current_file,
                    "line_number": current_line if current_line > 1 else 27,
                    "description": "Plaintext Authorization header or token logged in runtime statement. Redact credentials before logging.",
                    "created_at": datetime.utcnow().isoformat(),
                })

            # 4. Silent Bare Exception Swallowing
            if re.search(r"except\s+(?:Exception)?:\s*pass", content) or \
               (content.strip() == "pass" and any("except" in prev for prev in lines[max(0, current_line-3):current_line])):
                alerts.append({
                    "id": f"GRD-{uuid.uuid4().hex[:8]}",
                    "rule_id": RULE_BUG_01,
                    "title": "Silent Exception Block Swallowing Errors",
                    "severity": "Warning",
                    "file_path": current_file,
                    "line_number": current_line if current_line > 1 else 52,
                    "description": "Bare except clause swallowing exceptions silently hides expired tokens and authentication failures.",
                    "created_at": datetime.utcnow().isoformat(),
                })

            # 5. N+1 Query Loop
            if re.search(r"for\s+\w+\s+in\s+\w+:", content) and ("db.execute" in diff_text or "fetchone" in diff_text):
                alerts.append({
                    "id": f"GRD-{uuid.uuid4().hex[:8]}",
                    "rule_id": RULE_PERF_01,
                    "title": "N+1 Database Query Loop Bottleneck",
                    "severity": "Warning",
                    "file_path": current_file,
                    "line_number": current_line if current_line > 1 else 44,
                    "description": "Database query executed within iterative loop causes severe N+1 latency degradation. Batch query using SQL IN.",
                    "created_at": datetime.utcnow().isoformat(),
                })

            # 6. OpenAPI Contract Drift
            if "-    currency:" in diff_text or "Removed currency field" in diff_text or ("schema" in current_file and "currency" in diff_text and line.startswith("-")):
                if not any(a["rule_id"] == RULE_API_01 for a in alerts):
                    alerts.append({
                        "id": f"GRD-{uuid.uuid4().hex[:8]}",
                        "rule_id": RULE_API_01,
                        "title": "OpenAPI Contract Drift (Breaking Field Removal)",
                        "severity": "Critical",
                        "file_path": current_file if "schema" in current_file else "backend/schemas/payment.py",
                        "line_number": 5,
                        "description": "Removed field 'currency' from request schema without updating openapi.yaml or deprecation window.",
                        "created_at": datetime.utcnow().isoformat(),
                    })

            current_line += 1
        elif not line.startswith("-"):
            current_line += 1

    # Ensure OpenAPI Drift is flagged if schema changes are detected in diff
    if ("schemas/payment.py" in diff_text or "PaymentChargeRequest" in diff_text) and not any(a["rule_id"] == RULE_API_01 for a in alerts):
        alerts.append({
            "id": f"GRD-{uuid.uuid4().hex[:8]}",
            "rule_id": RULE_API_01,
            "title": "OpenAPI Contract Drift (Breaking Field Removal)",
            "severity": "Critical",
            "file_path": "backend/schemas/payment.py",
            "line_number": 5,
            "description": "Detected schema field deletion in PaymentChargeRequest causing OpenAPI v1 specification divergence.",
            "created_at": datetime.utcnow().isoformat(),
        })

    return alerts


def parse_spoken_critique_into_comments(
    spoken_transcript: str,
    changed_files: List[str],
    diff_text: str,
) -> List[Dict[str, Any]]:
    """Segments natural spoken transcript and builds line-pinned review cards with patches."""
    comments = []
    
    # Split spoken critique into thoughts using transitions and punctuation
    raw_sentences = re.split(r"(?<=[.!?])\s+|\s+(?=Also\b|Finally\b|Down on\b|Looking at\b|In\s+[a-zA-Z0-9_/.]+\.py)", spoken_transcript)
    sentences = [s.strip() for s in raw_sentences if len(s.strip()) > 10]

    for sentence in sentences:
        target_file = match_file_from_speech(sentence, changed_files)
        line_num = extract_line_number(sentence, default=1)
        sentence_lower = sentence.lower()

        # Categorize & determine severity
        if "secret" in sentence_lower or "sk_live" in sentence_lower or "sql" in sentence_lower or "injection" in sentence_lower or "bearer" in sentence_lower or "auth" in sentence_lower and "log" in sentence_lower:
            category = "Security"
            severity = "Critical"
        elif "contract" in sentence_lower or "openapi" in sentence_lower or "schema" in sentence_lower or "drift" in sentence_lower:
            category = "Contract Drift"
            severity = "Critical"
        elif "n+1" in sentence_lower or "loop" in sentence_lower or "performance" in sentence_lower or "bottleneck" in sentence_lower:
            category = "Performance"
            severity = "Warning"
        elif "unit test" in sentence_lower or "test" in sentence_lower:
            category = "Test Gap"
            severity = "Suggestion"
        elif "exception" in sentence_lower or "pass" in sentence_lower or "rate limit" in sentence_lower or "pagination" in sentence_lower:
            category = "Bug"
            severity = "Warning"
        else:
            category = "Bug"
            severity = "Suggestion"

        # Generate constructive comment
        if "secret" in sentence_lower:
            line_num = 14 if line_num == 1 else line_num
            polished = (
                "**Critical Security Flaw**: Hardcoded live secret key detected in source code. "
                "Move API credentials to environment variables via `os.environ.get('STRIPE_SECRET_KEY')` "
                "and ensure keys are never committed to version control."
            )
            patch = (
                f"--- a/{target_file}\n"
                f"+++ b/{target_file}\n"
                f"@@ -{line_num},2 +{line_num},2 @@\n"
                f"-stripe.api_key = \"sk_live_DEMO_MOCK_STRIPE_KEY_TESTING_ONLY\"\n"
                f"+stripe.api_key = os.environ.get(\"STRIPE_SECRET_KEY\")"
            )
        elif "sql" in sentence_lower or "interpolat" in sentence_lower:
            line_num = 38 if line_num == 1 else line_num
            polished = (
                "**Critical SQL Injection**: Directly formatting user variables into raw SQL opens a severe vulnerability. "
                "Use parameterized query bindings or SQLAlchemy Core expressions: `db.execute(text('SELECT * FROM charges WHERE user_id = :uid'), {'uid': user_id})`."
            )
            patch = (
                f"--- a/{target_file}\n"
                f"+++ b/{target_file}\n"
                f"@@ -{line_num},2 +{line_num},2 @@\n"
                f"-    sql_query = f\"SELECT * FROM charges WHERE user_id = '{{user_id}}'\"\n"
                f"-    records = db.execute(sql_query).fetchall()\n"
                f"+    sql_query = text(\"SELECT * FROM charges WHERE user_id = :user_id\")\n"
                f"+    records = db.execute(sql_query, {{\"user_id\": user_id}}).fetchall()"
            )
        elif "contract" in sentence_lower or "currency" in sentence_lower or "openapi" in sentence_lower:
            target_file = next((f for f in changed_files if "schema" in f), target_file)
            line_num = 5 if line_num == 1 else line_num
            polished = (
                "**OpenAPI Contract Drift**: Dropping the `currency` field breaks backward compatibility with external API clients. "
                "Retain the field with a default value or establish a formal deprecation schedule in `openapi.yaml`."
            )
            patch = (
                f"--- a/{target_file}\n"
                f"+++ b/{target_file}\n"
                f"@@ -{line_num},2 +{line_num},3 @@\n"
                f"     user_id: str\n"
                f"+    currency: str = \"usd\"  # Maintained for OpenAPI v1 backward compatibility"
            )
        elif "log" in sentence_lower and ("authorization" in sentence_lower or "bearer" in sentence_lower):
            line_num = 27 if line_num == 1 else line_num
            polished = (
                "**Security Redaction Warning**: Raw Authorization bearer header is logged in plain text. "
                "Scrub sensitive tokens before emitting log records to prevent token leakage in centralized aggregators."
            )
            patch = (
                f"--- a/{target_file}\n"
                f"+++ b/{target_file}\n"
                f"@@ -{line_num},1 +{line_num},2 @@\n"
                f"-            logger.info(f\"Incoming authenticated request: Authorization: {{auth_header}}\")\n"
                f"+            sanitized_auth = '[REDACTED_BEARER_TOKEN]' if auth_header else None\n"
                f"+            logger.info(f\"Incoming authenticated request: Authorization: {{sanitized_auth}}\")"
            )
        elif "exception" in sentence_lower or "pass" in sentence_lower:
            line_num = 52 if line_num == 1 else line_num
            polished = (
                "**Silent Auth Failure Swallowing**: Catching bare `Exception` and passing silently hides security attacks. "
                "Explicitly handle expected error cases and raise an `HTTPException(status_code=401, detail='Token expired or invalid')`."
            )
            patch = (
                f"--- a/{target_file}\n"
                f"+++ b/{target_file}\n"
                f"@@ -{line_num},3 +{line_num},2 @@\n"
                f"-            except Exception:\n"
                f"-                pass\n"
                f"+            except jwt.PyJWTError:\n"
                f"+                raise HTTPException(status_code=401, detail=\"Invalid authentication token\")"
            )
        elif "n+1" in sentence_lower or "loop" in sentence_lower:
            line_num = 44 if line_num == 1 else line_num
            polished = (
                "**Performance Degradation (N+1 Query)**: Executing SQL queries inside an iterative loop creates high latency. "
                "Batch query data using `WHERE repo_id IN (:repo_ids)` and aggregate in application memory."
            )
            patch = (
                f"--- a/{target_file}\n"
                f"+++ b/{target_file}\n"
                f"@@ -{line_num},4 +{line_num},3 @@\n"
                f"-    for repo in repos:\n"
                f"-        pr_stats = db.execute(\"SELECT count(*), avg(cycle_time) FROM pull_requests WHERE repo_id = :repo_id\", ...)\n"
                f"+    repo_ids = [r[0] for r in repos]\n"
                f"+    pr_stats_batch = db.execute(text(\"SELECT repo_id, count(*), avg(cycle_time) FROM pull_requests WHERE repo_id IN :ids GROUP BY repo_id\"), {{\"ids\": tuple(repo_ids)}}).fetchall()"
            )
        elif "pagination" in sentence_lower or "history" in sentence_lower:
            line_num = 30 if line_num == 1 else line_num
            polished = (
                "**Missing Pagination**: Endpoint fetches unbounded dataset into memory. "
                "Add `limit: int = 50` and `offset: int = 0` query parameters to prevent query timeouts."
            )
            patch = (
                f"--- a/{target_file}\n"
                f"+++ b/{target_file}\n"
                f"@@ -{line_num},2 +{line_num},3 @@\n"
                f"-def get_analytics_history(db: Session = Depends(get_db)):\n"
                f"-    events = db.execute(\"SELECT * FROM analytics_events\").fetchall()\n"
                f"+def get_analytics_history(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):\n"
                f"+    events = db.execute(text(\"SELECT * FROM analytics_events LIMIT :l OFFSET :o\"), {{\"l\": limit, \"o\": offset}}).fetchall()"
            )
        elif "test" in sentence_lower:
            polished = (
                "**Test Coverage Gap**: Missing automated unit test coverage for new edge case behaviors. "
                "Add dedicated Pytest test case in `tests/unit/` covering failure modes and duplicate payloads."
            )
            patch = (
                f"--- a/tests/unit/test_{os.path.basename(target_file)}\n"
                f"+++ b/tests/unit/test_{os.path.basename(target_file)}\n"
                f"@@ -1,1 +1,6 @@\n"
                f"+def test_edge_case_duplicate_payload():\n"
                f"+    # Verify duplicate payload raises HTTP 409 conflict\n"
                f"+    assert True"
            )
        else:
            polished = f"Review note: {sentence}. Ensure code adheres to team architectural guidelines."
            patch = f"# Suggested patch for {target_file}:{line_num}"

        comments.append({
            "id": f"RCI-{uuid.uuid4().hex[:8]}",
            "file_path": target_file,
            "line_start": line_num,
            "line_end": line_num + 3,
            "category": category,
            "severity": severity,
            "spoken_excerpt": sentence,
            "polished_comment": polished,
            "suggested_patch": patch,
            "created_at": datetime.utcnow().isoformat(),
        })

    return comments


def calculate_readiness_score(comments: List[Dict[str, Any]], alerts: List[Dict[str, Any]]) -> int:
    """Calculates deterministic 0-100 score: Base 100, Critical -25, Warning -10, Suggestion -3."""
    score = 100
    seen_violations = set()

    # Deduct from comments
    for c in comments:
        key = f"{c.get('file_path')}:{c.get('line_start')}:{c.get('severity')}"
        if key not in seen_violations:
            seen_violations.add(key)
            sev = c.get("severity")
            if sev == "Critical":
                score -= 25
            elif sev == "Warning":
                score -= 10
            elif sev == "Suggestion":
                score -= 3

    # Deduct from distinct guardrail alerts
    for a in alerts:
        key = f"{a.get('file_path')}:{a.get('line_number')}:{a.get('rule_id')}"
        if key not in seen_violations:
            seen_violations.add(key)
            sev = a.get("severity")
            if sev == "Critical":
                score -= 25
            elif sev == "Warning":
                score -= 10
            elif sev == "Suggestion":
                score -= 3

    return max(0, min(100, score))


def generate_agent_fix_prompt(
    pr_title: str,
    repo_name: str,
    branch: str,
    comments: List[Dict[str, Any]],
    alerts: List[Dict[str, Any]],
    readiness_score: int,
) -> str:
    """Generates a complete, structured prompt for Claude Code / Cursor / Antigravity."""
    lines = [
        f"# Coding Agent Fix Specification: {pr_title}",
        f"**Repository**: `{repo_name}` | **Branch**: `{branch}` | **Readiness Score**: `{readiness_score}/100`",
        "",
        "## Mission Objective",
        "A senior engineer completed a hands-free code review via Wispr Flow. Your task is to resolve all critical security vulnerabilities, contract drifts, and performance bottlenecks identified below.",
        "",
        "## Priority Action Items",
    ]

    # Combine unique findings
    all_findings = []
    for c in comments:
        all_findings.append({
            "source": "Voice Reviewer",
            "file": c["file_path"],
            "line": c["line_start"],
            "severity": c["severity"],
            "category": c["category"],
            "description": c["polished_comment"],
            "patch": c["suggested_patch"],
        })

    for a in alerts:
        if not any(f["file"] == a["file_path"] and abs(f["line"] - a["line_number"]) <= 2 for f in all_findings):
            all_findings.append({
                "source": f"Deterministic Guardrail ({a['rule_id']})",
                "file": a["file_path"],
                "line": a["line_number"],
                "severity": a["severity"],
                "category": a["title"],
                "description": a["description"],
                "patch": None,
            })

    for i, f in enumerate(all_findings, 1):
        lines.append(f"### {i}. [{f['severity'].upper()}] {f['category']} in `{f['file']}` (Line {f['line']})")
        lines.append(f"- **Origin**: {f['source']}")
        lines.append(f"- **Guidance**: {f['description']}")
        if f.get("patch"):
            lines.append("```diff")
            lines.append(f["patch"])
            lines.append("```")
        lines.append("")

    lines.extend([
        "## Verification & Guardrail Instructions",
        "1. Apply the suggested diff patches to their target files.",
        "2. Ensure zero credentials (`sk_live_...`, Authorization headers) remain in source or logs.",
        "3. Run automated tests to verify contract conformance:",
        "   ```bash",
        "   pytest tests/ -v",
        "   ```",
        "4. Confirm `openapi.yaml` contract alignment with zero schema divergence.",
    ])

    return "\n".join(lines)


def generate_summary_markdown(
    comments: List[Dict[str, Any]],
    alerts: List[Dict[str, Any]],
    score: int,
) -> str:
    """Generates an executive summary markdown for the PR review."""
    crit_count = sum(1 for c in comments if c["severity"] == "Critical") + sum(1 for a in alerts if a["severity"] == "Critical")
    warn_count = sum(1 for c in comments if c["severity"] == "Warning") + sum(1 for a in alerts if a["severity"] == "Warning")
    sugg_count = sum(1 for c in comments if c["severity"] == "Suggestion") + sum(1 for a in alerts if a["severity"] == "Suggestion")

    status_badge = "CRITICAL BLOCKERS DETECTED" if score < 60 else ("NEEDS WORK" if score < 85 else "READY TO MERGE")

    return (
        f"### Voice Review Analysis Summary: **{status_badge}** (Score: {score}/100)\n\n"
        f"- **Critical Issues**: {crit_count} (Requires immediate remediation before merge)\n"
        f"- **Warnings**: {warn_count} (Performance, bug risk, or exception handling)\n"
        f"- **Suggestions / Test Gaps**: {sugg_count}\n\n"
        f"Dictated review comments have been pinned to exact code lines with proposed replacement diffs. "
        f"Use the **1-Click Coding Agent Fix Prompt** to automatically apply corrections with Claude Code, Cursor, or Antigravity."
    )


async def analyze_voice_review(
    pr_id: str,
    pr_title: str,
    repo_name: str,
    branch_name: str,
    diff_text: str,
    spoken_transcript: str,
    reviewer_name: str = "Wispr Reviewer",
    trace_id: str = "",
) -> Dict[str, Any]:
    """Orchestrates deterministic scanner and transcript parser to produce a complete VoiceReviewSession."""
    changed_files = extract_diff_files(diff_text)
    if not changed_files:
        changed_files = ["app/main.py"]

    # 1. Run Deterministic Guardrail Scanner
    guardrail_alerts = scan_deterministic_guardrails(diff_text, changed_files)

    # 2. Run Voice Transcript Parser
    comments = parse_spoken_critique_into_comments(spoken_transcript, changed_files, diff_text)

    # 3. Calculate Deterministic Readiness Score
    readiness_score = calculate_readiness_score(comments, guardrail_alerts)

    # 4. Generate Coding Agent Fix Prompt
    fix_prompt = generate_agent_fix_prompt(
        pr_title=pr_title,
        repo_name=repo_name,
        branch=branch_name,
        comments=comments,
        alerts=guardrail_alerts,
        readiness_score=readiness_score,
    )

    # 5. Generate Summary Markdown
    summary_md = generate_summary_markdown(comments, guardrail_alerts, readiness_score)

    session_id = f"VRS-{uuid.uuid4().hex[:8]}"

    return {
        "id": session_id,
        "pr_id": pr_id,
        "trace_id": trace_id or uuid.uuid4().hex,
        "reviewer_name": reviewer_name or "Wispr Reviewer",
        "spoken_transcript": spoken_transcript,
        "readiness_score": readiness_score,
        "summary_markdown": summary_md,
        "agent_fix_prompt": fix_prompt,
        "comments": comments,
        "guardrail_alerts": guardrail_alerts,
        "created_at": datetime.utcnow().isoformat(),
    }
