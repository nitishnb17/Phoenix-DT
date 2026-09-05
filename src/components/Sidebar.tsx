import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BatteryWarning,
  CheckCircle2,
  Database,
  Flame,
  Gauge,
  Layers,
  Radio,
  RefreshCw,
  Shield,
  Sliders,
  Snowflake,
  SunMedium,
  Timer,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { MissionPhase } from '../types';

export function Sidebar() {
  const {
    missionPhase,
    setMissionPhase,
    altitudeFt,
    setAltitudeFt,
    throttlePct,
    setThrottlePct,
    mixturePct,
    setMixturePct,
    faults,
    setFault,
    clearAllFaults,
    theme,
    userRole,
    dataSourceMode,
    setDataSourceMode,
    canFrames,
    isLinkLossActive,
    triggerLinkLossTest,
    applyHotWeatherOps,
    triggerRapidThrottleSweep,
    triggerEnduranceDegradation,
    rapidThrottleSweep,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'CONTROLS' | 'FAULTS' | 'DATA_LINK' | 'SCENARIOS'>('CONTROLS');

  const isDark = theme === 'dark';
  const panelBg = isDark ? 'bg-[#111827] border-[#1F293D]' : 'bg-white border-slate-200 shadow-xs';
  const headerText = isDark ? 'text-slate-400' : 'text-slate-500';
  const subCardBg = isDark ? 'bg-[#0B0F19] border-[#1E293B]' : 'bg-slate-50 border-slate-200';

  const applyPreset = (type: 'NOMINAL' | 'ICING' | 'FUEL_LEAK' | 'OIL_LOSS' | 'MISFIRE' | 'ELECTRICAL' | 'MULTI') => {
    clearAllFaults();
    if (type === 'ICING') {
      setFault('icing_severity', 65);
    } else if (type === 'FUEL_LEAK') {
      setFault('fuel_leak_severity', 50);
    } else if (type === 'OIL_LOSS') {
      setFault('oil_leak_severity', 70);
    } else if (type === 'MISFIRE') {
      setFault('misfire_severity', 60);
    } else if (type === 'ELECTRICAL') {
      setFault('electrical_fault_severity', 65);
    } else if (type === 'MULTI') {
      setFault('oil_leak_severity', 35);
      setFault('icing_severity', 40);
      setFault('injector_clog_severity', 30);
      setFault('payload_overheat_severity', 45);
    }
  };

  const activeFaultCount = Object.values(faults).filter((v) => v > 0).length;
  const isAuditor = userRole === 'AUDITOR';

  return (
    <aside className={`w-full flex flex-col gap-3 p-3.5 rounded-lg border ${panelBg}`}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold tracking-wider uppercase text-slate-300">
            FLIGHT &amp; ENGINE CONTROLLER
          </h2>
        </div>
        {activeFaultCount > 0 && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono-telemetry font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            {activeFaultCount} FAULTS INJECTED
          </span>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-black/20 rounded-md border border-slate-700/40 text-[10px]">
        <button
          onClick={() => setActiveTab('CONTROLS')}
          className={`py-1.5 rounded text-center transition-all font-medium ${
            activeTab === 'CONTROLS' ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Flight
        </button>
        <button
          onClick={() => setActiveTab('FAULTS')}
          className={`py-1.5 rounded text-center transition-all font-medium ${
            activeTab === 'FAULTS' ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Faults {activeFaultCount > 0 && `(${activeFaultCount})`}
        </button>
        <button
          onClick={() => setActiveTab('SCENARIOS')}
          className={`py-1.5 rounded text-center transition-all font-medium ${
            activeTab === 'SCENARIOS' ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Scenarios
        </button>
        <button
          onClick={() => setActiveTab('DATA_LINK')}
          className={`py-1.5 rounded text-center transition-all font-medium ${
            activeTab === 'DATA_LINK' ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Data Link
        </button>
      </div>

      {/* 1. CONTROLS TAB */}
      {activeTab === 'CONTROLS' && (
        <div className="flex flex-col gap-3.5">
          {/* Mission Phase */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Mission Phase</span>
              <span className="font-mono-telemetry font-bold text-cyan-400">{missionPhase}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-xs font-medium">
              {(['TAKEOFF', 'CLIMB', 'CRUISE', 'DESCENT'] as MissionPhase[]).map((phase) => (
                <button
                  key={phase}
                  id={`mission-phase-${phase.toLowerCase()}`}
                  onClick={() => setMissionPhase(phase)}
                  className={`py-1.5 rounded-md border text-center transition-all text-[11px] ${
                    missionPhase === phase
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                      : isDark
                      ? 'bg-[#0B0F19] border-[#1E293B] text-slate-400 hover:text-slate-200'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {phase}
                </button>
              ))}
            </div>
          </div>

          {/* Altitude Slider */}
          <div className={`p-2.5 rounded-lg border ${subCardBg} flex flex-col gap-1.5`}>
            <div className="flex justify-between text-xs font-mono-telemetry">
              <span className="text-slate-400">Altitude (ISA Atmosphere)</span>
              <span className="text-cyan-400 font-bold">{altitudeFt.toLocaleString()} FT</span>
            </div>
            <input
              type="range"
              min="500"
              max="45000"
              step="500"
              value={altitudeFt}
              onChange={(e) => setAltitudeFt(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono-telemetry">
              <span>Sea Level (500 FT)</span>
              <span>Ceiling (45,000 FT)</span>
            </div>
          </div>

          {/* Power / Throttle Slider */}
          <div className={`p-2.5 rounded-lg border ${subCardBg} flex flex-col gap-1.5`}>
            <div className="flex justify-between text-xs font-mono-telemetry">
              <span className="text-slate-400">Engine Throttle Lever</span>
              <span className="text-cyan-400 font-bold">{throttlePct}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="1"
              value={throttlePct}
              onChange={(e) => setThrottlePct(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono-telemetry">
              <span>Idle (20%)</span>
              <span>100% Full Power</span>
            </div>
          </div>

          {/* Fuel Mixture Slider */}
          <div className={`p-2.5 rounded-lg border ${subCardBg} flex flex-col gap-1.5`}>
            <div className="flex justify-between text-xs font-mono-telemetry">
              <span className="text-slate-400">Lambda Mixture Ratio</span>
              <span className="text-cyan-400 font-bold">{mixturePct}%</span>
            </div>
            <input
              type="range"
              min="80"
              max="120"
              step="1"
              value={mixturePct}
              onChange={(e) => setMixturePct(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono-telemetry">
              <span>Lean (80%)</span>
              <span>Rich (120%)</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. SYNTHETIC FAULT INJECTION TAB */}
      {activeTab === 'FAULTS' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              INJECTION MATRIX
            </span>
            {activeFaultCount > 0 && !isAuditor && (
              <button
                id="clear-faults-btn"
                onClick={clearAllFaults}
                className="text-[10px] font-mono-telemetry uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition-all flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Clear All
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1 font-mono-telemetry text-[9.5px]">
            <button
              onClick={() => applyPreset('NOMINAL')}
              className={`px-2 py-1 rounded border transition-all ${
                activeFaultCount === 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-black/20 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              Nominal
            </button>
            <button
              onClick={() => applyPreset('FUEL_LEAK')}
              className="px-2 py-1 rounded border bg-black/20 text-amber-300 border-amber-600/40 hover:bg-amber-500/20"
            >
              Fuel Leak
            </button>
            <button
              onClick={() => applyPreset('OIL_LOSS')}
              className="px-2 py-1 rounded border bg-black/20 text-red-300 border-red-600/40 hover:bg-red-500/20"
            >
              Oil Loss
            </button>
            <button
              onClick={() => applyPreset('MISFIRE')}
              className="px-2 py-1 rounded border bg-black/20 text-orange-300 border-orange-600/40 hover:bg-orange-500/20"
            >
              Misfire
            </button>
            <button
              onClick={() => applyPreset('ELECTRICAL')}
              className="px-2 py-1 rounded border bg-black/20 text-yellow-300 border-yellow-600/40 hover:bg-yellow-500/20"
            >
              Elec Sag
            </button>
            <button
              onClick={() => applyPreset('ICING')}
              className="px-2 py-1 rounded border bg-black/20 text-sky-300 border-sky-600/40 hover:bg-sky-500/20"
            >
              Icing
            </button>
          </div>

          {/* Fault Sliders */}
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
            {/* Fuel Leak */}
            <div className={`p-2 rounded-md border ${subCardBg}`}>
              <div className="flex justify-between text-xs font-mono-telemetry mb-1">
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <Flame className="w-3 h-3" /> Fuel Line Leak
                </span>
                <span className={faults.fuel_leak_severity > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                  {faults.fuel_leak_severity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={faults.fuel_leak_severity}
                onChange={(e) => setFault('fuel_leak_severity', Number(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Oil Leak */}
            <div className={`p-2 rounded-md border ${subCardBg}`}>
              <div className="flex justify-between text-xs font-mono-telemetry mb-1">
                <span className="flex items-center gap-1.5 text-red-400 font-semibold">
                  <Gauge className="w-3 h-3" /> Oil Scavenge Leak
                </span>
                <span className={faults.oil_leak_severity > 0 ? 'text-red-400 font-bold' : 'text-slate-500'}>
                  {faults.oil_leak_severity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={faults.oil_leak_severity}
                onChange={(e) => setFault('oil_leak_severity', Number(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-400"
              />
            </div>

            {/* Injector Clog */}
            <div className={`p-2 rounded-md border ${subCardBg}`}>
              <div className="flex justify-between text-xs font-mono-telemetry mb-1">
                <span className="flex items-center gap-1.5 text-pink-400 font-semibold">
                  <Wrench className="w-3 h-3" /> Common Rail Injector Clog
                </span>
                <span className={faults.injector_clog_severity > 0 ? 'text-pink-400 font-bold' : 'text-slate-500'}>
                  {faults.injector_clog_severity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={faults.injector_clog_severity}
                onChange={(e) => setFault('injector_clog_severity', Number(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-400"
              />
            </div>

            {/* Misfire Detector */}
            <div className={`p-2 rounded-md border ${subCardBg}`}>
              <div className="flex justify-between text-xs font-mono-telemetry mb-1">
                <span className="flex items-center gap-1.5 text-orange-400 font-semibold">
                  <Zap className="w-3 h-3" /> Cylinder Misfire Detector
                </span>
                <span className={faults.misfire_severity > 0 ? 'text-orange-400 font-bold' : 'text-slate-500'}>
                  {faults.misfire_severity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={faults.misfire_severity}
                onChange={(e) => setFault('misfire_severity', Number(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-400"
              />
            </div>

            {/* Combustion Instability */}
            <div className={`p-2 rounded-md border ${subCardBg}`}>
              <div className="flex justify-between text-xs font-mono-telemetry mb-1">
                <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                  <Activity className="w-3 h-3" /> Combustion Instability (Flicker)
                </span>
                <span className={faults.combustion_instability_severity > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                  {faults.combustion_instability_severity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={faults.combustion_instability_severity}
                onChange={(e) => setFault('combustion_instability_severity', Number(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>

            {/* Lubrication Degradation */}
            <div className={`p-2 rounded-md border ${subCardBg}`}>
              <div className="flex justify-between text-xs font-mono-telemetry mb-1">
                <span className="flex items-center gap-1.5 text-amber-500 font-semibold">
                  <Layers className="w-3 h-3" /> Lubrication Viscosity Breakdown
                </span>
                <span className={faults.lubrication_degradation_severity > 0 ? 'text-amber-500 font-bold' : 'text-slate-500'}>
                  {faults.lubrication_degradation_severity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={faults.lubrication_degradation_severity}
                onChange={(e) => setFault('lubrication_degradation_severity', Number(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Coking Buildup */}
            <div className={`p-2 rounded-md border ${subCardBg}`}>
              <div className="flex justify-between text-xs font-mono-telemetry mb-1">
                <span className="flex items-center gap-1.5 text-stone-400 font-semibold">
                  <Database className="w-3 h-3" /> Injector Coking &amp; Carbon Buildup
                </span>
                <span className={faults.coking_degradation_severity > 0 ? 'text-stone-300 font-bold' : 'text-slate-500'}>
                  {faults.coking_degradation_severity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={faults.coking_degradation_severity}
                onChange={(e) => setFault('coking_degradation_severity', Number(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-stone-400"
              />
            </div>

            {/* Electrical Fault */}
            <div className={`p-2 rounded-md border ${subCardBg}`}>
              <div className="flex justify-between text-xs font-mono-telemetry mb-1">
                <span className="flex items-center gap-1.5 text-yellow-400 font-semibold">
                  <BatteryWarning className="w-3 h-3" /> Alternator / Voltage Sag Fault
                </span>
                <span className={faults.electrical_fault_severity > 0 ? 'text-yellow-400 font-bold' : 'text-slate-500'}>
                  {faults.electrical_fault_severity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={faults.electrical_fault_severity}
                onChange={(e) => setFault('electrical_fault_severity', Number(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
              />
            </div>

            {/* Airframe Icing */}
            <div className={`p-2 rounded-md border ${subCardBg}`}>
              <div className="flex justify-between text-xs font-mono-telemetry mb-1">
                <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                  <Snowflake className="w-3 h-3" /> Airframe &amp; Wing Icing
                </span>
                <span className={faults.icing_severity > 0 ? 'text-sky-400 font-bold' : 'text-slate-500'}>
                  {faults.icing_severity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={faults.icing_severity}
                onChange={(e) => setFault('icing_severity', Number(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Sensor Drift */}
            <div className={`p-2 rounded-md border ${subCardBg}`}>
              <div className="flex justify-between text-xs font-mono-telemetry mb-1">
                <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                  <Wind className="w-3 h-3" /> EGT Sensor Bias / Drift
                </span>
                <span className={faults.sensor_drift_severity > 0 ? 'text-purple-400 font-bold' : 'text-slate-500'}>
                  {faults.sensor_drift_severity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={faults.sensor_drift_severity}
                onChange={(e) => setFault('sensor_drift_severity', Number(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>

            {/* Payload Overheat */}
            <div className={`p-2 rounded-md border ${subCardBg}`}>
              <div className="flex justify-between text-xs font-mono-telemetry mb-1">
                <span className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                  <Shield className="w-3 h-3" /> Avionics / Payload Bay Thermal
                </span>
                <span className={faults.payload_overheat_severity > 0 ? 'text-indigo-400 font-bold' : 'text-slate-500'}>
                  {faults.payload_overheat_severity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={faults.payload_overheat_severity}
                onChange={(e) => setFault('payload_overheat_severity', Number(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. SCENARIOS TAB */}
      {activeTab === 'SCENARIOS' && (
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold text-slate-300 uppercase">MISSION STRESS SCENARIOS</span>

          <button
            onClick={applyHotWeatherOps}
            className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${subCardBg} hover:border-amber-500/50`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <SunMedium className="w-3.5 h-3.5" /> Hot-Weather Ops
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono-telemetry">
                +45°C ISA
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Simulates high ambient thermal offset with high-altitude derate to test cooling margins.
            </p>
          </button>

          <button
            onClick={triggerRapidThrottleSweep}
            disabled={rapidThrottleSweep.active}
            className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${subCardBg} hover:border-cyan-500/50 ${
              rapidThrottleSweep.active ? 'border-cyan-400 bg-cyan-950/20' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" /> Rapid Throttle Sweep
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono-telemetry">
                {rapidThrottleSweep.active ? `Sweeping ${rapidThrottleSweep.step}/20s` : '20s Dynamic'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Sweeps 20% → 100% → 20% to verify classifier avoids false alarms during normal transients.
            </p>
          </button>

          <button
            onClick={triggerEnduranceDegradation}
            className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${subCardBg} hover:border-purple-500/50`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Endurance Degradation
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono-telemetry">
                +150 Flt Hrs
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Advances cumulative hours to simulate coking and lubrication wear progression.
            </p>
          </button>
        </div>
      )}

      {/* 4. DATA LINK TAB */}
      {activeTab === 'DATA_LINK' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Ingestion Source</span>
            <span className="font-mono-telemetry text-emerald-400 font-bold">
              {dataSourceMode === 'SITL' ? 'SITL Engine' : 'CAN Adapter'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 font-mono-telemetry text-xs">
            <button
              onClick={() => setDataSourceMode('SITL')}
              className={`py-1.5 px-2 rounded border text-center transition-all ${
                dataSourceMode === 'SITL'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-black/20 border-slate-700 text-slate-400'
              }`}
            >
              SITL Engine
            </button>
            <button
              onClick={() => setDataSourceMode('CAN_ADAPTER')}
              className={`py-1.5 px-2 rounded border text-center transition-all ${
                dataSourceMode === 'CAN_ADAPTER'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                  : 'bg-black/20 border-slate-700 text-slate-400'
              }`}
            >
              CAN Adapter
            </button>
          </div>

          <div className={`p-2.5 rounded-lg border ${subCardBg} flex flex-col gap-2 font-mono-telemetry text-[11px]`}>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" /> SocketCAN Link:
              </span>
              <span className="text-emerald-400 font-bold">1 Mbps (Online)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Packet Loss Rate:</span>
              <span className="text-cyan-300">0.02%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Timestamp Jitter:</span>
              <span className="text-emerald-400">&lt; 0.5 ms</span>
            </div>

            <button
              onClick={triggerLinkLossTest}
              disabled={isLinkLossActive}
              className={`w-full py-1.5 mt-1 rounded border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                isLinkLossActive
                  ? 'bg-red-500/30 text-red-300 border-red-500'
                  : 'bg-red-500/10 text-red-300 border-red-500/40 hover:bg-red-500/20'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              {isLinkLossActive ? 'Link Loss Active (5s)...' : 'Simulate Link Loss (5s)'}
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">CAN Bus Telemetry Frames</span>
            <div className="p-2 rounded bg-black/40 border border-slate-800 font-mono-telemetry text-[10px] text-slate-300 flex flex-col gap-1 max-h-32 overflow-y-auto">
              {canFrames.map((f, i) => (
                <div key={i} className="flex items-center justify-between border-b border-slate-800/50 pb-0.5">
                  <span className="text-cyan-400">{f.canId}</span>
                  <span className="text-slate-400">DLC:{f.dlc}</span>
                  <span className="text-emerald-300">{f.dataBytes}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
