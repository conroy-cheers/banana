"use strict";

function createMulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

class BananaPileSimulation {
  constructor(options = {}) {
    this.width = options.width ?? 960;
    this.height = options.height ?? 540;

    this.fixedDt = options.fixedDt ?? 1 / 60;
    this.gravity = options.gravity ?? 1900;
    this.velocityDamping = options.velocityDamping ?? 0.996;
    this.restitution = options.restitution ?? 0.1;
    this.floorFriction = options.floorFriction ?? 0.92;
    this.collisionPasses = options.collisionPasses ?? 2;
    this.contactSlop = options.contactSlop ?? 0.09;
    this.positionCorrection = options.positionCorrection ?? 0.22;
    this.maxParticles = options.maxParticles ?? 8000;

    this.spawnRateMax = options.spawnRateMax ?? 150;
    this.spawnRateMin = options.spawnRateMin ?? 7;

    this.radiusBase = options.radiusBase ?? 20;
    this.radiusVar = options.radiusVar ?? 13.6;

    this.planeSizeScale = options.planeSizeScale ?? [0.46, 0.7, 1.0];
    this.planeSpawnWeight = options.planeSpawnWeight ?? [0.37, 0.33, 0.3];
    this.planeGravityScale = options.planeGravityScale ?? [0.9, 0.96, 1.0];
    this.planeTargets = options.planeTargets ?? [1900, 1700, 1500];

    this.seed = options.seed ?? 12345;
    this.rand = createMulberry32(this.seed);

    this.mouseRadius = options.mouseRadius ?? 130;
    this.mouseRadiusSq = this.mouseRadius * this.mouseRadius;
    this.mouseWakeRadiusMul = options.mouseWakeRadiusMul ?? 1.85;
    this.mousePush = options.mousePush ?? 135;

    this.mouse = {
      active: false,
      x: this.width * 0.5,
      y: this.height * 0.5,
      vx: 0,
      vy: 0,
    };

    this.spawnAccumulator = new Float64Array(this.planeTargets.length);
    this.planePopulation = new Int32Array(this.planeTargets.length);

    this.particles = [];
  }

  get targetCount() {
    let total = 0;
    for (let i = 0; i < this.planeTargets.length; i++) total += this.planeTargets[i];
    return Math.min(total, this.maxParticles);
  }

  setMouse(x, y, vx = 0, vy = 0, active = true) {
    this.mouse.active = active;
    this.mouse.x = x;
    this.mouse.y = y;
    this.mouse.vx = vx;
    this.mouse.vy = vy;
  }

  clearMouse() {
    this.mouse.active = false;
    this.mouse.vx = 0;
    this.mouse.vy = 0;
  }

  spawnOne(plane) {
    if (this.particles.length >= this.maxParticles) return false;
    if (this.planePopulation[plane] >= this.planeTargets[plane]) return false;

    const dz = this.rand();
    const radius = (this.radiusBase + dz * this.radiusVar) * this.planeSizeScale[plane];

    const sx = this.rand() * this.width;
    const sy = -radius - this.rand() * (70 + (this.planeTargets.length - 1 - plane) * 18);
    const vx = (this.rand() - 0.5) * 110;
    const vy = this.rand() * 70;

    const particle = {
      x: sx,
      y: sy,
      px: sx - vx * this.fixedDt,
      py: sy - vy * this.fixedDt,
      r: radius,
      plane,
    };

    this.particles.push(particle);
    this.planePopulation[plane]++;
    return true;
  }

  spawnStep(dt) {
    const targetCount = this.targetCount;
    if (this.particles.length >= targetCount) return;

    const fill = this.particles.length / Math.max(1, targetCount);
    const eased = Math.max(0, 1 - Math.pow(fill, 0.6));
    const rate = this.spawnRateMin + (this.spawnRateMax - this.spawnRateMin) * eased;

    for (let p = 0; p < this.planeTargets.length; p++) {
      if (this.planePopulation[p] >= this.planeTargets[p]) continue;
      this.spawnAccumulator[p] += rate * this.planeSpawnWeight[p] * dt;
      while (
        this.spawnAccumulator[p] >= 1 &&
        this.particles.length < targetCount &&
        this.planePopulation[p] < this.planeTargets[p]
      ) {
        this.spawnAccumulator[p] -= 1;
        if (!this.spawnOne(p)) break;
      }
    }
  }

