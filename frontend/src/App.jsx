import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import WisprVoiceBar from './components/WisprVoiceBar';
import DiffViewer from './components/DiffViewer';
import ReviewStudio from './components/ReviewStudio';
import TelemetryDrawer from './components/TelemetryDrawer';
import QuerySpeakModal from './components/QuerySpeakModal';
import NewPRModal from './components/NewPRModal';
import { fetchPRs, fetchPRDetail, fetchHealth, voiceAnalyzePR } from './api';

export default function App() {
  const [prs, setPrs] = useState([]);
  const [selectedPR, setSelectedPR] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [health, setHealth] = useState(null);
  
  // Voice & Review States
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Modals & Drawers
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [querySpeakOpen, setQuerySpeakOpen] = useState(false);
  const [newPROpen, setNewPROpen] = useState(false);
  const [activeIncidentsCount, setActiveIncidentsCount] = useState(0);

  // Load single PR details and past review session
  const loadPRDetails = useCallback(async (prId) => {
    try {
      setErrorMessage(null);
      const detail = await fetchPRDetail(prId);
      setSelectedPR(detail);

      // Set voice bar transcript suggestion if empty
      if (detail.sample_voice_prompt) {
        setCurrentTranscript(detail.sample_voice_prompt);
      }

      // Check for prior sessions
      if (detail.review_sessions && detail.review_sessions.length > 0) {
        setActiveSession(detail.review_sessions[0]);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error(`Failed to load PR ${prId}:`, err);
      setErrorMessage(`Failed to load pull request details for ${prId}.`);
    }
  }, []);

  // Initial Data Load
  const loadInitialData = useCallback(async () => {
    try {
      const [prsData, healthData] = await Promise.all([
        fetchPRs(),
        fetchHealth().catch(() => ({ status: "degraded", db_connected: false, active_incidents_count: 0 }))
      ]);

      setPrs(prsData);
      setHealth(healthData);
      setActiveIncidentsCount(healthData.active_incidents_count || 0);

      // Select PR-101 by default if available
      if (prsData.length > 0) {
        const defaultPR = prsData.find(p => p.id === "PR-101") || prsData[0];
        await loadPRDetails(defaultPR.id);
      }
    } catch (err) {
      console.error("Initialization error:", err);
      setErrorMessage("Failed to connect to PR-Whisperer backend. Is the server running on :8000?");
    }
  }, [loadPRDetails]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle PR change from selector or QuerySpeak
  const handleSelectPR = (prId) => {
    loadPRDetails(prId);
  };

  // Run Voice Review Analysis
  const handleAnalyze = async ({ spoken_transcript, reviewer_name, simulate_failure }) => {
    if (!selectedPR) return;
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const sessionResult = await voiceAnalyzePR(selectedPR.id, {
        spoken_transcript,
        reviewer_name: reviewer_name || "Wispr Reviewer",
        simulate_failure: simulate_failure || false,
      });

      setActiveSession(sessionResult);

      // Refresh PR and health status
      const [updatedDetail, healthData] = await Promise.all([
        fetchPRDetail(selectedPR.id),
        fetchHealth().catch(() => null),
      ]);
      setSelectedPR(updatedDetail);
      if (healthData) {
        setHealth(healthData);
        setActiveIncidentsCount(healthData.active_incidents_count || 0);
      }

      // Refresh PR list to update latest scores
      const refreshedPRs = await fetchPRs();
      setPrs(refreshedPRs);

    } catch (err) {
      console.warn("Analysis result or simulated error:", err);
      setErrorMessage(err.message || "Voice review analysis failed");

      // Check health to see if simulated incident fired
      const healthData = await fetchHealth().catch(() => null);
      if (healthData) {
        setHealth(healthData);
        setActiveIncidentsCount(healthData.active_incidents_count || 0);
        if (healthData.active_incidents_count > 0) {
          setTelemetryOpen(true); // Auto-open telemetry drawer on incident alert!
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePRCreated = (newPR) => {
    setPrs(prev => [newPR, ...prev]);
    setSelectedPR(newPR);
    setActiveSession(null);
    setCurrentTranscript(newPR.sample_voice_prompt || "");
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090d16] text-slate-100 overflow-hidden font-sans">
      
      {/* Top Navigation Header */}
      <Header
        prs={prs}
        selectedPR={selectedPR}
        onSelectPR={handleSelectPR}
        onOpenNewPR={() => setNewPROpen(true)}
        onOpenQuerySpeak={() => setQuerySpeakOpen(true)}
        health={health}
        onToggleTelemetry={() => setTelemetryOpen(!telemetryOpen)}
        telemetryOpen={telemetryOpen}
        activeIncidentsCount={activeIncidentsCount}
      />

      {/* Wispr Flow Voice Bar */}
      <WisprVoiceBar
        selectedPR={selectedPR}
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        currentTranscript={currentTranscript}
        setCurrentTranscript={setCurrentTranscript}
      />

      {/* Error / Alert Banner if present */}
      {errorMessage && (
        <div className="bg-rose-950/70 border-y border-rose-500/40 px-4 py-2 text-xs text-rose-200 flex items-center justify-between animate-in fade-in">
          <span>{errorMessage}</span>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="text-rose-400 hover:text-white font-bold text-xs ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split-Pane Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* Left Pane: Interactive Unified Diff Viewer (7 cols) */}
        <section className="lg:col-span-7 h-full overflow-hidden border-b lg:border-b-0">
          <DiffViewer
            pr={selectedPR}
            comments={activeSession?.comments || []}
            guardrailAlerts={activeSession?.guardrail_alerts || []}
          />
        </section>

        {/* Right Pane: Review Studio & 1-Click Fix Pack (5 cols) */}
        <section className="lg:col-span-5 h-full overflow-hidden">
          <ReviewStudio
            pr={selectedPR}
            session={activeSession}
            isAnalyzing={isAnalyzing}
          />
        </section>

      </main>

      {/* Collapsible Observability Drawer */}
      <TelemetryDrawer
        isOpen={telemetryOpen}
        onClose={() => setTelemetryOpen(false)}
        onIncidentResolved={() => {
          setActiveIncidentsCount(0);
          fetchHealth().then(setHealth).catch(() => {});
        }}
      />

      {/* Natural Language Voice Audit Modal */}
      <QuerySpeakModal
        isOpen={querySpeakOpen}
        onClose={() => setQuerySpeakOpen(false)}
        onSelectPR={handleSelectPR}
      />

      {/* New PR Diff Import Modal */}
      <NewPRModal
        isOpen={newPROpen}
        onClose={() => setNewPROpen(false)}
        onPRCreated={handlePRCreated}
      />

    </div>
  );
}
