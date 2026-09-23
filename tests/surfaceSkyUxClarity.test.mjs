import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/app/app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('surface sky separates observer location from selected celestial target', () => {
  assert.match(app, /SURFACE SKY — \${observerBody\?\.name/);
  assert.match(app, /VIEWING — \${focusName}/);
  assert.match(html, /id="surfaceFocusCompactLabel">FOUND/);
  assert.match(app, /compactLabel\.textContent = 'TARGET'/);
  assert.match(app, /compactTarget\.textContent = focusName/);
});

test('surface sky details expose target alt-az, horizon, phase and physical angular size', () => {
  assert.match(html, /id="surfaceFocusAltAz"/);
  assert.match(html, /id="surfaceFocusHorizon"/);
  assert.match(html, /id="surfaceFocusPhase"/);
  assert.match(html, /id="surfaceFocusAngular"/);
  assert.match(app, /ABOVE HORIZON/);
  assert.match(app, /LIMB ABOVE HORIZON/);
  assert.match(app, /BELOW HORIZON/);
  assert.match(app, /formatAngularDiameter\(focus\.angularDiameterRad\)/);
});

test('NEXT can select finite below-horizon targets without changing astronomy or spacecraft state', () => {
  const start = app.indexOf('surfaceSkyTargetCandidates(');
  const end = app.indexOf('\n  syncSurfaceSkyPresentationControls', start);
  const candidates = app.slice(start, end);
  assert.match(candidates, /record\.finite/);
  assert.doesNotMatch(candidates, /filter\([^\n]*visibleAboveHorizon/);
  const cycleStart = app.indexOf('cycleSurfaceSkyTarget()');
  const cycleEnd = app.indexOf('\n  cycleSurfaceSkyFov()', cycleStart);
  const cycle = app.slice(cycleStart, cycleEnd);
  assert.match(cycle, /SURFACE SKY VIEWING:/);
  assert.doesNotMatch(cycle, /ship\.position|ship\.velocity|physicsStep|placeShip/);
});

test('CENTER remains framing-only and FOV preset geometry contract is unchanged', () => {
  const start = app.indexOf('centerSurfaceSkyTarget(');
  const end = app.indexOf('\n  cycleSurfaceSkyTarget()', start);
  const center = app.slice(start, end);
  assert.match(center, /surfaceSession\.yaw = Math\.atan2/);
  assert.match(center, /surfaceSession\.pitch =/);
  assert.doesNotMatch(center, /ship\.position|ship\.velocity|physicsStep|placeShip/);
  assert.match(app, /SURFACE_SKY_FOV_PRESETS = Object\.freeze\(\[70, 35, 15, 5, 1\.5\]\)/);
});
