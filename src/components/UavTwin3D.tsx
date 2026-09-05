import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Crosshair,
  Droplets,
  Eye,
  Flame,
  Gauge,
  Layers,
  Minus,
  Navigation,
  Plus,
  Radio,
  RefreshCw,
  Rotate3d,
  ShieldAlert,
  Snowflake,
  Sparkles,
  Thermometer,
  Waves,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../lib/store';

export type CameraPreset = 'ORBIT' | 'CHASE' | 'ENGINE' | 'FUEL' | 'GIMBAL' | 'TOP_DOWN';

export interface SensorNodeData {
  id: string;
  name: string;
  subsystem: string;
  pos: [number, number, number];
  isError: boolean;
  isWarning: boolean;
  statusText: string;
  valueText: string;
  color: string;
  iconType: 'fuel' | 'oil' | 'cht' | 'egt' | 'elec' | 'ice' | 'vib' | 'gimbal';
}

export function UavTwin3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    engine,
    flight,
    faults,
    theme,
    diagnostics,
    isReplaying,
    activeReplayFrame,
  } = useAppStore();

  const isDark = theme === 'dark';

  // Active telemetry source
  const currentEngine = isReplaying && activeReplayFrame ? activeReplayFrame.engine : engine;
  const currentFlight = isReplaying && activeReplayFrame ? activeReplayFrame.flight : flight;
  const currentFaults = isReplaying && activeReplayFrame ? activeReplayFrame.faults : faults;
  const currentDiagnostics = isReplaying && activeReplayFrame ? activeReplayFrame.diagnostics : diagnostics;

  // Viewport states
  const [activePreset, setActivePreset] = useState<CameraPreset>('ORBIT');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [attitudeLock, setAttitudeLock] = useState<boolean>(false);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [hoveredSensorId, setHoveredSensorId] = useState<string | null>(null);
  const [pinFilter, setPinFilter] = useState<'ANOMALIES_ONLY' | 'ALL' | 'OFF'>('ANOMALIES_ONLY');
  const [screenPinPositions, setScreenPinPositions] = useState<Record<string, { x: number; y: number; visible: boolean }>>({});

  // Three.js object references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const uavRootGroupRef = useRef<THREE.Group | null>(null);
  const propellerGroupRef = useRef<THREE.Group | null>(null);

  // Stable camera motion & interpolation refs
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const autoRotateRef = useRef<boolean>(autoRotate);
  const attitudeLockRef = useRef<boolean>(attitudeLock);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    attitudeLockRef.current = attitudeLock;
  }, [attitudeLock]);

  // Mesh refs for dynamic visual telemetry & fault feedback
  const fuelLinesMeshRef = useRef<THREE.Mesh | null>(null);
  const leftWingTankMeshRef = useRef<THREE.Mesh | null>(null);
  const rightWingTankMeshRef = useRef<THREE.Mesh | null>(null);
  const oilPumpMeshRef = useRef<THREE.Mesh | null>(null);
  const oilLinesMeshRef = useRef<THREE.Mesh | null>(null);
  const engineBlockMeshRef = useRef<THREE.Mesh | null>(null);
  const cylinderHeadsRef = useRef<THREE.Mesh[]>([]);
  const exhaustRunnersRef = useRef<THREE.Mesh | null>(null);
  const alternatorMeshRef = useRef<THREE.Mesh | null>(null);
  const wingLeadingEdgeDeiceRef = useRef<THREE.Mesh | null>(null);
  const gimbalDomeMeshRef = useRef<THREE.Mesh | null>(null);
  const vibSensorMeshRef = useRef<THREE.Mesh | null>(null);
  const shockRingsRef = useRef<THREE.Mesh[]>([]);

  // Ref to hold fault states for the 60fps render loop
  const faultStateRef = useRef({
    fuelLeak: false,
    injectorClog: false,
    oilLeak: false,
    oilLow: false,
    oilHot: false,
    chtHigh: false,
    egtHigh: false,
    misfire: false,
    combustionInstable: false,
    elecError: false,
    icing: false,
    vibHigh: false,
    gimbalOverheat: false,
    rpm: 5500,
    pitch: 0,
    roll: 0,
  });

  // Sensor state conditions
  const isFuelLeak = currentFaults.fuel_leak_severity > 0;
  const isInjectorClog = currentFaults.injector_clog_severity > 0;
  const isCoking = currentFaults.coking_degradation_severity > 0;
  const isOilLeak = currentFaults.oil_leak_severity > 0;
  const isOilLow = currentEngine.oil_press < 35;
  const isOilHot = currentEngine.oil_temp_degf > 235;
  const isChtElevated = currentEngine.cht > 380;
  const isEgtElevated = currentEngine.egt > 1500;
  const isMisfire = currentFaults.misfire_severity > 0;
  const isCombustionInstable = currentFaults.combustion_instability_severity > 0;
  const isElecFault = currentFaults.electrical_fault_severity > 0;
  const isVoltSag = currentEngine.bus_voltage_v < 24.0;
  const isElectricalError = isElecFault || isVoltSag;
  const isIcing = currentFaults.icing_severity > 0;
  const isVibHigh = currentEngine.vibration_bands.high_freq_g > 0.45 || currentEngine.vibration_bands.rms_g > 1.2;
  const isGimbalOverheat = currentFaults.payload_overheat_severity > 0;

  // Keep fault state ref synchronized for per-frame animation
  useEffect(() => {
    faultStateRef.current = {
      fuelLeak: isFuelLeak,
      injectorClog: isInjectorClog,
      oilLeak: isOilLeak,
      oilLow: isOilLow,
      oilHot: isOilHot,
      chtHigh: isChtElevated,
      egtHigh: isEgtElevated,
      misfire: isMisfire,
      combustionInstable: isCombustionInstable,
      elecError: isElectricalError,
      icing: isIcing,
      vibHigh: isVibHigh,
      gimbalOverheat: isGimbalOverheat,
      rpm: currentEngine.rpm,
      pitch: currentFlight.pitch,
      roll: currentFlight.roll,
    };
  }, [
    isFuelLeak,
    isInjectorClog,
    isOilLeak,
    isOilLow,
    isOilHot,
    isChtElevated,
    isEgtElevated,
    isMisfire,
    isCombustionInstable,
    isElectricalError,
    isIcing,
    isVibHigh,
    isGimbalOverheat,
    currentEngine.rpm,
    currentFlight.pitch,
    currentFlight.roll,
  ]);

  // Spatial Sensor Nodes Definition
  const sensorNodes: SensorNodeData[] = useMemo(() => [
    {
      id: 'fuel-rail',
      name: 'Common Rail & Fuel Injectors',
      subsystem: 'Fuel System',
      pos: [0, 0.45, -1.9],
      isError: isFuelLeak || isInjectorClog,
      isWarning: !isFuelLeak && !isInjectorClog && isCoking,
      statusText: isFuelLeak
        ? `FUEL LEAK (-${currentFaults.fuel_leak_severity}%)`
        : isInjectorClog
        ? `INJECTOR RESTRICTION (${currentFaults.injector_clog_severity}%)`
        : isCoking
        ? `CARBON COKING (${currentFaults.coking_degradation_severity}%)`
        : 'FLOW BALANCED',
      valueText: `${currentEngine.fuel_flow.toFixed(1)} GPH`,
      color: isFuelLeak || isInjectorClog ? '#EF4444' : isCoking ? '#F59E0B' : '#06B6D4',
      iconType: 'fuel',
    },
    {
      id: 'fuel-tank-left',
      name: 'Left Wing Auxiliary Fuel Pod',
      subsystem: 'Fuel System',
      pos: [-3.8, 0.1, 0.2],
      isError: isFuelLeak,
      isWarning: false,
      statusText: isFuelLeak ? `FEED LINE DROP (-${currentFaults.fuel_leak_severity}%)` : 'PRESSURIZED',
      valueText: isFuelLeak ? 'LEAK DETECTED' : 'NOMINAL',
      color: isFuelLeak ? '#EF4444' : '#38BDF8',
      iconType: 'fuel',
    },
    {
      id: 'fuel-tank-right',
      name: 'Right Wing Auxiliary Fuel Pod',
      subsystem: 'Fuel System',
      pos: [3.8, 0.1, 0.2],
      isError: isFuelLeak,
      isWarning: false,
      statusText: isFuelLeak ? `FEED LINE DROP (-${currentFaults.fuel_leak_severity}%)` : 'PRESSURIZED',
      valueText: isFuelLeak ? 'LEAK DETECTED' : 'NOMINAL',
      color: isFuelLeak ? '#EF4444' : '#38BDF8',
      iconType: 'fuel',
    },
    {
      id: 'oil-scavenge',
      name: 'Dual Scavenge Oil Pump & Transducer',
      subsystem: 'Lubrication System',
      pos: [0, -0.3, -2.4],
      isError: isOilLeak || currentEngine.oil_press < 20,
      isWarning: !isOilLeak && currentEngine.oil_press >= 20 && (isOilLow || isOilHot),
      statusText: isOilLeak
        ? `SCAVENGE LEAK (${currentFaults.oil_leak_severity}%)`
        : isOilLow
        ? 'LOW OIL PRESSURE'
        : isOilHot
        ? 'OIL TEMP HIGH'
        : 'PRESSURE NOMINAL',
      valueText: `${currentEngine.oil_press} PSI · ${currentEngine.oil_temp_degf}°F`,
      color: (isOilLeak || currentEngine.oil_press < 20) ? '#EF4444' : (isOilLow || isOilHot) ? '#F97316' : '#38BDF8',
      iconType: 'oil',
    },
    {
      id: 'cht-cylinders',
      name: 'Cylinder Head Thermocouple Matrix (CHT 1-4)',
      subsystem: 'Propulsion Thermodynamics',
      pos: [0, 0.5, -2.2],
      isError: isChtElevated || isMisfire,
      isWarning: !isChtElevated && !isMisfire && currentEngine.cht > 375,
      statusText: isMisfire
        ? `CYLINDER MISFIRE (${currentFaults.misfire_severity}%)`
        : isChtElevated
        ? 'THERMAL OVERHEAT'
        : 'COMBUSTION BALANCED',
      valueText: `CHT: ${currentEngine.cht}°F`,
      color: (isChtElevated || isMisfire) ? '#EF4444' : currentEngine.cht > 375 ? '#F59E0B' : '#10B981',
      iconType: 'cht',
    },
    {
      id: 'egt-exhaust',
      name: 'Exhaust Gas Temperature (EGT Probes)',
      subsystem: 'Exhaust & Turbine',
      pos: [0, 0.2, -3.2],
      isError: isEgtElevated || isCombustionInstable,
      isWarning: !isEgtElevated && !isCombustionInstable && currentEngine.egt > 1475,
      statusText: isCombustionInstable
        ? 'COMBUSTION INSTABILITY'
        : isEgtElevated
        ? 'EGT EXHAUST SPIKE'
        : 'PEAK MIXTURE',
      valueText: `EGT: ${currentEngine.egt}°F`,
      color: (isEgtElevated || isCombustionInstable) ? '#EF4444' : '#F97316',
      iconType: 'egt',
    },
    {
      id: 'vib-accelerometer',
      name: '3-Axis Vibration Accelerometer (Engine Bed)',
      subsystem: 'Vibration & Dynamics',
      pos: [0, 0.1, -1.8],
      isError: isVibHigh,
      isWarning: !isVibHigh && (currentEngine.vibration_bands.high_freq_g > 0.45 || currentEngine.vibration_bands.rms_g > 1.25),
      statusText: isVibHigh
        ? `HIGH HF HARMONIC (${currentEngine.vibration_bands.high_freq_g}g)`
        : 'VIBRATION NOMINAL',
      valueText: `${currentEngine.vibration_bands.rms_g}g RMS`,
      color: isVibHigh ? '#A855F7' : '#06B6D4',
      iconType: 'vib',
    },
    {
      id: 'elec-alternator',
      name: 'Brushless Alternator & 28V DC Primary Bus',
      subsystem: 'Electrical & Power',
      pos: [0, 0.2, -1.1],
      isError: isElectricalError,
      isWarning: !isElectricalError && currentEngine.bus_voltage_v < 25.0,
      statusText: isElecFault
        ? `VOLTAGE SAG (${currentFaults.electrical_fault_severity}%)`
        : isVoltSag
        ? 'BUS UNDERVOLTAGE'
        : 'POWER REGULATED',
      valueText: `${currentEngine.bus_voltage_v}V · ${currentEngine.charging_current_a}A`,
      color: isElectricalError ? '#EAB308' : '#10B981',
      iconType: 'elec',
    },
    {
      id: 'ice-leading-edge',
      name: 'Wing Leading Edge Optical Icing Detectors',
      subsystem: 'Environmental Protection',
      pos: [0, 0.3, 0.7],
      isError: isIcing,
      isWarning: false,
      statusText: isIcing ? `ICE ACCRETION (${currentFaults.icing_severity}%)` : 'CLEAR OF ICE',
      valueText: isIcing ? 'DE-ICE HEATING ACTIVE' : 'LAMINAR FLOW',
      color: isIcing ? '#38BDF8' : '#0284C7',
      iconType: 'ice',
    },
    {
      id: 'gimbal-payload',
      name: 'AN/DAS-4 MTS-B Multi-Spectral EO/IR Turret',
      subsystem: 'Mission Avionics',
      pos: [0, -0.6, 2.7],
      isError: isGimbalOverheat,
      isWarning: !isGimbalOverheat && currentFaults.payload_overheat_severity > 25,
      statusText: isGimbalOverheat ? `TURRET OVERHEAT (${currentFaults.payload_overheat_severity}%)` : 'SENSOR LOCKED',
      valueText: isGimbalOverheat ? 'COOLING DEGRADED' : 'OPERATIONAL',
      color: isGimbalOverheat ? '#EF4444' : '#38BDF8',
      iconType: 'gimbal',
    },
  ], [
    isFuelLeak,
    isInjectorClog,
    isCoking,
    isOilLeak,
    isOilLow,
    isOilHot,
    isChtElevated,
    isEgtElevated,
    isMisfire,
    isCombustionInstable,
    isElectricalError,
    isElecFault,
    isVoltSag,
    isIcing,
    isVibHigh,
    isGimbalOverheat,
    currentEngine,
    currentFaults,
  ]);

  const activeAnomalyCount = sensorNodes.filter((s) => s.isError || s.isWarning).length;

  // Initialize Three.js Scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 700;
    const height = containerRef.current.clientHeight || 400;

    // 1. Scene
    const scene = new THREE.Scene();
    const bgColor = isDark ? 0x0a0f1d : 0xf1f5f9;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.025);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(7.5, 5.0, 9.5);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.15 : 1.0;
    rendererRef.current = renderer;

    // 4. OrbitControls with smooth, stable 360° rotation and anti-jitter damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.85;
    controls.panSpeed = 0.75;
    controls.minDistance = 2.0;
    controls.maxDistance = 45.0;
    controls.maxPolarAngle = Math.PI - 0.02; // prevent gimbal flip at exact nadir
    controls.minPolarAngle = 0.02; // prevent gimbal flip at exact zenith
    controls.target.set(0, 0, 0);

    // Cancel programmatic camera transition immediately when the operator manually drags
    controls.addEventListener('start', () => {
      isTransitioningRef.current = false;
      targetCamPosRef.current = null;
      targetLookAtRef.current = null;
    });

    controlsRef.current = controls;

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(isDark ? 0x334155 : 0xffffff, isDark ? 1.8 : 1.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, isDark ? 2.5 : 2.0);
    keyLight.position.set(15, 25, 15);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(isDark ? 0x38bdf8 : 0x94a3b8, isDark ? 1.4 : 0.8);
    fillLight.position.set(-15, -5, -10);
    scene.add(fillLight);

    const engineRimLight = new THREE.PointLight(0x06b6d4, 1.2, 12);
    engineRimLight.position.set(0, 1.0, -2.5);
    scene.add(engineRimLight);

    // 6. Ground Reference Grid
    const gridHelper = new THREE.GridHelper(
      40,
      40,
      isDark ? 0x06b6d4 : 0x0284c7,
      isDark ? 0x1e293b : 0xcbd5e1
    );
    gridHelper.position.y = -2.8;
    scene.add(gridHelper);

    // 7. Ground Reticle Ring
    const reticleGeom = new THREE.RingGeometry(3.5, 3.58, 64);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0x0284c7 : 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isDark ? 0.35 : 0.45,
    });
    const reticleMesh = new THREE.Mesh(reticleGeom, reticleMat);
    reticleMesh.rotation.x = Math.PI / 2;
    reticleMesh.position.y = -2.78;
    scene.add(reticleMesh);

    // 8. UAV Root Group
    const uavRoot = new THREE.Group();
    scene.add(uavRoot);
    uavRootGroupRef.current = uavRoot;

    // Materials
    const airframeMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x334155 : 0x64748b,
      metalness: 0.3,
      roughness: 0.4,
    });

    const satcomRadomeMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x475569 : 0x94a3b8,
      metalness: 0.2,
      roughness: 0.3,
    });

    const wingsMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x1e293b : 0x475569,
      metalness: 0.4,
      roughness: 0.35,
    });

    // 9. Fuselage Main Body
    const fuselageCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.2, 3.8),
      new THREE.Vector3(0, 0.1, 2.5),
      new THREE.Vector3(0, 0.2, 0.0),
      new THREE.Vector3(0, 0.25, -2.0),
      new THREE.Vector3(0, 0.2, -3.2),
    ]);
    const fuselageGeom = new THREE.TubeGeometry(fuselageCurve, 32, 0.48, 16, false);
    const fuselageMesh = new THREE.Mesh(fuselageGeom, airframeMat);
    uavRoot.add(fuselageMesh);

    // SATCOM Bulbous Avionics Nose
    const satcomGeom = new THREE.SphereGeometry(0.55, 20, 20);
    satcomGeom.scale(1.0, 0.85, 1.6);
    satcomGeom.translate(0, 0.32, 2.3);
    const satcomMesh = new THREE.Mesh(satcomGeom, satcomRadomeMat);
    uavRoot.add(satcomMesh);

    // Gimbal Payload Turret
    const gimbalBaseGeom = new THREE.CylinderGeometry(0.24, 0.28, 0.25, 16);
    gimbalBaseGeom.translate(0, -0.35, 2.7);
    const gimbalBaseMesh = new THREE.Mesh(gimbalBaseGeom, satcomRadomeMat);
    uavRoot.add(gimbalBaseMesh);

    const gimbalSphereGeom = new THREE.SphereGeometry(0.25, 16, 16);
    gimbalSphereGeom.translate(0, -0.55, 2.7);
    const gimbalMat = new THREE.MeshStandardMaterial({ color: isDark ? 0x1e293b : 0x334155, metalness: 0.8, roughness: 0.2 });
    const gimbalSphereMesh = new THREE.Mesh(gimbalSphereGeom, gimbalMat);
    uavRoot.add(gimbalSphereMesh);
    gimbalDomeMeshRef.current = gimbalSphereMesh;

    // Optical Lens Port
    const lensGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 16);
    lensGeom.rotateX(Math.PI / 2);
    lensGeom.translate(0, -0.55, 2.92);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const lensMesh = new THREE.Mesh(lensGeom, lensMat);
    uavRoot.add(lensMesh);

    // 10. High Aspect Ratio Wings
    const wingGeom = new THREE.BoxGeometry(10.5, 0.08, 0.75);
    wingGeom.translate(0, 0.15, 0.2);
    const wingMesh = new THREE.Mesh(wingGeom, wingsMat);
    uavRoot.add(wingMesh);

    // Wing Leading Edge De-Icing Strip
    const deiceGeom = new THREE.BoxGeometry(10.3, 0.03, 0.12);
    deiceGeom.translate(0, 0.15, 0.6);
    const deiceMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
    });
    const deiceMesh = new THREE.Mesh(deiceGeom, deiceMat);
    uavRoot.add(deiceMesh);
    wingLeadingEdgeDeiceRef.current = deiceMesh;

    // Winglet Upturned Tips
    const wingletGeom = new THREE.BoxGeometry(0.06, 0.5, 0.5);
    const leftWinglet = new THREE.Mesh(wingletGeom, airframeMat);
    leftWinglet.position.set(-5.25, 0.35, 0.2);
    uavRoot.add(leftWinglet);

    const rightWinglet = new THREE.Mesh(wingletGeom, airframeMat);
    rightWinglet.position.set(5.25, 0.35, 0.2);
    uavRoot.add(rightWinglet);

    // 11. Auxiliary Wing Fuel Tanks (Drop Pods)
    const tankGeom = new THREE.CylinderGeometry(0.2, 0.2, 1.8, 16);
    tankGeom.rotateX(Math.PI / 2);

    const leftTankMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5, roughness: 0.3 });
    const leftTank = new THREE.Mesh(tankGeom, leftTankMat);
    leftTank.position.set(-3.8, -0.05, 0.2);
    uavRoot.add(leftTank);
    leftWingTankMeshRef.current = leftTank;

    const rightTankMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.5, roughness: 0.3 });
    const rightTank = new THREE.Mesh(tankGeom, rightTankMat);
    rightTank.position.set(3.8, -0.05, 0.2);
    uavRoot.add(rightTank);
    rightWingTankMeshRef.current = rightTank;

    // Fuel Lines (Tubes connecting wing pods to engine bay)
    const fuelLineLeftCurve = new THREE.LineCurve3(new THREE.Vector3(-3.8, -0.05, 0.2), new THREE.Vector3(0, 0.2, -1.9));
    const fuelLineRightCurve = new THREE.LineCurve3(new THREE.Vector3(3.8, -0.05, 0.2), new THREE.Vector3(0, 0.2, -1.9));

    const fuelLineMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.4,
      roughness: 0.2,
    });

    const leftFuelLineMesh = new THREE.Mesh(new THREE.TubeGeometry(fuelLineLeftCurve, 12, 0.025, 8, false), fuelLineMat);
    const rightFuelLineMesh = new THREE.Mesh(new THREE.TubeGeometry(fuelLineRightCurve, 12, 0.025, 8, false), fuelLineMat);
    uavRoot.add(leftFuelLineMesh);
    uavRoot.add(rightFuelLineMesh);
    fuelLinesMeshRef.current = leftFuelLineMesh;

    // 12. Engine Bay Nacelle & Boxer Engine Block
    const engineNacelleGeom = new THREE.BoxGeometry(1.0, 0.8, 1.8);
    engineNacelleGeom.translate(0, 0.22, -2.1);
    const engineNacelleMesh = new THREE.Mesh(engineNacelleGeom, airframeMat);
    uavRoot.add(engineNacelleMesh);

    const engineBlockGeom = new THREE.BoxGeometry(0.7, 0.5, 1.1);
    engineBlockGeom.translate(0, 0.32, -2.1);
    const engineBlockMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, metalness: 0.7, roughness: 0.2 });
    const engineBlockMesh = new THREE.Mesh(engineBlockGeom, engineBlockMat);
    uavRoot.add(engineBlockMesh);
    engineBlockMeshRef.current = engineBlockMesh;

    // 4 Cylinder Heads (2 Port, 2 Starboard)
    cylinderHeadsRef.current = [];
    const cylGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 12);
    cylGeom.rotateZ(Math.PI / 2);

    const cylPositions: [number, number, number][] = [
      [-0.45, 0.35, -1.8],
      [-0.45, 0.35, -2.3],
      [0.45, 0.35, -1.8],
      [0.45, 0.35, -2.3],
    ];

    cylPositions.forEach((pos) => {
      const cylMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, metalness: 0.6, roughness: 0.3 });
      const cylMesh = new THREE.Mesh(cylGeom, cylMat);
      cylMesh.position.set(...pos);
      uavRoot.add(cylMesh);
      cylinderHeadsRef.current.push(cylMesh);
    });

    // Exhaust Manifold Runners
    const exhaustGeom = new THREE.TorusGeometry(0.28, 0.06, 8, 16, Math.PI);
    exhaustGeom.rotateY(Math.PI / 2);
    exhaustGeom.translate(0, 0.1, -2.8);
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });
    const exhaustMesh = new THREE.Mesh(exhaustGeom, exhaustMat);
    uavRoot.add(exhaustMesh);
    exhaustRunnersRef.current = exhaustMesh;

    // 13. Oil Sump Reservoir & Scavenge Pump
    const oilSumpGeom = new THREE.BoxGeometry(0.45, 0.25, 0.6);
    oilSumpGeom.translate(0, -0.2, -2.3);
    const oilMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.5, roughness: 0.3 });
    const oilSumpMesh = new THREE.Mesh(oilSumpGeom, oilMat);
    uavRoot.add(oilSumpMesh);
    oilPumpMeshRef.current = oilSumpMesh;

    const oilLineCurve = new THREE.LineCurve3(new THREE.Vector3(0, -0.2, -2.3), new THREE.Vector3(0, 0.1, -1.8));
    const oilLineMesh = new THREE.Mesh(new THREE.TubeGeometry(oilLineCurve, 10, 0.03, 8, false), oilMat);
    uavRoot.add(oilLineMesh);
    oilLinesMeshRef.current = oilLineMesh;

    // 14. Alternator & 28V DC Primary Power Bus
    const alternatorGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.4, 16);
    alternatorGeom.rotateX(Math.PI / 2);
    alternatorGeom.translate(0, 0.15, -1.0);
    const alternatorMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.8, roughness: 0.2 });
    const alternatorMesh = new THREE.Mesh(alternatorGeom, alternatorMat);
    uavRoot.add(alternatorMesh);
    alternatorMeshRef.current = alternatorMesh;

    // 15. Vibration Accelerometer Sensor Node
    const vibGeom = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    vibGeom.translate(0, 0.05, -1.7);
    const vibMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x9333ea, emissiveIntensity: 0.5 });
    const vibMesh = new THREE.Mesh(vibGeom, vibMat);
    uavRoot.add(vibMesh);
    vibSensorMeshRef.current = vibMesh;

    // Acoustic Shockwave Rings
    shockRingsRef.current = [];
    for (let r = 0; r < 2; r++) {
      const ringGeom = new THREE.RingGeometry(0.2, 0.26, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.set(0, 0.05, -1.7);
      ringMesh.rotation.x = Math.PI / 2;
      uavRoot.add(ringMesh);
      shockRingsRef.current.push(ringMesh);
    }

    // 16. V-Tail Empennage (Twin Inverted Canted Ruddervators)
    const tailFinGeom = new THREE.BoxGeometry(0.06, 1.8, 0.55);
    tailFinGeom.rotateX(-0.2);

    const leftTailMesh = new THREE.Mesh(tailFinGeom, airframeMat);
    leftTailMesh.position.set(-0.4, 0.7, -3.1);
    leftTailMesh.rotation.z = -0.45;
    uavRoot.add(leftTailMesh);

    const rightTailMesh = new THREE.Mesh(tailFinGeom, airframeMat);
    rightTailMesh.position.set(0.4, 0.7, -3.1);
    rightTailMesh.rotation.z = 0.45;
    uavRoot.add(rightTailMesh);

    // 17. Aft Pusher Propeller
    const propGroup = new THREE.Group();
    propGroup.position.set(0, 0.22, -3.4);
    uavRoot.add(propGroup);
    propellerGroupRef.current = propGroup;

    const hubGeom = new THREE.ConeGeometry(0.14, 0.35, 16);
    hubGeom.rotateX(-Math.PI / 2);
    const hubMesh = new THREE.Mesh(hubGeom, satcomRadomeMat);
    propGroup.add(hubMesh);

    const bladeGeom = new THREE.BoxGeometry(0.08, 1.4, 0.02);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.8, roughness: 0.1 });
    const blade1 = new THREE.Mesh(bladeGeom, bladeMat);
    propGroup.add(blade1);
    const blade2 = new THREE.Mesh(bladeGeom, bladeMat);
    blade2.rotation.z = Math.PI / 2;
    propGroup.add(blade2);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 18. Continuous 60fps Render & Dynamic Highlighting Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      const st = faultStateRef.current;

      // Propeller spin
      if (propellerGroupRef.current) {
        const rpm = st.rpm || 5500;
        const spinSpeed = (rpm / 60) * Math.PI * 2 * delta * 0.15;
        propellerGroupRef.current.rotation.z += spinSpeed;
      }

      // Smooth Camera & LookAt Target Transition (Exponential LERP for jitter-free movement)
      if (
        isTransitioningRef.current &&
        targetCamPosRef.current &&
        targetLookAtRef.current &&
        cameraRef.current &&
        controlsRef.current
      ) {
        const factor = 1.0 - Math.exp(-delta * 7.0);
        cameraRef.current.position.lerp(targetCamPosRef.current, factor);
        controlsRef.current.target.lerp(targetLookAtRef.current, factor);

        const posDist = cameraRef.current.position.distanceTo(targetCamPosRef.current);
        const lookDist = controlsRef.current.target.distanceTo(targetLookAtRef.current);

        if (posDist < 0.02 && lookDist < 0.02) {
          cameraRef.current.position.copy(targetCamPosRef.current);
          controlsRef.current.target.copy(targetLookAtRef.current);
          isTransitioningRef.current = false;
          targetCamPosRef.current = null;
          targetLookAtRef.current = null;
        }
      }

      // Orbit controls with smooth auto-rotate & damping
      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotateRef.current && !isTransitioningRef.current;
        controlsRef.current.autoRotateSpeed = 1.8;
        controlsRef.current.update();
      }

      // UAV Attitude
      if (uavRootGroupRef.current) {
        if (!attitudeLockRef.current) {
          const targetPitch = THREE.MathUtils.degToRad(st.pitch || 0);
          const targetRoll = THREE.MathUtils.degToRad(st.roll || 0);
          uavRootGroupRef.current.rotation.x = THREE.MathUtils.lerp(uavRootGroupRef.current.rotation.x, targetPitch, 0.05);
          uavRootGroupRef.current.rotation.z = THREE.MathUtils.lerp(uavRootGroupRef.current.rotation.z, -targetRoll, 0.05);
        } else {
          uavRootGroupRef.current.rotation.x = THREE.MathUtils.lerp(uavRootGroupRef.current.rotation.x, 0, 0.05);
          uavRootGroupRef.current.rotation.z = THREE.MathUtils.lerp(uavRootGroupRef.current.rotation.z, 0, 0.05);
        }
      }

      // Pulse Factor for fault glowing
      const pulse = Math.sin(time * 8) * 0.5 + 0.5;

      // 1. FUEL MESHES HIGHLIGHT
      if (leftWingTankMeshRef.current && rightWingTankMeshRef.current && fuelLinesMeshRef.current) {
        const matL = leftWingTankMeshRef.current.material as THREE.MeshStandardMaterial;
        const matR = rightWingTankMeshRef.current.material as THREE.MeshStandardMaterial;
        const matLine = fuelLinesMeshRef.current.material as THREE.MeshStandardMaterial;

        if (st.fuelLeak) {
          const redHex = 0xef4444;
          matL.color.setHex(redHex);
          matR.color.setHex(redHex);
          matL.emissive.setHex(redHex);
          matR.emissive.setHex(redHex);
          matL.emissiveIntensity = 0.6 + pulse * 0.7;
          matR.emissiveIntensity = 0.6 + pulse * 0.7;

          matLine.color.setHex(redHex);
          matLine.emissive.setHex(redHex);
          matLine.emissiveIntensity = 0.8 + pulse * 0.8;
        } else if (st.injectorClog) {
          const amberHex = 0xf59e0b;
          matL.color.setHex(amberHex);
          matR.color.setHex(amberHex);
          matL.emissive.setHex(amberHex);
          matR.emissive.setHex(amberHex);
          matL.emissiveIntensity = 0.4;
          matR.emissiveIntensity = 0.4;

          matLine.color.setHex(amberHex);
          matLine.emissive.setHex(amberHex);
          matLine.emissiveIntensity = 0.5 + pulse * 0.3;
        } else {
          matL.color.setHex(0xf59e0b);
          matR.color.setHex(0xf59e0b);
          matL.emissive.setHex(0x000000);
          matR.emissive.setHex(0x000000);
          matL.emissiveIntensity = 0;
          matR.emissiveIntensity = 0;

          matLine.color.setHex(0x06b6d4);
          matLine.emissive.setHex(0x0891b2);
          matLine.emissiveIntensity = 0.4;
        }
      }

      // 2. OIL SYSTEM HIGHLIGHT
      if (oilPumpMeshRef.current && oilLinesMeshRef.current) {
        const matPump = oilPumpMeshRef.current.material as THREE.MeshStandardMaterial;
        const matLine = oilLinesMeshRef.current.material as THREE.MeshStandardMaterial;

        if (st.oilLeak) {
          const redHex = 0xef4444;
          matPump.color.setHex(redHex);
          matPump.emissive.setHex(redHex);
          matPump.emissiveIntensity = 0.6 + pulse * 0.7;

          matLine.color.setHex(redHex);
          matLine.emissive.setHex(redHex);
          matLine.emissiveIntensity = 0.6 + pulse * 0.7;
        } else if (st.oilLow || st.oilHot) {
          const orangeHex = 0xf97316;
          matPump.color.setHex(orangeHex);
          matPump.emissive.setHex(orangeHex);
          matPump.emissiveIntensity = 0.5;

          matLine.color.setHex(orangeHex);
          matLine.emissive.setHex(orangeHex);
          matLine.emissiveIntensity = 0.5;
        } else {
          matPump.color.setHex(0x38bdf8);
          matPump.emissive.setHex(0x000000);
          matPump.emissiveIntensity = 0;

          matLine.color.setHex(0x38bdf8);
          matLine.emissive.setHex(0x000000);
          matLine.emissiveIntensity = 0;
        }
      }

      // 3. CYLINDERS & EXHAUST HIGHLIGHT
      if (cylinderHeadsRef.current.length > 0 && exhaustRunnersRef.current) {
        const exhaustMat = exhaustRunnersRef.current.material as THREE.MeshStandardMaterial;

        cylinderHeadsRef.current.forEach((cyl) => {
          const cylMat = cyl.material as THREE.MeshStandardMaterial;
          if (st.chtHigh || st.misfire) {
            const redHex = 0xef4444;
            cylMat.color.setHex(redHex);
            cylMat.emissive.setHex(redHex);
            cylMat.emissiveIntensity = 0.6 + pulse * 0.7;
          } else {
            cylMat.color.setHex(0xf43f5e);
            cylMat.emissive.setHex(0x000000);
            cylMat.emissiveIntensity = 0;
          }
        });

        if (st.egtHigh || st.combustionInstable) {
          exhaustMat.color.setHex(0xef4444);
          exhaustMat.emissive.setHex(0xef4444);
          exhaustMat.emissiveIntensity = 0.7 + pulse * 0.6;
        } else {
          exhaustMat.color.setHex(0xd97706);
          exhaustMat.emissive.setHex(0x000000);
          exhaustMat.emissiveIntensity = 0;
        }
      }

      // 4. ALTERNATOR & POWER BUS
      if (alternatorMeshRef.current) {
        const altMat = alternatorMeshRef.current.material as THREE.MeshStandardMaterial;
        if (st.elecError) {
          const yellowHex = 0xeab308;
          altMat.color.setHex(yellowHex);
          altMat.emissive.setHex(yellowHex);
          altMat.emissiveIntensity = 0.6 + pulse * 0.6;
        } else {
          altMat.color.setHex(0x10b981);
          altMat.emissive.setHex(0x000000);
          altMat.emissiveIntensity = 0;
        }
      }

      // 5. WING DE-ICE
      if (wingLeadingEdgeDeiceRef.current) {
        const deiceMat = wingLeadingEdgeDeiceRef.current.material as THREE.MeshStandardMaterial;
        if (st.icing) {
          deiceMat.color.setHex(0xe0f2fe);
          deiceMat.emissive.setHex(0x38bdf8);
          deiceMat.emissiveIntensity = 0.7;
          deiceMat.opacity = 0.95;
        } else {
          deiceMat.color.setHex(0x0284c7);
          deiceMat.emissive.setHex(0x000000);
          deiceMat.emissiveIntensity = 0;
          deiceMat.opacity = 0.35;
        }
      }

      // 6. GIMBAL TURRET
      if (gimbalDomeMeshRef.current) {
        const domeMat = gimbalDomeMeshRef.current.material as THREE.MeshStandardMaterial;
        if (st.gimbalOverheat) {
          domeMat.color.setHex(0xef4444);
          domeMat.emissive.setHex(0xef4444);
          domeMat.emissiveIntensity = 0.6 + pulse * 0.5;
        } else {
          domeMat.color.setHex(isDark ? 0x1e293b : 0x334155);
          domeMat.emissive.setHex(0x000000);
          domeMat.emissiveIntensity = 0;
        }
      }

      // 7. VIBRATION SHOCKWAVE PULSE
      if (shockRingsRef.current.length > 0) {
        shockRingsRef.current.forEach((ring, idx) => {
          const ringMat = ring.material as THREE.MeshBasicMaterial;
          if (st.vibHigh) {
            const phase = (time * 2 + idx * 0.5) % 1.0;
            const scale = 1.0 + phase * 3.5;
            ring.scale.set(scale, scale, 1);
            ringMat.opacity = (1.0 - phase) * 0.75;
          } else {
            ringMat.opacity = 0;
          }
        });
      }

      // Project Sensor 3D coordinates to 2D Screen Space
      if (cameraRef.current && containerRef.current) {
        const halfW = containerRef.current.clientWidth / 2;
        const halfH = containerRef.current.clientHeight / 2;
        const newPosMap: Record<string, { x: number; y: number; visible: boolean }> = {};

        sensorNodes.forEach((node) => {
          const vec = new THREE.Vector3(...node.pos);
          if (uavRootGroupRef.current) {
            vec.applyMatrix4(uavRootGroupRef.current.matrixWorld);
          }
          vec.project(cameraRef.current!);

          const isBehind = vec.z > 1.0;
          const screenX = vec.x * halfW + halfW;
          const screenY = -(vec.y * halfH) + halfH;

          newPosMap[node.id] = {
            x: screenX,
            y: screenY,
            visible: !isBehind && screenX >= 0 && screenX <= halfW * 2 && screenY >= 0 && screenY <= halfH * 2,
          };
        });

        setScreenPinPositions(newPosMap);
      }

      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [isDark]);

  // Camera Presets with Smooth Gliding Transitions
  const handlePreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    setAutoRotate(false);
    if (!controlsRef.current || !cameraRef.current) return;

    const targetPos = new THREE.Vector3(7.5, 5.0, 9.5);
    const targetLookAt = new THREE.Vector3(0, 0, 0);

    if (preset === 'ORBIT') {
      targetPos.set(7.5, 5.0, 9.5);
      targetLookAt.set(0, 0, 0);
    } else if (preset === 'CHASE') {
      targetPos.set(0.01, 2.2, 8.5);
      targetLookAt.set(0, 0, -1.0);
    } else if (preset === 'ENGINE') {
      targetPos.set(2.4, 2.0, -4.5);
      targetLookAt.set(0, 0.2, -2.1);
    } else if (preset === 'FUEL') {
      targetPos.set(-5.5, 3.2, 2.5);
      targetLookAt.set(-2.5, 0, 0.3);
    } else if (preset === 'GIMBAL') {
      targetPos.set(1.8, -1.5, 5.2);
      targetLookAt.set(0, -0.6, 2.7);
    } else if (preset === 'TOP_DOWN') {
      targetPos.set(0.01, 14.0, 0.01);
      targetLookAt.set(0, 0, 0);
    }

    targetCamPosRef.current = targetPos;
    targetLookAtRef.current = targetLookAt;
    isTransitioningRef.current = true;
  };

  const handleZoom = (dir: 'in' | 'out') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const factor = dir === 'in' ? 0.75 : 1.35;
    const currentTarget = controlsRef.current.target.clone();
    const currentPos = cameraRef.current.position.clone();
    const offset = currentPos.clone().sub(currentTarget).multiplyScalar(factor);
    const newPos = currentTarget.clone().add(offset);

    const dist = newPos.distanceTo(currentTarget);
    if (dist >= 2.0 && dist <= 45.0) {
      targetCamPosRef.current = newPos;
      targetLookAtRef.current = currentTarget;
      isTransitioningRef.current = true;
    }
  };

  const handleRecenter = () => {
    handlePreset('ORBIT');
    setSelectedSensorId(null);
  };

  const handleSensorClick = (node: SensorNodeData) => {
    if (selectedSensorId === node.id) {
      setSelectedSensorId(null);
      handlePreset('ORBIT');
      return;
    }

    setSelectedSensorId(node.id);
    setAutoRotate(false);

    if (cameraRef.current && controlsRef.current) {
      const nodePos = new THREE.Vector3(...node.pos);
      const currentCam = cameraRef.current.position.clone();
      const currentTarget = controlsRef.current.target.clone();
      const lookDirection = currentCam.clone().sub(currentTarget).normalize();
      if (lookDirection.lengthSq() < 0.001) {
        lookDirection.set(0.5, 0.5, 1.0).normalize();
      }

      const optimalPos = nodePos.clone().add(lookDirection.multiplyScalar(3.2)).add(new THREE.Vector3(0, 0.6, 0));

      targetCamPosRef.current = optimalPos;
      targetLookAtRef.current = nodePos;
      isTransitioningRef.current = true;
    }
  };

  const selectedNode = sensorNodes.find((s) => s.id === selectedSensorId);
  const panelBg = isDark ? 'bg-[#111827] border-[#1F293D]' : 'bg-white border-slate-200 shadow-xs';

  return (
    <div className={`w-full flex flex-col rounded-lg border overflow-hidden transition-colors ${panelBg}`}>
      {/* 3D Header Bar */}
      <div className="px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold tracking-wider uppercase text-slate-300 font-mono-telemetry">
            MQ-9B SKYGUARDIAN 3D SPATIAL GCS
          </h2>
          <span className="text-[10px] font-mono-telemetry uppercase px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            AERO-PISTON TWIN
          </span>
        </div>

        {/* Spatial Sensor Pin Filter Control */}
        <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded border border-slate-700/50 text-[10px] font-mono-telemetry">
          <span className="text-slate-400 px-1 text-[9px] uppercase">PINS:</span>
          <button
            onClick={() => setPinFilter('ANOMALIES_ONLY')}
            className={`px-2 py-0.5 rounded transition-all uppercase font-medium ${
              pinFilter === 'ANOMALIES_ONLY'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FAULT FOCUS {activeAnomalyCount > 0 ? `(${activeAnomalyCount} ACTIVE)` : '(CLEAN)'}
          </button>
          <button
            onClick={() => setPinFilter('ALL')}
            className={`px-2 py-0.5 rounded transition-all uppercase font-medium ${
              pinFilter === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SHOW ALL
          </button>
          <button
            onClick={() => setPinFilter('OFF')}
            className={`px-2 py-0.5 rounded transition-all uppercase font-medium ${
              pinFilter === 'OFF'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            OFF
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container with Interactive Overlays */}
      <div
        ref={containerRef}
        className="relative w-full h-[420px] bg-[#0A0F1D] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* 3D Spatial Sensor Pin Callout Overlays */}
        {pinFilter !== 'OFF' && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {sensorNodes.map((node) => {
              const screenPos = screenPinPositions[node.id];
              if (!screenPos || !screenPos.visible) return null;

              const isFaulted = node.isError || node.isWarning;
              const isSelected = selectedSensorId === node.id;
              const isHovered = hoveredSensorId === node.id;
              const showExpandedCard = isFaulted || isSelected || isHovered || pinFilter === 'ALL';

              return (
                <div
                  key={node.id}
                  style={{
                    left: `${screenPos.x}px`,
                    top: `${screenPos.y}px`,
                    transform: 'translate(-50%, -100%)',
                  }}
                  className={`absolute pointer-events-auto transition-all duration-150 ${
                    isSelected || isFaulted ? 'scale-105 z-30' : 'hover:scale-105 z-10'
                  }`}
                  onMouseEnter={() => setHoveredSensorId(node.id)}
                  onMouseLeave={() => setHoveredSensorId(null)}
                >
                  <button
                    onClick={() => handleSensorClick(node)}
                    className="flex flex-col items-center gap-0.5 group focus:outline-none"
                  >
                    {/* Expanded Callout Card: Only shown if faulted, selected, hovered, or in 'ALL' mode */}
                    {showExpandedCard ? (
                      <div
                        className={`px-2 py-1 rounded-md text-[10px] font-mono-telemetry font-bold shadow-xl flex items-center gap-1.5 border whitespace-nowrap backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-150 ${
                          node.isError
                            ? 'bg-red-950/95 text-red-100 border-red-500 shadow-red-900/60 ring-2 ring-red-500/50'
                            : node.isWarning
                            ? 'bg-amber-950/95 text-amber-100 border-amber-500 shadow-amber-900/60 ring-2 ring-amber-500/50'
                            : isSelected
                            ? 'bg-cyan-950/95 text-cyan-200 border-cyan-400 ring-2 ring-cyan-400/40'
                            : 'bg-[#111827]/90 text-slate-200 border-slate-700 hover:border-cyan-500'
                        }`}
                      >
                        {node.iconType === 'fuel' && <Droplets className="w-3 h-3 text-amber-400 shrink-0" />}
                        {node.iconType === 'oil' && <Gauge className="w-3 h-3 text-sky-400 shrink-0" />}
                        {node.iconType === 'cht' && <Thermometer className="w-3 h-3 text-rose-400 shrink-0" />}
                        {node.iconType === 'egt' && <Flame className="w-3 h-3 text-orange-400 shrink-0" />}
                        {node.iconType === 'elec' && <Zap className="w-3 h-3 text-yellow-400 shrink-0" />}
                        {node.iconType === 'ice' && <Snowflake className="w-3 h-3 text-sky-300 shrink-0" />}
                        {node.iconType === 'vib' && <Waves className="w-3 h-3 text-purple-400 shrink-0" />}
                        {node.iconType === 'gimbal' && <Camera className="w-3 h-3 text-cyan-400 shrink-0" />}

                        <div className="flex flex-col items-start leading-tight">
                          <div className="flex items-center gap-1">
                            <span className="text-[8.5px] uppercase tracking-wider text-slate-400 font-semibold">{node.subsystem}</span>
                            {isFaulted && (
                              <span className={`text-[8px] px-1 py-0 rounded font-black uppercase ${
                                node.isError ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-slate-950'
                              }`}>
                                {node.isError ? 'FAULT' : 'CAUTION'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={node.isError ? 'text-red-300 font-bold' : node.isWarning ? 'text-amber-300 font-bold' : 'text-slate-200'}>
                              {node.statusText}
                            </span>
                            <span className="text-[9px] text-cyan-400 font-mono-telemetry bg-black/50 px-1 rounded border border-cyan-500/20">
                              {node.valueText}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Minimalist Clean Beacon Marker for Nominal Inactive Sensors */
                      <div className="relative flex items-center justify-center p-1 group-hover:scale-125 transition-transform">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400/80 border border-cyan-200 shadow-sm shadow-cyan-500/50" />
                        <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping opacity-75" />
                      </div>
                    )}

                    {/* Pin Pointer Stem & Dot */}
                    {showExpandedCard && (
                      <div className="flex flex-col items-center">
                        <div className={`w-0.5 h-2.5 ${node.isError ? 'bg-red-500' : node.isWarning ? 'bg-amber-500' : 'bg-cyan-400'}`} />
                        <div className="relative flex items-center justify-center">
                          {isFaulted && (
                            <div className={`absolute w-5 h-5 rounded-full animate-ping opacity-60 ${
                              node.isError ? 'bg-red-500' : 'bg-amber-500'
                            }`} />
                          )}
                          <div
                            className={`w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                              node.isError
                                ? 'bg-red-500 shadow-red-500 shadow-sm'
                                : node.isWarning
                                ? 'bg-amber-400 shadow-amber-500 shadow-sm'
                                : 'bg-cyan-400'
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Sensor Node Detail HUD Inspector */}
        {selectedNode && (
          <div className="absolute top-3 right-3 z-30 p-3 rounded-lg bg-[#111827]/95 border border-cyan-500/50 backdrop-blur-md text-xs font-mono-telemetry max-w-xs flex flex-col gap-2 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
              <span className="font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                {selectedNode.subsystem}
              </span>
              <button
                onClick={() => setSelectedSensorId(null)}
                className="text-slate-400 hover:text-slate-200 font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-200 font-semibold">{selectedNode.name}</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">CURRENT STATUS:</span>
                <span className={`font-bold ${selectedNode.isError ? 'text-red-400' : selectedNode.isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {selectedNode.statusText}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px]">PRIMARY TELEMETRY:</span>
                <span className="text-cyan-300 font-bold">{selectedNode.valueText}</span>
              </div>
            </div>
          </div>
        )}

        {/* Camera Presets Bar */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 p-1 rounded-md bg-[#111827]/95 border border-[#2A3548] backdrop-blur-md z-30">
          <div className="flex items-center gap-1 px-1.5 text-[10px] text-slate-400 font-mono-telemetry uppercase">
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>CAM:</span>
          </div>
          {(['ORBIT', 'CHASE', 'ENGINE', 'FUEL', 'GIMBAL', 'TOP_DOWN'] as CameraPreset[]).map((preset) => (
            <button
              key={preset}
              id={`cam-preset-${preset.toLowerCase()}`}
              onClick={() => handlePreset(preset)}
              className={`px-2 py-1 rounded text-[10px] font-mono-telemetry font-semibold transition-all ${
                activePreset === preset && !autoRotate
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Floating View Control Tools Bar */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 p-1 rounded-md bg-[#111827]/95 border border-[#2A3548] backdrop-blur-md z-30">
          <button
            id="uav-attitude-lock-btn"
            onClick={() => setAttitudeLock(!attitudeLock)}
            className={`p-1.5 rounded transition-all text-xs font-mono-telemetry flex items-center gap-1 ${
              attitudeLock ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400' : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Lock UAV Attitude Level to Horizon"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold">{attitudeLock ? 'LOCKED' : 'ATTITUDE'}</span>
          </button>
          <button
            id="uav-rotate-toggle-btn"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded transition-all ${
              autoRotate ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle 360° Continuous Orbit Rotation"
          >
            <Rotate3d className="w-3.5 h-3.5" />
          </button>
          <button
            id="uav-zoom-in-btn"
            onClick={() => handleZoom('in')}
            className="p-1.5 rounded text-slate-300 hover:bg-slate-800 transition-all"
            title="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            id="uav-zoom-out-btn"
            onClick={() => handleZoom('out')}
            className="p-1.5 rounded text-slate-300 hover:bg-slate-800 transition-all"
            title="Zoom Out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            id="uav-recenter-btn"
            onClick={handleRecenter}
            className="p-1.5 rounded text-slate-300 hover:bg-slate-800 transition-all"
            title="Recenter & Reset View"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
