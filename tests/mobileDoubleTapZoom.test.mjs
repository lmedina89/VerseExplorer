import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Explorer shell suppresses Safari double-tap page zoom without weakening flight touch zones', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(css, /html,body\{[^}]*touch-action:manipulation/);
  assert.match(css, /\.app-shell\{[^}]*touch-action:manipulation/);
  assert.match(css, /\.viewport\{[^}]*touch-action:none/);
  assert.match(css, /\.look-pad\{[^}]*touch-action:none/);
  assert.match(css, /\.app-shell button\{touch-action:none/);
  assert.match(html, /styles\.css\?v=ue0105e/);
});
