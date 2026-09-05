import { create } from 'zustand';
import {
  ActiveFaults,
  AiDiagnostics,
  AuditLogEntry,
  CanFrame,
  ComponentLifecycleItem,
  CopilotMessage,
  DataSourceMode,
  HistoricalMission,
  MissionPhase,
  ReplayFrame,
  TelemetryEngine,
  TelemetryFlight,
  TelemetrySnapshot,
  UserRole,
  ValidationMetrics,
  WorkspaceViewMode,
} from '../types';
import { computeAtmosphere, stepPhysics } from './physics';
import { computeDiagnostics, HistorySample } from './diagnostics';

const INITIAL_FAULTS: ActiveFaults = {
  oil_leak_severity: 0,
  injector_clog_severity: 0,
  icing_severity: 0,
  fuel_leak_severity: 0,
  sensor_drift_severity: 0,
  payload_overheat_severity: 0,
  misfire_severity: 0,
  combustion_instability_severity: 0,
  lubrication_degradation_severity: 0,
  coking_degradation_severity: 0,
  electrical_fault_severity: 0,
};

const INITIAL_ENGINE: TelemetryEngine = {
  rpm: 5500,
  oil_press: 50.0,
  oil_temp_degf: 200.0,
  cht: 320.0,
  egt: 1300.0,
  egt_actual: 1300.0,
  fuel_flow: 18.0,
  bus_voltage_v: 28.2,
  charging_current_a: 14.2,
  injection_timing_deg: 24.0,
  lubrication_health_score: 100.0,
  vibration_bands: {
    rms_g: 0.85,
    harmonic_1x_g: 0.45,
    harmonic_2x_g: 0.28,
    high_freq_g: 0.28,
  },
};

const INITIAL_FLIGHT: TelemetryFlight = {
  altitude: 15000,
  airspeed: 145,
  oat: -14.7,
  pitch: 1.2,
  roll: 0.4,
  kias: 145,
  ktas: 145,
  air_density: 0.771,
};

const INITIAL_DIAGNOSTICS: AiDiagnostics = {
  health_index_pct: 100,
  classified_fault: 'NOMINAL',
  rul_seconds: 14400,
  rul_uncertainty_seconds: 180,
  anomaly_distance: 0.12,
  z_scores: [
    { sensor: 'RPM', zScore: 0.05, raw: 5500, nominal: 5500 },
    { sensor: 'CHT', zScore: 0.02, raw: 320, nominal: 320 },
    { sensor: 'EGT', zScore: 0.04, raw: 1300, nominal: 1300 },
    { sensor: 'OIL_PRESS', zScore: 0.02, raw: 50.0, nominal: 50.0 },
    { sensor: 'OIL_TEMP', zScore: 0.03, raw: 200.0, nominal: 200.0 },
    { sensor: 'FUEL_FLOW', zScore: 0.05, raw: 18.0, nominal: 18.0 },
    { sensor: 'BUS_VOLT', zScore: 0.03, raw: 28.2, nominal: 28.2 },
    { sensor: 'VIB_HF', zScore: 0.04, raw: 0.28, nominal: 0.28 },
    { sensor: 'INJ_TIMING', zScore: 0.02, raw: 24.0, nominal: 24.0 },
  ],
  is_critical_seizure: false,
  learned_probabilities: [
    { faultName: 'NOMINAL', probability: 0.985 },
    { faultName: 'OIL_PRESSURE_LOSS', probability: 0.002 },
    { faultName: 'FUEL_LINE_LEAK', probability: 0.002 },
    { faultName: 'AIRFRAME_ICING', probability: 0.002 },
    { faultName: 'INJECTOR_CLOG', probability: 0.002 },
    { faultName: 'MISFIRE_CONDITION', probability: 0.002 },
    { faultName: 'COMBUSTION_INSTABILITY', probability: 0.001 },
    { faultName: 'LUBRICATION_DEGRADATION', probability: 0.001 },
    { faultName: 'COKING_DEPOSIT_BUILDUP', probability: 0.001 },
    { faultName: 'ELECTRICAL_SYSTEM_FAULT', probability: 0.001 },
    { faultName: 'SENSOR_DRIFT', probability: 0.001 },
  ],
  hybrid_confidence_pct: 98.4,
  statistical_verdict: 'NOMINAL',
  learned_verdict: 'NOMINAL',
};

