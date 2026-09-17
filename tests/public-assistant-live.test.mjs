import test from 'node:test';
import assert from 'node:assert/strict';
import { handlePublicAssistantLive } from '../src/public-assistant-live.js';

function makeDb() {
  return {
    prepare(sql) {
      const statement = {
        sql,
        params: [],
        bind(...params) { this.params = params; return this; },
        async all() {
          if (sql.includes('FROM sermons')) {
            return { results: [{
              id: 'SERMON-20260913-FW19',
              sermon_date: '2026-09-13',
              title_zh: '发旺之年——预备发旺的根基（十九）：神所喜悦的人',
              title_nl: '',
              speaker: '王涛牧师',
              scripture: '希伯来书11:6',
              summary_zh: '测试摘要',
              summary_nl: '',
              audio_url: '/api/media/sermon-audio/2026/test.mp3',
              youtube_url: null,
            }] };
          }
          if (sql.includes('FROM events')) {
            return { results: [{
              id: 'event-1', title_zh: '主日聚会', title_nl: '', description_zh: '', description_nl: '',
              location: 'Piet Heinplein 13, 2712 KC Zoetermeer', start_at: '2099-01-01T10:00:00',
              end_at: '2099-01-01T12:00:00', all_day: 0, source: 'manual',
            }] };
          }
          if (sql.includes('FROM announcements')) {
            return { results: [{ id: 'a1', title_zh: '通知', title_nl: '', body_zh: '内容', body_nl: '', starts_at: null, ends_at: null, priority: 0 }] };
          }
          return { results: [] };
        },
      };
      return statement;
    },
  };
}

const env = { DB: makeDb() };

test('live assistant returns compact latest sermon data', async () => {
  const response = await handlePublicAssistantLive(
    new Request('https://evkerk.nl/api/assistant/live?kind=sermons&limit=2'), env,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.kind, 'sermons');
  assert.equal(body.sermons[0].sermon_date, '2026-09-13');
  assert.match(body.sermons[0].title_zh, /神所喜悦的人/);
  assert.equal(body.sermons[0].page_url, 'https://evkerk.nl/sermon?id=SERMON-20260913-FW19');
});

test('live assistant exposes authoritative Sunday schedule', async () => {
  const response = await handlePublicAssistantLive(
    new Request('https://evkerk.nl/api/assistant/live?kind=schedule'), env,
  );
  const body = await response.json();
  assert.equal(body.schedule[0].sunday_service, '12:30–15:30');
  assert.equal(body.schedule[1].sunday_service, '10:00–12:00');
});

test('live assistant overview stays bounded and includes all live categories', async () => {
  const response = await handlePublicAssistantLive(
    new Request('https://evkerk.nl/api/assistant/live?kind=overview&limit=3'), env,
  );
  const body = await response.json();
  assert.equal(body.kind, 'overview');
  assert.equal(body.sermons.length, 1);
  assert.equal(body.events.length, 1);
  assert.equal(body.announcements.length, 1);
  assert.equal(body.schedule.length, 2);
});

test('live assistant rejects unknown kinds', async () => {
  const response = await handlePublicAssistantLive(
    new Request('https://evkerk.nl/api/assistant/live?kind=everything'), env,
  );
  assert.equal(response.status, 400);
});
