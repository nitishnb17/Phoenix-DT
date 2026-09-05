import { useMemo } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-dist-min';
import { Activity, BatteryCharging, Flame, Gauge, GaugeCircle, Sparkles, Thermometer, Waves, Zap } from 'lucide-react';
import { useAppStore } from '../lib/store';

const Plot = createPlotlyComponent(Plotly);

export function TelemetryCharts() {
  const { engine, telemetryHistory, theme, isLinkLossActive, uptimeSeconds, linkLossUntilSec, faults } = useAppStore();

  const isDark = theme === 'dark';
  const panelBg = isDark ? 'bg-[#1A2233] border-[#2A3548]' : 'bg-white border-slate-200 shadow-sm';
  const subBg = isDark ? '#121826' : '#F8FAFC';
  const gridColor = isDark ? '#1E2738' : '#E2E8F0';
  const textColor = isDark ? '#8FA0BC' : '#64748B';

  const commonLayout = useMemo(() => ({
    autosize: true,
    margin: { l: 40, r: 20, t: 10, b: 25, pad: 0 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    showlegend: true,
    legend: {
      orientation: 'h' as const,
      y: 1.15,
      x: 0,
      font: { size: 10, color: textColor },
    },
    xaxis: {
      showgrid: true,
      gridcolor: gridColor,
      zeroline: false,
      tickfont: { size: 9, color: textColor },
      showticklabels: false,
    },
    yaxis: {
      showgrid: true,
      gridcolor: gridColor,
      zeroline: false,
      tickfont: { size: 9, color: textColor },
    },
  }), [gridColor, textColor]);

  const timestamps = telemetryHistory.timestamps;

  const chtEgtData = useMemo(() => [
    {
      x: timestamps,
      y: telemetryHistory.cht,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'CHT (°F)',
      line: { color: '#F59E0B', width: 2 },
    },
    {
      x: timestamps,
      y: telemetryHistory.egt,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'EGT Reported (°F)',
      line: { color: '#EF4444', width: 2 },
    },
    {
      x: timestamps,
      y: telemetryHistory.egtActual,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'EGT Actual (°F)',
      line: { color: '#06B6D4', width: 1.5, dash: 'dot' },
    },
  ], [timestamps, telemetryHistory.cht, telemetryHistory.egt, telemetryHistory.egtActual]);

  const oilSystemData = useMemo(() => [
    {
      x: timestamps,
      y: telemetryHistory.oilPress,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Oil Pressure (PSI)',
      line: { color: '#38BDF8', width: 2 },
    },
    {
      x: timestamps,
      y: telemetryHistory.oilTemp,
      yaxis: 'y2',
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Oil Temp (°F)',
      line: { color: '#F97316', width: 2 },
    },
  ], [timestamps, telemetryHistory.oilPress, telemetryHistory.oilTemp]);

  const vibrationSpectrumData = useMemo(() => [
    {
      x: ['1x RPM Harmonic', '2x RPM Harmonic', 'High-Freq Floor', 'Total RMS'],
      y: [
        engine.vibration_bands.harmonic_1x_g,
        engine.vibration_bands.harmonic_2x_g,
        engine.vibration_bands.high_freq_g,
        engine.vibration_bands.rms_g,
      ],
      type: 'bar' as const,
      marker: {
        color: [
          '#06B6D4',
          '#3B82F6',
          engine.vibration_bands.high_freq_g > 0.45 ? '#EF4444' : '#8B5CF6',
          '#10B981',
        ],
      },
    },
  ], [engine.vibration_bands]);

  const electricalData = useMemo(() => [
    {
      x: timestamps,
      y: telemetryHistory.busVoltage,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Bus Voltage (V DC)',
      line: { color: '#10B981', width: 2 },
    },
    {
      x: timestamps,
      y: telemetryHistory.chargingCurrent,
      yaxis: 'y2',
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Current (A)',
      line: { color: '#EAB308', width: 1.5, dash: 'dot' },
    },
  ], [timestamps, telemetryHistory.busVoltage, telemetryHistory.chargingCurrent]);

  // Per-channel anomaly & fault detection states
  const isChtAnomaly = engine.cht > 380 || faults.misfire_severity > 0;
  const isChtWarning = !isChtAnomaly && engine.cht > 360;

  const isEgtAnomaly = engine.egt > 1500 || faults.sensor_drift_severity > 0 || faults.combustion_instability_severity > 0;
  const isEgtWarning = !isEgtAnomaly && (engine.egt > 1420 || faults.coking_degradation_severity > 30);

  const isCriticalSeizure = engine.oil_press < 15;
  const isOilAnomaly = isCriticalSeizure || faults.oil_leak_severity > 0 || engine.oil_press < 30 || engine.oil_temp_degf > 240 || faults.lubrication_degradation_severity > 40;
  const isOilWarning = !isOilAnomaly && (engine.oil_press < 40 || engine.oil_temp_degf > 220 || faults.lubrication_degradation_severity > 15);

  const isElecAnomaly = faults.electrical_fault_severity > 0 || engine.bus_voltage_v < 24.0;
  const isElecWarning = !isElecAnomaly && (engine.bus_voltage_v < 26.0 || engine.charging_current_a > 26.0);

  const isVibAnomaly = engine.vibration_bands.high_freq_g > 0.45 || engine.vibration_bands.rms_g > 1.25;
  const isVibWarning = !isVibAnomaly && (engine.vibration_bands.high_freq_g > 0.35 || engine.vibration_bands.rms_g > 1.0);

  const isInjAnomaly = faults.injector_clog_severity > 0 || faults.coking_degradation_severity > 50 || Math.abs(engine.injection_timing_deg - 24.0) > 3.5;
  const isInjWarning = !isInjAnomaly && (faults.coking_degradation_severity > 20 || Math.abs(engine.injection_timing_deg - 24.0) > 1.5);

  return (
    <div className={`w-full flex flex-col gap-4 relative ${isLinkLossActive ? 'opacity-50 grayscale' : ''}`}>
      {isLinkLossActive && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center rounded-lg border border-red-500/80 p-4">
          <div className="flex items-center gap-2 text-red-400 font-mono-telemetry font-bold text-sm animate-pulse">
            <Activity className="w-5 h-5" />
            <span>STALE DATA — LAST UPDATE {Math.max(1, linkLossUntilSec - uptimeSeconds)}s AGO</span>
          </div>
          <p className="text-xs text-slate-300 font-mono-telemetry mt-1">
            SIMULATED LINK LOSS ACTIVE | FREEZING TELEMETRY STREAM
          </p>
        </div>
      )}

      {/* Primary Telemetry Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* 1. CHT Card */}
        <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all relative overflow-hidden ${
          isChtAnomaly
            ? 'active-fault-glow border-red-500'
            : isChtWarning
            ? 'active-warning-glow border-amber-500'
            : panelBg
        }`}>
          <div className="flex items-center justify-between text-xs text-[#8FA0BC] font-mono-telemetry">
            <span className="flex items-center gap-1 uppercase font-bold text-[10px]">
              <Thermometer className={`w-3 h-3 ${isChtAnomaly ? 'text-red-400 animate-bounce' : 'text-amber-400'}`} /> CHT TEMP
            </span>
            {isChtAnomaly ? (
              <span className="text-[8px] bg-red-500/80 text-white font-bold px-1 rounded uppercase">ANOMALY</span>
            ) : isChtWarning ? (
              <span className="text-[8px] bg-amber-500/80 text-slate-950 font-bold px-1 rounded uppercase">WARN</span>
            ) : (
              <span className="text-[9px]">320°F NOM</span>
            )}
          </div>
          <div className="mt-1 flex items-baseline justify-between font-mono-telemetry">
            <span className={`text-lg font-bold ${isChtAnomaly ? 'text-red-400' : isChtWarning ? 'text-amber-400' : 'text-slate-100'}`}>
              {engine.cht}
            </span>
            <span className="text-[10px] text-[#8FA0BC]">°F</span>
          </div>
        </div>

        {/* 2. EGT Card */}
        <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all relative overflow-hidden ${
          isEgtAnomaly
            ? 'active-fault-glow border-red-500'
            : isEgtWarning
            ? 'active-warning-glow border-amber-500'
            : panelBg
        }`}>
          <div className="flex items-center justify-between text-xs text-[#8FA0BC] font-mono-telemetry">
            <span className="flex items-center gap-1 uppercase font-bold text-[10px]">
              <Flame className={`w-3 h-3 ${isEgtAnomaly ? 'text-red-400 animate-pulse' : 'text-orange-400'}`} /> EGT TEMP
            </span>
            {isEgtAnomaly ? (
              <span className="text-[8px] bg-red-500/80 text-white font-bold px-1 rounded uppercase">ANOMALY</span>
            ) : isEgtWarning ? (
              <span className="text-[8px] bg-amber-500/80 text-slate-950 font-bold px-1 rounded uppercase">ELEVATED</span>
            ) : (
              <span className="text-[9px]">1300°F NOM</span>
            )}
          </div>
          <div className="mt-1 flex items-baseline justify-between font-mono-telemetry">
            <span className={`text-lg font-bold ${isEgtAnomaly ? 'text-red-400' : isEgtWarning ? 'text-amber-400' : 'text-slate-100'}`}>
              {engine.egt}
            </span>
            <span className="text-[10px] text-[#8FA0BC]">°F</span>
          </div>
        </div>

        {/* 3. Oil System Card */}
        <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all relative overflow-hidden ${
          isCriticalSeizure
            ? 'active-fault-glow border-red-600 ring-2 ring-red-500/50'
            : isOilAnomaly
            ? 'active-fault-glow border-red-500'
            : isOilWarning
            ? 'active-warning-glow border-amber-500'
            : panelBg
        }`}>
          <div className="flex items-center justify-between text-xs text-[#8FA0BC] font-mono-telemetry">
            <span className="flex items-center gap-1 uppercase font-bold text-[10px]">
              <Gauge className={`w-3 h-3 ${isOilAnomaly ? 'text-red-400 animate-bounce' : 'text-sky-400'}`} /> OIL SYSTEM
            </span>
            {isCriticalSeizure ? (
              <span className="text-[8px] bg-red-600 text-white font-black px-1 rounded animate-pulse uppercase">SEIZURE</span>
            ) : isOilAnomaly ? (
              <span className="text-[8px] bg-red-500/80 text-white font-bold px-1 rounded uppercase">FAULT</span>
            ) : isOilWarning ? (
              <span className="text-[8px] bg-amber-500/80 text-slate-950 font-bold px-1 rounded uppercase">DEGRADED</span>
            ) : (
              <span className="text-[9px] text-cyan-400">{engine.lubrication_health_score}%</span>
            )}
          </div>
          <div className="mt-1 flex items-baseline justify-between font-mono-telemetry">
            <span className={`text-lg font-bold ${isOilAnomaly ? 'text-red-400' : isOilWarning ? 'text-amber-400' : 'text-slate-100'}`}>
              {engine.oil_press}
            </span>
            <span className="text-[10px] text-[#8FA0BC]">PSI / {engine.oil_temp_degf}°F</span>
          </div>
        </div>

        {/* 4. Bus Power Card */}
        <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all relative overflow-hidden ${
          isElecAnomaly
            ? 'active-fault-glow border-red-500'
            : isElecWarning
            ? 'active-warning-glow border-amber-500'
            : panelBg
        }`}>
          <div className="flex items-center justify-between text-xs text-[#8FA0BC] font-mono-telemetry">
            <span className="flex items-center gap-1 uppercase font-bold text-[10px]">
              <BatteryCharging className={`w-3 h-3 ${isElecAnomaly ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} /> BUS POWER
            </span>
            {isElecAnomaly ? (
              <span className="text-[8px] bg-red-500/80 text-white font-bold px-1 rounded uppercase">SAG FAULT</span>
            ) : isElecWarning ? (
              <span className="text-[8px] bg-amber-500/80 text-slate-950 font-bold px-1 rounded uppercase">UNSTABLE</span>
            ) : (
              <span className="text-[9px]">28V DC NOM</span>
            )}
          </div>
          <div className="mt-1 flex items-baseline justify-between font-mono-telemetry">
            <span className={`text-lg font-bold ${isElecAnomaly ? 'text-red-400' : isElecWarning ? 'text-amber-400' : 'text-slate-100'}`}>
              {engine.bus_voltage_v}
            </span>
            <span className="text-[10px] text-[#8FA0BC]">V / {engine.charging_current_a}A</span>
          </div>
        </div>

        {/* 5. Vibration RMS Card */}
        <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all relative overflow-hidden ${
          isVibAnomaly
            ? 'active-fault-glow border-red-500'
            : isVibWarning
            ? 'active-warning-glow border-amber-500'
            : panelBg
        }`}>
          <div className="flex items-center justify-between text-xs text-[#8FA0BC] font-mono-telemetry">
            <span className="flex items-center gap-1 uppercase font-bold text-[10px]">
              <Waves className={`w-3 h-3 ${isVibAnomaly ? 'text-red-400 animate-pulse' : 'text-purple-400'}`} /> VIB RMS
            </span>
            {isVibAnomaly ? (
              <span className="text-[8px] bg-red-500/80 text-white font-bold px-1 rounded uppercase">BEARING WEAR</span>
            ) : isVibWarning ? (
              <span className="text-[8px] bg-amber-500/80 text-slate-950 font-bold px-1 rounded uppercase">HIGH HARMONIC</span>
            ) : (
              <span className="text-[9px]">0.85g NOM</span>
            )}
          </div>
          <div className="mt-1 flex items-baseline justify-between font-mono-telemetry">
            <span className={`text-lg font-bold ${isVibAnomaly ? 'text-red-400' : isVibWarning ? 'text-amber-400' : 'text-slate-100'}`}>
              {engine.vibration_bands.rms_g}
            </span>
            <span className="text-[10px] text-[#8FA0BC]">g (HF: {engine.vibration_bands.high_freq_g}g)</span>
          </div>
        </div>

        {/* 6. Injection Timing Card */}
        <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all relative overflow-hidden ${
          isInjAnomaly
            ? 'active-fault-glow border-red-500'
            : isInjWarning
            ? 'active-warning-glow border-amber-500'
            : panelBg
        }`}>
          <div className="flex items-center justify-between text-xs text-[#8FA0BC] font-mono-telemetry">
            <span className="flex items-center gap-1 uppercase font-bold text-[10px]">
              <Zap className={`w-3 h-3 ${isInjAnomaly ? 'text-red-400 animate-bounce' : 'text-cyan-400'}`} /> INJ TIMING
            </span>
            {isInjAnomaly ? (
              <span className="text-[8px] bg-red-500/80 text-white font-bold px-1 rounded uppercase">CLOG / COKING</span>
            ) : isInjWarning ? (
              <span className="text-[8px] bg-amber-500/80 text-slate-950 font-bold px-1 rounded uppercase">DRIFT</span>
            ) : (
              <span className="text-[9px]">24° BTDC</span>
            )}
          </div>
          <div className="mt-1 flex items-baseline justify-between font-mono-telemetry">
            <span className={`text-lg font-bold ${isInjAnomaly ? 'text-red-400' : isInjWarning ? 'text-amber-400' : 'text-slate-100'}`}>
              {engine.injection_timing_deg}°
            </span>
            <span className="text-[10px] text-[#8FA0BC]">{engine.rpm} RPM</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Thermodynamics Chart Panel */}
        <div className={`p-3 rounded-lg border transition-all ${
          isChtAnomaly || isEgtAnomaly
            ? 'active-fault-glow border-red-500/80'
            : isChtWarning || isEgtWarning
            ? 'active-warning-glow border-amber-500/80'
            : panelBg
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold tracking-wider uppercase text-[#8FA0BC] flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              THERMODYNAMICS (CHT &amp; EGT SENSOR TWIN)
            </h4>
            <div className="flex items-center gap-2">
              {(isChtAnomaly || isEgtAnomaly) && (
                <span className="text-[9px] bg-red-500 text-white font-mono-telemetry font-bold px-1.5 py-0.2 rounded uppercase animate-pulse">
                  THERMAL FAULT
                </span>
              )}
              <span className="text-[10px] text-cyan-400 font-mono-telemetry">LIVE STREAM</span>
            </div>
          </div>
          <div className="h-[175px] w-full">
            <Plot
              data={chtEgtData as any}
              layout={{
                ...commonLayout,
                yaxis: { ...commonLayout.yaxis, title: { text: '°F', font: { size: 9, color: textColor } } },
              } as any}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

        {/* Lubrication Dynamics Chart Panel */}
        <div className={`p-3 rounded-lg border transition-all ${
          isOilAnomaly
            ? 'active-fault-glow border-red-500/80'
            : isOilWarning
            ? 'active-warning-glow border-amber-500/80'
            : panelBg
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold tracking-wider uppercase text-[#8FA0BC] flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              LUBRICATION DYNAMICS (OIL PRESSURE &amp; TEMP)
            </h4>
            <div className="flex items-center gap-2">
              {isOilAnomaly && (
                <span className="text-[9px] bg-red-500 text-white font-mono-telemetry font-bold px-1.5 py-0.2 rounded uppercase animate-pulse">
                  OIL DEGRADED
                </span>
              )}
              <span className="text-[10px] text-cyan-400 font-mono-telemetry">
                HEALTH: {engine.lubrication_health_score}%
              </span>
            </div>
          </div>
          <div className="h-[175px] w-full">
            <Plot
              data={oilSystemData as any}
              layout={{
                ...commonLayout,
                yaxis: { ...commonLayout.yaxis, title: { text: 'PSI', font: { size: 9, color: textColor } }, range: [0, 60] },
                yaxis2: {
                  title: { text: '°F', font: { size: 9, color: '#F97316' } },
                  overlaying: 'y',
                  side: 'right',
                  showgrid: false,
                  tickfont: { size: 9, color: '#F97316' },
                  range: [150, 300],
                },
              } as any}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

        {/* Vibration Spectrum Chart Panel */}
        <div className={`p-3 rounded-lg border transition-all ${
          isVibAnomaly
            ? 'active-fault-glow border-red-500/80'
            : isVibWarning
            ? 'active-warning-glow border-amber-500/80'
            : panelBg
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold tracking-wider uppercase text-[#8FA0BC] flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-purple-400" />
              VIBRATION SPECTRUM ANALYSIS (FFT HARMONICS)
            </h4>
            <div className="flex items-center gap-2">
              {isVibAnomaly && (
                <span className="text-[9px] bg-red-500 text-white font-mono-telemetry font-bold px-1.5 py-0.2 rounded uppercase animate-pulse">
                  HIGH VIB
                </span>
              )}
              <span className="text-[10px] text-cyan-400 font-mono-telemetry">
                RMS: {engine.vibration_bands.rms_g}g
              </span>
            </div>
          </div>
          <div className="h-[175px] w-full">
            <Plot
              data={vibrationSpectrumData as any}
              layout={{
                ...commonLayout,
                showlegend: false,
                yaxis: { ...commonLayout.yaxis, title: { text: 'Amplitude (g)', font: { size: 9, color: textColor } }, range: [0, 1.5] },
              } as any}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

        {/* Electrical Bus Chart Panel */}
        <div className={`p-3 rounded-lg border transition-all ${
          isElecAnomaly
            ? 'active-fault-glow border-red-500/80'
            : isElecWarning
            ? 'active-warning-glow border-amber-500/80'
            : panelBg
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold tracking-wider uppercase text-[#8FA0BC] flex items-center gap-1.5">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              ELECTRICAL BUS &amp; GENERATOR STABILITY
            </h4>
            <div className="flex items-center gap-2">
              {isElecAnomaly && (
                <span className="text-[9px] bg-red-500 text-white font-mono-telemetry font-bold px-1.5 py-0.2 rounded uppercase animate-pulse">
                  VOLTAGE SAG
                </span>
              )}
              <span className="text-[10px] text-cyan-400 font-mono-telemetry">
                {engine.bus_voltage_v} V DC | {engine.charging_current_a} A
              </span>
            </div>
          </div>
          <div className="h-[175px] w-full">
            <Plot
              data={electricalData as any}
              layout={{
                ...commonLayout,
                yaxis: { ...commonLayout.yaxis, title: { text: 'Volts (V)', font: { size: 9, color: textColor } }, range: [15, 32] },
                yaxis2: {
                  title: { text: 'Amps (A)', font: { size: 9, color: '#EAB308' } },
                  overlaying: 'y',
                  side: 'right',
                  showgrid: false,
                  tickfont: { size: 9, color: '#EAB308' },
                  range: [0, 30],
                },
              } as any}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