const INITIAL_LIFECYCLE: ComponentLifecycleItem[] = [
  { id: 'CYL-1', subsystem: 'Piston / Cylinder Head #1', cumulative_hours: 412.4, cumulative_wear_pct: 27.5, mtbf_hours: 1500, last_updated: '2026-08-23' },
  { id: 'CYL-2', subsystem: 'Piston / Cylinder Head #2', cumulative_hours: 412.4, cumulative_wear_pct: 29.1, mtbf_hours: 1500, last_updated: '2026-08-23' },
  { id: 'INJ-RAIL', subsystem: 'Common Rail Fuel Injector Set', cumulative_hours: 318.0, cumulative_wear_pct: 21.2, mtbf_hours: 1500, last_updated: '2026-08-23' },
  { id: 'OIL-PUMP', subsystem: 'Dual Scavenge Oil Pump & Bearings', cumulative_hours: 684.2, cumulative_wear_pct: 57.0, mtbf_hours: 1200, last_updated: '2026-08-23' },
  { id: 'TURBO-CHG', subsystem: 'Exhaust Turbocharger & Wastegate', cumulative_hours: 520.1, cumulative_wear_pct: 43.3, mtbf_hours: 1200, last_updated: '2026-08-23' },
  { id: 'ALT-ELEC', subsystem: 'Dual 28V Brushless Alternator', cumulative_hours: 210.5, cumulative_wear_pct: 17.5, mtbf_hours: 1200, last_updated: '2026-08-23' },
];

function generateCanFrames(engine: TelemetryEngine): CanFrame[] {
  const t = (performance.now() / 1000).toFixed(3);
  const rpmHex = (engine.rpm & 0xffff).toString(16).padStart(4, '0').toUpperCase();
  const oilPressHex = Math.round(engine.oil_press * 10).toString(16).padStart(2, '0').toUpperCase();
  const oilTempHex = Math.round(engine.oil_temp_degf).toString(16).padStart(2, '0').toUpperCase();
  const chtHex = Math.round(engine.cht).toString(16).padStart(4, '0').toUpperCase();
  const voltHex = Math.round(engine.bus_voltage_v * 10).toString(16).padStart(2, '0').toUpperCase();
  const vibHex = Math.round(engine.vibration_bands.rms_g * 100).toString(16).padStart(2, '0').toUpperCase();

  return [
    { timestampRel: `${t}s`, canId: '0x18FEF100', dlc: 8, dataBytes: `${rpmHex.slice(0,2)} ${rpmHex.slice(2)} ${oilPressHex} ${oilTempHex} 01 FF 00 00`, subsystem: 'PROPULSION_CORE' },
    { timestampRel: `${t}s`, canId: '0x18FEEE00', dlc: 8, dataBytes: `${chtHex.slice(0,2)} ${chtHex.slice(2)} ${voltHex} ${vibHex} 14 28 00 00`, subsystem: 'THERMAL_ELECTRICAL' },
    { timestampRel: `${t}s`, canId: '0x18FEE900', dlc: 8, dataBytes: `A4 12 00 00 ${oilPressHex} 00 FF 12`, subsystem: 'LUBRICATION_ECU' },
  ];
}

function makeAuditSignature(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return '0x' + Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
}

interface AppStore {
  isRunning: boolean;
  toggleRunning: () => void;
  uptimeSeconds: number;
  missionPhase: MissionPhase;
  setMissionPhase: (phase: MissionPhase) => void;
  altitudeFt: number;
  setAltitudeFt: (alt: number) => void;
  throttlePct: number;
  setThrottlePct: (pct: number) => void;
  mixturePct: number;
  setMixturePct: (pct: number) => void;
  oatOffsetDegC: number;
  setOatOffsetDegC: (deg: number) => void;

  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  dataSourceMode: DataSourceMode;
  setDataSourceMode: (mode: DataSourceMode) => void;
  canFrames: CanFrame[];
  isLinkLossActive: boolean;
  linkLossUntilSec: number;
  triggerLinkLossTest: () => void;
  lastTelemetryTimestamp: number;

  faults: ActiveFaults;
  setFault: (key: keyof ActiveFaults, value: number) => void;
  clearAllFaults: () => void;

  engine: TelemetryEngine;
  flight: TelemetryFlight;
  diagnostics: AiDiagnostics;
  fuelRemainingGal: number;

