import test from "node:test";
import assert from "node:assert/strict";

import { BananaPileEngine } from "../src/sim/engine.mjs";
import {
  computeCompressionMetrics,
  computeJostlingMetrics,
  summarizePileMetrics,
} from "../src/sim/metrics.mjs";

function buildSim(overrides = {}) {
  return new BananaPileEngine({
    width: 900,
    height: 600,
    planeBaseTarget: [260, 230, 200],
    maxParticles: 4000,
    seed: 1337,
    ...overrides,
  });
}

function settle(sim, fillSteps = 2600, settleSteps = 700) {
  sim.runSteps(fillSteps);
  sim.runSteps(settleSteps);
}

test("fills toward target count", () => {
  const sim = buildSim();
  sim.runSteps(2600);

  const state = sim.getState();
  assert.equal(state.count, state.targetCount);
});

test("settled interior has near-zero jostling", () => {
  const sim = buildSim({
    interiorSleepFrames: 10,
    fluidThreshold: 0.58,
  });

  settle(sim, 4200, 1200);

  const jostle = computeJostlingMetrics(sim);
  const sleep = sim.getSleepState();

  assert.ok(jostle.interiorCount > 100, `expected sizable interior; got ${jostle.interiorCount}`);
  assert.ok(jostle.interiorRmsSpeed <= 0.04, `interior RMS too high: ${jostle.interiorRmsSpeed}`);
  assert.ok(jostle.interiorP95Speed <= 0.08, `interior P95 too high: ${jostle.interiorP95Speed}`);

  const interiorSleepRatio = sleep.interiorSleepingCount / Math.max(1, sleep.interiorCount);
  assert.ok(interiorSleepRatio >= 0.9, `interior sleep ratio too low: ${interiorSleepRatio}`);
});

test("mouse wake affects local region and re-settles", () => {
  const sim = buildSim();
  settle(sim, 4200, 1100);

  const before = summarizePileMetrics(sim, { maxSamples: 3000 });

  const cx = sim.width * 0.5;
  const cy = sim.height * 0.74;
  for (let i = 0; i < 120; i++) {
    sim.setMouse(cx + i * 1.2, cy - i * 0.45, 1.2, -0.45, true);
    sim.step();
  }
  sim.clearMouse();

  const during = summarizePileMetrics(sim, { maxSamples: 3000 });
  assert.ok(
    during.sleep.sleepingCount < before.sleep.sleepingCount,
    "expected sleeping count to drop during disturbance"
  );

  sim.runSteps(900);
  const after = summarizePileMetrics(sim, { maxSamples: 3000 });
  assert.ok(after.jostling.interiorRmsSpeed <= 0.04, `interior RMS did not settle: ${after.jostling.interiorRmsSpeed}`);

  const interiorSleepRatio =
    after.sleep.interiorSleepingCount / Math.max(1, after.sleep.interiorCount);
  assert.ok(interiorSleepRatio >= 0.85, `interior sleep ratio did not recover: ${interiorSleepRatio}`);
});

test("compression remains bounded at rest", () => {
  const sim = buildSim();
  settle(sim, 4200, 1200);

  const compression = computeCompressionMetrics(sim, { maxSamples: 8000 });

  assert.ok(compression.sampledCellCount >= 8, "not enough compression samples");
  assert.ok(
    compression.maxCompression < 46,
    `max compression too high: ${compression.maxCompression}`
  );
  assert.ok(
    compression.p95Compression < 36,
    `p95 compression too high: ${compression.p95Compression}`
  );
});
