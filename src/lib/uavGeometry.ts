export interface UavColorState {
  oilLeakSeverity: number;
  cht: number;
  icingSeverity: number;
  payloadOverheatSeverity: number;
  healthIndex: number;
}

export function generateGridFloor() {
  const gridLinesX: number[] = [];
  const gridLinesY: number[] = [];
  const gridLinesZ: number[] = [];

  const size = 20;
  const step = 2.5;
  const floorZ = -4.0;

  for (let x = -size; x <= size; x += step) {
    gridLinesX.push(x, x, null as unknown as number);
    gridLinesY.push(-size, size, null as unknown as number);
    gridLinesZ.push(floorZ, floorZ, null as unknown as number);
  }

  for (let y = -size; y <= size; y += step) {
    gridLinesX.push(-size, size, null as unknown as number);
    gridLinesY.push(y, y, null as unknown as number);
    gridLinesZ.push(floorZ, floorZ, null as unknown as number);
  }

  return {
    x: gridLinesX,
    y: gridLinesY,
    z: gridLinesZ,
  };
}

export function generateGuideLines() {
  const floorZ = -4.0;
  return {
    x: [0, 0, null as unknown as number, 0, -8, null as unknown as number, 0, 8, null as unknown as number, 0, 0],
    y: [0, 0, null as unknown as number, 0, 0, null as unknown as number, 0, 0, null as unknown as number, -6, -6],
    z: [0, floorZ, null as unknown as number, 0, floorZ, null as unknown as number, 0, floorZ, null as unknown as number, 0, floorZ],
  };
}

