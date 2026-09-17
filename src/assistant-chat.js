import { handleBibleSearch } from './bible-search.js';
import { handlePublicAssistantLive } from './public-assistant-live.js';

const MAX_MESSAGE_CHARS = 1200;
const MAX_HISTORY_ITEMS = 6;
const MAX_HISTORY_CHARS = 700;
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_CF_MODEL = '@cf/google/gemma-4-26b-a4b-it';

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

function clampText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
    .slice(-MAX_HISTORY_ITEMS)
    .map((item) => ({
      role: item.role,
      text: clampText(item.text, MAX_HISTORY_CHARS),
    }))
    .filter((item) => item.text);
}

export function selectContextKind(message, page = '') {
  const q = String(message || '').toLowerCase();
  const pagePath = String(page || '').toLowerCase();

  const bible = /圣经|经文|哪一节|哪段|几章|几节|创世记|出埃及记|利未记|民数记|申命记|约书亚记|士师记|路得记|撒母耳|列王纪|历代志|以斯拉|尼希米|以斯帖|约伯记|诗篇|箴言|传道书|雅歌|以赛亚|耶利米|以西结|但以理|何西阿|约珥|阿摩司|俄巴底亚|约拿|弥迦|那鸿|哈巴谷|西番雅|哈该|撒迦利亚|玛拉基|马太|马可|路加|约翰|使徒行传|罗马书|哥林多|加拉太|以弗所|腓立比|歌罗西|帖撒罗尼迦|提摩太|提多书|腓利门|希伯来|雅各书|彼得|犹大书|启示录|bible|scripture|verse|bijbel|schrift|vers/.test(q)
    || pagePath === '/bible' || pagePath === '/bible.html';
  if (bible) return 'bible';

  if (/讲道|信息|证道|sermon|preek/.test(q)) return 'sermons';
  if (/活动|近期|最近有什么|洗礼|团契|event|activity|activiteit|agenda/.test(q)) return 'events';
  if (/通知|公告|announcement|mededeling/.test(q)) return 'announcements';
  if (/聚会|主日|时间|几点|地址|地点|怎么去|第一次来|礼拜|service|sunday|time|address|location|dienst|zondag|tijd|adres/.test(q)) return 'schedule';

  return 'overview';
}

async function liveContext(env, kind) {
  const url = new URL(`https://evkerk.nl/api/assistant/live?kind=${encodeURIComponent(kind)}&limit=3`);
  const response = await handlePublicAssistantLive(new Request(url), env, url);
  if (!response?.ok) return null;
  return response.json();
}

async function bibleContext(env, query) {
  const url = new URL(`https://evkerk.nl/api/bible/search?q=${encodeURIComponent(query)}&limit=5`);
  const response = await handleBibleSearch(new Request(url), env, url);
  if (!response?.ok) return null;
  return response.json();
}

function amsterdamNow() {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date());
}

function buildSystemPrompt(contextKind, context) {
  const contextJson = JSON.stringify(context || {}, null, 2);
  return `你是福音教会官网的公开信息助手。你服务 evkerk.nl 的访客，语气友善、清楚、简洁。

当前荷兰时间：${amsterdamNow()}（Europe/Amsterdam）。
当前资料类型：${contextKind}。

硬性规则：
1. 用户用中文就中文回答；荷兰语就荷兰语；英语就英语。不要无故混用语言。
2. 教会自己的讲道、聚会时间、地址、活动、公告，以“实时资料”字段为最高优先级。实时资料和你已有知识冲突时，一律采用实时资料。
3. 不得凭记忆编造教会日期、时间、地址、讲道标题、讲员或活动。资料没有就直接说目前没有查到。
4. 如果实时资料里有 page_url / open_url，可在有帮助时把完整链接直接给访客。
5. 如果是圣经查询，只把实时资料中 results 的经文文字当作逐字经文来源；可以做简短解释，但不要把自己记忆中的文字冒充网站经文原文。
6. “上周、最近、最新、本周、今天、这个星期日”等都按上面的荷兰当前时间理解。
7. 回答通常控制在 2–6 个短段落，不要长篇推理，不要展示内部思考过程。
8. 不主动索取身份证件、健康资料、财务资料或其他敏感个人信息。若访客要谈私密牧养问题，提醒不要在公开聊天助手里提交敏感细节，并建议直接联系教会同工。
9. 你不是 Zoho，也不要提及 Zoho、Zia、Gemini、Cloudflare 或模型供应商，除非访客明确询问技术实现。

实时资料：
${contextJson}`;
}

