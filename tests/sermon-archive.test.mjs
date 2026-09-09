import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handleMediaApi } from '../src/media-ingest.js';

const workerSource=fs.readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
const sermonsHtml=fs.readFileSync(new URL('../public/sermons.html',import.meta.url),'utf8');
const sermonsJs=fs.readFileSync(new URL('../public/sermons.js',import.meta.url),'utf8');

function env(){
  const row={r2_key:'internal-sermons/archive/2026/test.mp3',mime_type:'audio/mpeg',filename:'20260111-test.mp3'};
  return {
    DB:{prepare(sql){let params=[];return{bind(...v){params=v;return this},async first(){return sql.includes('FROM internal_media')&&params[0]==='sermon-20260111-test'?row:null}}}},
    MEDIA:{get:async()=>({size:3,body:new Uint8Array([1,2,3]),httpEtag:'"e"',writeHttpMetadata(){}})},
  };
}

test('public sermon API is limited to 2026',()=>{
  assert.match(workerSource,/sermon_date LIKE '2026-%'/);
  assert.match(sermonsHtml,/2026 年主日讲道/);
  assert.match(sermonsJs,/完整讲道录音已上线/);
});
test('2026 archive sermon audio is publicly streamable',async()=>{
  const url='https://evkerk.nl/api/media/archive-sermon/sermon-20260111-test';
  const response=await handleMediaApi(new Request(url),env(),new URL(url));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'audio/mpeg');
  assert.equal(response.headers.get('cache-control'),'public, max-age=3600');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),new Uint8Array([1,2,3]));
});

test('archive sermon audio rejects unknown records',async()=>{
  const url='https://evkerk.nl/api/media/archive-sermon/not-found';
  const response=await handleMediaApi(new Request(url),env(),new URL(url));
  assert.equal(response.status,404);
});
