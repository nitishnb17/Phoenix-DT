import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.post('/api/copilot/chat', async (req, res) => {
    try {
      const { userPrompt, snapshot, telemetry, active_faults, ai_diagnostics } = req.body || {};

      // Extract unified snapshot data with fallbacks
      const phase = snapshot?.mission_phase || telemetry?.mission_phase || 'CRUISE';
      const uptimeSec = snapshot?.uptime_seconds ?? telemetry?.uptime_seconds ?? 0;
      const eng = snapshot?.engine_telemetry || telemetry?.engine || {};
      const flt = snapshot?.flight_envelope || telemetry?.flight || {};
      const fltVec = snapshot?.active_fault_vector || active_faults || {};
      const diag = snapshot?.ai_diagnostic_matrix || ai_diagnostics || {};

      const apiKey = process.env.GEMINI_API_KEY;

      const rpm = eng.rpm || 5500;
      const cht = eng.cht_degf || eng.cht || 320;
      const egt = eng.egt_degf || eng.egt || 1300;
      const egtActual = eng.egt_actual_degf || eng.egt_actual || 1300;
      const oilPress = eng.oil_pressure_psi ?? eng.oil_press ?? 50;
      const oilTemp = eng.oil_temp_degf || 195;
      const fuelFlow = eng.fuel_flow_gph || eng.fuel_flow || 18;
      const busV = eng.bus_voltage_v || 28.0;
      const busA = eng.charging_current_a || 14.5;
      const injTiming = eng.injection_timing_deg || 24.0;
      const lubHealth = eng.lubrication_health_score_pct ?? eng.lubrication_health_score ?? 100;
      const vibRms = eng.vibration_bands?.rms_g || 0.85;
      const vibHf = eng.vibration_bands?.high_freq_floor_g || eng.vibration_bands?.high_freq_g || 0.15;
      const vib1x = eng.vibration_bands?.harmonic_1x_g || 0.45;
      const vib2x = eng.vibration_bands?.harmonic_2x_g || 0.25;

      const altitude = flt.altitude_ft || flt.altitude || 25000;
      const airspeed = flt.airspeed_ktas || flt.airspeed || 200;
      const oat = flt.oat_degc || flt.oat || -34.5;

      const classifiedFault = diag.classified_fault || 'NOMINAL';
      const healthPct = diag.health_index_pct ?? 100;
      const anomalyDist = diag.mahalanobis_distance ?? diag.anomaly_distance ?? 0;
      const rulSec = diag.rul_seconds ?? 14400;
      const confidencePct = diag.hybrid_confidence_pct ?? 94;

      const telemetryContext = `
=========================================
PHOENIX-DT DIAGNOSTIC TELEMETRY SNAPSHOT
=========================================
1. MISSION & FLIGHT ENVELOPE:
- Mission Phase: ${phase} | Uptime: ${uptimeSec}s
- Altitude: ${altitude} ft | Airspeed: ${airspeed} KTAS | OAT: ${oat}°C

2. PROPULSION & THERMODYNAMICS:
- Engine RPM: ${rpm} RPM
- Cylinder Head Temp (CHT): ${cht}°F (Nominal: 300-340°F)
- Exhaust Gas Temp (Reported): ${egt}°F | Actual Combustion EGT: ${egtActual}°F
- Fuel Flow Rate: ${fuelFlow} GPH | Injection Timing: ${injTiming}° BTDC

3. LUBRICATION & MECHANICAL:
- Oil Pressure: ${oilPress} PSI (Critical Seizure Threshold: <15 PSI, Low Caution: <35 PSI)
- Oil Temperature: ${oilTemp}°F (Max Caution: >235°F)
- Lubrication Health Score: ${lubHealth}%

4. ELECTRICAL & VIBRATION:
- Main 28V DC Bus: ${busV} V | Generator Current: ${busA} A
- Vibration RMS: ${vibRms} g | High-Frequency Bearing Noise Floor: ${vibHf} g
- Harmonics: 1x RPM = ${vib1x}g, 2x RPM = ${vib2x}g

5. ACTIVE FAULT VECTOR STATUS:
- Fuel Line Leak: ${fltVec.fuel_line_leak_pct ?? fltVec.fuel_leak_severity ?? 0}%
- Injector Clogging: ${fltVec.injector_clog_pct ?? fltVec.injector_clog_severity ?? 0}%
- Oil Scavenge Leak: ${fltVec.oil_scavenge_leak_pct ?? fltVec.oil_leak_severity ?? 0}%
- Cylinder Misfire: ${fltVec.misfire_severity_pct ?? fltVec.misfire_severity ?? 0}%
- Combustion Instability: ${fltVec.combustion_instability_pct ?? fltVec.combustion_instability_severity ?? 0}%
- Lubrication Degradation: ${fltVec.lubrication_degradation_pct ?? fltVec.lubrication_degradation_severity ?? 0}%
- Valve Coking Degradation: ${fltVec.coking_degradation_pct ?? fltVec.coking_degradation_severity ?? 0}%
- Electrical Alternator Fault: ${fltVec.electrical_fault_pct ?? fltVec.electrical_fault_severity ?? 0}%
- Airframe Icing: ${fltVec.airframe_icing_pct ?? fltVec.icing_severity ?? 0}%
- EGT Sensor Drift: ${fltVec.sensor_drift_pct ?? fltVec.sensor_drift_severity ?? 0}%
- Gimbal Payload Overheat: ${fltVec.payload_overheat_pct ?? fltVec.payload_overheat_severity ?? 0}%

6. AI/ML HYBRID DIAGNOSTIC CLASSIFICATION:
- Primary Classified Diagnosis: ${classifiedFault}
- Overall Propulsion Health Index: ${healthPct}%
- Mahalanobis Anomaly Distance (D_M): ${anomalyDist.toFixed ? anomalyDist.toFixed(2) : anomalyDist}
- Remaining Useful Life (RUL): ${Math.round(rulSec / 60)} minutes (${rulSec} seconds)
- Diagnostic Confidence: ${confidencePct}%
- Imminent Mechanical Seizure Danger: ${diag.is_critical_seizure || oilPress < 15 ? 'YES (CRITICAL)' : 'NO'}
`;

      const promptText = `
You are the Phoenix-DT UAV Maintenance Copilot for a high-altitude aero-piston unmanned propulsion system.
Analyze the live injected diagnostic telemetry snapshot and operator query. Provide aerospace-grade, explainable recommendations, immediate pilot action items, and maintenance hangar procedures.

${telemetryContext}

OPERATOR QUERY:
"${userPrompt || 'Provide an engineering status assessment of the current propulsion telemetry.'}"
`;

      if (apiKey && apiKey.trim() !== '') {
        try {
          console.log('[Copilot Server] Initiating Gemini generateContent with model: gemini-3.7-flash');
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          let responseText = '';
          const candidateModels = ['gemini-3.7-flash', 'gemini-2.5-flash'];

          for (const candidateModel of candidateModels) {
            try {
              console.log(`[Copilot Server] Calling Gemini generateContent with model: ${candidateModel}`);
              const response = await ai.models.generateContent({
                model: candidateModel,
                contents: promptText,
                config: {
                  systemInstruction:
                    'You are an expert UAV propulsion maintenance copilot and flight test engineer. Deliver authoritative, technical aerospace recommendations with clear action steps, distinguish instrumentation sensor drift from physical faults, and highlight flight safety urgency.',
                },
              });

              if (response.text) {
                responseText = response.text;
                console.log(`[Copilot Server] Gemini response received from ${candidateModel}. Length:`, responseText.length);
                return res.json({ reply: responseText, source: candidateModel });
              }
            } catch (modelErr: any) {
              console.warn(`[Copilot Server] Attempt with ${candidateModel} failed:`, modelErr?.message || modelErr);
              // continue to next model candidate or fallback
            }
          }

          // If all online models fail, invoke fallback below
          throw new Error('All primary LLM candidates temporarily unavailable (503/high load).');
        } catch (llmErr: any) {
          console.error('[Copilot Server] Gemini API call failed with detailed error:', {
            message: llmErr?.message,
            status: llmErr?.status,
            statusCode: llmErr?.statusCode,
            code: llmErr?.code,
            stack: llmErr?.stack,
            errorDetails: llmErr?.errorDetails || llmErr?.response?.data || llmErr,
          });

          const errMsg = String(llmErr?.message || '');
          let errorCategory = 'provider_error';
          if (errMsg.includes('401') || errMsg.includes('API key') || errMsg.includes('unauthorized') || errMsg.includes('PERMISSION_DENIED')) {
            errorCategory = 'provider_auth_failed';
          } else if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || errMsg.includes('Quota')) {
            errorCategory = 'quota_exceeded';
          } else if (errMsg.includes('404') || errMsg.includes('NOT_FOUND') || errMsg.includes('model not found')) {
            errorCategory = 'model_not_found';
          } else if (errMsg.includes('400') || errMsg.includes('INVALID_ARGUMENT')) {
            errorCategory = 'bad_request_payload';
          }

          // Fallback to high-precision synthetic telemetry rule engine
          const fallbackReply = generateTelemetryRuleBasedResponse({
            classifiedFault,
            oilPress,
            oilTemp,
            lubHealth,
            cht,
            fuelFlow,
            egt,
            egtActual,
            injTiming,
            vib1x,
            vib2x,
            busV,
            busA,
            airspeed,
            oat,
            healthPct,
            rpm,
            anomalyDist,
            rulSec,
            phase,
            fltVec,
          });

          return res.status(200).json({
            reply: fallbackReply,
            source: 'synthetic_rule_engine',
            warning: {
              category: errorCategory,
              message: llmErr?.message || 'LLM provider invocation failed; served via on-board diagnostic rule engine.',
            },
          });
        }
      } else {
        console.warn('[Copilot Server] GEMINI_API_KEY environment variable is missing or empty. Serving via deterministic rule engine.');
        const syntheticResponse = generateTelemetryRuleBasedResponse({
          classifiedFault,
          oilPress,
          oilTemp,
          lubHealth,
          cht,
          fuelFlow,
          egt,
          egtActual,
          injTiming,
          vib1x,
          vib2x,
          busV,
          busA,
          airspeed,
          oat,
          healthPct,
          rpm,
          anomalyDist,
          rulSec,
          phase,
          fltVec,
        });

        return res.json({
          reply: syntheticResponse,
          source: 'synthetic_rule_engine',
          warning: {
            category: 'missing_api_key',
            message: 'GEMINI_API_KEY is not configured in server environment.',
          },
        });
      }
    } catch (err: any) {
      console.error('[Copilot Server] Fatal internal exception in /api/copilot/chat handler:', {
        message: err?.message,
        stack: err?.stack,
        error: err,
      });

      return res.status(500).json({
        error: 'internal_server_error',
        message: err?.message || 'Internal copilot generation failure',
        category: 'server_exception',
      });
    }
  });

  function generateTelemetryRuleBasedResponse(params: {
    classifiedFault: string;
    oilPress: number;
    oilTemp: number;
    lubHealth: number;
    cht: number;
    fuelFlow: number;
    egt: number;
    egtActual: number;
    injTiming: number;
    vib1x: number;
    vib2x: number;
    busV: number;
    busA: number;
    airspeed: number;
    oat: number;
    healthPct: number;
    rpm: number;
    anomalyDist: any;
    rulSec: number;
    phase: string;
    fltVec: any;
  }): string {
    const {
      classifiedFault,
      oilPress,
      oilTemp,
      lubHealth,
      cht,
      fuelFlow,
      egt,
      egtActual,
      injTiming,
      vib1x,
      vib2x,
      busV,
      busA,
      airspeed,
      oat,
      healthPct,
      rpm,
      anomalyDist,
      rulSec,
      phase,
      fltVec,
    } = params;

    if (classifiedFault === 'CRITICAL_ENGINE_SEIZURE' || oilPress < 15) {
      return `🚨 **CRITICAL FLIGHT SAFETY ALERT: CATASTROPHIC ENGINE SEIZURE IMMINENT**
- **Telemetry State**: Oil pressure has collapsed to **${oilPress} PSI** (below the 15.0 PSI hydrodynamic seizure threshold). Oil temp: ${oilTemp}°F.
- **Root Cause**: Severe oil scavenge pump loss / catastrophic fluid depletion.
- **Immediate GCS Pilot Action**:
  1. Prepare for forced descent / glide recovery checklist immediately.
  2. Set throttle to idle to reduce bearing seizure friction.
  3. Alert ground recovery crew with current coordinates.
- **Hangar Maintenance**: Complete powerhead teardown required. Inspect crankshaft journals and bearing shells for thermal galling.`;
    } else if (classifiedFault === 'OIL_PRESSURE_LOSS' || (fltVec.oil_scavenge_leak_pct ?? fltVec.oil_leak_severity ?? 0) > 0) {
      return `⚠️ **OIL SYSTEM DEGRADATION DETECTED**
- **Telemetry State**: Oil scavenge pressure has degraded to **${oilPress} PSI** (Health: ${lubHealth}%, CHT: ${cht}°F).
- **Physical Dynamics**: Progressive oil line leak leading to boundary-layer lubrication loss and thermal accumulation.
- **Recommended Action**:
  1. Reduce engine throttle to minimum required cruise power (${rpm} RPM).
  2. Divert to nearest alternate landing waypoint.
  3. Hangar Crew: Pressure test oil cooler, scavenge lines, and replace filter element.`;
    } else if (classifiedFault === 'FUEL_LINE_LEAK' || (fltVec.fuel_line_leak_pct ?? fltVec.fuel_leak_severity ?? 0) > 0) {
      return `⚠️ **FUEL SYSTEM INTEGRITY FAULT (LEAN BURN SPIKE)**
- **Telemetry State**: Fuel flow degraded to **${fuelFlow} GPH**, causing lean combustion with EGT surging to **${egt}°F**.
- **Physical Dynamics**: Unmetered fuel line pressure drop starved injection rails.
- **Recommended Action**:
  1. Enrich fuel mixture or switch to auxiliary fuel feed circuit.
  2. Calculate updated bingo fuel range for immediate RTB (Return to Base).
  3. Inspect fuel rail banjo fittings and primary lift pump seals.`;
    } else if (classifiedFault === 'INJECTOR_CLOGGING' || (fltVec.injector_clog_pct ?? fltVec.injector_clog_severity ?? 0) > 0) {
      return `⚠️ **FUEL INJECTOR CLOGGING / FLOW RESTRICTION**
- **Telemetry State**: Injection timing flutter at **${injTiming}° BTDC**, with asymmetric cylinder thermal gradient (CHT: ${cht}°F, EGT: ${egt}°F).
- **Recommended Action**:
  1. Command automated ultrasonic injector purge cycle if equipped.
  2. Hangar Crew: Remove and flow-bench test injector nozzles 1-4; flush fuel manifold.`;
    } else if (classifiedFault === 'CYLINDER_MISFIRE' || (fltVec.misfire_severity_pct ?? fltVec.misfire_severity ?? 0) > 0) {
      return `⚠️ **CYLINDER MISFIRE / IGNITION INSTABILITY**
- **Telemetry State**: High vibration harmonic detected (1x: ${vib1x}g, 2x: ${vib2x}g) with fluctuating CHT (${cht}°F).
- **Recommended Action**:
  1. Verify dual-magneto / electronic CDI ignition channel A/B status.
  2. Avoid high-power climb pitch-up commands.
  3. Hangar Crew: Replace dual spark plugs and test ignition coil harness resistance.`;
    } else if (classifiedFault === 'ELECTRICAL_BUS_SAG' || busV < 24.0 || (fltVec.electrical_fault_pct ?? fltVec.electrical_fault_severity ?? 0) > 0) {
      return `⚠️ **ELECTRICAL BUS VOLTAGE SAG DETECTED**
- **Telemetry State**: 28V DC bus dropped to **${busV} V** (Generator Load: ${busA} A).
- **Physical Dynamics**: Alternator rectifier degradation / excessive avionics bus draw.
- **Recommended Action**:
  1. Shed non-essential payload heaters and secondary ISR transceivers.
  2. Verify battery backup charging circuit status.`;
    } else if (classifiedFault === 'AIRFRAME_ICING' || (fltVec.airframe_icing_pct ?? fltVec.icing_severity ?? 0) > 0) {
      return `⚠️ **AIRFRAME ICING ACCUMULATION DETECTED**
- **Telemetry State**: Airspeed dropped to **${airspeed} KTAS** (OAT: ${oat}°C) with engine load increasing to maintain level flight.
- **Recommended Action**:
  1. Activate electro-thermal wing leading edge de-ice boots immediately.
  2. Request descent or route diversion to flight level with OAT > 0°C.`;
    } else if (classifiedFault === 'SENSOR_DRIFT' || (fltVec.sensor_drift_pct ?? fltVec.sensor_drift_severity ?? 0) > 0) {
      return `ℹ️ **INSTRUMENTATION TELEMETRY DRIFT (FALSE ALARM DISCRIMINATED)**
- **Telemetry State**: Thermocouple reported EGT is **${egt}°F**, but physical combustion EGT is **${egtActual}°F** and CHT is nominal (**${cht}°F**).
- **Explainable AI Assessment**: Signal drift detected without thermodynamic correlation. The engine is mechanically healthy (Health Index: ${healthPct}%).
- **Recommended Action**:
  1. No flight abort required; proceed with planned mission profile.
  2. Log thermocouple calibration replacement for next scheduled turn-around.`;
    } else {
      return `✅ **PROPULSION SYSTEM NOMINAL (Health Index: ${healthPct}%)**
- **Operating Parameters**: RPM: ${rpm} | Oil: ${oilPress} PSI (${oilTemp}°F) | CHT: ${cht}°F | EGT: ${egt}°F | Bus: ${busV}V.
- **AI Diagnostics**: Mahalanobis distance D_M = ${typeof anomalyDist === 'number' ? anomalyDist.toFixed(2) : anomalyDist} (Normal < 3.0). RUL: ${Math.round(rulSec / 60)} minutes.
- **Recommendation**: All engine subsystems are operating within DRDO 26054 standard operating envelope for ${phase} phase.`;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PHOENIX-DT GCS Server running on port ${PORT}`);
  });
}

startServer();
