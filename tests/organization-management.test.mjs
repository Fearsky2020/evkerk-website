import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../migrations/0023_group_organization_management.sql',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../src/organization.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../public/team/groups/app.js',import.meta.url),'utf8');

test('four-level organization schema and audit history are durable',()=>{
  for(const table of ['church_clusters','organization_role_assignments','church_members','member_app_tokens','group_notifications','organization_change_requests','organization_audit_log'])
    assert.match(migration,new RegExp('CREATE TABLE IF NOT EXISTS '+table));
  assert.match(migration,/CHECK\(role IN \('pastor','cluster_leader','group_leader'\)\)/);
  assert.doesNotMatch(migration,/DELETE FROM church_groups/);
});

test('organization APIs enforce server-side scope and expose unified App routes',()=>{
  for(const token of ['requireHuman','canCluster','canGroup','/api/app/my-group','/api/app/welcome','最终分配须由牧师或大组长确认','organization_audit_log'])
    assert.ok(api.includes(token),token);
  assert.match(api,/rows=rows\.filter\(v=>groups\(x\)\.includes\(v\.assigned_group_id\)\|\|clusters\(x\)\.includes\(v\.assigned_cluster_id\)\)/);
  assert.doesNotMatch(api,/!v\.assigned_group_id\|\|groups/);
});

test('appointments, approvals and audit endpoints are present',()=>{
  for(const route of ['/api/organization/roles','/api/organization/requests','/api/organization/audit','/revoke','/review'])
    assert.ok(api.includes(route),route);
  assert.match(api,/只有牧师可以撤销组织角色/);
  assert.match(api,/申请须由牧师或大组长审批/);
});

test('group management UI uses server APIs',()=>{
  for(const route of ['/api/organization/tree','/api/organization/groups','/api/organization/members','/api/organization/welcome'])
    assert.ok(ui.includes(route),route);
});
