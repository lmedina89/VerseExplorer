import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystem } from '../src/data/systemGenerator.js';
import { surfaceEngineSupport, SURFACE_ENGINE_PROFILES } from '../src/surface/surfaceProfiles.js';
import { generateSurfaceRegion, surfaceColorAt } from '../src/surface/surfaceGenerator.js';
import { createSurfaceSession, surfaceTakeoffReferencePosition } from '../src/surface/surfaceSession.js';
import { frameOrbitInsertionPlan } from '../src/physics/frameOrbitInsertion.js';
import { solveSurfaceAtmosphericOptics } from '../src/physics/atmosphericOptics.js';

const sol = generateSystem('ignored', 'sol');
const earth = sol.bodies.find((body) => body.id === 'planet-earth');

test('Earth uses an explicit SOL atmospheric-rocky landing profile without mutating canonical body flags', () => {
  const support = surfaceEngineSupport(earth, sol.bodies);
  assert.equal(earth.landable, false);
  assert.equal(support.enabled, true);
  assert.equal(support.profileId, SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY);
  assert.equal(support.regionId, 'earth-temperate-reference');
  assert.equal(support.surfaceStyle, 'earth-terrestrial');
});

test('Earth landing region preserves reference pressure/gravity and uses terrestrial presentation boundaries', () => {
  const region = generateSurfaceRegion(sol, earth, 'earth-temperate-reference', sol.bodies);
  assert.equal(region.atmosphereMode, 'atmospheric');
  assert.equal(region.skyMode, 'earth-reference-atmosphere');
  assert.equal(region.atmospherePressurePa, 101_325);
  assert.equal(region.surfaceStyle, 'earth-terrestrial');
  assert.ok(region.gravityMps2 > 9.75 && region.gravityMps2 < 9.90, `Earth g=${region.gravityMps2}`);
  assert.equal(region.weatherProfile.allowAnomalous, false);
  assert.deepEqual(region.weatherProfile.allowedTypes, ['fog-bank']);
  assert.match(region.scientificStatus, /not globally solved/i);
});

test('Earth shared atmosphere optics produce a bright blue-weighted daytime sky at one atmosphere', () => {
  const region = generateSurfaceRegion(sol, earth, 'earth-temperate-reference', sol.bodies);
  const optics = solveSurfaceAtmosphericOptics({
    pressurePa: region.atmospherePressurePa,
    temperatureK: region.temperatureK,
    gravityMps2: region.gravityMps2,
    molecularMassAmu: 28.97,
    starAltitudeRad: Math.PI / 3,
    starVisibleFraction: 1,
  });
  assert.ok(optics.skyBrightness > 0.25);
  assert.ok(optics.topSkyColorRgb[2] > optics.topSkyColorRgb[0]);
  assert.ok(optics.horizonSkyColorRgb.every(Number.isFinite));
});

test('Earth local terrain color is varied terrestrial presentation rather than the schematic observer plane', () => {
  const region = generateSurfaceRegion(sol, earth, 'earth-temperate-reference', sol.bodies);
  const a = surfaceColorAt(region, 0, 0);
  const b = surfaceColorAt(region, 700, -430);
  assert.equal(a.length, 3);
  assert.equal(b.length, 3);
  assert.ok(a.every((v) => Number.isFinite(v) && v >= 0 && v <= 1));
  assert.ok(b.every((v) => Number.isFinite(v) && v >= 0 && v <= 1));
  assert.notDeepEqual(a.map((v) => v.toFixed(5)), b.map((v) => v.toFixed(5)));
  assert.ok(a[1] >= a[2], 'Earth reference ground should not be a flat blue/gray observer plane');
});

test('Earth uses the inherited takeoff/orbit handoff without mutating live Earth state', () => {
  const region = generateSurfaceRegion(sol, earth, 'earth-temperate-reference', sol.bodies);
  const session = createSurfaceSession(region);
  session.bodyFixedAnchor = [1, 0, 0];
  const beforePosition = [...earth.position];
  const beforeVelocity = [...earth.velocity];
  const takeoffPosition = surfaceTakeoffReferencePosition(session, earth, 0);
  const plan = frameOrbitInsertionPlan({ position: takeoffPosition }, earth, sol.bodies);
  assert.equal(plan.ok, true, plan.reason);
  assert.ok(plan.radiusMeters > earth.radius);
  assert.deepEqual([...earth.position], beforePosition);
  assert.deepEqual([...earth.velocity], beforeVelocity);
});
