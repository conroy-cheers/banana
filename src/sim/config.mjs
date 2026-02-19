export const DEFAULTS = {
  maxParticles: 8000,
  fixedDt: 1 / 60,
  gravity: 1900,
  velocityDamping: 0.9958,
  airSpin: 0.005,
  restitution: 0.1,
  floorFriction: 0.92,
  collisionPasses: 2,
  spawnRateMax: 150,
  spawnRateMin: 7,
  densityFactor: 6.9,
  mouseRadius: 130,
  mousePush: 135,
  mouseWakeRadiusMul: 1.08,
  wakeCursorRadiusMul: 1.85,
  planeSizeScale: [0.9, 0.915, 0.93, 0.945, 0.96, 0.975, 0.99, 1],
  planeAlpha: [0.72, 0.76, 0.8, 0.84, 0.88, 0.92, 0.95, 0.98],
  planeMouseInfluence: [0.72, 0.76, 0.8, 0.84, 0.88, 0.92, 0.96, 1],
  planeSpawnWeight: [0.1486, 0.1419, 0.1351, 0.1284, 0.1216, 0.1149, 0.1081, 0.1014],
  planeGravityScale: [0.95, 0.958, 0.966, 0.974, 0.982, 0.99, 0.996, 1],
  planeBaseTarget: [2200, 2100, 2000, 1900, 1800, 1700, 1600, 1500],
  baseDensityReference: 6.9,
  colliderScale: 0.5,
  contactSlop: 0.09,
  positionCorrection: 0.22,
  normalImpulseEps: 0.06,
  contactTangentDamp: 0.2,
  contactVelCutoff: 0.03,
  segmentEps: 0.000001,
  collisionSpinFactor: 0.0002,
  floorSleepVy: 0.55,
  floorSleepVx: 0.28,
  floorSleepSpin: 0.0015,
  interiorSleepFrames: 16,
  interiorSleepSpeed: 0.02,
  interiorSleepSpin: 0.0006,
  wakeImpulse: 0.9,
  wakeOverlapRatio: 0.22,
  fluidThreshold: 0.58,
  fluidUpdateInterval: 1,
};

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function computeFluidCellSize(radiusBase, radiusVar, planeSizeScale) {
  let weightedScale = 0;
  for (let i = 0; i < planeSizeScale.length; i++) weightedScale += planeSizeScale[i];
  weightedScale /= planeSizeScale.length;
  const avgRadius = (radiusBase + radiusVar * 0.5) * weightedScale;
  return clamp(Math.floor(avgRadius * 2.8), 20, 64);
}
