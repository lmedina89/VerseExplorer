import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateSystem } from '../src/data/systemGenerator.js';
import { AstronomicalObserverModel } from '../src/core/astronomicalObserver.js';
import { defaultSurfaceSkyAnchor } from '../src/surface/surfaceSkyObserver.js';

const renderer = fs.readFileSync(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
const threeRenderer = fs.readFileSync(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/app/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('0.1.0.5B surface presentation adds physically proportioned Saturn main rings', () => {
  assert.match(renderer, /inner: 1\.239, outer: 1\.526/);
  assert.match(renderer, /inner: 1\.526, outer: 1\.950/);
  assert.match(renderer, /inner: 2\.030, outer: 2\.270/);
  assert.match(renderer, /planet-saturn/);
  assert.match(renderer, /rotationAxisLocal/);
});

test('surface telescope uses bounded camera FOV presets without altering celestial geometry', () => {
  assert.match(app, /SURFACE_SKY_FOV_PRESETS = Object\.freeze\(\[70, 35, 15, 5, 1\.5\]\)/);
  assert.match(threeRenderer, /setSurfaceFovDegrees/);
  assert.match(renderer, /setFovDegrees\(degrees = 70\)/);
  assert.match(app, /physical angular sizes and the N-body state are unchanged/);
  assert.match(html, /id="surfaceFovButton"/);
});

test('surface sky target framing changes observer yaw and pitch only', () => {
  const start = app.indexOf('centerSurfaceSkyTarget(');
  const end = app.indexOf('\n  cycleSurfaceSkyTarget()', start);
  const method = app.slice(start, end);
  assert.match(method, /surfaceSession\.yaw = Math\.atan2/);
  assert.match(method, /surfaceSession\.pitch =/);
  assert.doesNotMatch(method, /ship\.position|ship\.velocity|physicsStep|placeShip/);
  assert.match(html, /id="surfaceSkyNext"/);
  assert.match(html, /id="surfaceSkyCenter"/);
});

test('rotation axis is projected into the local observer basis without mutating SOL body state', () => {
  const system = generateSystem('SOL-J2000', 'sol');
  const titan = system.bodies.find((body) => body.id === 'moon-titan');
  const saturn = system.bodies.find((body) => body.id === 'planet-saturn');
  assert.ok(titan && saturn);
  const axisBefore = [...saturn.rotationAxisInertial];
  const anchor = defaultSurfaceSkyAnchor(titan, system.bodies, null, 0);
  const model = new AstronomicalObserverModel();
  model.solveSurface({ body: titan, shipPosition: titan.position, session: { x: 0, z: 0, yaw: 0, pitch: 0, bodyFixedAnchor: [...anchor] }, simulationTimeSeconds: 0 });
  model.updateBodies(system.bodies);
  const observed = model.solution().bodies.find((record) => record.id === saturn.id);
  assert.ok(observed?.rotationAxisLocal);
  const mag = Math.hypot(...observed.rotationAxisLocal);
  assert.ok(Math.abs(mag - 1) < 1e-9);
  assert.deepEqual([...saturn.rotationAxisInertial], axisBefore);
});
