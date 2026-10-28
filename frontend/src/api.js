/**
 * PR-Whisperer Native API Client
 * Strictly aligned with openapi.yaml
 */

const API_BASE = "";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/api/v1/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function fetchPRs() {
  const res = await fetch(`${API_BASE}/api/v1/prs`);
  if (!res.ok) throw new Error(`Failed to fetch PRs: ${res.status}`);
  return res.json();
}

export async function fetchPRDetail(prId) {
  const res = await fetch(`${API_BASE}/api/v1/prs/${encodeURIComponent(prId)}`);
  if (!res.ok) throw new Error(`Failed to fetch PR ${prId}: ${res.status}`);
  return res.json();
}

export async function createPR(payload) {
  const res = await fetch(`${API_BASE}/api/v1/prs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create PR: ${res.status}`);
  }
  return res.json();
}

export async function voiceAnalyzePR(prId, payload) {
  const res = await fetch(`${API_BASE}/api/v1/prs/${encodeURIComponent(prId)}/voice-analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Voice analysis failed: ${res.status}`);
  }
  return res.json();
}

export async function querySpeakSearch(payload) {
  const res = await fetch(`${API_BASE}/api/v1/queryspeak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `QuerySpeak failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchTelemetrySummary() {
  const res = await fetch(`${API_BASE}/api/v1/telemetry/summary`);
  if (!res.ok) throw new Error(`Failed to fetch telemetry: ${res.status}`);
  return res.json();
}

export async function simulateIncidentAndRespond(payload = {}) {
  const res = await fetch(`${API_BASE}/api/v1/incidents/simulate-and-respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Incident drill failed: ${res.status}`);
  }
  return res.json();
}
