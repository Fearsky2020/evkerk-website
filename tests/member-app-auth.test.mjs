import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const src=fs.readFileSync(new URL('../src/member-auth.js',import.meta.url),'utf8');
const sql=fs.readFileSync(new URL('../migrations/0024_member_app_auth.sql',import.meta.url),'utf8');
test('member registration requires manual approval and token lifecycle',()=>{for(const p of ['/api/app/register','/api/app/auth/login','/api/app/auth/exchange','/api/app/auth/refresh','/api/app/auth/logout','/api/app/auth/change-code','/api/app/session'])assert.match(src,new RegExp(p.replaceAll('/','\\/')));assert.match(sql,/status TEXT NOT NULL DEFAULT 'pending'/);assert.match(src,/status='pending'/)});
test('member app credentials and tokens are hashed, scoped, expiring and revocable',()=>{assert.match(sql,/login_code_hash/);assert.match(sql,/refresh_token_hash/);assert.match(sql,/access_expires_at/);assert.match(src,/welcome:submit/);assert.match(src,/revoked_reason='logout'/);assert.doesNotMatch(src,/INSERT INTO member_app_credentials[\s\S]{0,300}login_code[^_]/)});
test('registration review is audited and initial code is shown once',()=>{assert.match(src,/member_account\.approve/);assert.match(src,/initial_login_code/);assert.match(src,/只显示一次/)});

test('staff can invite members and revoke individual app sessions',()=>{assert.match(src,/\/api\/organization\/member-invitations/);assert.match(src,/app-sessions/);assert.match(src,/member_account\.invite/);assert.match(src,/member_session\.revoke/);assert.match(src,/staff_revoke/)});
