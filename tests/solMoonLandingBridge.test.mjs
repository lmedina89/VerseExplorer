import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateSystem } from '../src/data/systemGenerator.js';
import { AstronomicalObserverModel } from '../src/core/astronomicalObserver.js';
import { captureBodyFixedSurfaceAnchor } from '../src/core/planetaryRotation.js';
import { generateSurfaceRegion, availableSurfaceRegions } from '../src/surface/surfaceGenerator.js';
import { surfaceEngineSupport, SURFACE_ENGINE_PROFILES } from '../src/surface/surfaceProfiles.js';
import { createSurfaceSession, surfaceTakeoffReferencePosition } from '../src/surface/surfaceSession.js';
import { frameOrbitInsertionPlan } from '../src/physics/frameOrbitInsertion.js';

const sol = generateSystem('ignored', 'sol');
const moon = sol.bodies.find((body) => body.id === 'moon-luna');
const earth = sol.bodies.find((body) => body.id === 'planet-earth');

test('SOL Moon alone is bridged into the inherited airless landing profile', () => {
  const support = surfaceEngineSupport(moon, sol.bodies);
  assert.equal(support.enabled, true);
  assert.equal(support.solReferenceProof, true);
  assert.equal(support.profileId, SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY);
  assert.deepEqual(availableSurfaceRegions(sol, moon, sol.bodies), [
    { id: 'airless-regolith', name: 'Regolith Survey Site', subtitle: 'Airless rocky reference surface' },
  ]);
  for (const body of sol.bodies.filter((entry) => entry.referenceSystemId === 'sol' && entry.id !== 'moon-luna')) {
    if (body.kind === 'planet' || body.kind === 'moon') assert.equal(surfaceEngineSupport(body, sol.bodies).enabled, false, body.name);
  }
});

test('Moon landing region reuses the established physical airless surface stack without fake atmosphere, weather or anomalies', () => {
  const region = generateSurfaceRegion(sol, moon, 'airless-regolith', sol.bodies);
  assert.equal(region.bodyId, moon.id);
  assert.equal(region.surfaceEngineProfile, SURFACE_ENGINE_PROFILES.AIRLESS_ROCKY);
  assert.equal(region.surfaceArchitectureFamily, 'AIRLESS_ROCKY');
  assert.equal(region.atmosphereMode, 'airless');
  assert.equal(region.weatherEnabled, false);
  assert.equal(region.anomalyVisualsEnabled, false);
  assert.equal(region.anomalies.length, 0);
  assert.ok(region.gravityMps2 > 1.61 && region.gravityMps2 < 1.64, `lunar g=${region.gravityMps2}`);
  assert.match(region.scientificStatus, /procedural proxies/i);
});

test('landed Moon surface and massless Moon observer consume the same live astronomical model', () => {
  const region = generateSurfaceRegion(sol, moon, 'airless-regolith', sol.bodies);
  const shipPosition = new Float64Array([moon.position[0] + moon.radius * 1.2, moon.position[1], moon.position[2]]);
  const session = createSurfaceSession(region);
  session.bodyFixedAnchor = [...captureBodyFixedSurfaceAnchor(moon, shipPosition, 0)];
  const model = new AstronomicalObserverModel();
  model.solveSurface({ body: moon, shipPosition, session, terrainHeightMeters: 0, simulationTimeSeconds: 0 });
  model.updateBodies(sol.bodies);
  const earthView = model.bodyObservations.find((record) => record.id === earth.id);
  assert.ok(earthView?.finite);
  assert.ok(earthView.angularDiameterRad > 0);
  assert.equal(earthView.name, 'Earth');
});

test('Moon takeoff reference feeds the existing Hill-screened return-orbit planner without mutating the Moon', () => {
  const region = generateSurfaceRegion(sol, moon, 'airless-regolith', sol.bodies);
  const session = createSurfaceSession(region);
  session.bodyFixedAnchor = [1, 0, 0];
  const beforePosition = [...moon.position];
  const beforeVelocity = [...moon.velocity];
  const takeoffPosition = surfaceTakeoffReferencePosition(session, moon, 0);
  assert.ok(takeoffPosition?.every(Number.isFinite));
  const plan = frameOrbitInsertionPlan({ position: takeoffPosition }, moon, sol.bodies);
  assert.equal(plan.ok, true, plan.reason);
  assert.ok(plan.radiusMeters > moon.radius);
  assert.deepEqual([...moon.position], beforePosition);
  assert.deepEqual([...moon.velocity], beforeVelocity);
});

test('app keeps massless SURFACE SKY and real Moon landing as distinct entry paths', () => {
  const source = fs.readFileSync(new URL('../src/app/app.js', import.meta.url), 'utf8');
  assert.match(source, /if \(landing\.ok\) return \{ ok: true, mode: 'land'/);
  assert.match(source, /if \(sky\.ok\) return \{ ok: true, mode: 'sky'/);
  assert.match(source, /availability\.mode === 'sky' \? this\.enterSurfaceSky\(body\.id\) : this\.enterSurface\(body\.id\)/);
  assert.match(source, /observerOnly === true/);
});
