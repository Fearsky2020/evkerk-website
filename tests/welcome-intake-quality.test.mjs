import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeFaithStatus, normalizeReceptionSite, presentWelcomeCase } from '../src/welcome-normalization.js';
import { handleOrganizationApi } from '../src/organization.js';
const organization=fs.readFileSync(new URL('../src/organization.js',import.meta.url),'utf8');
const welcome=fs.readFileSync(new URL('../src/welcome.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/team/welcome/index.html',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../public/team/welcome/app.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../migrations/0029_welcome_submission_quality.sql',import.meta.url),'utf8');
test('OCR exact 海 standardizes to full church name',()=>assert.equal(normalizeReceptionSite('海',0.99),'海牙福音教会'));
test('uncertain or unknown OCR requires human confirmation',()=>{assert.equal(normalizeReceptionSite('海',0.42),'待人工确认');assert.equal(normalizeReceptionSite('疑似其他地点',0.99),'待人工确认')});
test('faith status write read and admin semantics are canonical',()=>{assert.equal(normalizeFaithStatus('基督徒'),'是');assert.equal(normalizeFaithStatus('非基督徒'),'否');assert.equal(normalizeFaithStatus('未确认'),'不确定');assert.match(html,/在来海牙福音教会聚会以前，您是否已经信主？/);for(const value of ['是','否','不确定'])assert.match(html,new RegExp('value="'+value+'"'));assert.deepEqual(presentWelcomeCase({faith_status:'基督徒',reception_site:'海牙教会'}),{faith_status:'是',reception_site:'海牙福音教会'})});
test('legacy App request values remain compatible',()=>{assert.equal(normalizeFaithStatus('基督徒'),'是');assert.equal(normalizeFaithStatus('非基督徒'),'否');assert.equal(normalizeReceptionSite('海牙教会'),'海牙福音教会');assert.equal(normalizeReceptionSite('海牙堂'),'海牙福音教会');assert.match(organization,/b\.expected_photo_count\?\?b\.photo_count/)});
test('complete newcomer submission contract persists every field',()=>{for(const field of ['display_name','contact_note','postcode','age_band','family_status','children_note','occupation_stage','preferred_days','language_note','background_note','reception_site','invited_by','faith_status','submitted_by_member_id','client_request_id','submission_status','expected_photo_count'])assert.match(organization,new RegExp('\\b'+field+'\\b'));assert.match(organization,/return json\(\{ok:true,id:wid,status:'new',submission_status/)});
test('multi photo partial failure retains record and supports safe retry',()=>{assert.match(migration,/photo_pending/);assert.match(migration,/needs_attention/);assert.match(migration,/expected_photo_count/);for(const source of [organization,welcome]){assert.match(source,/SELECT COUNT\(\*\) count FROM welcome_case_photos/);assert.match(source,/uploaded>=Number\(item\.expected_photo_count\)\?'complete':'photo_pending'/);assert.match(source,/UPDATE welcome_cases SET submission_status='needs_attention'/)}assert.match(ui,/expected_photo_count:lastPhotos\.length/);assert.match(ui,/照片待补传/);assert.match(ui,/需要同工处理/);assert.match(organization,/submitted_by_member_id=\? AND client_request_id=\?/)});
test('ordinary logs exclude newcomer personal data token and private keys',()=>{for(const [name,source] of [['organization',organization],['welcome',welcome]]){const logs=[...source.matchAll(/console\.(?:log|warn|error)\s*\(([^)]*)\)/g)].map(match=>match[1]).join('\n');for(const forbidden of ['display_name','phone','email','postcode','address','contact_note','background_note','token','r2_key','private/welcome-cards'])assert.doesNotMatch(logs,new RegExp(forbidden,'i'),name+' log leaks '+forbidden)}assert.doesNotMatch(organization,/error\.stack/);assert.doesNotMatch(welcome,/error\.stack/)});
test('admin displays no legacy abbreviated Den Haag labels',()=>{assert.doesNotMatch(html,/>海牙教会</);assert.doesNotMatch(html,/>海牙堂</);assert.match(html,/>海牙福音教会</)});


function integrationEnv(){
 const state={welcome:null,photos:[],inserts:0,failNextPut:false};
 const DB={prepare(sql){let args=[];return{bind(...v){args=v;return this},async first(){
  if(sql.includes('FROM member_app_tokens'))return{token_id:'tok',scopes:'welcome:submit welcome:photo',access_expires_at:'2099-01-01T00:00:00Z',member_id:'MEM-1',display_name:'提交同工',member_status:'active',cluster_id:'C1',group_id:'G1'};
  if(sql.includes('FROM welcome_cases WHERE submitted_by_member_id=? AND client_request_id=?'))return state.welcome&&state.welcome.submitted_by_member_id===args[0]&&state.welcome.client_request_id===args[1]?{...state.welcome}:null;
  if(sql.includes('SELECT COUNT(*) count FROM welcome_case_photos'))return{count:state.photos.length};
  return null;
 },async all(){if(sql.includes('FROM welcome_case_photos'))return{results:state.photos.map(({r2_key,...photo})=>photo)};return{results:[]}},async run(){
  if(sql.startsWith('INSERT INTO welcome_cases')){state.inserts++;state.welcome={id:args[0],display_name:args[1],contact_note:args[2],postcode:args[3],age_band:args[4],family_status:args[5],children_note:args[6],occupation_stage:args[7],preferred_days:args[8],language_note:args[9],background_note:args[10],reception_site:args[11],invited_by:args[12],faith_status:args[13],submitted_by_member_id:args[14],client_request_id:args[15],status:'new',submission_status:args[16],expected_photo_count:args[17],created_at:'2026-09-13 10:00:00',updated_at:'2026-09-13 10:00:00'};}
  if(sql.startsWith('INSERT INTO welcome_case_photos'))state.photos.push({id:args[0],case_id:args[1],r2_key:args[2],mime_type:args[3],filename:args[4],size_bytes:args[5],created_at:'2026-09-13 10:01:00'});
  if(sql.includes('UPDATE welcome_cases SET submission_status=?'))state.welcome.submission_status=args[0];
  if(sql.includes("UPDATE welcome_cases SET submission_status='needs_attention'"))state.welcome.submission_status='needs_attention';
  return{success:true};
 }}}};
 const MEDIA={async put(){if(state.failNextPut){state.failNextPut=false;throw new Error('simulated private storage failure')}},async delete(){}};
 return{DB,MEDIA,state};
}
const auth={authorization:'Bearer local-test-token'};
async function orgCall(path,init,env){const request=new Request('https://local.evkerk.test'+path,init);return handleOrganizationApi(request,env,new URL(request.url))}
function jpegForm(name){const form=new FormData();form.append('image',new Blob([new Uint8Array([0xff,0xd8,0xff,1])],{type:'image/jpeg'}),name);return form}
test('complete newcomer flow survives partial photo failure and retries without duplicate record',async()=>{
 const env=integrationEnv(),client_request_id='android-quality-0001';
 const payload={display_name:'测试新人',contact_note:'仅本地测试',postcode:'2522JZ',age_band:'30-39',family_status:'家庭',children_note:'有孩子',occupation_stage:'职场',preferred_days:'周五',language_note:'中文',background_note:'完整字段',reception_site:'海',reception_site_confidence:0.99,invited_by:'测试同工',faith_status:'基督徒',client_request_id,expected_photo_count:2};
 let response=await orgCall('/api/app/welcome',{method:'POST',headers:{...auth,'content-type':'application/json'},body:JSON.stringify(payload)},env);assert.equal(response.status,201);let body=await response.json();assert.equal(body.submission_status,'photo_pending');assert.equal(env.state.welcome.faith_status,'是');assert.equal(env.state.welcome.reception_site,'海牙福音教会');assert.equal(env.state.welcome.background_note,'完整字段');
 response=await orgCall('/api/app/welcome',{method:'POST',headers:{...auth,'content-type':'application/json'},body:JSON.stringify(payload)},env);body=await response.json();assert.equal(response.status,200);assert.equal(body.existing,true);assert.equal(env.state.inserts,1);
 const photoPath='/api/app/welcome/submissions/'+client_request_id+'/photos';response=await orgCall(photoPath,{method:'POST',headers:auth,body:jpegForm('one.jpg')},env);body=await response.json();assert.equal(response.status,201);assert.equal(body.submission_status,'photo_pending');assert.equal(env.state.photos.length,1);
 env.state.failNextPut=true;response=await orgCall(photoPath,{method:'POST',headers:auth,body:jpegForm('two.jpg')},env);body=await response.json();assert.equal(response.status,503);assert.equal(env.state.welcome.submission_status,'needs_attention');assert.equal(env.state.inserts,1);assert.equal(env.state.photos.length,1);assert.equal(JSON.stringify(body).includes('private/welcome-cards'),false);
 response=await orgCall(photoPath,{method:'POST',headers:auth,body:jpegForm('two.jpg')},env);body=await response.json();assert.equal(response.status,201);assert.equal(body.submission_status,'complete');assert.equal(env.state.photos.length,2);assert.equal(JSON.stringify(body).includes('private/welcome-cards'),false);
 response=await orgCall('/api/app/welcome/submissions/'+client_request_id,{method:'GET',headers:auth},env);body=await response.json();assert.equal(response.status,200);assert.equal(body.submission.submission_status,'complete');assert.equal(body.submission.faith_status,'是');assert.equal(body.submission.reception_site,'海牙福音教会');assert.equal(body.submission.photos.length,2);assert.equal(JSON.stringify(body).includes('r2_key'),false);
});

test('welcome detail edit preserves canonical faith and site semantics',()=>{assert.match(welcome,/UPDATE welcome_cases SET reception_site=\?,faith_status=\?/);assert.match(welcome,/welcome\.intake_update/);assert.match(welcome,/welcome\.photo_upload/);assert.match(welcome,/request.method==='POST'\)return updateCase/);assert.match(ui,/id=\"intakeEditForm\"/);assert.match(ui,/保存新人资料修正/);assert.match(ui,/在来海牙福音教会聚会以前，您是否已经信主？/)});
