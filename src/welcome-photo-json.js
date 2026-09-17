import { authenticateMemberAppToken } from './member-auth.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const id=p=>p+'_'+crypto.randomUUID();
const TYPES=new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp'],['image/heic','heic'],['image/heif','heif']]);

function validBytes(bytes,mime){
  if(mime==='image/jpeg')return bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  if(mime==='image/png')return bytes.length>=8&&bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47;
  if(mime==='image/webp')return bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(mime==='image/heic'||mime==='image/heif')return bytes.length>=12&&String.fromCharCode(...bytes.slice(4,8))==='ftyp';
  return false;
}
function decodeBase64(value){
  const raw=clean(value,18*1024*1024).replace(/^data:[^;]+;base64,/i,'').replace(/\s+/g,'');
  if(!raw)return null;
  try{const binary=atob(raw),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes}catch{return null}
}

export async function handleWelcomePhotoJson(request,env,url=new URL(request.url)){
  const m=url.pathname.match(/^\/api\/app\/welcome\/submissions\/([^/]+)\/photo-json$/);
  if(!m||request.method!=='POST')return null;
  const member=await authenticateMemberAppToken(request,env);
  if(!member)return json({ok:false,error:'App 登录已失效'},401);
  if(!member.scope_list.includes('welcome:photo'))return json({ok:false,error:'当前账号没有新人照片上传权限'},403);
  if(!env.MEDIA)return json({ok:false,error:'照片暂时无法保存，请稍后重试'},503);
  const clientRequestId=decodeURIComponent(m[1]);
  const item=await env.DB.prepare("SELECT id,expected_photo_count FROM welcome_cases WHERE submitted_by_member_id=? AND client_request_id=?").bind(member.member_id,clientRequestId).first();
  if(!item)return json({ok:false,error:'App 提交记录不存在'},404);
  const existing=await env.DB.prepare("SELECT id,mime_type,filename,size_bytes,created_at FROM welcome_case_photos WHERE case_id=? AND status='active' ORDER BY created_at LIMIT 1").bind(item.id).first();
  if(existing)return json({ok:true,existing:true,submission_status:'complete',photo:existing},200);

  const body=await request.json().catch(()=>null);
  if(!body)return json({ok:false,error:'照片请求格式不正确'},400);
  const mime=clean(body.mime_type,100).toLowerCase(),ext=TYPES.get(mime);
  if(!ext)return json({ok:false,error:'仅支持 JPG、PNG、WebP 或 HEIC 照片'},415);
  const bytes=decodeBase64(body.image_base64);
  if(!bytes||!bytes.length)return json({ok:false,error:'照片内容为空或无法读取'},400);
  if(bytes.length>12*1024*1024)return json({ok:false,error:'每张照片最大 12MB'},413);
  if(!validBytes(bytes,mime))return json({ok:false,error:'照片内容与文件格式不符'},415);

  const photoId=id('wphoto'),key=`private/welcome-cards/${item.id}/${photoId}.${ext}`;
  const filename=clean(body.filename,180)||`welcome-card.${ext}`;
  try{await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:mime,contentDisposition:'inline'},customMetadata:{caseId:item.id,photoId}})}catch{return json({ok:false,error:'照片暂时无法保存，请稍后重试'},503)}
  try{await env.DB.prepare("INSERT INTO welcome_case_photos(id,case_id,r2_key,mime_type,filename,size_bytes,uploaded_by_member_id,status) VALUES(?,?,?,?,?,?,?,'active')").bind(photoId,item.id,key,mime,filename,bytes.length,member.member_id).run()}
  catch{await env.MEDIA.delete(key).catch(()=>{});return json({ok:false,error:'照片记录保存失败，已撤销上传；请稍后重试'},500)}
  const count=await env.DB.prepare("SELECT COUNT(*) count FROM welcome_case_photos WHERE case_id=? AND status='active'").bind(item.id).first();
  const uploaded=Number(count?.count||0),expected=Number(item.expected_photo_count||0),submissionStatus=!expected||uploaded>=expected?'complete':'photo_pending';
  await env.DB.prepare("UPDATE welcome_cases SET submission_status=?,updated_at=datetime('now') WHERE id=?").bind(submissionStatus,item.id).run();
  await env.DB.prepare("INSERT INTO organization_audit_log(id,actor_member_id,action,entity_type,entity_id,after_json) VALUES(?,?,?,?,?,?)").bind(id('AUD'),member.member_id,'welcome.app_photo_upload','welcome_case',item.id,JSON.stringify({photo_id:photoId,platform:'ios-json'})).run().catch(()=>{});
  return json({ok:true,existing:false,submission_status:submissionStatus,uploaded_photo_count:uploaded,expected_photo_count:expected,photo:{id:photoId,mime_type:mime,filename,size_bytes:bytes.length}},201);
}
