import { handleSinanApi } from './sinan-ops.js';

const TZ = 'Europe/Amsterdam';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=60, s-maxage=300' : 'no-store',
    },
  });
}

function localDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

function nextSundays(count = 8) {
  const now = new Date();
  const today = localDateParts(now);
  const base = new Date(`${today.year}-${today.month}-${today.day}T12:00:00Z`);
  const day = base.getUTCDay();
  const daysUntilSunday = (7 - day) % 7;
  const first = new Date(base.getTime() + daysUntilSunday * 86400000);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(first.getTime() + i * 7 * 86400000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function fallbackServices() {
  const events = [];
  for (const date of nextSundays()) {
    events.push({
      id: `regular-zoetermeer-${date}`,
      source: 'schedule',
      title_zh: 'Zoetermeer 主日聚会',
      title_nl: 'Zondagsdienst Zoetermeer',
      description_zh: '敬拜、讲道、圣餐与主日学。',
      description_nl: 'Aanbidding, preek, avondmaal en zondagsschool.',
      location: 'Piet Heinplein 13, 2712 KC Zoetermeer',
      date,
      start_time: '10:00',
      end_time: '12:00',
      status: 'published',
    });
    events.push({
      id: `regular-rijswijk-${date}`,
      source: 'schedule',
      title_zh: '海牙 / Rijswijk 主日聚会',
      title_nl: 'Zondagsdienst Den Haag / Rijswijk',
      description_zh: '敬拜、讲道、圣餐与主日学。',
      description_nl: 'Aanbidding, preek, avondmaal en zondagsschool.',
      location: 'Oranjelaan 62, 2281 GG Rijswijk',
      date,
      start_time: '12:30',
      end_time: '15:30',
      status: 'published',
    });
  }
  return events;
}

async function queryAll(env, sql, ...params) {
  if (!env.DB) return [];
  const result = await env.DB.prepare(sql).bind(...params).all();
  return result.results || [];
}

async function listEvents(env) {
  const rows = await queryAll(
    env,
    `SELECT id, source, external_id, title_zh, title_nl, description_zh, description_nl,
            location, start_at, end_at, all_day, status, updated_at
       FROM events
      WHERE status = 'published'
        AND (end_at IS NULL OR end_at >= datetime('now','-1 day'))
      ORDER BY start_at ASC
      LIMIT 80`,
  );
  if (!rows.length) return fallbackServices();
  return rows.map((row) => ({
    ...row,
    date: row.start_at?.slice(0, 10) || '',
    start_time: row.all_day ? '' : row.start_at?.slice(11, 16) || '',
    end_time: row.all_day ? '' : row.end_at?.slice(11, 16) || '',
  }));
}

async function listSermons(env) {
  return queryAll(
    env,
    `SELECT id, sermon_date, title_zh, title_nl, speaker, scripture,
            summary_zh, summary_nl, youtube_url, audio_url, transcript_url, published_at
       FROM sermons
      WHERE status = 'published'
      ORDER BY sermon_date DESC, published_at DESC
      LIMIT 24`,
  );
}

async function listAnnouncements(env) {
  return queryAll(
    env,
    `SELECT id, title_zh, title_nl, body_zh, body_nl, starts_at, ends_at, priority, published_at
       FROM announcements
      WHERE status = 'published'
        AND (starts_at IS NULL OR starts_at <= datetime('now'))
        AND (ends_at IS NULL OR ends_at >= datetime('now'))
      ORDER BY priority DESC, published_at DESC
      LIMIT 12`,
  );
}

function bearer(request) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
}

function requireToken(request, env, name = 'INGEST_TOKEN') {
  const expected = env[name];
  if (!expected) return json({ ok: false, error: `${name} is not configured` }, 503);
  if (bearer(request) !== expected) return json({ ok: false, error: 'unauthorized' }, 401);
  return null;
}

function clean(value, max = 12000) {
  return String(value ?? '').trim().slice(0, max);
}

async function upsertSermon(request, env) {
  const denied = requireToken(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ ok: false, error: 'D1 database is not configured' }, 503);
  const body = await request.json().catch(() => ({}));
  const id = clean(body.id || crypto.randomUUID(), 100);
  const sermonDate = clean(body.sermon_date || new Date().toISOString().slice(0, 10), 20);
  await env.DB.prepare(
    `INSERT INTO sermons
      (id, sermon_date, title_zh, title_nl, speaker, scripture, summary_zh, summary_nl,
       youtube_url, audio_url, transcript_url, status, published_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       sermon_date=excluded.sermon_date, title_zh=excluded.title_zh, title_nl=excluded.title_nl,
       speaker=excluded.speaker, scripture=excluded.scripture, summary_zh=excluded.summary_zh,
       summary_nl=excluded.summary_nl, youtube_url=excluded.youtube_url, audio_url=excluded.audio_url,
       transcript_url=excluded.transcript_url, status=excluded.status, updated_at=datetime('now')`,
  ).bind(
    id, sermonDate, clean(body.title_zh, 300), clean(body.title_nl, 300), clean(body.speaker, 200),
    clean(body.scripture, 300), clean(body.summary_zh), clean(body.summary_nl), clean(body.youtube_url, 1000),
    clean(body.audio_url, 1000), clean(body.transcript_url, 1000), body.status === 'draft' ? 'draft' : 'published',
  ).run();
  return json({ ok: true, id }, 201);
}

