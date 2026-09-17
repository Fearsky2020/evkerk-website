import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const entry = fs.readFileSync(new URL('../public/evkerk-bible-ai-entry.js', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../src/worker-chatkit.js', import.meta.url), 'utf8');

test('Bible toolbar gets a dedicated smart-search entry with a Bible icon', () => {
  assert.match(entry, /圣经智能搜索/);
  assert.match(entry, /BIBLE_ICON/);
  assert.match(entry, /bible-book/);
  assert.match(entry, /searchButton\.insertAdjacentElement\('afterend', entry\)/);
});

test('Bible page hides the floating launcher and gives the assistant a Bible brandmark', () => {
  assert.match(entry, /launcher\.innerHTML = BIBLE_ICON/);
  assert.match(entry, /brandmark\.innerHTML = BIBLE_ICON/);
  assert.match(entry, /launcher\.hidden = true/);
  assert.match(entry, /entry\.onclick = \(\) => launcher\.click\(\)/);
});

test('worker injects the v2 Bible smart-search entry before the assistant host', () => {
  const entryPos = worker.indexOf('BIBLE_AI_ENTRY_TAG');
  const assistantPos = worker.indexOf('ASSISTANT_TAG');
  assert.ok(entryPos >= 0);
  assert.ok(assistantPos >= 0);
  assert.match(worker, /evkerk-bible-ai-entry\.js\?v=2/);
  assert.match(worker, /handleAssistantChatV3/);
  assert.match(worker, /if \(isBiblePage\(url\).*additions\.push\(BIBLE_AI_ENTRY_TAG\)/s);
});
