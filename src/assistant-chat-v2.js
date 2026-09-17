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
  if (/\b(waar|wanneer|dienst|zondag|preek|adres|tijd|kerk|activiteit|mededeling|bijbel|zelfmoord|dood)\b/i.test(text)) return 'nl';
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

function isSuicideCrisis(message) {
  const q = String(message || '').trim().toLowerCase();
  return /(我.{0,4}(想|要|准备|打算|考虑).{0,4}(自杀|死|结束生命)|我不想活了|我活不下去了|想自杀|i want to die|i want to kill myself|i am suicidal|i'm suicidal|i don't want to live|ik wil dood|ik wil mezelf doden|ik denk aan zelfmoord|ik wil niet meer leven)/i.test(q);
}

function suicideCrisisAnswer(message) {
  const lang = userLanguage(message);
  if (lang === 'nl') {
    return 'Het spijt me dat u dit nu doormaakt. Ik neem dit serieus.\n\nBent u op dit moment in direct levensgevaar, hebt u al iets gedaan om uzelf te verwonden, of denkt u dat u nu iets zult doen? Bel dan onmiddellijk 112.\n\nAls u suïcidale gedachten hebt en nu met iemand wilt praten, neem dan contact op met 113 Zelfmoordpreventie: bel 113 of gratis 0800-0113, of chat via https://www.113.nl . De hulplijn is 24/7 bereikbaar en u kunt anoniem blijven.\n\nWilt u ook pastorale steun, neem dan rechtstreeks contact op met een pastor van de kerk of uw kringleider. Zij kunnen luisteren, met u bidden en u helpen passende professionele hulp te vinden.';
  }
  if (lang === 'en') {
    return 'I am sorry you are going through this. I am taking what you said seriously.\n\nIf you are in immediate danger, have already harmed yourself, or think you may act on these thoughts now, call 112 immediately.\n\nIf you are having suicidal thoughts and need someone to talk to now, contact 113 Zelfmoordpreventie: call 113 or the free number 0800-0113, or use the chat at https://www.113.nl . The service is available 24/7 and can be anonymous.\n\nIf you would also like pastoral support, contact a church pastor or your small-group leader directly. They can listen, pray with you, and help you connect with appropriate professional support.';
  }
  return '听到你这么说，我很重视这件事。\n\n如果你现在有立即伤害自己的危险、已经采取了伤害自己的行动，或者担心自己马上会这么做，请立即拨打 112。\n\n如果你正在经历自杀念头、现在需要有人陪你谈一谈，可以联系 113 Zelfmoordpreventie：拨打 113 或免费拨打 0800-0113，也可以在 https://www.113.nl 在线聊天。该服务 24 小时开放，也可以匿名求助。\n\n如果你也希望得到教会的关怀，请直接联系教会牧者或你所在的小组长。他们可以陪伴、倾听、为你祷告，并帮助你联系合适的专业支持。';
}

function sanitizePlainText(text) {
  return String(text || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1：$2')
    .replace(/\\\./g, '.')
    .replace(/建议您直接通过教会的官方渠道联系教会或小组长/g, '建议您直接联系教会牧者或小组长')
    .replace(/建议直接联系教会同工/g, '建议直接联系教会牧者或小组长')
    .replace(/教会的牧师或你所在的小组长/g, '教会牧者或你所在的小组长');
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

  if (isSuicideCrisis(message)) {
    return json({
      ok: true,
      answer: suicideCrisisAnswer(message),
      context: 'safety',
      provider: 'safety-guidance',
      model: 'deterministic',
    });
  }

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
