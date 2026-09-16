import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const fix = fs.readFileSync(new URL('../public/sermon-play-hover-fix.js', import.meta.url), 'utf8');
const wrapper = fs.readFileSync(new URL('../src/worker-chatkit.js', import.meta.url), 'utf8');

test('homepage sermon play hover keeps the circular button size stable', () => {
  assert.match(fix, /button\.sermon-play-toggle:hover\s*\{[^}]*transform:\s*none\s*!important/s);
  assert.doesNotMatch(fix, /button\.sermon-play-toggle:hover\s*\{[^}]*scale\(/s);
});

test('homepage sermon play hover animates only the inner icon', () => {
  assert.match(fix, /button\.sermon-play-toggle:hover span\s*\{[^}]*transform:\s*scale\(1\.08\)/s);
});

test('homepage injects the sermon play hover fix script', () => {
  assert.match(wrapper, /sermon-play-hover-fix\.js\?v=1/);
  assert.match(wrapper, /isHomePage/);
});
