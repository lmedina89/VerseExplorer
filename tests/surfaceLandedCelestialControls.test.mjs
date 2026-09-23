import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/app/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const surface = fs.readFileSync(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
const factory = fs.readFileSync(new URL('../src/render/celestialFactory.js', import.meta.url), 'utf8');

test('landed surface shares NEXT CENTER and telescope FOV controls with reference surface sky', () => {
  assert.match(app, /const landed = activeSurface && !observerOnly && this\.surfaceTransition\?\.phase === SURFACE_PHASE\.LANDED/);
  assert.match(app, /const presentationActive = observerOnly \|\| landed/);
  assert.match(app, /LANDED SKY/);
  assert.match(app, /LANDED TELESCOPE/);
  for (const id of ['surfaceSkyNext','surfaceSkyCenter','surfaceFovButton','surfaceHudToggle']) assert.match(html, new RegExp(`id="${id}"`));
});

test('landed and observer surface modes share target and FOV presentation state without moving spacecraft or surface position', () => {
  assert.match(app, /surfaceSkyPresentation = \{ focusBodyId: null, fovIndex: 0 \}/);
  assert.match(app, /surfaceSkyPresentation\.focusBodyId/);
  assert.match(app, /surfaceSkyPresentation\.fovIndex/);
  const centerStart = app.indexOf('centerSurfaceSkyTarget(');
  const centerEnd = app.indexOf('\n  cycleSurfaceSkyTarget()', centerStart);
  const center = app.slice(centerStart, centerEnd);
  assert.doesNotMatch(center, /ship\.position|ship\.velocity|surfaceSession\.x\s*=|surfaceSession\.z\s*=/);
});

test('surface details distinguish below horizon, off screen and in-view celestial targets', () => {
  assert.match(app, /BELOW HORIZON/);
  assert.match(app, /OFF SCREEN/);
  assert.match(app, /IN VIEW/);
  assert.match(app, /halfDiagonal/);
});

test('MIN landed HUD hides bulky weather signal and scan controls while retaining celestial controls', () => {
  assert.match(html, /class="surface-viewing-metric"/);
  assert.match(html, /id="surfaceViewingCompact"/);
  assert.match(css, /explorer-hud-min\.surface-active \.surface-compact-metrics span:nth-child\(1\)/);
  assert.match(css, /#surfaceScanButton/);
  assert.match(css, /#surfaceSprintButton/);
  assert.match(css, /explorer-hud-min\.surface-active \.surface-hud\{width:min\(390px,62vw\)/);
});

test('surface celestial disks reuse the deterministic planetary albedo presentation maps', () => {
  assert.match(factory, /export function createPlanetarySurfacePresentationMaps/);
  assert.match(surface, /createPlanetarySurfacePresentationMaps/);
  assert.match(surface, /surfaceAlbedoDetailed/);
  assert.match(surface, /apparentAngularRadiusRad\) >= 0\.002/);
  assert.match(surface, /mesh\.material\?\.map \? new THREE\.Color\(0xffffff\)/);
});
