import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateSystem } from '../src/data/systemGenerator.js';
import { buildSurfaceSkySandboxOrbitPlan, sandboxAltitudePresets } from '../src/experiments/orbitSandbox.js';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const sol = generateSystem('SOL-J2000', 'sol');
const earth = sol.bodies.find((body) => body.id === 'planet-earth');
const moon = sol.bodies.find((body) => body.id === 'moon-luna');
const mars = sol.bodies.find((body) => body.id === 'planet-mars');

function zenithObserver(parent) {
  return {
    valid: true,
    parentBodyId: parent.id,
    inertialPosition: new Float64Array([parent.position[0] + parent.radius + 2, parent.position[1], parent.position[2]]),
    localUp: new Float64Array([1, 0, 0]),
    horizonEast: new Float64Array([0, 0, 1]),
    horizonNorth: new Float64Array([0, 1, 0]),
    forward: new Float64Array([1, 0, 0]),
  };
}

test('6A.2 adds a genuinely closer body-aware NEAR shell without collapsing LOW/MEDIUM/HIGH', () => {
  assert.deepEqual(sandboxAltitudePresets(earth), { near: 200_000, low: 400_000, medium: 2_000_000, high: 20_000_000 });
  assert.deepEqual(sandboxAltitudePresets(moon), { near: 25_000, low: 100_000, medium: 500_000, high: 2_000_000 });
  assert.deepEqual(sandboxAltitudePresets(mars), { near: 125_000, low: 250_000, medium: 1_000_000, high: 6_000_000 });
});

test('NEAR through HIGH are monotonic in true zenith line-of-sight and apparent size', () => {
  const observer = zenithObserver(earth);
  const plans = ['near','low','medium','high'].map((altitudePreset) => buildSurfaceSkySandboxOrbitPlan({ parent: earth, observer, altitudePreset }));
  for (let i = 1; i < plans.length; i += 1) assert.ok(plans[i].lookRangeMeters > plans[i - 1].lookRangeMeters);
  const angular = plans.map((plan) => Math.asin(plan.body.radius / plan.lookRangeMeters));
  for (let i = 1; i < angular.length; i += 1) assert.ok(angular[i] < angular[i - 1]);
  assert.ok(angular[0] / angular.at(-1) > 50, 'NEAR vs HIGH should be visually distinguishable by true angular size');
});

test('surface preview uses true angular size with a separate ring aiming floor', () => {
  const renderer = read('src/render/surfaceWorld.js');
  assert.match(renderer, /physicalGhostRadius = Math\.max\(0\.08, shell \* Math\.tan/);
  assert.match(renderer, /aimingRingRadius = Math\.max\(1\.9, physicalGhostRadius \* 1\.35\)/);
  assert.doesNotMatch(renderer, /physicalMarkerRadius = Math\.max\(8\.5/);
});

test('surface preview collapses the setup panel after PREVIEW so the sky remains visible', () => {
  const app = read('src/app/app.js');
  const css = read('styles.css');
  const html = read('index.html');
  assert.match(html, /option value="near" selected>NEAR<\/option>/);
  assert.match(app, /classList\.add\('preview-compact'\)/);
  assert.match(app, /classList\.remove\('preview-compact'\)/);
  assert.match(css, /surface-spawn-panel\.preview-compact/);
  assert.match(css, /#surfaceSpawnPreview\{display:none!important\}/);
});

test('landed Sun has a bounded additive glare layer that backs off for telescope FOV', () => {
  const renderer = read('src/render/surfaceWorld.js');
  assert.match(renderer, /stellar-glare-proxy/);
  assert.match(renderer, /nakedEyeGlare/);
  assert.match(renderer, /glareDiameter/);
  assert.match(renderer, /whiteBlend/);
});

test('orbit planet polish loads detailed maps earlier and enables higher quality filtering', () => {
  const factory = read('src/render/celestialFactory.js');
  assert.match(factory, /tuneResolvedTexture\(texture, 8\)/);
  assert.match(factory, /THREE\.LinearMipmapLinearFilter/);
  assert.match(factory, /apparentRadiusRad >= 0\.004/);
  assert.match(factory, /apparentRadiusRad >= 0\.022/);
});
