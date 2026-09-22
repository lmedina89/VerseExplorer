import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');

test('Explorer primary shell exposes exploration controls instead of laboratory controls', () => {
  const start = html.indexOf('<nav class="bottom-bar explorer-bottom-bar"');
  const end = html.indexOf('</nav>', start);
  assert.ok(start >= 0 && end > start);
  const primary = html.slice(start, end);
  for (const id of ['targetButton','approachButton','frameQuick','warpQuick','menuToggle']) {
    assert.match(primary, new RegExp(`id="${id}"`));
  }
  for (const id of ['labToggle','scannerToggle']) {
    assert.doesNotMatch(primary, new RegExp(`id="${id}"`));
  }
});

test('Original advanced systems remain present but are moved behind Explorer menu', () => {
  assert.match(html, /id="morePanel"[^>]*explorer-menu/);
  assert.match(html, /ADVANCED \/ LAB CONTROLS/);
  for (const id of ['scannerToggle','transitToggle','mapToggle','cosmosToggle','surfaceLandButton','cockpitToggle','scienceToggle','overlayToggle','labToggle']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test('Explorer styling hides default technical telemetry without deleting telemetry nodes', () => {
  assert.match(html, /class="stat technical-stat"/);
  assert.match(html, /class="seed-chip"/);
  assert.match(css, /\.explorer-mode \.technical-stat,[\s\S]*?\.explorer-mode \.seed-chip\{display:none!important\}/);
});

test('Explorer MENU is presentation-only and opens the existing secondary-control drawer', () => {
  assert.match(app, /\$\('#menuToggle'\)\.addEventListener\('click', \(\) => this\.hud\.toggleMore\(\)\);/);
});
