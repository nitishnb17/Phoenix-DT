import { ActiveFaults, MissionPhase, TelemetryEngine, TelemetryFlight, VibrationBands } from '../types';

export function gaussianNoise(mean = 0, stdev = 1): number {
  const u1 = Math.max(1e-7, Math.random());
  const u2 = Math.random();
  const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + stdev * randStdNormal;
}

export function computeAtmosphere(altitudeFt: number, kias: number, oatOffsetDegC = 0) {
  const h = Math.max(0, altitudeFt);
  const T_ambient = 288.15 - 0.0019812 * h + oatOffsetDegC;
  const P_ambient = 101.325 * Math.pow(Math.max(0.01, 1 - (0.0019812 * h) / 288.15), 5.25588);
  const rho = (P_ambient * 1000) / (287.058 * Math.max(50, T_ambient));
  const rho0 = 1.225;
  const KTAS = kias * Math.sqrt(Math.max(0.1, rho0 / rho));
  const oatCelsius = T_ambient - 273.15;
  return { T_ambient, P_ambient, rho, KTAS, oatCelsius };
}

export interface PhysicsParams {
  phase: MissionPhase;
  altitudeFt: number;
  throttlePct: number;
  mixturePct: number;
  faults: ActiveFaults;
  timeElapsedSec: number;
  prevEngine?: TelemetryEngine;
  oatOffsetDegC?: number;
}

