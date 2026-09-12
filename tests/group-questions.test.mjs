import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseMemberScopes } from '../src/member-auth.js';
import { handleOrganizationApi, canManageGroupQuestion } from '../src/organization.js';

const api=fs.readFileSync(new URL('../src/organization.js',import.meta.url),'utf8');
const auth=fs.readFileSync(new URL('../src/member-auth.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../migrations/0026_group_questions.sql',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../public/team/groups/questions.js',import.meta.url),'utf8');
const body={book:'罗马书',chapter:10,verse_start:1,verse_end:2,reference:'罗马书 10:1-2',scripture_text:'弟兄们，我心里所愿的。',question:'这里所说的得救是什么意思？',client_request_id:'ios-req-000001',group_id:'group-forged',member_id:'MEM-FORGED'};
function envFor(options={}){
 const state={insertArgs:null,listArgs:null,listSql:'',...options};
 const tokenRow=state.tokenValid===false?null:{token_id:'ATK-1',scopes:state.scopes??'my-group:read my-group:question:submit',access_expires_at:'2099-01-01T00:00:00.000Z',member_id:'MEM-1',display_name:'王牧师',member_status:'active',cluster_id:'cluster-3',group_id:state.groupId===undefined?'group-01':state.groupId};
 const DB={prepare(sql){let args=[];return{bind(...v){args=v;return this},async first(){
  if(sql.includes('FROM member_app_tokens t JOIN church_members m'))return tokenRow;
  if(sql.startsWith('SELECT id,group_number,name,cluster_id FROM church_groups'))return state.groupId===null?null:{id:'group-01',group_number:1,name:'陈薇小组',cluster_id:'cluster-3'};
  if(sql.startsWith('SELECT id,status,reference,created_at FROM group_questions'))return state.existing??null;
  if(sql.startsWith('SELECT COUNT(*) count FROM group_questions WHERE member_id'))return{count:state.recent??0};
  if(sql.startsWith('SELECT created_at FROM group_questions'))return{created_at:'2026-09-13 00:00:00'};
  return null;
 },async all(){
  if(sql.includes('SELECT q.id,q.book')){state.listSql=sql;state.listArgs=args;return{results:state.listRows??[{id:'Q-1',book:'罗马书',chapter:10,verse_start:1,verse_end:2,reference:'罗马书 10:1-2',scripture_text:'经文',question:'问题',status:'pending',source:'ios',created_at:'2026-09-13 00:00:00',updated_at:'2026-09-13 00:00:00',discussed_at:null,closed_at:null,group_number:1,group_name:'陈薇小组'}]}};
  return{results:[]};
 },async run(){if(sql.startsWith('INSERT INTO group_questions'))state.insertArgs=args;return{success:true}}}}};
 return{env:{DB},state};
}
function request(path,{method='GET',token=true,payload=body}={}){return new Request('https://evkerk.nl'+path,{method,headers:{...(token?{authorization:'Bearer test-token'}:{}),...(method==='POST'?{'content-type':'application/json','x-evkerk-platform':'ios'}:{})},body:method==='POST'?JSON.stringify(payload):undefined})}
async function callPost(options={}){const x=envFor(options),response=await handleOrganizationApi(request('/api/app/my-group/questions',{method:'POST'}),x.env,new URL('https://evkerk.nl/api/app/my-group/questions'));return{x,response,json:await response.json()}}
test('group questions schema has lifecycle and ownership fields',()=>{for(const c of ['member_id','cluster_id','group_id','client_request_id','handler_note','discussed_at','closed_at'])assert.match(migration,new RegExp('\\b'+c+'\\b'))});
test('group questions schema has three requested indexes',()=>{for(const x of ['group_status_created','member_created','cluster_created'])assert.match(migration,new RegExp(x))});
test('member and request id provide idempotency',()=>assert.match(migration,/UNIQUE\(member_id, client_request_id\)/));
test('login exchange and refresh issue question submit scope',()=>{assert.match(auth,/my-group:question:submit/);assert.match(auth,/parseMemberScopes\(\[\.\.\.scopes/);assert.match(auth,/parseMemberScopes\(row\.scopes\)/)});
test('authorized grouped member can submit a question',async()=>{const{x,response,json}=await callPost();assert.equal(response.status,201);assert.equal(json.status,'pending');assert.equal(json.group.name,'陈薇小组');assert.ok(x.state.insertArgs)});
test('server derives member cluster and group from token',async()=>{const{x}=await callPost();assert.deepEqual(x.state.insertArgs.slice(1,4),['MEM-1','cluster-3','group-01'])});
test('forged client group and member identifiers are ignored',async()=>{const{x}=await callPost();assert.ok(!x.state.insertArgs.includes('group-forged'));assert.ok(!x.state.insertArgs.includes('MEM-FORGED'))});
test('anonymous question submit returns 401',async()=>{const x=envFor({tokenValid:false}),r=await handleOrganizationApi(request('/api/app/my-group/questions',{method:'POST',token:false}),x.env,new URL('https://evkerk.nl/api/app/my-group/questions'));assert.equal(r.status,401)});
test('token without question scope returns 403',async()=>assert.equal((await callPost({scopes:'my-group:read'})).response.status,403));
test('member without active group returns 404',async()=>assert.equal((await callPost({groupId:null})).response.status,404));
test('duplicate client request returns existing record and does not insert',async()=>{const{x,response,json}=await callPost({existing:{id:'Q-existing',status:'pending',reference:body.reference,created_at:'2026-09-13 00:00:00'}});assert.equal(response.status,409);assert.equal(json.id,'Q-existing');assert.equal(x.state.insertArgs,null)});
test('submission rate limit returns 429',async()=>assert.equal((await callPost({recent:5})).response.status,429));
test('member question list is constrained to token member',async()=>{const x=envFor(),r=await handleOrganizationApi(request('/api/app/my-group/questions'),x.env,new URL('https://evkerk.nl/api/app/my-group/questions'));assert.equal(r.status,200);await r.json();assert.equal(x.state.listArgs[0],'MEM-1');assert.match(x.state.listSql,/q\.member_id=\?/)});
test('member list response excludes internal handler note',async()=>{const x=envFor(),r=await handleOrganizationApi(request('/api/app/my-group/questions'),x.env,new URL('https://evkerk.nl/api/app/my-group/questions')),j=await r.json();assert.equal(j.questions[0].handler_note,undefined)});
test('pastor can manage every group question',()=>assert.equal(canManageGroupQuestion({level:'pastor',assignments:[]},{cluster_id:'cluster-4',group_id:'group-33'}),true));
test('cluster leader is limited to assigned cluster',()=>{const x={level:'cluster_leader',assignments:[{role:'cluster_leader',cluster_id:'cluster-3'}]};assert.equal(canManageGroupQuestion(x,{cluster_id:'cluster-3',group_id:'group-01'}),true);assert.equal(canManageGroupQuestion(x,{cluster_id:'cluster-4',group_id:'group-03'}),false)});
test('group leader is limited to assigned group',()=>{const x={level:'group_leader',assignments:[{role:'group_leader',group_id:'group-01'}]};assert.equal(canManageGroupQuestion(x,{cluster_id:'cluster-3',group_id:'group-01'}),true);assert.equal(canManageGroupQuestion(x,{cluster_id:'cluster-3',group_id:'group-02'}),false)});
test('ordinary member cannot enter organization question backend',async()=>{const x=envFor(),r=await handleOrganizationApi(request('/api/organization/group-questions'),x.env,new URL('https://evkerk.nl/api/organization/group-questions'));assert.equal(r.status,401)});
test('admin list and updates use scoped organization authorization',()=>{assert.match(api,/const s=scope\(x,'g'\)/);assert.match(api,/canManageGroupQuestion\(x/);assert.match(api,/handler_note/);assert.match(api,/group_question\.update/)});
test('admin UI provides cluster group status and time controls without contacts',()=>{for(const x of ['questionCluster','questionGroup','questionStatus','questionOrder','标记已讨论','关闭','内部备注'])assert.ok(ui.includes(x),x);assert.doesNotMatch(ui,/phone|address|新人/)});
test('scope parser accepts string array and JSON array formats',()=>{for(const v of ['my-group:read my-group:question:submit',['my-group:read','my-group:question:submit'],'["my-group:read","my-group:question:submit"]'])assert.ok(parseMemberScopes(v).includes('my-group:question:submit'))});
test('existing session and my-group behavior remains wired',()=>{assert.match(auth,/\/api\/app\/session/);assert.match(api,/\/api\/app\/my-group/);assert.match(api,/pending_question_count/)});
