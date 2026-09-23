import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Explorer 0.1.0.5C cache-busts the Moon landing support chain for Safari/GitHub Pages', () => {
  const index = read('index.html');
  const main = read('src/main.js');
  const app = read('src/app/app.js');
  const generator = read('src/data/systemGenerator.js');
  const surfaceGenerator = read('src/surface/surfaceGenerator.js');
  const systemNavigation = read('src/navigation/systemNavigation.js');
  const frameOrbitInsertion = read('src/physics/frameOrbitInsertion.js');
  const systemMap = read('src/ui/systemMap.js');
  assert.match(index, /src\/main\.js\?v=155-ue0105c/);
  assert.match(main, /app\/app\.js\?v=155-ue0105c/);
  assert.match(app, /data\/systemGenerator\.js\?v=ue0104b1/);
  assert.match(app, /data\/solSystem\.js\?v=ue0104b1/);
  assert.match(app, /ui\/systemMap\.js\?v=ue0105c/);
  assert.match(app, /physics\/frameOrbitInsertion\.js\?v=ue0105c/);
  assert.match(app, /surface\/surfaceGenerator\.js\?v=ue0105c/);
  assert.match(app, /surface\/surfaceProfiles\.js\?v=ue0105c/);
  assert.match(app, /render\/threeRenderer\.js\?v=ue0105b/);
  assert.match(app, /core\/astronomicalObserver\.js\?v=ue0105b/);
  assert.match(app, /surface\/surfaceSkyObserver\.js\?v=ue0105a/);
  assert.match(surfaceGenerator, /surfaceProfiles\.js\?v=ue0105c/);
  assert.match(systemNavigation, /surfaceProfiles\.js\?v=ue0105c/);
  assert.match(frameOrbitInsertion, /systemNavigation\.js\?v=ue0105c/);
  assert.match(systemMap, /frameOrbitInsertion\.js\?v=ue0105c/);
  assert.match(systemMap, /systemNavigation\.js\?v=ue0105c/);
  const threeRenderer = read('src/render/threeRenderer.js');
  assert.match(threeRenderer, /surfaceWorld\.js\?v=ue0105b/);
  assert.match(generator, /generationProfiles\.js\?v=ue0104b1/);
  assert.match(generator, /solSystem\.js\?v=ue0104b1/);
});
