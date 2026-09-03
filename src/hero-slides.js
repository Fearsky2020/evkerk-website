import { authorize } from './admin-auth.js';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function clean(value, max = 500) { return String(value ?? '').trim().slice(0, max); }
async function denied(request, env, minimum = 'uploader') {
  const auth = await authorize(request, env, minimum);
  if (auth.response) return auth.response;
  if (!env.MEDIA) return json({ok:false,error:'图片存储尚未配置'},503);
  return null;
}
function imageUrl(row) { return `/api/hero-slides/${encodeURIComponent(row.id)}/image?v=${encodeURIComponent(row.updated_at || '')}`; }
async function listPublic(env) {
  if (!env.DB) return json({ok:true,slides:[]});
  const result = await env.DB.prepare(`SELECT id,title_zh,title_nl,subtitle_zh,subtitle_nl,sort_order,updated_at FROM hero_slides WHERE status='published' ORDER BY sort_order DESC,created_at DESC LIMIT 10`).all();
  return json({ok:true,slides:(result.results||[]).map(row=>({...row,image_url:imageUrl(row)}))});
}
async function listAdmin(request,env) {
  const no=await denied(request,env); if(no)return no;
  const result=await env.DB.prepare(`SELECT id,title_zh,title_nl,subtitle_zh,subtitle_nl,sort_order,status,created_at,updated_at FROM hero_slides ORDER BY sort_order DESC,created_at DESC LIMIT 30`).all();
  return json({ok:true,slides:(result.results||[]).map(row=>({...row,image_url:imageUrl(row)}))});
}
function validateImage(image) {
  if (!(image instanceof File) || !image.size) return '请选择照片';
  if (!IMAGE_TYPES.has(image.type)) return '只支持 JPG、PNG、WebP 或 AVIF';
  if (image.size > 12*1024*1024) return '照片不能超过 12MB';
  return '';
}
async function upload(request,env) {
  const no=await denied(request,env); if(no)return no;
  const form=await request.formData().catch(()=>null); if(!form)return json({ok:false,error:'无法读取表单'},400);
  const image=form.get('image'); const error=validateImage(image); if(error)return json({ok:false,error},400);
  const id=`HERO-${crypto.randomUUID()}`; const ext=image.type==='image/jpeg'?'jpg':image.type.split('/')[1];
  const key=`hero-slides/${new Date().getUTCFullYear()}/${id}.${ext}`;
  await env.MEDIA.put(key,image.stream(),{httpMetadata:{contentType:image.type}});
  try {
    await env.DB.prepare(`INSERT INTO hero_slides(id,title_zh,title_nl,subtitle_zh,subtitle_nl,image_key,image_mime,image_size,sort_order,status) VALUES(?,?,?,?,?,?,?,?,?,'published')`).bind(
      id,clean(form.get('title_zh'),180),clean(form.get('title_nl'),180),clean(form.get('subtitle_zh'),240),clean(form.get('subtitle_nl'),240),key,image.type,image.size,Number(form.get('sort_order')||0)
    ).run();
  } catch(error) { await env.MEDIA.delete(key); throw error; }
  return json({ok:true,id},201);
}
async function update(request,env,id) {
  const no=await denied(request,env,'editor'); if(no)return no;
  const body=await request.json().catch(()=>({}));
  const result=await env.DB.prepare(`UPDATE hero_slides SET title_zh=?,title_nl=?,subtitle_zh=?,subtitle_nl=?,sort_order=?,updated_at=datetime('now') WHERE id=? AND status='published'`).bind(
    clean(body.title_zh,180),clean(body.title_nl,180),clean(body.subtitle_zh,240),clean(body.subtitle_nl,240),Number(body.sort_order||0),id
  ).run();
  if(!Number(result.meta?.changes||0))return json({ok:false,error:'首页图片不存在'},404);
  return json({ok:true,id});
}
async function replaceImage(request,env,id) {
  const no=await denied(request,env,'editor'); if(no)return no;
  const form=await request.formData().catch(()=>null); const image=form?.get('image'); const error=validateImage(image); if(error)return json({ok:false,error},400);
  const current=await env.DB.prepare(`SELECT image_key FROM hero_slides WHERE id=? AND status='published'`).bind(id).first();
  if(!current)return json({ok:false,error:'首页图片不存在'},404);
  const ext=image.type==='image/jpeg'?'jpg':image.type.split('/')[1]; const key=`hero-slides/${new Date().getUTCFullYear()}/${id}-${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key,image.stream(),{httpMetadata:{contentType:image.type}});
  try { await env.DB.prepare(`UPDATE hero_slides SET image_key=?,image_mime=?,image_size=?,updated_at=datetime('now') WHERE id=?`).bind(key,image.type,image.size,id).run(); }
  catch(error){await env.MEDIA.delete(key);throw error}
  await env.MEDIA.delete(current.image_key); return json({ok:true,id});
}
async function remove(request,env,id) {
  const no=await denied(request,env,'editor'); if(no)return no;
  const current=await env.DB.prepare(`SELECT image_key FROM hero_slides WHERE id=?`).bind(id).first();
  if(!current)return json({ok:false,error:'首页图片不存在'},404);
  await env.DB.prepare(`DELETE FROM hero_slides WHERE id=?`).bind(id).run(); await env.MEDIA.delete(current.image_key);
  return json({ok:true,id});
}
async function image(env,id) {
  if(!env.DB||!env.MEDIA)return new Response('not found',{status:404});
  const row=await env.DB.prepare(`SELECT image_key,image_mime FROM hero_slides WHERE id=? AND status='published'`).bind(id).first();
  if(!row)return new Response('not found',{status:404}); const object=await env.MEDIA.get(row.image_key); if(!object)return new Response('not found',{status:404});
  return new Response(object.body,{headers:{'content-type':row.image_mime,'cache-control':'public,max-age=3600','x-content-type-options':'nosniff'}});
}
export async function handleHeroApi(request,env,url) {
  if(request.method==='GET'&&url.pathname==='/api/hero-slides')return listPublic(env);
  if(request.method==='GET'&&url.pathname==='/api/admin/hero-slides')return listAdmin(request,env);
  if(request.method==='POST'&&url.pathname==='/api/admin/hero-slides')return upload(request,env);
  let match=url.pathname.match(/^\/api\/admin\/hero-slides\/([^/]+)\/update$/); if(match&&request.method==='POST')return update(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/admin\/hero-slides\/([^/]+)\/image$/); if(match&&request.method==='POST')return replaceImage(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/admin\/hero-slides\/([^/]+)\/delete$/); if(match&&request.method==='POST')return remove(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/hero-slides\/([^/]+)\/image$/); if(match&&request.method==='GET')return image(env,decodeURIComponent(match[1]));
  return null;
}
