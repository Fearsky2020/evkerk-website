import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const loader = fs.readFileSync(new URL('../public/evkerk-chatkit.js', import.meta.url), 'utf8');
const wrapper = fs.readFileSync(new URL('../src/worker-chatkit.js', import.meta.url), 'utf8');
const wrangler = fs.readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');

test('public ChatKit uses the EU Zoho endpoint and route-specific agents', () => {
  assert.match(loader, /https:\/\/agents\.zoho\.eu\/resources\/addon-chat\/assets\/js\/agents-chat-sdk\.js/);
  assert.match(loader, /ORG_ID\s*=\s*'20119587307'/);
  assert.match(loader, /PUBLIC_ASSISTANT_ID\s*=\s*'3612000000002124'/);
  assert.match(loader, /BIBLE_FINDER_ID\s*=\s*'3612000000002240'/);
  assert.match(loader, /path === '\/bible'/);
});

test('ChatKit is excluded from admin and team areas', () => {
  assert.match(loader, /path\.startsWith\('\/admin'\)/);
  assert.match(loader, /path\.startsWith\('\/team'\)/);
  assert.match(wrapper, /!url\.pathname\.startsWith\('\/admin'\)/);
  assert.match(wrapper, /!url\.pathname\.startsWith\('\/team'\)/);
});

test('ChatKit suppresses initialization flash before revealing the host', () => {
  assert.match(loader, /visibility = 'hidden'/);
  assert.match(loader, /opacity = '0'/);
  assert.match(loader, /setTimeout/);
});

test('Wrangler entrypoint wraps public HTML routes with ChatKit injection', () => {
  assert.match(wrangler, /main = "src\/worker-chatkit\.js"/);
  assert.match(wrapper, /import enhancedWorker from '\.\/worker-enhanced\.js'/);
  assert.match(wrapper, /evkerk-chatkit\.js\?v=2/);
  for (const route of ['/activities', '/bible', '/privacy', '/sermon', '/sermons']) {
    assert.ok(wrangler.includes(`"${route}"`), `missing run_worker_first route ${route}`);
  }
});
