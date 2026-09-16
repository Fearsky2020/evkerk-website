import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBibleSearch } from '../src/bible-search.js';

const rows = [
  [39,6,34,'所以，不要为明天忧虑，因为明天自有明天的忧虑；一天的难处一天当就够了。'],
  [42,3,16,'神爱世人，甚至将他的独生子赐给他们，叫一切信他的，不至灭亡，反得永生。'],
  [18,23,1,'耶和华是我的牧者，我必不致缺乏。'],
];

const env = {
  ASSETS: {
    fetch: async () => Response.json({ rows }),
  },
};

test('Bible search finds a keyword and returns an openable reference', async () => {
  const request = new Request('https://evkerk.nl/api/bible/search?q=' + encodeURIComponent('不要为明天忧虑'));
  const response = await handleBibleSearch(request, env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.results[0].reference, '马太福音 6:34');
  assert.match(body.results[0].open_url, /\/bible\?book=39&chapter=6&verse=34$/);
});

test('Bible search resolves an exact Chinese reference', async () => {
  const request = new Request('https://evkerk.nl/api/bible/search?q=' + encodeURIComponent('约翰福音3:16'));
  const response = await handleBibleSearch(request, env);
  const body = await response.json();
  assert.equal(body.results[0].reference, '约翰福音 3:16');
  assert.match(body.results[0].text, /神爱世人/);
});

test('Bible search rejects an empty query', async () => {
  const response = await handleBibleSearch(new Request('https://evkerk.nl/api/bible/search'), env);
  assert.equal(response.status, 400);
});
