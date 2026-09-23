import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystem } from '../src/data/systemGenerator.js';
import { rotationAxis } from '../src/core/planetaryRotation.js';
import { DirectGravitySolver } from '../src/physics/gravity/directGravitySolver.js';
import { VelocityVerletIntegrator } from '../src/physics/integrators/velocityVerlet.js';
import {
  SANDBOX_ASTEROID,
  SANDBOX_BODY_LIMIT,
  buildSandboxOrbitPlan,
  buildSandboxOrbitPolyline,
  sandboxParentCandidates,
  sphereRadiusFromMassDensity,
} from '../src/experiments/orbitSandbox.js';

function magnitude(v) { return Math.hypot(...v); }
function subtract(a, b) { return a.map((value, index) => value - b[index]); }
function dot(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

const sol = generateSystem('SOL-J2000', 'sol');
const earth = sol.bodies.find((body) => body.id === 'planet-earth');
const moon = sol.bodies.find((body) => body.id === 'moon-luna');
const mars = sol.bodies.find((body) => body.id === 'planet-mars');

test('0.1.0.6A exposes Earth, Moon, Mars as the preferred SOL sandbox parents', () => {
  assert.deepEqual(sandboxParentCandidates(sol.bodies).map((body) => body.id), ['planet-earth', 'moon-luna', 'planet-mars']);
  assert.equal(SANDBOX_BODY_LIMIT, 5);
});

test('Earth LOW preset produces a finite two-body circular prograde equatorial insertion', () => {
  const ship = [earth.position[0] + earth.radius * 5, earth.position[1] + earth.radius * 2, earth.position[2] + earth.radius];
  const plan = buildSandboxOrbitPlan({ parent: earth, shipPosition: ship, altitudePreset: 'low' });
  const r = subtract([...plan.body.position], [...earth.position]);
  const v = subtract([...plan.body.velocity], [...earth.velocity]);
  const axis = [...rotationAxis(earth)];
  const angularMomentum = cross(r, v);

  assert.equal(plan.altitudeMeters, 400_000);
  assert.ok(Math.abs(magnitude(r) - (earth.radius + 400_000)) < 1e-5);
  assert.ok(Math.abs(dot(r, v)) < magnitude(r) * magnitude(v) * 1e-12);
  assert.ok(dot(angularMomentum, axis) > 0, 'prograde angular momentum must align with the physical spin axis');
  assert.ok(plan.circularSpeedMps > 7_000 && plan.circularSpeedMps < 8_000);
  assert.ok(plan.periodSeconds > 5_000 && plan.periodSeconds < 6_000);
  assert.equal(plan.body.mass, SANDBOX_ASTEROID.massKg);
  assert.equal(plan.body.parentId, earth.id);
});

test('Moon and Mars presets clear their surfaces and remain finite', () => {
  const moonPlan = buildSandboxOrbitPlan({ parent: moon, shipPosition: [moon.position[0] + moon.radius * 3, moon.position[1], moon.position[2]], altitudePreset: 'low' });
  const marsPlan = buildSandboxOrbitPlan({ parent: mars, shipPosition: [mars.position[0], mars.position[1] + mars.radius * 2, mars.position[2] + mars.radius * 3], altitudePreset: 'medium' });
  assert.equal(moonPlan.altitudeMeters, 100_000);
  assert.equal(marsPlan.altitudeMeters, 1_000_000);
  assert.ok(moonPlan.orbitalRadiusMeters > moon.radius + moonPlan.body.radius * 2);
  assert.ok(marsPlan.orbitalRadiusMeters > mars.radius + marsPlan.body.radius * 2);
  assert.ok(Number.isFinite(moonPlan.circularSpeedMps));
  assert.ok(Number.isFinite(marsPlan.circularSpeedMps));
});

test('orbit preview polyline closes exactly and does not mutate the parent state', () => {
  const beforePosition = [...earth.position];
  const beforeVelocity = [...earth.velocity];
  const plan = buildSandboxOrbitPlan({ parent: earth, shipPosition: [earth.position[0] + 1e8, earth.position[1], earth.position[2]], altitudePreset: 'medium' });
  const points = buildSandboxOrbitPolyline(plan, earth, 64);
  assert.equal(points.length, 65 * 3);
  const first = [...points.slice(0, 3)];
  const last = [...points.slice(-3)];
  assert.ok(magnitude(subtract(first, last)) < 1e-5);
  assert.deepEqual([...earth.position], beforePosition);
  assert.deepEqual([...earth.velocity], beforeVelocity);
});

test('sandbox asteroid radius derives from physical mass and density', () => {
  const radius = sphereRadiusFromMassDensity(SANDBOX_ASTEROID.massKg, SANDBOX_ASTEROID.densityKgM3);
  assert.ok(radius > 400 && radius < 500);
});


test('committed LOW Earth state stays circular through one live mutual N-body orbit', () => {
  const liveSystem = generateSystem('SOL-J2000', 'sol');
  const liveEarth = liveSystem.bodies.find((body) => body.id === 'planet-earth');
  const plan = buildSandboxOrbitPlan({
    parent: liveEarth,
    shipPosition: [liveEarth.position[0] + 1e8, liveEarth.position[1], liveEarth.position[2]],
    altitudePreset: 'low',
  });
  const bodies = liveSystem.bodies.map((body) => ({
    ...body,
    position: new Float64Array(body.position),
    velocity: new Float64Array(body.velocity),
  }));
  const earthCopy = bodies.find((body) => body.id === 'planet-earth');
  const asteroid = {
    ...plan.body,
    id: 'sandbox-test-asteroid',
    position: new Float64Array(plan.body.position),
    velocity: new Float64Array(plan.body.velocity),
  };
  bodies.push(asteroid);
  const integrator = new VelocityVerletIntegrator(new DirectGravitySolver());
  const radius0 = magnitude(subtract([...asteroid.position], [...earthCopy.position]));
  let elapsed = 0;
  const step = 10;
  while (elapsed < plan.periodSeconds) {
    const dt = Math.min(step, plan.periodSeconds - elapsed);
    integrator.step(bodies, dt);
    elapsed += dt;
  }
  const radius1 = magnitude(subtract([...asteroid.position], [...earthCopy.position]));
  assert.ok(Math.abs(radius1 - radius0) < 100, `one-orbit radial drift ${radius1 - radius0} m should remain small`);
});
