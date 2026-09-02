const AUDIO_EXTENSIONS = new Set([
  '.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus', '.wma', '.mp4', '.m4b',
]);

const AUDIO_MIME_PREFIXES = ['audio/'];
const EXTRA_MIME_TYPES = new Set([
  'video/mp4',
  'application/octet-stream',
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function clean(value, max = 12000) {
  return String(value ?? '').trim().slice(0, max);
}

function bearer(request) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
}

function requireToken(request, env, name) {
  const expected = env[name];
  if (!expected) return json({ ok: false, error: `${name} is not configured` }, 503);
  if (bearer(request) !== expected) return json({ ok: false, error: 'unauthorized' }, 401);
  return null;
}

function requireStorage(env) {
  if (!env.DB) return json({ ok: false, error: 'D1 database is not configured' }, 503);
  if (!env.MEDIA) return json({ ok: false, error: 'R2 MEDIA bucket is not configured' }, 503);
  return null;
}

function jobId() {
  return `MEDIA-${crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`;
}

function extension(name) {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function decodeFilename(raw) {
  try {
    return decodeURIComponent(raw || '');
  } catch {
    return raw || '';
  }
}

function safeFilename(value) {
  const name = decodeFilename(value).replace(/[\\/\x00-\x1f]/g, '_').trim().slice(0, 220);
  return name || 'recording.m4a';
}

function allowedAudio(name, mime) {
  const ext = extension(name);
  const type = clean(mime, 120).toLowerCase();
  return AUDIO_EXTENSIONS.has(ext)
    && (AUDIO_MIME_PREFIXES.some((prefix) => type.startsWith(prefix)) || EXTRA_MIME_TYPES.has(type) || !type);
}

function maxUploadBytes(env) {
  const mb = Math.max(1, Math.min(500, Number(env.MAX_MEDIA_MB || 95)));
  return Math.floor(mb * 1024 * 1024);
}

function mediaKey(id, name) {
  const ext = extension(name) || '.bin';
  const year = new Date().getUTCFullYear();
  return `sermon-audio/${year}/${id}/original${ext}`;
}

async function fetchJob(env, id) {
  return env.DB.prepare('SELECT * FROM media_ingest_jobs WHERE id=?').bind(id).first();
}

function publicJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    source: row.source,
    original_name: row.original_name,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    sermon_date: row.sermon_date,
    speaker: row.speaker,
    status: row.status,
    worker_id: row.worker_id,
    attempts: row.attempts,
    transcript_text: row.transcript_text,
    title_zh: row.title_zh,
    title_nl: row.title_nl,
    summary_zh: row.summary_zh,
    summary_nl: row.summary_nl,
    article_zh: row.article_zh,
    article_nl: row.article_nl,
    scripture: row.scripture,
    scripture_json: row.scripture_json,
    uncertain_notes: row.uncertain_notes,
    error: row.error,
    created_at: row.created_at,
    claimed_at: row.claimed_at,
    ready_at: row.ready_at,
    published_at: row.published_at,
    updated_at: row.updated_at,
  };
}