  integrate(dt) {
    const dtSq = dt * dt;
    const mouse = this.mouse;
    const wakeRadius = this.mouseRadius * this.mouseWakeRadiusMul;
    const wakeRadiusSq = wakeRadius * wakeRadius;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      let vx = (p.x - p.px) * this.velocityDamping;
      let vy = (p.y - p.py) * this.velocityDamping;

      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < wakeRadiusSq) {
          const dist = Math.sqrt(d2) + 1e-4;
          const nx = dx / dist;
          const ny = dy / dist;
          if (d2 < this.mouseRadiusSq) {
            const influence = (1 - dist / this.mouseRadius) * this.mousePush;
            vx += nx * influence * dt;
            vy += ny * influence * dt;
            vx += mouse.vx * 0.13;
            vy += mouse.vy * 0.13;
          } else {
            const influence = (1 - dist / wakeRadius) * this.mousePush * 0.62;
            vx += nx * influence * dt;
            vy += ny * influence * dt;
            vx += mouse.vx * 0.09;
            vy += mouse.vy * 0.09;
          }
        }
      }

      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + this.gravity * this.planeGravityScale[p.plane] * dtSq;
    }
  }

  resolveBoundary(p) {
    const radius = p.r;

    if (p.x < radius) {
      const vx = p.x - p.px;
      p.x = radius;
      p.px = p.x + vx * this.restitution;
    } else if (p.x > this.width - radius) {
      const vx = p.x - p.px;
      p.x = this.width - radius;
      p.px = p.x + vx * this.restitution;
    }

    if (p.y > this.height - radius) {
      const vx = p.x - p.px;
      const vy = p.y - p.py;
      p.y = this.height - radius;
      p.px = p.x - vx * this.floorFriction;
      p.py = p.y + vy * this.restitution;
    }
  }

  resolvePair(a, b) {
    if (a.plane !== b.plane) return;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const minDist = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 <= 1e-6 || d2 >= minDist * minDist) return;

    const dist = Math.sqrt(d2);
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    if (overlap <= this.contactSlop) return;

    const correction = (overlap - this.contactSlop) * this.positionCorrection;
    a.x -= nx * correction;
    a.y -= ny * correction;
    b.x += nx * correction;
    b.y += ny * correction;

    const avx = a.x - a.px;
    const avy = a.y - a.py;
    const bvx = b.x - b.px;
    const bvy = b.y - b.py;
    const relN = (bvx - avx) * nx + (bvy - avy) * ny;

    if (relN < 0) {
      const impulse = -(1 + this.restitution) * relN * 0.5;
      const navx = avx - nx * impulse;
      const navy = avy - ny * impulse;
      const nbvx = bvx + nx * impulse;
      const nbvy = bvy + ny * impulse;
      a.px = a.x - navx;
      a.py = a.y - navy;
      b.px = b.x - nbvx;
      b.py = b.y - nbvy;
    }
  }

  solveCollisions() {
    const size = Math.max(20, Math.floor((this.radiusBase + this.radiusVar) * 1.3));
    const grid = new Map();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const cx = (p.x / size) | 0;
      const cy = (p.y / size) | 0;
      const key = `${cx},${cy}`;
      let list = grid.get(key);
      if (!list) {
        list = [];
        grid.set(key, list);
      }
      list.push(i);
    }

    for (let pass = 0; pass < this.collisionPasses; pass++) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const cx = (p.x / size) | 0;
        const cy = (p.y / size) | 0;

        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const list = grid.get(`${cx + ox},${cy + oy}`);
            if (!list) continue;
            for (let n = 0; n < list.length; n++) {
              const j = list[n];
              if (j <= i) continue;
              this.resolvePair(p, this.particles[j]);
            }
          }
        }

        this.resolveBoundary(p);
      }
    }
  }

  step(dt = this.fixedDt) {
    this.spawnStep(dt);
    this.integrate(dt);
    this.solveCollisions();
    this.mouse.vx *= 0.82;
    this.mouse.vy *= 0.82;
  }

  runSteps(count, dt = this.fixedDt) {
    for (let i = 0; i < count; i++) this.step(dt);
  }

  getState() {
    let avgY = 0;
    let kinetic = 0;
    let inBounds = 0;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      avgY += p.y;
      const vx = p.x - p.px;
      const vy = p.y - p.py;
      kinetic += vx * vx + vy * vy;
      if (
        p.x >= p.r - 1e-6 &&
        p.x <= this.width - p.r + 1e-6 &&
        p.y <= this.height - p.r + 1e-6
      ) {
        inBounds++;
      }
    }

    const count = this.particles.length;
    return {
      count,
      targetCount: this.targetCount,
      planePopulation: Array.from(this.planePopulation),
      avgY: count > 0 ? avgY / count : 0,
      kinetic,
      inBounds,
      boundsRatio: count > 0 ? inBounds / count : 1,
    };
  }
}

module.exports = {
  BananaPileSimulation,
};
