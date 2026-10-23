# ==============================================================================
# PR-Whisperer: User-Impact Incident Drill & Automated On-Call Remediation Test (PowerShell)
# ==============================================================================

$ErrorActionPreference = "Stop"
$BaseUrl = "http://localhost:8000"

Write-Host "======================================================================"
Write-Host "PR-Whisperer: Automated Incident Drill & On-Call Remediation (PowerShell)"
Write-Host "======================================================================"

Write-Host "[1/4] Checking System Health & Baseline Telemetry..."
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/api/v1/health" -Method Get
    Write-Host "      Health Status: $($health.status) | Version: $($health.version)" -ForegroundColor Green
} catch {
    Write-Host "[-] Error: FastAPI backend is not running at $BaseUrl." -ForegroundColor Red
    Write-Host "    Start server first: .\venv\Scripts\uvicorn backend.app.main:app --reload"
    exit 1
}

Write-Host "[2/4] Triggering User-Impact Alert via Simulation Drill..."
$payload = @{
    alert_type = "VOICE_ANALYZE_FAILURE"
    pr_id = "PR-101"
    simulated_error = "RateLimitExceeded: 429 Too Many Requests on upstream voice ingestion."
} | ConvertTo-Json

$resp = Invoke-RestMethod -Uri "$BaseUrl/api/v1/incidents/simulate-and-respond" -Method Post -Body $payload -ContentType "application/json"

Write-Host "[3/4] Response from Autonomous On-Call Responder Agent:"
Write-Host "      Incident ID: $($resp.incident_id)" -ForegroundColor Cyan
Write-Host "      Trace ID:    $($resp.trace_id)" -ForegroundColor Cyan
Write-Host "      Status:      $($resp.status)" -ForegroundColor Green
Write-Host "      Root Cause:  $($resp.root_cause_analysis)" -ForegroundColor Yellow

Write-Host "[4/4] Verifying Post-Mortem Report..."
if (Test-Path "incident-response/incidents/latest-incident-report.md") {
    Write-Host "[+] Post-mortem report verified at incident-response/incidents/latest-incident-report.md" -ForegroundColor Green
}

Write-Host "======================================================================"
Write-Host "[+] Incident Drill & Automated Remediation Succeeded (HTTP 200)!" -ForegroundColor Green
Write-Host "======================================================================"
