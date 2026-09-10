import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker-enhanced.js';

const TOKEN = 'test-token';
const ADMIN = 'admin-openid';
const APP = 'test-account';

async function signature(timestamp = '123', nonce = '456') {
  const data = new TextEncoder().encode([TOKEN, timestamp, nonce].sort().join(''));
  const digest = await crypto.subtle.digest('SHA-1', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function callbackUrl(extra = '') {
  const timestamp = '123';
  const nonce = '456';
  return `https://evkerk.nl/api/wechat/callback?timestamp=${timestamp}&nonce=${nonce}&signature=${await signature(timestamp, nonce)}${extra}`;
}

function env(overrides = {}) {
  return {
    WECHAT_TOKEN: TOKEN,
    WECHAT_ADMIN_OPENIDS: ADMIN,
    DB: {},
    MEDIA: {},
    ASSETS: { fetch: () => new Response('asset') },
    ...overrides,
  };
}

function message({ sender = ADMIN, type = 'text', content = '查询状态', event = '' } = {}) {
  return `<xml><ToUserName><![CDATA[${APP}]]></ToUserName><FromUserName><![CDATA[${sender}]]></FromUserName><MsgType><![CDATA[${type}]]></MsgType><Content><![CDATA[${content}]]></Content><Event><![CDATA[${event}]]></Event></xml>`;
}

test('WeChat GET callback verifies signature and echoes challenge', async () => {
  const response = await worker.fetch(new Request(await callbackUrl('&echostr=connected')), env());
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'connected');
});

test('WeChat callback rejects an invalid signature', async () => {
  const response = await worker.fetch(new Request('https://evkerk.nl/api/wechat/callback?timestamp=123&nonce=456&signature=bad'), env());
  assert.equal(response.status, 403);
});

test('authorized administrator can query system status', async () => {
  const response = await worker.fetch(new Request(await callbackUrl(), { method: 'POST', body: message() }), env());
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /福音教会系统状态/);
  assert.match(body, /当前权限：最高管理员/);
});

test('unknown WeChat user does not receive administrative access', async () => {
  const response = await worker.fetch(new Request(await callbackUrl(), { method: 'POST', body: message({ sender: 'unknown' }) }), env());
  assert.equal(response.status, 200);
  assert.match(await response.text(), /尚未获得福音教会管理权限/);
});

test('subscribe event confirms administrator identity', async () => {
  const response = await worker.fetch(new Request(await callbackUrl(), { method: 'POST', body: message({ type: 'event', event: 'subscribe' }) }), env());
  assert.equal(response.status, 200);
  assert.match(await response.text(), /最高管理员/);
});
