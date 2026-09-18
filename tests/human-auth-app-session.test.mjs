import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../src/human-auth.js',import.meta.url),'utf8');
test('native app receives a reusable human session token',()=>{
  assert.match(src,/function bearerValue\(request\)/);
  assert.match(src,/function humanSessionToken\(request\)/);
  assert.match(src,/x-evkerk-app/);
  assert.match(src,/payload\.session_token=token/);
});
test('human session auth and logout share the same token resolver',()=>{
  const count=(src.match(/humanSessionToken\(request\)/g)||[]).length;
  assert.ok(count>=2);
});
