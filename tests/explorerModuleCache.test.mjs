import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Explorer 0.1.0.5B cache-busts every changed runtime module edge needed by Safari/GitHub Pages', () => {
  const index = read('index.html');
  const main = read('src/main.js');
  const app = read('src/app/app.js');
  const generator = read('src/data/systemGenerator.js');
  assert.match(index, /src\/main\.js\?v=155-ue0105b/);
  assert.match(main, /app\/app\.js\?v=155-ue0105b/);
  assert.match(app, /data\/systemGenerator\.js\?v=ue0104b1/);
  assert.match(app, /data\/solSystem\.js\?v=ue0104b1/);
  assert.match(app, /ui\/systemMap\.js\?v=ue0105a/);
  assert.match(app, /render\/threeRenderer\.js\?v=ue0105b/);
  assert.match(app, /core\/astronomicalObserver\.js\?v=ue0105b/);
  assert.match(app, /surface\/surfaceSkyObserver\.js\?v=ue0105a/);
  const threeRenderer = read('src/render/threeRenderer.js');
  assert.match(threeRenderer, /surfaceWorld\.js\?v=ue0105b/);
  assert.match(generator, /generationProfiles\.js\?v=ue0104b1/);
  assert.match(generator, /solSystem\.js\?v=ue0104b1/);
});
