const CATEGORIES = new Set(['church', 'fellowship', 'small_group']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function bearer(request) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
}

function requireAdmin(request, env) {
  if (!env.INGEST_TOKEN) return json({ ok: false, error: '后台密码尚未配置' }, 503);
  if (bearer(request) !== env.INGEST_TOKEN) return json({ ok: false, error: '后台密码不正确' }, 401);
  if (!env.DB || !env.MEDIA) return json({ ok: false, error: '图片存储尚未配置' }, 503);
  return null;
}

function publicItem(row) {
  return {
    id: row.id,
    category: row.category,
    title_zh: row.title_zh,
    title_nl: row.title_nl || '',
    event_date: row.event_date || '',
    location: row.location || '',
    image_url: `/api/activities/${encodeURIComponent(row.id)}/image`,
  };
}

async function listPublic(env) {
  if (!env.DB) return json({ ok: true, activities: [] });
  const result = await env.DB.prepare(
    `SELECT id, category, title_zh, title_nl, event_date, location
       FROM activity_gallery WHERE status='published'
      ORDER BY sort_order DESC, event_date DESC, created_at DESC LIMIT 20`,
  ).all();
  return json({ ok: true, activities: (result.results || []).map(publicItem) });
}

async function listAdmin(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const result = await env.DB.prepare(
    `SELECT id, category, title_zh, title_nl, event_date, location, image_size, sort_order, status, created_at
       FROM activity_gallery ORDER BY created_at DESC LIMIT 50`,
  ).all();
  return json({ ok: true, activities: (result.results || []).map((row) => ({ ...row, image_url: `/api/activities/${encodeURIComponent(row.id)}/image` })) });
}

async function upload(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const form = await request.formData().catch(() => null);
  if (!form) return json({ ok: false, error: '无法读取表单' }, 400);
  const image = form.get('image');
  const category = clean(form.get('category'), 30);
  const titleZh = clean(form.get('title_zh'), 180);
  if (!(image instanceof File) || !image.size) return json({ ok: false, error: '请选择照片' }, 400);
  if (!IMAGE_TYPES.has(image.type)) return json({ ok: false, error: '只支持 JPG、PNG、WebP 或 AVIF' }, 415);
  if (image.size > 12 * 1024 * 1024) return json({ ok: false, error: '照片不能超过 12MB' }, 413);
  if (!CATEGORIES.has(category)) return json({ ok: false, error: '请选择活动类别' }, 400);
  if (!titleZh) return json({ ok: false, error: '请填写活动名称' }, 400);

  const id = `ACT-${crypto.randomUUID()}`;
  const ext = image.type === 'image/jpeg' ? 'jpg' : image.type.split('/')[1];
  const key = `activity-gallery/${new Date().getUTCFullYear()}/${id}.${ext}`;
  await env.MEDIA.put(key, image.stream(), { httpMetadata: { contentType: image.type } });
  try {
    await env.DB.prepare(
      `INSERT INTO activity_gallery
        (id, category, title_zh, title_nl, event_date, location, image_key, image_mime, image_size, sort_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
    ).bind(
      id, category, titleZh, clean(form.get('title_nl'), 180), clean(form.get('event_date'), 20) || null,
      clean(form.get('location'), 240), key, image.type, image.size, Number(form.get('sort_order') || 0),
    ).run();
  } catch (error) {
    await env.MEDIA.delete(key);
    throw error;
  }
  return json({ ok: true, activity: { id, image_url: `/api/activities/${encodeURIComponent(id)}/image` } }, 201);
}

async function unpublish(request, env, id) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const result = await env.DB.prepare(
    `UPDATE activity_gallery SET status='hidden', updated_at=datetime('now') WHERE id=?`,
  ).bind(id).run();
  if (!Number(result.meta?.changes || 0)) return json({ ok: false, error: '照片不存在' }, 404);
  return json({ ok: true, id, status: 'hidden' });
}

async function image(env, id) {
  if (!env.DB || !env.MEDIA) return new Response('not found', { status: 404 });
  const row = await env.DB.prepare(
    `SELECT image_key, image_mime FROM activity_gallery WHERE id=? AND status='published'`,
  ).bind(id).first();
  if (!row) return new Response('not found', { status: 404 });
  const object = await env.MEDIA.get(row.image_key);
  if (!object) return new Response('not found', { status: 404 });
  return new Response(object.body, {
    headers: { 'content-type': row.image_mime, 'cache-control': 'public, max-age=3600', 'x-content-type-options': 'nosniff' },
  });
}

export async function handleActivityApi(request, env, url) {
  if (request.method === 'GET' && url.pathname === '/api/activities') return listPublic(env);
  if (request.method === 'GET' && url.pathname === '/api/admin/activities') return listAdmin(request, env);
  if (request.method === 'POST' && url.pathname === '/api/admin/activities') return upload(request, env);
  let match = url.pathname.match(/^\/api\/admin\/activities\/([^/]+)\/hide$/);
  if (match && request.method === 'POST') return unpublish(request, env, decodeURIComponent(match[1]));
  match = url.pathname.match(/^\/api\/activities\/([^/]+)\/image$/);
  if (match && request.method === 'GET') return image(env, decodeURIComponent(match[1]));
  return null;
}
