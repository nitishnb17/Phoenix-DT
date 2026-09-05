import { useMemo, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-dist-min';
import {
  Clock,
  Film,
  GitCompare,
  History,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useAppStore } from '../lib/store';

const Plot = createPlotlyComponent(Plotly);

export function MissionReplay() {
  const {
    missionHistory,
    isReplaying,
    replayMissionId,
    replayScrubSec,
    activeReplayFrame,
    startReplay,
    setReplayScrubSec,
    exitReplay,
    compareMissionIds,
    setCompareMissionIds,
    theme,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'REPLAY' | 'COMPARE'>('REPLAY');
  const [selectedMissionId, setSelectedMissionId] = useState<string>(missionHistory[0]?.id || '');

  const isDark = theme === 'dark';
  const panelBg = isDark ? 'bg-[#1A2233] border-[#2A3548]' : 'bg-white border-slate-200 shadow-sm';
  const headerText = isDark ? 'text-[#8FA0BC]' : 'text-slate-500';
  const textColor = isDark ? '#8FA0BC' : '#64748B';
  const gridColor = isDark ? '#1E2738' : '#E2E8F0';

  const currentMission = useMemo(() => {
    return missionHistory.find((m) => m.id === (isReplaying ? replayMissionId : selectedMissionId)) || missionHistory[0];
  }, [missionHistory, isReplaying, replayMissionId, selectedMissionId]);

  const missionA = useMemo(() => missionHistory.find((m) => m.id === compareMissionIds[0]) || missionHistory[0], [missionHistory, compareMissionIds]);
  const missionB = useMemo(() => missionHistory.find((m) => m.id === compareMissionIds[1]) || missionHistory[1] || missionHistory[0], [missionHistory, compareMissionIds]);

  const comparisonPlotData = useMemo(() => {
    const dataA = missionA?.frames?.length > 0
      ? missionA.frames.map((f) => f.diagnostics.health_index_pct)
      : [100, 98, 92, 85, 78];
    const dataB = missionB?.frames?.length > 0
      ? missionB.frames.map((f) => f.diagnostics.health_index_pct)
      : [100, 95, 75, 58, 52];

    const timeA = missionA?.frames?.length > 0 ? missionA.frames.map((f) => `${f.timeSec}s`) : ['0s', '30s', '60s', '90s', '120s'];
    const timeB = missionB?.frames?.length > 0 ? missionB.frames.map((f) => `${f.timeSec}s`) : ['0s', '25s', '50s', '75s', '95s'];

    return [
      {
        x: timeA,
        y: dataA,
        type: 'scatter' as const,
        mode: 'lines+markers' as const,
        name: `${missionA?.name || 'Mission A'}`,
        line: { color: '#06B6D4', width: 2.5 },
      },
      {
        x: timeB,
        y: dataB,
        type: 'scatter' as const,
        mode: 'lines+markers' as const,
        name: `${missionB?.name || 'Mission B'}`,
        line: { color: '#EF4444', width: 2.5, dash: 'dash' },
      },
    ];
  }, [missionA, missionB]);

  const maxDuration = Math.max(1, currentMission?.durationSeconds || 60);

  return (
    <div className={`w-full flex flex-col gap-3 p-3.5 rounded-lg border ${panelBg}`}>
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-2.5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h3 className={`text-xs font-bold tracking-wider uppercase ${headerText}`}>
            MISSION BLACK-BOX &amp; SYNCHRONIZED REPLAY
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('REPLAY')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono-telemetry uppercase border transition-all ${
              activeTab === 'REPLAY' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold' : 'bg-black/20 text-slate-400 border-slate-700'
            }`}
          >
            REPLAY TIMELINE
          </button>
          <button
            onClick={() => setActiveTab('COMPARE')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono-telemetry uppercase border transition-all ${
              activeTab === 'COMPARE' ? 'bg-purple-500/20 text-purple-300 border-purple-400 font-bold' : 'bg-black/20 text-slate-400 border-slate-700'
            }`}
          >
            2-MISSION COMPARE
          </button>
        </div>
      </div>

      {activeTab === 'REPLAY' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase ${headerText}`}>SELECT FLIGHT RECORD:</span>
              <select
                value={isReplaying ? (replayMissionId || '') : selectedMissionId}
                onChange={(e) => {
                  setSelectedMissionId(e.target.value);
                  if (isReplaying) startReplay(e.target.value);
                }}
                className="px-2 py-1 rounded bg-black/30 border border-slate-700 text-xs font-mono-telemetry text-cyan-300"
              >
                {missionHistory.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.timestamp})
                  </option>
                ))}
              </select>
            </div>

            {!isReplaying ? (
              <button
                onClick={() => startReplay(selectedMissionId || missionHistory[0]?.id)}
                className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400 hover:bg-cyan-500/30 text-xs font-mono-telemetry font-bold flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> LAUNCH SYNCHRONIZED REPLAY
              </button>
            ) : (
              <button
                onClick={exitReplay}
                className="px-3 py-1 rounded bg-red-500/20 text-red-300 border border-red-500 hover:bg-red-500/30 text-xs font-mono-telemetry font-bold flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" /> EXIT REPLAY MODE
              </button>
            )}
          </div>

          {isReplaying && (
            <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/40 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono-telemetry">
                <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5" /> REPLAY SCRUBBER: T+{replayScrubSec}s / {maxDuration}s
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400">
                  REPLAY ACTIVE
                </span>
              </div>

              <input
                type="range"
                min="0"
                max={maxDuration}
                step="1"
                value={replayScrubSec}
                onChange={(e) => setReplayScrubSec(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />

              {activeReplayFrame && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono-telemetry">
                  <div className="p-1.5 rounded bg-black/30 border border-slate-700/50">
                    <span className="text-[9px] text-slate-400 block">HEALTH INDEX</span>
                    <span className="font-bold text-cyan-400">{activeReplayFrame.diagnostics.health_index_pct}%</span>
                  </div>
                  <div className="p-1.5 rounded bg-black/30 border border-slate-700/50">
                    <span className="text-[9px] text-slate-400 block">RPM / CHT</span>
                    <span className="font-bold text-slate-200">{activeReplayFrame.engine.rpm} / {activeReplayFrame.engine.cht}°F</span>
                  </div>
                  <div className="p-1.5 rounded bg-black/30 border border-slate-700/50">
                    <span className="text-[9px] text-slate-400 block">OIL PRESS / TEMP</span>
                    <span className="font-bold text-slate-200">{activeReplayFrame.engine.oil_press} PSI / {activeReplayFrame.engine.oil_temp_degf}°F</span>
                  </div>
                  <div className="p-1.5 rounded bg-black/30 border border-slate-700/50">
                    <span className="text-[9px] text-slate-400 block">AI VERDICT</span>
                    <span className="font-bold text-amber-300">{activeReplayFrame.diagnostics.classified_fault}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1 text-[11px] font-mono-telemetry text-slate-400">
            <span className="font-bold text-slate-300">HISTORICAL FLIGHT SUMMARY:</span>
            <div className="flex flex-wrap gap-4 text-[10px]">
              <span>Duration: {currentMission?.durationSeconds}s</span>
              <span>Peak Fault Severity: {currentMission?.peakSeverityPct}%</span>
              <span>Final Health: {currentMission?.finalHealthIndexPct}%</span>
              <span>Events Logged: {currentMission?.faultsEncountered?.join(', ')}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'COMPARE' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-cyan-400 uppercase">MISSION A:</span>
              <select
                value={compareMissionIds[0] || ''}
                onChange={(e) => setCompareMissionIds([e.target.value, compareMissionIds[1]])}
                className="px-2 py-1 rounded bg-black/30 border border-slate-700 text-xs font-mono-telemetry text-cyan-300"
              >
                {missionHistory.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-red-400 uppercase">MISSION B:</span>
              <select
                value={compareMissionIds[1] || ''}
                onChange={(e) => setCompareMissionIds([compareMissionIds[0], e.target.value])}
                className="px-2 py-1 rounded bg-black/30 border border-slate-700 text-xs font-mono-telemetry text-red-300"
              >
                {missionHistory.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-[180px] w-full">
            <Plot
              data={comparisonPlotData as any}
              layout={{
                autosize: true,
                margin: { l: 40, r: 20, t: 10, b: 25, pad: 0 },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                showlegend: true,
                legend: { orientation: 'h' as const, y: 1.15, x: 0, font: { size: 10, color: textColor } },
                xaxis: { showgrid: true, gridcolor: gridColor, zeroline: false, tickfont: { size: 9, color: textColor } },
                yaxis: { showgrid: true, gridcolor: gridColor, zeroline: false, tickfont: { size: 9, color: textColor }, title: { text: 'Health Index %', font: { size: 9, color: textColor } }, range: [0, 105] },
              } as any}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
