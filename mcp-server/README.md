# PR-Whisperer MCP Server
**Model Context Protocol (MCP) Interface for Coding Agents**

---

## 1. Overview
The PR-Whisperer MCP Server exposes local code review findings, line-pinned diff cards, and synthesized fix prompts to coding assistants (Claude Code, Cursor, Antigravity) via the standard Model Context Protocol.

## 2. Tools Exposed

### `list_open_pr_reviews`
Lists all open pull requests and their current readiness scores (0-100).
- **Inputs**: None
- **Outputs**: JSON array of open PR records.

### `get_agent_fix_pack`
Retrieves the comprehensive, line-pinned fix specification prompt for a given PR.
- **Inputs**: `pr_id` (e.g. `"PR-101"`)
- **Outputs**: Markdown fix prompt, readiness score, comments array, guardrails array.

## 3. Configuration with Coding Agents

### Claude Desktop / Claude Code (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "pr-whisperer": {
      "command": "python",
      "args": ["e:/Code/Projects/Major Projects/PR-Whisperer/mcp-server/server.py"],
      "env": {
        "DATABASE_PATH": "e:/Code/Projects/Major Projects/PR-Whisperer/pr_whisperer.db"
      }
    }
  }
}
```

### CLI Quick Verification:
```bash
# List PRs via MCP tool directly
python mcp-server/server.py --test-list

# Fetch fix pack for PR-101
python mcp-server/server.py --test-fix PR-101
```
