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

function message({ sender = ADMIN, type = 'text', content = '查询状态', event = '', id = crypto.randomUUID() } = {}) {
  return `<xml><ToUserName><![CDATA[${APP}]]></ToUserName><FromUserName><![CDATA[${sender}]]></FromUserName><MsgType><![CDATA[${type}]]></MsgType><Content><![CDATA[${content}]]></Content><Event><![CDATA[${event}]]></Event><MsgId>${id}</MsgId></xml>`;
}

function fakeDb() {
  const state = { users: new Map(), pending: [], announcements: [], devotionals: [], audit: [] };
  const DB = { state, prepare(sql) {
    let params = [];
    return {
      bind(...values) { params = values; return this; },
      async first() {
        if (/SELECT role FROM wechat_users/.test(sql)) {
          const user = state.users.get(params[0]);
          return user?.status === 'active' ? { role: user.role } : null;
        }
        if (/source_message_id=\?/.test(sql)) return state.pending.find((row) => row.source_message_id === params[0] && row.status === 'pending') || null;
        if (/actor_openid=\? AND action_type='authorize_pastor'/.test(sql)) return state.pending.find((row) => row.actor_openid === params[0] && row.action_type === 'authorize_pastor' && row.status === 'pending') || null;
        if (/confirmation_code=\? AND actor_openid=\?/.test(sql)) return state.pending.find((row) => row.confirmation_code === params[0] && row.actor_openid === params[1]) || null;
        if (/confirmation_code=\? AND action_type='authorize_pastor'/.test(sql)) return state.pending.find((row) => row.confirmation_code === params[0] && row.action_type === 'authorize_pastor') || null;
        return null;
      },
      async all() {
        if (/FROM devotionals/.test(sql)) return { results: [...state.devotionals].reverse() };
        return { results: [] };
      },
      async run() {
        if (/^CREATE /i.test(sql.trim())) return { meta: { changes: 0 } };
        if (/INSERT INTO wechat_pending_actions/.test(sql)) {
          const authorization = /'authorize_pastor'/.test(sql);
          const row = authorization
            ? { id: params[0], confirmation_code: params[1], actor_openid: params[2], action_type: 'authorize_pastor', payload_json: '{}', source_message_id: params[3], status: 'pending', expires_at: params[4] }
            : { id: params[0], confirmation_code: params[1], actor_openid: params[2], action_type: params[3], payload_json: params[4], source_message_id: params[5], status: 'pending', expires_at: params[6] };
          state.pending.push(row);
          return { meta: { changes: 1 } };
        }
        if (/UPDATE wechat_pending_actions SET status='(expired|executing|complete|failed|cancelled)'/.test(sql)) {
          const status = sql.match(/status='([^']+)'/)[1];
          let row;
          if (/confirmation_code=\?/.test(sql)) row = state.pending.find((item) => item.confirmation_code === params[0] && item.actor_openid === params[1] && item.status === 'pending');
          else row = state.pending.find((item) => item.id === params[0] && (!/status='pending'/.test(sql.split('WHERE')[1] || '') || item.status === 'pending'));
          if (!row) return { meta: { changes: 0 } };
          row.status = status;
          return { meta: { changes: 1 } };
        }
        if (/INSERT INTO announcements/.test(sql)) { state.announcements.push({ id: params[0], title_zh: params[1], body_zh: params[2], status: 'published' }); return { meta: { changes: 1 } }; }
        if (/INSERT INTO devotionals/.test(sql)) { state.devotionals.push({ id: params[0], devotional_date: params[1], title_zh: params[2], scripture: params[3], body_zh: params[4], audio_url: params[5], status: 'published' }); return { meta: { changes: 1 } }; }
        if (/INSERT INTO wechat_users/.test(sql)) { state.users.set(params[0], { role: 'pastoral_admin', status: 'active', approved_by: params[1] }); return { meta: { changes: 1 } }; }
        if (/INSERT INTO wechat_audit_log/.test(sql)) { state.audit.push(params); return { meta: { changes: 1 } }; }
        return { meta: { changes: 0 } };
      },
    };
  }};
  return DB;
}

async function postWechat(testEnv, options) {
  return worker.fetch(new Request(await callbackUrl(), { method: 'POST', body: message(options) }), testEnv);
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

test('announcement requires confirmation and cannot publish twice', async () => {
  const DB = fakeDb();
  const testEnv = env({ DB });
  const draft = await postWechat(testEnv, { content: '发布通知\n标题：周三祷告会\n内容：晚上八点开始', id: 'msg-announcement' });
  const draftText = await draft.text();
  assert.match(draftText, /通知发布预览/);
  assert.equal(DB.state.announcements.length, 0);
  const confirmationCode = draftText.match(/确认 ([0-9A-F]{6})/)[1];
  assert.match(await (await postWechat(testEnv, { content: `确认 ${confirmationCode}` })).text(), /通知已发布成功/);
  assert.equal(DB.state.announcements.length, 1);
  assert.match(await (await postWechat(testEnv, { content: `确认 ${confirmationCode}` })).text(), /已经处理过/);
  assert.equal(DB.state.announcements.length, 1);
});

test('devotional publishes to the shared public API after confirmation', async () => {
  const DB = fakeDb();
  const testEnv = env({ DB });
  const draftText = await (await postWechat(testEnv, { content: '发布灵修\n标题：神爱世人\n经文：约翰福音 3:16\n内容：今天默想神的爱。', id: 'msg-devotional' })).text();
  const confirmationCode = draftText.match(/确认 ([0-9A-F]{6})/)[1];
  assert.match(await (await postWechat(testEnv, { content: `确认 ${confirmationCode}` })).text(), /灵修已发布成功/);
  const response = await worker.fetch(new Request('https://evkerk.nl/api/devotionals'), testEnv);
  const body = await response.json();
  assert.equal(body.devotionals[0].title_zh, '神爱世人');
  assert.equal(body.devotionals[0].scripture, '约翰福音 3:16');
});

test('owner can approve a pastoral team administrator request', async () => {
  const DB = fakeDb();
  const testEnv = env({ DB });
  const applicant = 'pastor-openid';
  const requestText = await (await postWechat(testEnv, { sender: applicant, content: '申请授权', id: 'msg-auth' })).text();
  const confirmationCode = requestText.match(/申请码：([0-9A-F]{6})/)[1];
  assert.match(await (await postWechat(testEnv, { content: `批准 ${confirmationCode}` })).text(), /管理员（牧者团队）/);
  const status = await (await postWechat(testEnv, { sender: applicant, content: '查询状态' })).text();
  assert.match(status, /当前权限：管理员（牧者团队）/);
});
