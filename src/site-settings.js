import { authorize } from './admin-auth.js';

const DEFAULT_SCHEDULE = {
  rijswijk_service: { day_zh:'每周日', day_nl:'Elke zondag', time:'12:30–15:30', label_zh:'主日聚会', label_nl:'Zondagsdienst' },
  rijswijk_school: { day_zh:'每周日', day_nl:'Elke zondag', time:'12:30–14:30', label_zh:'主日学', label_nl:'Zondagsschool' },
  zoetermeer_course: { day_zh:'每周六', day_nl:'Elke zaterdag', time:'10:00–12:00', label_zh:'服事小组课程', label_nl:'Cursus voor bedieningsteam' },
  zoetermeer_service: { day_zh:'每周日', day_nl:'Elke zondag', time:'10:00–12:00', label_zh:'中文及荷兰文主日聚会', label_nl:'Chinese en Nederlandstalige zondagsdienst' },
  zoetermeer_school: { day_zh:'每周日', day_nl:'Elke zondag', time:'10:00–12:00', label_zh:'主日学', label_nl:'Zondagsschool' },
  zoetermeer_bible: { day_zh:'每周一', day_nl:'Elke maandag', time:'10:00–12:00', label_zh:'查经班', label_nl:'Bijbelstudie' },
};

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':status===200?'no-store':'no-store'}})}
async function ensure(env){if(!env.DB)return;await env.DB.prepare(`CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT (datetime('now')))`).run()}
async function read(env){if(!env.DB)return DEFAULT_SCHEDULE;await ensure(env);const row=await env.DB.prepare(`SELECT value FROM site_settings WHERE key='weekly_schedule'`).first();if(!row?.value)return DEFAULT_SCHEDULE;try{return {...DEFAULT_SCHEDULE,...JSON.parse(row.value)}}catch{return DEFAULT_SCHEDULE}}
function cleanSchedule(input){const out={};for(const [key,defaults] of Object.entries(DEFAULT_SCHEDULE)){const item=input?.[key]||{};out[key]={day_zh:String(item.day_zh||defaults.day_zh).trim().slice(0,40),day_nl:String(item.day_nl||defaults.day_nl).trim().slice(0,60),time:String(item.time||defaults.time).trim().slice(0,30),label_zh:String(item.label_zh||defaults.label_zh).trim().slice(0,80),label_nl:String(item.label_nl||defaults.label_nl).trim().slice(0,120)}}return out}
export async function handleSiteSettings(request,env,url){
  if(url.pathname!=='/api/site-settings/schedule'&&url.pathname!=='/api/admin/site-settings/schedule')return null;
  if(request.method==='GET')return json({ok:true,schedule:await read(env)});
  if(request.method==='POST'&&url.pathname==='/api/admin/site-settings/schedule'){
    const auth=await authorize(request,env,'editor');if(auth.response)return auth.response;if(!env.DB)return json({ok:false,error:'D1 database is not configured'},503);
    const body=await request.json().catch(()=>({}));const schedule=cleanSchedule(body.schedule);await ensure(env);await env.DB.prepare(`INSERT INTO site_settings(key,value,updated_at) VALUES('weekly_schedule',?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=datetime('now')`).bind(JSON.stringify(schedule)).run();return json({ok:true,schedule});
  }
  return json({ok:false,error:'method not allowed'},405);
}
