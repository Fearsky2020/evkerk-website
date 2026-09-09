import { authorizeService } from './team-services.js';

function notFound() {
  return new Response('not found', { status: 404 });
}

function unavailable() {
  return new Response('storage unavailable', { status: 503 });
}

async function catalogItems(env) {
  if (!env.DB) return null;
  const rows = await env.DB.prepare(
    `SELECT id, category, title_zh, title_nl, mime_type, media_date, size_bytes
       FROM internal_media
      WHERE status='active'
        AND (category!='sermon' OR media_date LIKE '2026-%')
      ORDER BY CASE WHEN category='hymn' THEN 0 ELSE 1 END ASC, media_date DESC, sort_order ASC, title_zh ASC`,
  ).all();
  return (rows.results || []).map((item) => ({
    id: item.id,
    category: item.category,
    title_zh: item.title_zh,
    title_nl: item.title_nl,
    type: item.mime_type,
    date: item.media_date || '',
    size_bytes: Number(item.size_bytes || 0),
    href: `/api/internal-media/items/${encodeURIComponent(item.id)}`,
  }));
}

async function findItem(env, id) {
  if (!env.DB) return null;
  return env.DB.prepare(
    `SELECT id, r2_key, mime_type, filename
       FROM internal_media
      WHERE id=? AND status='active'
      LIMIT 1`,
  ).bind(id).first();
}
export async function guardInternalMediaPage(request, env, url) {
  const protectedPage = request.method === 'GET' && (
    url.pathname === '/team/media' ||
    url.pathname === '/team/media/' ||
    url.pathname === '/team/media/index.html'
  );
  if (!protectedPage) return null;
  const auth = await authorizeService(request, env, 'media');
  if (!auth.response) return null;
  return Response.redirect(new URL('/team/', url).toString(), 302);
}

export async function handleInternalMediaApi(request, env, url) {
  if (request.method === 'GET' && (url.pathname === '/api/internal-media/items' || url.pathname === '/api/internal-media/hymns')) {
    const auth = await authorizeService(request, env, 'media');
    if (auth.response) return auth.response;
    const items = await catalogItems(env);
    if (!items) return unavailable();
    return Response.json({ ok: true, items }, { headers: { 'cache-control': 'private, no-store' } });
  }
  const match = url.pathname.match(/^\/api\/internal-media\/(?:items|hymns)\/([^/]+)$/);
  if (!match || !['GET', 'HEAD'].includes(request.method)) return null;
  const auth = await authorizeService(request, env, 'media');
  if (auth.response) return auth.response;
  if (!env.DB || !env.MEDIA) return unavailable();
  const item = await findItem(env, decodeURIComponent(match[1]));
  if (!item) return notFound();
  const object = await env.MEDIA.get(item.r2_key, { range: request.headers });
  if (!object) return notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('content-type', item.mime_type || 'application/octet-stream');
  headers.set('cache-control', 'private, no-store');
  headers.set('accept-ranges', 'bytes');
  headers.set('content-disposition', `inline; filename="${item.filename || item.id}"`);
  headers.set('etag', object.httpEtag);
  if (request.method === 'HEAD') return new Response(null, { headers });
  if (object.range) {
    const offset = object.range.offset || 0;
    const length = object.range.length || object.size;
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set('content-length', String(length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set('content-length', String(object.size));
  return new Response(object.body, { headers });
}
