import React, { useState } from 'react';
import { 
  Search, 
  Mic, 
  X, 
  Sparkles, 
  ShieldAlert, 
  Filter, 
  ArrowRight, 
  FileCode, 
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { querySpeakSearch } from '../api';

export default function QuerySpeakModal({
  isOpen,
  onClose,
  onSelectPR,
}) {
  const [query, setQuery] = useState("Show all critical security issues in payment PRs");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const sampleQueries = [
    "Show all critical security issues in payment PRs",
    "Find contract drift in openapi schemas",
    "List performance warnings and N+1 queries",
    "Show bare except clauses in auth service",
  ];

  const handleSearch = async (voiceQueryText) => {
    const q = voiceQueryText || query;
    if (!q.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const data = await querySpeakSearch({ voice_query: q });
      setResult(data);
    } catch (err) {
      setError(err.message || "QuerySpeak search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e1627] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#090d16]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Search className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white m-0 p-0">QuerySpeak — Natural Language Voice Audit</h3>
              <p className="text-[11px] text-slate-400 m-0 p-0">Cross-examine code reviews, security findings, and drift via voice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-5 border-b border-slate-800 bg-[#0a0f1d] flex flex-col gap-3">
          <div className="flex items-center gap-2 bg-[#060a12] border border-slate-800 rounded-xl px-3 py-2 focus-within:border-cyan-500/60 transition-colors">
            <Mic className="w-4 h-4 text-cyan-400 shrink-0" />
            <input
              id="input-queryspeak-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. 'Show critical security issues in payment PRs' or 'Find contract drift'..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none"
            />
            <button
              id="btn-submit-queryspeak"
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
            </button>
          </div>

          {/* Quick Voice Queries Pills */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Try Voice Queries:
            </span>
            {sampleQueries.map((sq, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(sq);
                  handleSearch(sq);
                }}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-all text-left"
              >
                "{sq}"
              </button>
            ))}
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              
              {/* Insight Summary Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/30 via-indigo-950/20 to-transparent border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs font-bold text-cyan-200">QuerySpeak Insight</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {result.insight_summary}
                </p>

                {/* Filter tags parsed by backend */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[10px]">
                  <span className="text-slate-400">Interpreted Intent:</span>
                  {result.interpreted_filters?.severity && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                      {result.interpreted_filters.severity}
                    </span>
                  )}
                  {result.interpreted_filters?.category && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                      {result.interpreted_filters.category}
                    </span>
                  )}
                  {result.interpreted_filters?.keyword && (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                      Keyword: "{result.interpreted_filters.keyword}"
                    </span>
                  )}
                </div>
              </div>

              {/* Matching Pull Requests */}
              {result.matching_prs?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Matching Pull Requests ({result.matching_prs.length})
                  </h4>
                  <div className="space-y-1.5">
                    {result.matching_prs.map((pr) => (
                      <div
                        key={pr.id}
                        onClick={() => {
                          onSelectPR(pr.id);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-800/40 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-xs font-bold text-slate-200">{pr.id}:</span>
                          <span className="text-xs text-slate-300 truncate max-w-[320px]">{pr.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {pr.latest_readiness_score !== null && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {pr.latest_readiness_score}/100
                            </span>
                          )}
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Comments */}
              {result.matching_comments?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Matching Line Comments ({result.matching_comments.length})
                  </h4>
                  <div className="space-y-2">
                    {result.matching_comments.map((comment, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-[#060a12] border border-slate-800 text-xs text-slate-300 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-rose-300 px-1.5 py-0.5 rounded bg-rose-500/20">
                            {comment.severity || "Warning"} • {comment.category}
                          </span>
                          <span className="font-mono text-slate-400">{comment.file_path}:{comment.line_number}</span>
                        </div>
                        <p className="font-sans leading-relaxed text-slate-200 mt-1">{comment.polished_comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {!result && !loading && (
            <div className="text-center py-12 text-slate-500 text-xs">
              Type or select a natural language query above to search review comments and audit repositories.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
