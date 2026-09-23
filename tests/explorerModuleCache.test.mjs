import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Explorer 0.1.0.6A.3 cache-busts changed spawn/visual modules while retaining validated unchanged 5F physics dependencies', () => {
  const index = read('index.html');
  const main = read('src/main.js');
  const app = read('src/app/app.js');
  const threeRenderer = read('src/render/threeRenderer.js');

  assert.match(index, /styles\.css\?v=ue0106a3/);
  assert.match(index, /src\/main\.js\?v=ue0106a3/);
  assert.match(main, /app\/app\.js\?v=ue0106a3/);
  assert.match(app, /render\/threeRenderer\.js\?v=ue0106a3/);
  assert.match(app, /experiments\/orbitSandbox\.js\?v=ue0106a3/);
  assert.match(threeRenderer, /surfaceWorld\.js\?v=ue0106a3/);

  // Physics/data/surface-state dependencies that are not functionally changed stay on the exact
  // validated 5F URLs. Renderer visual modules changed in 6A.2 receive the new cache edge.
  assert.match(app, /physics\/frameOrbitInsertion\.js\?v=ue0105f/);
  assert.match(app, /data\/systemGenerator\.js\?v=ue0105f/);
  assert.match(app, /data\/solSystem\.js\?v=ue0105f/);
  assert.match(app, /core\/astronomicalObserver\.js\?v=ue0105f/);
  assert.match(app, /surface\/surfaceGenerator\.js\?v=ue0105f/);
  assert.match(app, /surface\/surfaceProfiles\.js\?v=ue0105f/);
  assert.match(app, /surface\/surfaceSkyObserver\.js\?v=ue0105f/);
  assert.match(threeRenderer, /celestialFactory\.js\?v=ue0106a2/);
});
