(() => {
  const langKey='evkerk-lang',themeKey='evkerk-theme';
  const grid=document.getElementById('sermonGrid'),langToggle=document.getElementById('langToggle'),themeToggle=document.getElementById('themeToggle');
  let sermons=[];
  const isNl=()=>document.documentElement.lang==='nl';
  const pick=(zh,nl)=>isNl()?(nl||zh||''):(zh||nl||'');
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function dateLabel(value){if(!value)return'';return new Intl.DateTimeFormat(isNl()?'nl-NL':'zh-CN',{timeZone:'Europe/Amsterdam',year:'numeric',month:'long',day:'numeric'}).format(new Date(`${value}T12:00:00`))}
  function applyTheme(theme,remember=true){const dark=theme==='dark';document.documentElement.dataset.theme=dark?'dark':'light';themeToggle.textContent=dark?'☀︎':'☾';if(remember)localStorage.setItem(themeKey,dark?'dark':'light')}
  function applyLanguage(lang,remember=true){const nl=lang==='nl';document.documentElement.lang=nl?'nl':'zh-CN';langToggle.textContent=nl?'中文':'NL';document.getElementById('brandName').textContent=nl?'Evangeliekerk':'基督教福音教会';document.getElementById('brandSubtitle').textContent=nl?'基督教福音教会':'EVANGELIEKERK';document.getElementById('homeLink').textContent=nl?'Naar home':'返回首页';document.getElementById('pageTitle').textContent=nl?'Samen groeien in de waarheid.':'在真理中，一起成长。';document.getElementById('pageIntro').textContent=nl?'Bekijk recente preken, Bijbelteksten en samenvattingen, of luister verder via video en audio.':'在这里查看最近的主日讲道、经文与信息摘要，也可以打开视频或音频继续收听。';if(remember)localStorage.setItem(langKey,nl?'nl':'zh');render()}
  function render(){if(!sermons.length){grid.innerHTML=`<div class="archive-empty">${isNl()?'Er zijn nog geen preken gepubliceerd.':'目前还没有发布讲道。'}</div>`;return}grid.innerHTML=sermons.map(item=>{const title=pick(item.title_zh,item.title_nl)||(isNl()?'Preek':'讲道');const summary=pick(item.summary_zh,item.summary_nl);return `<article class="sermon-card"><time>${esc(dateLabel(item.sermon_date))}</time><h2>${esc(title)}</h2><div class="sermon-meta">${item.speaker?`<span>${esc(item.speaker)}</span>`:''}${item.scripture?`<span>· ${esc(item.scripture)}</span>`:''}</div><p>${esc(summary||(isNl()?'Open de preek voor meer informatie.':'打开讲道查看详细内容。'))}</p><div class="sermon-links"><a href="/sermon.html?id=${encodeURIComponent(item.id)}">${isNl()?'Bekijk preek':'查看讲道'}</a>${item.youtube_url?`<a href="${esc(item.youtube_url)}" target="_blank" rel="noopener">YouTube</a>`:''}${item.audio_url?`<a href="${esc(item.audio_url)}" target="_blank" rel="noopener">${isNl()?'Audio':'音频'}</a>`:''}</div></article>`}).join('')}
  async function load(){try{const response=await fetch('/api/sermons',{headers:{Accept:'application/json'}});if(!response.ok)throw new Error();const body=await response.json();sermons=Array.isArray(body.sermons)?body.sermons:[];render()}catch{grid.innerHTML=`<div class="archive-empty">${isNl()?'De preken kunnen tijdelijk niet worden geladen.':'讲道暂时加载失败，请稍后再试。'}</div>`}}
  applyTheme(localStorage.getItem(themeKey)||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'),false);
  applyLanguage(localStorage.getItem(langKey)||'zh',false);
  langToggle.onclick=()=>applyLanguage(isNl()?'zh':'nl');
  themeToggle.onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
  load();
})();