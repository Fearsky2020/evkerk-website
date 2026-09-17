import enhancedWorker from './worker-enhanced.js';
import { handleBibleSearch } from './bible-search.js';
import { handlePublicAssistantLive } from './public-assistant-live.js';
import { handleAssistantChatV2 } from './assistant-chat-v2.js';

const ASSISTANT_MARKER = '/evkerk-assistant.js?v=1';
const ASSISTANT_TAG = `<script src="${ASSISTANT_MARKER}" defer></script>`;
const BIBLE_DEEPLINK_MARKER = '/bible-deeplink.js?v=1';
const BIBLE_DEEPLINK_TAG = `<script src="${BIBLE_DEEPLINK_MARKER}" defer></script>`;
const SERMON_PLAY_HOVER_FIX_MARKER = '/sermon-play-hover-fix.js?v=1';
const SERMON_PLAY_HOVER_FIX_TAG = `<script src="${SERMON_PLAY_HOVER_FIX_MARKER}" defer></script>`;

function isPublicPage(url) {
  return !url.pathname.startsWith('/api/')
    && !url.pathname.startsWith('/admin')
    && !url.pathname.startsWith('/team');
}

function isBiblePage(url) {
  return url.pathname === '/bible' || url.pathname === '/bible.html';
}

function isHomePage(url) {
  return url.pathname === '/' || url.pathname === '/index.html';
}

async function injectPublicScripts(response, url) {
  if (!response.ok) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();
  const additions = [];
  if (!html.includes(ASSISTANT_MARKER)) additions.push(ASSISTANT_TAG);
  if (isBiblePage(url) && !html.includes(BIBLE_DEEPLINK_MARKER)) additions.push(BIBLE_DEEPLINK_TAG);
  if (isHomePage(url) && !html.includes(SERMON_PLAY_HOVER_FIX_MARKER)) additions.push(SERMON_PLAY_HOVER_FIX_TAG);

  if (!additions.length || !/<\/body>/i.test(html)) {
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  html = html.replace(/<\/body>/i, `  ${additions.join('\n  ')}\n</body>`);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const bibleSearchResponse = await handleBibleSearch(request, env, url);
    if (bibleSearchResponse) return bibleSearchResponse;

    const liveAssistantResponse = await handlePublicAssistantLive(request, env, url);
    if (liveAssistantResponse) return liveAssistantResponse;

    const assistantChatResponse = await handleAssistantChatV2(request, env, url);
    if (assistantChatResponse) return assistantChatResponse;

    const response = await enhancedWorker.fetch(request, env, ctx);
    if (!isPublicPage(url)) return response;
    return injectPublicScripts(response, url);
  },

  async scheduled(controller, env, ctx) {
    return enhancedWorker.scheduled(controller, env, ctx);
  },
};
