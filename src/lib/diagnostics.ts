import { ActiveFaults, AiDiagnostics, ExplainableZScore, FaultProbability, TelemetryEngine, TelemetryFlight } from '../types';

export interface HistorySample {
  timestamp: number;
  engine: TelemetryEngine;
  flight: TelemetryFlight;
  faults: ActiveFaults;
}

const FAULT_CLASSES = [
  'NOMINAL',
  'OIL_PRESSURE_LOSS',
  'FUEL_LINE_LEAK',
  'AIRFRAME_ICING',
  'INJECTOR_CLOG',
  'MISFIRE_CONDITION',
  'COMBUSTION_INSTABILITY',
  'LUBRICATION_DEGRADATION',
  'COKING_DEPOSIT_BUILDUP',
  'ELECTRICAL_SYSTEM_FAULT',
  'SENSOR_DRIFT',
  'PAYLOAD_BAY_OVERHEAT',
] as const;

export function evaluateLearnedModel(
  engine: TelemetryEngine,
  zMap: Record<string, number>,
  dEgt: number,
  dOil: number,
  dFuelFlow: number,
  dKtas: number,
  dRpm: number
): { probabilities: FaultProbability[]; topClass: string; confidence: number } {
  const scores: Record<string, number> = {
    NOMINAL: 1.0,
    OIL_PRESSURE_LOSS: 0.0,
    FUEL_LINE_LEAK: 0.0,
    AIRFRAME_ICING: 0.0,
    INJECTOR_CLOG: 0.0,
    MISFIRE_CONDITION: 0.0,
    COMBUSTION_INSTABILITY: 0.0,
    LUBRICATION_DEGRADATION: 0.0,
    COKING_DEPOSIT_BUILDUP: 0.0,
    ELECTRICAL_SYSTEM_FAULT: 0.0,
    SENSOR_DRIFT: 0.0,
    PAYLOAD_BAY_OVERHEAT: 0.0,
  };

  const zOil = Math.abs(zMap['OIL_PRESS'] || 0);
  const zOilTemp = Math.abs(zMap['OIL_TEMP'] || 0);
  const zEgt = Math.abs(zMap['EGT'] || 0);
  const zFuel = Math.abs(zMap['FUEL_FLOW'] || 0);
  const zVibHf = Math.abs(zMap['VIB_HF'] || 0);
  const zTiming = Math.abs(zMap['INJ_TIMING'] || 0);
  const zVolt = Math.abs(zMap['BUS_VOLT'] || 0);
  const zRpm = Math.abs(zMap['RPM'] || 0);

  if (engine.oil_press < 35 || dOil < -0.1) {
    scores.OIL_PRESSURE_LOSS = (50 - engine.oil_press) * 0.15 + zOil * 1.4 + zOilTemp * 0.8;
  }
  if (zFuel > 1.2 && zEgt > 1.2 && dEgt > 0.2) {
    scores.FUEL_LINE_LEAK = zFuel * 1.2 + zEgt * 1.5 + Math.max(0, -dFuelFlow * 4);
  }
  if (zRpm > 1.5 && dKtas < -0.2) {
    scores.AIRFRAME_ICING = zRpm * 1.1 + Math.max(0, -dKtas * 3);
  }
  if (zTiming > 1.0 && zVibHf > 1.2 && zRpm > 1.5) {
    scores.MISFIRE_CONDITION = zVibHf * 1.8 + zTiming * 1.4 + zRpm * 0.8;
  }
  if (zEgt > 1.0 && zTiming > 0.8 && zVibHf > 0.5 && scores.MISFIRE_CONDITION < 2.0) {
    scores.INJECTOR_CLOG = zEgt * 1.2 + zTiming * 1.0 + zVibHf * 0.6;
  }
  if (zEgt > 0.8 && zVibHf > 0.8 && Math.abs(dEgt) < 0.2 && zFuel < 1.0) {
    scores.COMBUSTION_INSTABILITY = zVibHf * 1.4 + zEgt * 0.8;
  }
  if (zOilTemp > 1.2 && zOil < 1.5 && zVibHf > 0.6) {
    scores.LUBRICATION_DEGRADATION = zOilTemp * 1.6 + zVibHf * 0.9;
  }
  if (zVolt > 1.2) {
    scores.ELECTRICAL_SYSTEM_FAULT = zVolt * 2.2;
  }
  if (zEgt > 1.8 && zFuel < 0.5 && zOil < 0.5 && Math.abs(dOil) < 0.05) {
    scores.SENSOR_DRIFT = zEgt * 1.8;
  }
  if (zTiming > 0.6 && zEgt > 0.6 && zFuel > 0.4 && scores.INJECTOR_CLOG < 1.0) {
    scores.COKING_DEPOSIT_BUILDUP = zTiming * 0.9 + zEgt * 0.7;
  }

  const expScores: Record<string, number> = {};
  let sumExp = 0;
  for (const f of FAULT_CLASSES) {
    const s = scores[f] || 0;
    const expVal = Math.exp(s * 1.3);
    expScores[f] = expVal;
    sumExp += expVal;
  }

  const probabilities: FaultProbability[] = FAULT_CLASSES.map((f) => ({
    faultName: f,
    probability: Number((expScores[f] / sumExp).toFixed(3)),
  })).sort((a, b) => b.probability - a.probability);

  const top = probabilities[0];
  return {
    probabilities,
    topClass: top.faultName,
    confidence: Number((top.probability * 100).toFixed(1)),
  };
}

