import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSystem } from '../src/data/systemGenerator.js';
import { bodyFixedDirectionToInertial } from '../src/core/planetaryRotation.js';
import { AstronomicalObserverModel } from '../src/core/astronomicalObserver.js';
import { surfaceEngineSupport } from '../src/surface/surfaceProfiles.js';
import {
  createSurfaceSkyObserverRegion,
  defaultSurfaceSkyAnchor,
  surfaceSkyObserverSupport,
  SURFACE_SKY_PROFILE_ID,
} from '../src/surface/surfaceSkyObserver.js';

function normalizedDelta(to, from) {
  const x = to.position[0] - from.position[0];
  const y = to.position[1] - from.position[1];
  const z = to.position[2] - from.position[2];
  const m = Math.hypot(x, y, z);
  return [x / m, y / m, z / m];
}

function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

const sol = generateSystem('ignored', 'sol');
const byId = (id) => sol.bodies.find((body) => body.id === id);

test('0.1.0.5E keeps massless SOL surface-sky observers alongside the expanded real-landing set', () => {
  const landingIds = new Set(['planet-earth', 'planet-mars', 'moon-luna', 'moon-europa', 'moon-titan', 'moon-triton']);
  for (const id of ['planet-earth', 'planet-mars', 'moon-luna', 'moon-europa', 'moon-titan', 'moon-triton']) {
    const body = byId(id);
    const sky = surfaceSkyObserverSupport(body, sol.bodies);
    const landing = surfaceEngineSupport(body, sol.bodies);
    assert.equal(sky.enabled, true, body.name);
    assert.equal(landing.enabled, landingIds.has(id), body.name);
    if (landingIds.has(id)) assert.equal(landing.solReferenceLanding, true, body.name);
    else assert.match(landing.reason, /landing remains intentionally disabled/i);
  }
  assert.equal(surfaceSkyObserverSupport(byId('planet-jupiter'), sol.bodies).enabled, false);
  assert.equal(surfaceSkyObserverSupport(byId('planet-saturn'), sol.bodies).enabled, false);

  const origin = generateSystem('ORIGIN-001', 'origin');
  assert.equal(surfaceSkyObserverSupport(origin.bodies.find((body) => body.kind !== 'star'), origin.bodies).enabled, false);
});

test('reference surface-sky region is explicitly observer-only and contains no invented local exploration content', () => {
  const earth = byId('planet-earth');
  const region = createSurfaceSkyObserverRegion(sol, earth, sol.bodies);
  assert.equal(region.observerOnly, true);
  assert.equal(region.surfaceEngineProfile, SURFACE_SKY_PROFILE_ID);
  assert.equal(region.terrainReality, 'SCHEMATIC / NOT A REAL SURFACE MAP');
  assert.equal(region.weatherEnabled, false);
  assert.equal(region.normalPois.length, 0);
  assert.equal(region.anomalies.length, 0);
  assert.equal(region.terrain.roughness, 0);
  assert.equal(region.terrain.broadAmplitude, 0);
  assert.match(region.scientificStatus, /schematic flat horizon/i);
});

test('moon observer defaults use the physical sub-parent point at the live simulation epoch', () => {
  const t = 37.25 * 86400;
  for (const [moonId, parentId] of [
    ['moon-luna', 'planet-earth'],
    ['moon-europa', 'planet-jupiter'],
    ['moon-titan', 'planet-saturn'],
    ['moon-triton', 'planet-neptune'],
  ]) {
    const moon = byId(moonId);
    const parent = byId(parentId);
    const anchor = defaultSurfaceSkyAnchor(moon, sol.bodies, null, t);
    const inertialUp = bodyFixedDirectionToInertial(moon, anchor, t, new Float64Array(3));
    const towardParent = normalizedDelta(parent, moon);
    assert.ok(dot(inertialUp, towardParent) > 0.999999999, `${moon.name} sub-parent alignment`);
  }
});

test('planet observer defaults use the body-fixed point beneath the spacecraft direction', () => {
  const earth = byId('planet-earth');
  const t = 123456;
  const ship = new Float64Array([
    earth.position[0] + earth.radius * 4,
    earth.position[1] + earth.radius * 0.4,
    earth.position[2] - earth.radius * 0.2,
  ]);
  const anchor = defaultSurfaceSkyAnchor(earth, sol.bodies, ship, t);
  const inertialUp = bodyFixedDirectionToInertial(earth, anchor, t, new Float64Array(3));
  const shipDirection = normalizedDelta({ position: ship }, earth);
  assert.ok(dot(inertialUp, shipDirection) > 0.999999999);
});


test('physically scaled parent worlds are high in the default moon sky and naturally dramatic without fake enlargement', () => {
  const expectedMinimumDiameterDeg = new Map([
    ['moon-luna', 1.5],
    ['moon-europa', 10],
    ['moon-titan', 4],
    ['moon-triton', 6],
  ]);
  const observerModel = new AstronomicalObserverModel();
  for (const [moonId, minimumDeg] of expectedMinimumDiameterDeg) {
    const moon = byId(moonId);
    const parent = byId(moon.parentId);
    const session = {
      x: 0,
      z: 0,
      yaw: 0,
      pitch: 1.08,
      bodyFixedAnchor: defaultSurfaceSkyAnchor(moon, sol.bodies, null, 0),
    };
    observerModel.solveSurface({ body: moon, shipPosition: null, session, simulationTimeSeconds: 0 });
    observerModel.updateBodies(sol.bodies);
    const observedParent = observerModel.bodyObservations.find((record) => record.id === parent.id);
    const diameterDeg = observedParent.angularDiameterRad * 180 / Math.PI;
    assert.ok(observedParent.visibleAboveHorizon, `${parent.name} should be above ${moon.name}'s default horizon`);
    assert.ok(observedParent.centerAltitudeRad * 180 / Math.PI > 89.9, `${parent.name} should begin near zenith from the sub-parent point`);
    assert.ok(diameterDeg > minimumDeg, `${parent.name} apparent diameter ${diameterDeg.toFixed(3)}° from ${moon.name}`);
  }
});
