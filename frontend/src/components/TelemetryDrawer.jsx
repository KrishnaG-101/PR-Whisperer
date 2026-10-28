import React, { useState, useEffect, useCallback } from 'react';
import { 
  Terminal, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  Play, 
  Loader2, 
  RefreshCw
} from 'lucide-react';
import { fetchTelemetrySummary, simulateIncidentAndRespond } from '../api';

export default function TelemetryDrawer({
  isOpen,
  onClose,
  onIncidentResolved,
}) {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDrilling, setIsDrilling] = useState(false);
  const [drillResult, setDrillResult] = useState(null);
  const [activeTab, setActiveTab] = useState("traces"); // "traces", "metrics", "incidents", "remediation"

  const loadTelemetry = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTelemetrySummary();
      setTelemetry(data);
    } catch (err) {
      console.error("Failed to load telemetry:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadTelemetry();
      const interval = setInterval(loadTelemetry, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, loadTelemetry]);

  const handleRunIncidentDrill = async () => {
    try {
      setIsDrilling(true);
      const res = await simulateIncidentAndRespond({
        simulated_error: "RateLimitExceeded on upstream voice transcript parser.",
        pr_id: "PR-101",
      });
      setDrillResult(res);
      setActiveTab("remediation");
      loadTelemetry();
      if (onIncidentResolved) onIncidentResolved();
    } catch (err) {
      console.error("Drill failed:", err);
    } finally {
      setIsDrilling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-[#070b14]/95 border-t border-slate-800 backdrop-blur-xl shadow-2xl transition-all duration-300 max-h-[50vh] flex flex-col font-mono text-xs">
      
      {/* Top Drawer Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0f1d] border-b border-slate-800 select-none">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold tracking-wider mr-2">
            <Terminal className="w-4 h-4" />
            <span>OBSERVABILITY</span>
          </div>

          <button
            id="btn-telemetry-tab-traces"
            onClick={() => setActiveTab("traces")}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === "traces"
                ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Traces ({telemetry?.recent_traces?.length || 0})
          </button>

          <button
            id="btn-telemetry-tab-incidents"
            onClick={() => setActiveTab("incidents")}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              telemetry?.active_incidents?.length > 0
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                : activeTab === "incidents"
                ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Incidents ({telemetry?.active_incidents?.length || 0})</span>
          </button>

          <button
            id="btn-telemetry-tab-metrics"
            onClick={() => setActiveTab("metrics")}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === "metrics"
                ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Prometheus Metrics
          </button>

          {drillResult && (
            <button
              id="btn-telemetry-tab-remediation"
              onClick={() => setActiveTab("remediation")}
              className={`px-2.5 py-1 rounded transition-colors text-emerald-300 flex items-center gap-1.5 ${
                activeTab === "remediation"
                  ? 'bg-emerald-600/30 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Remediation Result</span>
            </button>
          )}
        </div>

        {/* Right Actions: Drill Button & Close */}
        <div className="flex items-center gap-2">
          
          <button
            id="btn-trigger-oncall-agent-drill"
            onClick={handleRunIncidentDrill}
            disabled={isDrilling}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white font-semibold transition-all shadow-md shadow-rose-500/20 disabled:opacity-50"
            title="Simulate upstream failure and test autonomous On-Call Responder Agent"
          >
            {isDrilling ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>On-Call Agent Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-white" />
                <span>Trigger On-Call Drill</span>
              </>
            )}
          </button>

          <button
            onClick={loadTelemetry}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Refresh telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Drawer Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
        
        {/* Tab 1: Traces */}
        {activeTab === "traces" && (
          <div className="space-y-1.5">
            {(!telemetry?.recent_traces || telemetry.recent_traces.length === 0) ? (
              <p className="text-slate-500 text-center py-6">No telemetry traces recorded yet. Run a voice review to generate traces.</p>
            ) : (
              telemetry.recent_traces.slice(0, 30).map((tr, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2 rounded bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/30 transition-colors"
                >
                  <span className={`px-1.5 py-0.2 rounded font-bold shrink-0 ${
                    tr.level === 'ERROR' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    tr.level === 'WARN' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {tr.level}
                  </span>

                  <span className="font-mono text-indigo-400 shrink-0 select-all">
                    [{tr.trace_id ? tr.trace_id.substring(0, 8) : 'sys'}]
                  </span>

                  <span className="text-cyan-300 font-semibold shrink-0">
                    {tr.event}
                  </span>

                  <span className="text-slate-300 flex-1 truncate font-mono">
                    {tr.message}
                  </span>

                  <span className="text-slate-500 shrink-0 text-[10px]">
                    {new Date(tr.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Active Incidents */}
        {activeTab === "incidents" && (
          <div className="space-y-3">
            {(!telemetry?.active_incidents || telemetry.active_incidents.length === 0) ? (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero active incidents. Systems operational and meeting SLOs.</span>
              </div>
            ) : (
              telemetry.active_incidents.map((inc, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span className="font-bold text-rose-100">{inc.alert_type}</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 text-[10px] font-bold">
                        {inc.severity}
                      </span>
                    </div>
                    <span className="font-mono text-rose-300 text-[10px]">Trace: {inc.trace_id}</span>
                  </div>
                  <p className="text-rose-200/90 text-xs">
                    Impacted Pull Request: <strong>{inc.pr_id}</strong>
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-rose-500/20">
                    <span className="text-[10px] text-rose-400">Status: TRIGGERED • PagerDuty Notified</span>
                    <button
                      onClick={handleRunIncidentDrill}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px]"
                    >
                      Dispatch On-Call Agent
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Prometheus Metrics */}
        {activeTab === "metrics" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Total Voice Analyses</span>
              <span className="text-xl font-extrabold text-indigo-400">
                {telemetry?.metrics?.voice_analyze_requests_total || 0}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">Metric: voice_analyze_requests_total</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Voice Analysis Errors</span>
              <span className="text-xl font-extrabold text-rose-400">
                {telemetry?.metrics?.voice_analyze_errors_total || 0}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">Metric: voice_analyze_errors_total</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">HTTP Requests Tracked</span>
              <span className="text-xl font-extrabold text-cyan-400">
                {telemetry?.metrics?.http_requests_total || 0}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">Metric: http_requests_total</span>
            </div>
          </div>
        )}

        {/* Tab 4: On-Call Remediation Drill Result */}
        {activeTab === "remediation" && drillResult && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-emerald-100">Incident Successfully Resolved by On-Call Agent</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                  ID: {drillResult.incident_id}
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans mb-3">
                {drillResult.root_cause_analysis}
              </p>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                  Autonomous Remediation Git Diff:
                </span>
                <pre className="p-2.5 rounded bg-black/70 text-[11px] text-emerald-300 font-mono overflow-x-auto border border-emerald-500/20">
                  {drillResult.remediation_diff}
                </pre>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
