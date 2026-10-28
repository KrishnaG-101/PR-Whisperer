import React from 'react';
import { 
  Mic, 
  GitPullRequest, 
  PlusCircle, 
  Search, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert,
  Terminal
} from 'lucide-react';

export default function Header({
  prs,
  selectedPR,
  onSelectPR,
  onOpenNewPR,
  onOpenQuerySpeak,
  health,
  onToggleTelemetry,
  telemetryOpen,
  activeIncidentsCount,
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#090d16]/90 backdrop-blur-md px-4 lg:px-6 py-3">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 max-w-[1700px] mx-auto">
        
        {/* Brand & Track Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white m-0 p-0 font-sans">
                PR-Whisperer
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Wispr Flow AI
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hidden sm:inline-block">
                Builders Track
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0 p-0 hidden sm:block">
              Speak Your Code Review. Ship Clean PRs.
            </p>
          </div>
        </div>

        {/* PR Selector & Quick Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* PR Dropdown */}
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-indigo-500/60 transition-colors">
            <GitPullRequest className="w-4 h-4 text-indigo-400" />
            <select
              id="pr-selector-dropdown"
              value={selectedPR?.id || ""}
              onChange={(e) => onSelectPR(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-medium text-slate-200 outline-none cursor-pointer max-w-[200px] sm:max-w-[280px] truncate"
            >
              {prs.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                  {p.id}: {p.title}
                </option>
              ))}
            </select>
            {selectedPR?.latest_readiness_score !== null && selectedPR?.latest_readiness_score !== undefined && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                selectedPR.latest_readiness_score < 40 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : selectedPR.latest_readiness_score < 70
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {selectedPR.latest_readiness_score}/100
              </span>
            )}
          </div>

          {/* New PR Button */}
          <button
            id="btn-open-new-pr-modal"
            onClick={onOpenNewPR}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-all"
            title="Import or create a custom pull request diff"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>New PR</span>
          </button>

          {/* QuerySpeak Voice Search Button */}
          <button
            id="btn-open-queryspeak-modal"
            onClick={onOpenQuerySpeak}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-all"
            title="Search review history with natural language voice queries"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">QuerySpeak</span>
          </button>
        </div>

        {/* System Health & Telemetry Drawer Toggle */}
        <div className="flex items-center gap-2">
          {/* Health status indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400 animate-pulse'}`} />
            <span className="text-[11px] font-medium text-slate-300">
              {health?.db_connected ? 'DB Synced' : 'Degraded'}
            </span>
          </div>

          {/* Telemetry & Incidents Toggle */}
          <button
            id="btn-toggle-telemetry-drawer"
            onClick={onToggleTelemetry}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              activeIncidentsCount > 0
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/40 hover:bg-rose-500/20'
                : telemetryOpen
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            {activeIncidentsCount > 0 ? (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>{activeIncidentsCount} Alert Active</span>
              </>
            ) : (
              <>
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Telemetry</span>
              </>
            )}
          </button>
        </div>

      </div>
    </header>
  );
}
