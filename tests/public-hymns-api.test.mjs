import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePublicHymnsApi} from '../src/public-hymns.js';

function db(rows,item){return {prepare(sql){return {bind(){return {first:async()=>item||null}},all:async()=>({results:rows})}}}}

test('public hymn catalog returns sorted app-safe rows',async()=>{
  const env={DB:db([{id:'001-x',title_zh:'第一首',title_nl:'',filename:'001.mp4',sort_order:10},{id:'002-x',title_zh:'第二首',title_nl:'',filename:'002.mp4',sort_order:20}])};
  const response=await handlePublicHymnsApi(new Request('https://evkerk.nl/api/hymns'),env,new URL('https://evkerk.nl/api/hymns'));
  assert.equal(response.status,200);const body=await response.json();assert.equal(body.count,2);assert.equal(body.hymns[0].no,1);assert.equal(body.hymns[1].video_url,'/api/hymns/002-x');
});

test('public hymn item rejects unknown ids',async()=>{
  const env={DB:db([],null),MEDIA:{get:async()=>null}};
  const url=new URL('https://evkerk.nl/api/hymns/nope');const response=await handlePublicHymnsApi(new Request(url),env,url);assert.equal(response.status,404);
});