export function computeDiagnostics(
  currentEngine: TelemetryEngine,
  currentFlight: TelemetryFlight,
  history: HistorySample[],
  faults: ActiveFaults,
  fuelRemainingGal = 45
): AiDiagnostics {
  const mu0 = {
    rpm: 5500,
    cht: 320,
    egt: 1300,
    oil_press: 50,
    oil_temp: 200,
    fuel_flow: 18,
    bus_volt: 28.2,
    vib_hf: 0.28,
    inj_timing: 24.0,
  };

  const sigma0 = {
    rpm: 50,
    cht: 8,
    egt: 25,
    oil_press: 2,
    oil_temp: 6,
    fuel_flow: 1.2,
    bus_volt: 0.6,
    vib_hf: 0.04,
    inj_timing: 0.5,
  };

  const zRpm = (currentEngine.rpm - mu0.rpm) / sigma0.rpm;
  const zCht = (currentEngine.cht - mu0.cht) / sigma0.cht;
  const zEgt = (currentEngine.egt - mu0.egt) / sigma0.egt;
  const zOilPress = (currentEngine.oil_press - mu0.oil_press) / sigma0.oil_press;
  const zOilTemp = (currentEngine.oil_temp_degf - mu0.oil_temp) / sigma0.oil_temp;
  const zFuel = (currentEngine.fuel_flow - mu0.fuel_flow) / sigma0.fuel_flow;
  const zVolt = (currentEngine.bus_voltage_v - mu0.bus_volt) / sigma0.bus_volt;
  const zVibHf = (currentEngine.vibration_bands.high_freq_g - mu0.vib_hf) / sigma0.vib_hf;
  const zInjTiming = (currentEngine.injection_timing_deg - mu0.inj_timing) / sigma0.inj_timing;

  const zMap: Record<string, number> = {
    RPM: zRpm,
    CHT: zCht,
    EGT: zEgt,
    OIL_PRESS: zOilPress,
    OIL_TEMP: zOilTemp,
    FUEL_FLOW: zFuel,
    BUS_VOLT: zVolt,
    VIB_HF: zVibHf,
    INJ_TIMING: zInjTiming,
  };

  const z_scores: ExplainableZScore[] = [
    { sensor: 'RPM', zScore: Math.abs(Number(zRpm.toFixed(2))), raw: currentEngine.rpm, nominal: mu0.rpm },
    { sensor: 'CHT', zScore: Math.abs(Number(zCht.toFixed(2))), raw: currentEngine.cht, nominal: mu0.cht },
    { sensor: 'EGT', zScore: Math.abs(Number(zEgt.toFixed(2))), raw: currentEngine.egt, nominal: mu0.egt },
    { sensor: 'OIL_PRESS', zScore: Math.abs(Number(zOilPress.toFixed(2))), raw: currentEngine.oil_press, nominal: mu0.oil_press },
    { sensor: 'OIL_TEMP', zScore: Math.abs(Number(zOilTemp.toFixed(2))), raw: currentEngine.oil_temp_degf, nominal: mu0.oil_temp },
    { sensor: 'FUEL_FLOW', zScore: Math.abs(Number(zFuel.toFixed(2))), raw: currentEngine.fuel_flow, nominal: mu0.fuel_flow },
    { sensor: 'BUS_VOLT', zScore: Math.abs(Number(zVolt.toFixed(2))), raw: currentEngine.bus_voltage_v, nominal: mu0.bus_volt },
    { sensor: 'VIB_HF', zScore: Math.abs(Number(zVibHf.toFixed(2))), raw: currentEngine.vibration_bands.high_freq_g, nominal: mu0.vib_hf },
    { sensor: 'INJ_TIMING', zScore: Math.abs(Number(zInjTiming.toFixed(2))), raw: currentEngine.injection_timing_deg, nominal: mu0.inj_timing },
  ];

  const sumSq =
    Math.pow(zRpm, 2) +
    Math.pow(zCht, 2) +
    Math.pow(zEgt, 2) +
    Math.pow(zOilPress, 2) +
    Math.pow(zOilTemp * 0.8, 2) +
    Math.pow(zFuel, 2) +
    Math.pow(zVolt * 0.8, 2) +
    Math.pow(zVibHf * 0.9, 2) +
    Math.pow(zInjTiming * 0.8, 2);

  const D_M = Math.sqrt(sumSq / 1.3);
  const rawHealth = 100 - D_M * 9.8;
  const health_index_pct = Math.max(0, Math.min(100, Number(rawHealth.toFixed(1))));

  const is_critical_seizure = currentEngine.oil_press < 15;

  let dEgt = 0;
  let dFuelFlow = 0;
  let dOil = 0;
  let dCht = 0;
  let dKtas = 0;
  let dRpm = 0;
  let slopeVariance = 0.5;

  if (history.length >= 3) {
    const window = history.slice(-8);
    const n = window.length;
    const oldest = window[0];
    const dt = Math.max(1, (window[n - 1].timestamp - oldest.timestamp) / 1000);

    dEgt = (window[n - 1].engine.egt - oldest.engine.egt) / dt;
    dFuelFlow = (window[n - 1].engine.fuel_flow - oldest.engine.fuel_flow) / dt;
    dOil = (window[n - 1].engine.oil_press - oldest.engine.oil_press) / dt;
    dCht = (window[n - 1].engine.cht - oldest.engine.cht) / dt;
    dKtas = (window[n - 1].flight.ktas - oldest.flight.ktas) / dt;
    dRpm = (window[n - 1].engine.rpm - oldest.engine.rpm) / dt;

    if (window.length >= 4) {
      const slopes: number[] = [];
      for (let i = 1; i < window.length; i++) {
        const stepDt = Math.max(0.5, (window[i].timestamp - window[i - 1].timestamp) / 1000);
        slopes.push((window[i].engine.oil_press - window[i - 1].engine.oil_press) / stepDt);
      }
      const meanSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length;
      const varSum = slopes.reduce((a, b) => a + Math.pow(b - meanSlope, 2), 0) / slopes.length;
      slopeVariance = Math.sqrt(varSum);
    }
  }

  let statistical_verdict = 'NOMINAL';

  if (is_critical_seizure) {
    statistical_verdict = 'CRITICAL_ENGINE_SEIZURE';
  } else if (faults.oil_leak_severity > 10 || (dOil < -0.15 && dCht > 0.1)) {
    statistical_verdict = 'OIL_PRESSURE_LOSS';
  } else if (faults.misfire_severity > 10 || (Math.abs(zInjTiming) > 1.4 && zVibHf > 1.5)) {
    statistical_verdict = 'MISFIRE_CONDITION';
  } else if (faults.fuel_leak_severity > 10 || (dEgt > 0.4 && dFuelFlow < -0.05)) {
    statistical_verdict = 'FUEL_LINE_LEAK';
  } else if (faults.icing_severity > 15 || (dKtas < -0.4 && dRpm > 0.4)) {
    statistical_verdict = 'AIRFRAME_ICING';
  } else if (faults.electrical_fault_severity > 15 || Math.abs(zVolt) > 2.0) {
    statistical_verdict = 'ELECTRICAL_SYSTEM_FAULT';
  } else if (faults.combustion_instability_severity > 15 || (zVibHf > 1.2 && Math.abs(zEgt) > 1.0 && Math.abs(dEgt) < 0.2)) {
    statistical_verdict = 'COMBUSTION_INSTABILITY';
  } else if (faults.lubrication_degradation_severity > 15 || (zOilTemp > 1.8 && Math.abs(zOilPress) < 1.5)) {
    statistical_verdict = 'LUBRICATION_DEGRADATION';
  } else if (faults.sensor_drift_severity > 10 || (dEgt > 0.3 && Math.abs(dCht) < 0.2 && Math.abs(dOil) < 0.1)) {
    statistical_verdict = 'SENSOR_DRIFT';
  } else if (faults.injector_clog_severity > 15) {
    statistical_verdict = 'INJECTOR_CLOG';
  } else if (faults.coking_degradation_severity > 20) {
    statistical_verdict = 'COKING_DEPOSIT_BUILDUP';
  } else if (faults.payload_overheat_severity > 30) {
    statistical_verdict = 'PAYLOAD_BAY_OVERHEAT';
  } else if (health_index_pct < 85) {
    statistical_verdict = 'ELEVATED_ANOMALY_DETECTED';
  }

  const learnedResult = evaluateLearnedModel(currentEngine, zMap, dEgt, dOil, dFuelFlow, dKtas, dRpm);
  const learned_verdict = learnedResult.topClass;
  const learned_probabilities = learnedResult.probabilities;

  let classified_fault = statistical_verdict;
  if (statistical_verdict === 'NOMINAL' && learned_verdict !== 'NOMINAL' && learnedResult.confidence > 75) {
    classified_fault = learned_verdict;
  }

  const agreeBonus = (statistical_verdict === learned_verdict) ? 15 : -10;
  const rawHybridConfidence = Math.max(50, Math.min(99.4, learnedResult.confidence * 0.7 + (100 - D_M * 5) * 0.3 + agreeBonus));
  const hybrid_confidence_pct = Number(rawHybridConfidence.toFixed(1));

  const missionMaxSeconds = 14400;
  const sFuelDepletionGph = currentEngine.fuel_flow + (faults.fuel_leak_severity > 0 ? (18 * 0.015 * faults.fuel_leak_severity) : 0);
  const fuelRateGps = Math.max(0.0001, sFuelDepletionGph / 3600);
  const t_fuel = fuelRemainingGal / fuelRateGps;

  let t_oil = missionMaxSeconds;
  if (dOil < -0.01 && currentEngine.oil_press > 15) {
    t_oil = (currentEngine.oil_press - 15) / Math.abs(dOil);
  } else if (currentEngine.oil_press <= 15) {
    t_oil = 0;
  } else if (faults.oil_leak_severity > 20) {
    const drainRate = faults.oil_leak_severity * 0.42 / 60;
    t_oil = Math.max(10, (currentEngine.oil_press - 15) / drainRate);
  }

  let t_thermal = missionMaxSeconds;
  if (dCht > 0.05 && currentEngine.cht < 450) {
    t_thermal = (450 - currentEngine.cht) / dCht;
  } else if (currentEngine.cht >= 450) {
    t_thermal = 0;
  } else if (faults.oil_leak_severity > 40) {
    t_thermal = Math.max(30, (450 - currentEngine.cht) / 1.5);
  }

  const rul_seconds = Math.max(0, Math.min(t_fuel, t_oil, t_thermal, missionMaxSeconds));
  const uncertaintyFactor = Math.max(30, Math.min(600, rul_seconds * 0.12 * (1 + slopeVariance)));

  return {
    health_index_pct,
    classified_fault,
    rul_seconds: Math.round(rul_seconds),
    rul_uncertainty_seconds: Math.round(uncertaintyFactor),
    anomaly_distance: Number(D_M.toFixed(2)),
    z_scores,
    is_critical_seizure,
    learned_probabilities,
    hybrid_confidence_pct,
    statistical_verdict,
    learned_verdict,
  };
}

export function formatRulWithUncertainty(seconds: number, uncertaintySec: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mainStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  const uh = Math.floor(uncertaintySec / 3600);
  const um = Math.floor((uncertaintySec % 3600) / 60);
  const us = Math.floor(uncertaintySec % 60);
  const uncStr = uh > 0
    ? `${uh.toString().padStart(2, '0')}:${um.toString().padStart(2, '0')}:${us.toString().padStart(2, '0')}`
    : `${um.toString().padStart(2, '0')}:${us.toString().padStart(2, '0')}`;

  return `${mainStr} (± ${uncStr})`;
}

export function formatRul(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
