import baseWorker from './worker.js';
import { handleSiteSettings } from './site-settings.js';

async function injectScripts(request, env, sources) {
  const response = await env.ASSETS.fetch(request);
  if (!response.ok) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;
  let html = await response.text();
  for (const src of sources) {
    if (!html.includes(src)) html = html.replace(/<\/body>/i, `<script src="${src}"></script></body>`);
  }
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const settingsResponse = await handleSiteSettings(request, env, url);
    if (settingsResponse) return settingsResponse;
    if (url.pathname === '/admin' || url.pathname === '/admin/' || url.pathname === '/admin/index.html') {
      return injectScripts(request, env, ['/admin-enhancements.js?v=3']);
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return injectScripts(request, env, ['/schedule-settings.js?v=1', '/nl-copy-fixes.js?v=1']);
    }
    return baseWorker.fetch(request, env, ctx);
  },

  async scheduled(controller, env, ctx) {
    return baseWorker.scheduled(controller, env, ctx);
  },
};
