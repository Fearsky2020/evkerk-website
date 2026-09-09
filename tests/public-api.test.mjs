import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const request = path => new Request(`https://evkerk.nl${path}`);

test('public schedule exposes both Sunday services', async () => {
  const response=await worker.fetch(request('/api/schedule'),{});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.schedule.zoetermeer_service.time,'10:00–12:00');
  assert.equal(body.schedule.rijswijk_service.time,'12:30–15:30');
});

test('bible chapter proxy normalizes Midvash data', async () => {
  const original=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({data:[{bookName:'John',chapter:3,reference:'John 3',verses:['v1','v2']}]});
  try {
    const response=await worker.fetch(request('/api/bible/chapter?book=John&chapter=3&version=cuvs'),{});
    assert.equal(response.status,200);
    const body=await response.json();
    assert.deepEqual(body.chapter.verses,['v1','v2']);
  } finally { globalThis.fetch=original; }
});

test('bible chapter rejects invalid requests before upstream fetch', async () => {
  const response=await worker.fetch(request('/api/bible/chapter?book=%3Cbad%3E&chapter=0&version=x'),{});
  assert.equal(response.status,400);
});
