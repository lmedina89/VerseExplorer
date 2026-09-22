import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const htmlSource = () => readFile(new URL('../index.html', import.meta.url), 'utf8');
const cssSource = () => readFile(new URL('../styles.css', import.meta.url), 'utf8');
const mainSource = () => readFile(new URL('../src/main.js', import.meta.url), 'utf8');

test('Explorer HUD density control exists and defaults to minimal', async () => {
  const html = await htmlSource();
  const main = await mainSource();
  assert.match(html, /id="hudModeButton"/);
  assert.match(html, /id="explorerMenuButton"/);
  assert.match(html, /id="explorerScanMenuButton"/);
  assert.match(html, /id="explorerLabMenuButton"/);
  assert.match(main, /const EXPLORER_HUD_MODES = \['minimal', 'flight', 'full'\]/);
  assert.match(main, /let explorerHudMode = 'minimal'/);
  assert.match(main, /applyExplorerHudMode\('minimal'\)/);
});

test('minimal and flight modes hide only presentation launchers while keeping original action controls in DOM', async () => {
  const html = await htmlSource();
  const css = await cssSource();
  for (const id of ['labToggle','scannerToggle','targetButton','approachButton','frameQuick','warpQuick','thrustButton','reverseButton','brakeButton']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(css, /\.explorer-hud-min #labToggle,\.explorer-hud-min #scannerToggle/);
  assert.match(css, /\.explorer-hud-flight #labToggle,\.explorer-hud-flight #scannerToggle/);
  assert.match(css, /\.explorer-hud-full #explorerMenuButton\{display:none\}/);
});

test('cockpit density layer changes only cockpit child visibility and never simulation state', async () => {
  const main = await mainSource();
  assert.match(main, /function applyCockpitHudDensity\(\)/);
  assert.match(main, /cockpit\.screenEntries/);
  assert.match(main, /entry\.screen\.visible = visible/);
  assert.match(main, /entry\.bezel\.visible = visible/);
  assert.doesNotMatch(main, /ship\.position\s*=/);
  assert.doesNotMatch(main, /ship\.velocity\s*=/);
  assert.doesNotMatch(main, /timeScale\s*=/);
  assert.doesNotMatch(main, /generateSystem\(/);
});

test('menu launcher opens the existing FLIGHT SYSTEM drawer instead of creating a second control system', async () => {
  const main = await mainSource();
  assert.match(main, /#explorerMenuButton'\)\?\.addEventListener\('click', \(\) => app\.hud\?\.toggleMore\(\)\)/);
});


test('hidden SCAN and LAB launchers remain reachable through the existing drawers', async () => {
  const main = await mainSource();
  assert.match(main, /#explorerScanMenuButton'[\s\S]*#scannerToggle'[\s\S]*\.click\(\)/);
  assert.match(main, /#explorerLabMenuButton'[\s\S]*#labToggle'[\s\S]*\.click\(\)/);
});
