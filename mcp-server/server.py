import os
import sys
import json
import sqlite3
import argparse
from typing import Dict, Any, List

DB_PATH = os.getenv("DATABASE_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "pr_whisperer.db"))


def get_db_connection():
    """Connects to SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def list_open_pr_reviews() -> List[Dict[str, Any]]:
    """Lists open pull requests and their latest readiness scores."""
    if not os.path.exists(DB_PATH):
        return [
            {
                "id": "PR-101",
                "title": "feat(payments): Add Stripe webhook retry & customer charge endpoint",
                "latest_readiness_score": 25,
                "status": "OPEN",
            },
            {
                "id": "PR-102",
                "title": "refactor(auth): Async session middleware & JWT token refresh",
                "latest_readiness_score": 55,
                "status": "OPEN",
            },
            {
                "id": "PR-103",
                "title": "feat(analytics): Real-time team velocity & PR cycle time dashboard",
                "latest_readiness_score": 30,
                "status": "OPEN",
            },
        ]

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT pr.id, pr.pr_number, pr.title, pr.repo_name, pr.branch_name, pr.status,
               (SELECT readiness_score FROM review_session_records WHERE pr_id = pr.id ORDER BY created_at DESC LIMIT 1) as latest_readiness_score
        FROM pr_records pr
        ORDER BY pr.created_at DESC
    """)
    rows = cursor.fetchall()
    results = [dict(row) for row in rows]
    conn.close()
    return results


def get_agent_fix_pack(pr_id: str) -> Dict[str, Any]:
    """Retrieves full voice review fix pack and line-pinned comments for coding agents."""
    if not os.path.exists(DB_PATH):
        return {
            "pr_id": pr_id,
            "status": "SAMPLE_DATA",
            "agent_fix_prompt": (
                f"# Coding Agent Fix Specification for {pr_id}\n\n"
                "1. Move hardcoded Stripe secret `sk_live_...` to environment variable.\n"
                "2. Parameterize raw SQL f-string query on line 38.\n"
                "3. Restore `currency` field in payment request schema to prevent contract drift."
            ),
            "readiness_score": 25,
        }

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Query PR
    cursor.execute("SELECT * FROM pr_records WHERE id = ? OR pr_number = ?", (pr_id, pr_id))
    pr_row = cursor.fetchone()
    if not pr_row:
        conn.close()
        return {"error": f"Pull request {pr_id} not found."}

    # Query latest review session
    cursor.execute("""
        SELECT * FROM review_session_records 
        WHERE pr_id = ? 
        ORDER BY created_at DESC LIMIT 1
    """, (pr_row["id"],))
    session_row = cursor.fetchone()
    conn.close()

    if not session_row:
        return {
            "pr_id": pr_row["id"],
            "title": pr_row["title"],
            "status": "NO_REVIEW_YET",
            "message": "PR has not undergone voice review analysis yet. Submit voice critique first.",
        }

    return {
        "pr_id": pr_row["id"],
        "title": pr_row["title"],
        "repo_name": pr_row["repo_name"],
        "branch_name": pr_row["branch_name"],
        "readiness_score": session_row["readiness_score"],
        "summary_markdown": session_row["summary_markdown"],
        "agent_fix_prompt": session_row["agent_fix_prompt"],
        "comments": json.loads(session_row["comments_json"]) if session_row["comments_json"] else [],
        "guardrail_alerts": json.loads(session_row["guardrails_json"]) if session_row["guardrails_json"] else [],
    }


def handle_json_rpc(request: Dict[str, Any]) -> Dict[str, Any]:
    """Standard MCP JSON-RPC protocol router."""
    req_id = request.get("id")
    method = request.get("method")
    params = request.get("params", {})

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": [
                    {
                        "name": "list_open_pr_reviews",
                        "description": "Lists all open PRs in PR-Whisperer and their latest voice review readiness scores.",
                        "inputSchema": {"type": "object", "properties": {}},
                    },
                    {
                        "name": "get_agent_fix_pack",
                        "description": "Fetches the 1-click Coding Agent Fix Prompt, line-pinned review comments, and suggested patches for a PR.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "pr_id": {"type": "string", "description": "PR identifier e.g. 'PR-101'"}
                            },
                            "required": ["pr_id"],
                        },
                    },
                ]
            },
        }

    elif method == "tools/call":
        tool_name = params.get("name")
        args = params.get("arguments", {})

        if tool_name == "list_open_pr_reviews":
            data = list_open_pr_reviews()
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"content": [{"type": "text", "text": json.dumps(data, indent=2)}]},
            }
        elif tool_name == "get_agent_fix_pack":
            pr_id = args.get("pr_id", "PR-101")
            data = get_agent_fix_pack(pr_id)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"content": [{"type": "text", "text": json.dumps(data, indent=2)}]},
            }
        else:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Tool '{tool_name}' not found."},
            }

    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Method '{method}' not supported."},
    }


def main():
    parser = argparse.ArgumentParser(description="PR-Whisperer Model Context Protocol (MCP) Server")
    parser.add_argument("--test-list", action="store_true", help="Test tool listing directly")
    parser.add_argument("--test-fix", help="Test get_agent_fix_pack for a PR ID")
    args = parser.parse_args()

    if args.test_list:
        print(json.dumps(list_open_pr_reviews(), indent=2))
        sys.exit(0)

    if args.test_fix:
        print(json.dumps(get_agent_fix_pack(args.test_fix), indent=2))
        sys.exit(0)

    # Standard Stdio JSON-RPC Loop for Claude Code / Cursor / Antigravity MCP Client
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            resp = handle_json_rpc(req)
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()
        except Exception as e:
            err_resp = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": str(e)}}
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