export function getUav3dTraces(colors: UavColorState, pitch = 0, roll = 0) {
  const isEngineHot = colors.oilLeakSeverity > 20 || colors.cht > 380;
  const isCriticalEngine = colors.oilLeakSeverity > 60 || colors.cht > 420;
  const isIced = colors.icingSeverity > 15;

  const fuselageColor = isIced ? '#E0F2FE' : '#60A5FA';
  const wingsColor = isIced ? '#F0F9FF' : '#38BDF8';
  const tailColor = isIced ? '#E0F2FE' : '#60A5FA';

  let noseRadomeColor = '#FBBF24';
  if (colors.payloadOverheatSeverity > 70) {
    noseRadomeColor = '#EF4444';
  } else if (colors.payloadOverheatSeverity > 35) {
    noseRadomeColor = '#F97316';
  }

  let engineColor = '#FB7185';
  if (isCriticalEngine) {
    engineColor = '#EF4444';
  } else if (isEngineHot) {
    engineColor = '#F43F5E';
  }

  const commonLighting = {
    ambient: 0.92,
    diffuse: 0.85,
    specular: 0.45,
    roughness: 0.2,
    fresnel: 0.3,
  };

  const radomeVx = [
    0, 0.65, 0, -0.65,
    0, 0.85, 0, -0.85,
    0, 0
  ];
  const radomeVy = [
    7.4, 5.8, 5.8, 5.8,
    4.0, 4.0, 4.0, 4.0,
    5.8, 4.0
  ];
  const radomeVz = [
    0.2, 0.6, -0.4, 0.6,
    0.8, 0.7, -0.6, 0.7,
    0.85, 1.15
  ];
  const radomeI = [0, 0, 0, 1, 8, 8, 1, 2, 4, 9, 9, 4];
  const radomeJ = [1, 2, 3, 2, 0, 3, 4, 5, 5, 4, 7, 6];
  const radomeK = [8, 8, 8, 5, 1, 3, 5, 6, 6, 8, 8, 7];

  const noseRadomeTrace = {
    type: 'mesh3d',
    x: radomeVx,
    y: radomeVy,
    z: radomeVz,
    i: radomeI,
    j: radomeJ,
    k: radomeK,
    color: noseRadomeColor,
    opacity: 0.98,
    flatshading: true,
    lighting: commonLighting,
    name: 'Dorsal Satcom Dome & Avionics Nose',
    hoverinfo: 'name',
  };

  const fuselageVx = [
    0.85, 0.75, -0.75, -0.85,
    0.80, 0.70, -0.70, -0.80,
    0.60, 0.50, -0.50, -0.60,
    0.35, 0.25, -0.25, -0.35,
    0, 0, 0, 0
  ];
  const fuselageVy = [
    4.0, 4.0, 4.0, 4.0,
    1.2, 1.2, 1.2, 1.2,
    -2.8, -2.8, -2.8, -2.8,
    -5.8, -5.8, -5.8, -5.8,
    -7.6, -7.6, -7.6, -7.6
  ];
  const fuselageVz = [
    0.75, -0.55, -0.55, 0.75,
    0.70, -0.50, -0.50, 0.70,
    0.65, -0.45, -0.45, 0.65,
    0.50, -0.35, -0.35, 0.50,
    0.20, -0.20, -0.20, 0.20
  ];
  const fuselageI = [0, 1, 0, 2, 4, 5, 4, 6, 8, 9, 8, 10, 12, 13, 12, 14];
  const fuselageJ = [1, 2, 3, 3, 5, 6, 7, 7, 9, 10, 11, 11, 13, 14, 15, 15];
  const fuselageK = [4, 5, 7, 6, 8, 9, 11, 10, 12, 13, 15, 14, 16, 17, 19, 18];

  const fuselageTrace = {
    type: 'mesh3d',
    x: fuselageVx,
    y: fuselageVy,
    z: fuselageVz,
    i: fuselageI,
    j: fuselageJ,
    k: fuselageK,
    color: fuselageColor,
    opacity: 0.98,
    flatshading: true,
    lighting: commonLighting,
    name: 'Main Fuselage (Airframe Structure)',
    hoverinfo: 'name',
  };

  const wingSpan = 15;
  const wingVx = [
    0, wingSpan, wingSpan * 0.98, 0,
    0, -wingSpan, -wingSpan * 0.98, 0,
    wingSpan, wingSpan, -wingSpan, -wingSpan
  ];
  const wingVy = [
    1.4, 0.5, -0.4, 0.1,
    1.4, 0.5, -0.4, 0.1,
    0.5, -0.4, 0.5, -0.4
  ];
  const wingVz = [
    0.35, 0.85, 0.75, 0.25,
    0.35, 0.85, 0.75, 0.25,
    1.45, 1.35, 1.45, 1.35
  ];
  const wingI = [0, 0, 4, 4, 1, 5];
  const wingJ = [1, 2, 5, 6, 2, 6];
  const wingK = [2, 3, 6, 7, 8, 10];

  const wingTrace = {
    type: 'mesh3d',
    x: wingVx,
    y: wingVy,
    z: wingVz,
    i: wingI,
    j: wingJ,
    k: wingK,
    color: wingsColor,
    opacity: 0.96,
    flatshading: true,
    lighting: commonLighting,
    name: isIced ? 'High-Aspect Wings [ICING ACTIVE]' : 'High-Aspect Ratio Wings (79 ft / 24 m)',
    hoverinfo: 'name',
  };

  const hardpointVx = [
    2.6, 2.6, 2.9, 2.9,
    -2.6, -2.6, -2.9, -2.9,
    5.2, 5.2, 5.5, 5.5,
    -5.2, -5.2, -5.5, -5.5
  ];
  const hardpointVy = [
    1.0, -0.8, -0.8, 1.0,
    1.0, -0.8, -0.8, 1.0,
    0.8, -0.6, -0.6, 0.8,
    0.8, -0.6, -0.6, 0.8
  ];
  const hardpointVz = [
    -0.1, -0.1, -0.6, -0.6,
    -0.1, -0.1, -0.6, -0.6,
    0.1, 0.1, -0.3, -0.3,
    0.1, 0.1, -0.3, -0.3
  ];
  const hardpointI = [0, 0, 4, 4, 8, 8, 12, 12];
  const hardpointJ = [1, 2, 5, 6, 9, 10, 13, 14];
  const hardpointK = [2, 3, 6, 7, 10, 11, 14, 15];

  const hardpointTrace = {
    type: 'mesh3d',
    x: hardpointVx,
    y: hardpointVy,
    z: hardpointVz,
    i: hardpointI,
    j: hardpointJ,
    k: hardpointK,
    color: '#F59E0B',
    opacity: 0.95,
    flatshading: true,
    lighting: commonLighting,
    name: 'Wing Hardpoints & External Fuel Pods (Stations 1-9)',
    hoverinfo: 'name',
  };

  const tailVx = [
    0, 3.2, 2.7, 0,
    0, -3.2, -2.7, 0
  ];
  const tailVy = [
    -5.2, -7.4, -7.6, -6.6,
    -5.2, -7.4, -7.6, -6.6
  ];
  const tailVz = [
    0.45, 2.6, 2.4, 0.35,
    0.45, 2.6, 2.4, 0.35
  ];
  const tailI = [0, 0, 4, 4];
  const tailJ = [1, 2, 5, 6];
  const tailK = [2, 3, 6, 7];

  const tailTrace = {
    type: 'mesh3d',
    x: tailVx,
    y: tailVy,
    z: tailVz,
    i: tailI,
    j: tailJ,
    k: tailK,
    color: tailColor,
    opacity: 0.98,
    flatshading: true,
    lighting: commonLighting,
    name: 'V-Tail Assembly & Ruddervators',
    hoverinfo: 'name',
  };

  const engineVx = [-0.7, 0.7, 0.6, -0.6, 0, 0];
  const engineVy = [-4.6, -4.6, -7.2, -7.2, -7.8, -4.2];
  const engineVz = [0.3, 0.3, 0.45, 0.45, 0.35, 0.85];
  const engineI = [0, 0, 2, 1, 0, 1];
  const engineJ = [1, 2, 3, 3, 1, 3];
  const engineK = [2, 3, 4, 4, 5, 5];

  const engineTrace = {
    type: 'mesh3d',
    x: engineVx,
    y: engineVy,
    z: engineVz,
    i: engineI,
    j: engineJ,
    k: engineK,
    color: engineColor,
    opacity: 0.98,
    flatshading: true,
    lighting: commonLighting,
    name: isEngineHot ? 'Aero-Piston Engine Nacelle [ELEVATED TEMP/LEAK]' : 'Propulsion Bay & Engine Pod',
    hoverinfo: 'name',
  };

  const domeTheta: number[] = [];
  const domeX: number[] = [];
  const domeY: number[] = [];
  const domeZ: number[] = [];
  for (let a = 0; a <= Math.PI * 2; a += Math.PI / 6) {
    domeTheta.push(a);
    domeX.push(0.6 * Math.cos(a));
    domeY.push(4.6 + 0.6 * Math.sin(a));
    domeZ.push(-0.8);
  }
  domeX.push(0);
  domeY.push(4.6);
  domeZ.push(-1.35);

  const domeI: number[] = [];
  const domeJ: number[] = [];
  const domeK: number[] = [];
  const apexIdx = domeX.length - 1;
  for (let idx = 0; idx < domeTheta.length - 1; idx++) {
    domeI.push(idx);
    domeJ.push(idx + 1);
    domeK.push(apexIdx);
  }

  const domeTrace = {
    type: 'mesh3d',
    x: domeX,
    y: domeY,
    z: domeZ,
    i: domeI,
    j: domeJ,
    k: domeK,
    color: '#38BDF8',
    opacity: 0.98,
    flatshading: true,
    lighting: commonLighting,
    name: 'AN/DAS-4 MTS-B Multi-Spectral EO/IR Gimbal Turret',
    hoverinfo: 'name',
  };

  const propX = [0, 1.6, 0, -1.6, 0];
  const propY = [-7.9, -7.9, -7.9, -7.9, -7.9];
  const propZ = [1.6, 0.35, -0.9, 0.35, 1.6];

  const propTrace = {
    type: 'scatter3d',
    mode: 'lines+markers',
    x: propX,
    y: propY,
    z: propZ,
    line: { color: '#00F0FF', width: 6 },
    marker: { size: 5, color: '#38BDF8' },
    name: 'Pusher Propeller Rotation Arc',
    hoverinfo: 'name',
  };

  const wireframeX = [
    0, wingSpan, wingSpan, wingSpan * 0.98, 0, -wingSpan * 0.98, -wingSpan, -wingSpan, 0,
    null as unknown as number,
    0, 0.65, 0.85, 0.80, 0.60, 0.35, 0,
    null as unknown as number,
    0, -0.65, -0.85, -0.80, -0.60, -0.35, 0,
    null as unknown as number,
    0, 3.2, 2.7, 0, -2.7, -3.2, 0,
    null as unknown as number,
    0, 0, 0, 0, 0, 0
  ];
  const wireframeY = [
    1.4, 0.5, 0.5, -0.4, 0.1, -0.4, 0.5, 0.5, 1.4,
    null as unknown as number,
    7.4, 5.8, 4.0, 1.2, -2.8, -5.8, -7.6,
    null as unknown as number,
    7.4, 5.8, 4.0, 1.2, -2.8, -5.8, -7.6,
    null as unknown as number,
    -5.2, -7.4, -7.6, -6.6, -7.6, -7.4, -5.2,
    null as unknown as number,
    7.4, 4.0, 1.2, -2.8, -5.8, -7.8
  ];
  const wireframeZ = [
    0.35, 0.85, 1.45, 0.75, 0.25, 0.75, 1.45, 0.85, 0.35,
    null as unknown as number,
    0.2, 0.6, 0.75, 0.70, 0.65, 0.50, 0.20,
    null as unknown as number,
    0.2, 0.6, 0.75, 0.70, 0.65, 0.50, 0.20,
    null as unknown as number,
    0.45, 2.6, 2.4, 0.35, 2.4, 2.6, 0.45,
    null as unknown as number,
    0.85, 1.15, 0.70, 0.65, 0.85, 0.35
  ];

  const wireframeTrace = {
    type: 'scatter3d',
    mode: 'lines',
    x: wireframeX,
    y: wireframeY,
    z: wireframeZ,
    line: { color: isIced ? '#7DD3FC' : '#00F0FF', width: 3.5 },
    name: 'Airframe Structural Contours & Hard Edges',
    hoverinfo: 'none',
  };

  const reticleColor = colors.healthIndex < 50 ? '#EF4444' : colors.healthIndex < 80 ? '#F59E0B' : '#00F0FF';
  const reticleCircleX: number[] = [];
  const reticleCircleY: number[] = [];
  const reticleCircleZ: number[] = [];
  for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.2) {
    reticleCircleX.push(2.2 * Math.cos(a));
    reticleCircleY.push(2.2 * Math.sin(a));
    reticleCircleZ.push(0);
  }
  reticleCircleX.push(null as unknown as number, -3.2, 3.2, null as unknown as number, 0, 0);
  reticleCircleY.push(null as unknown as number, 0, 0, null as unknown as number, -3.2, 3.2);
  reticleCircleZ.push(null as unknown as number, 0, 0, null as unknown as number, 0, 0);

  const reticleTrace = {
    type: 'scatter3d',
    mode: 'lines',
    x: reticleCircleX,
    y: reticleCircleY,
    z: reticleCircleZ,
    line: { color: reticleColor, width: 2.5, dash: 'dot' },
    name: 'Spatial Attitude Horizon Reticle',
    hoverinfo: 'name',
  };

  const gridData = generateGridFloor();
  const gridTrace = {
    type: 'scatter3d',
    mode: 'lines',
    x: gridData.x,
    y: gridData.y,
    z: gridData.z,
    line: { color: '#1E3A5F', width: 1.5 },
    name: 'Spatial Grid Plane',
    hoverinfo: 'none',
  };

  const guideData = generateGuideLines();
  const guideTrace = {
    type: 'scatter3d',
    mode: 'lines',
    x: guideData.x,
    y: guideData.y,
    z: guideData.z,
    line: { color: '#0284C7', width: 2, dash: 'dash' },
    name: 'Ground Nadir Projection Vector',
    hoverinfo: 'none',
  };

  return [
    gridTrace,
    guideTrace,
    fuselageTrace,
    noseRadomeTrace,
    wingTrace,
    hardpointTrace,
    tailTrace,
    engineTrace,
    domeTrace,
    propTrace,
    wireframeTrace,
    reticleTrace,
  ];
}
