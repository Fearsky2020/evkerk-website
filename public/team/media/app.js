(()=>{
const $=s=>document.querySelector(s);
const status=$('#mediaStatus'),grid=$('#mediaGrid'),card=$('#playerCard'),player=$('#mediaPlayer'),title=$('#playerTitle');
const search=$('#mediaSearch'),count=$('#mediaCount'),LAST_KEY='evkerk-team-media:last';
let items=[];
const safe=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function visibleItems(){const q=search.value.trim().toLowerCase();return items.filter(item=>!q||`${item.title_zh||''} ${item.title_nl||''}`.toLowerCase().includes(q))}
function render(){
  const rows=visibleItems(),last=localStorage.getItem(LAST_KEY)||'';
  count.textContent=`${rows.length} 项`;
  status.hidden=items.length>0;
  grid.innerHTML=rows.length?rows.map(item=>`<button class="media-item ${item.id===last?'last-played':''}" type="button" data-id="${safe(item.id)}"><span class="media-icon">▶</span><div><strong>${safe(item.title_zh||item.id)}</strong><small>${safe(item.title_nl||'')} · 内部${item.type==='video/mp4'?'视频':'媒体'}${item.id===last?' · 上次播放':''}</small></div><b>播放</b></button>`).join(''):`<div class="media-empty">${items.length?'没有找到匹配的内部素材。':'内部媒体库暂时还没有素材。'}</div>`;
  grid.querySelectorAll('.media-item').forEach(button=>button.onclick=()=>openMedia(button.dataset.id));
}
async function load(){
  try{
    const r=await fetch('/api/internal-media/hymns',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    if(r.status===401||r.status===403){location.href='/team/';return}
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||'内部媒体暂时无法读取');
    items=data.items||[];render();
  }catch(error){status.hidden=false;status.textContent=error.message||'内部媒体暂时无法读取';status.classList.add('error')}
}
function openMedia(id){
  const item=items.find(x=>x.id===id);if(!item)return;
  localStorage.setItem(LAST_KEY,item.id);
  title.textContent=item.title_zh||item.id;
  player.src=item.href||'';card.hidden=false;player.load();render();
  card.scrollIntoView({behavior:'smooth',block:'start'});
}
search?.addEventListener('input',render);
player?.addEventListener('error',()=>{status.hidden=false;status.textContent='这个内部媒体暂时无法播放，请稍后重试。';status.classList.add('error')});
load();
})();