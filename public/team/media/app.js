(()=>{
const $=s=>document.querySelector(s);
const status=$('#mediaStatus'),grid=$('#mediaGrid'),card=$('#playerCard');
const video=$('#videoPlayer'),audio=$('#audioPlayer'),title=$('#playerTitle'),meta=$('#playerMeta'),kind=$('#playerKind');
const search=$('#mediaSearch'),count=$('#mediaCount'),LAST_KEY='evkerk-team-media:last';
let items=[],filter='all';
const safe=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtSize=n=>n?`${(Number(n)/1024/1024).toFixed(Number(n)>104857600?0:1)} MB`:'';
const fmtDate=d=>d?d.replaceAll('-',' / '):'';
function visibleItems(){const q=search.value.trim().toLowerCase();return items.filter(item=>(filter==='all'||item.category===filter)&&(!q||`${item.title_zh||''} ${item.title_nl||''} ${item.date||''}`.toLowerCase().includes(q)))}
function updateCounts(){
  $('#allCount').textContent=items.length;
  $('#sermonCount').textContent=items.filter(x=>x.category==='sermon').length;
  $('#hymnCount').textContent=items.filter(x=>x.category==='hymn').length;
}
function render(){
  const rows=visibleItems(),last=localStorage.getItem(LAST_KEY)||'';
  count.textContent=`${rows.length} 项`;status.hidden=items.length>0;
  grid.innerHTML=rows.length?rows.map(item=>{
    const sermon=item.category==='sermon',parts=[item.date?`<span class="media-date">${safe(fmtDate(item.date))}</span>`:'',fmtSize(item.size_bytes)?`<span class="media-size">${safe(fmtSize(item.size_bytes))}</span>`:''].filter(Boolean).join(' · ');
    return `<button class="media-item ${item.id===last?'last-played':''}" type="button" data-id="${safe(item.id)}"><span class="media-icon">${sermon?'◉':'▶'}</span><div><strong>${safe(item.title_zh||item.id)}</strong><small>${sermon?'历史讲道录音':'内部诗歌视频'}${parts?' · '+parts:''}${item.id===last?' · 上次播放':''}</small></div><b>播放</b></button>`;
  }).join(''):`<div class="media-empty">${items.length?'没有找到匹配的素材。':'内部媒体库暂时还没有素材。'}</div>`;
  grid.querySelectorAll('.media-item').forEach(button=>button.onclick=()=>openMedia(button.dataset.id));
}
async function load(){
  try{
    const r=await fetch('/api/internal-media/items',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    if(r.status===401||r.status===403){location.href='/team/';return}
    const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'内部媒体暂时无法读取');
    items=data.items||[];updateCounts();render();
  }catch(error){status.hidden=false;status.textContent=error.message||'内部媒体暂时无法读取';status.classList.add('error')}
}
function stopPlayers(){video.pause();audio.pause();video.removeAttribute('src');audio.removeAttribute('src');video.load();audio.load()}
function openMedia(id){
  const item=items.find(x=>x.id===id);if(!item)return;localStorage.setItem(LAST_KEY,item.id);stopPlayers();
  const sermon=item.category==='sermon';title.textContent=item.title_zh||item.id;kind.textContent=sermon?'历史讲道录音':'内部诗歌视频';
  meta.textContent=[fmtDate(item.date),fmtSize(item.size_bytes)].filter(Boolean).join(' · ');card.hidden=false;
  video.hidden=sermon;audio.hidden=!sermon;const player=sermon?audio:video;player.src=item.href||'';player.load();render();
  card.scrollIntoView({behavior:'smooth',block:'nearest'});player.play().catch(()=>{});
}
search?.addEventListener('input',render);
document.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===button));render()});
for(const player of [video,audio])player?.addEventListener('error',()=>{status.hidden=false;status.textContent='这个内部媒体暂时无法播放，请稍后重试。';status.classList.add('error')});
load();
})();
