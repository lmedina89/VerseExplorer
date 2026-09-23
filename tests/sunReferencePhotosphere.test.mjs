import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const factory = readFileSync(join(root, 'src/render/celestialFactory.js'), 'utf8');
const surface = readFileSync(join(root, 'src/render/surfaceWorld.js'), 'utf8');
const thirdParty = readFileSync(join(root, 'THIRD-PARTY.md'), 'utf8');
const assetPath = join(root, 'assets/textures/sun-sebastiansosnowski-photosphere.jpg');

test('SOL Sun reference photosphere is isolated to the canonical Sun and does not load the GLB', () => {
  assert.match(factory, /referenceSystemId !== 'sol'/);
  assert.match(factory, /body\?\.name !== 'Sun'/);
  assert.match(factory, /sun-sebastiansosnowski-photosphere\.jpg/);
  assert.doesNotMatch(factory, /sun\.glb/);
});

test('bundled Sun photosphere is a nontrivial 1024x512-class JPEG asset', () => {
  const bytes = readFileSync(assetPath);
  assert.ok(statSync(assetPath).size > 100_000);
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
  assert.equal(bytes.at(-2), 0xff);
  assert.equal(bytes.at(-1), 0xd9);
});

test('Sun attribution records SebastianSosnowski source and CC BY 4.0', () => {
  assert.match(thirdParty, /Sun.*SebastianSosnowski/s);
  assert.match(thirdParty, /9ef1c68fbb944147bcfcc891d3912645/);
  assert.match(thirdParty, /CC BY 4\.0/);
  assert.match(thirdParty, /sun-sebastiansosnowski-photosphere\.jpg/);
});

test('surface Sun display mapping does not use physical direct transmission literally as alpha', () => {
  assert.match(surface, /clearAirDiskGain/);
  assert.match(surface, /diskDisplayOpacity/);
  assert.match(surface, /visibleFraction/);
  assert.doesNotMatch(surface, /disk\.material\.opacity = Math\.max\(0\.015, exposure\.directStellarTransmission\)/);
});

test('surface survey beacons carry explicit readable scan labels', () => {
  assert.match(surface, /SURVEY \/ SCAN/);
  assert.match(surface, /survey-beacon-label/);
  assert.match(surface, /poi\.name/);
});
