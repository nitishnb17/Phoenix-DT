import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Loader2,
  Send,
  User,
  Maximize2,
  Minimize2,
  X,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../lib/store';

export function CopilotChat() {
  const {
    copilotMessages,
    addCopilotMessage,
    updateCopilotMessage,
    clearCopilotMessages,
    engine,
    flight,
    faults,
    diagnostics,
    uptimeSeconds,
    missionPhase,
    dataSourceMode,
    isLinkLossActive,
    theme,
  } = useAppStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fsMessagesEndRef = useRef<HTMLDivElement>(null);
  const fsInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';
  const panelBg = isDark ? 'bg-[#1A2233] border-[#2A3548]' : 'bg-white border-slate-200 shadow-sm';
  const headerText = isDark ? 'text-[#8FA0BC]' : 'text-slate-500';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    fsMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [copilotMessages, isFullscreen]);

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Manage body scroll and focus when entering fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        fsInputRef.current?.focus();
      }, 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputPrompt.trim();
    if (!textToSend || isCopilotLoading) return;

    const userMsgId = `user-${Date.now()}`;
    addCopilotMessage({
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(),
    });

    if (!customText) {
      setInputPrompt('');
    }

    setIsCopilotLoading(true);

    const assistantMsgId = `assistant-${Date.now()}`;
    addCopilotMessage({
      id: assistantMsgId,
      sender: 'assistant',
      text: 'Analyzing telemetry and diagnostic matrix...',
      timestamp: new Date().toLocaleTimeString(),
      isStreaming: true,
    });

    // Diagnostic Telemetry Snapshot Injection
    const snapshotPayload = {
      userPrompt: textToSend,
      snapshot: {
        timestamp_iso: new Date().toISOString(),
        mission_phase: missionPhase,
        uptime_seconds: uptimeSeconds,
        data_source: dataSourceMode,
        is_link_loss_simulated: isLinkLossActive,
        engine_telemetry: {
          rpm: engine.rpm,
          cht_degf: engine.cht,
          egt_degf: engine.egt,
          egt_actual_degf: engine.egt_actual,
          oil_pressure_psi: engine.oil_press,
          oil_temp_degf: engine.oil_temp_degf,
          fuel_flow_gph: engine.fuel_flow,
          bus_voltage_v: engine.bus_voltage_v,
          charging_current_a: engine.charging_current_a,
          injection_timing_deg: engine.injection_timing_deg,
          lubrication_health_score_pct: engine.lubrication_health_score,
          vibration_bands: {
            rms_g: engine.vibration_bands.rms_g,
            harmonic_1x_g: engine.vibration_bands.harmonic_1x_g,
            harmonic_2x_g: engine.vibration_bands.harmonic_2x_g,
            high_freq_floor_g: engine.vibration_bands.high_freq_g,
          },
        },
        flight_envelope: {
          altitude_ft: flight.altitude,
          airspeed_ktas: flight.airspeed,
          kias: flight.kias,
          ktas: flight.ktas,
          oat_degc: flight.oat,
          pitch_deg: flight.pitch,
          roll_deg: flight.roll,
          air_density_kgm3: flight.air_density,
        },
        active_fault_vector: {
          fuel_line_leak_pct: faults.fuel_leak_severity,
          injector_clog_pct: faults.injector_clog_severity,
          oil_scavenge_leak_pct: faults.oil_leak_severity,
          misfire_severity_pct: faults.misfire_severity,
          combustion_instability_pct: faults.combustion_instability_severity,
          lubrication_degradation_pct: faults.lubrication_degradation_severity,
          coking_degradation_pct: faults.coking_degradation_severity,
          electrical_fault_pct: faults.electrical_fault_severity,
          airframe_icing_pct: faults.icing_severity,
          sensor_drift_pct: faults.sensor_drift_severity,
          payload_overheat_pct: faults.payload_overheat_severity,
        },
        ai_diagnostic_matrix: {
          health_index_pct: diagnostics.health_index_pct,
          classified_fault: diagnostics.classified_fault,
          statistical_verdict: diagnostics.statistical_verdict,
          learned_verdict: diagnostics.learned_verdict,
          mahalanobis_distance: diagnostics.anomaly_distance,
          rul_seconds: diagnostics.rul_seconds,
          rul_uncertainty_seconds: diagnostics.rul_uncertainty_seconds,
          is_critical_seizure: diagnostics.is_critical_seizure,
          hybrid_confidence_pct: diagnostics.hybrid_confidence_pct,
          z_scores: diagnostics.z_scores,
          learned_probabilities: diagnostics.learned_probabilities,
        },
      },
      // Flat payload for backwards compatibility
      telemetry: {
        mission_phase: missionPhase,
        uptime_seconds: uptimeSeconds,
        engine,
        flight,
      },
      active_faults: faults,
      ai_diagnostics: diagnostics,
    };

    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshotPayload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorCategory = data?.category || data?.error || 'server_error';
        const errorDetail = data?.message || data?.error || `HTTP ${response.status}`;

        let humanReadableMessage = `⚠️ **Diagnostic Copilot Offline [${errorCategory}]**: ${errorDetail}`;

        if (errorCategory === 'missing_api_key') {
          humanReadableMessage = `⚠️ **API Configuration Required**: \`GEMINI_API_KEY\` environment variable is not defined on the server. Please configure it in your environment or Settings panel.`;
        } else if (errorCategory === 'provider_auth_failed') {
          humanReadableMessage = `🔒 **LLM Authentication Failed**: The configured API key was rejected by the provider (HTTP 401/403). Please verify that your API key is valid and not expired.`;
        } else if (errorCategory === 'quota_exceeded') {
          humanReadableMessage = `📊 **API Rate/Quota Limit Exceeded**: The LLM API quota has been reached (HTTP 429). Check your billing or rate limits on the AI Studio / provider console.`;
        } else if (errorCategory === 'model_not_found') {
          humanReadableMessage = `🔍 **Model Not Found**: The requested model name is deprecated or unavailable for this project credentials.`;
        }

        updateCopilotMessage(assistantMsgId, humanReadableMessage);
        return;
      }

      if (data?.reply) {
        updateCopilotMessage(assistantMsgId, data.reply);
      } else {
        updateCopilotMessage(assistantMsgId, 'Diagnostic assessment completed with nominal parameters.');
      }
    } catch (err: any) {
      updateCopilotMessage(
        assistantMsgId,
        `⚠️ **Network/Transport Error**: Unable to reach backend copilot endpoint (${err.message || 'connection failed'}). Please check that the server is active.`
      );
    } finally {
      setIsCopilotLoading(false);
    }
  };

  return (
    <>
      <div className={`w-full flex flex-col rounded-lg border ${panelBg}`}>
        <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400" />
            <h3 className={`text-xs font-bold tracking-wider uppercase ${headerText}`}>
              MAINTENANCE COPILOT (PHOENIX-DT LLM)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-telemetry uppercase text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              GEMINI 3.7 ONLINE
            </span>
            {/* Fullscreen Button in inline header */}
            <button
              id="copilot-fullscreen-btn"
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-700/60 transition-all text-[10px] font-mono-telemetry"
              title="Expand Copilot to Fullscreen Mode (Keyboard shortcut: [Esc] to exit)"
            >
              <Maximize2 className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">FULLSCREEN</span>
            </button>
          </div>
        </div>

        <div className="p-2.5 flex flex-wrap gap-1.5 border-b border-slate-700/40 bg-black/10">
          <button
            onClick={() => handleSend('Explain current fault in plain language.')}
            disabled={isCopilotLoading}
            className="text-[10px] font-mono-telemetry px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
          >
            Explain current fault
          </button>
          <button
            onClick={() => handleSend('What should the GCS pilot and maintenance crew do next?')}
            disabled={isCopilotLoading}
            className="text-[10px] font-mono-telemetry px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
          >
            What to do next?
          </button>
          <button
            onClick={() => handleSend('Summarize this flight telemetry for the post-mission maintenance log.')}
            disabled={isCopilotLoading}
            className="text-[10px] font-mono-telemetry px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
          >
            Summarize for log
          </button>
        </div>

        <div className="p-3 h-64 overflow-y-auto flex flex-col gap-3 font-mono-telemetry text-xs">
          {copilotMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  {isUser ? <User className="w-3 h-3 text-cyan-400" /> : <Bot className="w-3 h-3 text-cyan-400" />}
                  <span className="font-semibold">{isUser ? 'OPERATOR' : 'PROPULSION COPILOT'}</span>
                  <span>• {msg.timestamp}</span>
                </div>
                <div
                  className={`p-2.5 rounded-lg max-w-[90%] whitespace-pre-wrap leading-relaxed ${
                    isUser
                      ? 'bg-cyan-600/20 text-cyan-200 border border-cyan-500/30'
                      : 'bg-black/30 text-slate-200 border border-slate-700/60'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          {isCopilotLoading && (
            <div className="flex items-center gap-2 text-cyan-400 text-xs py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Generating diagnostic reasoning...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-2 border-t border-slate-700/50 flex gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask copilot about propulsion anomalies..."
            className="flex-1 bg-black/20 border border-slate-700/60 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono-telemetry"
          />
          <button
            id="copilot-send-btn"
            onClick={() => handleSend()}
            disabled={!inputPrompt.trim() || isCopilotLoading}
            className="px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono-telemetry font-bold transition-all disabled:opacity-40 flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>SEND</span>
          </button>
        </div>
      </div>

      {/* Fullscreen Copilot Mode Overlay */}
      {isFullscreen && (
        <div
          id="copilot-fullscreen-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div
            className={`relative w-full h-full max-w-7xl max-h-[96vh] flex flex-col rounded-xl overflow-hidden shadow-2xl border ${
              isDark
                ? 'bg-[#0B1120] border-cyan-500/40 shadow-cyan-950/50 text-slate-100'
                : 'bg-white border-cyan-600/40 shadow-2xl text-slate-900'
            }`}
          >
            {/* Fullscreen Header */}
            <div
              className={`px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b ${
                isDark ? 'bg-[#070B14] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold tracking-wider uppercase font-mono-telemetry text-cyan-400">
                      MAINTENANCE COPILOT (PHOENIX-DT IVHM)
                    </h2>
                    <span className="text-[10px] font-mono-telemetry uppercase text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
                      FULLSCREEN WORKSPACE
                    </span>
                    <span className="text-[10px] font-mono-telemetry uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 hidden sm:inline">
                      GEMINI 3.7 ONLINE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Real-time AI diagnostic reasoning, procedure checklists &amp; aero-piston health consultation
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={clearCopilotMessages}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono-telemetry bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                  title="Clear conversation history"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Clear Chat</span>
                </button>

                <button
                  onClick={() => setIsFullscreen(false)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono-telemetry bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all font-bold"
                  title="Exit Fullscreen (Esc)"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Exit Fullscreen</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                    [Esc]
                  </span>
                </button>

                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-500/20 hover:text-red-300 text-slate-300 border border-slate-700 transition-all"
                  title="Close Fullscreen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Fullscreen Live Telemetry HUD Bar */}
            <div
              className={`px-4 sm:px-6 py-2 border-b flex flex-wrap items-center justify-between gap-3 text-xs font-mono-telemetry ${
                isDark ? 'bg-black/30 border-slate-800/80' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">HEALTH INDEX:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-xs ${
                      diagnostics.health_index_pct < 60
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                        : diagnostics.health_index_pct < 85
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {diagnostics.health_index_pct.toFixed(0)}% · {diagnostics.classified_fault}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">RPM:</span>
                  <span className="font-bold text-cyan-400">{Math.round(engine.rpm)}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">CHT / EGT:</span>
                  <span className="font-bold text-cyan-400">
                    {Math.round(engine.cht)}°F / {Math.round(engine.egt)}°F
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">OIL:</span>
                  <span className="font-bold text-cyan-400">
                    {engine.oil_press.toFixed(1)} PSI · {Math.round(engine.oil_temp_degf)}°F
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">BUS:</span>
                  <span className="font-bold text-cyan-400">{engine.bus_voltage_v.toFixed(1)}V</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">VIBRATION:</span>
                  <span className="font-bold text-cyan-400">
                    {engine.vibration_bands.rms_g.toFixed(2)}g RMS
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">ESTIMATED RUL:</span>
                <span className="font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  {Math.floor(diagnostics.rul_seconds / 60)}m {diagnostics.rul_seconds % 60}s (±
                  {Math.floor(diagnostics.rul_uncertainty_seconds / 60)}m)
                </span>
              </div>
            </div>

            {/* Quick Action Prompt Chips (Fullscreen) */}
            <div
              className={`p-3 flex flex-wrap gap-2 border-b ${
                isDark ? 'bg-black/15 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <button
                onClick={() => handleSend('Explain current fault in plain language.')}
                disabled={isCopilotLoading}
                className="text-xs font-mono-telemetry px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
              >
                Explain current fault
              </button>
              <button
                onClick={() => handleSend('What should the GCS pilot and maintenance crew do next?')}
                disabled={isCopilotLoading}
                className="text-xs font-mono-telemetry px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
              >
                What to do next?
              </button>
              <button
                onClick={() => handleSend('Summarize this flight telemetry for the post-mission maintenance log.')}
                disabled={isCopilotLoading}
                className="text-xs font-mono-telemetry px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
              >
                Summarize for log
              </button>
              <button
                onClick={() =>
                  handleSend('Evaluate thermal margins for CHT and EGT against operational redline limits.')
                }
                disabled={isCopilotLoading}
                className="text-xs font-mono-telemetry px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
              >
                Check thermal margins
              </button>
              <button
                onClick={() =>
                  handleSend('Analyze vibration RMS and harmonic spectrum for mechanical imbalance or misfire.')
                }
                disabled={isCopilotLoading}
                className="text-xs font-mono-telemetry px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
              >
                Analyze vibration spectrum
              </button>
              <button
                onClick={() =>
                  handleSend('Generate immediate emergency procedures checklist for the active condition.')
                }
                disabled={isCopilotLoading}
                className="text-xs font-mono-telemetry px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
              >
                Emergency checklist
              </button>
            </div>

            {/* Fullscreen Messages Area */}
            <div
              className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 font-mono-telemetry text-xs sm:text-sm ${
                isDark ? 'bg-[#060911]' : 'bg-slate-100/70'
              }`}
            >
              {copilotMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      {isUser ? (
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Bot className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span className="font-bold">
                        {isUser ? 'GCS OPERATOR' : 'PHOENIX-DT PROPULSION COPILOT'}
                      </span>
                      <span>• {msg.timestamp}</span>
                    </div>
                    <div
                      className={`p-3.5 rounded-xl max-w-[85%] whitespace-pre-wrap leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-cyan-600/25 text-cyan-100 border border-cyan-500/40'
                          : isDark
                          ? 'bg-slate-900/90 text-slate-200 border border-slate-800'
                          : 'bg-white text-slate-800 border border-slate-200'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              {isCopilotLoading && (
                <div className="flex items-center gap-2 text-cyan-400 text-xs sm:text-sm py-2 px-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 max-w-fit">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing propulsion telemetry and evaluating diagnostic matrices...</span>
                </div>
              )}
              <div ref={fsMessagesEndRef} />
            </div>

            {/* Fullscreen Input Footer */}
            <div
              className={`p-3 sm:p-4 border-t flex flex-col sm:flex-row gap-2.5 ${
                isDark ? 'bg-[#090D18] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="relative flex-1">
                <input
                  ref={fsInputRef}
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  placeholder="Ask PHOENIX-DT Copilot about engine health, troubleshooting, or emergency procedures... (Press Enter to send)"
                  className={`w-full rounded-lg px-4 py-2.5 text-xs sm:text-sm font-mono-telemetry outline-none border transition-all ${
                    isDark
                      ? 'bg-black/40 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600/30'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSend()}
                  disabled={!inputPrompt.trim() || isCopilotLoading}
                  className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs sm:text-sm font-mono-telemetry font-bold transition-all disabled:opacity-40 flex items-center gap-2 shadow-md shadow-cyan-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>TRANSMIT PROMPT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
