import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BODY_KIND, PHYSICS, SIMULATION } from '../src/core/constants.js';
import { generateSystem } from '../src/data/systemGenerator.js';
import { GENERATION_PROFILE_IDS, resolveGenerationProfile } from '../src/data/generationProfiles.js';
import { derivePlanetaryEnvironment } from '../src/physics/planetaryEnvironment.js';
import { surfaceEngineSupport } from '../src/surface/surfaceProfiles.js';
import { DirectGravitySolver } from '../src/physics/gravity/directGravitySolver.js';
import { VelocityVerletIntegrator } from '../src/physics/integrators/velocityVerlet.js';

const EXPECTED = [
  ['planet-mercury', 'Mercury', 0.38709927, 3.30103e23, 2_439_700],
  ['planet-venus', 'Venus', 0.72333566, 4.86731e24, 6_051_800],
  ['planet-earth', 'Earth', 1.00000261, 5.97217e24, 6_371_000],
  ['planet-mars', 'Mars', 1.52371034, 6.41691e23, 3_389_500],
  ['planet-jupiter', 'Jupiter', 5.20288700, 1.898125e27, 69_911_000],
  ['planet-saturn', 'Saturn', 9.53667594, 5.68317e26, 58_232_000],
  ['planet-uranus', 'Uranus', 19.18916464, 8.68103e25, 25_362_000],
  ['planet-neptune', 'Neptune', 30.06992276, 1.02410e26, 24_622_000],
];

function residuals(bodies) {
  let totalMass = 0, px = 0, py = 0, pz = 0, cx = 0, cy = 0, cz = 0, pScale = 0, xScale = 0;
  for (const body of bodies) {
    totalMass += body.mass;
    px += body.mass * body.velocity[0]; py += body.mass * body.velocity[1]; pz += body.mass * body.velocity[2];
    cx += body.mass * body.position[0]; cy += body.mass * body.position[1]; cz += body.mass * body.position[2];
    pScale += body.mass * Math.hypot(...body.velocity);
    xScale += body.mass * Math.hypot(...body.position);
  }
  return {
    momentumRatio: Math.hypot(px, py, pz) / Math.max(1, pScale),
    centerRatio: Math.hypot(cx / totalMass, cy / totalMass, cz / totalMass) / Math.max(1, xScale / totalMass),
  };
}

test('SOL profile resolves explicitly while legacy unknown values still fall back to Origin', () => {
  assert.equal(resolveGenerationProfile('SOL').id, GENERATION_PROFILE_IDS.SOL);
  assert.equal(resolveGenerationProfile('not-a-profile').id, GENERATION_PROFILE_IDS.ORIGIN);
});

test('SOL ignores arbitrary seeds and always returns the fixed J2000 reference system', () => {
  const a = generateSystem('RANDOM-A', 'sol');
  const b = generateSystem('RANDOM-B', 'sol');
  assert.equal(a.seed, 'SOL-J2000');
  assert.equal(a.generationProfileId, 'sol');
  assert.deepEqual(a, b);
  assert.equal(a.metadata.fixedReferenceSystem, true);
  assert.match(a.metadata.referenceEpoch, /J2000\.0/);
});

test('SOL contains only Sun plus the eight major planets in the foundation increment', () => {
  const system = generateSystem('ignored', 'sol');
  assert.equal(system.bodies.length, 9);
  assert.equal(system.homeId, 'planet-earth');
  assert.equal(system.phenomena.length, 0);
  assert.deepEqual(system.bodies.map((body) => body.name), ['Sun', ...EXPECTED.map((entry) => entry[1])]);
  assert.equal(system.bodies.filter((body) => body.kind === BODY_KIND.MOON).length, 0);
  assert.equal(system.bodies.filter((body) => body.kind === BODY_KIND.COMET).length, 0);
  assert.equal(system.bodies.filter((body) => body.kind === BODY_KIND.ROGUE_PLANET).length, 0);
  assert.ok(system.bodies.length < SIMULATION.directGravityBodyLimit);
});

