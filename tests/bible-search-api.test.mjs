import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBibleSearch } from '../src/bible-search.js';

const rows = [
  [39,6,34,'所以，不要为明天忧虑，因为明天自有明天的忧虑；一天的难处一天当就够了。'],
  [42,3,16,'神爱世人，甚至将他的独生子赐给他们，叫一切信他的，不至灭亡，反得永生。'],
  [18,23,1,'耶和华是我的牧者，我必不致缺乏。'],
  [11,4,39,'有一个人从田野掐了一兜野瓜回来，切了搁在熬汤的锅中，因为他们不知道是什么东西。'],
  [11,4,40,'倒出来给众人吃的时候，都喊叫说：神人哪，锅中有致死的毒物！所以众人不能吃了。'],
  [11,4,41,'以利沙说：拿点面来，就把面撒在锅中，说：倒出来，给众人吃吧！锅中就没有毒了。'],
  [11,5,1,'亚兰王的元帅乃缦，在他主人面前为尊为大，因耶和华曾借他使亚兰人得胜；他又是大能的勇士，只是长了大麻风。'],
  [11,5,10,'以利沙打发一个使者，对乃缦说：你去在约旦河中沐浴七回，你的肉就必复原，而得洁净。'],
  [11,6,5,'有一人砍树的时候，斧头掉在水里，他就呼叫说：哀哉！我主啊，这斧子是借的。'],
  [43,6,9,'在这里有一个孩童，带着五个大麦饼、两条鱼，只是分给这许多人还算什么呢？'],
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

test('Bible search maps poison-gourd shorthand to the Elisha story', async () => {
  const request = new Request('https://evkerk.nl/api/bible/search?q=' + encodeURIComponent('有人吃了毒瓜'));
  const response = await handleBibleSearch(request, env);
  const body = await response.json();
  assert.equal(body.mode, 'story_hint');
  assert.ok(body.results.some(x => x.book_index === 11 && x.chapter === 4 && x.verse === 39));
  assert.ok(body.results.some(x => x.book_index === 11 && x.chapter === 4 && x.verse === 40));
});

test('Bible search maps vague prophet-healing language to Naaman', async () => {
  const request = new Request('https://evkerk.nl/api/bible/search?q=' + encodeURIComponent('有个人曾经去找一个先知治病'));
  const response = await handleBibleSearch(request, env);
  const body = await response.json();
  assert.equal(body.mode, 'story_hint');
  assert.ok(body.results.some(x => x.book_index === 11 && x.chapter === 5));
});

test('Bible search keeps familiar story shorthand deterministic', async () => {
  const request = new Request('https://evkerk.nl/api/bible/search?q=' + encodeURIComponent('有个小孩子拿吃的给耶稣'));
  const response = await handleBibleSearch(request, env);
  const body = await response.json();
  assert.equal(body.mode, 'story_hint');
  assert.ok(body.results.some(x => x.book_index === 43 && x.chapter === 6 && x.verse === 9));
});

test('Bible search rejects an empty query', async () => {
  const response = await handleBibleSearch(new Request('https://evkerk.nl/api/bible/search'), env);
  assert.equal(response.status, 400);
});
