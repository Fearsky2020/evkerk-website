import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker=fs.readFileSync(new URL('../src/worker-chatkit.js',import.meta.url),'utf8');
const wrangler=fs.readFileSync(new URL('../wrangler.toml',import.meta.url),'utf8');

test('worker exposes Apple app-site-association without redirect',()=>{
  assert.match(worker,/\/\.well-known\/apple-app-site-association/);
  assert.match(worker,/CU2U35ZD7K\.nl\.evkerk\.app/);
  assert.match(worker,/components:[\s\S]*\/join\/\*/);
  assert.match(worker,/content-type': 'application\/json/);
});

test('AASA path is forced through the worker before static assets',()=>{
  assert.match(wrangler,/\/\.well-known\/apple-app-site-association/);
});

test('group join web fallback remains available',()=>{
  assert.ok(worker.includes("url.pathname.match(/^\\/join\\/([^/]+)$/)"));
  assert.ok(worker.includes("new URL('/join.html', url)"));
});
