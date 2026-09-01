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

function denied(request, env) {
  if (!env.SINAN_TOKEN) return json({ ok: false, error: 'SINAN_TOKEN is not configured' }, 503);
  if (bearer(request) !== env.SINAN_TOKEN) return json({ ok: false, error: 'unauthorized' }, 401);
  return null;
}

function id(prefix) {
  return `${prefix}-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
}

const ALLOWED_INTENTS = new Set([
  'announcement.publish',
  'announcement.unpublish',
  'sermon.publish',
  'sermon.unpublish',
  'calendar.create',
  'calendar.update',
  'calendar.cancel',
  'media.publish',
]);

function classifyRisk(type, payload = {}) {
  if (type === 'calendar.update' || type === 'calendar.cancel') return 'high';
  if (type === 'announcement.unpublish' || type === 'sermon.unpublish') return 'high';
  if (type === 'announcement.publish') {
    if (payload.major === true || Number(payload.priority || 0) >= 10) return 'high';
    return 'medium';
  }
  if (type === 'calendar.create' || type === 'media.publish') return 'medium';
  if (type === 'sermon.publish') return 'low';
  return 'high';
}

function isExternal(type) {
  return type.startsWith('calendar.') || type === 'media.publish' || type === 'external.undo';
}

function approvalSummary(type, payload) {
  if (type === 'calendar.update') {
    return `修改聚会：${clean(payload.selector || payload.title_zh || payload.title || '未命名聚会', 180)}${payload.start_at ? ` → ${clean(payload.start_at, 80)}` : ''}${payload.location ? `；地点 ${clean(payload.location, 180)}` : ''}`;
  }
  if (type === 'calendar.cancel') return `取消聚会：${clean(payload.selector || payload.title_zh || payload.title || '未命名聚会', 180)}`;
  if (type === 'announcement.unpublish') return `撤下公告：${clean(payload.id || payload.title_zh || '', 180)}`;
  if (type === 'sermon.unpublish') return `撤下讲道：${clean(payload.id || payload.title_zh || '', 180)}`;
  if (type === 'announcement.publish') return `发布重要公告：${clean(payload.title_zh || payload.body_zh || '', 180)}`;
  return `${type}: ${clean(JSON.stringify(payload), 220)}`;
}

async function fetchRow(env, table, entityId) {
  return env.DB.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(entityId).first();
}

async function audit(env, { operationId, job, action, entityType, entityId, before, after, reversible = true }) {
  await env.DB.prepare(
    `INSERT INTO sinan_audit_log
      (operation_id, job_id, actor, channel, action, entity_type, entity_id,
       before_json, after_json, reversible, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'complete')`,
  ).bind(
    operationId,
    job.id,
    job.actor,
    job.channel || 'qq',
    action,
    entityType || null,
    entityId || null,
    before == null ? null : JSON.stringify(before),
    after == null ? null : JSON.stringify(after),
    reversible ? 1 : 0,
  ).run();
}

async function saveAnnouncement(env, payload) {
  const entityId = clean(payload.id || crypto.randomUUID(), 100);
  const before = await fetchRow(env, 'announcements', entityId);
  await env.DB.prepare(
    `INSERT INTO announcements
      (id, title_zh, title_nl, body_zh, body_nl, starts_at, ends_at, priority, status, published_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       title_zh=excluded.title_zh, title_nl=excluded.title_nl,
       body_zh=excluded.body_zh, body_nl=excluded.body_nl,
       starts_at=excluded.starts_at, ends_at=excluded.ends_at,
       priority=excluded.priority, status='published', updated_at=datetime('now')`,
  ).bind(
    entityId,
    clean(payload.title_zh, 300),
    clean(payload.title_nl, 300),
    clean(payload.body_zh),
    clean(payload.body_nl),
    clean(payload.starts_at, 40) || null,
    clean(payload.ends_at, 40) || null,
    Number.isFinite(Number(payload.priority)) ? Number(payload.priority) : 0,
  ).run();
  return { entityType: 'announcement', entityId, before, after: await fetchRow(env, 'announcements', entityId) };
}

async function saveSermon(env, payload) {
  const entityId = clean(payload.id || crypto.randomUUID(), 100);
  const before = await fetchRow(env, 'sermons', entityId);
  const sermonDate = clean(payload.sermon_date || new Date().toISOString().slice(0, 10), 20);
  await env.DB.prepare(
    `INSERT INTO sermons
      (id, sermon_date, title_zh, title_nl, speaker, scripture, summary_zh, summary_nl,
       youtube_url, audio_url, transcript_url, status, published_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       sermon_date=excluded.sermon_date, title_zh=excluded.title_zh, title_nl=excluded.title_nl,
       speaker=excluded.speaker, scripture=excluded.scripture,
       summary_zh=excluded.summary_zh, summary_nl=excluded.summary_nl,
       youtube_url=excluded.youtube_url, audio_url=excluded.audio_url,
       transcript_url=excluded.transcript_url, status='published', updated_at=datetime('now')`,
  ).bind(
    entityId, sermonDate, clean(payload.title_zh, 300), clean(payload.title_nl, 300),
    clean(payload.speaker, 200), clean(payload.scripture, 300), clean(payload.summary_zh),
    clean(payload.summary_nl), clean(payload.youtube_url, 1000), clean(payload.audio_url, 1000),
    clean(payload.transcript_url, 1000),
  ).run();
  return { entityType: 'sermon', entityId, before, after: await fetchRow(env, 'sermons', entityId) };
}

async function unpublish(env, table, entityType, entityId) {
  const before = await fetchRow(env, table, entityId);
  if (!before) throw new Error(`${entityType} not found`);
  await env.DB.prepare(`UPDATE ${table} SET status='draft', updated_at=datetime('now') WHERE id=?`).bind(entityId).run();
  return { entityType, entityId, before, after: await fetchRow(env, table, entityId) };
}

async function executeLocal(env, job) {
  const payload = JSON.parse(job.payload_json || '{}');
  let change;
  if (job.intent_type === 'announcement.publish') change = await saveAnnouncement(env, payload);
  else if (job.intent_type === 'sermon.publish') change = await saveSermon(env, payload);
  else if (job.intent_type === 'announcement.unpublish') change = await unpublish(env, 'announcements', 'announcement', clean(payload.id, 100));
  else if (job.intent_type === 'sermon.unpublish') change = await unpublish(env, 'sermons', 'sermon', clean(payload.id, 100));
  else throw new Error('intent requires external executor');

  const operationId = id('OP');
  await audit(env, {
    operationId,
    job,
    action: job.intent_type,
    entityType: change.entityType,
    entityId: change.entityId,
    before: change.before,
    after: change.after,
    reversible: true,
  });
  const result = { ok: true, operation_id: operationId, entity_type: change.entityType, entity_id: change.entityId };
  await env.DB.prepare(
    `UPDATE sinan_jobs SET status='complete', result_json=?, completed_at=datetime('now'), updated_at=datetime('now') WHERE id=?`,
  ).bind(JSON.stringify(result), job.id).run();
  return result;
}

async function getJob(env, jobId) {
  return env.DB.prepare('SELECT * FROM sinan_jobs WHERE id=?').bind(jobId).first();
}

async function submitIntent(request, env) {
  const body = await request.json().catch(() => ({}));
  const type = clean(body.type, 80);
  if (!ALLOWED_INTENTS.has(type)) return json({ ok: false, error: 'intent type not allowed' }, 400);
  const actor = clean(body.actor, 200);
  if (!actor) return json({ ok: false, error: 'actor required' }, 400);
  const channel = clean(body.channel || 'qq', 40);
  const sourceMessageId = clean(body.source_message_id, 240) || null;
  const requestText = clean(body.request_text, 4000) || null;
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const risk = classifyRisk(type, payload);
  const jobId = id('JOB');
  const status = risk === 'high' ? 'pending_approval' : (isExternal(type) ? 'pending_executor' : 'executing');

  await env.DB.prepare(
    `INSERT INTO sinan_jobs
      (id, intent_type, risk_level, status, actor, channel, source_message_id, request_text, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(jobId, type, risk, status, actor, channel, sourceMessageId, requestText, JSON.stringify(payload)).run();

  if (risk === 'high') {
    const approvalId = id('CH-A');
    const summary = approvalSummary(type, payload);
    await env.DB.prepare(
      `INSERT INTO sinan_approvals (id, job_id, actor, summary, status, expires_at)
       VALUES (?, ?, ?, ?, 'pending', datetime('now','+15 minutes'))`,
    ).bind(approvalId, jobId, actor, summary).run();
    return json({ ok: true, job_id: jobId, risk, status: 'pending_approval', approval: { id: approvalId, summary, expires_minutes: 15 } }, 202);
  }

  if (isExternal(type)) {
    return json({ ok: true, job_id: jobId, risk, status: 'pending_executor' }, 202);
  }

  try {
    const job = await getJob(env, jobId);
    const result = await executeLocal(env, job);
    return json({ ok: true, job_id: jobId, risk, status: 'complete', ...result }, 201);
  } catch (error) {
    await env.DB.prepare(`UPDATE sinan_jobs SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`).bind(clean(error.message, 1000), jobId).run();
    return json({ ok: false, job_id: jobId, error: error.message }, 500);
  }
}

async function decideApproval(request, env, approvalId) {
  const body = await request.json().catch(() => ({}));
  const actor = clean(body.actor, 200);
  const decision = clean(body.decision, 20).toLowerCase();
  if (!['approve', 'reject'].includes(decision)) return json({ ok: false, error: 'decision must be approve or reject' }, 400);
  const approval = await env.DB.prepare('SELECT * FROM sinan_approvals WHERE id=?').bind(approvalId).first();
  if (!approval) return json({ ok: false, error: 'approval not found' }, 404);
  if (!actor || actor !== approval.actor) return json({ ok: false, error: 'approval actor mismatch' }, 403);
  if (approval.status !== 'pending') return json({ ok: false, error: `approval is ${approval.status}` }, 409);
  const expired = await env.DB.prepare(`SELECT datetime('now') > ? AS expired`).bind(approval.expires_at).first();
  if (Number(expired?.expired || 0) === 1) {
    await env.DB.prepare(`UPDATE sinan_approvals SET status='expired', decided_at=datetime('now') WHERE id=?`).bind(approvalId).run();
    await env.DB.prepare(`UPDATE sinan_jobs SET status='expired', updated_at=datetime('now') WHERE id=?`).bind(approval.job_id).run();
    return json({ ok: false, error: 'approval expired' }, 410);
  }
  if (decision === 'reject') {
    await env.DB.prepare(`UPDATE sinan_approvals SET status='rejected', decided_at=datetime('now'), decided_by=? WHERE id=?`).bind(actor, approvalId).run();
    await env.DB.prepare(`UPDATE sinan_jobs SET status='rejected', updated_at=datetime('now') WHERE id=?`).bind(approval.job_id).run();
    return json({ ok: true, approval_id: approvalId, job_id: approval.job_id, status: 'rejected' });
  }

  await env.DB.prepare(`UPDATE sinan_approvals SET status='approved', decided_at=datetime('now'), decided_by=? WHERE id=?`).bind(actor, approvalId).run();
  const job = await getJob(env, approval.job_id);
  if (!job) return json({ ok: false, error: 'job not found' }, 404);
  if (isExternal(job.intent_type)) {
    await env.DB.prepare(`UPDATE sinan_jobs SET status='pending_executor', updated_at=datetime('now') WHERE id=?`).bind(job.id).run();
    return json({ ok: true, approval_id: approvalId, job_id: job.id, status: 'pending_executor' }, 202);
  }
  try {
    await env.DB.prepare(`UPDATE sinan_jobs SET status='executing', updated_at=datetime('now') WHERE id=?`).bind(job.id).run();
    const result = await executeLocal(env, job);
    return json({ ok: true, approval_id: approvalId, job_id: job.id, status: 'complete', ...result });
  } catch (error) {
    await env.DB.prepare(`UPDATE sinan_jobs SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`).bind(clean(error.message, 1000), job.id).run();
    return json({ ok: false, job_id: job.id, error: error.message }, 500);
  }
}

async function listJobs(env, url) {
  const status = clean(url.searchParams.get('status'), 60);
  const actor = clean(url.searchParams.get('actor'), 200);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 20)));
  const clauses = [];
  const values = [];
  if (status) { clauses.push('status=?'); values.push(status); }
  if (actor) { clauses.push('actor=?'); values.push(actor); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await env.DB.prepare(
    `SELECT id, intent_type, risk_level, status, actor, channel, source_message_id, request_text,
            payload_json, result_json, error, created_at, updated_at, completed_at
       FROM sinan_jobs ${where} ORDER BY created_at DESC LIMIT ${limit}`,
  ).bind(...values).all();
  return json({ ok: true, jobs: result.results || [] });
}

async function completeExternal(request, env, jobId) {
  const body = await request.json().catch(() => ({}));
  const job = await getJob(env, jobId);
  if (!job) return json({ ok: false, error: 'job not found' }, 404);
  if (job.status !== 'pending_executor' && job.status !== 'executing') return json({ ok: false, error: `job is ${job.status}` }, 409);
  const operationId = id('OP');
  const before = body.before && typeof body.before === 'object' ? body.before : null;
  const after = body.after && typeof body.after === 'object' ? body.after : (body.result && typeof body.result === 'object' ? body.result : null);
  const reversible = Boolean(body.reversible && before);
  await audit(env, {
    operationId,
    job,
    action: job.intent_type,
    entityType: clean(body.entity_type, 80) || 'external',
    entityId: clean(body.entity_id, 200) || null,
    before,
    after,
    reversible,
  });
  const result = { ...(body.result && typeof body.result === 'object' ? body.result : {}), operation_id: operationId };
  await env.DB.prepare(`UPDATE sinan_jobs SET status='complete', result_json=?, completed_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).bind(JSON.stringify(result), jobId).run();
  return json({ ok: true, job_id: jobId, status: 'complete', operation_id: operationId });
}

async function failExternal(request, env, jobId) {
  const body = await request.json().catch(() => ({}));
  const error = clean(body.error || 'executor failed', 1200);
  const job = await getJob(env, jobId);
  if (!job) return json({ ok: false, error: 'job not found' }, 404);
  await env.DB.prepare(`UPDATE sinan_jobs SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`).bind(error, jobId).run();
  return json({ ok: true, job_id: jobId, status: 'failed' });
}

async function restoreLocalAudit(env, auditRow, actor) {
  const table = auditRow.entity_type === 'announcement' ? 'announcements' : auditRow.entity_type === 'sermon' ? 'sermons' : null;
  if (!table) return null;
  const before = auditRow.before_json ? JSON.parse(auditRow.before_json) : null;
  const current = await fetchRow(env, table, auditRow.entity_id);
  if (!before) {
    await env.DB.prepare(`DELETE FROM ${table} WHERE id=?`).bind(auditRow.entity_id).run();
  } else {
    const columns = Object.keys(before).filter((key) => key !== 'id');
    const setters = columns.map((key) => `${key}=?`).join(',');
    await env.DB.prepare(`UPDATE ${table} SET ${setters} WHERE id=?`).bind(...columns.map((key) => before[key]), auditRow.entity_id).run();
  }
  const undoJob = { id: id('UNDOJOB'), actor, channel: 'qq' };
  const undoOperationId = id('OP');
  await audit(env, {
    operationId: undoOperationId,
    job: undoJob,
    action: `undo:${auditRow.action}`,
    entityType: auditRow.entity_type,
    entityId: auditRow.entity_id,
    before: current,
    after: before,
    reversible: false,
  });
  await env.DB.prepare(`UPDATE sinan_audit_log SET status='undone', undone_at=datetime('now') WHERE operation_id=?`).bind(auditRow.operation_id).run();
  return undoOperationId;
}

async function undoOperation(request, env) {
  const body = await request.json().catch(() => ({}));
  const actor = clean(body.actor, 200);
  const requested = clean(body.operation_id, 80);
  if (!actor) return json({ ok: false, error: 'actor required' }, 400);
  let row;
  if (requested) {
    row = await env.DB.prepare(`SELECT * FROM sinan_audit_log WHERE operation_id=? AND actor=?`).bind(requested, actor).first();
  } else {
    row = await env.DB.prepare(`SELECT * FROM sinan_audit_log WHERE actor=? AND status='complete' ORDER BY created_at DESC LIMIT 1`).bind(actor).first();
  }
  if (!row) return json({ ok: false, error: 'no matching operation' }, 404);
  if (row.status !== 'complete') return json({ ok: false, error: `operation is ${row.status}` }, 409);
  if (!Number(row.reversible)) return json({ ok: false, error: 'operation is not reversible' }, 409);

  const localUndo = await restoreLocalAudit(env, row, actor);
  if (localUndo) return json({ ok: true, source_operation_id: row.operation_id, operation_id: localUndo, status: 'complete' });

  const jobId = id('JOB');
  const payload = { source_operation_id: row.operation_id, action: row.action, entity_type: row.entity_type, entity_id: row.entity_id, before: row.before_json ? JSON.parse(row.before_json) : null, after: row.after_json ? JSON.parse(row.after_json) : null };
  await env.DB.prepare(
    `INSERT INTO sinan_jobs (id, intent_type, risk_level, status, actor, channel, request_text, payload_json)
     VALUES (?, 'external.undo', 'medium', 'pending_executor', ?, 'qq', 'undo operation', ?)`,
  ).bind(jobId, actor, JSON.stringify(payload)).run();
  return json({ ok: true, source_operation_id: row.operation_id, job_id: jobId, status: 'pending_executor' }, 202);
}

async function dashboard(env, url) {
  const actor = clean(url.searchParams.get('actor'), 200);
  const pendingApprovals = await env.DB.prepare(
    `SELECT id, job_id, summary, status, created_at, expires_at FROM sinan_approvals
      WHERE status='pending' ${actor ? 'AND actor=?' : ''} ORDER BY created_at DESC LIMIT 10`,
  ).bind(...(actor ? [actor] : [])).all();
  const pendingJobs = await env.DB.prepare(
    `SELECT id, intent_type, risk_level, status, created_at, error FROM sinan_jobs
      WHERE status IN ('pending_executor','failed') ${actor ? 'AND actor=?' : ''} ORDER BY created_at DESC LIMIT 10`,
  ).bind(...(actor ? [actor] : [])).all();
  const latest = actor ? await env.DB.prepare(
    `SELECT operation_id, action, entity_type, entity_id, reversible, status, created_at
       FROM sinan_audit_log WHERE actor=? ORDER BY created_at DESC LIMIT 1`,
  ).bind(actor).first() : null;
  return json({ ok: true, pending_approvals: pendingApprovals.results || [], pending_jobs: pendingJobs.results || [], latest_operation: latest || null });
}

export async function handleSinanApi(request, env, url) {
  const auth = denied(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: 'D1 database is not configured' }, 503);

  if (request.method === 'POST' && url.pathname === '/api/sinan/intents') return submitIntent(request, env);
  if (request.method === 'GET' && url.pathname === '/api/sinan/jobs') return listJobs(env, url);
  if (request.method === 'GET' && url.pathname === '/api/sinan/dashboard') return dashboard(env, url);
  if (request.method === 'POST' && url.pathname === '/api/sinan/undo') return undoOperation(request, env);

  let match = url.pathname.match(/^\/api\/sinan\/approvals\/([^/]+)\/decision$/);
  if (request.method === 'POST' && match) return decideApproval(request, env, decodeURIComponent(match[1]));
  match = url.pathname.match(/^\/api\/sinan\/jobs\/([^/]+)\/complete$/);
  if (request.method === 'POST' && match) return completeExternal(request, env, decodeURIComponent(match[1]));
  match = url.pathname.match(/^\/api\/sinan\/jobs\/([^/]+)\/fail$/);
  if (request.method === 'POST' && match) return failExternal(request, env, decodeURIComponent(match[1]));

  return json({ ok: false, error: 'sinan endpoint not found' }, 404);
}