  telemetryHistory: {
    timestamps: string[];
    cht: number[];
    egt: number[];
    egtActual: number[];
    oilPress: number[];
    oilTemp: number[];
    fuelFlow: number[];
    rpm: number[];
    busVoltage: number[];
    chargingCurrent: number[];
    injectionTiming: number[];
    vibRms: number[];
    vib1x: number[];
    vib2x: number[];
    vibHf: number[];
    healthIndex: number[];
  };

  historySamples: HistorySample[];
  componentLifecycle: ComponentLifecycleItem[];
  overhaulComponent: (id: string) => void;
  loadLifecycleFromStorage: () => void;

  missionHistory: HistoricalMission[];
  currentMissionFrames: ReplayFrame[];
  isReplaying: boolean;
  replayMissionId: string | null;
  replayScrubSec: number;
  activeReplayFrame: ReplayFrame | null;
  compareMissionIds: [string | null, string | null];
  startReplay: (missionId: string) => void;
  setReplayScrubSec: (sec: number) => void;
  exitReplay: () => void;
  setCompareMissionIds: (ids: [string | null, string | null]) => void;

  validationMetrics: ValidationMetrics;

  auditLogs: AuditLogEntry[];
  addAuditLog: (action: string, details: string) => void;

  rapidThrottleSweep: {
    active: boolean;
    step: number;
  };
  triggerRapidThrottleSweep: () => void;
  triggerEnduranceDegradation: () => void;
  applyHotWeatherOps: () => void;

  theme: 'dark' | 'light';
  toggleTheme: () => void;
  activeViewMode: WorkspaceViewMode;
  setActiveViewMode: (mode: WorkspaceViewMode) => void;

  isUserManualOpen: boolean;
  openUserManual: () => void;
  closeUserManual: () => void;
  toggleUserManual: () => void;

  copilotMessages: CopilotMessage[];
  addCopilotMessage: (msg: CopilotMessage) => void;
  updateCopilotMessage: (id: string, text: string) => void;
  clearCopilotMessages: () => void;

  tick: () => void;
  resetMission: () => void;
  getSnapshot: () => TelemetrySnapshot;
}

