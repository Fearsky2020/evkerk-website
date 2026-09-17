import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAssistantChatV2 } from '../src/assistant-chat-v2.js';

function post(message, extra = {}) {
  return new Request('https://evkerk.nl/api/assistant/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, history: [], page: '/', ...extra }),
  });
}

test('capability answer is deterministic, plain text, and points private matters to pastor or group leader', async () => {
  let aiCalls = 0;
  const env = { AI: { async run() { aiCalls += 1; return { choices: [{ message: { content: 'unexpected' } }] }; } } };
  const request = post('你能给我什么');
  const response = await handleAssistantChatV2(request, env, new URL(request.url));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.provider, 'live-data');
  assert.equal(data.context, 'capabilities');
  assert.equal(aiCalls, 0);
  assert.doesNotMatch(data.answer, /\*\*/);
  assert.match(data.answer, /牧者或小组长/);
});

test('wilderness wandering question answers Numbers 14 instead of latest sermon', async () => {
  let aiCalls = 0;
  const env = { AI: { async run() { aiCalls += 1; return { choices: [{ message: { content: 'unexpected' } }] }; } } };
  const request = post('以色列人为什么在旷野流浪？');
  const response = await handleAssistantChatV2(request, env, new URL(request.url));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.context, 'bible');
  assert.equal(data.provider, 'bible-facts');
  assert.equal(aiCalls, 0);
  assert.match(data.answer, /民数记 14:26–35/);
  assert.match(data.answer, /不信神/);
  assert.doesNotMatch(data.answer, /预备发旺的根基/);
});

test('model markdown is normalized for the plain-text chat window', async () => {
  const env = {
    DB: {
      prepare() {
        return {
          bind() { return this; },
          async all() { return { results: [] }; },
        };
      },
    },
    AI: {
      async run() {
        return { choices: [{ message: { content: '**您好**\n[官网](https://evkerk.nl)' } }] };
      },
    },
  };
  const request = post('你好');
  const response = await handleAssistantChatV2(request, env, new URL(request.url));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.provider, 'workers-ai');
  assert.equal(data.answer, '您好\n官网：https://evkerk.nl');
});
