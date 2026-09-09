import test from 'node:test';
import assert from 'node:assert/strict';
import { handleInternalMediaApi, guardInternalMediaPage } from '../src/internal-media.js';

const endpoint = 'https://evkerk.nl/api/internal-media/hymns/001-he-er-wei-yi';

function makeEnv(services = ['media']) {
  const user = { id: 'u1', name: 'Tester', email: 'test@example.invalid', role: 'editor', status: 'active', session_id: 's1' };
  const media = { id:'001-he-er-wei-yi', category:'hymn', title_zh:'合而为一', title_nl:'Eén in Christus', r2_key:'internal-hymns/reference/001-he-er-wei-yi.mp4', mime_type:'video/mp4', filename:'001-he-er-wei-yi.mp4' };
  const DB = { prepare(sql) {
    let params=[];
    return {
      bind(...values){params=values;return this},
      async first(){
        if(sql.includes('FROM admin_sessions'))return user;
        if(sql.includes('FROM internal_media'))return params[0]===media.id?media:null;
        return null;
      },
      async all(){
        if(sql.includes('FROM team_service_permissions'))return {results:services.map(service_id=>({service_id}))};
        if(sql.includes('FROM internal_media'))return {results:[{id:media.id,category:media.category,title_zh:media.title_zh,title_nl:media.title_nl,mime_type:media.mime_type}]};
        return {results:[]};
      },
      async run(){return {success:true}},
    };
  }};
  return {
    DB,
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

const catalogEndpoint = 'https://evkerk.nl/api/internal-media/items';

test('anonymous callers cannot list internal media catalog', async () => {
  const response = await handleInternalMediaApi(new Request(catalogEndpoint), makeEnv(), new URL(catalogEndpoint));
  assert.equal(response.status, 401);
});

test('media coworkers can list internal media without storage keys leaking', async () => {
  const request = new Request(catalogEndpoint, { headers: { cookie: 'evkerk_admin_session=test' } });
  const response = await handleInternalMediaApi(request, makeEnv(), new URL(catalogEndpoint));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const body = await response.json();
  assert.equal(body.items[0].id, '001-he-er-wei-yi');
  assert.equal(body.items[0].title_zh, '合而为一');
  assert.equal(body.items[0].href, '/api/internal-media/items/001-he-er-wei-yi');
  assert.equal(JSON.stringify(body).includes('internal-hymns/reference'), false);
});

const mediaPageEndpoint = 'https://evkerk.nl/team/media/';

test('anonymous callers cannot open the internal media page shell', async () => {
  const response = await guardInternalMediaPage(new Request(mediaPageEndpoint), makeEnv(), new URL(mediaPageEndpoint));
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://evkerk.nl/team/');
});

test('coworkers without media permission are redirected from the media page', async () => {
  const request = new Request(mediaPageEndpoint, { headers: { cookie: 'evkerk_admin_session=test' } });
  const response = await guardInternalMediaPage(request, makeEnv(['content']), new URL(mediaPageEndpoint));
  assert.equal(response.status, 302);
});

test('media coworkers are allowed through to the media page asset', async () => {
  const request = new Request(mediaPageEndpoint, { headers: { cookie: 'evkerk_admin_session=test' } });
  const response = await guardInternalMediaPage(request, makeEnv(['media']), new URL(mediaPageEndpoint));
  assert.equal(response, null);
});
