const clean=(value,max=500)=>String(value??'').trim().slice(0,max);
export const FAITH_PROMPT='在来海牙福音教会聚会以前，您是否已经信主？';
export const RECEPTION_SITE_DEN_HAAG='海牙福音教会';
export const MANUAL_CONFIRMATION='待人工确认';

export function normalizeFaithStatus(value){
  const raw=clean(value,50),v=raw.toLowerCase();
  if(['是','基督徒','已信主','yes','true','1'].includes(v))return '是';
  if(['否','非基督徒','未信主','no','false','0'].includes(v))return '否';
  if(['不确定','未确认','不知道','unknown','unsure'].includes(v))return '不确定';
  return raw?'不确定':'';
}
export function normalizeReceptionSite(value,confidence=null){
  const v=clean(value,80),score=confidence==null||confidence===''?null:Number(confidence);
  if(score!==null&&(!Number.isFinite(score)||score<0.8))return MANUAL_CONFIRMATION;
  if(['海','海牙教会','海牙堂','海牙福音教会'].includes(v))return RECEPTION_SITE_DEN_HAAG;
  if(v==='主特美教会')return v;
  return v?MANUAL_CONFIRMATION:'';
}
export function presentWelcomeCase(row){
  if(!row)return row;
  return {...row,faith_status:normalizeFaithStatus(row.faith_status),reception_site:normalizeReceptionSite(row.reception_site)};
}
export function expectedPhotoCount(value){
  const n=Number(value);return Number.isInteger(n)&&n>0?Math.min(n,20):0;
}
