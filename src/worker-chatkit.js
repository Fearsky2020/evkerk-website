import enhancedWorker from './worker-enhanced.js';

const CHATKIT_MARKER = '/evkerk-chatkit.js?v=1';
const CHATKIT_TAG = `<script src="${CHATKIT_MARKER}" defer></script>`;

function isPublicPage(url) {
  return !url.pathname.startsWith('/api/')
    && !url.pathname.startsWith('/admin')
    && !url.pathname.startsWith('/team');
}

async function injectChatKit(response) {
  if (!response.ok) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();
  if (html.includes(CHATKIT_MARKER) || !/<\/body>/i.test(html)) {
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  html = html.replace(/<\/body>/i, `  ${CHATKIT_TAG}\n</body>`);
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
    const response = await enhancedWorker.fetch(request, env, ctx);
    if (!isPublicPage(url)) return response;
    return injectChatKit(response);
  },

  async scheduled(controller, env, ctx) {
    return enhancedWorker.scheduled(controller, env, ctx);
  },
};
