import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const portal = await readFile(new URL('../public/team/portal.js', import.meta.url), 'utf8');
const admin = await readFile(new URL('../public/admin/index.html', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../public/admin/session-bridge.js', import.meta.url), 'utf8');

test('team portal restores its authenticated state after browser back navigation', () => {
  assert.match(
    portal,
    /window\.addEventListener\(['"]pageshow['"],\s*event\s*=>\s*\{\s*if\s*\(event\.persisted\)\s*restore\(\)/,
  );
});

test('team portal prepares the shared admin session before opening admin content', () => {
  assert.match(portal, /a\[href\^=["']\/admin["']\]/);
  assert.match(portal, /localStorage\.setItem\(adminTokenKey,\s*['"]session['"]\)/);
  assert.match(portal, /localStorage\.setItem\(adminAccountKey,\s*identity\)/);
});

test('admin has a direct website exit and does not add a synthetic history entry on boot', () => {
  assert.match(admin, /id=["']returnHome["'][^>]*href=["']\/["']/);
  assert.match(admin, /if\s*\(!location\.hash\)\s*history\.replaceState\(/);
  assert.doesNotMatch(admin, /history\.pushState\(/);
});

test('admin session bridge restores sessions without redirecting the page on success', () => {
  assert.match(bridge, /credentials:\s*['"]same-origin['"]/);
  assert.match(bridge, /localStorage\.setItem\(TOKEN_KEY,\s*['"]session['"]\)/);
  assert.doesNotMatch(bridge, /location\.reload\(\)/);
});
