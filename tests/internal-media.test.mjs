import test from 'node:test';
import assert from 'node:assert/strict';
import { handleInternalMediaApi } from '../src/internal-media.js';

const endpoint = 'https://evkerk.nl/api/internal-media/hymns/001-he-er-wei-yi';

function makeEnv(services = ['media']) {
  const statement = {
    bind() { return this; },
    first: async () => ({ id: 'u1', name: 'Tester', email: 'test@example.invalid', role: 'editor', status: 'active', session_id: 's1' }),
    all: async () => ({ results: services.map(service_id => ({ service_id })) }),
    run: async () => ({ success: true }),
  };
  return {
    DB: { prepare: () => ({ ...statement }) },
    MEDIA: {
      get: async (_key, options) => {
        const ranged = options?.range?.get?.('range');
        return {
          size: 3,
          body: new Uint8Array(ranged ? [2] : [1, 2, 3]),
          range: ranged ? { offset: 1, length: 1 } : undefined,
          httpEtag: '"test-etag"',
          writeHttpMetadata() {},
        };
      },
    },
  };
}

function request(method = 'GET', headers = {}) {
  return new Request(endpoint, { method, headers });
}

test('anonymous callers cannot discover internal media', async () => {
  const response = await handleInternalMediaApi(request(), makeEnv(), new URL(endpoint));
  assert.equal(response.status, 401);
});

test('authenticated callers without media permission are forbidden', async () => {
  const response = await handleInternalMediaApi(request('GET', { cookie: 'evkerk_admin_session=test' }), makeEnv(['content']), new URL(endpoint));
  assert.equal(response.status, 403);
});

test('authorized media response is private and not cacheable', async () => {
  const response = await handleInternalMediaApi(request('GET', { cookie: 'evkerk_admin_session=test' }), makeEnv(), new URL(endpoint));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('content-type'), 'video/mp4');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3]));
});

test('authorized range request returns valid partial response', async () => {
  const headers = { cookie: 'evkerk_admin_session=test', range: 'bytes=1-1' };
  const response = await handleInternalMediaApi(request('GET', headers), makeEnv(), new URL(endpoint));
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 1-1/3');
  assert.equal(response.headers.get('content-length'), '1');
});

test('HEAD returns headers without media bytes', async () => {
  const response = await handleInternalMediaApi(request('HEAD', { cookie: 'evkerk_admin_session=test' }), makeEnv(), new URL(endpoint));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});