export function stepPhysics(params: PhysicsParams): { engine: TelemetryEngine; flight: TelemetryFlight } {
  const {
    phase,
    altitudeFt,
    throttlePct,
    mixturePct,
    faults,
    timeElapsedSec,
    oatOffsetDegC = 0,
  } = params;

  let baseRpm = 5500;
  let baseKias = 150;
  if (phase === 'TAKEOFF') {
    baseRpm = 5850;
    baseKias = 95;
  } else if (phase === 'CLIMB') {
    baseRpm = 5800;
    baseKias = 125;
  } else if (phase === 'CRUISE') {
    baseRpm = 5500;
    baseKias = 145;
  } else if (phase === 'DESCENT') {
    baseRpm = 4800;
    baseKias = 135;
  }

  const powerFactor = throttlePct / 100;
  const targetRpm = baseRpm * (0.6 + 0.4 * powerFactor);
  const { rho, KTAS: computedKtas, oatCelsius } = computeAtmosphere(altitudeFt, baseKias * powerFactor, oatOffsetDegC);

  let ktas = computedKtas;
  ktas = Math.max(40, ktas - faults.icing_severity * 0.85);

  const lambda_ratio = mixturePct / 100;
  const CHT_nominal = 320 + throttlePct * 0.8 - ktas * 0.45 + (oatOffsetDegC * 0.8);
  const EGT_nominal = 1300 + (1 - lambda_ratio) * 450;
  const Oil_Pressure_nominal = 50;
  const Oil_Temp_nominal = 200 + (throttlePct - 60) * 0.35 + (oatOffsetDegC * 0.5);
  const Fuel_Flow_nominal = (18 * (throttlePct / 75));

  let actualRpm = targetRpm;
  let actualEgt = EGT_nominal;
  let actualCht = CHT_nominal;
  let actualOilPress = Oil_Pressure_nominal;
  let actualOilTemp = Oil_Temp_nominal;
  let actualFuelFlow = Fuel_Flow_nominal;
  let actualBusVoltage = 28.2;
  let actualChargingCurrent = 14.2 + (throttlePct * 0.05);
  let actualInjectionTiming = 24.0;

  let vib1x = 0.35 + (actualRpm / 5500) * 0.15;
  let vib2x = 0.22 + (actualRpm / 5500) * 0.08;
  let vibHighFreq = 0.28;

  const sFuel = faults.fuel_leak_severity;
  if (sFuel > 0) {
    actualFuelFlow = actualFuelFlow * (1 - 0.01 * sFuel);
    actualEgt += sFuel * 3.8;
    const leakNoiseSigma = Math.pow(sFuel * 1.8, 2) * 0.0001;
    actualRpm -= sFuel * 8.5 + gaussianNoise(0, leakNoiseSigma);
  }

  const sInj = faults.injector_clog_severity;
  if (sInj > 0) {
    actualEgt += Math.min(sInj * 2.5, 250);
    const rpmVar = Math.pow(sInj, 2.1) * 0.05;
    actualRpm += gaussianNoise(0, Math.sqrt(Math.max(0, rpmVar)));
    actualInjectionTiming -= (sInj * 0.08);
    vibHighFreq += (sInj * 0.012);
  }

  const sOil = faults.oil_leak_severity;
  if (sOil > 0) {
    actualOilPress = 50 - sOil * 0.42;
    actualOilTemp += sOil * 0.85;
    if (actualOilPress < 35) {
      actualCht += Math.pow(Math.max(0, 35 - actualOilPress), 1.42);
      actualOilTemp += Math.pow(Math.max(0, 35 - actualOilPress), 1.2);
    }
  }

  const sIce = faults.icing_severity;
  if (sIce > 0) {
    actualRpm += sIce * 4.5;
    actualCht += sIce * 0.15;
    vib1x += sIce * 0.008;
  }

  const sPayload = faults.payload_overheat_severity;
  if (sPayload > 0) {
    actualCht += sPayload * 0.08;
  }

  const sMisfire = faults.misfire_severity;
  if (sMisfire > 0) {
    const misfireOsc = Math.sin(timeElapsedSec * 8.0) * (sMisfire * 3.8);
    const dropPulse = (timeElapsedSec % 3 === 0) ? (sMisfire * 4.2) : 0;
    actualRpm -= (sMisfire * 2.2 + Math.abs(misfireOsc) + dropPulse);
    actualInjectionTiming += ((Math.sin(timeElapsedSec * 4) * sMisfire * 0.12) - sMisfire * 0.05);
    vibHighFreq += (sMisfire * 0.024);
    vib2x += (sMisfire * 0.015);
  }

  const sCombust = faults.combustion_instability_severity;
  if (sCombust > 0) {
    const flameFlicker = gaussianNoise(0, sCombust * 1.8);
    actualEgt += flameFlicker;
    vib1x += Math.abs(gaussianNoise(0, sCombust * 0.01));
    vibHighFreq += (sCombust * 0.014);
    actualRpm += gaussianNoise(0, sCombust * 0.9);
  }

  const sLubDegr = faults.lubrication_degradation_severity;
  if (sLubDegr > 0) {
    actualOilTemp += sLubDegr * 0.55;
    actualOilPress -= sLubDegr * 0.12;
    vibHighFreq += sLubDegr * 0.016;
  }

  const sCoking = faults.coking_degradation_severity;
  if (sCoking > 0) {
    actualFuelFlow *= (1 - sCoking * 0.0025);
    actualEgt += sCoking * 0.75;
    actualInjectionTiming -= sCoking * 0.04;
  }

  const sElec = faults.electrical_fault_severity;
  if (sElec > 0) {
    actualBusVoltage = Math.max(16.0, 28.2 - (sElec * 0.11) + gaussianNoise(0, sElec * 0.02));
    actualChargingCurrent = Math.max(0, 14.2 - (sElec * 0.18) + gaussianNoise(0, sElec * 0.08));
  }

  actualRpm += gaussianNoise(0, 4.5);
  actualOilPress = Math.max(0, actualOilPress + gaussianNoise(0, 0.2));
  actualOilTemp = Math.max(100, actualOilTemp + gaussianNoise(0, 0.4));
  actualCht = Math.max(70, actualCht + gaussianNoise(0, 0.6));
  actualEgt = Math.max(400, actualEgt + gaussianNoise(0, 1.8));
  actualFuelFlow = Math.max(0, actualFuelFlow + gaussianNoise(0, 0.1));
  actualBusVoltage = Number(Math.max(12, actualBusVoltage + gaussianNoise(0, 0.05)).toFixed(1));
  actualChargingCurrent = Number(Math.max(0, actualChargingCurrent + gaussianNoise(0, 0.1)).toFixed(1));
  actualInjectionTiming = Number((actualInjectionTiming + gaussianNoise(0, 0.1)).toFixed(1));

  vib1x = Math.max(0.1, vib1x + gaussianNoise(0, 0.02));
  vib2x = Math.max(0.08, vib2x + gaussianNoise(0, 0.015));
  vibHighFreq = Math.max(0.12, vibHighFreq + gaussianNoise(0, 0.02));
  const vibRms = Math.sqrt(Math.pow(vib1x, 2) + Math.pow(vib2x, 2) + Math.pow(vibHighFreq, 2));

  const vibrationBands: VibrationBands = {
    rms_g: Number(vibRms.toFixed(2)),
    harmonic_1x_g: Number(vib1x.toFixed(2)),
    harmonic_2x_g: Number(vib2x.toFixed(2)),
    high_freq_g: Number(vibHighFreq.toFixed(2)),
  };

  const pressScore = Math.max(0, Math.min(100, (actualOilPress / 50) * 100));
  const tempScore = Math.max(0, Math.min(100, 100 - Math.max(0, actualOilTemp - 220) * 1.5));
  const lubricationHealthScore = Number(((pressScore * 0.6) + (tempScore * 0.4)).toFixed(1));

  const sDrift = faults.sensor_drift_severity;
  const reportedEgt = actualEgt + sDrift * timeElapsedSec * 0.08;

  const wobbleFactor = Math.min(1.0, (faults.icing_severity + faults.injector_clog_severity + faults.misfire_severity) / 100);
  const timeWave = timeElapsedSec * 0.8;
  const pitch = Number((1.2 + Math.sin(timeWave) * (0.3 + wobbleFactor * 1.8) + (gaussianNoise(0, 0.08) * wobbleFactor)).toFixed(1));
  const roll = Number((Math.cos(timeWave * 0.7) * (0.4 + wobbleFactor * 2.2) + (gaussianNoise(0, 0.1) * wobbleFactor)).toFixed(1));

  return {
    engine: {
      rpm: Math.round(actualRpm),
      oil_press: Number(actualOilPress.toFixed(1)),
      oil_temp_degf: Number(actualOilTemp.toFixed(1)),
      cht: Number(actualCht.toFixed(1)),
      egt: Number(reportedEgt.toFixed(1)),
      egt_actual: Number(actualEgt.toFixed(1)),
      fuel_flow: Number(actualFuelFlow.toFixed(2)),
      vibration_bands: vibrationBands,
      bus_voltage_v: actualBusVoltage,
      charging_current_a: actualChargingCurrent,
      injection_timing_deg: actualInjectionTiming,
      lubrication_health_score: lubricationHealthScore,
    },
    flight: {
      altitude: Math.round(altitudeFt),
      airspeed: Math.round(ktas),
      oat: Number(oatCelsius.toFixed(1)),
      pitch,
      roll,
      kias: Math.round(baseKias * powerFactor),
      ktas: Math.round(ktas),
      air_density: Number(rho.toFixed(3)),
    },
  };
}
