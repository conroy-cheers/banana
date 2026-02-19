#!/usr/bin/env node
"use strict";

async function main() {
  const [{ BananaPileEngine }, { summarizePileMetrics }] = await Promise.all([
    import("../src/sim/engine.mjs"),
    import("../src/sim/metrics.mjs"),
  ]);

  const steps = Number(process.argv[2] || 2400);
  const sim = new BananaPileEngine({
    width: 900,
    height: 600,
    planeBaseTarget: [1900, 1700, 1500],
    seed: 42,
  });

  sim.runSteps(steps);
  const state = sim.getState();
  const metrics = summarizePileMetrics(sim, { maxSamples: 6000 });

  console.log(
    JSON.stringify(
      {
        state,
        sleep: metrics.sleep,
        jostling: metrics.jostling,
        compression: metrics.compression,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
