const CALLBACK_PATH = '/api/wechat/callback';

function text(value) {
  return String(value ?? '').trim();
}

function configuredAdmins(env) {
  return new Set(text(env.WECHAT_ADMIN_OPENIDS).split(',').map((value) => value.trim()).filter(Boolean));
}

function xmlValue(xml, tag) {
  const match = String(xml).match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'i'));
  return text(match?.[1] ?? match?.[2]);
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function xmlReply(to, from, content) {
  return new Response(
    `<xml><ToUserName><![CDATA[${to}]]></ToUserName><FromUserName><![CDATA[${from}]]></FromUserName><CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[${String(content).replaceAll(']]>', ']]]]><![CDATA[>')}]]></Content></xml>`,
    { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'no-store' } },
  );
}

async function sha1Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function validSignature(url, token) {
  const signature = text(url.searchParams.get('signature'));
  const timestamp = text(url.searchParams.get('timestamp'));
  const nonce = text(url.searchParams.get('nonce'));
  if (!signature || !timestamp || !nonce || !token) return false;
  const expected = await sha1Hex([token, timestamp, nonce].sort().join(''));
  return signature.toLowerCase() === expected;
}

function statusMessage(env) {
  return [
    '福音教会系统状态',
    '网站：正常',
    `数据库：${env.DB ? '已连接' : '未连接'}`,
    `音频存储：${env.MEDIA ? '已连接' : '未连接'}`,
    '微信入口：正常',
    '当前权限：最高管理员',
  ].join('\n');
}

function commandReply(content, env) {
  const command = text(content).replaceAll(/\s+/g, '');
  if (['查询状态', '系统状态', '状态'].includes(command)) return statusMessage(env);
  return '司南已连接福音教会系统。\n目前可用命令：查询状态\n发布通知、灵修、音频和讲道功能正在接入。';
}

export async function handleWechatApi(request, env, url) {
  if (url.pathname !== CALLBACK_PATH) return null;
  const token = text(env.WECHAT_TOKEN);
  if (!token) return new Response('wechat token is not configured', { status: 503 });
  if (!(await validSignature(url, token))) return new Response('invalid signature', { status: 403 });

  if (request.method === 'GET') {
    const echo = text(url.searchParams.get('echostr'));
    return new Response(echo, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  }
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const body = await request.text();
  const sender = xmlValue(body, 'FromUserName');
  const receiver = xmlValue(body, 'ToUserName');
  const messageType = xmlValue(body, 'MsgType').toLowerCase();
  if (!sender || !receiver) return new Response('success', { headers: { 'content-type': 'text/plain; charset=utf-8' } });

  if (!configuredAdmins(env).has(sender)) {
    return xmlReply(sender, receiver, '此微信尚未获得福音教会管理权限，请联系最高管理员授权。');
  }
  if (messageType === 'event' && xmlValue(body, 'Event').toLowerCase() === 'subscribe') {
    return xmlReply(sender, receiver, '司南已连接。你的身份是：最高管理员。\n发送“查询状态”即可测试。');
  }
  if (messageType !== 'text') {
    return xmlReply(sender, receiver, '已收到消息。目前请先发送文字“查询状态”进行测试。');
  }
  return xmlReply(sender, receiver, commandReply(xmlValue(body, 'Content'), env));
}

export const wechatInternals = { configuredAdmins, escapeXml, sha1Hex, validSignature, xmlValue };
