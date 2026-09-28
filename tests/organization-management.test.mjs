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


const inviteMigration=fs.readFileSync(new URL('../migrations/0032_group_join_invites.sql',import.meta.url),'utf8');
test('group invitation QR tokens are revocable and do not store raw tokens',()=>{
  assert.match(inviteMigration,/group_join_invites/);
  assert.match(inviteMigration,/token_hash TEXT NOT NULL UNIQUE/);
  assert.doesNotMatch(inviteMigration,/token TEXT/);
  assert.match(api,/createGroupJoinInvite/);
  assert.match(api,/只有本小组组长或牧者可以生成邀请卡/);
  assert.match(api,/UPDATE group_join_invites SET status='revoked'/);
  assert.match(api,/https:\/\/evkerk\.nl\/join\//);
});
test('public invite resolution exposes only safe group application context',()=>{
  assert.match(api,/join-invite/);
  assert.match(api,/resolveGroupJoinInvite/);
  assert.match(api,/meeting_day/);
  assert.match(api,/meeting_time/);
  assert.match(api,/postcode/);
  assert.doesNotMatch(api,/resolveGroupJoinInvite[\s\S]{0,1800}meeting_address/);
});


const jointMigration=fs.readFileSync(new URL('../migrations/0034_joint_group_meeting_points.sql',import.meta.url),'utf8');
test('joint groups remain one group entity with multiple meeting points',()=>{
  assert.match(jointMigration,/ADD COLUMN group_kind/);
  assert.match(jointMigration,/CREATE TABLE IF NOT EXISTS group_meeting_points/);
  assert.match(jointMigration,/CREATE TABLE IF NOT EXISTS group_meeting_overrides/);
  assert.match(jointMigration,/UNIQUE \(group_id,meeting_date\)/);
  assert.match(api,/jointMeetingContext/);
  assert.match(api,/group_kind:'joint'/);
  assert.match(api,/current_meeting_point/);
});
test('joint group rotation never guesses a fifth-week meeting point',()=>{
  assert.match(api,/parseWeekSlots/);
  assert.match(api,/meetingDate\.weekSlot===5/);
  assert.match(api,/第 5 周聚会点待后台确认/);
  assert.match(api,/current_week_slot/);
});
test('meeting-point edits are limited to direct group leaders or pastors',()=>{
  assert.match(api,/canDirectlyManageGroup/);
  assert.match(api,/只有本小组组长或牧者可以修改聚会点/);
  assert.match(api,/只有本小组组长或牧者可以修改临时安排/);
  assert.match(api,/meeting-points/);
  assert.match(api,/meeting-overrides/);
});


test('cluster leaders can observe their cluster but cannot mutate child-group pastoral content',()=>{
  assert.match(api,/canDirectlyManageGroup/);
  assert.match(api,/只有本小组组长或牧者可以修改小组资料/);
  assert.match(api,/只有本小组组长或牧者可以管理成员/);
  assert.match(api,/canManageGroupQuestion\(x,row\).*groups\(x\)\.includes\(row\.group_id\)/s);
  assert.doesNotMatch(api,/canManageGroupQuestion\(x,row\).*clusters\(x\)\.includes/s);
});


const prayerMigration=fs.readFileSync(new URL('../migrations/0035_group_prayer_submission.sql',import.meta.url),'utf8');
test('member prayer submissions support privacy and idempotency',()=>{
  assert.match(prayerMigration,/client_request_id/);
  assert.match(prayerMigration,/idx_group_prayer_member_request/);
  assert.match(api,/\/api\/app\/my-group\/prayers/);
  assert.match(api,/visibility=b\.visibility==='leaders'\?'leaders':'group'/);
  assert.match(api,/p\.visibility='group' OR p\.member_id=\?/);
});
test('group prayer handling is limited to direct group leaders or pastors',()=>{
  assert.match(api,/function canManageGroupPrayer/);
  assert.match(api,/x\.level==='pastor'\|\|groups\(x\)\.includes\(row\.group_id\)/);
  assert.match(api,/\/api\/organization\/group-prayers/);
  assert.doesNotMatch(api,/canManageGroupPrayer[\s\S]{0,220}clusters\(x\)/);
});
