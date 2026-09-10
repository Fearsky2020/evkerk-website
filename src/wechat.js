const CALLBACK_PATH = '/api/wechat/callback';
const ROLE_OWNER = 'owner';
const ROLE_PASTORAL_ADMIN = 'pastoral_admin';
const PENDING_MINUTES = 15;

function text(value) { return String(value ?? '').trim(); }

function configuredAdmins(env) {
  return new Set(text(env.WECHAT_ADMIN_OPENIDS).split(',').map((value) => value.trim()).filter(Boolean));
}

function xmlValue(xml, tag) {
  const match = String(xml).match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'i'));
  return text(match?.[1] ?? match?.[2]);
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function xmlReply(to, from, content) {
  return new Response(
    `<xml><ToUserName><![CDATA[${to}]]></ToUserName><FromUserName><![CDATA[${from}]]></FromUserName><CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[${String(content).replaceAll(']]>', ']]]]><![CDATA[>')}]]></Content></xml>`,
    { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'no-store' } },
  );
}

async function sha1Hex(value) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function validSignature(url, token) {
  const signature = text(url.searchParams.get('signature'));
  const timestamp = text(url.searchParams.get('timestamp'));
  const nonce = text(url.searchParams.get('nonce'));
  if (!signature || !timestamp || !nonce || !token) return false;
  return signature.toLowerCase() === await sha1Hex([token, timestamp, nonce].sort().join(''));
}

async function ensureSchema(env) {
  if (!env.DB?.prepare) return;
  const statements = [
    `CREATE TABLE IF NOT EXISTS wechat_users (openid TEXT PRIMARY KEY, role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', approved_by TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS wechat_pending_actions (id TEXT PRIMARY KEY, confirmation_code TEXT NOT NULL UNIQUE, actor_openid TEXT NOT NULL, action_type TEXT NOT NULL, payload_json TEXT NOT NULL, source_message_id TEXT, status TEXT NOT NULL DEFAULT 'pending', expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), confirmed_at TEXT)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_pending_message ON wechat_pending_actions(source_message_id) WHERE source_message_id IS NOT NULL`,
    `CREATE TABLE IF NOT EXISTS wechat_audit_log (id TEXT PRIMARY KEY, actor_openid TEXT NOT NULL, actor_role TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, payload_json TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS devotionals (id TEXT PRIMARY KEY, devotional_date TEXT NOT NULL, title_zh TEXT NOT NULL, scripture TEXT, body_zh TEXT NOT NULL, audio_url TEXT, status TEXT NOT NULL DEFAULT 'draft', author_openid TEXT, published_at TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE INDEX IF NOT EXISTS idx_devotionals_date ON devotionals(status, devotional_date, published_at)`,
  ];
  for (const sql of statements) await env.DB.prepare(sql).run();
}

async function actorRole(env, openid) {
  if (configuredAdmins(env).has(openid)) return ROLE_OWNER;
  if (!env.DB?.prepare) return null;
  const row = await env.DB.prepare("SELECT role FROM wechat_users WHERE openid=? AND status='active'").bind(openid).first();
  return row?.role === ROLE_PASTORAL_ADMIN ? ROLE_PASTORAL_ADMIN : null;
}

function roleLabel(role) {
  return role === ROLE_OWNER ? '最高管理员' : role === ROLE_PASTORAL_ADMIN ? '管理员（牧者团队）' : '未授权';
}

function statusMessage(env, role) {
  return ['福音教会系统状态', '网站：正常', `数据库：${env.DB ? '已连接' : '未连接'}`, `音频存储：${env.MEDIA ? '已连接' : '未连接'}`, '微信入口：正常', `当前权限：${roleLabel(role)}`].join('\n');
}

function code() {
  return [...crypto.getRandomValues(new Uint8Array(3))].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function parseFields(input) {
  const source = String(input || '').replaceAll('\r\n', '\n');
  const result = {};
  const matches = [...source.matchAll(/(?:^|\n)\s*(标题|经文|内容|音频)[：:]\s*/g)];
  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index + matches[index][0].length;
    result[matches[index][1]] = source.slice(start, matches[index + 1]?.index ?? source.length).trim();
  }
  return result;
}

