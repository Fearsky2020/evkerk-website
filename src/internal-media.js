import { authorizeService } from './team-services.js';

const INTERNAL_MEDIA = new Map([
  ['001-he-er-wei-yi', {
    key: 'internal-hymns/reference/001-he-er-wei-yi.mp4',
    type: 'video/mp4',
    filename: '001-he-er-wei-yi.mp4',
  }],
]);

function notFound() {
  return new Response('not found', { status: 404 });
}

export async function handleInternalMediaApi(request, env, url) {
  const match = url.pathname.match(/^\/api\/internal-media\/hymns\/([^/]+)$/);
  if (!match || !['GET', 'HEAD'].includes(request.method)) return null;
  const auth = await authorizeService(request, env, 'media');
  if (auth.response) return auth.response;
  if (!env.MEDIA) return new Response('storage unavailable', { status: 503 });
  const item = INTERNAL_MEDIA.get(decodeURIComponent(match[1]));
  if (!item) return notFound();
  const object = await env.MEDIA.get(item.key, { range: request.headers });
  if (!object) return notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('content-type', item.type);
  headers.set('cache-control', 'private, no-store');
  headers.set('accept-ranges', 'bytes');
  headers.set('content-disposition', `inline; filename="${item.filename}"`);
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
