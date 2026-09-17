import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const entry = fs.readFileSync(new URL('../public/evkerk-bible-ai-entry.js', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../src/worker-chatkit.js', import.meta.url), 'utf8');

test('Bible toolbar gets a dedicated smart-search entry', () => {
  assert.match(entry, /圣经智能搜索/);
  assert.match(entry, /searchButton\.insertAdjacentElement\('afterend', entry\)/);
  assert.match(entry, /evkerk-bible-ai-entry/);
});

test('Bible page hides the floating assistant launcher and reuses the same chat panel', () => {
  assert.match(entry, /launcher\.hidden = true/);
  assert.match(entry, /entry\.onclick = \(\) => launcher\.click\(\)/);
  assert.match(entry, /evk-ai-bible-mode/);
});

test('worker injects the Bible smart-search entry before the assistant host', () => {
  const entryPos = worker.indexOf('BIBLE_AI_ENTRY_TAG');
  const assistantPos = worker.indexOf('ASSISTANT_TAG');
  assert.ok(entryPos >= 0);
  assert.ok(assistantPos >= 0);
  assert.match(worker, /evkerk-bible-ai-entry\.js\?v=1/);
  assert.match(worker, /if \(isBiblePage\(url\).*additions\.push\(BIBLE_AI_ENTRY_TAG\)/s);
});
