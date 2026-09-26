import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker-enhanced.js';

async function redirected(url) {
  const response = await worker.fetch(new Request(url), {}, {});
  return {
    status: response.status,
    location: response.headers.get('location'),
  };
}

test('evkerk.com redirects to canonical evkerk.nl', async () => {
  const result = await redirected('https://evkerk.com/');
  assert.equal(result.status, 301);
  assert.equal(result.location, 'https://evkerk.nl/');
});

test('evkerk.com redirect preserves path and query', async () => {
  const result = await redirected('https://evkerk.com/sermons?page=2&lang=zh');
  assert.equal(result.status, 301);
  assert.equal(result.location, 'https://evkerk.nl/sermons?page=2&lang=zh');
});

test('www.evkerk.com redirects to canonical evkerk.nl', async () => {
  const result = await redirected('https://www.evkerk.com/bible?book=John&chapter=3');
  assert.equal(result.status, 301);
  assert.equal(result.location, 'https://evkerk.nl/bible?book=John&chapter=3');
});

test('existing www.evkerk.nl canonical redirect still works', async () => {
  const result = await redirected('https://www.evkerk.nl/activities');
  assert.equal(result.status, 301);
  assert.equal(result.location, 'https://evkerk.nl/activities');
});
