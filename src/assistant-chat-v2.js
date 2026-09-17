import { handleAssistantChat } from './assistant-chat.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

function userLanguage(message) {
  const text = String(message || '');
  if (/[㐀-鿿]/.test(text)) return 'zh';
  if (/\b(waar|wanneer|dienst|zondag|preek|adres|tijd|kerk|activiteit|mededeling|bijbel)\b/i.test(text)) return 'nl';
  return 'en';
}

function isCapabilityQuestion(message) {
  return /^(你能(帮|给)我什么|你会什么|你可以做什么|what can you do|wat kun je)/i.test(String(message || '').trim());
}

function capabilityAnswer(message) {
  const lang = userLanguage(message);
  if (lang === 'zh') {
    return '我可以帮您查询：\n• 主日聚会时间、地点和地址\n• 最新讲道、讲员、经文和收听链接\n• 近期活动和公开通知\n• 圣经经文、人物、故事出处和简短解释\n\n如果涉及私密牧养、婚姻、家庭或个人问题，请不要在这里提交敏感细节，建议直接联系教会牧者或小组长。';
  }
  if (lang === 'nl') {
    return 'Ik kan helpen met:\n• tijden en adressen van zondagse samenkomsten\n• recente preken, sprekers, Schriftgedeelten en luisterlinks\n• komende activiteiten en openbare mededelingen\n• Bijbelteksten, personen, verhalen en korte uitleg\n\nVoor persoonlijke pastorale zaken: deel hier geen gevoelige details en neem rechtstreeks contact op met een pastor of uw kringleider.';
  }
  return 'I can help with:\n• Sunday service times and addresses\n• recent sermons, speakers, Scripture references and listening links\n• upcoming activities and public announcements\n• Bible passages, people, stories and brief explanations\n\nFor private pastoral matters, please do not share sensitive details here; contact a church pastor or your small-group leader directly.';
}

function isWildernessWanderingQuestion(message) {
  const q = String(message || '').replace(/\s+/g, '');
  return /(以色列人.*旷野.*(流浪|漂流|四十年)|为什么.*旷野.*四十年|旷野.*四十年.*为什么)/.test(q);
}

function wildernessAnswer() {
  return '以色列人在旷野漂流四十年，主要原因不是缺少食物，而是他们到了迦南边境以后，听见探子的报告就惧怕、不信神，也不肯进入神所应许的地。神因此宣告，那一代悖逆的人要倒毙在旷野；按窥探迦南四十日，一日顶一年，他们要在旷野四十年。\n\n关键经文在民数记 14:26–35，尤其是 14:33–34。旷野期间，神也借着吗哪等供应训练他们学习信靠和顺服，但这不是四十年漂流的根本原因。\n\n查看经文：https://evkerk.nl/bible?book=3&chapter=14&verse=33';
}

function looksLikeBibleQuestion(message) {
  const q = String(message || '').toLowerCase();
  return /圣经|经文|以色列人|旷野|迦南|摩西|亚伯拉罕|以撒|雅各|约瑟|大卫|所罗门|以利亚|以利沙|耶稣|彼得|保罗|出埃及|十诫|吗哪|鹌鹑|约旦河|红海|方舟|巴别塔|五饼二鱼|浪子|好撒玛利亚人|创世记|出埃及记|利未记|民数记|申命记|约书亚记|士师记|路得记|撒母耳|列王纪|诗篇|箴言|以赛亚|耶利米|以西结|但以理|马太|马可|路加|约翰|使徒行传|罗马书|哥林多|加拉太|以弗所|腓立比|启示录|bible|scripture|bijbel/.test(q);
}

function sanitizePlainText(text) {
  return String(text || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1：$2')
    .replace(/建议您直接通过教会的官方渠道联系教会或小组长/g, '建议您直接联系教会牧者或小组长')
    .replace(/建议直接联系教会同工/g, '建议直接联系教会牧者或小组长');
}

async function rewriteJsonResponse(response) {
  const contentType = response?.headers?.get('content-type') || '';
  if (!response || !contentType.includes('application/json')) return response;
  const data = await response.json().catch(() => null);
  if (!data) return response;
  if (typeof data.answer === 'string') data.answer = sanitizePlainText(data.answer);
  return json(data, response.status);
}

export async function handleAssistantChatV2(request, env, url = new URL(request.url)) {
  if (url.pathname !== '/api/assistant/chat') return null;
  if (request.method !== 'POST') return handleAssistantChat(request, env, url);

  const body = await request.clone().json().catch(() => null);
  if (!body || typeof body.message !== 'string') return handleAssistantChat(request, env, url);
  const message = body.message.trim();

  if (isCapabilityQuestion(message)) {
    return json({
      ok: true,
      answer: capabilityAnswer(message),
      context: 'capabilities',
      provider: 'live-data',
      model: 'deterministic',
    });
  }

  if (isWildernessWanderingQuestion(message)) {
    return json({
      ok: true,
      answer: wildernessAnswer(),
      context: 'bible',
      provider: 'bible-facts',
      model: 'deterministic',
    });
  }

  let forwarded = request;
  if (looksLikeBibleQuestion(message) && body.page !== '/bible' && body.page !== '/bible.html') {
    const nextBody = { ...body, page: '/bible' };
    forwarded = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(nextBody),
    });
  }

  const response = await handleAssistantChat(forwarded, env, url);
  return rewriteJsonResponse(response);
}
