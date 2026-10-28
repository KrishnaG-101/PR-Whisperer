import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Sparkles, 
  Bot, 
  FileText, 
  Copy, 
  Check, 
  CheckCircle2, 
  Clock, 
  User,
  Loader2
} from 'lucide-react';

export default function ReviewStudio({
  pr,
  session,
  isAnalyzing,
}) {
  const [activeTab, setActiveTab] = useState("comments");
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const comments = session?.comments || [];
  const guardrails = session?.guardrail_alerts || [];
  const readinessScore = session?.readiness_score !== undefined 
    ? session.readiness_score 
    : (pr?.latest_readiness_score !== null ? pr?.latest_readiness_score : null);

  const handleCopyPrompt = () => {
    if (!session?.agent_fix_prompt) return;
    navigator.clipboard.writeText(session.agent_fix_prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return { ring: "stroke-slate-700", text: "text-slate-400", bg: "bg-slate-800", label: "No Review Yet" };
    if (score < 40) return { ring: "stroke-rose-500", text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", label: "Critical Blockers Found" };
    if (score < 70) return { ring: "stroke-amber-500", text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Needs Revisions" };
    return { ring: "stroke-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Ready to Ship" };
  };

  const scoreMeta = getScoreColor(readinessScore);

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] overflow-hidden">
      
      {/* Top Banner: Score Gauge & Key Metrics */}
      <div className="p-4 bg-[#0e1627] border-b border-slate-800 shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Circular Score Gauge */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="stroke-slate-800"
                  strokeWidth="3.5"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${scoreMeta.ring} transition-all duration-1000 ease-out`}
                  strokeDasharray={`${readinessScore !== null ? readinessScore : 0}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className={`text-base font-extrabold ${scoreMeta.text}`}>
                  {readinessScore !== null ? readinessScore : "—"}
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">/100</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 m-0 p-0">PR Readiness Score</h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${scoreMeta.bg} ${scoreMeta.text} ${scoreMeta.border || 'border-slate-700'}`}>
                  {scoreMeta.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluated against security, contract drift, and test coverage rules.
              </p>
            </div>
          </div>

          {/* Quick Metrics Pills */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-around">
            <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-bold text-rose-400">{guardrails.length}</span>
              <span className="text-[10px] text-slate-400">Guardrails</span>
            </div>
            <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-bold text-indigo-400">{comments.length}</span>
              <span className="text-[10px] text-slate-400">Comments</span>
            </div>
            <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-bold text-cyan-400">{pr?.files_changed_count || 1}</span>
              <span className="text-[10px] text-slate-400">Files</span>
            </div>
          </div>

        </div>
      </div>

      {/* Studio Navigation Tabs */}
      <div className="flex items-center px-4 bg-[#0a0f1d] border-b border-slate-800 shrink-0 overflow-x-auto no-scrollbar">
        <button
          id="tab-comments"
          onClick={() => setActiveTab("comments")}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-semibold transition-all shrink-0 ${
            activeTab === "comments"
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Critique Breakdown ({comments.length})</span>
        </button>

        <button
          id="tab-guardrails"
          onClick={() => setActiveTab("guardrails")}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-semibold transition-all shrink-0 ${
            activeTab === "guardrails"
              ? 'border-rose-500 text-rose-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Security & Drift ({guardrails.length})</span>
        </button>

        <button
          id="tab-agent-prompt"
          onClick={() => setActiveTab("agent-prompt")}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-semibold transition-all shrink-0 ${
            activeTab === "agent-prompt"
              ? 'border-cyan-500 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>1-Click Agent Fix Pack</span>
        </button>

        <button
          id="tab-summary"
          onClick={() => setActiveTab("summary")}
          className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-semibold transition-all shrink-0 ${
            activeTab === "summary"
              ? 'border-indigo-500 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Executive Summary</span>
        </button>
      </div>

      {/* Tab Panels Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {isAnalyzing && (
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-indigo-300 text-xs flex items-center gap-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
            <span>Analyzing spoken critique, executing AST guardrails, and synthesizing 1-click agent fix prompt...</span>
          </div>
        )}

        {/* No Session State */}
        {!session && comments.length === 0 && guardrails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-center p-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <h4 className="text-sm font-bold text-slate-200 mb-1">No Voice Review Session Yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
              Speak naturally via Wispr Flow dictation above or choose a sandbox voice preset to generate line-pinned comments, security guardrails, and 1-click agent fix prompts.
            </p>
            {pr?.sample_voice_prompt && (
              <div className="text-left w-full max-w-md p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                  Suggested Spoken Critique for this PR:
                </span>
                <p className="text-slate-300 italic">"{pr.sample_voice_prompt}"</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Tab 1: Spoken Comments Breakdown */}
            {activeTab === "comments" && (
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No line comments generated.</p>
                ) : (
                  comments.map((comment, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#0e1627] border border-slate-800 hover:border-indigo-500/40 transition-all shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            comment.severity === 'Critical' 
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : comment.severity === 'Warning'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          }`}>
                            {comment.severity || "Suggestion"}
                          </span>
                          <span className="text-xs font-semibold text-slate-200">{comment.category}</span>
                        </div>
                        <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                          {comment.file_path ? `${comment.file_path.split('/').pop()}:` : ""}{comment.line_number}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {comment.polished_comment}
                      </p>

                      {comment.spoken_excerpt && (
                        <div className="mt-2 text-[11px] text-slate-400 italic bg-slate-900/80 p-2 rounded border-l-2 border-indigo-500 font-sans">
                          <span className="font-semibold text-indigo-400 not-italic mr-1">Spoken Excerpt:</span>
                          "{comment.spoken_excerpt}"
                        </div>
                      )}

                      {comment.suggested_patch && (
                        <div className="mt-2.5">
                          <span className="text-[10px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">
                            Suggested Remediation Patch:
                          </span>
                          <pre className="p-2.5 rounded-lg bg-black/60 text-[11px] text-emerald-300 font-mono overflow-x-auto border border-emerald-500/20 leading-relaxed">
                            {comment.suggested_patch}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Security & Contract Drift Guardrails */}
            {activeTab === "guardrails" && (
              <div className="space-y-3">
                {guardrails.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>All deterministic guardrails passed. No hardcoded secrets, SQL injection, or OpenAPI drift detected.</span>
                  </div>
                ) : (
                  guardrails.map((alert, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-200 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            {alert.rule_id}
                          </span>
                          <span className="text-xs font-bold text-rose-100">{alert.category}</span>
                        </div>
                        <span className="text-[11px] font-mono text-rose-300">
                          {alert.file_path}:{alert.line_number}
                        </span>
                      </div>
                      <p className="text-xs text-rose-200/90 leading-relaxed mt-1 font-sans">
                        {alert.description}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: 1-Click Coding Agent Fix Pack */}
            {activeTab === "agent-prompt" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-indigo-950/40 to-cyan-950/40 border border-indigo-500/30">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white m-0 p-0">Agent Execution Ready</h4>
                      <p className="text-[11px] text-slate-400 m-0 p-0">Formatted for Cursor, Claude Code, and Antigravity</p>
                    </div>
                  </div>
                  <button
                    id="btn-copy-agent-fix-prompt"
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition-all"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copied Prompt!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-white" />
                        <span>Copy Fix Prompt</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <pre className="p-3.5 rounded-xl bg-[#060a12] border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[500px]">
                    {session?.agent_fix_prompt || "# No agent fix prompt generated yet."}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 4: Executive Markdown Summary */}
            {activeTab === "summary" && (
              <div className="p-4 rounded-xl bg-[#0e1627] border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans space-y-3">
                <div className="flex items-center gap-2 text-slate-400 text-[11px] border-b border-slate-800 pb-2">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Reviewer: <strong className="text-slate-200">{session?.reviewer_name || "Wispr Reviewer"}</strong></span>
                  <span className="mx-1">•</span>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{session?.created_at ? new Date(session.created_at).toLocaleTimeString() : "Just now"}</span>
                </div>
                <div className="whitespace-pre-wrap leading-relaxed prose prose-invert prose-xs max-w-none">
                  {session?.summary_markdown || "No summary markdown generated."}
                </div>
              </div>
            )}
          </>
        )}

      </div>

    </div>
  );
}
