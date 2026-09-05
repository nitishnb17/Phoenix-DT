export type MissionPhase = 'TAKEOFF' | 'CLIMB' | 'CRUISE' | 'DESCENT';
export type UserRole = 'OPERATOR' | 'MAINTENANCE_ENGINEER' | 'AUDITOR';
export type DataSourceMode = 'SITL' | 'CAN_ADAPTER';
export type WorkspaceViewMode = 'COCKPIT' | 'DIAGNOSTICS' | 'REPLAY' | 'LIFECYCLE' | 'SYSTEM' | 'ALL_PANELS';

export interface VibrationBands {
  rms_g: number;
  harmonic_1x_g: number;
  harmonic_2x_g: number;
  high_freq_g: number;
}

export interface TelemetryEngine {
  rpm: number;
  oil_press: number;
  oil_temp_degf: number;
  cht: number;
  egt: number;
  egt_actual: number;
  fuel_flow: number;
  vibration_bands: VibrationBands;
  bus_voltage_v: number;
  charging_current_a: number;
  injection_timing_deg: number;
  lubrication_health_score: number;
}

export interface TelemetryFlight {
  altitude: number;
  airspeed: number;
  oat: number;
  pitch: number;
  roll: number;
  kias: number;
  ktas: number;
  air_density: number;
}

export interface ActiveFaults {
  oil_leak_severity: number;
  injector_clog_severity: number;
  icing_severity: number;
  fuel_leak_severity: number;
  sensor_drift_severity: number;
  payload_overheat_severity: number;
  misfire_severity: number;
  combustion_instability_severity: number;
  lubrication_degradation_severity: number;
  coking_degradation_severity: number;
  electrical_fault_severity: number;
}

export interface ExplainableZScore {
  sensor: string;
  zScore: number;
  raw: number;
  nominal: number;
}

export interface FaultProbability {
  faultName: string;
  probability: number;
}

export interface AiDiagnostics {
  health_index_pct: number;
  classified_fault: string;
  rul_seconds: number;
  rul_uncertainty_seconds: number;
  anomaly_distance: number;
  z_scores: ExplainableZScore[];
  is_critical_seizure: boolean;
  learned_probabilities: FaultProbability[];
  hybrid_confidence_pct: number;
  statistical_verdict: string;
  learned_verdict: string;
}

export interface ValidationMetrics {
  totalEvaluations: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  precisionPct: number;
  recallPct: number;
  falseAlarmRatePct: number;
  meanLatencySeconds: number;
  recentDetections: Array<{
    timestamp: string;
    injectedFault: string;
    detectedFault: string;
    latencySec: number;
    isCorrect: boolean;
  }>;
}

export interface CanFrame {
  timestampRel: string;
  canId: string;
  dlc: number;
  dataBytes: string;
  subsystem: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  signatureHex: string;
}

export interface ReplayFrame {
  timeSec: number;
  engine: TelemetryEngine;
  flight: TelemetryFlight;
  faults: ActiveFaults;
  diagnostics: AiDiagnostics;
  eventMarker?: string;
}

export interface HistoricalMission {
  id: string;
  name: string;
  timestamp: string;
  durationSeconds: number;
  faultsEncountered: string[];
  peakSeverityPct: number;
  finalHealthIndexPct: number;
  frames: ReplayFrame[];
}

export interface TelemetrySnapshot {
  timestamp_unix: number;
  data_source: string;
  telemetry: {
    engine: {
      rpm: number;
      oil_press_psi: number;
      oil_temp_degf: number;
      cht_degf: number;
      egt_reported_degf: number;
      egt_actual_degf: number;
      fuel_flow_gph: number;
      bus_voltage_v: number;
      charging_current_a: number;
      injection_timing_deg: number;
      lubrication_health_score: number;
      vibration_spectrum: VibrationBands;
    };
    flight: {
      altitude_ft: number;
      airspeed_ktas: number;
      oat_degc: number;
    };
  };
  ai_diagnostics: {
    health_index_pct: number;
    classified_fault: string;
    rul_seconds: number;
    rul_uncertainty_seconds: number;
    hybrid_confidence_pct: number;
    mahalanobis_distance: number;
  };
  active_faults: ActiveFaults;
}

export interface ComponentLifecycleItem {
  id: string;
  subsystem: string;
  cumulative_hours: number;
  cumulative_wear_pct: number;
  mtbf_hours: number;
  last_updated: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}