async function upsertAnnouncement(request, env) {
  const denied = requireToken(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ ok: false, error: 'D1 database is not configured' }, 503);
  const body = await request.json().catch(() => ({}));
  const id = clean(body.id || crypto.randomUUID(), 100);
  await env.DB.prepare(
    `INSERT INTO announcements
      (id, title_zh, title_nl, body_zh, body_nl, starts_at, ends_at, priority, status, published_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       title_zh=excluded.title_zh, title_nl=excluded.title_nl, body_zh=excluded.body_zh,
       body_nl=excluded.body_nl, starts_at=excluded.starts_at, ends_at=excluded.ends_at,
       priority=excluded.priority, status=excluded.status, updated_at=datetime('now')`,
  ).bind(
    id, clean(body.title_zh, 300), clean(body.title_nl, 300), clean(body.body_zh), clean(body.body_nl),
    clean(body.starts_at, 40) || null, clean(body.ends_at, 40) || null,
    Number.isFinite(Number(body.priority)) ? Number(body.priority) : 0,
    body.status === 'draft' ? 'draft' : 'published',
  ).run();
  return json({ ok: true, id }, 201);
}

function unfoldIcs(text) {
  return text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
}

function parseIcsDate(raw) {
  if (!raw) return null;
  const value = raw.split(':').pop();
  if (/^\d{8}$/.test(value)) return `${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T00:00:00`;
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] ? 'Z' : ''}`;
}

function icsValue(line) {
  return line.slice(line.indexOf(':') + 1)
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseIcs(text) {
  const lines = unfoldIcs(text);
  const events = [];
  let current = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { current = {}; continue; }
    if (line === 'END:VEVENT') { if (current?.uid && current?.start_at) events.push(current); current = null; continue; }
    if (!current) continue;
    if (line.startsWith('UID:')) current.uid = icsValue(line);
    else if (line.startsWith('SUMMARY')) current.summary = icsValue(line);
    else if (line.startsWith('DESCRIPTION')) current.description = icsValue(line);
    else if (line.startsWith('LOCATION')) current.location = icsValue(line);
    else if (line.startsWith('DTSTART')) { current.start_at = parseIcsDate(line); current.all_day = /VALUE=DATE/.test(line) ? 1 : 0; }
    else if (line.startsWith('DTEND')) current.end_at = parseIcsDate(line);
    else if (line.startsWith('STATUS:')) current.ical_status = icsValue(line);
  }
  return events;
}

async function syncCalendar(env) {
  if (!env.DB || !env.CHURCH_CALENDAR_ICS_URL) {
    return { ok: false, skipped: true, reason: !env.DB ? 'D1 not configured' : 'calendar URL not configured' };
  }
  const response = await fetch(env.CHURCH_CALENDAR_ICS_URL, { headers: { 'user-agent': 'evkerk-calendar-sync/1.0' } });
  if (!response.ok) throw new Error(`calendar fetch failed: ${response.status}`);
  const events = parseIcs(await response.text());
  let synced = 0;
  for (const event of events) {
    const cancelled = String(event.ical_status || '').toUpperCase() === 'CANCELLED';
    const summary = clean(event.summary, 300);
    await env.DB.prepare(
      `INSERT INTO events
        (id, source, external_id, title_zh, title_nl, description_zh, description_nl,
         location, start_at, end_at, all_day, status, updated_at)
       VALUES (?, 'google_calendar', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         title_zh=excluded.title_zh, title_nl=excluded.title_nl,
         description_zh=excluded.description_zh, description_nl=excluded.description_nl,
         location=excluded.location, start_at=excluded.start_at, end_at=excluded.end_at,
         all_day=excluded.all_day, status=excluded.status, updated_at=datetime('now')`,
    ).bind(
      `gcal:${event.uid}`, event.uid, summary, summary, clean(event.description), clean(event.description),
      clean(event.location, 1000), event.start_at, event.end_at, event.all_day || 0,
      cancelled ? 'cancelled' : 'published',
    ).run();
    synced += 1;
  }
  return { ok: true, synced };
}

async function handleApi(request, env, url) {
  if (url.pathname.startsWith('/api/sinan/')) return handleSinanApi(request, env, url);
  if (request.method === 'GET' && url.pathname === '/api/health') {
    return json({ ok: true, db: Boolean(env.DB), calendar: Boolean(env.CHURCH_CALENDAR_ICS_URL), sinan: Boolean(env.SINAN_TOKEN) });
  }
  if (request.method === 'GET' && url.pathname === '/api/events') return json({ ok: true, events: await listEvents(env) });
  if (request.method === 'GET' && url.pathname === '/api/sermons') return json({ ok: true, sermons: await listSermons(env) });
  if (request.method === 'GET' && url.pathname === '/api/announcements') return json({ ok: true, announcements: await listAnnouncements(env) });
  if (request.method === 'POST' && url.pathname === '/api/ingest/sermon') return upsertSermon(request, env);
  if (request.method === 'POST' && url.pathname === '/api/ingest/announcement') return upsertAnnouncement(request, env);
  if (request.method === 'POST' && url.pathname === '/api/sync/calendar') {
    const denied = requireToken(request, env, 'SYNC_TOKEN');
    if (denied) return denied;
    try { return json(await syncCalendar(env)); }
    catch (error) { return json({ ok: false, error: error.message }, 500); }
  }
  return json({ ok: false, error: 'not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env, url);
    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(syncCalendar(env).catch((error) => console.error('calendar sync failed', error)));
  },
};