async function upload(request, env) {
  const denied = requireToken(request, env, 'INGEST_TOKEN');
  if (denied) return denied;
  const unavailable = requireStorage(env);
  if (unavailable) return unavailable;
  if (!request.body) return json({ ok: false, error: 'audio body required' }, 400);

  const name = safeFilename(request.headers.get('x-filename'));
  const mime = clean(request.headers.get('content-type'), 120) || 'application/octet-stream';
  if (!allowedAudio(name, mime)) {
    return json({ ok: false, error: 'unsupported audio type' }, 415);
  }

  const declaredSize = Number(request.headers.get('content-length') || 0);
  const maxBytes = maxUploadBytes(env);
  if (declaredSize > maxBytes) {
    return json({ ok: false, error: `audio exceeds ${Math.floor(maxBytes / 1024 / 1024)} MB limit` }, 413);
  }

  const id = jobId();
  const key = mediaKey(id, name);
  const sermonDate = clean(request.headers.get('x-sermon-date'), 20) || new Date().toISOString().slice(0, 10);
  const speaker = clean(decodeFilename(request.headers.get('x-speaker')), 200);
  const source = clean(request.headers.get('x-source'), 40) || 'admin';

  await env.DB.prepare(
    `INSERT INTO media_ingest_jobs
      (id, source, original_name, mime_type, size_bytes, r2_key, sermon_date, speaker, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'uploading')`,
  ).bind(id, source, name, mime, declaredSize || null, key, sermonDate, speaker || null).run();

  try {
    await env.MEDIA.put(key, request.body, {
      httpMetadata: { contentType: mime },
      customMetadata: { jobId: id, originalName: name },
    });
    const object = await env.MEDIA.head(key);
    const actualSize = object?.size ?? declaredSize ?? null;
    if (actualSize && actualSize > maxBytes) {
      await env.MEDIA.delete(key);
      await env.DB.prepare(
        `UPDATE media_ingest_jobs SET status='failed', error='AUDIO_TOO_LARGE', size_bytes=?, updated_at=datetime('now') WHERE id=?`,
      ).bind(actualSize, id).run();
      return json({ ok: false, id, error: `audio exceeds ${Math.floor(maxBytes / 1024 / 1024)} MB limit` }, 413);
    }
    await env.DB.prepare(
      `UPDATE media_ingest_jobs
          SET status='queued', size_bytes=?, error=NULL, updated_at=datetime('now')
        WHERE id=?`,
    ).bind(actualSize, id).run();
    return json({ ok: true, id, status: 'queued', original_name: name, size_bytes: actualSize }, 201);
  } catch (error) {
    await env.DB.prepare(
      `UPDATE media_ingest_jobs SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`,
    ).bind(clean(error?.message || error, 1000), id).run();
    return json({ ok: false, id, error: 'audio upload failed' }, 500);
  }
}

async function listAdminJobs(request, env, url) {
  const denied = requireToken(request, env, 'INGEST_TOKEN');
  if (denied) return denied;
  if (!env.DB) return json({ ok: false, error: 'D1 database is not configured' }, 503);
  const status = clean(url.searchParams.get('status'), 40);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 20)));
  const where = status ? 'WHERE status=?' : '';
  const result = status
    ? await env.DB.prepare(
      `SELECT id, source, original_name, mime_type, size_bytes, sermon_date, speaker, status,
              worker_id, attempts, title_zh, title_nl, scripture, error, created_at, ready_at, published_at, updated_at
         FROM media_ingest_jobs ${where} ORDER BY created_at DESC LIMIT ${limit}`,
    ).bind(status).all()
    : await env.DB.prepare(
      `SELECT id, source, original_name, mime_type, size_bytes, sermon_date, speaker, status,
              worker_id, attempts, title_zh, title_nl, scripture, error, created_at, ready_at, published_at, updated_at
         FROM media_ingest_jobs ORDER BY created_at DESC LIMIT ${limit}`,
    ).all();
  return json({ ok: true, jobs: result.results || [] });
}

async function getAdminJob(request, env, id) {
  const denied = requireToken(request, env, 'INGEST_TOKEN');
  if (denied) return denied;
  if (!env.DB) return json({ ok: false, error: 'D1 database is not configured' }, 503);
  const row = await fetchJob(env, id);
  if (!row) return json({ ok: false, error: 'media job not found' }, 404);
  return json({ ok: true, job: publicJob(row) });
}

