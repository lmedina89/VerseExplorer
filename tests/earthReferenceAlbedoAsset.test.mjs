import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const factory = readFileSync(join(root, 'src/render/celestialFactory.js'), 'utf8');
const thirdParty = readFileSync(join(root, 'THIRD-PARTY.md'), 'utf8');
const assetPath = join(root, 'assets/textures/earth-akshat-albedo.jpg');

test('Earth reference albedo is isolated to canonical SOL Earth and loaded lazily', () => {
  assert.match(factory, /'planet-earth': new URL\('\.\.\/\.\.\/assets\/textures\/earth-akshat-albedo\.jpg'/);
  assert.match(factory, /apparentRadiusRad >= 0\.006/);
  assert.match(factory, /makePlanetaryPresentationMaps\(body, materialProfile\)/);
  assert.match(factory, /createPlanetarySurfacePresentationMaps/);
});

test('bundled Earth albedo is a nontrivial JPEG asset', () => {
  const bytes = readFileSync(assetPath);
  assert.ok(statSync(assetPath).size > 500_000);
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
  assert.equal(bytes.at(-2), 0xff);
  assert.equal(bytes.at(-1), 0xd9);
});

test('Earth asset attribution records Akshat source and CC BY 4.0', () => {
  assert.match(thirdParty, /Earth.*Akshat/s);
  assert.match(thirdParty, /41fc80d85dfd480281f21b74b2de2faa/);
  assert.match(thirdParty, /CC BY 4\.0/);
  assert.match(thirdParty, /earth-akshat-albedo\.jpg/);
});


test('Earth glTF-sourced albedo uses explicit north-up V orientation on SphereGeometry', () => {
  assert.match(factory, /texture\.flipY\s*=\s*false/);
});
