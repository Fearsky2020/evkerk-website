import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMemberAuthApi, parseMemberScopes } from '../src/member-auth.js';
import { handleOrganizationApi } from '../src/organization.js';

function envFor(groupId='group-01',scopes='my-group:read welcome:submit'){
 const tokenRow={token_id:'ATK-1',scopes,access_expires_at:'2099-01-01T00:00:00.000Z',member_id:'MEM-1',display_name:'王牧师',member_status:'active',cluster_id:'cluster-3',group_id:groupId};
 return{DB:{prepare(sql){return{bind(){return this},async first(){
  if(sql.includes('FROM member_app_tokens t JOIN church_members m'))return tokenRow;
  if(sql.includes('FROM church_groups g JOIN church_clusters c'))return groupId?{id:'group-01',group_number:1,group_name:'陈薇小组',cluster_name:'第三大组'}:null;
  return null;
 },async all(){return{results:[]}},async run(){return{success:true}}}}}};
}
const req=path=>new Request('https://evkerk.nl'+path,{headers:{authorization:'Bearer same-access-token'}});
test('member scope parser accepts database strings, arrays and JSON arrays',()=>{
 assert.deepEqual(parseMemberScopes('my-group:read welcome:submit'),['my-group:read','welcome:submit']);
 assert.deepEqual(parseMemberScopes(['my-group:read','welcome:submit']),['my-group:read','welcome:submit']);
 assert.deepEqual(parseMemberScopes('["my-group:read","welcome:submit"]'),['my-group:read','welcome:submit']);
});
test('same valid token exposes my-group scope in session and reads assigned group',async()=>{
 const env=envFor();
 const session=await handleMemberAuthApi(req('/api/app/session'),env,new URL('https://evkerk.nl/api/app/session'));
 assert.equal(session.status,200);assert.ok((await session.json()).scopes.includes('my-group:read'));
 const group=await handleOrganizationApi(req('/api/app/my-group'),env,new URL('https://evkerk.nl/api/app/my-group'));
 assert.equal(group.status,200);assert.equal((await group.json()).group.id,'group-01');
});
test('valid my-group token without an assigned group returns 404, not scope 403',async()=>{
 const response=await handleOrganizationApi(req('/api/app/my-group'),envFor(null,'my-group:read'),new URL('https://evkerk.nl/api/app/my-group'));
 assert.equal(response.status,404);assert.equal((await response.json()).error,'尚未分配有效小组');
});
