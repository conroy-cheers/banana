function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const idx = Math.min(sortedValues.length - 1, Math.max(0, Math.floor(p * (sortedValues.length - 1))));
  return sortedValues[idx];
}

function rmsFromSquared(sumSq, count) {
  if (count === 0) return 0;
  return Math.sqrt(sumSq / count);
}

export function computeJostlingMetrics(engine) {
  const count = engine.particleCount;
  const interiorSpeeds = [];
  const boundarySpeeds = [];
  const airSpeeds = [];

  let interiorSumSq = 0;
  let boundarySumSq = 0;
  let airSumSq = 0;

  for (let i = 0; i < count; i++) {
    const vx = engine.x[i] - engine.px[i];
    const vy = engine.y[i] - engine.py[i];
    const speedSq = vx * vx + vy * vy;
    const speed = Math.sqrt(speedSq);

    if (engine.region[i] === 2) {
      interiorSpeeds.push(speed);
      interiorSumSq += speedSq;
    } else if (engine.region[i] === 1) {
      boundarySpeeds.push(speed);
      boundarySumSq += speedSq;
    } else {
      airSpeeds.push(speed);
      airSumSq += speedSq;
    }
  }

  interiorSpeeds.sort((a, b) => a - b);
  boundarySpeeds.sort((a, b) => a - b);
  airSpeeds.sort((a, b) => a - b);

  return {
    interiorCount: interiorSpeeds.length,
    boundaryCount: boundarySpeeds.length,
    airCount: airSpeeds.length,
    interiorRmsSpeed: rmsFromSquared(interiorSumSq, interiorSpeeds.length),
    boundaryRmsSpeed: rmsFromSquared(boundarySumSq, boundarySpeeds.length),
    airRmsSpeed: rmsFromSquared(airSumSq, airSpeeds.length),
    interiorP95Speed: percentile(interiorSpeeds, 0.95),
    boundaryP95Speed: percentile(boundarySpeeds, 0.95),
    airP95Speed: percentile(airSpeeds, 0.95),
  };
}

export function computeCompressionMetrics(engine, options = {}) {
  const maxSamples = options.maxSamples ?? 12000;
  const values = [];
  const threshold = Math.max(0.0001, engine.fluidThreshold);

  for (let i = 0; i < engine.fluidOcc.length; i++) {
    if (!engine.fluidMask[i]) continue;
    // Interior fluid compression is what matters for packed stability.
    if (engine.boundaryMask[i]) continue;
    values.push(engine.fluidOcc[i] / threshold);
    if (values.length >= maxSamples) break;
  }

  if (values.length === 0) {
    for (let i = 0; i < engine.fluidOcc.length; i++) {
      if (!engine.fluidMask[i]) continue;
      values.push(engine.fluidOcc[i] / threshold);
      if (values.length >= maxSamples) break;
    }
  }

  values.sort((a, b) => a - b);

  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];

  return {
    sampledCellCount: values.length,
    meanCompression: values.length > 0 ? sum / values.length : 0,
    p95Compression: percentile(values, 0.95),
    maxCompression: values.length > 0 ? values[values.length - 1] : 0,
  };
}

export function summarizePileMetrics(engine, options = {}) {
  const jostling = computeJostlingMetrics(engine);
  const compression = computeCompressionMetrics(engine, options);
  const sleep = engine.getSleepState();

  return {
    jostling,
    compression,
    sleep,
  };
}
