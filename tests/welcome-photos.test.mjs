import test from 'node:test';
import assert from 'node:assert/strict';
import { handleWelcomeApi } from '../src/welcome.js';

const base = 'https://evkerk.nl';
const cookie = { cookie: 'evkerk_admin_session=test' };

function makeEnv(services = ['welcome']) {
  const state = { puts: [], deletes: [], inserted: [], updated: [] };
  const user = { id: 'u1', name: 'Tester', email: 'test@example.invalid', role: 'editor', status: 'active', session_id: 's1' };
  const photo = { id: 'wphoto_1', case_id: 'case_1', r2_key: 'private/welcome-cards/case_1/wphoto_1.jpg', mime_type: 'image/jpeg', filename: 'card.jpg', size_bytes: 3, status: 'active' };
  const DB = { prepare(sql) {
    let params = [];
    return {
      bind(...values) { params = values; return this; },
      async first() {
        if (sql.includes('FROM admin_sessions')) return user;
        if (sql.includes('SELECT id FROM welcome_cases')) return params[0] === 'case_1' ? { id: 'case_1' } : null;
        if (sql.includes('FROM welcome_case_photos')) return params[0] === photo.id ? photo : null;
        return null;
      },
      async all() {
        if (sql.includes('FROM team_service_permissions')) return { results: services.map(service_id => ({ service_id })) };
        if (sql.includes('FROM welcome_case_photos')) return { results: [photo] };
        return { results: [] };
      },
      async run() {
        if (sql.includes('INSERT INTO welcome_case_photos')) state.inserted.push(params);
        if (sql.includes('UPDATE welcome_case_photos')) state.updated.push(params);
        return { success: true };
      },
    };
  }};
  const MEDIA = {
    async put(key, body, options) { state.puts.push({ key, bytes: body.byteLength, options }); },
    async get(key) {
      if (key !== photo.r2_key) return null;
      return { size: 3, body: new Uint8Array([1, 2, 3]), httpEtag: '"photo"', writeHttpMetadata() {} };
    },
    async delete(key) { state.deletes.push(key); },
  };
  return { DB, MEDIA, state };
}

function url(path) { return new URL(base + path); }
function call(request, env) { return handleWelcomeApi(request, env, new URL(request.url)); }

test('anonymous callers cannot upload newcomer cards', async () => {
  const form = new FormData();
  form.append('image', new Blob([[1]], { type: 'image/jpeg' }), 'card.jpg');
  const request = new Request(base + '/api/welcome/cases/case_1/photos', { method: 'POST', body: form });
  const response = await call(request, makeEnv());
  assert.equal(response.status, 401);
});

test('welcome coworkers upload cards to a private R2 key without leaking it', async () => {
  const env = makeEnv();
  const form = new FormData();
  form.append('image', new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0x01])], { type: 'image/jpeg' }), 'card.jpg');
  const request = new Request(base + '/api/welcome/cases/case_1/photos', { method: 'POST', headers: cookie, body: form });
  const response = await call(request, env);
  assert.equal(response.status, 201);
  assert.equal(env.state.puts.length, 1);
  assert.match(env.state.puts[0].key, /^private\/welcome-cards\/case_1\/wphoto_/);
  assert.equal(env.state.inserted.length, 1);
  const body = await response.json();
  assert.equal(body.photo.href.startsWith('/api/welcome/photos/'), true);
  assert.equal(JSON.stringify(body).includes('private/welcome-cards'), false);
});

test('newcomer card upload rejects unsupported files before storage', async () => {
  const env = makeEnv();
  const form = new FormData();
  form.append('image', new Blob([new Uint8Array([1])], { type: 'text/plain' }), 'card.txt');
  const request = new Request(base + '/api/welcome/cases/case_1/photos', { method: 'POST', headers: cookie, body: form });
  const response = await call(request, env);
  assert.equal(response.status, 415);
  assert.equal(env.state.puts.length, 0);
});

test('newcomer card upload rejects MIME spoofing before storage', async () => {
  const env = makeEnv();
  const form = new FormData();
  form.append('image', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }), 'fake.jpg');
  const request = new Request(base + '/api/welcome/cases/case_1/photos', { method: 'POST', headers: cookie, body: form });
  const response = await call(request, env);
  assert.equal(response.status, 415);
  assert.equal(env.state.puts.length, 0);
});

test('authorized card reads are private and anonymous reads are denied', async () => {
  const env = makeEnv();
  const endpoint = base + '/api/welcome/photos/wphoto_1';
  const anonymous = await call(new Request(endpoint), env);
  assert.equal(anonymous.status, 401);
  const response = await call(new Request(endpoint, { headers: cookie }), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3]));
});

test('deleting a newcomer card removes the private object and marks metadata deleted', async () => {
  const env = makeEnv();
  const endpoint = base + '/api/welcome/photos/wphoto_1';
  const response = await call(new Request(endpoint, { method: 'DELETE', headers: cookie }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(env.state.deletes, ['private/welcome-cards/case_1/wphoto_1.jpg']);
  assert.equal(env.state.updated.length, 1);
});
