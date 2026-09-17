import { authorizeService } from './team-services.js';
import { authenticateMemberAppToken } from './member-auth.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=(value,max=500)=>String(value??'').trim().slice(0,max);

export function normalizePostcode(value){return clean(value,20).toUpperCase().replace(/\s+/g,'')}
export function validPostcode(value){return /^[1-9]\d{3}[A-Z]{2}$/.test(normalizePostcode(value))}

function pointFromText(value){const m=String(value||'').match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i);return m?{longitude:Number(m[1]),latitude:Number(m[2])}:null}

async function geocodePostcode(postcode){
  const pc=normalizePostcode(postcode);if(!validPostcode(pc))throw new Error('请输入有效的荷兰邮编，例如 2511EC');
  const url=new URL('https://api.pdok.nl/bzk/locatieserver/search/v3_1/free');
  url.searchParams.set('fq','type:postcode');url.searchParams.set('rows','1');url.searchParams.set('q',pc);
  const r=await fetch(url.toString(),{headers:{accept:'application/json'}});if(!r.ok)throw new Error('暂时无法查询这个邮编');
  const data=await r.json(),doc=data?.response?.docs?.[0],point=pointFromText(doc?.centroide_ll);
  if(!doc||!point)throw new Error('没有找到这个邮编');
  return{postcode:normalizePostcode(doc.postcode||pc),display:clean(doc.weergavenaam,200),...point};
}

function kmBetween(a,b){
  const rad=x=>x*Math.PI/180,R=6371,dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude);
  const x=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function has(text,needle){return Boolean(needle)&&clean(text,1000).toLowerCase().includes(clean(needle,100).toLowerCase())}

export function eligibleGroup(group){
  if(!group||group.is_demo)return false;
  if(String(group.status||'active')!=='active')return false;
  if(group.accepting_newcomers===0||group.accepting_newcomers==='0'||group.accepting_newcomers===false)return false;
  if(['closed','paused'].includes(String(group.reception_status||'open')))return false;
  if(group.capacity_max!=null&&group.current_size!=null&&Number(group.current_size)>=Number(group.capacity_max))return false;
  return Number.isFinite(Number(group.latitude))&&Number.isFinite(Number(group.longitude));
}

export function recommendationScore(person,group,distanceKm){
  let score=Math.max(0,60-Math.min(distanceKm,30)*2.2),reasons=[];
  if(distanceKm<=3)reasons.push('距离很近');else if(distanceKm<=7)reasons.push('距离较近');else reasons.push('距离可接受');
  if(person.preferred_days&&has(person.preferred_days,group.meeting_day)){score+=18;reasons.push('聚会时间符合');}
  if(person.family_status&&has(group.family_profile,person.family_status)){score+=10;reasons.push('家庭情况较匹配');}
  if(person.children_note&&has(group.children_profile,person.children_note)){score+=8;reasons.push('孩子情况较匹配');}
  if(person.occupation_stage&&has(group.occupation_profile,person.occupation_stage)){score+=7;reasons.push('生活/职业阶段较接近');}
  if(person.language_note&&has(group.language_profile,String(person.language_note).replace('双语',''))){score+=5;reasons.push('语言情况较合适');}
  if(person.family_status&&has(group.audience_profile,person.family_status)){score+=6;reasons.push('适合人群较匹配');}
  if(String(group.reception_status||'open')==='near_full'){score-=12;reasons.push('名额较紧张');}
  return{score:Math.round(score*10)/10,reasons};
}

export function rankGroupRecommendations(person,groups,limit=3){
  const ranked=(groups||[]).filter(eligibleGroup).map(group=>{
    const distance_km=kmBetween(person,group),fit=recommendationScore(person,group,distance_km);
    return{group,distance_km:Math.round(distance_km*10)/10,...fit};
  }).sort((a,b)=>b.score-a.score||a.distance_km-b.distance_km||Number(a.group.group_number||999)-Number(b.group.group_number||999));
  return ranked.slice(0,Math.max(1,Math.min(3,Number(limit)||3)));
}

async function hydrateGroupCoordinates(env,groups){
  const missing=(groups||[]).filter(group=>validPostcode(group.postcode)&&(group.latitude==null||group.longitude==null));
  await Promise.allSettled(missing.map(async group=>{
    try{
      const geo=await geocodePostcode(group.postcode);
      group.postcode=geo.postcode;group.latitude=geo.latitude;group.longitude=geo.longitude;
      await env.DB.prepare("UPDATE church_groups SET postcode=?,latitude=?,longitude=?,updated_at=datetime('now') WHERE id=?").bind(geo.postcode,geo.latitude,geo.longitude,group.id).run();
    }catch(error){console.error('GROUP_RECOMMEND_GEOCODE_FAILED',group.id)}
  }));
  return groups;
}

async function authorizeRecommendation(request,env,url){
  if(url.pathname==='/api/welcome/recommend'){
    const auth=await authorizeService(request,env,'welcome');
    return auth.response?{response:auth.response}:{mode:'staff'};
  }
  if(url.pathname==='/api/app/welcome/recommend'){
    const member=await authenticateMemberAppToken(request,env);
    if(!member)return{response:json({ok:false,error:'App 登录已失效'},401)};
    if(!member.scope_list.includes('welcome:submit'))return{response:json({ok:false,error:'当前账号没有新人接待权限'},403)};
    return{mode:'app',member};
  }
  return null;
}

export async function handleGroupRecommendation(request,env,url=new URL(request.url)){
  if(request.method!=='POST'||!['/api/welcome/recommend','/api/app/welcome/recommend'].includes(url.pathname))return null;
  const auth=await authorizeRecommendation(request,env,url);if(auth?.response)return auth.response;
  const body=await request.json().catch(()=>({}));let geo;
  try{geo=await geocodePostcode(body.postcode)}catch(error){return json({ok:false,error:error.message},400)}
  const rows=await env.DB.prepare('SELECT * FROM church_groups WHERE is_demo=0 ORDER BY cluster_name,COALESCE(group_number,999),name').all();
  const groups=await hydrateGroupCoordinates(env,rows.results||[]),person={...body,postcode:geo.postcode,latitude:geo.latitude,longitude:geo.longitude};
  const allEligible=(groups||[]).filter(eligibleGroup).map(group=>({group,distance_km:kmBetween(person,group)})).sort((a,b)=>a.distance_km-b.distance_km);
  const recommendations=rankGroupRecommendations(person,groups,3);
  return json({ok:true,postcode:geo.postcode,location:geo.display,recommendations,nearest_group_id:allEligible[0]?.group?.id||null,recommendation_count:recommendations.length,max_recommendations:3});
}
