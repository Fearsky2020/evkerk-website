import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePublicHymnsApi} from '../src/public-hymns.js';

function envFor({choir=false,rows=[],item=null,object=null}={}){
  return {
    DB:{
      prepare(sql){
        return {
          bind(){
            return {
              first:async()=>{
                if(sql.includes('FROM admin_sessions'))return {id:'USR1',name:'Choir User',email:'choir@example.test',role:'uploader',status:'active',session_id:'SES1'};
                if(sql.includes('SELECT id,r2_key,mime_type FROM internal_media'))return item;
                return null;
              },
              all:async()=>{
                if(sql.includes('team_service_permissions'))return {results:choir?[{service_id:'choir'}]:[]};
                if(sql.includes('internal_media'))return {results:rows};
                return {results:[]};
              },
              run:async()=>({})
            };
          },
          first:async()=>null,
          all:async()=>({results:[]}),
          run:async()=>({})
        };
      }
    },
    MEDIA:{get:async()=>object}
  };
}

function choirRequest(url,method='GET'){
  return new Request(url,{method,headers:{authorization:'Bearer test-session'}});
}

test('hymn catalog requires staff authentication',async()=>{
  const env=envFor({rows:[]});
  const response=await handlePublicHymnsApi(new Request('https://evkerk.nl/api/hymns'),env,new URL('https://evkerk.nl/api/hymns'));
  assert.equal(response.status,401);
});

test('hymn catalog rejects staff without choir service',async()=>{
  const env=envFor({choir:false,rows:[]});
  const response=await handlePublicHymnsApi(choirRequest('https://evkerk.nl/api/hymns'),env,new URL('https://evkerk.nl/api/hymns'));
  assert.equal(response.status,403);
});

test('choir hymn catalog returns sorted app-safe rows',async()=>{
  const env=envFor({choir:true,rows:[
    {id:'001-x',title_zh:'第一首',title_nl:'',filename:'001.mp4',sort_order:10},
    {id:'002-x',title_zh:'第二首',title_nl:'',filename:'002.mp4',sort_order:20}
  ]});
  const response=await handlePublicHymnsApi(choirRequest('https://evkerk.nl/api/hymns'),env,new URL('https://evkerk.nl/api/hymns'));
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.count,2);
  assert.equal(body.hymns[0].no,1);
  assert.equal(body.hymns[1].video_url,'/api/hymns/002-x');
  assert.equal(response.headers.get('cache-control'),'private, no-store');
});

test('hymn media also requires choir service',async()=>{
  const env=envFor({choir:false,item:{id:'001',r2_key:'hymns/001.mp4',mime_type:'video/mp4'}});
  const url=new URL('https://evkerk.nl/api/hymns/001');
  const response=await handlePublicHymnsApi(choirRequest(url),env,url);
  assert.equal(response.status,403);
});

test('authorized choir hymn item rejects unknown ids',async()=>{
  const env=envFor({choir:true,item:null});
  const url=new URL('https://evkerk.nl/api/hymns/nope');
  const response=await handlePublicHymnsApi(choirRequest(url),env,url);
  assert.equal(response.status,404);
});
