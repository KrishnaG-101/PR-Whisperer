import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Play, 
  Volume2, 
  Radio, 
  AlertOctagon, 
  Loader2, 
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';

export default function WisprVoiceBar({
  selectedPR,
  onAnalyze,
  isAnalyzing,
  currentTranscript,
  setCurrentTranscript,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [reviewerName, setReviewerName] = useState("Staff Engineer Sarah");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const recognitionRef = useRef(null);

  // Setup Web Speech API for real voice dictation
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcriptText = '';
        for (let i = 0; i < event.results.length; i++) {
          transcriptText += event.results[i][0].transcript + ' ';
        }
        setCurrentTranscript(transcriptText.trim());
      };

      recognition.onerror = (err) => {
        console.warn("Speech recognition error:", err);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, [setCurrentTranscript]);

  const toggleRecording = () => {
    if (!speechSupported) {
      alert("Browser speech recognition is not supported in this browser. Please use the preset buttons or type directly!");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  // Sample voice review presets tailored for each pre-seeded PR
  const voicePresets = [
    {
      prId: "PR-101",
      label: "Payments: Stripe Secret & SQLi",
      transcript: "Looking at payments.py around line 14, we left a hardcoded Stripe live secret key that must be extracted to environment variables immediately. On line 38, the raw SQL query interpolates customer_id directly creating a critical SQL injection flaw. Furthermore, we removed the currency field in schemas/payment.py which causes breaking OpenAPI contract drift."
    },
    {
      prId: "PR-102",
      label: "Auth: Bare Except & N+1 Query",
      transcript: "In auth/session.py around line 52 there is a bare except clause swallowing exceptions silently, which hides token expiration errors. Additionally, executing database queries inside the user loop on line 44 triggers an N+1 performance bottleneck. Please batch fetch the user roles."
    },
    {
      prId: "PR-103",
      label: "Analytics: Missing Tests & Drift",
      transcript: "In analytics/dashboard.py line 19 we are missing input validation on the cycle time window. Also the OpenAPI schema changed the velocity metric response type from float to integer without documentation. We need a unit test for empty sprint data."
    }
  ];

  const handleApplyPreset = (presetTranscript) => {
    setCurrentTranscript(presetTranscript);
  };

  const handleSubmit = () => {
    if (!currentTranscript.trim()) return;
    onAnalyze({
      spoken_transcript: currentTranscript,
      reviewer_name: reviewerName,
      simulate_failure: simulateFailure,
    });
  };

  return (
    <div className="w-full bg-[#0c1322] border-b border-slate-800 p-4 lg:px-6">
      <div className="max-w-[1700px] mx-auto flex flex-col gap-3">
        
        {/* Top Voice Controller Row */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          
          {/* Mic Button & Live Waveform */}
          <div className="flex items-center gap-3">
            <button
              id="btn-wispr-flow-mic"
              onClick={toggleRecording}
              className={`relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all shadow-lg ${
                isRecording
                  ? 'bg-rose-500 text-white shadow-rose-500/30 ring-4 ring-rose-500/20 scale-105'
                  : 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-indigo-500/25 hover:brightness-110'
              }`}
              title={speechSupported ? (isRecording ? "Stop dictation" : "Start Wispr Flow dictation") : "Speech API not available"}
            >
              {isRecording ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
              {isRecording && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping" />
              )}
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Radio className={`w-3.5 h-3.5 ${isRecording ? 'text-rose-400 animate-spin' : 'text-indigo-400'}`} />
                  Wispr Flow Dictation
                </span>
                {isRecording && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                    LISTENING LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isRecording 
                  ? "Speaking hands-free... Voice stream converts directly to line-pinned review comments."
                  : "Dictate your code review or select a sample voice critique below."}
              </p>
            </div>

            {/* Visualizer Waveform */}
            {isRecording && (
              <div className="flex items-center gap-1 h-8 px-3 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="waveform-bar w-1 bg-rose-400 rounded-full" />
                <span className="waveform-bar w-1 bg-indigo-400 rounded-full" />
                <span className="waveform-bar w-1 bg-cyan-400 rounded-full" />
                <span className="waveform-bar w-1 bg-rose-400 rounded-full" />
                <span className="waveform-bar w-1 bg-indigo-400 rounded-full" />
                <span className="waveform-bar w-1 bg-cyan-400 rounded-full" />
                <span className="waveform-bar w-1 bg-rose-400 rounded-full" />
              </div>
            )}
          </div>

          {/* Sandbox Presets for Evaluators */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Voice Presets:
            </span>
            {voicePresets.map((preset) => (
              <button
                key={preset.prId}
                id={`btn-preset-${preset.prId.toLowerCase()}`}
                onClick={() => handleApplyPreset(preset.transcript)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-all border ${
                  selectedPR?.id === preset.prId
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
                title={preset.transcript}
              >
                {preset.label}
              </button>
            ))}
          </div>

        </div>

        {/* Dictation Input Area & Submission Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1">
            <textarea
              id="voice-transcript-input"
              rows={2}
              value={currentTranscript}
              onChange={(e) => setCurrentTranscript(e.target.value)}
              placeholder="Speak hands-free with Wispr Flow or type your code critique here... (e.g. 'Line 14 in payments.py has a hardcoded Stripe live secret key that must be removed.')"
              className="w-full bg-[#080d18] border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 resize-none transition-all"
            />
            {currentTranscript && (
              <button
                id="btn-clear-transcript"
                onClick={() => setCurrentTranscript("")}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                title="Clear transcript"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Controls: Sim Outage & Analyze Button */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            
            {/* Simulate Outage Toggle for Drill */}
            <label className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-medium text-slate-300 cursor-pointer hover:border-rose-500/30 transition-colors">
              <input
                id="checkbox-simulate-failure"
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="rounded border-slate-700 text-rose-500 focus:ring-rose-500/40 bg-slate-800"
              />
              <span className={simulateFailure ? "text-rose-400 font-semibold" : "text-slate-400"}>
                Simulate Incident
              </span>
            </label>

            {/* Run Analysis Button */}
            <button
              id="btn-run-voice-analysis"
              onClick={handleSubmit}
              disabled={isAnalyzing || !currentTranscript.trim()}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white shadow-lg transition-all ${
                isAnalyzing || !currentTranscript.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : simulateFailure
                  ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:brightness-110 shadow-rose-500/20'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:brightness-110 shadow-indigo-500/25'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Analyzing Critique...</span>
                </>
              ) : simulateFailure ? (
                <>
                  <AlertOctagon className="w-4 h-4 text-white" />
                  <span>Trigger Incident Drill</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Analyze Review</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