export const useAppStore = create<AppStore>((set, get) => ({
  isRunning: true,
  toggleRunning: () => set((s) => {
    const next = !s.isRunning;
    get().addAuditLog(next ? 'SIM_RESUME' : 'SIM_PAUSE', `Simulation state switched to ${next ? 'RUNNING' : 'PAUSED'}`);
    return { isRunning: next };
  }),
  uptimeSeconds: 0,
  missionPhase: 'CRUISE',
  setMissionPhase: (phase) => {
    get().addAuditLog('PHASE_CHANGE', `Mission phase switched to ${phase}`);
    set({ missionPhase: phase });
  },
  altitudeFt: 15000,
  setAltitudeFt: (alt) => set({ altitudeFt: alt }),
  throttlePct: 75,
  setThrottlePct: (pct) => set({ throttlePct: pct }),
  mixturePct: 100,
  setMixturePct: (pct) => set({ mixturePct: pct }),
  oatOffsetDegC: 0,
  setOatOffsetDegC: (deg) => set({ oatOffsetDegC: deg }),

  userRole: 'OPERATOR',
  setUserRole: (role) => {
    get().addAuditLog('ROLE_CHANGE', `Active role switched to ${role}`);
    set({ userRole: role });
  },
  dataSourceMode: 'SITL',
  setDataSourceMode: (mode) => {
    get().addAuditLog('DATA_SOURCE_CHANGE', `Telemetry ingestion source switched to ${mode}`);
    set({ dataSourceMode: mode });
  },
  canFrames: generateCanFrames(INITIAL_ENGINE),
  isLinkLossActive: false,
  linkLossUntilSec: 0,
  triggerLinkLossTest: () => {
    const curUptime = get().uptimeSeconds;
    get().addAuditLog('LINK_LOSS_TEST', 'Simulated 5-second RF/CAN packet loss triggered');
    set({
      isLinkLossActive: true,
      linkLossUntilSec: curUptime + 5,
    });
  },
  lastTelemetryTimestamp: Date.now(),

  faults: INITIAL_FAULTS,
  setFault: (key, value) => {
    get().addAuditLog('FAULT_INJECT', `Set fault ${key} = ${value}%`);
    set((s) => ({
      faults: { ...s.faults, [key]: value },
    }));
  },
  clearAllFaults: () => {
    get().addAuditLog('FAULT_CLEAR_ALL', 'All synthetic fault vectors zeroed out');
    set({ faults: INITIAL_FAULTS });
  },

  engine: INITIAL_ENGINE,
  flight: INITIAL_FLIGHT,
  diagnostics: INITIAL_DIAGNOSTICS,
  fuelRemainingGal: 45.0,

  telemetryHistory: {
    timestamps: [],
    cht: [],
    egt: [],
    egtActual: [],
    oilPress: [],
    oilTemp: [],
    fuelFlow: [],
    rpm: [],
    busVoltage: [],
    chargingCurrent: [],
    injectionTiming: [],
    vibRms: [],
    vib1x: [],
    vib2x: [],
    vibHf: [],
    healthIndex: [],
  },

  historySamples: [],
  componentLifecycle: INITIAL_LIFECYCLE,

  overhaulComponent: (id) => {
    get().addAuditLog('COMPONENT_OVERHAUL', `Lifecycle counter zeroed for component ${id}`);
    set((s) => {
      const updated = s.componentLifecycle.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            cumulative_wear_pct: 0.0,
            cumulative_hours: 0.0,
            last_updated: new Date().toISOString().split('T')[0],
          };
        }
        return item;
      });
      try {
        localStorage.setItem('phoenix_dt_lifecycle', JSON.stringify(updated));
      } catch {}
      return { componentLifecycle: updated };
    });
  },

  loadLifecycleFromStorage: () => {
    try {
      const stored = localStorage.getItem('phoenix_dt_lifecycle') || localStorage.getItem('aero_piston_lifecycle');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ componentLifecycle: parsed });
        }
      }
      const storedMissions = localStorage.getItem('phoenix_dt_missions');
      if (storedMissions) {
        const parsedM = JSON.parse(storedMissions);
        if (Array.isArray(parsedM)) {
          set({ missionHistory: parsedM });
        }
      }
    } catch {}
  },

  missionHistory: [
    {
      id: 'MSN-2026-0819-A',
      name: 'Sortie #104: High Altitude ISR Patrol',
      timestamp: '2026-08-19 14:22:00 Z',
      durationSeconds: 120,
      faultsEncountered: ['AIRFRAME_ICING'],
      peakSeverityPct: 65,
      finalHealthIndexPct: 78.4,
      frames: [],
    },
    {
      id: 'MSN-2026-0821-B',
      name: 'Sortie #105: Thermal Stress & Climb Test',
      timestamp: '2026-08-21 09:15:30 Z',
      durationSeconds: 95,
      faultsEncountered: ['OIL_PRESSURE_LOSS', 'INJECTOR_CLOG'],
      peakSeverityPct: 70,
      finalHealthIndexPct: 52.1,
      frames: [],
    }
  ],
  currentMissionFrames: [],
  isReplaying: false,
  replayMissionId: null,
  replayScrubSec: 0,
  activeReplayFrame: null,
  compareMissionIds: ['MSN-2026-0819-A', 'MSN-2026-0821-B'],

  startReplay: (missionId) => {
    const mission = get().missionHistory.find((m) => m.id === missionId);
    if (!mission || mission.frames.length === 0) return;
    set({
      isReplaying: true,
      replayMissionId: missionId,
      replayScrubSec: 0,
      activeReplayFrame: mission.frames[0],
    });
  },

  setReplayScrubSec: (sec) => {
    const { replayMissionId, missionHistory } = get();
    const mission = missionHistory.find((m) => m.id === replayMissionId);
    if (!mission || mission.frames.length === 0) return;
    const target = mission.frames.find((f) => f.timeSec >= sec) || mission.frames[mission.frames.length - 1];
    set({
      replayScrubSec: sec,
      activeReplayFrame: target,
    });
  },

  exitReplay: () => set({
    isReplaying: false,
    replayMissionId: null,
    activeReplayFrame: null,
  }),

  setCompareMissionIds: (ids) => set({ compareMissionIds: ids }),

  validationMetrics: {
    totalEvaluations: 48,
    truePositives: 44,
    trueNegatives: 4,
    falsePositives: 1,
    falseNegatives: 1,
    precisionPct: 97.7,
    recallPct: 97.7,
    falseAlarmRatePct: 2.1,
    meanLatencySeconds: 2.3,
    recentDetections: [
      { timestamp: '10:32:15', injectedFault: 'OIL_PRESSURE_LOSS', detectedFault: 'OIL_PRESSURE_LOSS', latencySec: 2.1, isCorrect: true },
      { timestamp: '10:34:02', injectedFault: 'FUEL_LINE_LEAK', detectedFault: 'FUEL_LINE_LEAK', latencySec: 1.9, isCorrect: true },
      { timestamp: '10:36:44', injectedFault: 'MISFIRE_CONDITION', detectedFault: 'MISFIRE_CONDITION', latencySec: 2.4, isCorrect: true },
      { timestamp: '10:38:10', injectedFault: 'NOMINAL', detectedFault: 'NOMINAL', latencySec: 0.5, isCorrect: true },
    ],
  },

  auditLogs: [
    {
      id: 'AUD-001',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' Z',
      actor: 'SYSTEM_BOOT',
      action: 'INIT_GCS',
      details: 'PHOENIX-DT initialized with dual SITL/CAN-BUS ingestion adapter',
      signatureHex: makeAuditSignature('INIT_GCS_PHOENIX_DT'),
    }
  ],
  addAuditLog: (action, details) => {
    const actor = get().userRole;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' Z';
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${Math.floor(Math.random() * 10000)}`;
    const entry: AuditLogEntry = {
      id: `AUD-${uniqueSuffix}`,
      timestamp,
      actor,
      action,
      details,
      signatureHex: makeAuditSignature(`${timestamp}_${actor}_${action}_${details}`),
    };
    set((s) => ({
      auditLogs: [entry, ...s.auditLogs.slice(0, 49)],
    }));
  },

  rapidThrottleSweep: {
    active: false,
    step: 0,
  },
  triggerRapidThrottleSweep: () => {
    get().addAuditLog('SCENARIO_RUN', 'Rapid Throttle Transition scenario (20s dynamic sweep) started');
    set({
      rapidThrottleSweep: { active: true, step: 0 },
    });
  },
  triggerEnduranceDegradation: () => {
    get().addAuditLog('SCENARIO_RUN', 'Endurance Degradation accelerated time compressor executed (+150 flight hours)');
    set((s) => {
      const updated = s.componentLifecycle.map((item) => ({
        ...item,
        cumulative_hours: Number((item.cumulative_hours + 150).toFixed(1)),
        cumulative_wear_pct: Math.min(99.9, Number((item.cumulative_wear_pct + 12.5).toFixed(1))),
        last_updated: new Date().toISOString().split('T')[0],
      }));
      try {
        localStorage.setItem('phoenix_dt_lifecycle', JSON.stringify(updated));
      } catch {}
      return {
        componentLifecycle: updated,
        faults: {
          ...s.faults,
          lubrication_degradation_severity: Math.min(100, s.faults.lubrication_degradation_severity + 30),
          coking_degradation_severity: Math.min(100, s.faults.coking_degradation_severity + 35),
        },
      };
    });
  },
  applyHotWeatherOps: () => {
    get().addAuditLog('SCENARIO_RUN', 'Hot-Weather Ops scenario (+45°C ambient offset & 32,000 FT altitude) applied');
    set({
      oatOffsetDegC: 45,
      altitudeFt: 32000,
      throttlePct: 92,
      missionPhase: 'CLIMB',
    });
  },

  theme: 'dark',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  activeViewMode: 'COCKPIT',
  setActiveViewMode: (mode) => set({ activeViewMode: mode }),

  isUserManualOpen: true,
  openUserManual: () => {
    get().addAuditLog('MANUAL_OPEN', 'User Manual modal opened by operator');
    set({ isUserManualOpen: true });
  },
  closeUserManual: () => {
    get().addAuditLog('MANUAL_CLOSE', 'User Manual modal dismissed');
    set({ isUserManualOpen: false });
  },
  toggleUserManual: () => set((s) => ({ isUserManualOpen: !s.isUserManualOpen })),

  copilotMessages: [
    {
      id: '1',
      sender: 'assistant',
      text: 'PHOENIX-DT Diagnostic Copilot active. Monitoring dual-redundant aero-piston channels (RPM, CHT, EGT, Oil Press/Temp, Bus Voltage, Injection Timing, Vibration FFT). Standing by for pilot or maintenance queries.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ],
  addCopilotMessage: (msg) => set((s) => ({ copilotMessages: [...s.copilotMessages, msg] })),
  updateCopilotMessage: (id, text) =>
    set((s) => ({
      copilotMessages: s.copilotMessages.map((m) => (m.id === id ? { ...m, text, isStreaming: false } : m)),
    })),
  clearCopilotMessages: () => {
    get().addAuditLog('COPILOT_CLEAR', 'Copilot conversation cleared by operator');
    set({
      copilotMessages: [
        {
          id: `init-${Date.now()}`,
          sender: 'assistant',
          text: 'PHOENIX-DT Diagnostic Copilot reset. Monitoring dual-redundant aero-piston channels. Standing by for queries.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
    });
  },

  tick: () => {
    const state = get();
    const {
      isLinkLossActive,
      linkLossUntilSec,
      uptimeSeconds,
      rapidThrottleSweep,
      throttlePct,
      faults,
      missionPhase,
      altitudeFt,
      mixturePct,
      engine: prevEngine,
      historySamples,
      telemetryHistory,
      fuelRemainingGal,
      validationMetrics,
      oatOffsetDegC,
      currentMissionFrames,
    } = state;

    if (isLinkLossActive && uptimeSeconds < linkLossUntilSec) {
      set((s) => ({
        uptimeSeconds: s.uptimeSeconds + 1,
      }));
      return;
    } else if (isLinkLossActive && uptimeSeconds >= linkLossUntilSec) {
      set({ isLinkLossActive: false });
    }

    let nextThrottle = throttlePct;
    let nextSweep = { ...rapidThrottleSweep };
    if (rapidThrottleSweep.active) {
      const step = rapidThrottleSweep.step;
      if (step < 10) {
        nextThrottle = Math.min(100, 20 + step * 8);
      } else if (step < 20) {
        nextThrottle = Math.max(20, 100 - (step - 10) * 8);
      } else {
        nextSweep = { active: false, step: 0 };
        nextThrottle = 75;
      }
      if (nextSweep.active) {
        nextSweep.step = step + 1;
      }
    }

    const { engine: nextEngine, flight: nextFlight } = stepPhysics({
      phase: missionPhase,
      altitudeFt,
      throttlePct: nextThrottle,
      mixturePct,
      faults,
      timeElapsedSec: uptimeSeconds,
      prevEngine,
      oatOffsetDegC,
    });

    const now = Date.now();
    const newHistorySample: HistorySample = {
      timestamp: now,
      engine: nextEngine,
      flight: nextFlight,
      faults,
    };
    const updatedHistorySamples = [...historySamples.slice(-15), newHistorySample];

    const burnRatePerSec = (nextEngine.fuel_flow / 3600);
    const nextFuel = Math.max(0, Number((fuelRemainingGal - burnRatePerSec).toFixed(3)));

    const nextDiagnostics = computeDiagnostics(
      nextEngine,
      nextFlight,
      updatedHistorySamples,
      faults,
      nextFuel
    );

    let activeInjectedName = 'NOMINAL';
    if (faults.oil_leak_severity > 10) activeInjectedName = 'OIL_PRESSURE_LOSS';
    else if (faults.fuel_leak_severity > 10) activeInjectedName = 'FUEL_LINE_LEAK';
    else if (faults.misfire_severity > 10) activeInjectedName = 'MISFIRE_CONDITION';
    else if (faults.icing_severity > 15) activeInjectedName = 'AIRFRAME_ICING';
    else if (faults.electrical_fault_severity > 15) activeInjectedName = 'ELECTRICAL_SYSTEM_FAULT';
    else if (faults.combustion_instability_severity > 15) activeInjectedName = 'COMBUSTION_INSTABILITY';
    else if (faults.lubrication_degradation_severity > 15) activeInjectedName = 'LUBRICATION_DEGRADATION';
    else if (faults.sensor_drift_severity > 10) activeInjectedName = 'SENSOR_DRIFT';
    else if (faults.injector_clog_severity > 15) activeInjectedName = 'INJECTOR_CLOG';
    else if (faults.coking_degradation_severity > 20) activeInjectedName = 'COKING_DEPOSIT_BUILDUP';

    const isMatch = (activeInjectedName === 'NOMINAL' && nextDiagnostics.classified_fault === 'NOMINAL') ||
      (activeInjectedName !== 'NOMINAL' && nextDiagnostics.classified_fault === activeInjectedName);

    const updatedValidations: ValidationMetrics = {
      ...validationMetrics,
      totalEvaluations: validationMetrics.totalEvaluations + 1,
      truePositives: validationMetrics.truePositives + (isMatch && activeInjectedName !== 'NOMINAL' ? 1 : 0),
      trueNegatives: validationMetrics.trueNegatives + (isMatch && activeInjectedName === 'NOMINAL' ? 1 : 0),
      falsePositives: validationMetrics.falsePositives + (!isMatch && activeInjectedName === 'NOMINAL' ? 1 : 0),
      falseNegatives: validationMetrics.falseNegatives + (!isMatch && activeInjectedName !== 'NOMINAL' ? 1 : 0),
      precisionPct: Number((((validationMetrics.truePositives + 1) / (validationMetrics.truePositives + validationMetrics.falsePositives + 1)) * 100).toFixed(1)),
      recallPct: Number((((validationMetrics.truePositives + 1) / (validationMetrics.truePositives + validationMetrics.falseNegatives + 1)) * 100).toFixed(1)),
      falseAlarmRatePct: Number((((validationMetrics.falsePositives) / Math.max(1, validationMetrics.totalEvaluations)) * 100).toFixed(1)),
      meanLatencySeconds: 2.1,
      recentDetections: [
        {
          timestamp: new Date().toTimeString().slice(0, 8),
          injectedFault: activeInjectedName,
          detectedFault: nextDiagnostics.classified_fault,
          latencySec: 2.0,
          isCorrect: isMatch,
        },
        ...validationMetrics.recentDetections.slice(0, 5),
      ],
    };

    const timeStr = new Date().toTimeString().split(' ')[0];
    const maxPoints = 40;
    const nextTelemetryHistory = {
      timestamps: [...telemetryHistory.timestamps.slice(-maxPoints), timeStr],
      cht: [...telemetryHistory.cht.slice(-maxPoints), nextEngine.cht],
      egt: [...telemetryHistory.egt.slice(-maxPoints), nextEngine.egt],
      egtActual: [...telemetryHistory.egtActual.slice(-maxPoints), nextEngine.egt_actual],
      oilPress: [...telemetryHistory.oilPress.slice(-maxPoints), nextEngine.oil_press],
      oilTemp: [...telemetryHistory.oilTemp.slice(-maxPoints), nextEngine.oil_temp_degf],
      fuelFlow: [...telemetryHistory.fuelFlow.slice(-maxPoints), nextEngine.fuel_flow],
      rpm: [...telemetryHistory.rpm.slice(-maxPoints), nextEngine.rpm],
      busVoltage: [...telemetryHistory.busVoltage.slice(-maxPoints), nextEngine.bus_voltage_v],
      chargingCurrent: [...telemetryHistory.chargingCurrent.slice(-maxPoints), nextEngine.charging_current_a],
      injectionTiming: [...telemetryHistory.injectionTiming.slice(-maxPoints), nextEngine.injection_timing_deg],
      vibRms: [...telemetryHistory.vibRms.slice(-maxPoints), nextEngine.vibration_bands.rms_g],
      vib1x: [...telemetryHistory.vib1x.slice(-maxPoints), nextEngine.vibration_bands.harmonic_1x_g],
      vib2x: [...telemetryHistory.vib2x.slice(-maxPoints), nextEngine.vibration_bands.harmonic_2x_g],
      vibHf: [...telemetryHistory.vibHf.slice(-maxPoints), nextEngine.vibration_bands.high_freq_g],
      healthIndex: [...telemetryHistory.healthIndex.slice(-maxPoints), nextDiagnostics.health_index_pct],
    };

    const nextFrame: ReplayFrame = {
      timeSec: uptimeSeconds,
      engine: nextEngine,
      flight: nextFlight,
      faults: { ...faults },
      diagnostics: nextDiagnostics,
      eventMarker: activeInjectedName !== 'NOMINAL' ? activeInjectedName : undefined,
    };

    set({
      uptimeSeconds: uptimeSeconds + 1,
      engine: nextEngine,
      flight: nextFlight,
      diagnostics: nextDiagnostics,
      fuelRemainingGal: nextFuel,
      historySamples: updatedHistorySamples,
      telemetryHistory: nextTelemetryHistory,
      canFrames: generateCanFrames(nextEngine),
      rapidThrottleSweep: nextSweep,
      throttlePct: nextThrottle,
      validationMetrics: updatedValidations,
      lastTelemetryTimestamp: now,
      currentMissionFrames: [...currentMissionFrames.slice(-180), nextFrame],
    });
  },

  resetMission: () => {
    const { uptimeSeconds, componentLifecycle, currentMissionFrames, missionHistory, faults, diagnostics } = get();
    const flightHoursLogged = Number((uptimeSeconds / 3600).toFixed(3));

    const updatedLifecycle = componentLifecycle.map((item) => {
      const wearDelta = flightHoursLogged * 0.05 * (1 + (faults.oil_leak_severity + faults.misfire_severity) / 50);
      return {
        ...item,
        cumulative_hours: Number((item.cumulative_hours + flightHoursLogged).toFixed(1)),
        cumulative_wear_pct: Math.min(100, Number((item.cumulative_wear_pct + wearDelta).toFixed(2))),
        last_updated: new Date().toISOString().split('T')[0],
      };
    });

    try {
      localStorage.setItem('phoenix_dt_lifecycle', JSON.stringify(updatedLifecycle));
    } catch {}

    const encountered = Object.entries(faults)
      .filter(([_, v]) => v > 0)
      .map(([k]) => k.toUpperCase().replace('_SEVERITY', ''));

    const newMissionRecord: HistoricalMission = {
      id: `MSN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `Sortie #${missionHistory.length + 104}: Live Flight Record`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' Z',
      durationSeconds: Math.max(1, uptimeSeconds),
      faultsEncountered: encountered.length > 0 ? encountered : ['NOMINAL_FLIGHT'],
      peakSeverityPct: Math.max(0, ...Object.values(faults)),
      finalHealthIndexPct: diagnostics.health_index_pct,
      frames: currentMissionFrames.length > 0 ? currentMissionFrames : [
        {
          timeSec: 0,
          engine: INITIAL_ENGINE,
          flight: INITIAL_FLIGHT,
          faults: INITIAL_FAULTS,
          diagnostics: INITIAL_DIAGNOSTICS,
        }
      ],
    };

    const updatedMissions = [newMissionRecord, ...missionHistory.slice(0, 9)];
    try {
      localStorage.setItem('phoenix_dt_missions', JSON.stringify(updatedMissions));
    } catch {}

    get().addAuditLog('RESET_MISSION', `Mission ended and archived as ${newMissionRecord.id}. Lifecycle wear committed.`);

    set({
      uptimeSeconds: 0,
      faults: INITIAL_FAULTS,
      engine: INITIAL_ENGINE,
      flight: INITIAL_FLIGHT,
      diagnostics: INITIAL_DIAGNOSTICS,
      fuelRemainingGal: 45.0,
      historySamples: [],
      componentLifecycle: updatedLifecycle,
      missionHistory: updatedMissions,
      currentMissionFrames: [],
      telemetryHistory: {
        timestamps: [],
        cht: [],
        egt: [],
        egtActual: [],
        oilPress: [],
        oilTemp: [],
        fuelFlow: [],
        rpm: [],
        busVoltage: [],
        chargingCurrent: [],
        injectionTiming: [],
        vibRms: [],
        vib1x: [],
        vib2x: [],
        vibHf: [],
        healthIndex: [],
      },
    });
  },

  getSnapshot: () => {
    const s = get();
    return {
      timestamp_unix: Math.floor(Date.now() / 1000),
      data_source: s.dataSourceMode === 'SITL' ? 'SITL_PHYSICS_ENGINE' : 'CAN-BUS (SIMULATED ADAPTER)',
      telemetry: {
        engine: {
          rpm: s.engine.rpm,
          oil_press_psi: s.engine.oil_press,
          oil_temp_degf: s.engine.oil_temp_degf,
          cht_degf: s.engine.cht,
          egt_reported_degf: s.engine.egt,
          egt_actual_degf: s.engine.egt_actual,
          fuel_flow_gph: s.engine.fuel_flow,
          bus_voltage_v: s.engine.bus_voltage_v,
          charging_current_a: s.engine.charging_current_a,
          injection_timing_deg: s.engine.injection_timing_deg,
          lubrication_health_score: s.engine.lubrication_health_score,
          vibration_spectrum: s.engine.vibration_bands,
        },
        flight: {
          altitude_ft: s.flight.altitude,
          airspeed_ktas: s.flight.airspeed,
          oat_degc: s.flight.oat,
        },
      },
      ai_diagnostics: {
        health_index_pct: s.diagnostics.health_index_pct,
        classified_fault: s.diagnostics.classified_fault,
        rul_seconds: s.diagnostics.rul_seconds,
        rul_uncertainty_seconds: s.diagnostics.rul_uncertainty_seconds,
        hybrid_confidence_pct: s.diagnostics.hybrid_confidence_pct,
        mahalanobis_distance: s.diagnostics.anomaly_distance,
      },
      active_faults: s.faults,
    };
  },
}));
