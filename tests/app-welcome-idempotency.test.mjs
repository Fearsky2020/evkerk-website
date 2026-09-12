import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const src=fs.readFileSync(new URL('../src/organization.js',import.meta.url),'utf8');
const sql=fs.readFileSync(new URL('../migrations/0025_app_welcome_idempotency_photos.sql',import.meta.url),'utf8');
test('app welcome submission is idempotent per member and client request',()=>{assert.match(sql,/UNIQUE INDEX[\s\S]*submitted_by_member_id,client_request_id/);assert.match(src,/client_request_id/);assert.match(src,/existing:true/)});
test('app welcome photos require scoped identity and use private R2 keys',()=>{assert.match(src,/welcome:photo/);assert.match(src,/private\/welcome-cards/);assert.match(src,/uploaded_by_member_id/);assert.match(src,/validAppPhotoBytes/);assert.doesNotMatch(src,/public\/welcome-cards/)});
test('app can reconcile a submission without seeing another member record',()=>{assert.match(src,/submissions/);assert.match(src,/submitted_by_member_id=\\?/);assert.match(src,/App 提交记录不存在/)});
