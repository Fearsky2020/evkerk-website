const TZ = 'Europe/Amsterdam';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=60, s-maxage=120' : 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

function localNowParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    local_time: `${map.hour}:${map.minute}`,
    timezone: TZ,
  };
}

function scheduleData() {
  return [
    {
      site: 'Rijswijk / Den Haag',
      church_zh: '海牙基督教福音教会',
      address: 'Oranjelaan 62, 2281 GG Rijswijk',
      sunday_service: '12:30–15:30',
      sunday_school: '12:30–14:30',
      languages: ['中文'],
    },
    {
      site: 'Zoetermeer',
      church_zh: 'Zoetermeer 福音教会',
      address: 'Piet Heinplein 13, 2712 KC Zoetermeer',
      sunday_service: '10:00–12:00',
      sunday_school: '10:00–12:00',
      languages: ['中文', 'Nederlands'],
    },
  ];
}

async function query(env, sql, params = []) {
  if (!env.DB?.prepare) return [];
  const stmt = env.DB.prepare(sql);
  const result = params.length ? await stmt.bind(...params).all() : await stmt.all();
  return result.results || [];
}

async function latestSermons(env, limit) {
  const rows = await query(env, `SELECT id, sermon_date, title_zh, title_nl, speaker, scripture,
      summary_zh, summary_nl, audio_url, youtube_url
    FROM sermons
    WHERE status='published'
    ORDER BY sermon_date DESC, published_at DESC
    LIMIT ${limit}`);
  return rows.map((row) => ({
    ...row,
    page_url: `https://evkerk.nl/sermon?id=${encodeURIComponent(row.id)}`,
  }));
}

async function upcomingEvents(env, limit) {
  const now = localNowParts();
  const rows = await query(env, `SELECT id, title_zh, title_nl, description_zh, description_nl,
      location, start_at, end_at, all_day, source
    FROM events
    WHERE status='published'
      AND (end_at IS NULL OR substr(end_at,1,10) >= ?)
    ORDER BY start_at ASC
    LIMIT ${limit}`, [now.date]);
  return rows;
}

async function activeAnnouncements(env, limit) {
  return query(env, `SELECT id, title_zh, title_nl, body_zh, body_nl, starts_at, ends_at, priority
    FROM announcements
    WHERE status='published'
      AND (starts_at IS NULL OR datetime(starts_at) <= datetime('now'))
      AND (ends_at IS NULL OR datetime(ends_at) >= datetime('now'))
    ORDER BY priority DESC, published_at DESC
    LIMIT ${limit}`);
}

export async function handlePublicAssistantLive(request, env, url = new URL(request.url)) {
  if (url.pathname !== '/api/assistant/live') return null;
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': 'content-type',
      },
    });
  }
  if (request.method !== 'GET') return json({ ok: false, error: 'method not allowed' }, 405);

  const kind = String(url.searchParams.get('kind') || 'overview').toLowerCase();
  const allowed = new Set(['overview', 'sermons', 'events', 'announcements', 'schedule']);
  if (!allowed.has(kind)) return json({ ok: false, error: 'invalid kind' }, 400);
  const requestedLimit = Number(url.searchParams.get('limit') || 3);
  const limit = Math.max(1, Math.min(5, Number.isFinite(requestedLimit) ? requestedLimit : 3));
  const asOf = localNowParts();

  try {
    if (kind === 'schedule') {
      return json({ ok: true, kind, as_of: asOf, schedule: scheduleData() });
    }
    if (kind === 'sermons') {
      return json({ ok: true, kind, as_of: asOf, sermons: await latestSermons(env, limit) });
    }
    if (kind === 'events') {
      return json({ ok: true, kind, as_of: asOf, events: await upcomingEvents(env, limit) });
    }
    if (kind === 'announcements') {
      return json({ ok: true, kind, as_of: asOf, announcements: await activeAnnouncements(env, limit) });
    }

    const [sermons, events, announcements] = await Promise.all([
      latestSermons(env, Math.min(limit, 3)),
      upcomingEvents(env, Math.min(limit, 3)),
      activeAnnouncements(env, Math.min(limit, 3)),
    ]);
    return json({
      ok: true,
      kind: 'overview',
      as_of: asOf,
      schedule: scheduleData(),
      sermons,
      events,
      announcements,
    });
  } catch (error) {
    console.error('PUBLIC_ASSISTANT_LIVE_FAILED', error?.message || error);
    return json({ ok: false, error: 'live church data unavailable' }, 503);
  }
}
