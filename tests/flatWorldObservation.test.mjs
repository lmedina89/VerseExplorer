import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFlatWorldAnomalyDefinition, FLAT_WORLD_ANOMALY_ID } from '../src/cosmic/flatWorldAnomaly.js';
import { createFlatWorldObservationRegion, supportsFlatWorldObservation } from '../src/surface/flatWorldObservation.js';

test('FW2 exposes only the Flat World anomaly as a presentation-only disc-top observation surface', () => {
  const anomaly = createFlatWorldAnomalyDefinition();
  assert.equal(supportsFlatWorldObservation(anomaly), true);
  const region = createFlatWorldObservationRegion(anomaly);
  assert.equal(region.bodyId, FLAT_WORLD_ANOMALY_ID);
  assert.equal(region.observerOnly, true);
  assert.equal(region.flatWorldObservation, true);
  assert.equal(region.gravityMps2, 0);
  assert.equal(region.atmospherePressurePa, 0);
  assert.equal(region.weatherEnabled, false);
  assert.equal(region.flatWorldDefinition.gravitySource, false);
  assert.equal(region.flatWorldDefinition.visualOnly, true);
  assert.match(region.scientificStatus, /spacecraft is not teleported or landed physically/i);
});

test('FW2 surface renderer reuses the FW1 anomaly geometry and local-luminary animation', async () => {
  const source = await readFile(new URL('../src/render/flatWorldSurface.js', import.meta.url), 'utf8');
  assert.match(source, /createFlatWorldAnomalyVisual/);
  assert.match(source, /updateFlatWorldAnomalyVisual/);
  assert.match(source, /FLAT_WORLD_VISUAL_LAYER/);
  assert.match(source, /firmamentMaterial\.opacity/);
  assert.match(source, /firmamentEdgeMaterial\.opacity/);
  assert.match(source, /camera\.layers\.set\(FLAT_WORLD_VISUAL_LAYER\)/);
});

test('FW2 app wires a Flat World-only LAND / VIEW control without adding it to the N-body registry', async () => {
  const app = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="landFlatWorld"/);
  assert.match(app, /enterFlatWorldObservationSurface/);
  assert.match(app, /surfaceSession\.flatWorldObservation = true/);
  assert.match(app, /supportsFlatWorldObservation\(this\.selectedPhenomenon\)/);
  assert.match(app, /spacecraft position remain untouched/i);
  assert.doesNotMatch(app, /registry\.create\(.*FLAT_WORLD_ANOMALY_ID/);
});

test('FW2 renderer bridge selects the dedicated visual-only surface class', async () => {
  const source = await readFile(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');
  assert.match(source, /FlatWorldSurfaceVisual/);
  assert.match(source, /region\?\.flatWorldObservation === true/);
  assert.match(source, /elapsedSimSeconds/);
});
