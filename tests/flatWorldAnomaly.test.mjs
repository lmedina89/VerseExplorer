import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PHYSICS } from '../src/core/constants.js';
import { CosmicPhenomenonRegistry } from '../src/cosmic/phenomenonRegistry.js';
import { createFlatWorldAnomalyDefinition, FLAT_WORLD_ANOMALY_ID, withFlatWorldAnomaly } from '../src/cosmic/flatWorldAnomaly.js';
import { generateSolSystem } from '../src/data/solSystem.js';

const ROOT = new URL('../', import.meta.url);

function magnitude(v) { return Math.hypot(v[0], v[1], v[2]); }

test('FW1 anomaly is remote, massless, visual-only, and explicitly fictional', () => {
  const anomaly = createFlatWorldAnomalyDefinition();
  const distanceAu = magnitude(anomaly.position) / PHYSICS.AU;
  assert.equal(anomaly.id, FLAT_WORLD_ANOMALY_ID);
  assert.equal(anomaly.kind, 'anomaly-flat-world');
  assert.equal(anomaly.label, 'FLAT EARTH [ANOMALY]');
  assert.equal(anomaly.visualOnly, true);
  assert.equal(anomaly.gravitySource, false);
  assert.equal(anomaly.alwaysIdentified, true);
  assert.equal(anomaly.realityClass, 'impossible');
  assert.ok(distanceAu > 100 && distanceAu < 140, `expected remote ~117 AU placement, got ${distanceAu}`);
  assert.ok(Math.abs(anomaly.position[1]) > 30 * PHYSICS.AU, 'placement should be substantially off the ecliptic');
  assert.match(anomaly.scientificStatus, /INTENTIONALLY FICTIONAL/);
  assert.match(anomaly.scientificStatus, /no gravity/i);
});

test('FW1 composes into COSMOS without mutating or duplicating canonical phenomenon arrays', () => {
  const canonical = Object.freeze([{ id:'existing-source', kind:'test', position:[1,2,3], radiusMeters:4 }]);
  const composed = withFlatWorldAnomaly(canonical);
  assert.equal(canonical.length, 1);
  assert.equal(composed[0].id, FLAT_WORLD_ANOMALY_ID);
  assert.equal(composed[1].id, 'existing-source');
  assert.equal(withFlatWorldAnomaly(composed).filter((x)=>x.id===FLAT_WORLD_ANOMALY_ID).length, 1);
});

test('SOL canonical reference generation remains untouched by the visual anomaly side build', () => {
  const sol = generateSolSystem();
  assert.equal(sol.phenomena.length, 0);
  assert.equal(sol.metadata.phenomenonCount, 0);
  assert.equal(sol.metadata.anomalyCount, 0);
  assert.ok(!sol.bodies.some((body) => body.id === FLAT_WORLD_ANOMALY_ID));
});

test('FW1 uses the existing massless cosmic observation-state contract', () => {
  const registry = new CosmicPhenomenonRegistry();
  const anomaly = createFlatWorldAnomalyDefinition();
  registry.reset([anomaly]);
  const state = registry.state(FLAT_WORLD_ANOMALY_ID, () => null);
  assert.equal(state.id, FLAT_WORLD_ANOMALY_ID);
  assert.deepEqual([...state.center], anomaly.position);
  assert.deepEqual([...state.velocity], [0,0,0]);
  assert.equal(state.radiusMeters, anomaly.radiusMeters);
});

test('FW1 renderer keeps local lighting isolated and animates the local Sun/Moon path', async () => {
  const renderSource = await readFile(new URL('../src/render/flatWorldAnomaly.js', import.meta.url), 'utf8');
  const cosmicSource = await readFile(new URL('../src/render/cosmicPhenomena.js', import.meta.url), 'utf8');
  const rendererSource = await readFile(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');
  assert.match(renderSource, /FLAT_WORLD_VISUAL_LAYER = 2/);
  assert.match(renderSource, /PointLight\(0xffdf9a/);
  assert.match(renderSource, /PointLight\(0x91b6ff/);
  assert.match(renderSource, /flatWorldPathPoint\(phase/);
  assert.match(renderSource, /flatWorldPathPoint\(phase\+Math\.PI/);
  assert.match(renderSource, /flat-world-firmament-edges/);
  assert.match(renderSource, /flat-world-firmament-lower-apex/);
  assert.match(renderSource, /flat-world-firmament-edge-glow-/);
  assert.match(renderSource, /flat-world-path-marker-/);
  assert.match(renderSource, /createFirmament\(pyramidHalfBase,pyramidApex,0\)/);
  assert.match(renderSource, /flat-world-zodiac-/);
  assert.match(cosmicSource, /definition\.kind === 'anomaly-flat-world'/);
  assert.match(rendererSource, /camera\.layers\.enable\(2\)/);
});

test('FW1 app injects the anomaly only into the Explorer COSMOS registry and pre-identifies it', async () => {
  const appSource = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  const resets = appSource.match(/cosmicPhenomena\.reset\(withFlatWorldAnomaly\(this\.system\.phenomena \?\? \[\]\)\)/g) ?? [];
  assert.equal(resets.length, 2, 'new-system and load paths should both compose the same visual anomaly');
  assert.match(appSource, /entry\.alwaysIdentified/);
  assert.match(appSource, /withFlatWorldAnomaly/);
});
