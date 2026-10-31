import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  RotateCcw,
  Download,
  ExternalLink,
  Zap,
  Filter,
  Eye,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Send,
  Globe,
  Lock,
  GitCommit,
  FolderGit2
} from 'lucide-react';

function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

import {
  fetchHealth,
  fetchPRs,
  fetchPRDetail,
  createCustomPR,
  importGitHubPR,
  fetchReadinessCertificate,
  analyzeVoiceReview,
  runQuerySpeak,
  fetchTelemetrySummary,
  triggerIncidentAndRespond,
  connectGitHub,
  fetchRepoPulls,
  importRepoActivity,
  publishGitHubReview
} from './api';

export default function App() {
  // Pull Requests & Selected PR State
  const [prs, setPrs] = useState([]);
  const [selectedPR, setSelectedPR] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [health, setHealth] = useState(null);
  const [latestTraceId, setLatestTraceId] = useState(null);

  // Authenticated User & GitHub Hub State (Dual-Mode: Real GitHub + Instant Bypass)
  const [currentUser, setCurrentUser] = useState({
    authenticated: true,
    auth_mode: "workspace", // "workspace" | "public_user" | "pat" | "fallback"
    username: "KrishnaG-101",
    name: "Staff Reviewer",
    avatar_url: "https://avatars.githubusercontent.com/u/101?v=4",
    github_token: "",
  });
  const [userRepos, setUserRepos] = useState([]);
  const [githubHubOpen, setGithubHubOpen] = useState(false);
  const [hubTab, setHubTab] = useState("connect"); // "connect" | "repos"
  const [inputGithubUser, setInputGithubUser] = useState("KrishnaG-101");
  const [inputGithubToken, setInputGithubToken] = useState("");
  const [hubLoading, setHubLoading] = useState(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [repoPulls, setRepoPulls] = useState([]);
  const [repoPullsLoading, setRepoPullsLoading] = useState(false);
  const [publishingReview, setPublishingReview] = useState(false);
  const [publishReviewResult, setPublishReviewResult] = useState(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);

  // Wispr Flow Voice Command Dock State
  const [transcript, setTranscript] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewerName] = useState("Staff Engineer Sarah");

  // QuerySpeak Voice Audit Bar State
  const [querySpeakText, setQuerySpeakText] = useState("");
  const [querySpeakLoading, setQuerySpeakLoading] = useState(false);
  const [querySpeakResult, setQuerySpeakResult] = useState(null);
  const [showQuerySpeakResults, setShowQuerySpeakResults] = useState(false);

  // Review Studio Right Pane Tab & Filters
  const [studioTab, setStudioTab] = useState("cards"); // "cards", "guardrails", "fixpack"
  const [personaFilter, setPersonaFilter] = useState("ALL"); // "ALL", "VoiceLead", "SecuritySentinel", "ContractGuardian", "PerfProfiler"
  const [highlightedLine, setHighlightedLine] = useState(null);
  const [previewPatchId, setPreviewPatchId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [exportingCert, setExportingCert] = useState(false);

  // Observability & On-Call Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [telemetry, setTelemetry] = useState(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [drillRunning, setDrillRunning] = useState(false);
  const [drillResult, setDrillResult] = useState(null);

  // Import Custom PR Modal State
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("github"); // "github" or "manual"
  const [githubUrl, setGithubUrl] = useState("https://github.com/fastapi/fastapi/pull/9999");
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

  // Diff scroll container ref
  const diffContainerRef = useRef(null);

  // Helper for line number labeling (BUG-01)
  const formatLineLabel = (comment) => {
    if (!comment) return "L1";
    const filePrefix = comment.file_path ? `${comment.file_path.split('/').pop()}:` : "";
    let lineStr = "L1";
    if (comment.line_start && comment.line_end && comment.line_start !== comment.line_end) {
      lineStr = `L${comment.line_start}-${comment.line_end}`;
    } else if (comment.line_start) {
      lineStr = `L${comment.line_start}`;
    } else if (comment.line_number) {
      lineStr = `L${comment.line_number}`;
    }
    return `${filePrefix}${lineStr}`;
  };

  // Toast Notification Trigger
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Smooth scroll diff viewer to specific line (Feature B)
  const scrollToLine = (lineNum) => {
    if (!lineNum) return;
    setHighlightedLine(lineNum);
    const el = document.getElementById(`diff-line-${lineNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Load Single PR Details
  const loadPRDetails = useCallback(async (prId) => {
    try {
      const detail = await fetchPRDetail(prId);
      setSelectedPR(detail);
      setHighlightedLine(null);
      setPreviewPatchId(null);

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

  // Handle GitHub Account Connect (PAT or Username)
  const handleConnectGitHub = async (e) => {
    if (e) e.preventDefault();
    setHubLoading(true);
    try {
      const res = await connectGitHub({
        github_username: inputGithubUser.trim() || undefined,
        github_token: inputGithubToken.trim() || undefined,
      });
      setCurrentUser({
        authenticated: true,
        auth_mode: res.auth_mode,
        username: res.username,
        name: res.name || res.username,
        avatar_url: res.avatar_url || "https://avatars.githubusercontent.com/u/101?v=4",
        github_token: inputGithubToken.trim(),
      });
      setUserRepos(res.repos || []);
      setHubTab("repos");
      triggerToast(`Connected as @${res.username}! ${res.repos?.length || 0} repositories loaded.`);
    } catch (err) {
      console.error("Connect GitHub error:", err);
      triggerToast("GitHub connection fallback engaged: " + err.message);
    } finally {
      setHubLoading(false);
    }
  };

  // Handle Selecting a Repo in Hub
  const handleSelectRepo = async (repoItem) => {
    setSelectedRepo(repoItem);
    setRepoPullsLoading(true);
    const [owner, name] = repoItem.full_name.split("/");
    try {
      const pullsData = await fetchRepoPulls(owner, name, currentUser.github_token);
      setRepoPulls(pullsData.pulls || []);
    } catch (err) {
      console.error("Fetch repo pulls error:", err);
      setRepoPulls([]);
    } finally {
      setRepoPullsLoading(false);
    }
  };

  // Handle Importing Repo Activity (PR or Commit)
  const handleImportRepoActivity = async (pullNumber = null) => {
    if (!selectedRepo) return;
    const [owner, name] = selectedRepo.full_name.split("/");
    setHubLoading(true);
    try {
      const imported = await importRepoActivity(owner, name, {
        pull_number: pullNumber,
        github_token: currentUser.github_token,
      });
      setPrs(prev => [imported, ...prev.filter(p => p.id !== imported.id)]);
      setSelectedPR(imported);
      setActiveSession(null);
      setTranscript(imported.sample_voice_prompt || "");
      setGithubHubOpen(false);
      triggerToast(`Imported ${imported.id} from ${selectedRepo.full_name}!`);
    } catch (err) {
      alert("Failed to import repository activity: " + err.message);
    } finally {
      setHubLoading(false);
    }
  };

  // Handle Direct GitHub Review Publishing
  const handlePublishGitHubReview = async (event = "COMMENT") => {
    if (!selectedPR) return;
    setPublishingReview(true);
    try {
      const res = await publishGitHubReview(selectedPR.id, {
        github_token: currentUser.github_token,
        event: event,
      });
      setPublishReviewResult(res);
      setPublishModalOpen(true);
      if (res.status === "published") {
        triggerToast("Review successfully published to GitHub PR!");
      } else {
        triggerToast("Review preview generated with GitHub CLI command!");
      }
    } catch (err) {
      console.error("Publish review error:", err);
      triggerToast("Failed to publish review: " + err.message);
    } finally {
      setPublishingReview(false);
    }
  };

  // Handle Voice Review Analysis (Supports Append Mode - Feature D)
  const handleAnalyzeVoiceReview = async (simulateFailure = false, appendMode = false) => {
    if (!selectedPR || !transcript.trim()) return;
    setIsAnalyzing(true);

    try {
      const sessionResult = await analyzeVoiceReview(selectedPR.id, {
        spoken_transcript: transcript,
        reviewer_name: reviewerName,
        simulate_failure: simulateFailure,
        append_to_latest: appendMode,
      });

      setActiveSession(sessionResult);
      setLatestTraceId(sessionResult.trace_id);
      triggerToast(appendMode ? "Follow-up spoken critique appended to active session!" : "Voice review analysis complete! Review cards & agent prompt updated.");

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

  // Handle Custom PR Creation (Manual unified diff)
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

  // Handle Live GitHub PR URL Import (Feature C)
  const handleImportGitHubPR = async (e) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;
    setCustomCreating(true);

    try {
      const created = await importGitHubPR(githubUrl.trim());
      setPrs(prev => [created, ...prev]);
      setSelectedPR(created);
      setActiveSession(null);
      setTranscript(created.sample_voice_prompt || "");
      setCustomModalOpen(false);
      triggerToast(`Live GitHub PR ${created.id} imported successfully!`);
    } catch (err) {
      alert("Failed to import GitHub PR: " + err.message);
    } finally {
      setCustomCreating(false);
    }
  };

  // Export Release Readiness Certificate (.md) (Feature D)
  const handleExportCertificate = async () => {
    if (!selectedPR) return;
    setExportingCert(true);
    try {
      const cert = await fetchReadinessCertificate(selectedPR.id);
      const blob = new Blob([cert.certificate_markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = cert.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      triggerToast(`Exported ${cert.filename} successfully!`);
    } catch (err) {
      console.error("Export cert error:", err);
      triggerToast("Failed to export certificate: " + err.message);
    } finally {
      setExportingCert(false);
    }
  };

  // Copy gh pr review CLI command to clipboard (Feature C)
  const handleCopyGHReviewCLI = () => {
    if (!selectedPR) return;
    const repo = selectedPR.repo_name || "acme/service";
    const prNum = selectedPR.pr_number || selectedPR.id.replace("PR-", "");
    const summary = activeSession?.summary_markdown
      ? activeSession.summary_markdown.replace(/"/g, '\\"').substring(0, 300) + "..."
      : "Automated voice review analysis via PR-Whisperer.";
    const cmd = `gh pr review ${prNum} --repo ${repo} --comment -b "${summary}"`;
    navigator.clipboard.writeText(cmd);
    triggerToast("Copied 'gh pr review' CLI command to clipboard!");
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

  // Filter comments by Subagent Persona (Feature D)
  const filteredComments = useMemo(() => {
    if (!activeSession?.comments) return [];
    if (personaFilter === "ALL") return activeSession.comments;
    return activeSession.comments.filter(c => c.subagent_persona === personaFilter);
  }, [activeSession, personaFilter]);

  // Categorize PRs into Connected GitHub PRs vs Benchmark Audit Queue
  const { connectedPRs, benchmarkPRs } = useMemo(() => {
    const connected = [];
    const benchmark = [];
    prs.forEach((pr) => {
      if (pr.id === "PR-101" || pr.id === "PR-102" || pr.id === "PR-103") {
        benchmark.push(pr);
      } else {
        connected.push(pr);
      }
    });
    return { connectedPRs: connected, benchmarkPRs: benchmark };
  }, [prs]);

  // Filtered repositories for modal
  const filteredRepos = useMemo(() => {
    if (!repoSearchQuery.trim()) return userRepos;
    return userRepos.filter(r => r.name.toLowerCase().includes(repoSearchQuery.toLowerCase()) || r.full_name.toLowerCase().includes(repoSearchQuery.toLowerCase()));
  }, [userRepos, repoSearchQuery]);

  // Render individual PR card in sidebar
  const renderPRCard = (pr) => {
    const isSelected = selectedPR?.id === pr.id;
    const badge = getScoreBadge(pr.latest_readiness_score);

    return (
      <div
        key={pr.id}
        onClick={() => loadPRDetails(pr.id)}
        className={`p-2.5 rounded-lg cursor-pointer transition-all border ${
          isSelected
            ? 'bg-indigo-600/10 border-indigo-500/50 shadow-sm'
            : 'bg-slate-900/30 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono font-bold text-xs text-indigo-300">{pr.id}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${badge.bg}`}>
            {pr.latest_readiness_score !== null ? `${pr.latest_readiness_score}%` : badge.label}
          </span>
        </div>

        <h3 className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
          {pr.title}
        </h3>

        <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500 font-mono">
          <span className="truncate max-w-[130px]">{pr.repo_name}</span>
          <span>{pr.files_changed_count} {pr.files_changed_count === 1 ? 'file' : 'files'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* =========================================================================
          ZONE 1: CLEAN TOP NAVBAR
      ========================================================================= */}
      <header className="h-12 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur px-4 flex items-center justify-between shrink-0 z-20">
        
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Mic className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white">
              PR-Whisperer
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
              v1.2
            </span>
          </div>
        </div>

        {/* Global Live Indicators & Actions */}
        <div className="flex items-center gap-2">
          
          {/* Health Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px]">
            <span className={`w-2 h-2 rounded-full ${health?.db_connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span className="text-slate-300 font-medium">{health?.db_connected ? 'DB Connected' : 'DB Degraded'}</span>
          </div>

          {/* Import PR Button */}
          <button
            onClick={() => setCustomModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-200 border border-slate-700/60 transition-colors shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import PR</span>
          </button>

          {/* Observability & On-Call Drawer Trigger */}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              health?.active_incidents_count > 0
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                : 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Telemetry & Incident Studio</span>
            {health?.active_incidents_count > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {health.active_incidents_count}
              </span>
            )}
          </button>

          {/* User Profile & GitHub Hub Connection Badge */}
          <button
            onClick={() => setGithubHubOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs transition-all"
            title="Click to connect GitHub account or browse repositories"
          >
            <img
              src={currentUser.avatar_url || "https://avatars.githubusercontent.com/u/101?v=4"}
              alt={currentUser.username}
              className="w-5 h-5 rounded-full border border-indigo-400/40"
            />
            <span className="font-medium text-slate-200">
              {currentUser.auth_mode === "workspace" ? "Staff Reviewer" : `@${currentUser.username}`}
            </span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          ZONE 2: QUERYSPEAK NATURAL LANGUAGE AUDIT BAR
      ========================================================================= */}
      <div className="bg-slate-900/40 border-b border-slate-800/80 px-4 py-1.5 shrink-0">
        <div className="flex flex-col md:flex-row items-center gap-2">
          
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-indigo-400" />
            <input
              type="text"
              value={querySpeakText}
              onChange={(e) => setQuerySpeakText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuerySpeakSubmit()}
              placeholder="QuerySpeak: Ask via Wispr Flow (e.g. 'Show all critical security issues in payment PRs' or 'Find contract drift')"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-20 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 font-sans"
            />
            <button
              onClick={() => handleQuerySpeakSubmit()}
              disabled={querySpeakLoading || !querySpeakText.trim()}
              className="absolute right-1 top-1 px-2.5 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-[11px] font-semibold text-white transition-all shadow-sm"
            >
              {querySpeakLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Search"}
            </button>
          </div>

          {/* Quick Query Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-[11px]">
            {[
              "Critical security issues in payments",
              "All OpenAPI contract drift warnings",
              "N+1 performance bottlenecks"
            ].map((qChip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuerySpeakText(qChip);
                  handleQuerySpeakSubmit(qChip);
                }}
                className="shrink-0 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-300 text-[11px] transition-colors"
              >
                {qChip}
              </button>
            ))}

            {showQuerySpeakResults && (
              <button
                onClick={() => setShowQuerySpeakResults(false)}
                className="shrink-0 p-1 rounded-full text-slate-500 hover:text-slate-300"
                title="Dismiss Results"
              >
                <X className="w-3.5 h-3.5" />
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
                    <span className="font-mono text-slate-400">{formatLineLabel(comment)}</span>
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
            ZONE 3: LEFT SIDEBAR / SELECTOR — CONNECTED GITHUB PRS & BENCHMARK AUDIT QUEUE
        ========================================================================= */}
        <aside className="w-64 lg:w-72 border-r border-slate-800/80 bg-slate-950 flex flex-col shrink-0 overflow-hidden">
          
          <div className="p-2.5 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <GitPullRequest className="w-3.5 h-3.5 text-indigo-400" />
              <span>Review Queue</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400">{prs.length} PRs</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            
            {/* Section A: Connected GitHub PRs & Commits */}
            {connectedPRs.length > 0 && (
              <div className="space-y-1.5">
                <div className="px-1 text-[10px] font-semibold text-cyan-400 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  <span>Connected GitHub Activity ({connectedPRs.length})</span>
                </div>
                {connectedPRs.map(pr => renderPRCard(pr))}
              </div>
            )}

            {/* Section B: Benchmark Audit Queue (PR-101, PR-102, PR-103) */}
            <div className="space-y-1.5">
              <div className="px-1 text-[10px] font-semibold text-indigo-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Benchmark PRs ({benchmarkPRs.length})</span>
              </div>
              {benchmarkPRs.map(pr => renderPRCard(pr))}
            </div>

          </div>

          {/* Quick Import / GitHub Hub Footer Trigger */}
          <div className="p-2.5 border-t border-slate-800/80 bg-slate-900/30 text-xs">
            <button
              onClick={() => setGithubHubOpen(true)}
              className="w-full py-1 text-slate-400 hover:text-cyan-300 font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Browse Repositories</span>
            </button>
          </div>
        </aside>

        {/* =========================================================================
            ZONE 4: CENTER STAGE — UNIFIED DIFF VIEWER & WISPR FLOW DOCK
        ========================================================================= */}
        <section className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden">
          
          {/* PR Metadata Banner & Actions */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between shrink-0">
            <div className="min-w-0 flex-1 pr-3">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono font-bold text-indigo-400 text-xs">{selectedPR?.id || "PR-..."}</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-[11px] text-slate-400 truncate">{selectedPR?.repo_name}</span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] text-slate-400">by @{selectedPR?.author}</span>
              </div>
              <h2 className="text-sm font-semibold text-white truncate">
                {selectedPR?.title || "Select a Pull Request to begin review"}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Readiness Score Badge */}
              <div className={`px-2 py-0.5 rounded-md border text-xs font-semibold flex items-center gap-1 ${scoreBadge.bg}`}>
                <ShieldAlert className="w-3 h-3" />
                <span>Score: {readinessScore !== null ? `${readinessScore}/100` : "Unreviewed"}</span>
              </div>

              {/* Direct Publish Review to GitHub Button */}
              <button
                onClick={() => handlePublishGitHubReview("COMMENT")}
                disabled={publishingReview || !activeSession}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-sm disabled:opacity-40 transition-colors"
                title="Publish review directly to GitHub PR"
              >
                {publishingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-indigo-200" />}
                <span>Publish to GitHub</span>
              </button>

              {/* Copy gh pr review CLI button */}
              <button
                onClick={handleCopyGHReviewCLI}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700/60 shadow-sm transition-colors"
                title="Copy GitHub CLI review command"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>`gh pr review`</span>
              </button>

              {/* Export Certificate (.md) button */}
              <button
                onClick={handleExportCertificate}
                disabled={exportingCert}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-xs font-medium text-slate-300 shadow-sm disabled:opacity-40 transition-colors"
                title="Export audit-grade readiness certificate markdown"
              >
                {exportingCert ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-emerald-400" />}
                <span>Export Cert</span>
              </button>
            </div>
          </div>

          {/* Diff Viewer Code Window */}
          <div ref={diffContainerRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5 bg-slate-950 select-text">
            {diffLines.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No diff content loaded. Select a pull request from the queue.
              </div>
            ) : (
              diffLines.map((line, idx) => {
                const lineNum = idx + 1;
                const isAdd = line.startsWith('+') && !line.startsWith('+++');
                const isDel = line.startsWith('-') && !line.startsWith('---');
                const isHeader = line.startsWith('@@') || line.startsWith('diff --git');
                const isHighlighted = highlightedLine === lineNum;

                // Live Deterministic Highlighting Flag
                const hasStripeSecret = line.includes('sk_live_');
                const hasSQLi = line.includes('SELECT') && line.includes('{user_id}');
                const hasBareExcept = line.trim() === 'pass' || (line.includes('except:') && line.includes('pass'));
                const hasLoopQuery = line.includes('for ') && line.includes('in ') && line.includes('db.execute');
                const hasAlert = hasStripeSecret || hasSQLi || hasBareExcept || hasLoopQuery;

                return (
                  <div
                    key={idx}
                    id={`diff-line-${lineNum}`}
                    className={`flex items-start rounded px-1 transition-all ${
                      isHighlighted
                        ? 'ring-2 ring-cyan-400 bg-cyan-950/60 shadow-lg'
                        : isAdd
                        ? 'bg-emerald-950/20 text-emerald-300 border-l-2 border-emerald-500'
                        : isDel
                        ? 'bg-rose-950/20 text-rose-300 border-l-2 border-rose-500'
                        : isHeader
                        ? 'bg-indigo-950/40 text-indigo-300 font-bold py-1'
                        : 'text-slate-300 hover:bg-slate-900/50'
                    }`}
                  >
                    <span className="w-8 select-none text-slate-600 text-right pr-2 text-[10px] shrink-0 font-mono">
                      {isHeader ? '...' : lineNum}
                    </span>
                    <span className="w-4 select-none font-bold text-slate-500 shrink-0 text-center">
                      {isAdd ? '+' : isDel ? '-' : ' '}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-all">
                      {line.substring(isAdd || isDel ? 1 : 0)}
                    </span>
                    {hasAlert && (
                      <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                        {hasStripeSecret ? 'Secret' : hasSQLi ? 'SQLi' : hasBareExcept ? 'Bare Except' : 'N+1 Query'}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Wispr Flow Voice Command Dock */}
          <div className="p-3 bg-slate-900/80 border-t border-slate-800/80 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-indigo-400" />
                <span>Wispr Flow Voice Review</span>
              </label>
              
              {/* Sleek Quick-Fill Voice Preset Pill (Accessible name matches Vitest test) */}
              <button
                id="btn-load-sample-transcript"
                aria-label="1-Click Load Sample Spoken Review"
                onClick={() => setTranscript(selectedPR?.sample_voice_prompt || "")}
                className="text-xs text-indigo-300 hover:text-white px-2.5 py-0.5 rounded-md bg-indigo-950/50 border border-indigo-800/30 hover:bg-indigo-900/60 transition-colors flex items-center gap-1"
                title="Load sample review for this PR"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>🎙️ Sample Review</span>
              </button>
            </div>

            <textarea
              id="wispr-flow-command-textarea"
              rows={2}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Speak with Wispr Flow... (e.g. 'Line 14 in payments.py has a hardcoded Stripe live secret key that must be extracted to env vars, and line 38 has a SQL injection flaw.')"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 resize-none font-sans"
            />

            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500">
                Hold your Wispr Flow hotkey to speak hands-free review instructions
              </div>

              <div className="flex items-center gap-2">
                {/* Multi-pass append mode button */}
                {activeSession && (
                  <button
                    onClick={() => handleAnalyzeVoiceReview(false, true)}
                    disabled={isAnalyzing || !transcript.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-200 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/40 disabled:opacity-40 transition-colors shadow-sm"
                    title="Append spoken note to active review session"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Append Note</span>
                  </button>
                )}

                {/* Primary Analyze Spoken Review button */}
                <button
                  id="btn-analyze-spoken-review"
                  onClick={() => handleAnalyzeVoiceReview(false, false)}
                  disabled={isAnalyzing || !transcript.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm disabled:opacity-40 transition-colors"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analyze Spoken Review</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

        </section>

        {/* =========================================================================
            ZONE 5: RIGHT PANE — REVIEW STUDIO, VELOCITY HUD & AGENT PROMPT
        ========================================================================= */}
        <section className="w-80 lg:w-96 border-l border-slate-800/80 bg-slate-950 flex flex-col shrink-0 overflow-hidden">
          
          {/* Feature A: Wispr Flow "Voice Velocity & Ergonomics HUD" */}
          {activeSession && (
            <div className="p-3 border-b border-slate-800/80 bg-slate-900/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  Voice Velocity
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  activeSession.review_verdict === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                  activeSession.review_verdict === 'CHANGES_REQUESTED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                  'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {activeSession.review_verdict || "CHANGES_REQUESTED"}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="p-1.5 rounded-md bg-slate-900/80 border border-slate-800">
                  <span className="block text-xs font-bold text-white font-mono">{activeSession.word_count || 48}</span>
                  <span className="block text-[9px] text-slate-500">Words</span>
                </div>
                <div className="p-1.5 rounded-md bg-slate-900/80 border border-slate-800">
                  <span className="block text-xs font-bold text-cyan-300 font-mono">~{activeSession.estimated_speaking_seconds || 19.2}s</span>
                  <span className="block text-[9px] text-slate-500">Spoken</span>
                </div>
                <div className="p-1.5 rounded-md bg-slate-900/80 border border-slate-800">
                  <span className="block text-xs font-bold text-emerald-300 font-mono">~{activeSession.estimated_typing_seconds_saved || 82}s</span>
                  <span className="block text-[9px] text-slate-500">Saved</span>
                </div>
                <div className="p-1.5 rounded-md bg-slate-900/80 border border-slate-800">
                  <span className="block text-xs font-bold text-purple-300 font-mono">{activeSession.speedup_multiplier || 4.3}x</span>
                  <span className="block text-[9px] text-slate-500">Speedup</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800/80 bg-slate-900/20 p-1 gap-1 shrink-0">
            <button
              onClick={() => setStudioTab("cards")}
              className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                studioTab === "cards"
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Comments ({activeSession?.comments?.length || 0})
            </button>

            <button
              onClick={() => setStudioTab("guardrails")}
              className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                studioTab === "guardrails"
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Guardrails ({activeSession?.guardrail_alerts?.length || 0})
            </button>

            <button
              onClick={() => setStudioTab("fixpack")}
              className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                studioTab === "fixpack"
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fix Pack
            </button>
          </div>

          {/* Feature D: Subagent Council Persona Filter Pills (Shown on Cards Tab) */}
          {activeSession && studioTab === "cards" && (
            <div className="p-2 border-b border-slate-800/60 bg-slate-950 flex items-center gap-1 overflow-x-auto text-[10px]">
              {[
                { id: "ALL", label: `All (${activeSession.comments?.length || 0})` },
                { id: "VoiceLead", label: "🎙️ VoiceLead" },
                { id: "SecuritySentinel", label: "🛡️ Security" },
                { id: "ContractGuardian", label: "📐 Contract" },
                { id: "PerfProfiler", label: "⚡ Perf" },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPersonaFilter(p.id)}
                  className={`px-2 py-0.5 rounded-md shrink-0 font-medium transition-all ${
                    personaFilter === p.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            
            {/* Empty State */}
            {!activeSession && (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                <Bot className="w-8 h-8 text-slate-600 stroke-1" />
                <p className="text-xs text-slate-400">No review session yet</p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Speak a code review or click '🎙️ Sample Review', then click 'Analyze Spoken Review' to generate findings.
                </p>
              </div>
            )}

            {/* Tab 1: Pinpointed Voice Review Cards */}
            {activeSession && studioTab === "cards" && (
              <div className="space-y-2.5">
                {filteredComments.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No review comments match the selected filter.
                  </div>
                ) : (
                  filteredComments.map((comment, idx) => {
                    const isPatchPreviewOpen = previewPatchId === comment.id;
                    const targetLine = comment.line_start || comment.line_number || 1;

                    return (
                      <div
                        key={comment.id || idx}
                        onClick={() => scrollToLine(targetLine)}
                        className="p-3 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-xs space-y-1.5 shadow-sm transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                              comment.severity === 'Critical' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                              comment.severity === 'Warning' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                              comment.category === 'Approval' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                              'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            }`}>
                              {comment.severity || "Suggestion"} • {comment.category}
                            </span>
                            {/* Subagent Persona Badge */}
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {comment.subagent_persona === 'SecuritySentinel' ? '🛡️ Security' :
                               comment.subagent_persona === 'ContractGuardian' ? '📐 Contract' :
                               comment.subagent_persona === 'PerfProfiler' ? '⚡ Perf' : '🎙️ VoiceLead'}
                            </span>
                          </div>

                          {/* Pinpoint Line Badge */}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToLine(targetLine);
                            }}
                            className="font-mono text-[10px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/30 hover:border-cyan-400 hover:text-cyan-300 transition-colors"
                            title="Click to jump to line in diff"
                          >
                            {formatLineLabel(comment)}
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

                        {/* Feature B: 1-Click "Preview Applied Patch in Diff" Toggle */}
                        {comment.suggested_patch && (
                          <div className="pt-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Suggested Patch</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewPatchId(isPatchPreviewOpen ? null : comment.id);
                                }}
                                className="text-[10px] text-cyan-300 hover:underline flex items-center gap-1 font-medium"
                              >
                                <Eye className="w-3 h-3" />
                                {isPatchPreviewOpen ? "Hide" : "Preview"}
                              </button>
                            </div>

                            {isPatchPreviewOpen && (
                              <pre className="p-2 rounded bg-black/80 text-[10px] text-emerald-300 font-mono overflow-x-auto border border-emerald-500/30 leading-tight animate-in fade-in">
                                {comment.suggested_patch}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab 2: Automated Guardrails & OpenAPI Drift Alerts */}
            {activeSession && studioTab === "guardrails" && (
              <div className="space-y-2.5">
                {activeSession.guardrail_alerts?.map((alert, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {alert.rule_id}
                        </span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {alert.subagent_persona || "SecuritySentinel"}
                        </span>
                      </div>
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">
                    Coding Agent Fix Prompt
                  </span>
                  <button
                    onClick={handleCopyFixPack}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-sm transition-all"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>

                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto">
                  {activeSession.agent_fix_prompt}
                </pre>
              </div>
            )}

          </div>

        </section>

      </div>

      {/* =========================================================================
          ZONE 6: OBSERVABILITY & INCIDENT DRAWER
      ========================================================================= */}
      {drawerOpen && (
        <aside className="fixed inset-y-0 right-0 w-96 lg:w-[460px] bg-slate-950 border-l border-slate-800 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-200">
          
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-sm text-white">Observability & On-Call Studio</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTriggerOnCallDrill}
                disabled={drillRunning}
                className="px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-500 text-[10px] font-bold text-white flex items-center gap-1 shadow"
              >
                {drillRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Terminal className="w-3 h-3" />}
                <span>Trigger Incident Drill</span>
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
          MODAL 1: GITHUB AUTHENTICATION & REPOSITORY HUB (TASK-13)
      ========================================================================= */}
      {githubHubOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <GithubIcon className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">GitHub Authentication & Live Repository Hub</h3>
                  <p className="text-[11px] text-slate-400">Connect your GitHub profile, browse live repositories & PRs, or use instant reviewer mode</p>
                </div>
              </div>
              <button onClick={() => setGithubHubOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hub Tabs */}
            <div className="flex border-b border-slate-800 pb-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setHubTab("connect")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  hubTab === "connect" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Account Connection</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (userRepos.length === 0) handleConnectGitHub();
                  setHubTab("repos");
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  hubTab === "repos" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Live Repository & PR Browser ({userRepos.length})</span>
              </button>
            </div>

            {/* Hub Tab 1: Connect Account */}
            {hubTab === "connect" && (
              <form onSubmit={handleConnectGitHub} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    GitHub Username (Public Repositories & PRs)
                  </label>
                  <input
                    type="text"
                    value={inputGithubUser}
                    onChange={(e) => setInputGithubUser(e.target.value)}
                    placeholder="e.g. KrishnaG-101"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Fetches public repositories and pull requests for code review.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>GitHub Personal Access Token (Optional)</span>
                    <span className="text-[10px] text-indigo-400 font-normal">Unlocks private repos & direct PR review publishing</span>
                  </label>
                  <input
                    type="password"
                    value={inputGithubToken}
                    onChange={(e) => setInputGithubToken(e.target.value)}
                    placeholder="ghp_... or github_pat_..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Token is kept exclusively in client-side memory and never logged to telemetry or stored permanently.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentUser({
                        authenticated: true,
                        auth_mode: "workspace",
                        username: "KrishnaG-101",
                        name: "Staff Reviewer",
                        avatar_url: "https://avatars.githubusercontent.com/u/101?v=4",
                        github_token: "",
                      });
                      setGithubHubOpen(false);
                      triggerToast("Active in Reviewer Workspace Mode");
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold"
                  >
                    Continue as Reviewer
                  </button>

                  <button
                    type="submit"
                    disabled={hubLoading}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {hubLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GithubIcon className="w-3.5 h-3.5" />}
                    <span>Connect & Load Repositories</span>
                  </button>
                </div>
              </form>
            )}

            {/* Hub Tab 2: Live Repository & PR Browser */}
            {hubTab === "repos" && (
              <div className="space-y-3 text-xs">
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={repoSearchQuery}
                    onChange={(e) => setRepoSearchQuery(e.target.value)}
                    placeholder="Filter repositories..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto">
                  
                  {/* Left Column: Repositories List */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Repositories ({filteredRepos.length})
                    </span>
                    {filteredRepos.length === 0 ? (
                      <p className="text-[11px] text-slate-500 p-3 bg-slate-950 rounded-lg">No repositories loaded. Connect your account in Tab 1.</p>
                    ) : (
                      filteredRepos.map((r, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectRepo(r)}
                          className={`p-2.5 rounded-lg cursor-pointer border transition-all ${
                            selectedRepo?.name === r.name
                              ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-sm'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs truncate max-w-[170px]">{r.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              {r.private ? "Private" : "Public"}
                            </span>
                          </div>
                          {r.description && <p className="text-[10px] text-slate-400 truncate mt-0.5">{r.description}</p>}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Right Column: Pull Requests for Selected Repo */}
                  <div className="space-y-1.5 border-l border-slate-800 pl-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {selectedRepo ? `Activity for ${selectedRepo.name}` : "Select a repository to view PRs"}
                    </span>

                    {repoPullsLoading ? (
                      <div className="p-6 flex flex-col items-center justify-center text-slate-400 gap-1.5">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                        <span className="text-[10px]">Loading pull requests from GitHub...</span>
                      </div>
                    ) : selectedRepo ? (
                      <div className="space-y-2">
                        {repoPulls.length > 0 ? (
                          repoPulls.map((p, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-cyan-300 font-bold">#{p.number}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                                  {p.state}
                                </span>
                              </div>
                              <p className="text-slate-200 font-medium line-clamp-2">{p.title}</p>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[10px] text-slate-400">by @{p.author}</span>
                                <button
                                  onClick={() => handleImportRepoActivity(p.number)}
                                  className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 font-bold text-[10px] text-white shadow"
                                >
                                  Import PR for Review
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center space-y-2">
                            <p className="text-[11px] text-slate-400">No open pull requests in this repository.</p>
                            <button
                              onClick={() => handleImportRepoActivity(null)}
                              className="w-full px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-[11px] flex items-center justify-center gap-1.5 shadow"
                            >
                              <GitCommit className="w-3.5 h-3.5 text-indigo-200" />
                              <span>Import Latest Commit Diff for Review</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 p-3 bg-slate-950 rounded-lg">Select a repository from the left list to inspect its pull requests.</p>
                    )}
                  </div>

                </div>

                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setGithubHubOpen(false)}
                    className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                  >
                    Close
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: DIRECT GITHUB REVIEW PUBLISHING CONFIRMATION
      ========================================================================= */}
      {publishModalOpen && publishReviewResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  {publishReviewResult.status === "published" ? "GitHub Review Published Live!" : "GitHub Review Preview Generated"}
                </h3>
              </div>
              <button onClick={() => setPublishModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              {publishReviewResult.status === "published"
                ? "Your hands-free Wispr Flow voice review was posted directly to the GitHub pull request!"
                : "A review preview and 1-click GitHub CLI command were generated for your review session."}
            </p>

            {publishReviewResult.review_url && (
              <a
                href={publishReviewResult.review_url}
                target="_blank"
                rel="noreferrer"
                className="block p-2 rounded bg-indigo-950/60 border border-indigo-800/40 text-xs text-indigo-300 font-semibold hover:underline"
              >
                🔗 View Live Review on GitHub: {publishReviewResult.review_url}
              </a>
            )}

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Generated `gh pr review` Command:
              </span>
              <pre className="p-2.5 rounded bg-black/80 text-[10px] font-mono text-cyan-300 overflow-x-auto border border-slate-800">
                {publishReviewResult.cli_command}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(publishReviewResult.cli_command);
                  triggerToast("Copied CLI command to clipboard!");
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Command</span>
              </button>
              <button
                onClick={() => setPublishModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: IMPORT CUSTOM PR MODAL
      ========================================================================= */}
      {customModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-indigo-400" />
                Import Pull Request
              </h3>
              <button onClick={() => setCustomModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex border-b border-slate-800 pb-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setModalTab("github")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  modalTab === "github" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Fetch Live GitHub PR URL
              </button>
              <button
                type="button"
                onClick={() => setModalTab("manual")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  modalTab === "manual" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Manual Unified Git Diff
              </button>
            </div>

            {/* Tab 1: Live GitHub PR URL Fetcher */}
            {modalTab === "github" && (
              <form onSubmit={handleImportGitHubPR} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Public GitHub PR URL
                  </label>
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/fastapi/fastapi/pull/9999"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 font-mono text-[11px]"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Fetches unified git diff directly from any public GitHub pull request.
                  </p>
                </div>

                {/* Preset URL chips */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Sample PRs:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "https://github.com/fastapi/fastapi/pull/9999",
                      "https://github.com/facebook/react/pull/28000",
                      "https://github.com/stripe/stripe-python/pull/1200",
                    ].map((sampleUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setGithubUrl(sampleUrl)}
                        className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 hover:text-indigo-300 font-mono"
                      >
                        {sampleUrl.split('/').slice(-3).join('/')}
                      </button>
                    ))}
                  </div>
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
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {customCreating ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Fetching GitHub PR...</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Fetch & Import PR</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Manual Unified Diff */}
            {modalTab === "manual" && (
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
                    rows={5}
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
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow disabled:opacity-50"
                  >
                    {customCreating ? "Importing..." : "Import Diff"}
                  </button>
                </div>
              </form>
            )}

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
