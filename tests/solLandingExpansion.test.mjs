import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateSystem } from '../src/data/systemGenerator.js';
import { surfaceEngineSupport, surfaceCapabilityForBuild, SURFACE_ENGINE_PROFILES } from '../src/surface/surfaceProfiles.js';
import { availableSurfaceRegions, generateSurfaceRegion } from '../src/surface/surfaceGenerator.js';
import { createSurfaceSession, surfaceTakeoffReferencePosition } from '../src/surface/surfaceSession.js';
import { frameOrbitInsertionPlan } from '../src/physics/frameOrbitInsertion.js';

const sol = generateSystem('ignored', 'sol');
const byId = (id) => sol.bodies.find((body) => body.id === id);

const expected = [
  ['planet-earth', SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY, 'earth-temperate-reference', 'Temperate Terrestrial Survey'],
  ['moon-luna', SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY, 'airless-regolith', 'Regolith Survey Site'],
  ['planet-mars', SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY, 'mars-regolith-highland', 'Mars Highland Survey'],
  ['moon-europa', SURFACE_ENGINE_PROFILES.ICE_VOLATILE, 'europa-fractured-ice', 'Europa Fractured Ice Survey'],
  ['moon-titan', SURFACE_ENGINE_PROFILES.ICE_VOLATILE, 'titan-organic-ice-plain', 'Titan Organic-Ice Plain'],
  ['moon-triton', SURFACE_ENGINE_PROFILES.ICE_VOLATILE, 'triton-nitrogen-ice-plain', 'Triton Nitrogen-Ice Plain'],
];

test('5E enables Earth plus the established Moon, Mars, Europa, Titan and Triton through explicit SOL surface profiles', () => {
  const enabled = new Set(expected.map(([id]) => id));
  for (const [id, profileId, regionId, regionName] of expected) {
    const body = byId(id);
    const support = surfaceEngineSupport(body, sol.bodies);
    assert.equal(body.landable, false, `${body.name} canonical landable flag must remain untouched`);
    assert.equal(support.enabled, true, body.name);
    assert.equal(support.solReferenceLanding, true, body.name);
    assert.equal(support.profileId, profileId, body.name);
    assert.equal(support.regionId, regionId, body.name);
    assert.equal(support.regionName, regionName, body.name);
    assert.match(surfaceCapabilityForBuild(body, sol.bodies), /REFERENCE SURFACE · CURRENT BUILD/, body.name);
    assert.deepEqual(availableSurfaceRegions(sol, body, sol.bodies), [{ id: regionId, name: regionName, subtitle: support.regionSubtitle }]);
  }
  for (const body of sol.bodies.filter((entry) => entry.referenceSystemId === 'sol' && ['planet', 'moon'].includes(entry.kind))) {
    if (enabled.has(body.id)) continue;
    const support = surfaceEngineSupport(body, sol.bodies);
    assert.equal(support.enabled, false, `${body.name} must remain landing-locked`);
  }
});

test('Mars profile uses reference thin atmosphere and established atmospheric-rocky landing engine', () => {
  const body = byId('planet-mars');
  const region = generateSurfaceRegion(sol, body, 'mars-regolith-highland', sol.bodies);
  assert.equal(region.surfaceEngineProfile, SURFACE_ENGINE_PROFILES.ATMOSPHERIC_ROCKY);
  assert.equal(region.surfaceArchitectureFamily, 'ATMOSPHERIC_ROCKY');
  assert.equal(region.atmosphereMode, 'tenuous');
  assert.equal(region.atmospherePressurePa, 636);
  assert.equal(region.weatherEnabled, true);
  assert.ok(region.gravityMps2 > 3.70 && region.gravityMps2 < 3.74, `Mars g=${region.gravityMps2}`);
  assert.equal(region.name, 'Mars Highland Survey');
  assert.match(region.subtitle, /CO₂ atmosphere/);
});

