import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('0.1.0.6A shell exposes preview/commit controls and explicit MODIFIED state', () => {
  const html = read('index.html');
  for (const id of ['sandboxChip','sandboxParent','sandboxAltitude','sandboxAltitudeValue','sandboxSpeedValue','sandboxPeriodValue','sandboxBodyValue','sandboxPreview','sandboxCommit','sandboxCancel','sandboxStatus']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /ORBIT SANDBOX · 0\.1\.0\.6A/);
  assert.match(html, /SOL — MODIFIED/);
});

test('0.1.0.6A app commits sandbox metadata without modifying the integrator implementation', () => {
  const app = read('src/app/app.js');
  const renderer = read('src/render/threeRenderer.js');
  assert.match(app, /buildSandboxOrbitPlan/);
  assert.match(app, /sandboxGenerated: true/);
  assert.match(app, /sandboxOrbitDirection: 'prograde'/);
  assert.match(app, /Reference system is now MODIFIED \/ SANDBOX/);
  assert.match(renderer, /setSandboxPreview\(plan, orbitPoints\)/);
  assert.match(renderer, /sandbox-orbit-preview/);
});
