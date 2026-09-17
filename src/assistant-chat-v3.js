import { handleAssistantChatV2 } from './assistant-chat-v2.js';

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

function unescapeMarkdown(value) {
  return String(value || '').replace(/\\([\\`*_{}\[\]()#+\-.!&])/g, '$1');
}

export function normalizeAssistantText(text) {
  return String(text || '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_m, label, url) => {
      const cleanLabel = unescapeMarkdown(label);
      const cleanUrl = unescapeMarkdown(url);
      return cleanLabel === cleanUrl ? cleanUrl : `${cleanLabel}：${cleanUrl}`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\\([\\`*_{}\[\]()#+\-.!&])/g, '$1')
    .replace(/^\s*[*+-]\s+/gm, '• ')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

async function normalizeResponse(response) {
  if (!response) return response;
  const contentType = response.headers?.get('content-type') || '';
  if (!contentType.includes('application/json')) return response;
  const data = await response.json().catch(() => null);
  if (!data) return response;
  if (typeof data.answer === 'string') data.answer = normalizeAssistantText(data.answer);
  return json(data, response.status);
}

export async function handleAssistantChatV3(request, env, url = new URL(request.url)) {
  const response = await handleAssistantChatV2(request, env, url);
  return normalizeResponse(response);
}