test('Europa profile remains airless/ice-rich with no invented weather', () => {
  const body = byId('moon-europa');
  const region = generateSurfaceRegion(sol, body, 'europa-fractured-ice', sol.bodies);
  assert.equal(region.surfaceEngineProfile, SURFACE_ENGINE_PROFILES.ICE_VOLATILE);
  assert.equal(region.surfaceArchitectureFamily, 'ICE_VOLATILE');
  assert.equal(region.atmosphereMode, 'airless');
  assert.equal(region.weatherEnabled, false);
  assert.ok(region.atmospherePressurePa < 1e-4);
  assert.ok(region.gravityMps2 > 1.30 && region.gravityMps2 < 1.34, `Europa g=${region.gravityMps2}`);
  assert.equal(region.name, 'Europa Fractured Ice Survey');
});

test('Titan profile preserves dense reference atmosphere and uses bounded haze presentation without fake weather', () => {
  const body = byId('moon-titan');
  const region = generateSurfaceRegion(sol, body, 'titan-organic-ice-plain', sol.bodies);
  assert.equal(region.surfaceEngineProfile, SURFACE_ENGINE_PROFILES.ICE_VOLATILE);
  assert.equal(region.surfaceArchitectureFamily, 'ICE_VOLATILE');
  assert.equal(region.atmosphereMode, 'atmospheric');
  assert.equal(region.skyMode, 'dense-atmosphere-proxy');
  assert.equal(region.atmospherePressurePa, 146_700);
  assert.equal(region.weatherEnabled, false);
  assert.ok(region.baselineAerosolOpticalDepth550 >= 1);
  assert.deepEqual(region.atmosphereTintRgb, [0.96, 0.55, 0.24]);
  assert.ok(region.gravityMps2 > 1.33 && region.gravityMps2 < 1.38, `Titan g=${region.gravityMps2}`);
  assert.equal(region.name, 'Titan Organic-Ice Plain');
});

test('Triton profile preserves trace reference atmosphere and cryogenic ice surface', () => {
  const body = byId('moon-triton');
  const region = generateSurfaceRegion(sol, body, 'triton-nitrogen-ice-plain', sol.bodies);
  assert.equal(region.surfaceEngineProfile, SURFACE_ENGINE_PROFILES.ICE_VOLATILE);
  assert.equal(region.atmosphereMode, 'trace');
  assert.equal(region.atmospherePressurePa, 1.4);
  assert.equal(region.weatherEnabled, false);
  assert.ok(region.gravityMps2 > 0.76 && region.gravityMps2 < 0.80, `Triton g=${region.gravityMps2}`);
  assert.equal(region.name, 'Triton Nitrogen-Ice Plain');
});

test('all six SOL landing worlds can use the inherited takeoff/orbit handoff without mutating their canonical body state', () => {
  for (const [id, , regionId] of expected) {
    const body = byId(id);
    const region = generateSurfaceRegion(sol, body, regionId, sol.bodies);
    const session = createSurfaceSession(region);
    session.bodyFixedAnchor = [1, 0, 0];
    const beforePosition = [...body.position];
    const beforeVelocity = [...body.velocity];
    const takeoffPosition = surfaceTakeoffReferencePosition(session, body, 0);
    assert.ok(takeoffPosition?.every(Number.isFinite), body.name);
    const plan = frameOrbitInsertionPlan({ position: takeoffPosition }, body, sol.bodies);
    assert.equal(plan.ok, true, `${body.name}: ${plan.reason}`);
    assert.ok(plan.radiusMeters > body.radius, body.name);
    assert.deepEqual([...body.position], beforePosition, body.name);
    assert.deepEqual([...body.velocity], beforeVelocity, body.name);
  }
});

test('Titan haze presentation is optional/profile-scoped in the shared surface renderer', () => {
  const source = fs.readFileSync(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
  assert.match(source, /baselineAerosolOpticalDepth550/);
  assert.match(source, /atmosphereTintRgb/);
  assert.match(source, /atmosphereTintStrength/);
  assert.match(source, /mixRgb\(exposure\.topSkyColorRgb/);
});