function historyForGemini(history, message) {
  const contents = history.map((item) => ({
    role: item.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: item.text }],
  }));
  contents.push({ role: 'user', parts: [{ text: message }] });
  return contents;
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => part?.text || '').join('').trim();
}

async function callGemini(env, systemPrompt, history, message) {
  const key = env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_KEY_MISSING');
  const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: historyForGemini(history, message),
      generationConfig: {
        maxOutputTokens: 600,
      },
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`GEMINI_${response.status}:${detail.slice(0, 180)}`);
  }
  const payload = await response.json();
  const text = extractGeminiText(payload);
  if (!text) throw new Error('GEMINI_EMPTY');
  return { text, provider: 'gemini', model };
}

function workersMessages(systemPrompt, history, message) {
  return [
    { role: 'system', content: systemPrompt },
    ...history.map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: item.text,
    })),
    { role: 'user', content: message },
  ];
}

function extractWorkersAIText(result) {
  const choiceContent = result?.choices?.[0]?.message?.content;
  if (typeof choiceContent === 'string' && choiceContent.trim()) return choiceContent.trim();
  if (Array.isArray(choiceContent)) {
    const joined = choiceContent
      .map((part) => typeof part === 'string' ? part : (part?.text || part?.content || ''))
      .join('')
      .trim();
    if (joined) return joined;
  }
  return String(result?.response ?? result?.result?.response ?? '').trim();
}

async function callWorkersAI(env, systemPrompt, history, message) {
  if (!env.AI?.run) throw new Error('WORKERS_AI_MISSING');
  const model = env.CF_AI_MODEL || DEFAULT_CF_MODEL;
  const result = await env.AI.run(model, {
    messages: workersMessages(systemPrompt, history, message),
    max_completion_tokens: 600,
    chat_template_kwargs: {
      enable_thinking: false,
    },
  });
  const text = extractWorkersAIText(result);
  if (!text) throw new Error('WORKERS_AI_EMPTY');
  return { text, provider: 'workers-ai', model };
}

async function answerWithModel(env, systemPrompt, history, message) {
  if (env.GEMINI_API_KEY) {
    try {
      return await callGemini(env, systemPrompt, history, message);
    } catch (error) {
      console.error('EVKERK_GEMINI_FAILED', error?.message || error);
    }
  }
  return callWorkersAI(env, systemPrompt, history, message);
}

export async function handleAssistantChat(request, env, url = new URL(request.url)) {
  if (url.pathname !== '/api/assistant/chat') return null;
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': 'https://evkerk.nl',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
      },
    });
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return json({ ok: false, error: 'json required' }, 415);

  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, error: 'invalid json' }, 400);
  const message = clampText(body.message, MAX_MESSAGE_CHARS);
  if (!message) return json({ ok: false, error: 'message is required' }, 400);
  const history = cleanHistory(body.history);
  const page = clampText(body.page, 180);
  const contextKind = selectContextKind(message, page);

  try {
    const context = contextKind === 'bible'
      ? await bibleContext(env, message)
      : await liveContext(env, contextKind);
    const systemPrompt = buildSystemPrompt(contextKind, context);
    const answer = await answerWithModel(env, systemPrompt, history, message);
    return json({
      ok: true,
      answer: answer.text,
      context: contextKind,
      provider: answer.provider,
      model: answer.model,
    });
  } catch (error) {
    console.error('EVKERK_ASSISTANT_CHAT_FAILED', error?.message || error);
    return json({
      ok: false,
      error: 'assistant temporarily unavailable',
      answer: '抱歉，信息助手现在暂时连不上。您可以稍后再试，或直接浏览 evkerk.nl 的聚会、讲道和圣经页面。',
    }, 503);
  }
}
