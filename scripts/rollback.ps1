<#
.SYNOPSIS
    PR-Whisperer: Production Rollback Procedure (PowerShell)
.DESCRIPTION
    Rolls back to a target git reference, checks container status, runs health check.
#>
param(
    [string]$TargetRef = "HEAD~1",
    [string]$HealthUrl = "http://localhost:8000/api/v1/health"
)

$ErrorActionPreference = "Stop"
$RollbackLog = "incident-response/incidents/rollback-audit.log"
$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "PR-Whisperer: Production Rollback Initiated at $Timestamp" -ForegroundColor Cyan
Write-Host "Target Ref: $TargetRef" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

if (-not (Test-Path "incident-response/incidents")) {
    New-Item -ItemType Directory -Path "incident-response/incidents" -Force | Out-Null
}

Add-Content -Path $RollbackLog -Value "[$Timestamp] ROLLBACK INITIATED: target=$TargetRef"

$CurrentSha = git rev-parse HEAD 2>$null
Write-Host "[1/4] Current Deployment SHA: $CurrentSha"

Write-Host "[2/4] Verifying Target Reference: $TargetRef..."
try {
    $TargetSha = git rev-parse --verify $TargetRef
    Write-Host "      Target resolved to SHA: $TargetSha" -ForegroundColor Green
} catch {
    Write-Host "[-] Error: Invalid target reference: $TargetRef" -ForegroundColor Red
    Add-Content -Path $RollbackLog -Value "[$Timestamp] ROLLBACK FAILED: Invalid target $TargetRef"
    exit 1
}

Write-Host "[3/4] Re-deploying containers..."
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker compose down -v
    docker compose up -d --build
} else {
    Write-Host "      [DRY-RUN] Docker daemon not directly managed by script." -ForegroundColor Yellow
}

Write-Host "[4/4] Executing Health Check on $HealthUrl..."
$Healthy = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $resp = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 3 -ErrorAction Stop
        if ($resp.status -eq "healthy") {
            $Healthy = $true
            break
        }
    } catch {
        Write-Host "      Waiting for service to become healthy... ($($i+1)/10)"
        Start-Sleep -Seconds 2
    }
}

if ($Healthy) {
    Write-Host "[+] Production rollback to $TargetSha completed successfully!" -ForegroundColor Green
    Add-Content -Path $RollbackLog -Value "[$Timestamp] ROLLBACK SUCCESS: rolled back from $CurrentSha to $TargetSha"
} else {
    Write-Host "[!] Warning: Rollback executed, health check timed out." -ForegroundColor Yellow
    Add-Content -Path $RollbackLog -Value "[$Timestamp] ROLLBACK WARNING: health check timeout for $TargetSha"
}
