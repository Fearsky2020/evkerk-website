import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAssistantChat, selectContextKind } from '../src/assistant-chat.js';

test('assistant routes time-sensitive sermon wording to live sermons', () => {
  assert.equal(selectContextKind('上个礼拜的信息是什么？', '/'), 'sermons');
  assert.equal(selectContextKind('最新讲道是什么？', '/'), 'sermons');
  assert.equal(selectContextKind('这个星期日几点聚会？', '/'), 'schedule');
  assert.equal(selectContextKind('五饼二鱼在哪里？', '/bible'), 'bible');
});

test('assistant answers sermon facts deterministically without spending model tokens', async () => {
  let aiCalls = 0;
  const env = {
    DB: {
      prepare() {
        return {
          async all() {
            return {
              results: [{
                id: 'SERMON-20260913-FW19',
                sermon_date: '2026-09-13',
                title_zh: '发旺之年——预备发旺的根基（十九）：神所喜悦的人',
                title_nl: '',
                speaker: '王涛牧师',
                scripture: '希伯来书 11:6',
                summary_zh: '测试摘要',
                summary_nl: '',
                audio_url: '/api/media/sermon-audio/test.mp3',
                youtube_url: null,
              }],
            };
          },
        };
      },
    },
    AI: {
      async run() {
        aiCalls += 1;
        return { choices: [{ message: { content: '不应该被调用' } }] };
      },
    },
  };

  const request = new Request('https://evkerk.nl/api/assistant/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: '上个礼拜的信息是什么？', history: [], page: '/' }),
  });
  const response = await handleAssistantChat(request, env, new URL(request.url));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.context, 'sermons');
  assert.equal(data.provider, 'live-data');
  assert.equal(data.model, 'deterministic');
  assert.equal(aiCalls, 0);
  assert.match(data.answer, /2026/);
  assert.match(data.answer, /预备发旺的根基（十九）/);
  assert.match(data.answer, /王涛牧师/);
});

test('assistant keeps conversation history bounded for open-ended AI replies', async () => {
  let capturedMessages = [];
  const env = {
    DB: {
      prepare() {
        return {
          async all() { return { results: [] }; },
          bind() { return this; },
        };
      },
    },
    AI: {
      async run(_model, options) {
        capturedMessages = options.messages || [];
        return { choices: [{ message: { content: '好的。' } }] };
      },
    },
  };
  const history = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `turn-${i}` }));
  const request = new Request('https://evkerk.nl/api/assistant/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: '你好', history, page: '/' }),
  });
  const response = await handleAssistantChat(request, env, new URL(request.url));
  assert.equal(response.status, 200);
  const flattened = JSON.stringify(capturedMessages);
  assert.doesNotMatch(flattened, /turn-0/);
  assert.match(flattened, /turn-11/);
});