function preview(actionType, payload, confirmationCode) {
  const lines = [actionType === 'announcement.publish' ? '通知发布预览' : '灵修发布预览', `标题：${payload.title_zh}`];
  if (payload.scripture) lines.push(`经文：${payload.scripture}`);
  lines.push(`内容：${payload.body_zh}`);
  if (payload.audio_url) lines.push(`音频：${payload.audio_url}`);
  lines.push('', `确认发布请发送：确认 ${confirmationCode}`, `取消请发送：取消 ${confirmationCode}`, `${PENDING_MINUTES} 分钟内有效。`);
  return lines.join('\n');
}

async function createPending(env, actor, actionType, payload, sourceMessageId = '') {
  const existing = sourceMessageId ? await env.DB.prepare("SELECT confirmation_code, action_type, payload_json FROM wechat_pending_actions WHERE source_message_id=? AND status='pending'").bind(sourceMessageId).first() : null;
  if (existing) return preview(existing.action_type, JSON.parse(existing.payload_json), existing.confirmation_code);
  const confirmationCode = code();
  await env.DB.prepare(`INSERT INTO wechat_pending_actions (id, confirmation_code, actor_openid, action_type, payload_json, source_message_id, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`)
    .bind(`WX-${crypto.randomUUID()}`, confirmationCode, actor, actionType, JSON.stringify(payload), sourceMessageId || null, new Date(Date.now() + PENDING_MINUTES * 60000).toISOString()).run();
  return preview(actionType, payload, confirmationCode);
}

