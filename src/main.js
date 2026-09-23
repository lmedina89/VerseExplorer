import { UniverseLabApp } from './app/app.js?v=ue0106a3';

function syncVisualViewportHeight() {
  const vv = window.visualViewport;
  const height = Math.max(240, Math.floor(vv?.height ?? window.innerHeight));
  document.documentElement.style.setProperty('--app-height', `${height}px`);
}

syncVisualViewportHeight();
window.visualViewport?.addEventListener('resize', syncVisualViewportHeight);
window.visualViewport?.addEventListener('scroll', syncVisualViewportHeight);
window.addEventListener('resize', syncVisualViewportHeight);
window.addEventListener('orientationchange', () => setTimeout(syncVisualViewportHeight, 60));

const root = document.querySelector('#app');
const app = new UniverseLabApp(root);

const EXPLORER_HUD_MODES = ['minimal', 'flight', 'full'];
let explorerHudMode = 'minimal';

function applyCockpitHudDensity() {
  const cockpit = app.renderer?.cockpitView;
  if (!cockpit?.screenEntries) return;
  const portrait = cockpit.viewportMode === 'portrait';
  for (const [id, entry] of cockpit.screenEntries) {
    let visible;
    if (explorerHudMode === 'full') visible = !portrait || id === 'flight';
    else if (explorerHudMode === 'flight') visible = portrait ? id === 'flight' : id !== 'diagnostics';
    else visible = id === 'flight';
    entry.screen.visible = visible;
    entry.bezel.visible = visible && !(portrait && id === 'flight');
  }
  for (const entry of cockpit.buttonEntries?.values?.() ?? []) entry.group.visible = explorerHudMode === 'full' && !portrait;
  for (const entry of cockpit.statusLights?.values?.() ?? []) entry.lamp.visible = explorerHudMode !== 'minimal' && !portrait;
}

function applyExplorerHudMode(mode = explorerHudMode) {
  explorerHudMode = EXPLORER_HUD_MODES.includes(mode) ? mode : 'minimal';
  root.classList.remove('explorer-hud-min', 'explorer-hud-flight', 'explorer-hud-full');
  root.classList.add(`explorer-hud-${explorerHudMode === 'minimal' ? 'min' : explorerHudMode}`);
  const button = root.querySelector('#hudModeButton');
  if (button) {
    button.textContent = explorerHudMode === 'minimal' ? 'HUD MIN' : explorerHudMode === 'flight' ? 'HUD FLIGHT' : 'HUD FULL';
    button.setAttribute('aria-pressed', explorerHudMode === 'minimal' ? 'true' : 'false');
    button.setAttribute('aria-label', `HUD density ${explorerHudMode}. Tap to cycle.`);
  }
  applyCockpitHudDensity();
}

function cycleExplorerHudMode() {
  const index = EXPLORER_HUD_MODES.indexOf(explorerHudMode);
  applyExplorerHudMode(EXPLORER_HUD_MODES[(index + 1) % EXPLORER_HUD_MODES.length]);
}

root.classList.add('explorer-hud-min');
root.querySelector('#hudModeButton')?.addEventListener('click', cycleExplorerHudMode);
root.querySelector('#explorerMenuButton')?.addEventListener('click', () => app.hud?.toggleMore());
root.querySelector('#explorerScanMenuButton')?.addEventListener('click', () => {
  app.hud?.toggleMore(false);
  root.querySelector('#scannerToggle')?.click();
});
root.querySelector('#explorerLabMenuButton')?.addEventListener('click', () => {
  app.hud?.toggleMore(false);
  root.querySelector('#labToggle')?.click();
});

const reapplyExplorerHud = () => requestAnimationFrame(() => applyExplorerHudMode());
window.addEventListener('resize', reapplyExplorerHud);
window.addEventListener('orientationchange', () => setTimeout(reapplyExplorerHud, 90));
window.visualViewport?.addEventListener('resize', reapplyExplorerHud);

app.init().then(() => {
  applyExplorerHudMode('minimal');
}).catch((error) => {
  console.error(error);
  const message = document.querySelector('#message');
  if (message) {
    message.hidden = false;
    message.textContent = `Startup failed: ${error.message}`;
  }
});