async function updateDraft(request, env, id) {
  const denied = requireToken(request, env, 'INGEST_TOKEN');
  if (denied) return denied;
  if (!env.DB) return json({ ok: false, error: 'D1 database is not configured' }, 503);
  const row = await fetchJob(env, id);
  if (!row) return json({ ok: false, error: 'media job not found' }, 404);
  if (!['ready_for_review', 'published'].includes(row.status)) {
    return json({ ok: false, error: `job is ${row.status}` }, 409);
  }
  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE media_ingest_jobs SET
       sermon_date=?, speaker=?, title_zh=?, title_nl=?, summary_zh=?, summary_nl=?,
       article_zh=?, article_nl=?, scripture=?, uncertain_notes=?, updated_at=datetime('now')
     WHERE id=?`,
  ).bind(
    clean(body.sermon_date ?? row.sermon_date, 20),
    clean(body.speaker ?? row.speaker, 200),
    clean(body.title_zh ?? row.title_zh, 300),
    clean(body.title_nl ?? row.title_nl, 300),
    clean(body.summary_zh ?? row.summary_zh, 20000),
    clean(body.summary_nl ?? row.summary_nl, 20000),
    clean(body.article_zh ?? row.article_zh, 100000),
    clean(body.article_nl ?? row.article_nl, 100000),
    clean(body.scripture ?? row.scripture, 1000),
    clean(body.uncertain_notes ?? row.uncertain_notes, 12000),
    id,
  ).run();
  return json({ ok: true, job: publicJob(await fetchJob(env, id)) });
}

async function publish(request, env, id) {
  const denied = requireToken(request, env, 'INGEST_TOKEN');
  if (denied) return denied;
  const unavailable = requireStorage(env);
  if (unavailable) return unavailable;
  const row = await fetchJob(env, id);
  if (!row) return json({ ok: false, error: 'media job not found' }, 404);
  if (row.status !== 'ready_for_review') return json({ ok: false, error: `job is ${row.status}` }, 409);
  if (!clean(row.title_zh, 300) || !clean(row.article_zh, 100000)) {
    return json({ ok: false, error: 'Chinese title and article are required before publishing' }, 400);
  }

  const sermonId = `SERMON-${id.slice(6)}`;
  const audioUrl = `/api/media/public/${encodeURIComponent(id)}/audio`;
  const transcriptUrl = `/api/media/public/${encodeURIComponent(id)}/transcript`;
  await env.DB.prepare(
    `INSERT INTO sermons
      (id, sermon_date, title_zh, title_nl, speaker, scripture, summary_zh, summary_nl,
       youtube_url, audio_url, transcript_url, status, published_at, updated_at,
       article_zh, article_nl, media_job_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 'published', datetime('now'), datetime('now'), ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       sermon_date=excluded.sermon_date, title_zh=excluded.title_zh, title_nl=excluded.title_nl,
       speaker=excluded.speaker, scripture=excluded.scripture,
       summary_zh=excluded.summary_zh, summary_nl=excluded.summary_nl,
       audio_url=excluded.audio_url, transcript_url=excluded.transcript_url,
       article_zh=excluded.article_zh, article_nl=excluded.article_nl,
       media_job_id=excluded.media_job_id, status='published',
       published_at=datetime('now'), updated_at=datetime('now')`,
  ).bind(
    sermonId, row.sermon_date, row.title_zh, row.title_nl, row.speaker, row.scripture,
    row.summary_zh, row.summary_nl, audioUrl, transcriptUrl, row.article_zh, row.article_nl, id,
  ).run();
  await env.DB.prepare(
    `UPDATE media_ingest_jobs SET status='published', published_at=datetime('now'), updated_at=datetime('now') WHERE id=?`,
  ).bind(id).run();
  return json({ ok: true, id, sermon_id: sermonId, status: 'published' });
}

async function retry(request, env, id) {
  const denied = requireToken(request, env, 'INGEST_TOKEN');
  if (denied) return denied;
  if (!env.DB) return json({ ok: false, error: 'D1 database is not configured' }, 503);
  const row = await fetchJob(env, id);
  if (!row) return json({ ok: false, error: 'media job not found' }, 404);
  if (!['failed', 'processing'].includes(row.status)) return json({ ok: false, error: `job is ${row.status}` }, 409);
  await env.DB.prepare(
    `UPDATE media_ingest_jobs
        SET status='queued', worker_id=NULL, claimed_at=NULL, error=NULL, updated_at=datetime('now')
      WHERE id=?`,
  ).bind(id).run();
  return json({ ok: true, id, status: 'queued' });
}

async function listWorkerJobs(request, env, url) {
  const denied = requireToken(request, env, 'SINAN_TOKEN');
  if (denied) return denied;
  if (!env.DB) return json({ ok: false, error: 'D1 database is not configured' }, 503);
  const status = clean(url.searchParams.get('status') || 'queued', 40);
  const limit = Math.max(1, Math.min(10, Number(url.searchParams.get('limit') || 2)));
  const result = await env.DB.prepare(
    `SELECT id, original_name, mime_type, size_bytes, sermon_date, speaker, status, attempts, created_at
       FROM media_ingest_jobs WHERE status=? ORDER BY created_at ASC LIMIT ${limit}`,
  ).bind(status).all();
  return json({ ok: true, jobs: result.results || [] });
}

async function claim(request, env, id) {
  const denied = requireToken(request, env, 'SINAN_TOKEN');
  if (denied) return denied;
  if (!env.DB) return json({ ok: false, error: 'D1 database is not configured' }, 503);
  const body = await request.json().catch(() => ({}));
  const workerId = clean(body.worker_id, 120);
  if (!workerId) return json({ ok: false, error: 'worker_id required' }, 400);
  const result = await env.DB.prepare(
    `UPDATE media_ingest_jobs
        SET status='processing', worker_id=?, claimed_at=datetime('now'), attempts=attempts+1,
            error=NULL, updated_at=datetime('now')
      WHERE id=? AND status='queued'`,
  ).bind(workerId, id).run();
  if (!Number(result.meta?.changes || 0)) {
    const row = await fetchJob(env, id);
    if (!row) return json({ ok: false, error: 'media job not found' }, 404);
    return json({ ok: false, error: `job is ${row.status}` }, 409);
  }
  return json({ ok: true, job: publicJob(await fetchJob(env, id)) });
}

async function workerAudio(request, env, id) {
  const denied = requireToken(request, env, 'SINAN_TOKEN');
  if (denied) return denied;
  const unavailable = requireStorage(env);
  if (unavailable) return unavailable;
  const row = await fetchJob(env, id);
  if (!row) return json({ ok: false, error: 'media job not found' }, 404);
  if (!['processing', 'ready_for_review', 'published'].includes(row.status)) {
    return json({ ok: false, error: `job is ${row.status}` }, 409);
  }
  const object = await env.MEDIA.get(row.r2_key);
  if (!object) return json({ ok: false, error: 'audio object missing' }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('cache-control', 'no-store');
  headers.set('content-disposition', `attachment; filename="recording${extension(row.original_name)}"`);
  if (object.size != null) headers.set('content-length', String(object.size));
  return new Response(object.body, { headers });
}

function normalizeModelResult(body) {
  const scriptureArray = Array.isArray(body.scripture_references)
    ? body.scripture_references.map((v) => clean(v, 300)).filter(Boolean).slice(0, 30)
    : [];
  const uncertainty = Array.isArray(body.uncertain_notes)
    ? body.uncertain_notes.map((v) => clean(v, 1000)).filter(Boolean).slice(0, 30)
    : (clean(body.uncertain_notes, 12000) ? [clean(body.uncertain_notes, 12000)] : []);
  return {
    transcript_text: clean(body.transcript_text, 200000),
    title_zh: clean(body.title_zh, 300),
    title_nl: clean(body.title_nl, 300),
    summary_zh: clean(body.summary_zh, 20000),
    summary_nl: clean(body.summary_nl, 20000),
    article_zh: clean(body.article_zh, 100000),
    article_nl: clean(body.article_nl, 100000),
    scripture: clean(body.scripture, 1000) || scriptureArray.join('；'),
    scripture_json: JSON.stringify(scriptureArray),
    uncertain_notes: JSON.stringify(uncertainty, null, 2),
  };
}

async function submitResult(request, env, id) {
  const denied = requireToken(request, env, 'SINAN_TOKEN');
  if (denied) return denied;
  if (!env.DB) return json({ ok: false, error: 'D1 database is not configured' }, 503);
  const row = await fetchJob(env, id);
  if (!row) return json({ ok: false, error: 'media job not found' }, 404);
  if (row.status !== 'processing') return json({ ok: false, error: `job is ${row.status}` }, 409);
  const body = await request.json().catch(() => ({}));
  const result = normalizeModelResult(body);
  if (!result.transcript_text || !result.title_zh || !result.article_zh) {
    return json({ ok: false, error: 'transcript_text, title_zh and article_zh are required' }, 400);
  }
  await env.DB.prepare(
    `UPDATE media_ingest_jobs SET
       transcript_text=?, title_zh=?, title_nl=?, summary_zh=?, summary_nl=?, article_zh=?, article_nl=?,
       scripture=?, scripture_json=?, uncertain_notes=?, status='ready_for_review', ready_at=datetime('now'),
       error=NULL, updated_at=datetime('now')
     WHERE id=? AND status='processing'`,
  ).bind(
    result.transcript_text, result.title_zh, result.title_nl, result.summary_zh, result.summary_nl,
    result.article_zh, result.article_nl, result.scripture, result.scripture_json, result.uncertain_notes, id,
  ).run();
  return json({ ok: true, id, status: 'ready_for_review' });
}

async function failJob(request, env, id) {
  const denied = requireToken(request, env, 'SINAN_TOKEN');
  if (denied) return denied;
  if (!env.DB) return json({ ok: false, error: 'D1 database is not configured' }, 503);
  const body = await request.json().catch(() => ({}));
  const error = clean(body.error || 'media processing failed', 2000);
  const result = await env.DB.prepare(
    `UPDATE media_ingest_jobs SET status='failed', error=?, updated_at=datetime('now')
      WHERE id=? AND status='processing'`,
  ).bind(error, id).run();
  if (!Number(result.meta?.changes || 0)) {
    const row = await fetchJob(env, id);
    if (!row) return json({ ok: false, error: 'media job not found' }, 404);
    return json({ ok: false, error: `job is ${row.status}` }, 409);
  }
  return json({ ok: true, id, status: 'failed' });
}

async function publicAudio(env, id) {
  const unavailable = requireStorage(env);
  if (unavailable) return unavailable;
  const row = await fetchJob(env, id);
  if (!row || row.status !== 'published') return json({ ok: false, error: 'not found' }, 404);
  const object = await env.MEDIA.get(row.r2_key);
  if (!object) return json({ ok: false, error: 'not found' }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('cache-control', 'public, max-age=3600');
  headers.set('accept-ranges', 'bytes');
  if (object.size != null) headers.set('content-length', String(object.size));
  return new Response(object.body, { headers });
}

async function publicTranscript(env, id) {
  if (!env.DB) return json({ ok: false, error: 'not found' }, 404);
  const row = await fetchJob(env, id);
  if (!row || row.status !== 'published' || !row.transcript_text) return json({ ok: false, error: 'not found' }, 404);
  return new Response(row.transcript_text, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=600',
    },
  });
}

export async function handleMediaApi(request, env, url) {
  const path = url.pathname;

  if (request.method === 'POST' && path === '/api/media/upload') return upload(request, env);
  if (request.method === 'GET' && path === '/api/media/jobs') return listAdminJobs(request, env, url);

  let match = path.match(/^\/api\/media\/jobs\/([^/]+)$/);
  if (match && request.method === 'GET') return getAdminJob(request, env, decodeURIComponent(match[1]));
  if (match && request.method === 'PATCH') return updateDraft(request, env, decodeURIComponent(match[1]));

  match = path.match(/^\/api\/media\/jobs\/([^/]+)\/publish$/);
  if (match && request.method === 'POST') return publish(request, env, decodeURIComponent(match[1]));
  match = path.match(/^\/api\/media\/jobs\/([^/]+)\/retry$/);
  if (match && request.method === 'POST') return retry(request, env, decodeURIComponent(match[1]));

  if (request.method === 'GET' && path === '/api/sinan/media/jobs') return listWorkerJobs(request, env, url);
  match = path.match(/^\/api\/sinan\/media\/jobs\/([^/]+)\/claim$/);
  if (match && request.method === 'POST') return claim(request, env, decodeURIComponent(match[1]));
  match = path.match(/^\/api\/sinan\/media\/jobs\/([^/]+)\/audio$/);
  if (match && request.method === 'GET') return workerAudio(request, env, decodeURIComponent(match[1]));
  match = path.match(/^\/api\/sinan\/media\/jobs\/([^/]+)\/result$/);
  if (match && request.method === 'POST') return submitResult(request, env, decodeURIComponent(match[1]));
  match = path.match(/^\/api\/sinan\/media\/jobs\/([^/]+)\/fail$/);
  if (match && request.method === 'POST') return failJob(request, env, decodeURIComponent(match[1]));

  match = path.match(/^\/api\/media\/public\/([^/]+)\/audio$/);
  if (match && request.method === 'GET') return publicAudio(env, decodeURIComponent(match[1]));
  match = path.match(/^\/api\/media\/public\/([^/]+)\/transcript$/);
  if (match && request.method === 'GET') return publicTranscript(env, decodeURIComponent(match[1]));

  return null;
}
