import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cssSource = () => readFile(new URL('../styles.css', import.meta.url), 'utf8');
const appSource = () => readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');

test('Explorer widens LOOK hit geometry across MINIMAL, FLIGHT and FULL without enlarging the visible ring', async () => {
  const css = await cssSource();
  assert.match(css, /\.app-shell:not\(\.surface-active\) \.look-pad\{width:156px;--ue-look-ring-size:116px\}/);
  assert.match(css, /\.app-shell:not\(\.surface-active\) \.look-ring\{width:var\(--ue-look-ring-size\);height:var\(--ue-look-ring-size\)\}/);
  assert.match(css, /@media \(orientation:portrait\)[\s\S]*?\.app-shell:not\(\.surface-active\) \.look-pad\{width:132px;--ue-look-ring-size:84px\}/);
  assert.match(css, /\.explorer-hud-min:not\(\.surface-active\) \.look-pad\{width:126px;--ue-look-ring-size:72px\}/);
  assert.doesNotMatch(css, /\.explorer-hud-flight:not\(\.surface-active\) \.look-pad/);
  assert.doesNotMatch(css, /\.explorer-hud-full:not\(\.surface-active\) \.look-pad/);
});

test('LOOK steering remains pointer-delta based with unchanged sensitivity constants', async () => {
  const app = await appSource();
  assert.match(app, /const dx = event\.clientX - this\._lookLast\[0\]/);
  assert.match(app, /const dy = event\.clientY - this\._lookLast\[1\]/);
  assert.match(app, /this\.ship\.rotateLook\(-dx \* 0\.0045, dy \* 0\.0038\)/);
});
