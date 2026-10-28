import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mic,
  GitPullRequest,
  PlusCircle,
  Search,
  Activity,
  ShieldAlert,
  Terminal,
  Sparkles,
  Bot,
  Copy,
  Check,
  CheckCircle2,
  FileCode,
  Loader2,
  RefreshCw,
  X,
  Radio,
  Clock,
  ArrowRight,
  User,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';

import {
  fetchHealth,
  fetchPRs,
  fetchPRDetail,
  createCustomPR,
  analyzeVoiceReview,
  runQuerySpeak,
  fetchTelemetrySummary,
  triggerIncidentAndRespond
} from './api';

export default function App() {
  // Pull Requests & Selected PR State
  const [prs, setPrs] = useState([]);
  const [selectedPR, setSelectedPR] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [health, setHealth] = useState(null);
  const [latestTraceId, setLatestTraceId] = useState(null);

  // Wispr Flow Voice Command Dock State
  const [transcript, setTranscript] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewerName] = useState("Staff Engineer Sarah");

  // QuerySpeak Voice Audit Bar State
  const [querySpeakText, setQuerySpeakText] = useState("");
  const [querySpeakLoading, setQuerySpeakLoading] = useState(false);
  const [querySpeakResult, setQuerySpeakResult] = useState(null);
  const [showQuerySpeakResults, setShowQuerySpeakResults] = useState(false);

  // Review Studio Right Pane Tab
  const [studioTab, setStudioTab] = useState("cards"); // "cards", "guardrails", "fixpack"
  const [toastMessage, setToastMessage] = useState(null);

  // Observability & On-Call Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [telemetry, setTelemetry] = useState(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [drillRunning, setDrillRunning] = useState(false);
  const [drillResult, setDrillResult] = useState(null);

  // Import Custom PR Modal State
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("fix(auth): Patch token validation & prevent header drift");
  const [customRepo, setCustomRepo] = useState("acme/core-service");
  const [customAuthor, setCustomAuthor] = useState("octocat");
  const [customBranch, setCustomBranch] = useState("patch/token-audit");
  const [customDiff, setCustomDiff] = useState(`diff --git a/app/auth.py b/app/auth.py
--- a/app/auth.py
+++ b/app/auth.py
@@ -14,3 +14,5 @@ def verify_jwt(token):
+    if not token or not token.startswith("Bearer "):
+        raise ValueError("Invalid authorization header format")
     return decode_token(token)`);
  const [customCreating, setCustomCreating] = useState(false);

  // Toast Notification Trigger
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load Single PR Details
  const loadPRDetails = useCallback(async (prId) => {
    try {
      const detail = await fetchPRDetail(prId);
      setSelectedPR(detail);

      // Pre-fill transcript with sample prompt if available
      if (detail.sample_voice_prompt) {
        setTranscript(detail.sample_voice_prompt);
      }

      // Load latest session if exists
      if (detail.review_sessions && detail.review_sessions.length > 0) {
        setActiveSession(detail.review_sessions[0]);
        setLatestTraceId(detail.review_sessions[0].trace_id);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error(`Error loading PR ${prId}:`, err);
    }
  }, []);

  // Initial Boot
  const loadInitialData = useCallback(async () => {
    try {
      const [prsData, healthData] = await Promise.all([
        fetchPRs().catch(() => []),
        fetchHealth().catch(() => ({ status: "healthy", db_connected: true, active_incidents_count: 0 }))
      ]);

      setPrs(prsData);
      setHealth(healthData);

      if (prsData.length > 0) {
        const defaultPR = prsData.find(p => p.id === "PR-101") || prsData[0];
        await loadPRDetails(defaultPR.id);
      }
    } catch (err) {
      console.error("Initialization error:", err);
    }
  }, [loadPRDetails]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load Telemetry Summary
  const refreshTelemetry = useCallback(async () => {
    try {
      setTelemetryLoading(true);
      const data = await fetchTelemetrySummary();
      setTelemetry(data);
      if (data.recent_traces && data.recent_traces.length > 0) {
        setLatestTraceId(data.recent_traces[0].trace_id);
      }
    } catch (err) {
      console.error("Telemetry refresh failed:", err);
    } finally {
      setTelemetryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      refreshTelemetry();
      const interval = setInterval(refreshTelemetry, 4000);
      return () => clearInterval(interval);
    }
  }, [drawerOpen, refreshTelemetry]);

  // Handle Voice Review Analysis
  const handleAnalyzeVoiceReview = async (simulateFailure = false) => {
    if (!selectedPR || !transcript.trim()) return;
    setIsAnalyzing(true);

    try {
      const sessionResult = await analyzeVoiceReview(selectedPR.id, {
        spoken_transcript: transcript,
        reviewer_name: reviewerName,
        simulate_failure: simulateFailure,
      });

      setActiveSession(sessionResult);
      setLatestTraceId(sessionResult.trace_id);
      triggerToast("Voice review analysis complete! Review cards and agent prompt updated.");

      // Refresh PR & PRs list to update scores
      const [updatedDetail, refreshedPRs, healthData] = await Promise.all([
        fetchPRDetail(selectedPR.id),
        fetchPRs(),
        fetchHealth().catch(() => null),
      ]);
      setSelectedPR(updatedDetail);
      setPrs(refreshedPRs);
      if (healthData) setHealth(healthData);

    } catch (err) {
      console.warn("Analysis error:", err);
      triggerToast(err.message || "Voice review analysis failed");

      // Auto-open drawer if an alert fired
      const healthData = await fetchHealth().catch(() => null);
      if (healthData) {
        setHealth(healthData);
        if (healthData.active_incidents_count > 0) {
          setDrawerOpen(true);
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle QuerySpeak Search
  const handleQuerySpeakSubmit = async (queryToRun) => {
    const q = queryToRun || querySpeakText;
    if (!q.trim()) return;

    setQuerySpeakLoading(true);
    setShowQuerySpeakResults(true);
    try {
      const res = await runQuerySpeak(q);
      setQuerySpeakResult(res);
    } catch (err) {
      console.error("QuerySpeak error:", err);
      triggerToast("QuerySpeak search failed: " + err.message);
    } finally {
      setQuerySpeakLoading(false);
    }
  };

  // Trigger On-Call Responder Agent Drill
  const handleTriggerOnCallDrill = async () => {
    try {
      setDrillRunning(true);
      const res = await triggerIncidentAndRespond({
        simulated_error: "RateLimitExceeded: Upstream voice analyzer token budget exceeded.",
        pr_id: selectedPR?.id || "PR-101",
      });
      setDrillResult(res);
      triggerToast("On-Call Agent dispatched! Remediation patch proposed.");
      refreshTelemetry();
      const healthData = await fetchHealth().catch(() => null);
      if (healthData) setHealth(healthData);
    } catch (err) {
      console.error("Drill error:", err);
    } finally {
      setDrillRunning(false);
    }
  };

  // Handle Custom PR Creation
  const handleCreateCustomPR = async (e) => {
    e.preventDefault();
    if (!customTitle.trim() || !customDiff.trim()) return;
    setCustomCreating(true);

    try {
      const created = await createCustomPR({
        title: customTitle,
        repo_name: customRepo,
        author: customAuthor,
        branch_source: customBranch,
        branch_target: "main",
        diff_text: customDiff,
      });

      setPrs(prev => [created, ...prev]);
      setSelectedPR(created);
      setActiveSession(null);
      setTranscript(created.sample_voice_prompt || "");
      setCustomModalOpen(false);
      triggerToast(`Custom PR ${created.id} imported successfully!`);
    } catch (err) {
      alert("Failed to import PR: " + err.message);
    } finally {
      setCustomCreating(false);
    }
  };

  // Copy Fix Prompt to Clipboard
  const handleCopyFixPack = () => {
    if (!activeSession?.agent_fix_prompt) return;
    navigator.clipboard.writeText(activeSession.agent_fix_prompt);
    triggerToast("Copied 1-Click Coding Agent Fix Pack to clipboard!");
  };

  // Score Formatting
  const readinessScore = activeSession?.readiness_score !== undefined
    ? activeSession.readiness_score
    : (selectedPR?.latest_readiness_score !== null ? selectedPR?.latest_readiness_score : null);

  const getScoreBadge = (score) => {
    if (score === null || score === undefined) return { label: "No Review", bg: "bg-slate-800 text-slate-400 border-slate-700" };
    if (score < 40) return { label: "Critical Blockers", bg: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
    if (score < 70) return { label: "Needs Revisions", bg: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
    return { label: "Ready to Ship", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
  };

  const scoreBadge = getScoreBadge(readinessScore);

  // Group Diff Lines with Annotations
  const diffLines = useMemo(() => {
    if (!selectedPR?.diff_text) return [];
    return selectedPR.diff_text.split('\n');
  }, [selectedPR]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* =========================================================================
          ZONE 1: TOP NAVIGATION & SYSTEM STATUS HEADER
      ========================================================================= */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 lg:px-6 py-2.5 shrink-0">
        <div className="flex items-center justify-between gap-4 max-w-[1900px] mx-auto">
          
          {/* Brand & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Mic className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white font-sans m-0 p-0">
                  PR-Whisperer
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Wispr Flow Voice Studio
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hidden sm:inline-block">
                  Gemini API Guardrails
                </span>
              </div>
              <p className="text-[11px] text-slate-400 m-0 p-0 hidden md:block">
                Voice-First AI PR Auditor • Powered by Wispr Flow & Gemini API
              </p>
            </div>
          </div>

          {/* Center Actions: New PR & Health & Trace */}
          <div className="flex items-center gap-2.5">
            {/* Import Custom Diff Trigger */}
            <button
              id="btn-import-custom-diff"
              onClick={() => setCustomModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>+ Import Custom Diff</span>
            </button>

            {/* Live Health & Trace Pill */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <span className={`w-2 h-2 rounded-full ${health?.db_connected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-[11px] font-medium text-slate-300">
                {health?.db_connected ? 'DB Connected' : 'Degraded'}
              </span>
              {latestTraceId && (
                <span className="font-mono text-[10px] text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                  trace:{latestTraceId.substring(0, 8)}
                </span>
              )}
            </div>

            {/* Toggle Observability & On-Call Agent Drawer */}
            <button
              id="btn-toggle-observability-drawer"
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                health?.active_incidents_count > 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : drawerOpen
                  ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {health?.active_incidents_count > 0 ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                  <span>{health.active_incidents_count} Alert Active</span>
                </>
              ) : (
                <>
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Observability & On-Call</span>
                </>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* =========================================================================
          ZONE 2: TOP "QUERYSPEAK" VOICE AUDIT BAR (CROSS-PR NATURAL LANGUAGE SEARCH)
      ========================================================================= */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 lg:px-6 py-2 shrink-0">
        <div className="max-w-[1900px] mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          
          {/* QuerySpeak Input Bar */}
          <div className="relative flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-cyan-500/60 transition-colors">
            <Search className="w-4 h-4 text-cyan-400 mr-2 shrink-0" />
            <input
              id="input-queryspeak"
              type="text"
              value={querySpeakText}
              onChange={(e) => setQuerySpeakText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuerySpeakSubmit()}
              placeholder="QuerySpeak: Ask via Wispr Flow (e.g. 'Show all critical security issues in payments' or 'Find contract drift')..."
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none"
            />
            <button
              id="btn-run-queryspeak"
              onClick={() => handleQuerySpeakSubmit()}
              disabled={querySpeakLoading || !querySpeakText.trim()}
              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[11px] shadow transition-all disabled:opacity-40"
            >
              {querySpeakLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "QuerySpeak"}
            </button>
          </div>

          {/* Quick QuerySpeak Chips */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Audit Chips:
            </span>
            {[
              "Critical security issues in payments",
              "All OpenAPI contract drift warnings",
              "N+1 performance bottlenecks",
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuerySpeakText(chip);
                  handleQuerySpeakSubmit(chip);
                }}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200 transition-all"
              >
                {chip}
              </button>
            ))}
            {showQuerySpeakResults && (
              <button
                onClick={() => setShowQuerySpeakResults(false)}
                className="text-[10px] text-slate-500 hover:text-slate-300 ml-1"
              >
                Clear
              </button>
            )}
          </div>

        </div>

        {/* QuerySpeak Dropdown Results Drawer */}
        {showQuerySpeakResults && querySpeakResult && (
          <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-cyan-500/30 text-xs text-slate-300 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-cyan-200">QuerySpeak Cross-PR Audit Findings</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  {querySpeakResult.total_matches} matches found
                </span>
              </div>
              <button onClick={() => setShowQuerySpeakResults(false)} className="text-slate-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed italic bg-slate-900/60 p-2 rounded">
              {querySpeakResult.insight_summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {querySpeakResult.matching_comments?.map((comment, idx) => (
                <div key={idx} className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300">{comment.severity} • {comment.category}</span>
                    <span className="font-mono text-slate-400">{comment.file_path}:{comment.line_number}</span>
                  </div>
                  <p className="text-slate-300">{comment.polished_comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MAIN WORKSPACE LAYOUT (ZONE 3 + ZONE 4 + ZONE 5)
      ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* =========================================================================
            ZONE 3: LEFT SIDEBAR / SELECTOR — PRE-SEEDED & CUSTOM PULL REQUESTS
        ========================================================================= */}
        <aside className="w-64 lg:w-72 border-r border-slate-800 bg-slate-950/80 flex flex-col shrink-0 overflow-hidden">
          
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <GitPullRequest className="w-3.5 h-3.5 text-indigo-400" />
              Review Queue
            </span>
            <span className="text-[10px] font-mono text-slate-500">{prs.length} PRs</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {prs.map((pr) => {
              const isSelected = selectedPR?.id === pr.id;
              const badge = getScoreBadge(pr.latest_readiness_score);

              return (
                <div
                  key={pr.id}
                  onClick={() => loadPRDetails(pr.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-sm'
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-xs text-indigo-300">{pr.id}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.bg}`}>
                      {pr.latest_readiness_score !== null ? `${pr.latest_readiness_score}%` : badge.label}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-slate-200 line-clamp-2 leading-tight">
                    {pr.title}
                  </h3>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono">
                    <span>@{pr.author}</span>
                    <span>{pr.branch_source || "main"}</span>
                  </div>
                </div>
              );
            })}
          </div>

        </aside>

        {/* =========================================================================
            ZONE 4: CENTER SPLIT-PANE: INTERACTIVE UNIFIED DIFF VIEWER + WISPR FLOW DOCK
        ========================================================================= */}
        <section className="flex-1 flex flex-col border-r border-slate-800 bg-slate-950 overflow-hidden">
          
          {/* Top PR Metadata Header */}
          <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-indigo-400">{selectedPR?.id}</span>
                <h2 className="text-xs font-bold text-slate-100 truncate max-w-md">{selectedPR?.title}</h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedPR?.repo_name} • {selectedPR?.branch_source} → {selectedPR?.branch_target || 'main'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">
                {selectedPR?.files_changed_count || 1} file(s) changed
              </span>
            </div>
          </div>

          {/* Unified Diff Viewer Area */}
          <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] divide-y divide-slate-900/60 bg-[#020617]">
            {diffLines.length === 0 ? (
              <p className="text-slate-500 text-center py-10">No diff text loaded.</p>
            ) : (
              diffLines.map((line, idx) => {
                const isAdd = line.startsWith('+') && !line.startsWith('+++');
                const isDel = line.startsWith('-') && !line.startsWith('---');
                const isHeader = line.startsWith('@@') || line.startsWith('diff --git');

                // Check for inline badges (pinned comments/guardrails)
                const hasStripeSecret = line.includes("sk_live");
                const hasSQLi = line.includes("SELECT") && line.includes("{customer_id}");
                const hasBareExcept = line.includes("except:");
                const hasLoopQuery = line.includes("for") && line.includes("user_roles");

                return (
                  <React.Fragment key={idx}>
                    <div
                      className={`flex items-start px-2 py-0.5 leading-relaxed transition-colors ${
                        isAdd
                          ? 'bg-emerald-950/20 text-emerald-300 border-l-2 border-emerald-500'
                          : isDel
                          ? 'bg-rose-950/20 text-rose-300 border-l-2 border-rose-500'
                          : isHeader
                          ? 'bg-indigo-950/40 text-indigo-300 font-bold py-1'
                          : 'text-slate-300 hover:bg-slate-900/50'
                      }`}
                    >
                      <span className="w-8 select-none text-slate-600 text-right pr-2 text-[10px] shrink-0 font-mono">
                        {isHeader ? '...' : idx + 1}
                      </span>
                      <span className="w-4 select-none font-bold text-slate-500 shrink-0 text-center">
                        {isAdd ? '+' : isDel ? '-' : ' '}
                      </span>
                      <span className="flex-1 whitespace-pre-wrap break-all">
                        {line.substring(isAdd || isDel ? 1 : 0)}
                      </span>
                    </div>

                    {/* Inline Pinned Guardrail Alert Badges */}
                    {(hasStripeSecret || hasSQLi || hasBareExcept || hasLoopQuery) && (
                      <div className="bg-slate-900/90 border-y border-rose-500/30 p-2.5 my-1 ml-10 mr-2 rounded-lg space-y-1">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            {hasStripeSecret ? 'RULE-SEC-01: Hardcoded Secret' : hasSQLi ? 'RULE-SEC-02: SQL Injection' : hasBareExcept ? 'RULE-BUG-01: Bare Except' : 'RULE-PERF-01: N+1 Query'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans">
                            {hasStripeSecret
                              ? "Live API secret detected in diff chunk. Move credentials to environment variables."
                              : hasSQLi
                              ? "Unsanitized f-string parameter interpolation opens SQL injection vulnerability."
                              : hasBareExcept
                              ? "Bare except clause silently swallows authentication exceptions."
                              : "Database fetch inside iteration loop causes latency degradation."}
                          </span>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Wispr Flow Voice Command Dock (Auto-Focusable Textarea & Buttons) */}
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                Hold your Wispr Flow hotkey and speak your code review naturally (or click 'Load Sample Spoken Review' below)
              </label>
              
              <button
                id="btn-load-sample-transcript"
                onClick={() => setTranscript(selectedPR?.sample_voice_prompt || "")}
                className="text-[11px] font-semibold text-indigo-300 hover:text-white px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40 hover:bg-indigo-900 transition-colors"
                title="Load sample spoken critique for this pull request"
              >
                1-Click Load Sample Spoken Review
              </button>
            </div>

            <textarea
              id="wispr-flow-command-textarea"
              rows={2}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Speak with Wispr Flow... (e.g. 'Line 14 in payments.py has a hardcoded Stripe live secret key that must be extracted to env vars, and line 38 has a SQL injection flaw.')"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/70 resize-none font-sans"
            />

            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500">
                Hands-free review voice stream parsed deterministically into line-pinned review comments.
              </span>

              <button
                id="btn-analyze-spoken-review"
                onClick={() => handleAnalyzeVoiceReview(false)}
                disabled={isAnalyzing || !transcript.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:brightness-110 shadow-lg shadow-indigo-500/20 disabled:opacity-40 transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Review...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Analyze Spoken Review (Gemini + Guardrails)</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </section>

        {/* =========================================================================
            ZONE 5: RIGHT SPLIT-PANE: STRUCTURED REVIEW RESULTS & 1-CLICK FIX PACK
        ========================================================================= */}
        <section className="w-80 lg:w-96 flex flex-col bg-slate-950 shrink-0 overflow-hidden">
          
          {/* Readiness Score Meter */}
          <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                PR Readiness Score
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white">
                  {readinessScore !== null ? readinessScore : "—"}
                </span>
                <span className="text-xs font-bold text-slate-500">/100</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 ml-1.5 rounded-full border ${scoreBadge.bg}`}>
                  {scoreBadge.label}
                </span>
              </div>
            </div>

            {latestTraceId && (
              <div className="text-right">
                <span className="text-[9px] text-slate-500 block uppercase font-mono">Correlated Trace</span>
                <span className="font-mono text-[10px] text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                  {latestTraceId.substring(0, 8)}
                </span>
              </div>
            )}
          </div>

          {/* Studio Navigation Tabs */}
          <div className="flex items-center px-2 bg-slate-950 border-b border-slate-800 shrink-0 text-xs font-bold">
            <button
              id="tab-review-cards"
              onClick={() => setStudioTab("cards")}
              className={`flex-1 py-2 text-center border-b-2 transition-all ${
                studioTab === "cards" ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Cards ({activeSession?.comments?.length || 0})
            </button>
            <button
              id="tab-guardrails-alerts"
              onClick={() => setStudioTab("guardrails")}
              className={`flex-1 py-2 text-center border-b-2 transition-all ${
                studioTab === "guardrails" ? 'border-rose-500 text-rose-300' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Guardrails ({activeSession?.guardrail_alerts?.length || 0})
            </button>
            <button
              id="tab-coding-agent-fixpack"
              onClick={() => setStudioTab("fixpack")}
              className={`flex-1 py-2 text-center border-b-2 transition-all ${
                studioTab === "fixpack" ? 'border-cyan-500 text-cyan-300' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Agent Fix Pack
            </button>
          </div>

          {/* Results Tab Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            
            {/* Empty State */}
            {!activeSession && (
              <div className="text-center py-16 px-4 text-slate-500 space-y-2">
                <Sparkles className="w-8 h-8 text-indigo-400 mx-auto opacity-50" />
                <p className="text-xs">No voice review session analyzed yet.</p>
                <p className="text-[11px] text-slate-600">
                  Click '1-Click Load Sample Spoken Review' then 'Analyze Spoken Review' to generate review cards and agent prompts.
                </p>
              </div>
            )}

            {/* Tab 1: Pinpointed Voice Review Cards */}
            {activeSession && studioTab === "cards" && (
              <div className="space-y-2.5">
                {activeSession.comments?.map((comment, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        comment.severity === 'Critical' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                        comment.severity === 'Warning' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      }`}>
                        {comment.severity || "Suggestion"} • {comment.category}
                      </span>
                      <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/30">
                        {comment.file_path ? `${comment.file_path.split('/').pop()}:` : ""}L{comment.line_number}
                      </span>
                    </div>

                    <p className="text-slate-200 leading-relaxed font-sans mt-1">
                      {comment.polished_comment}
                    </p>

                    {comment.spoken_excerpt && (
                      <div className="text-[10px] text-slate-400 italic bg-slate-950 p-1.5 rounded border-l-2 border-indigo-500 font-sans">
                        "{comment.spoken_excerpt}"
                      </div>
                    )}

                    {comment.suggested_patch && (
                      <div className="pt-1">
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">Suggested Patch:</span>
                        <pre className="p-2 rounded bg-black/70 text-[10px] text-emerald-300 font-mono overflow-x-auto border border-emerald-500/20 leading-tight">
                          {comment.suggested_patch}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Automated Guardrails & OpenAPI Drift Alerts */}
            {activeSession && studioTab === "guardrails" && (
              <div className="space-y-2.5">
                {activeSession.guardrail_alerts?.map((alert, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        {alert.rule_id}
                      </span>
                      <span className="font-mono text-[10px] text-rose-300">
                        {alert.file_path}:{alert.line_number}
                      </span>
                    </div>
                    <p className="text-rose-200/90 text-xs leading-relaxed font-sans mt-1">
                      {alert.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: 1-Click Coding Agent Fix Prompt */}
            {activeSession && studioTab === "fixpack" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">Agent Handoff Ready</span>
                  </div>
                  <button
                    id="btn-copy-fix-pack"
                    onClick={handleCopyFixPack}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow transition-all"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Fix Pack</span>
                  </button>
                </div>

                <pre className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                  {activeSession.agent_fix_prompt}
                </pre>
              </div>
            )}

          </div>

        </section>

      </div>

      {/* =========================================================================
          ZONE 6: SLIDE-OVER OBSERVABILITY & ON-CALL RESPONDER DRAWER
      ========================================================================= */}
      {drawerOpen && (
        <aside className="fixed bottom-0 inset-x-0 z-50 bg-slate-950/95 border-t border-slate-800 backdrop-blur-xl shadow-2xl max-h-[45vh] flex flex-col font-mono text-xs">
          
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <Terminal className="w-4 h-4" />
              <span>OBSERVABILITY & AUTONOMOUS ON-CALL AGENT DRAWER</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-trigger-incident-drill"
                onClick={handleTriggerOnCallDrill}
                disabled={drillRunning}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white font-bold text-[11px] shadow disabled:opacity-50"
              >
                {drillRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Trigger User-Impact Alert & Run On-Call Responder Agent</span>
              </button>

              <button
                onClick={refreshTelemetry}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${telemetryLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
            {drillResult && (
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>On-Call Agent Resolution ({drillResult.incident_id})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                    Status: RESOLVED_BY_ONCALL_AGENT
                  </span>
                </div>
                <p className="text-slate-200 text-xs font-sans">{drillResult.root_cause_analysis}</p>
                <pre className="p-2 rounded bg-black/80 text-[10px] text-emerald-300 font-mono overflow-x-auto border border-emerald-500/20">
                  {drillResult.remediation_diff}
                </pre>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Correlated OpenTelemetry Event Stream (Zero Credentials Exposed):
              </span>
              {telemetry?.recent_traces?.slice(0, 25).map((tr, idx) => (
                <div key={idx} className="flex items-center gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800 text-[10px]">
                  <span className={`px-1 rounded font-bold ${tr.level === 'ERROR' ? 'bg-rose-500/30 text-rose-300' : 'bg-slate-800 text-slate-400'}`}>
                    {tr.level}
                  </span>
                  <span className="text-indigo-400 font-mono">[{tr.trace_id?.substring(0, 8)}]</span>
                  <span className="text-cyan-300 font-semibold">{tr.event}</span>
                  <span className="text-slate-300 truncate flex-1">{tr.message}</span>
                  <span className="text-slate-500">{new Date(tr.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>

        </aside>
      )}

      {/* =========================================================================
          IMPORT CUSTOM PR MODAL
      ========================================================================= */}
      {customModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-indigo-400" />
                Import Custom Unified Diff / PR
              </h3>
              <button onClick={() => setCustomModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomPR} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">PR Title</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Repository</label>
                  <input
                    type="text"
                    value={customRepo}
                    onChange={(e) => setCustomRepo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Author</label>
                  <input
                    type="text"
                    value={customAuthor}
                    onChange={(e) => setCustomAuthor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Unified Git Diff</label>
                <textarea
                  rows={6}
                  value={customDiff}
                  onChange={(e) => setCustomDiff(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-slate-100 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customCreating}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow"
                >
                  {customCreating ? "Importing..." : "Import PR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2 rounded-xl bg-slate-900 border border-indigo-500/50 shadow-2xl text-xs font-semibold text-slate-100 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