async function audit(env, actor, role, action, entityType, entityId, payload, status = 'complete') {
  await env.DB.prepare(`INSERT INTO wechat_audit_log (id, actor_openid, actor_role, action, entity_type, entity_id, payload_json, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(`WA-${crypto.randomUUID()}`, actor, role, action, entityType || null, entityId || null, JSON.stringify(payload || {}), status).run();
}

async function publishAnnouncement(env, payload) {
  const id = `wechat-${crypto.randomUUID()}`;
  await env.DB.prepare(`INSERT INTO announcements (id, title_zh, title_nl, body_zh, body_nl, starts_at, ends_at, priority, status, published_at, updated_at) VALUES (?, ?, '', ?, '', NULL, NULL, 0, 'published', datetime('now'), datetime('now'))`).bind(id, payload.title_zh, payload.body_zh).run();
  return { entityType: 'announcement', entityId: id };
}

async function publishDevotional(env, actor, payload) {
  const id = `devotional-${crypto.randomUUID()}`;
  await env.DB.prepare(`INSERT INTO devotionals (id, devotional_date, title_zh, scripture, body_zh, audio_url, status, author_openid, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'published', ?, datetime('now'), datetime('now'))`)
    .bind(id, new Date().toISOString().slice(0, 10), payload.title_zh, payload.scripture || '', payload.body_zh, payload.audio_url || '', actor).run();
  return { entityType: 'devotional', entityId: id };
}

async function confirmPending(env, actor, role, confirmationCode) {
  const pending = await env.DB.prepare('SELECT * FROM wechat_pending_actions WHERE confirmation_code=? AND actor_openid=?').bind(confirmationCode, actor).first();
  if (!pending) return '没有找到这个待确认操作，请检查确认码。';
  if (pending.status !== 'pending') return '这个操作已经处理过，不能重复执行。';
  if (Date.parse(pending.expires_at) <= Date.now()) {
    await env.DB.prepare("UPDATE wechat_pending_actions SET status='expired' WHERE id=? AND status='pending'").bind(pending.id).run();
    return '确认码已经过期，请重新提交发布内容。';
  }
  const claimed = await env.DB.prepare("UPDATE wechat_pending_actions SET status='executing' WHERE id=? AND status='pending'").bind(pending.id).run();
  if (!Number(claimed.meta?.changes || 0)) return '这个操作已经处理过，不能重复执行。';
  const payload = JSON.parse(pending.payload_json || '{}');
  try {
    const result = pending.action_type === 'announcement.publish' ? await publishAnnouncement(env, payload) : await publishDevotional(env, actor, payload);
    await env.DB.prepare("UPDATE wechat_pending_actions SET status='complete', confirmed_at=datetime('now') WHERE id=?").bind(pending.id).run();
    await audit(env, actor, role, pending.action_type, result.entityType, result.entityId, payload);
    return `${result.entityType === 'announcement' ? '通知' : '灵修'}已发布成功。\n网站和教会 App 将读取同一份最新内容。`;
  } catch (error) {
    await env.DB.prepare("UPDATE wechat_pending_actions SET status='failed' WHERE id=?").bind(pending.id).run();
    await audit(env, actor, role, pending.action_type, null, null, { ...payload, error: text(error?.message) }, 'failed');
    return '发布失败，内容没有上线。请稍后重试或联系最高管理员。';
  }
}

async function cancelPending(env, actor, confirmationCode) {
  const result = await env.DB.prepare("UPDATE wechat_pending_actions SET status='cancelled' WHERE confirmation_code=? AND actor_openid=? AND status='pending'").bind(confirmationCode, actor).run();
  return Number(result.meta?.changes || 0) ? '已取消，这条内容没有发布。' : '没有找到可取消的待确认操作。';
}

async function requestAuthorization(env, actor, sourceMessageId) {
  const existing = await env.DB.prepare("SELECT confirmation_code FROM wechat_pending_actions WHERE actor_openid=? AND action_type='authorize_pastor' AND status='pending'").bind(actor).first();
  if (existing) return `授权申请已提交。\n申请码：${existing.confirmation_code}\n请把申请码发给最高管理员。`;
  const confirmationCode = code();
  await env.DB.prepare(`INSERT INTO wechat_pending_actions (id, confirmation_code, actor_openid, action_type, payload_json, source_message_id, status, expires_at) VALUES (?, ?, ?, 'authorize_pastor', '{}', ?, 'pending', ?)`)
    .bind(`WX-${crypto.randomUUID()}`, confirmationCode, actor, sourceMessageId || null, new Date(Date.now() + 24 * 60 * 60000).toISOString()).run();
  return `授权申请已提交。\n申请码：${confirmationCode}\n请把申请码发给最高管理员；申请码 24 小时有效。`;
}

async function approvePastor(env, owner, confirmationCode) {
  const pending = await env.DB.prepare("SELECT * FROM wechat_pending_actions WHERE confirmation_code=? AND action_type='authorize_pastor'").bind(confirmationCode).first();
  if (!pending || pending.status !== 'pending') return '没有找到有效的牧者授权申请。';
  if (Date.parse(pending.expires_at) <= Date.now()) return '这份授权申请已经过期，请对方重新发送“申请授权”。';
  await env.DB.prepare(`INSERT INTO wechat_users (openid, role, status, approved_by, updated_at) VALUES (?, 'pastoral_admin', 'active', ?, datetime('now')) ON CONFLICT(openid) DO UPDATE SET role='pastoral_admin', status='active', approved_by=excluded.approved_by, updated_at=datetime('now')`).bind(pending.actor_openid, owner).run();
  await env.DB.prepare("UPDATE wechat_pending_actions SET status='complete', confirmed_at=datetime('now') WHERE id=? AND status='pending'").bind(pending.id).run();
  await audit(env, owner, ROLE_OWNER, 'pastor.authorize', 'wechat_user', pending.actor_openid, { role: ROLE_PASTORAL_ADMIN });
  return '授权成功。对方现在是：管理员（牧者团队）。';
}

function helpMessage(role) {
  const lines = ['司南微信命令', '1. 查询状态', '2. 发布通知（另起行填写“标题：”“内容：”）', '3. 发布灵修（填写“标题：”“经文：”“内容：”，音频可暂填网址）', '4. 确认 六位码 / 取消 六位码'];
  if (role === ROLE_OWNER) lines.push('5. 批准 六位码（授权牧者团队）');
  return lines.join('\n');
}

async function commandReply(content, env, actor, role, sourceMessageId) {
  const raw = text(content);
  const compact = raw.replaceAll(/\s+/g, '');
  if (['查询状态', '系统状态', '状态'].includes(compact)) return statusMessage(env, role);
  if (['帮助', '命令', '菜单'].includes(compact)) return helpMessage(role);
  const confirm = raw.match(/^确认\s+([0-9A-F]{6})$/i);
  if (confirm) return confirmPending(env, actor, role, confirm[1].toUpperCase());
  const cancel = raw.match(/^取消\s+([0-9A-F]{6})$/i);
  if (cancel) return cancelPending(env, actor, cancel[1].toUpperCase());
  const approve = raw.match(/^批准\s+([0-9A-F]{6})$/i);
  if (approve) return role === ROLE_OWNER ? approvePastor(env, actor, approve[1].toUpperCase()) : '只有最高管理员可以批准牧者授权。';
  if (/^发布通知(?:\s|$)/.test(raw)) {
    const fields = parseFields(raw);
    if (!fields.标题 || !fields.内容) return '格式不完整。请发送：\n发布通知\n标题：聚会安排\n内容：这里填写通知正文';
    return createPending(env, actor, 'announcement.publish', { title_zh: fields.标题.slice(0, 300), body_zh: fields.内容.slice(0, 12000) }, sourceMessageId);
  }
  if (/^发布灵修(?:\s|$)/.test(raw)) {
    const fields = parseFields(raw);
    if (!fields.标题 || !fields.内容) return '格式不完整。请发送：\n发布灵修\n标题：今日灵修\n经文：约翰福音 3:16\n内容：这里填写灵修正文';
    return createPending(env, actor, 'devotional.publish', { title_zh: fields.标题.slice(0, 300), scripture: text(fields.经文).slice(0, 500), body_zh: fields.内容.slice(0, 20000), audio_url: text(fields.音频).slice(0, 1000) }, sourceMessageId);
  }
  return helpMessage(role);
}

export async function handleWechatApi(request, env, url) {
  if (url.pathname !== CALLBACK_PATH) return null;
  const token = text(env.WECHAT_TOKEN);
  if (!token) return new Response('wechat token is not configured', { status: 503 });
  if (!(await validSignature(url, token))) return new Response('invalid signature', { status: 403 });
  if (request.method === 'GET') return new Response(text(url.searchParams.get('echostr')), { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const body = await request.text();
  const sender = xmlValue(body, 'FromUserName');
  const receiver = xmlValue(body, 'ToUserName');
  const messageType = xmlValue(body, 'MsgType').toLowerCase();
  const incomingText = xmlValue(body, 'Content');
  if (!sender || !receiver) return new Response('success', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  await ensureSchema(env);
  const role = await actorRole(env, sender);
  if (!role) {
    if (messageType === 'text' && incomingText.replaceAll(/\s+/g, '') === '申请授权' && env.DB?.prepare) return xmlReply(sender, receiver, await requestAuthorization(env, sender, xmlValue(body, 'MsgId')));
    return xmlReply(sender, receiver, '此微信尚未获得福音教会管理权限。\n如属于牧者团队，请发送“申请授权”，再把申请码交给最高管理员。');
  }
  if (messageType === 'event' && xmlValue(body, 'Event').toLowerCase() === 'subscribe') return xmlReply(sender, receiver, `司南已连接。你的身份是：${roleLabel(role)}。\n发送“帮助”查看命令。`);
  if (messageType !== 'text') return xmlReply(sender, receiver, '已收到消息。目前文字发布已经开放；音频文件接收将在下一阶段开放。发送“帮助”查看命令。');
  if (!env.DB?.prepare && !['查询状态', '系统状态', '状态'].includes(incomingText.replaceAll(/\s+/g, ''))) return xmlReply(sender, receiver, '数据库暂不可用，不能执行发布操作。');
  return xmlReply(sender, receiver, await commandReply(incomingText, env, sender, role, xmlValue(body, 'MsgId')));
}

export const wechatInternals = { actorRole, configuredAdmins, escapeXml, parseFields, roleLabel, sha1Hex, validSignature, xmlValue };