test('SOL bulk properties and J2000 semi-major axes match the embedded reference table', () => {
  const system = generateSystem('ignored', 'sol');
  const sun = system.bodies.find((body) => body.id === 'star-0');
  assert.equal(sun.name, 'Sun');
  assert.equal(sun.mass, PHYSICS.SOLAR_MASS);
  assert.equal(sun.radius, PHYSICS.SOLAR_RADIUS);
  for (const [id, name, aAu, mass, radius] of EXPECTED) {
    const body = system.bodies.find((entry) => entry.id === id);
    assert.ok(body, name);
    assert.equal(body.name, name);
    assert.equal(body.mass, mass);
    assert.equal(body.radius, radius);
    assert.ok(Math.abs(body.semiMajorAxis / PHYSICS.AU - aAu) < 1e-12, name);
    assert.equal(body.referenceSystemId, 'sol');
    assert.match(body.referenceEpoch, /J2000\.0/);
  }
});

test('SOL is shifted into the same barycentric rest-frame contract as procedural systems', () => {
  const system = generateSystem('ignored', 'sol');
  const residual = residuals(system.bodies);
  assert.ok(residual.momentumRatio < 1e-14, String(residual.momentumRatio));
  assert.ok(residual.centerRatio < 1e-14, String(residual.centerRatio));
});

test('SOL reference environments bypass seeded atmosphere proxies', () => {
  const system = generateSystem('ignored', 'sol');
  const earth = system.bodies.find((body) => body.id === 'planet-earth');
  const venus = system.bodies.find((body) => body.id === 'planet-venus');
  const mars = system.bodies.find((body) => body.id === 'planet-mars');
  const jupiter = system.bodies.find((body) => body.id === 'planet-jupiter');
  const earthEnvironment = derivePlanetaryEnvironment(earth, system.bodies);
  const venusEnvironment = derivePlanetaryEnvironment(venus, system.bodies);
  const marsEnvironment = derivePlanetaryEnvironment(mars, system.bodies);
  const jupiterEnvironment = derivePlanetaryEnvironment(jupiter, system.bodies);
  assert.equal(earthEnvironment.formationModel, 'observational-reference-v1');
  assert.equal(earthEnvironment.atmospherePressureProxyPa, 101_325);
  assert.equal(venusEnvironment.atmospherePressureProxyPa, 9.2e6);
  assert.equal(marsEnvironment.atmospherePressureProxyPa, 636);
  assert.equal(jupiterEnvironment.atmosphereClassId, 'deep-envelope');
  assert.equal(jupiterEnvironment.physicalSurfaceExists, false);
  assert.match(earthEnvironment.scientificBoundary, /reference bulk environment/i);
});

test('all SOL landings remain explicitly disabled in the reference foundation', () => {
  const system = generateSystem('ignored', 'sol');
  for (const body of system.bodies.filter((entry) => entry.kind === BODY_KIND.PLANET)) {
    const support = surfaceEngineSupport(body, system.bodies);
    assert.equal(support.enabled, false, body.name);
    assert.equal(support.profileId, null, body.name);
    assert.match(support.reason, /SOL reference landing is intentionally disabled/i, body.name);
  }
});

test('seven days of existing Newtonian integration keeps SOL finite without a special flight path', () => {
  const system = generateSystem('ignored', 'sol');
  const bodies = system.bodies.map((body) => ({ ...body, position: new Float64Array(body.position), velocity: new Float64Array(body.velocity) }));
  const integrator = new VelocityVerletIntegrator(new DirectGravitySolver());
  const steps = Math.ceil((7 * PHYSICS.DAY) / SIMULATION.maxPhysicsSubstepSeconds);
  for (let step = 0; step < steps; step += 1) integrator.step(bodies, SIMULATION.maxPhysicsSubstepSeconds);
  for (const body of bodies) {
    assert.ok(body.position.every(Number.isFinite), body.name);
    assert.ok(body.velocity.every(Number.isFinite), body.name);
  }
  const residual = residuals(bodies);
  assert.ok(residual.momentumRatio < 2e-13, String(residual.momentumRatio));
  assert.ok(residual.centerRatio < 2e-13, String(residual.centerRatio));
});

test('Explorer UI exposes SOL as fixed reference data without replacing existing flight controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  assert.match(html, /value="sol">SOL — reference Solar System \(J2000\)/);
  assert.match(app, /syncGenerationProfileControls/);
  assert.match(app, /seedInput\.value = 'SOL-J2000'/);
  assert.match(app, /randomButton\.disabled = fixedSol/);
  for (const token of ['#targetButton', '#approachButton', '#matchVelocity', '#frameQuick', '#thrustButton', '#reverseButton', '#brakeButton']) {
    assert.match(app, new RegExp(token.replace('#', '#')));
  }
});
