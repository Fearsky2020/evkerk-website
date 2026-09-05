import baseWorker from './worker.js';
import { handleSiteSettings } from './site-settings.js';

async function injectAdminEnhancements(request, env) {
  const response = await env.ASSETS.fetch(request);
  if (!response.ok) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const html = await response.text();
  if (html.includes('/admin-enhancements.js')) return new Response(html, response);

  const enhanced = html.replace(
    /<\/body>/i,
    '<script src="/admin-enhancements.js?v=2"></script></body>',
  );
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store');
  return new Response(enhanced, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const settingsResponse = await handleSiteSettings(request, env, url);
    if (settingsResponse) return settingsResponse;
    if (url.pathname === '/admin' || url.pathname === '/admin/' || url.pathname === '/admin/index.html') {
      return injectAdminEnhancements(request, env);
    }
    return baseWorker.fetch(request, env, ctx);
  },

  async scheduled(controller, env, ctx) {
    return baseWorker.scheduled(controller, env, ctx);
  },
};
