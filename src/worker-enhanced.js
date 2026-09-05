import baseWorker from './worker.js';
import { handleSiteSettings } from './site-settings.js';
import { handleSundaySchoolApi } from './sunday-school.js';
import { handleSundaySchoolContentApi } from './sunday-school-content.js';
import { handleSundaySchoolPortalGuard } from './sunday-school-portal-guard.js';
import { handleHumanAuthApi } from './human-auth.js';

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
    const humanAuthResponse = await handleHumanAuthApi(request, env, url);
    if (humanAuthResponse) return humanAuthResponse;
    const guardResponse = await handleSundaySchoolPortalGuard(request, env, url);
    if (guardResponse) return guardResponse;
    const contentResponse = await handleSundaySchoolContentApi(request, env, url);
    if (contentResponse) return contentResponse;
    if (url.pathname.startsWith('/api/sunday-school/')) {
      const sundaySchoolResponse = await handleSundaySchoolApi(request, env, url);
      if (sundaySchoolResponse) return sundaySchoolResponse;
    }
    const settingsResponse = await handleSiteSettings(request, env, url);
    if (settingsResponse) return settingsResponse;
    if (url.pathname === '/admin' || url.pathname === '/admin/' || url.pathname === '/admin/index.html') {
      return injectScripts(request, env, ['/admin-enhancements.js?v=3']);
    }
    if (url.pathname === '/team' || url.pathname === '/team/' || url.pathname === '/team/index.html') {
      return injectScripts(request, env, ['/team/course-studio.js?v=1', '/team/course-studio-fixes.js?v=1', '/team/human-auth.js?v=4']);
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
