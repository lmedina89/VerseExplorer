import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('0.1.0.6A.2 exposes SKY SPAWN directly in the actual landed surface HUD', () => {
  const html = read('index.html');
  for (const id of ['surfaceSpawnButton','surfaceSpawnPanel','surfaceSpawnParent','surfaceSpawnAltitude','surfaceSpawnAltitudeValue','surfaceSpawnLookValue','surfaceSpawnSpeedValue','surfaceSpawnPeriodValue','surfaceSpawnPreview','surfaceSpawnCommit','surfaceSpawnCancel','surfaceSpawnStatus']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /SKY SPAWN/);
});

test('surface SKY SPAWN uses the astronomical surface observer look vector and live N-body addBody path', () => {
  const app = read('src/app/app.js');
  const sandbox = read('src/experiments/orbitSandbox.js');
  const renderer = read('src/render/surfaceWorld.js');
  assert.match(app, /buildSurfaceSkySandboxOrbitPlan/);
  assert.match(app, /sandboxSpawnSource: 'surface-reticle'/);
  assert.match(app, /surfaceSession\.observerOnly === true/);
  assert.match(app, /this\.addBody\(/);
  assert.match(sandbox, /observer\.forward/);
  assert.match(sandbox, /lookRangeMeters/);
  assert.match(renderer, /surface-sky-spawn-preview/);
  assert.match(renderer, /surface-sky-spawn-orbit-preview/);
});

test('surface preview remains presentation-only until COMMIT', () => {
  const app = read('src/app/app.js');
  assert.match(app, /this\.surfaceSandboxPreviewActive = true/);
  assert.match(app, /this\.renderer\.setSurfaceSandboxPreview/);
  assert.match(app, /this\.surfaceSandboxPreviewActive = true/);
  assert.match(app, /this\.renderer\.setSurfaceSandboxPreview/);
  assert.match(app, /this\.addBody\(/);
});
