import baseWorker from './worker.js';
import { handleSiteSettings } from './site-settings.js';
import { handleSundaySchoolApi } from './sunday-school.js';
import { handleSundaySchoolContentApi } from './sunday-school-content.js';
import { handleSundaySchoolPortalGuard } from './sunday-school-portal-guard.js';
import { handleHumanAuthApi } from './human-auth.js';
import { handleTeamServicesApi, guardHumanServiceAccess } from './team-services.js';
import { handleWelcomeApi } from './welcome.js';

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

function secure(response) {
  const headers = new Headers(response.headers);
  headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'DENY');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function route(request, env, ctx) {
    const url = new URL(request.url);
    const hostHeader = request.headers.get('host') || '';
    const isLocal = Boolean(env.LOCAL_DEV) || url.hostname === '127.0.0.1' || url.hostname === 'localhost' || /^(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(hostHeader);
    if (!isLocal && (url.hostname === 'www.evkerk.nl' || url.protocol === 'http:')) {
      url.protocol = 'https:';
      url.hostname = 'evkerk.nl';
      return Response.redirect(url.toString(), 301);
    }
    const humanAuthResponse = await handleHumanAuthApi(request, env, url);
    if (humanAuthResponse) return humanAuthResponse;
    const teamServicesResponse = await handleTeamServicesApi(request, env, url);
    if (teamServicesResponse) return teamServicesResponse;
    const welcomeResponse = await handleWelcomeApi(request, env, url);
    if (welcomeResponse) return welcomeResponse;
    const serviceGuardResponse = await guardHumanServiceAccess(request, env, url);
    if (serviceGuardResponse) return serviceGuardResponse;
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
      return injectScripts(request, env, ['/admin/session-bridge.js?v=2', '/admin-enhancements.js?v=5', '/admin/team-permissions.js?v=5']);
    }
    if (url.pathname === '/admin/media.html') {
      return injectScripts(request, env, ['/admin/session-bridge.js?v=2']);
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return injectScripts(request, env, ['/schedule-settings.js?v=1', '/nl-copy-fixes.js?v=1']);
    }
    return baseWorker.fetch(request, env, ctx);
}

export default {
  async fetch(request, env, ctx) {
    return secure(await route(request, env, ctx));
  },

  async scheduled(controller, env, ctx) {
    return baseWorker.scheduled(controller, env, ctx);
  },
};

