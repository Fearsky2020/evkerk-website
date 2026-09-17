import test from 'node:test';
import assert from 'node:assert/strict';
import { handleWelcomePhotoJson } from '../src/welcome-photo-json.js';

test('iOS JSON welcome photo route requires app authentication', async()=>{
  const request=new Request('https://evkerk.nl/api/app/welcome/submissions/test-request/photo-json',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  const response=await handleWelcomePhotoJson(request,{},new URL(request.url));
  assert.equal(response.status,401);
  const body=await response.json();
  assert.equal(body.ok,false);
});

test('unrelated route is ignored', async()=>{
  const request=new Request('https://evkerk.nl/api/app/welcome',{method:'POST'});
  const response=await handleWelcomePhotoJson(request,{},new URL(request.url));
  assert.equal(response,null);
});
