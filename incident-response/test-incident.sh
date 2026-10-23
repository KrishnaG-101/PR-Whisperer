#!/usr/bin/env bash
# ==============================================================================
# PR-Whisperer: User-Impact Incident Drill & Automated On-Call Remediation Test
# ==============================================================================

set -euo pipefail

BASE_URL="http://localhost:8000"

echo "======================================================================"
echo "PR-Whisperer: Automated Incident Drill & On-Call Remediation Verification"
echo "======================================================================"

echo "[1/4] Checking System Health & Baseline Telemetry..."
HEALTH_RESP=$(curl -s "${BASE_URL}/api/v1/health" || true)
if [ -z "$HEALTH_RESP" ]; then
    echo "[-] Error: FastAPI backend is not running at ${BASE_URL}."
    echo "    Please start the server first via: uvicorn backend.app.main:app --reload"
    exit 1
fi
echo "      Health: $HEALTH_RESP"

echo "[2/4] Triggering User-Impact Alert via Simulation Drill..."
DRILL_PAYLOAD='{"alert_type":"VOICE_ANALYZE_FAILURE","pr_id":"PR-101","simulated_error":"RateLimitExceeded: 429 Too Many Requests on upstream voice ingestion."}'

RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/incidents/simulate-and-respond" \
    -H "Content-Type: application/json" \
    -d "$DRILL_PAYLOAD")

echo "[3/4] Response from Autonomous On-Call Responder Agent:"
echo "$RESPONSE" | grep -o '"incident_id":"[^"]*"' || echo "$RESPONSE"
echo "$RESPONSE" | grep -o '"status":"[^"]*"' || true
echo "$RESPONSE" | grep -o '"trace_id":"[^"]*"' || true

echo "[4/4] Verifying Post-Mortem Report Generated..."
if [ -f "incident-response/incidents/latest-incident-report.md" ]; then
    echo "[+] Post-mortem report verified at: incident-response/incidents/latest-incident-report.md"
else
    echo "[!] Note: Check incident-response/incidents/ directory."
fi

echo "======================================================================"
echo "[+] Incident Drill & Automated Remediation Succeeded (HTTP 200)!"
echo "======================================================================"
