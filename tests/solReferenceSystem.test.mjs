import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BODY_KIND, PHYSICS, SIMULATION } from '../src/core/constants.js';
import { generateSystem } from '../src/data/systemGenerator.js';
import { generateSolReferenceMoonUpgrades } from '../src/data/solSystem.js';
import { GENERATION_PROFILE_IDS, resolveGenerationProfile } from '../src/data/generationProfiles.js';
import { derivePlanetaryEnvironment } from '../src/physics/planetaryEnvironment.js';
import { surfaceEngineSupport } from '../src/surface/surfaceProfiles.js';
import { DirectGravitySolver } from '../src/physics/gravity/directGravitySolver.js';
import { VelocityVerletIntegrator } from '../src/physics/integrators/velocityVerlet.js';

const EXPECTED_PLANETS = [
  ['planet-mercury', 'Mercury', 0.38709927, 3.30103e23, 2_439_700],
  ['planet-venus', 'Venus', 0.72333566, 4.86731e24, 6_051_800],
  ['planet-earth', 'Earth', 1.00000261, 5.97217e24, 6_371_000],
  ['planet-mars', 'Mars', 1.52371034, 6.41691e23, 3_389_500],
  ['planet-jupiter', 'Jupiter', 5.20288700, 1.898125e27, 69_911_000],
  ['planet-saturn', 'Saturn', 9.53667594, 5.68317e26, 58_232_000],
  ['planet-uranus', 'Uranus', 19.18916464, 8.68103e25, 25_362_000],
  ['planet-neptune', 'Neptune', 30.06992276, 1.02410e26, 24_622_000],
];

