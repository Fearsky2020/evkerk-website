import { authorizeService } from './team-services.js';

export const DAILY_TIMEZONE='Europe/Amsterdam';
const FALLBACK_UPDATED_AT='2026-09-13T00:00:00.000Z';
const json=(data,status=200,publicCache=false)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':publicCache?'public, max-age=60, s-maxage=300':'no-store'}});
const clean=(v,max=12000)=>String(v??'').trim().slice(0,max);
const iso=v=>v?String(v).replace(' ','T').replace(/Z$/,'')+'Z':null;

export function amsterdamDate(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:DAILY_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const values=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return values.year+'-'+values.month+'-'+values.day;
}
export function validDailyDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return false;
  const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;
}
const FALLBACKS=[
  ['诗篇 119:105','你的话是我脚前的灯，是我路上的光。','今天我愿意让神的话照亮哪一个决定或行动？'],
  ['箴言 3:5-6','你要专心仰赖耶和华，不可倚靠自己的聪明，在你一切所行的事上都要认定他，他必指引你的路。','今天哪一件事需要我停止只靠自己，转而认定神？'],
  ['以赛亚书 41:10','你不要害怕，因为我与你同在；不要惊惶，因为我是你的神。我必坚固你，我必帮助你，我必用我公义的右手扶持你。','我今天最惧怕什么？这节经文怎样改变我的回应？'],
  ['马太福音 11:28','凡劳苦担重担的人可以到我这里来，我就使你们得安息。','我愿意把哪一个重担具体交给耶稣？'],
  ['罗马书 8:28','我们晓得万事都互相效力，叫爱神的人得益处，就是按他旨意被召的人。','在尚未明白的处境里，我如何继续信靠神的旨意？'],
  ['腓立比书 4:6-7','应当一无挂虑，只要凡事藉着祷告、祈求和感谢，将你们所要的告诉神。神所赐、出人意外的平安必在基督耶稣里保守你们的心怀意念。','今天我要把什么忧虑化成祷告、祈求和感谢？'],
  ['约翰福音 15:5','我是葡萄树，你们是枝子。常在我里面的，我也常在他里面，这人就多结果子；因为离了我，你们就不能做什么。','今天我可以怎样实际地住在基督里面？']
];
export function fallbackDailyDevotional(date){
  const day=Math.floor(Date.parse(date+'T00:00:00Z')/86400000),[reference,scripture_text,reflection_prompt]=FALLBACKS[((day%FALLBACKS.length)+FALLBACKS.length)%FALLBACKS.length];
  return{date,timezone:DAILY_TIMEZONE,reference,scripture_text,reflection_prompt,share_text:reference+'\n'+scripture_text+'\n\n默想：'+reflection_prompt,updated_at:FALLBACK_UPDATED_AT};
}
function publicShape(row,date){
  if(!row)return fallbackDailyDevotional(date);
  return{date:row.devotional_date,timezone:DAILY_TIMEZONE,reference:row.reference,scripture_text:row.scripture_text,reflection_prompt:row.reflection_prompt,share_text:row.share_text,updated_at:iso(row.updated_at)};
}
async function publicDaily(env,url){
  const requested=clean(url.searchParams.get('date'),10),date=requested||amsterdamDate();
  if(!validDailyDate(date))return json({ok:false,error:'date 必须是有效的 YYYY-MM-DD'},400);
  const row=await env.DB.prepare("SELECT devotional_date,reference,scripture_text,reflection_prompt,share_text,updated_at FROM daily_devotionals WHERE devotional_date=? AND status='published' LIMIT 1").bind(date).first();
  return json(publicShape(row,date),200,true);
}
async function requireEditor(request,env){
  return authorizeService(request,env,'daily_devotional');
}
async function adminList(request,env,url){
  const auth=await requireEditor(request,env);if(auth.response)return auth.response;
  const from=clean(url.searchParams.get('from'),10),to=clean(url.searchParams.get('to'),10);
  if((from&&!validDailyDate(from))||(to&&!validDailyDate(to)))return json({ok:false,error:'日期筛选格式不正确'},400);
  const where=[],args=[];if(from){where.push('devotional_date>=?');args.push(from)}if(to){where.push('devotional_date<=?');args.push(to)}
  const result=await env.DB.prepare("SELECT id,devotional_date,reference,scripture_text,reflection_prompt,share_text,status,source,published_at,updated_at FROM daily_devotionals"+(where.length?' WHERE '+where.join(' AND '):'')+" ORDER BY devotional_date DESC LIMIT 400").bind(...args).all();
  return json({ok:true,timezone:DAILY_TIMEZONE,devotionals:result.results||[]});
}
async function adminSave(request,env){
  const auth=await requireEditor(request,env);if(auth.response)return auth.response;
  const body=await request.json().catch(()=>({})),date=clean(body.date||body.devotional_date,10),reference=clean(body.reference,160),scriptureText=clean(body.scripture_text,10000),reflectionPrompt=clean(body.reflection_prompt,4000),status=body.status==='published'?'published':'draft';
  if(!validDailyDate(date))return json({ok:false,error:'请选择有效日期'},400);
  if(!reference||!scriptureText||!reflectionPrompt)return json({ok:false,error:'请填写经文出处、完整经文和默想问题'},400);
  const shareText=reference+'\n'+scriptureText+'\n\n默想：'+reflectionPrompt;
  const before=await env.DB.prepare('SELECT * FROM daily_devotionals WHERE devotional_date=?').bind(date).first(),id=before?.id||'daily-'+crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO daily_devotionals(id,devotional_date,reference,scripture_text,reflection_prompt,share_text,status,created_by_user_id,updated_by_user_id,source,published_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,'website',CASE WHEN ?='published' THEN datetime('now') ELSE NULL END,datetime('now'))
    ON CONFLICT(devotional_date) DO UPDATE SET reference=excluded.reference,scripture_text=excluded.scripture_text,reflection_prompt=excluded.reflection_prompt,share_text=excluded.share_text,status=excluded.status,updated_by_user_id=excluded.updated_by_user_id,source='website',published_at=CASE WHEN excluded.status='published' THEN COALESCE(daily_devotionals.published_at,datetime('now')) ELSE NULL END,updated_at=datetime('now')`)
    .bind(id,date,reference,scriptureText,reflectionPrompt,shareText,status,auth.user.id,auth.user.id,status).run();
  const after=await env.DB.prepare('SELECT * FROM daily_devotionals WHERE devotional_date=?').bind(date).first();
  await env.DB.prepare('INSERT INTO daily_devotional_audit_log(id,devotional_id,actor_user_id,action,before_json,after_json) VALUES(?,?,?,?,?,?)').bind('DDA-'+crypto.randomUUID(),after.id,auth.user.id,before?'update':'create',before?JSON.stringify(before):null,JSON.stringify(after)).run();
  return json({ok:true,devotional:{...after,updated_at:iso(after.updated_at),published_at:iso(after.published_at)}},before?200:201);
}
export async function handleDailyDevotionalApi(request,env,url){
  if(url.pathname==='/api/app/daily-devotional'&&request.method==='GET')return publicDaily(env,url);
  if(url.pathname==='/api/admin/daily-devotionals'&&request.method==='GET')return adminList(request,env,url);
  if(url.pathname==='/api/admin/daily-devotionals'&&request.method==='POST')return adminSave(request,env);
  return null;
}
