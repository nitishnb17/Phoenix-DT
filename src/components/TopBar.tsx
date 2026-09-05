import { useEffect, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Moon,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Sun,
} from 'lucide-react';
import { useAppStore } from '../lib/store';

export function TopBar() {
  const {
    isRunning,
    toggleRunning,
    resetMission,
    uptimeSeconds,
    theme,
    toggleTheme,
    diagnostics,
    engine,
    flight,
    missionPhase,
    fuelRemainingGal,
    userRole,
    setUserRole,
    faults,
    openUserManual,
  } = useAppStore();

  const [zuluTime, setZuluTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const zulu = now.toUTCString().replace('GMT', 'ZULU');
      setZuluTime(zulu);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isDark = theme === 'dark';
  const isCritical = diagnostics.health_index_pct < 50 || diagnostics.is_critical_seizure;
  const isWarning = diagnostics.health_index_pct < 80 && !isCritical;

  const headerBg = isDark
    ? 'bg-[#0E1526] border-b border-[#1E293B] text-slate-100'
    : 'bg-white border-b border-slate-200 text-slate-900 shadow-xs';

  const subHeaderBg = isDark
    ? 'bg-[#090D18] border-b border-[#1A2333]'
    : 'bg-slate-50 border-b border-slate-200';

  return (
    <header className={`w-full flex flex-col transition-colors ${headerBg}`}>
      {/* Top Main Navigation Bar */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Tail Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wider uppercase text-cyan-400 font-mono-telemetry">
                PHOENIX-DT
              </h1>
              <span className="text-[10px] font-mono-telemetry uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                DRDO / SIH DEMO
              </span>
              <span className="text-[10px] font-mono-telemetry uppercase text-slate-400 hidden sm:inline">
                MQ-9B SKYGUARDIAN · TAIL DRDO-26054
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400 tracking-wider uppercase">
              PREDICTIVE HEALTH &amp; OPERATIONAL ENGINE NAVIGATOR — DIGITAL TWIN
            </p>
          </div>
        </div>

        {/* Right Operations & Role Controls */}
        <div className="flex items-center gap-2">
          {/* Master Annunciator Warning Status */}
          {isCritical ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/20 border border-red-500 text-red-300 text-xs font-mono-telemetry font-bold">
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
              <span>MASTER WARNING: {diagnostics.classified_fault.replace(/_/g, ' ')}</span>
            </div>
          ) : isWarning ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500 text-amber-300 text-xs font-mono-telemetry font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>MASTER CAUTION: DEGRADED HEALTH</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono-telemetry font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PROPULSION NOMINAL</span>
            </div>
          )}

          {/* RBAC Role Selector */}
          <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded border border-slate-700/60 text-[10px] font-mono-telemetry">
            <span className="text-slate-400 px-1 text-[9px] uppercase">ROLE:</span>
            {(['OPERATOR', 'MAINTENANCE_ENGINEER', 'AUDITOR'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setUserRole(r)}
                className={`px-1.5 py-0.5 rounded uppercase font-semibold transition-all ${
                  userRole === r
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r === 'MAINTENANCE_ENGINEER' ? 'MAINT' : r.slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Pause / Resume Simulation */}
          <button
            id="topbar-run-toggle-btn"
            onClick={toggleRunning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-mono-telemetry transition-all ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
            title={isRunning ? 'Pause Simulation' : 'Resume Simulation'}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'PAUSE' : 'RESUME'}</span>
          </button>

          {/* Reset Mission */}
          <button
            id="topbar-reset-mission-btn"
            onClick={resetMission}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-mono-telemetry bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all"
            title="Reset Mission and Log Cumulative Engine Sortie Wear"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESET</span>
          </button>

          {/* Permanent User Manual Button */}
          <button
            id="topbar-user-manual-btn"
            onClick={openUserManual}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold font-mono-telemetry bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 transition-all shadow-xs"
            title="Open PHOENIX-DT User Manual (Keyboard shortcut: [M])"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>USER MANUAL</span>
            <span className="hidden xl:inline text-[9px] px-1 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
              [M]
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            id="topbar-theme-toggle-btn"
            onClick={toggleTheme}
            className="p-1.5 rounded-md bg-black/20 border border-slate-700/60 hover:border-slate-500 text-slate-300 hover:text-white transition-all"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Tactical Dark Theme'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-cyan-600" />}
          </button>
        </div>
      </div>

      {/* Flight Telemetry Strip (Aerospace HUD Ribbon) */}
      <div className={`px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-telemetry ${subHeaderBg}`}>
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">STATUS:</span>
            {isRunning ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                LIVE (1Hz)
              </span>
            ) : (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                PAUSED
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-400">ZULU:</span>
            <span className="text-slate-200">{zuluTime || 'SYNCING...'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">UPTIME:</span>
            <span className="text-cyan-300 font-semibold">{formatUptime(uptimeSeconds)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">PHASE:</span>
            <span className="text-amber-300 font-bold px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30">
              {missionPhase}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">ALTITUDE:</span>
            <span className="text-slate-100 font-semibold">{flight.altitude.toLocaleString()} FT</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">AIRSPEED:</span>
            <span className="text-slate-100 font-semibold">{flight.airspeed} KTAS</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">ENGINE:</span>
            <span className="text-slate-100 font-semibold">{engine.rpm} RPM</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">FUEL:</span>
            <span className="text-slate-100 font-semibold">{fuelRemainingGal.toFixed(1)} GAL</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-400">SATCOM:</span>
            <span className="text-emerald-400 font-medium">99.8% (-62 dBm)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">HEALTH:</span>
            <span className={`font-bold ${isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-cyan-400'}`}>
              {diagnostics.health_index_pct}%
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