const EXPECTED_MOONS = [
  ['moon-luna', 'Moon', 'planet-earth', 4902.800, 1_737_400, 384_400, 0.0554, 5.16, false],
  ['moon-io', 'Io', 'planet-jupiter', 5959.91547, 1_821_490, 421_800, 0.004, 0.0, false],
  ['moon-europa', 'Europa', 'planet-jupiter', 3202.71210, 1_560_800, 671_100, 0.009, 0.5, false],
  ['moon-ganymede', 'Ganymede', 'planet-jupiter', 9887.83275, 2_631_200, 1_070_400, 0.001, 0.2, false],
  ['moon-callisto', 'Callisto', 'planet-jupiter', 7179.28340, 2_410_300, 1_882_700, 0.007, 0.3, false],
  ['moon-titan', 'Titan', 'planet-saturn', 8978.13710, 2_574_760, 1_221_900, 0.029, 0.3, false],
  ['moon-triton', 'Triton', 'planet-neptune', 1428.49546, 1_352_600, 354_800, 0.0, 157.3, true],
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

function relativeState(body, parent) {
  return {
    position: body.position.map((value, index) => value - parent.position[index]),
    velocity: body.velocity.map((value, index) => value - parent.velocity[index]),
  };
}

function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function specificOrbitalEnergy(body, parent) {
  const rel = relativeState(body, parent);
  const r = Math.hypot(...rel.position);
  const v = Math.hypot(...rel.velocity);
  return 0.5 * v * v - PHYSICS.G * (body.mass + parent.mass) / r;
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

test('SOL 0.1.0.4B contains Sun, eight planets, and the seven selected major moons only', () => {
  const system = generateSystem('ignored', 'sol');
  assert.equal(system.bodies.length, 16);
  assert.equal(system.homeId, 'planet-earth');
  assert.equal(system.phenomena.length, 0);
  assert.equal(system.bodies.filter((body) => body.kind === BODY_KIND.PLANET).length, 8);
  assert.equal(system.bodies.filter((body) => body.kind === BODY_KIND.MOON).length, 7);
  assert.equal(system.bodies.filter((body) => body.kind === BODY_KIND.COMET).length, 0);
  assert.equal(system.bodies.filter((body) => body.kind === BODY_KIND.ROGUE_PLANET).length, 0);
  assert.equal(system.metadata.planetCount, 8);
  assert.equal(system.metadata.moonCount, 7);
  assert.ok(system.bodies.length < SIMULATION.directGravityBodyLimit);
  assert.deepEqual(system.bodies.filter((body) => body.kind === BODY_KIND.MOON).map((body) => body.name), EXPECTED_MOONS.map((entry) => entry[1]));
});

test('existing SOL planet bulk/reference elements remain unchanged while moon barycenters are resolved physically', () => {
  const system = generateSystem('ignored', 'sol');
  const sun = system.bodies.find((body) => body.id === 'star-0');
  assert.equal(sun.name, 'Sun');
  assert.equal(sun.mass, PHYSICS.SOLAR_MASS);
  assert.equal(sun.radius, PHYSICS.SOLAR_RADIUS);
  for (const [id, name, aAu, mass, radius] of EXPECTED_PLANETS) {
    const body = system.bodies.find((entry) => entry.id === id);
    assert.ok(body, name);
    assert.equal(body.name, name);
    assert.equal(body.mass, mass);
    assert.equal(body.radius, radius);
    assert.equal(body.referenceOrbit.semiMajorAxisAu, aAu);
    assert.equal(body.referenceSystemId, 'sol');
    assert.match(body.referenceEpoch, /J2000\.0/);
  }
});

test('major moon hierarchy, physical parameters, and J2000 mean elements match the embedded JPL table', () => {
  const system = generateSystem('ignored', 'sol');
  for (const [id, name, parentId, gm, radius, aKm, eccentricity, inclinationDeg, retrograde] of EXPECTED_MOONS) {
    const moon = system.bodies.find((body) => body.id === id);
    const parent = system.bodies.find((body) => body.id === parentId);
    assert.ok(moon, name);
    assert.ok(parent, parentId);
    assert.equal(moon.kind, BODY_KIND.MOON);
    assert.equal(moon.parentId, parentId);
    assert.equal(moon.radius, radius);
    assert.ok(Math.abs(moon.mass - (gm * 1e9 / PHYSICS.G)) / moon.mass < 1e-14, name);
    assert.equal(moon.referenceOrbit.semiMajorAxisKm, aKm);
    assert.equal(moon.referenceOrbit.eccentricity, eccentricity);
    assert.equal(moon.referenceOrbit.inclinationDeg, inclinationDeg);
    assert.equal(moon.referenceOrbit.retrograde, retrograde);
    const separation = Math.hypot(...relativeState(moon, parent).position);
    const a = aKm * 1000;
    assert.ok(separation >= a * (1 - eccentricity) * 0.999 && separation <= a * (1 + eccentricity) * 1.001, `${name}: ${separation}`);
    assert.ok(specificOrbitalEnergy(moon, parent) < 0, `${name} must start bound`);
  }
});

test('Triton is dynamically retrograde while the selected prograde moons retain prograde angular momentum', () => {
  const system = generateSystem('ignored', 'sol');
  for (const moonId of ['moon-io', 'moon-europa', 'moon-ganymede', 'moon-callisto', 'moon-titan', 'moon-triton']) {
    const moon = system.bodies.find((body) => body.id === moonId);
    const parent = system.bodies.find((body) => body.id === moon.parentId);
    const rel = relativeState(moon, parent);
    const angularMomentum = cross(rel.position, rel.velocity);
    const alignment = dot(angularMomentum, parent.rotationAxisInertial);
    if (moonId === 'moon-triton') assert.ok(alignment < 0, `Triton alignment=${alignment}`);
    else assert.ok(alignment > 0, `${moon.name} alignment=${alignment}`);
  }
});

test('SOL is shifted into the same global barycentric rest-frame contract after moons are added', () => {
  const system = generateSystem('ignored', 'sol');
  const residual = residuals(system.bodies);
  assert.ok(residual.momentumRatio < 1e-14, String(residual.momentumRatio));
  assert.ok(residual.centerRatio < 1e-14, String(residual.centerRatio));
});

test('SOL reference environments bypass seeded proxies for planets and moons', () => {
  const system = generateSystem('ignored', 'sol');
  const earth = system.bodies.find((body) => body.id === 'planet-earth');
  const titan = system.bodies.find((body) => body.id === 'moon-titan');
  const triton = system.bodies.find((body) => body.id === 'moon-triton');
  const europa = system.bodies.find((body) => body.id === 'moon-europa');
  const earthEnvironment = derivePlanetaryEnvironment(earth, system.bodies);
  const titanEnvironment = derivePlanetaryEnvironment(titan, system.bodies);
  const tritonEnvironment = derivePlanetaryEnvironment(triton, system.bodies);
  const europaEnvironment = derivePlanetaryEnvironment(europa, system.bodies);
  assert.equal(earthEnvironment.formationModel, 'observational-reference-v1');
  assert.equal(earthEnvironment.atmospherePressureProxyPa, 101_325);
  assert.equal(titanEnvironment.atmospherePressureProxyPa, 146_700);
  assert.equal(titanEnvironment.atmosphereClassId, 'substantial');
  assert.equal(tritonEnvironment.atmospherePressureProxyPa, 1.4);
  assert.equal(europaEnvironment.bodyClassId, 'ice-rich-moon');
  assert.equal(europaEnvironment.formationModel, 'observational-reference-v1');
});

test('0.1.0.5F keeps canonical SOL body flags unchanged while enabling the expanded surface-support set', () => {
  const system = generateSystem('ignored', 'sol');
  const enabled = new Set(['planet-earth', 'moon-luna', 'planet-mars', 'moon-europa', 'moon-titan', 'moon-triton']);
  for (const body of system.bodies.filter((entry) => [BODY_KIND.PLANET, BODY_KIND.MOON].includes(entry.kind))) {
    const support = surfaceEngineSupport(body, system.bodies);
    assert.equal(body.landable, false, body.name);
    if (enabled.has(body.id)) {
      assert.equal(support.enabled, true, body.name);
      assert.equal(support.solReferenceLanding, true, body.name);
    } else {
      assert.equal(support.enabled, false, body.name);
      assert.equal(support.profileId, null, body.name);
      assert.match(support.reason, /landing remains intentionally disabled/i, body.name);
    }
  }
});

test('thirty days of the existing Newtonian integrator keeps all seven reference moons bound and finite', () => {
  const system = generateSystem('ignored', 'sol');
  const bodies = system.bodies.map((body) => ({ ...body, position: new Float64Array(body.position), velocity: new Float64Array(body.velocity) }));
  const integrator = new VelocityVerletIntegrator(new DirectGravitySolver());
  const steps = Math.ceil((30 * PHYSICS.DAY) / SIMULATION.maxPhysicsSubstepSeconds);
  for (let step = 0; step < steps; step += 1) integrator.step(bodies, SIMULATION.maxPhysicsSubstepSeconds);
  for (const body of bodies) {
    assert.ok(body.position.every(Number.isFinite), body.name);
    assert.ok(body.velocity.every(Number.isFinite), body.name);
  }
  for (const [, name, parentId, , , aKm] of EXPECTED_MOONS) {
    const moon = bodies.find((body) => body.name === name);
    const parent = bodies.find((body) => body.id === parentId);
    const separation = Math.hypot(...relativeState(moon, parent).position);
    assert.ok(specificOrbitalEnergy(moon, parent) < 0, `${name} escaped`);
    assert.ok(separation > aKm * 1000 * 0.55 && separation < aKm * 1000 * 1.45, `${name} separation=${separation}`);
  }
  const residual = residuals(bodies);
  assert.ok(residual.momentumRatio < 3e-13, String(residual.momentumRatio));
  assert.ok(residual.centerRatio < 3e-13, String(residual.centerRatio));
});

test('SOL-only save upgrade creates exactly the missing moons around restored parents at saved simulation time', () => {
  const system = generateSystem('ignored', 'sol');
  const existing = system.bodies.filter((body) => body.kind !== BODY_KIND.MOON).map((body) => ({
    ...body,
    position: new Float64Array(body.position),
    velocity: new Float64Array(body.velocity),
  }));
  const parentSnapshots = new Map(existing.map((body) => [body.id, { position: [...body.position], velocity: [...body.velocity] }]));
  const upgradesAtZero = generateSolReferenceMoonUpgrades(existing, 0);
  const upgradesLater = generateSolReferenceMoonUpgrades(existing, 14 * PHYSICS.DAY);
  assert.equal(upgradesAtZero.length, 7);
  assert.equal(upgradesLater.length, 7);
  assert.deepEqual(upgradesAtZero.map((body) => body.id), EXPECTED_MOONS.map((entry) => entry[0]));
  for (const moon of upgradesLater) {
    const parent = existing.find((body) => body.id === moon.parentId);
    assert.ok(parent);
    assert.ok(specificOrbitalEnergy(moon, parent) < 0, moon.name);
    assert.notDeepEqual([...moon.position], [...upgradesAtZero.find((candidate) => candidate.id === moon.id).position], `${moon.name} phase should advance`);
  }
  for (const parent of existing) {
    assert.deepEqual([...parent.position], parentSnapshots.get(parent.id).position, `${parent.name} position mutated`);
    assert.deepEqual([...parent.velocity], parentSnapshots.get(parent.id).velocity, `${parent.name} velocity mutated`);
  }
  assert.equal(generateSolReferenceMoonUpgrades([...existing, ...upgradesAtZero], 0).length, 0);
});

test('Explorer app wires the SOL moon save-upgrade path without replacing established flight controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  assert.match(html, /value="sol">SOL — reference Solar System \(J2000\)/);
  assert.match(html, /Universe Explorer v0\.1\.0\.5F/);
  assert.match(app, /generateSolReferenceMoonUpgrades/);
  assert.match(app, /this\.system\.generationProfileId === 'sol'/);
  assert.match(app, /payload\.elapsedSimSeconds/);
  for (const token of ['#targetButton', '#approachButton', '#matchVelocity', '#frameQuick', '#thrustButton', '#reverseButton', '#brakeButton']) {
    assert.match(app, new RegExp(token.replace('#', '#')));
  }
});
