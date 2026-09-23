import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Explorer 0.1.0.5E cache-busts the Earth landing/atmosphere visual chain for Safari/GitHub Pages', () => {
  const index = read('index.html');
  const main = read('src/main.js');
  const app = read('src/app/app.js');
  const surfaceGenerator = read('src/surface/surfaceGenerator.js');
  const systemNavigation = read('src/navigation/systemNavigation.js');
  const frameOrbitInsertion = read('src/physics/frameOrbitInsertion.js');
  const systemMap = read('src/ui/systemMap.js');
  const threeRenderer = read('src/render/threeRenderer.js');
  const surfaceWorld = read('src/render/surfaceWorld.js');

  assert.match(index, /styles\.css\?v=ue0105e/);
  assert.match(index, /src\/main\.js\?v=ue0105e/);
  assert.match(main, /app\/app\.js\?v=ue0105e/);
  assert.match(app, /render\/threeRenderer\.js\?v=ue0105e/);
  assert.match(app, /surface\/surfaceGenerator\.js\?v=ue0105e/);
  assert.match(app, /surface\/surfaceProfiles\.js\?v=ue0105e/);
  assert.match(app, /physics\/frameOrbitInsertion\.js\?v=ue0105e/);
  assert.match(app, /ui\/systemMap\.js\?v=ue0105e/);
  assert.match(threeRenderer, /celestialFactory\.js\?v=ue0105e/);
  assert.match(threeRenderer, /surfaceWorld\.js\?v=ue0105e/);
  assert.match(surfaceWorld, /celestialFactory\.js\?v=ue0105e/);
  assert.match(surfaceGenerator, /surfaceProfiles\.js\?v=ue0105e/);
  assert.match(systemNavigation, /surfaceProfiles\.js\?v=ue0105e/);
  assert.match(frameOrbitInsertion, /systemNavigation\.js\?v=ue0105e/);
  assert.match(systemMap, /frameOrbitInsertion\.js\?v=ue0105e/);
  assert.match(systemMap, /systemNavigation\.js\?v=ue0105e/);

  // 5E stamps the complete app import surface with one release token so Safari cannot mix
  // stale cached dependencies with the Earth landing/visual chain.
  assert.match(app, /data\/systemGenerator\.js\?v=ue0105e/);
  assert.match(app, /data\/solSystem\.js\?v=ue0105e/);
  assert.match(app, /core\/astronomicalObserver\.js\?v=ue0105e/);
  assert.match(app, /surface\/surfaceSkyObserver\.js\?v=ue0105e/);
});
