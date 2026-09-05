import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  ShieldAlert,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { formatRulWithUncertainty } from '../lib/diagnostics';

export function DiagnosticsCard() {
  const { diagnostics, theme, fuelRemainingGal, validationMetrics } = useAppStore();
  const [activeSubTab, setActiveSubTab] = useState<'HYBRID' | 'EXPLAINABILITY' | 'VALIDATION'>('HYBRID');

  const isDark = theme === 'dark';
  const panelBg = isDark ? 'bg-[#111827] border-[#1F293D]' : 'bg-white border-slate-200 shadow-xs';
  const subCardBg = isDark ? 'bg-[#0B0F19] border-[#1E293B]' : 'bg-slate-50 border-slate-200';

  const healthPct = diagnostics.health_index_pct;
  const isNominal = healthPct >= 80;
  const isWarning = healthPct < 80 && healthPct >= 50;
  const isCritical = healthPct < 50 || diagnostics.is_critical_seizure;

  let healthBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let rulColor = 'text-emerald-400';

  if (isCritical) {
    healthBadge = 'bg-red-500/10 text-red-400 border-red-500/30';
    rulColor = 'text-red-400';
  } else if (isWarning) {
    healthBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    rulColor = 'text-amber-400';
  }

  const maxZ = useMemo(() => {
    return Math.max(3.0, ...diagnostics.z_scores.map((s) => s.zScore));
  }, [diagnostics.z_scores]);

  return (
    <div className={`w-full flex flex-col gap-3 p-3.5 rounded-lg border ${panelBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold tracking-wider uppercase text-slate-300">
            HYBRID AI / ML HEALTH &amp; DIAGNOSTICS
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono-telemetry text-[10px]">
          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
            D_M: {diagnostics.anomaly_distance}
          </span>
          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
            CONFIDENCE: {diagnostics.hybrid_confidence_pct}%
          </span>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Propulsion Health */}
        <div className={`p-3 rounded-lg border flex flex-col justify-between ${subCardBg}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              PROPULSION HEALTH
            </span>
            {isNominal ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : isCritical ? (
              <ShieldAlert className="w-4 h-4 text-red-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="my-1.5 flex items-baseline justify-between font-mono-telemetry">
            <span className={`text-2xl font-bold ${isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-100'}`}>
              {healthPct}%
            </span>
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${healthBadge}`}>
              {isNominal ? 'NOMINAL' : isCritical ? 'CRITICAL' : 'DEGRADED'}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${healthPct}%` }}
            />
          </div>
        </div>

        {/* Hybrid Classifier Verdict */}
        <div className={`p-3 rounded-lg border flex flex-col justify-between ${subCardBg}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              CLASSIFIED CONDITION
            </span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-1.5">
            <span
              className={`inline-block text-[11px] font-mono-telemetry font-bold px-2 py-0.5 rounded border ${
                isCritical
                  ? 'bg-red-500/10 text-red-300 border-red-500/30'
                  : isWarning
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
              }`}
            >
              {diagnostics.classified_fault.replace(/_/g, ' ')}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono-telemetry truncate">
            Stat: {diagnostics.statistical_verdict} · ML: {diagnostics.learned_verdict}
          </span>
        </div>

        {/* Safety RUL */}
        <div className={`p-3 rounded-lg border flex flex-col justify-between ${subCardBg}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              REMAINING USEFUL LIFE (RUL ± σ)
            </span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-1.5 flex flex-col font-mono-telemetry">
            <span className={`text-lg font-bold ${rulColor}`}>
              {formatRulWithUncertainty(diagnostics.rul_seconds, diagnostics.rul_uncertainty_seconds)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono-telemetry">
            Fuel Endurance Margin: {fuelRemainingGal.toFixed(1)} GAL
          </span>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-black/20 rounded-md border border-slate-700/40 text-[10px] font-mono-telemetry">
        <button
          onClick={() => setActiveSubTab('HYBRID')}
          className={`py-1 rounded text-center transition-all ${
            activeSubTab === 'HYBRID' ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Hybrid Architecture
        </button>
        <button
          onClick={() => setActiveSubTab('EXPLAINABILITY')}
          className={`py-1 rounded text-center transition-all ${
            activeSubTab === 'EXPLAINABILITY' ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Z-Score Anomaly Drivers
        </button>
        <button
          onClick={() => setActiveSubTab('VALIDATION')}
          className={`py-1 rounded text-center transition-all ${
            activeSubTab === 'VALIDATION' ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          DRDO Benchmark Metrics
        </button>
      </div>

      {/* 1. Hybrid Model Details */}
      {activeSubTab === 'HYBRID' && (
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-2.5 rounded-lg border ${subCardBg} flex flex-col gap-1`}>
              <span className="text-[10px] font-bold uppercase text-cyan-400 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Statistical Pipeline
              </span>
              <span className="text-xs font-mono-telemetry font-bold text-slate-200">
                {diagnostics.statistical_verdict.replace(/_/g, ' ')}
              </span>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Mahalanobis metric ($D_M = {diagnostics.anomaly_distance}$) incorporating sensor covariance matrices and rolling gradient deltas.
              </p>
            </div>

            <div className={`p-2.5 rounded-lg border ${subCardBg} flex flex-col gap-1`}>
              <span className="text-[10px] font-bold uppercase text-purple-400 flex items-center gap-1">
                <Brain className="w-3 h-3" /> Learned Classifier
              </span>
              <span className="text-xs font-mono-telemetry font-bold text-purple-300">
                {diagnostics.learned_verdict.replace(/_/g, ' ')}
              </span>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Client-side Softmax classification model evaluated over normalized multi-sensor feature tensors.
              </p>
            </div>
          </div>

          <div className={`flex flex-col gap-1.5 p-2.5 rounded-lg border ${subCardBg}`}>
            <div className="flex items-center justify-between text-[10px] font-mono-telemetry text-slate-400">
              <span className="font-bold uppercase">Softmax Probability Distribution</span>
              <span>Top Fault Candidates</span>
            </div>
            {diagnostics.learned_probabilities.slice(0, 4).map((p) => (
              <div key={p.faultName} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[10.5px] font-mono-telemetry">
                  <span className="text-slate-300">{p.faultName.replace(/_/g, ' ')}</span>
                  <span className="text-purple-300 font-bold">{(p.probability * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${Math.max(3, p.probability * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Z-Score Anomaly Drivers */}
      {activeSubTab === 'EXPLAINABILITY' && (
        <div className={`flex flex-col gap-2 p-2.5 rounded-lg border ${subCardBg} max-h-56 overflow-y-auto`}>
          {diagnostics.z_scores.map((score) => {
            const zNorm = Math.min(100, (score.zScore / maxZ) * 100);
            const isDriver = score.zScore > 2.0;
            const barColor = isDriver
              ? score.zScore > 4.0
                ? 'bg-red-500'
                : 'bg-amber-400'
              : 'bg-cyan-500';

            return (
              <div key={score.sensor} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-xs font-mono-telemetry">
                  <span className={`font-semibold text-[10.5px] ${isDriver ? 'text-amber-300' : 'text-slate-300'}`}>
                    {score.sensor} {isDriver && '⚠️ [ANOMALY DRIVER]'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      raw: {score.raw}
                    </span>
                    <span className={`font-bold text-[10.5px] ${isDriver ? 'text-amber-400' : 'text-cyan-400'}`}>
                      |Z| = {score.zScore.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${Math.max(4, zNorm)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Validation Metrics */}
      {activeSubTab === 'VALIDATION' && (
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className={`p-2 rounded ${subCardBg} flex flex-col items-center`}>
              <span className="text-[9px] text-slate-400 font-mono-telemetry uppercase">Precision</span>
              <span className="text-base font-bold text-emerald-400 font-mono-telemetry">
                {validationMetrics.precisionPct}%
              </span>
            </div>
            <div className={`p-2 rounded ${subCardBg} flex flex-col items-center`}>
              <span className="text-[9px] text-slate-400 font-mono-telemetry uppercase">Recall</span>
              <span className="text-base font-bold text-cyan-400 font-mono-telemetry">
                {validationMetrics.recallPct}%
              </span>
            </div>
            <div className={`p-2 rounded ${subCardBg} flex flex-col items-center`}>
              <span className="text-[9px] text-slate-400 font-mono-telemetry uppercase">False Alarm Rate</span>
              <span className="text-base font-bold text-amber-400 font-mono-telemetry">
                {validationMetrics.falseAlarmRatePct}%
              </span>
            </div>
            <div className={`p-2 rounded ${subCardBg} flex flex-col items-center`}>
              <span className="text-[9px] text-slate-400 font-mono-telemetry uppercase">Mean Latency</span>
              <span className="text-base font-bold text-purple-400 font-mono-telemetry">
                {validationMetrics.meanLatencySeconds}s
              </span>
            </div>
          </div>

          <div className={`flex flex-col gap-1 p-2 rounded ${subCardBg} text-[10px] font-mono-telemetry`}>
            <span className="text-slate-400 font-bold uppercase flex items-center gap-1 mb-1">
              <Target className="w-3 h-3 text-cyan-400" /> Ground-Truth Benchmark Telemetry Log
            </span>
            <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
              {validationMetrics.recentDetections.map((d, i) => (
                <div key={`${d.timestamp}-${d.injectedFault}-${i}`} className="flex items-center justify-between border-b border-slate-800 pb-0.5">
                  <span className="text-slate-400">{d.timestamp}</span>
                  <span className="text-amber-300">INJ: {d.injectedFault}</span>
                  <span className={d.isCorrect ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    DET: {d.detectedFault}
                  </span>
                  <span className="text-cyan-400">{d.latencySec}s</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
