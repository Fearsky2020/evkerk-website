function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=300'}})}
function unavailable(){return json({ok:false,error:'hymn library unavailable'},503)}
async function listHymns(env){
  if(!env.DB)return null;
  const rows=await env.DB.prepare(`SELECT id,title_zh,title_nl,filename,sort_order FROM internal_media WHERE status='active' AND category='hymn' ORDER BY sort_order ASC,title_zh ASC`).all();
  return (rows.results||[]).map((row,index)=>({id:row.id,no:index+1,title_zh:row.title_zh||'',title_nl:row.title_nl||'',filename:row.filename||'',video_url:`/api/hymns/${encodeURIComponent(row.id)}`}));
}
async function findHymn(env,id){
  if(!env.DB)return null;
  return env.DB.prepare(`SELECT id,r2_key,mime_type FROM internal_media WHERE id=? AND status='active' AND category='hymn' LIMIT 1`).bind(id).first();
}
export async function handlePublicHymnsApi(request,env,url){
  if(request.method==='GET'&&url.pathname==='/api/hymns'){
    const items=await listHymns(env);if(!items)return unavailable();
    return json({ok:true,count:items.length,hymns:items});
  }
  const match=url.pathname.match(/^\/api\/hymns\/([^/]+)$/);if(!match||!['GET','HEAD'].includes(request.method))return null;
  if(!env.DB||!env.MEDIA)return unavailable();
  const item=await findHymn(env,decodeURIComponent(match[1]));if(!item)return json({ok:false,error:'not found'},404);
  const object=await env.MEDIA.get(item.r2_key,{range:request.headers});if(!object)return json({ok:false,error:'not found'},404);
  const headers=new Headers();object.writeHttpMetadata(headers);headers.set('content-type',item.mime_type||'video/mp4');headers.set('cache-control','public, max-age=3600');headers.set('accept-ranges','bytes');headers.set('content-disposition','inline');headers.set('etag',object.httpEtag);
  if(request.method==='HEAD')return new Response(null,{headers});
  if(object.range){const offset=object.range.offset||0,length=object.range.length||object.size;headers.set('content-range',`bytes ${offset}-${offset+length-1}/${object.size}`);headers.set('content-length',String(length));return new Response(object.body,{status:206,headers});}
  headers.set('content-length',String(object.size));return new Response(object.body,{headers});
}
