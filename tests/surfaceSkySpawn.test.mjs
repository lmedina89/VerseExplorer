import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystem } from '../src/data/systemGenerator.js';
import { rotationAxis } from '../src/core/planetaryRotation.js';
import { buildSurfaceSkySandboxOrbitPlan, buildSandboxOrbitPolyline } from '../src/experiments/orbitSandbox.js';
import { DirectGravitySolver } from '../src/physics/gravity/directGravitySolver.js';
import { VelocityVerletIntegrator } from '../src/physics/integrators/velocityVerlet.js';

function mag(v) { return Math.hypot(...v); }
function sub(a, b) { return a.map((value, index) => value - b[index]); }
function dot(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(v) { const m = mag(v); return v.map((value) => value / m); }

const sol = generateSystem('SOL-J2000', 'sol');
const earth = sol.bodies.find((body) => body.id === 'planet-earth');

function observerAtEarthSurface({ forward = [0.25, 0.65, 0.72] } = {}) {
  const localUp = [1, 0, 0];
  const horizonEast = [0, 0, 1];
  const horizonNorth = [0, 1, 0];
  const d = norm(forward);
  return {
    valid: true,
    parentBodyId: earth.id,
    inertialPosition: new Float64Array([earth.position[0] + earth.radius + 2, earth.position[1], earth.position[2]]),
    localUp: new Float64Array(localUp),
    horizonEast: new Float64Array(horizonEast),
    horizonNorth: new Float64Array(horizonNorth),
    forward: new Float64Array(d),
  };
}

test('0.1.0.6A.1 surface SKY SPAWN inserts exactly along the live reticle ray', () => {
  const observer = observerAtEarthSurface();
  const plan = buildSurfaceSkySandboxOrbitPlan({ parent: earth, observer, altitudePreset: 'low' });
  const observerToSpawn = norm(sub([...plan.body.position], [...observer.inertialPosition]));
  assert.ok(dot(observerToSpawn, [...observer.forward]) > 1 - 1e-12, 'spawn point must lie on the reticle ray');
  assert.equal(plan.source, 'surface-sky');
  assert.equal(plan.parentId, earth.id);
  assert.equal(plan.altitudeMeters, 400_000);
  assert.ok(plan.lookRangeMeters > 0);
});

test('surface SKY SPAWN state is a circular prograde orbit around the landed parent', () => {
  const observer = observerAtEarthSurface({ forward: [0.2, 0.8, 0.55] });
  const plan = buildSurfaceSkySandboxOrbitPlan({ parent: earth, observer, altitudePreset: 'medium' });
  const r = sub([...plan.body.position], [...earth.position]);
  const v = sub([...plan.body.velocity], [...earth.velocity]);
  const axis = [...rotationAxis(earth)];
  const h = cross(r, v);
  assert.ok(Math.abs(mag(r) - plan.orbitalRadiusMeters) < 1e-5);
  assert.ok(Math.abs(dot(r, v)) < mag(r) * mag(v) * 1e-12);
  assert.ok(dot(h, axis) > 0, 'surface insertion must remain prograde');
  assert.ok(plan.circularSpeedMps > 0);
  assert.ok(plan.periodSeconds > 0);
});

test('surface SKY SPAWN rejects a reticle aimed below the local horizon', () => {
  const observer = observerAtEarthSurface({ forward: [-0.4, 0.2, 0.1] });
  assert.throws(() => buildSurfaceSkySandboxOrbitPlan({ parent: earth, observer, altitudePreset: 'low' }), /horizon/i);
});

test('surface orbit preview polyline closes while retaining the reticle-derived insertion point', () => {
  const observer = observerAtEarthSurface({ forward: [0.3, 0.55, 0.78] });
  const plan = buildSurfaceSkySandboxOrbitPlan({ parent: earth, observer, altitudePreset: 'high' });
  const points = buildSandboxOrbitPolyline(plan, earth, 96);
  assert.equal(points.length, 97 * 3);
  const first = [...points.slice(0, 3)];
  const last = [...points.slice(-3)];
  assert.ok(mag(sub(first, last)) < 1e-4);
  assert.ok(mag(sub(first, [...plan.body.position])) < 1e-4);
});


test('surface-reticle LOW Earth insertion stays bound through one live mutual N-body orbit', () => {
  const live = generateSystem('SOL-J2000', 'sol');
  const liveEarth = live.bodies.find((body) => body.id === 'planet-earth');
  const observer = {
    valid: true,
    parentBodyId: liveEarth.id,
    inertialPosition: new Float64Array([liveEarth.position[0] + liveEarth.radius + 2, liveEarth.position[1], liveEarth.position[2]]),
    localUp: new Float64Array([1, 0, 0]),
    horizonEast: new Float64Array([0, 0, 1]),
    horizonNorth: new Float64Array([0, 1, 0]),
    forward: new Float64Array(norm([0.36, 0.58, 0.73])),
  };
  const plan = buildSurfaceSkySandboxOrbitPlan({ parent: liveEarth, observer, altitudePreset: 'low' });
  const bodies = live.bodies.map((body) => ({ ...body, position: new Float64Array(body.position), velocity: new Float64Array(body.velocity) }));
  const earthCopy = bodies.find((body) => body.id === 'planet-earth');
  const asteroid = { ...plan.body, id: 'surface-sky-test', position: new Float64Array(plan.body.position), velocity: new Float64Array(plan.body.velocity) };
  bodies.push(asteroid);
  const integrator = new VelocityVerletIntegrator(new DirectGravitySolver());
  const r0 = mag(sub([...asteroid.position], [...earthCopy.position]));
  let elapsed = 0;
  while (elapsed < plan.periodSeconds) {
    const dt = Math.min(10, plan.periodSeconds - elapsed);
    integrator.step(bodies, dt);
    elapsed += dt;
  }
  const r1 = mag(sub([...asteroid.position], [...earthCopy.position]));
  assert.ok(Number.isFinite(r1));
  assert.ok(Math.abs(r1 - r0) < 150, `one-orbit radial drift ${r1 - r0} m should remain small`);
});
