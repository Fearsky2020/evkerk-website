const FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/emsitao@gmail.com';
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MIN_FILL_MS = 2500;
const MAX_FILL_MS = 2 * 60 * 60 * 1000;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function countUrls(text) {
  return (String(text).match(/(?:https?:\/\/|www\.)/gi) || []).length;
}

export function classifyContactSpam({ name = '', contact = '', message = '' } = {}) {
  const joined = `${name}\n${contact}\n${message}`;
  const lower = joined.toLowerCase();
  const reasons = [];
  let score = 0;

  const blockedDomains = [
    'directoryinspector.com',
  ];
  if (blockedDomains.some((domain) => lower.includes(domain))) {
    reasons.push('blocked_domain');
    score += 10;
  }

  const urlCount = countUrls(joined);
  if (urlCount >= 3) {
    reasons.push('many_urls');
    score += 4;
  } else if (urlCount === 2) {
    score += 1;
  }

  const aggressiveMarketing = [
    /reach more customers/i,
    /automated daily classified/i,
    /1000\+ sites/i,
    /guest post/i,
    /buy backlinks?/i,
    /seo (?:service|services|package|offer)/i,
    /increase (?:your )?(?:traffic|ranking|sales)/i,
    /crypto (?:investment|offer|profit)/i,
  ];
  if (aggressiveMarketing.some((pattern) => pattern.test(joined))) {
    reasons.push('marketing_pattern');
    score += 4;
  }

  if (/\b(?:n\/a|none|null)\b/i.test(contact) && urlCount > 0) {
    reasons.push('missing_contact_with_url');
    score += 1;
  }

  return { blocked: score >= 4, score, reasons, urlCount };
}

async function clientKey(request) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ua = (request.headers.get('user-agent') || '').slice(0, 160);
  const bytes = new TextEncoder().encode(`${ip}|${ua}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function rateLimit(request, env) {
  if (!env.DB) return { allowed: true, count: 0 };
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS contact_rate_events (
      id TEXT PRIMARY KEY,
      client_key TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
  ).run();
  await env.DB.prepare(
    'CREATE INDEX IF NOT EXISTS idx_contact_rate_events_key_time ON contact_rate_events(client_key, created_at)',
  ).run();

  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const key = await clientKey(request);
  await env.DB.prepare('DELETE FROM contact_rate_events WHERE created_at < ?').bind(windowStart).run();
  const row = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM contact_rate_events WHERE client_key = ? AND created_at >= ?',
  ).bind(key, windowStart).first();
  const count = Number(row?.count || 0);
  if (count >= RATE_LIMIT_MAX) return { allowed: false, count };
  await env.DB.prepare(
    'INSERT INTO contact_rate_events (id, client_key, created_at) VALUES (?, ?, ?)',
  ).bind(crypto.randomUUID(), key, now).run();
  return { allowed: true, count: count + 1 };
}

async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET_KEY) return { success: true, skipped: true };
  if (!token) return { success: false, reason: 'missing_token' };

  const body = new URLSearchParams();
  body.set('secret', env.TURNSTILE_SECRET_KEY);
  body.set('response', token);
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) body.set('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  if (!response.ok) return { success: false, reason: `verify_http_${response.status}` };
  const result = await response.json().catch(() => ({}));
  return { success: result.success === true, result };
}

async function forwardMessage(env, { name, contact, message }) {
  if (!env.PASSWORD_RESET_EMAIL || typeof env.PASSWORD_RESET_EMAIL.send !== 'function') {
    throw new Error('email_binding_unavailable');
  }

  const text = [
    'evkerk.nl 新留言',
    '',
    `姓名 / Naam: ${name}`,
    `联系方式 / Contact: ${contact}`,
    '',
    '留言 / Bericht:',
    message,
  ].join('\n');

  await env.PASSWORD_RESET_EMAIL.send({
    to: 'emsitao@gmail.com',
    from: 'contact@evkerk.nl',
    subject: 'evkerk.nl 新留言',
    text,
  });
}

function sameOrigin(request, url) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === url.origin;
  } catch {
    return false;
  }
}

export async function handleContactApi(request, env, url) {
  if (request.method === 'GET' && url.pathname === '/api/contact/config') {
    return json({
      ok: true,
      turnstileSiteKey: env.TURNSTILE_SITE_KEY || null,
    });
  }

  if (request.method !== 'POST' || url.pathname !== '/api/contact') return null;

  if (!sameOrigin(request, url)) return json({ ok: false, error: 'invalid_origin' }, 403);

  const contentType = request.headers.get('content-type') || '';
  let body;
  if (contentType.includes('application/json')) {
    body = await request.json().catch(() => ({}));
  } else {
    const form = await request.formData().catch(() => null);
    if (!form) return json({ ok: false, error: 'invalid_form' }, 400);
    body = Object.fromEntries(form.entries());
  }

  const honeypot = clean(body.website || body._honey, 300);
  const startedAt = Number(body._started_at || 0);
  const age = Date.now() - startedAt;
  if (honeypot || !Number.isFinite(startedAt) || startedAt <= 0 || age < MIN_FILL_MS || age > MAX_FILL_MS) {
    console.warn('contact submission discarded', { reason: honeypot ? 'honeypot' : 'timing' });
    return json({ ok: true, accepted: true });
  }

  const limit = await rateLimit(request, env);
  if (!limit.allowed) {
    console.warn('contact submission rate limited', { count: limit.count });
    return json({ ok: false, error: 'rate_limited' }, 429);
  }

  const name = clean(body['姓名 / Naam'] || body.name, 100);
  const contact = clean(body['联系方式 / Contact'] || body.contact, 200);
  const message = clean(body['留言 / Bericht'] || body.message, 3000);
  if (!name || !contact || !message) return json({ ok: false, error: 'missing_fields' }, 400);

  const spam = classifyContactSpam({ name, contact, message });
  if (spam.blocked) {
    console.warn('contact spam discarded', { score: spam.score, reasons: spam.reasons, urlCount: spam.urlCount });
    return json({ ok: true, accepted: true });
  }

  const turnstileToken = clean(body['cf-turnstile-response'], 2048);
  const turnstile = await verifyTurnstile(request, env, turnstileToken);
  if (!turnstile.success) {
    console.warn('contact turnstile rejected', { reason: turnstile.reason || 'verification_failed' });
    return json({ ok: false, error: 'verification_failed' }, 403);
  }

  try {
    await forwardMessage(env, { name, contact, message });
    return json({ ok: true, accepted: true });
  } catch (error) {
    console.error('contact forward failed', error);
    return json({ ok: false, error: 'delivery_failed' }, 502);
  }
}
