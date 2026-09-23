import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateSystem } from '../src/data/systemGenerator.js';
import { BODY_KIND, PHYSICS, schwarzschildRadius } from '../src/core/constants.js';
import { buildSurfaceSkySandboxOrbitPlan } from '../src/experiments/orbitSandbox.js';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const sol = generateSystem('SOL-J2000', 'sol');
const earth = sol.bodies.find((body) => body.id === 'planet-earth');

function observerAtZenith(parent) {
  return {
    valid: true,
    parentBodyId: parent.id,
    inertialPosition: new Float64Array([parent.position[0] + parent.radius + 2, parent.position[1], parent.position[2]]),
    localUp: new Float64Array([1, 0, 0]),
    horizonEast: new Float64Array([0, 0, 1]),
    horizonNorth: new Float64Array([0, 1, 0]),
    forward: new Float64Array([1, 0, 0]),
  };
}

test('surface SKY SPAWN accepts the existing LAB black-hole physical definition without safety-clamping its mass', () => {
  const mass = 3 * PHYSICS.SOLAR_MASS;
  const bodyDefinition = {
    kind: BODY_KIND.BLACK_HOLE,
    mass,
    radius: schwarzschildRadius(mass),
    visualRadiusMeters: 2.2e8,
    color: 0x7658ff,
    gravitySource: true,
    generated: false,
    activeAccretion: true,
    visualParticleCount: 5200,
  };
  const plan = buildSurfaceSkySandboxOrbitPlan({ parent: earth, observer: observerAtZenith(earth), altitudePreset: 'near', bodyDefinition });
  assert.equal(plan.body.kind, BODY_KIND.BLACK_HOLE);
  assert.equal(plan.body.mass, mass);
  assert.equal(plan.body.radius, schwarzschildRadius(mass));
  assert.equal(plan.body.visualRadiusMeters, 2.2e8);
  assert.equal(plan.exotic, true);
  assert.equal(plan.altitudeMeters, 200_000);
  assert.ok(plan.circularSpeedMps > 1e6, 'extreme gravity should be allowed to create an extreme initial state');
});

test('surface SKY SPAWN allows an intentionally destructive compact-object overlap instead of silently protecting the parent', () => {
  const mass = 100 * PHYSICS.SOLAR_MASS;
  const bodyDefinition = { kind: BODY_KIND.BLACK_HOLE, mass, radius: schwarzschildRadius(mass), visualRadiusMeters: 2.2e8, gravitySource: true };
  const plan = buildSurfaceSkySandboxOrbitPlan({ parent: earth, observer: observerAtZenith(earth), altitudePreset: 'near', bodyDefinition });
  assert.equal(plan.immediateOverlap, true);
  assert.equal(plan.body.mass, mass);
  assert.ok(plan.lookRangeMeters > 0);
});

test('surface compact-object bridge reuses existing LAB definitions and existing compact renderers', () => {
  const app = read('src/app/app.js');
  const surface = read('src/render/surfaceWorld.js');
  assert.match(app, /experiments\.run\('spawn-black-hole'/);
  assert.match(app, /experiments\.run\('spawn-neutron-star'/);
  assert.match(surface, /createCelestialVisual\(sourceBody\)/);
  assert.match(surface, /updateCelestialVisual\(visual, sourceBody/);
  assert.match(surface, /compactSurfaceProxyAngularRadius/);
  assert.match(surface, /material\.fog = false/);
});

test('destroying the active landed parent recovers cleanly to space instead of leaving a dead surface session', () => {
  const app = read('src/app/app.js');
  assert.match(app, /destroyedSurfaceParent/);
  assert.match(app, /Surface parent \$\{destroyedSurfaceParent\.name\} was destroyed or absorbed by the live impact simulation/);
  assert.match(app, /restoreOrbit: false/);
});

test('surface spawn UI exposes asteroid, neutron star, pulsar and black hole with explicit disruption warning', () => {
  const html = read('index.html');
  const app = read('src/app/app.js');
  for (const value of ['asteroid','neutron-star','pulsar','black-hole']) assert.match(html, new RegExp(`option value="${value}"`));
  assert.match(html, /surfaceSpawnCompactMass/);
  assert.match(app, /no safety clamp will protect SOL/i);
  assert.match(app, /system is not protected from disruption/i);
});
