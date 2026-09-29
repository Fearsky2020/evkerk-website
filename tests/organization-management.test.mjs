import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../migrations/0023_group_organization_management.sql',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../src/organization.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../public/team/groups/app.js',import.meta.url),'utf8');
const governance=fs.readFileSync(new URL('../public/team/groups/governance.js',import.meta.url),'utf8');

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
  assert.match(api,/成员离组或转组须由牧者审批/);
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


test('cluster leaders cannot browse child-group member rosters',()=>{
  assert.match(api,/if\(kind==='members'\)[\s\S]{0,900}managedGroupIds=groups\(x\)/);
  assert.match(api,/m\.group_id IN/);
  assert.doesNotMatch(api,/if\(kind==='members'\)[\s\S]{0,900}scope\(x/);
});


test('tree overview never embeds child-group member names',()=>{
  assert.doesNotMatch(api,/members:\(mr\.results/);
  assert.match(api,/member_count/);
  assert.doesNotMatch(ui,/g\.members\.map\(x=>x\.display_name\)/);
  assert.match(ui,/组员人数/);
});


test('cluster leaders cannot review member transfer or leave requests',()=>{
  assert.match(api,/if\(x\.level!==\'pastor\'\)return json\(\{ok:false,error:'成员离组或转组须由牧者审批'\}/);
  assert.match(governance,/G\.role==='pastor'/);
  assert.doesNotMatch(governance,/G\.role!==\'group_leader\'/);
});


test('cluster leaders cannot publish cluster or child-group notifications',()=>{
  assert.match(api,/if\(st==='cluster'&&x\.level!=='pastor'\)return json\(\{ok:false,error:'只有牧者可发布大组通知'\}/);
  assert.match(api,/if\(st==='group'&&!canDirectlyManageGroup\(x,await getGroup\(env,gid\)\)\)return json\(\{ok:false,error:'只有本小组组长或牧者可以发布小组通知'\}/);
});


test('welcome data requires explicit welcome service',()=>{
  assert.match(api,/if\(!x\.services\.includes\('welcome'\)\)return json\(\{ok:false,error:'没有新人接待权限'\}/);
  assert.match(ui,/welcomeAllowed/);
  assert.match(ui,/welcomeTab\.hidden=!w\.allowed/);
});


test('newcomer dashboard counts are hidden without welcome service',()=>{
  assert.match(api,/pending_newcomers:null/);
  assert.match(ui,/S\.welcomeAllowed\?'.*待处理新人/);
});


test('cluster child-group reads are projected to operational summary',()=>{
  assert.match(api,/function presentManagedGroup/);
  assert.match(api,/can_manage:false/);
  for(const field of ['meeting_address','navigation_address','contact_phone','announcement','welcome_message','weekly_scripture_text','discussion_theme'])
    assert.ok(api.includes(field),field);
  assert.match(ui,/g\.can_manage\?'<button data-eg=/);
});


test('governance mutations and staff directory are pastor-only',()=>{
  assert.match(api,/只有牧者可以任命组织角色/);
  assert.match(api,/只有牧者可以查看同工账号列表/);
  assert.match(governance,/ga\('\/api\/organization\/staff'\)\.catch/);
  assert.match(governance,/G\.role==='pastor'\?'<label>同工账号/);
});

test('cluster leaders cannot read cluster-wide member change requests',()=>{
  assert.match(api,/directGroupIds=groups\(x\)/);
  assert.match(api,/where=x\.level==='pastor'\?'1=1'/);
  assert.match(api,/g\.id IN \('/);
});
