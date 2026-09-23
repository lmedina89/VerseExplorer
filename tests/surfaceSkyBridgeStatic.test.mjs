import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/app/app.js', import.meta.url), 'utf8');
const renderer = fs.readFileSync(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
const map = fs.readFileSync(new URL('../src/ui/systemMap.js', import.meta.url), 'utf8');

test('surface-sky mode preserves the live spacecraft simulation instead of replacing it with a landing state', () => {
  assert.match(app, /enterSurfaceSky\(bodyId/);
  assert.match(app, /surfaceSession\.observerOnly = true/);
  assert.match(app, /observerOnly === true\) this\.clock\.advance\(realDt, \(dt\) => this\.physicsStep\(dt\)/);
  assert.match(app, /surfaceSession: this\.surfaceSession\?\.observerOnly === true \? null : serializeSurfaceSession/);
  assert.match(app, /timeScale: this\.surfaceSession\?\.active && this\.surfaceSession\.observerOnly !== true/);
  const start = app.indexOf('enterSurfaceSky(bodyId');
  const end = app.indexOf('\n  recoverSurfaceRuntime', start);
  const method = app.slice(start, end);
  assert.doesNotMatch(method, /ship\.position\s*=/);
  assert.doesNotMatch(method, /ship\.velocity\s*=/);
  assert.doesNotMatch(method, /placeShipInCircularOrbit|cancelNavigation\(/);
});

test('observer-only rendering suppresses fictional local scenery while retaining the astronomical surface renderer', () => {
  assert.match(renderer, /this\.observerOnly = region\?\.observerOnly === true/);
  assert.match(renderer, /this\.observerOnly \? new THREE\.Group\(\)/);
  assert.match(renderer, /if \(!this\.observerOnly\)/);
});

test('surface entry controls and system map route SOL worlds through the shared observer-or-landing decision', () => {
  assert.match(app, /enterTargetSurfaceMode\(this\.targetId\)/);
  assert.match(map, /surfaceEntryAvailability\(body\)/);
  assert.match(map, /enterTargetSurfaceMode\(marker\.id\)/);
  assert.match(map, /SURFACE SKY observer available/);
});
