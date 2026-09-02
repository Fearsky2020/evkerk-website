const LEVEL_KEY = 'learn-nl-level-v1';
const LEVEL_LABEL = {start:'起步', daily:'日常', natural:'自然'};
const FSRS_STORAGE = 'learn-nl-fsrs-cards-v1';
const FSRS_INTRO_STORAGE = 'learn-nl-fsrs-intro-v2';
const FREE_DAILY_NEW_LIMIT = 20;

const LESSON_ITEMS = [
  ['supermarket','在超市','Waar kan ik dit vinden?','我在哪里可以找到这个？','start'],
  ['supermarket','在超市','Hoeveel kost dit?','这个多少钱？','start'],
  ['supermarket','在超市','Heeft u dit ook in een andere maat?','这个有其他尺寸吗？','daily'],
  ['supermarket','在超市','Mag ik een tasje?','可以给我一个袋子吗？','start'],
  ['supermarket','在超市','Kan ik pinnen?','我可以刷卡吗？','start'],
  ['doctor','看医生','Ik wil graag een afspraak maken.','我想预约一下。','start'],
  ['doctor','看医生','Ik wil graag een afspraak maken, het liefst in de ochtend.','我想预约，最好是在上午。','daily'],
  ['doctor','看医生','Ik heb sinds gisteren pijn.','我从昨天开始疼。','daily'],
  ['doctor','看医生','Ik voel me niet goed.','我感觉不舒服。','start'],
  ['doctor','看医生','Moet ik medicijnen gebruiken?','我需要用药吗？','daily'],
  ['doctor','看医生','Wanneer moet ik terugkomen?','我什么时候需要再来？','daily'],
  ['gemeente','市政府','Ik heb een afspraak om tien uur.','我十点有一个预约。','daily'],
  ['gemeente','市政府','Waar moet ik me melden?','我应该在哪里报到？','daily'],
  ['gemeente','市政府','Welke documenten heb ik nodig?','我需要哪些文件？','daily'],
  ['gemeente','市政府','Kunt u mij hiermee helpen?','您能帮我处理这个吗？','daily'],
  ['gemeente','市政府','Wanneer is het klaar?','什么时候可以办好？','daily'],
  ['neighbors','邻居寒暄','Goedemorgen! Alles goed?','早上好！都好吗？','start'],
  ['neighbors','邻居寒暄','Hoe was je weekend?','你周末过得怎么样？','daily'],
  ['neighbors','邻居寒暄','Lekker weer vandaag, hè?','今天天气不错，是吧？','daily'],
  ['neighbors','邻居寒暄','Fijne dag nog!','祝你今天接下来愉快！','start'],
  ['neighbors','邻居寒暄','Tot ziens!','再见！','start'],
  ['phone','打电话','Goedemorgen, u spreekt met Wang.','早上好，我是 Wang。','daily'],
  ['phone','打电话','Ik bel voor een afspraak.','我打电话是为了预约。','daily'],
  ['phone','打电话','Kunt u dat herhalen, alstublieft?','您可以再说一遍吗？','start'],
  ['phone','打电话','Kunt u iets langzamer spreken?','您可以说慢一点吗？','start'],
  ['phone','打电话','Dank u wel voor uw hulp.','谢谢您的帮助。','start'],
  ['supermarket','在超市','Ik zoek iets vergelijkbaars, maar dan zonder suiker.','我想找类似的东西，但不要含糖。','natural'],
  ['supermarket','在超市','Is er misschien een alternatief dat iets goedkoper is?','有没有稍微便宜一点的替代品？','natural'],
  ['doctor','看医生',"De pijn komt en gaat, maar wordt 's avonds meestal erger.",'疼痛时有时无，但晚上通常更严重。','natural'],
  ['doctor','看医生','Ik wil graag weten of ik hiermee gewoon kan blijven werken.','我想知道这种情况是否还能正常工作。','natural'],
  ['gemeente','市政府','Ik heb hier eerder over gebeld, maar ik weet niet zeker wat de volgende stap is.','我之前为这件事打过电话，但不太确定下一步该怎么做。','natural'],
  ['gemeente','市政府','Kunt u aangeven hoe lang de verwerking ongeveer duurt?','您能告诉我处理大概需要多久吗？','natural'],
  ['neighbors','邻居寒暄','We wonen hier nog niet zo lang, dus we leren de buurt nog een beetje kennen.','我们搬来还不久，还在慢慢熟悉这个社区。','natural'],
  ['neighbors','邻居寒暄','Als we ooit te veel lawaai maken, zeg het gerust.','如果我们哪天太吵，请尽管告诉我们。','natural'],
  ['phone','打电话','Ik bel omdat ik nog geen bevestiging van mijn afspraak heb ontvangen.','我打来是因为还没有收到预约确认。','natural'],
  ['phone','打电话','Kunt u mij doorverbinden met iemand die hierover gaat?','您能帮我转接负责这件事的人吗？','natural']
].map(([sceneId,scene,nl,zh,level]) => ({id:`${sceneId}::${nl}`,sceneId,scene,kind:'句子',nl,zh,level}));

const VOCAB_ITEMS = [
  ['在超市','de kassa','收银台','start'],['在超市','de aanbieding','特价 / 优惠','daily'],['在超市','de tas','袋子','start'],['在超市','contant','现金','start'],['在超市','pinnen','刷卡 / 借记卡支付','start'],
  ['看医生','de afspraak','预约','start'],['看医生','de klacht','症状 / 不适','daily'],['看医生','de pijn','疼痛','start'],['看医生','het recept','处方','daily'],['看医生','de apotheek','药房','start'],
  ['市政府','de gemeente','市政府','start'],['市政府','het formulier','表格','start'],['市政府','het paspoort','护照','start'],['市政府','de inschrijving','登记 / 注册','daily'],
  ['邻居寒暄','de buurman','男邻居','start'],['邻居寒暄','de buurvrouw','女邻居','start'],['邻居寒暄','gezellig','愉快 / 有氛围','daily'],['邻居寒暄','het weekend','周末','start'],['邻居寒暄','het weer','天气','start'],
  ['打电话','bellen','打电话','start'],['打电话','doorverbinden','转接电话','daily'],['打电话','bereikbaar','可以联系到','daily'],['打电话','het nummer','号码','start'],['打电话','een momentje','稍等一下','start']
].map(([scene,nl,zh,level],index)=>({id:`vocab-${index}`,scene,kind:'单词',nl,zh,level}));

const SEARCH_ITEMS = [...LESSON_ITEMS, ...VOCAB_ITEMS];
const REVIEW_ITEMS = [...LESSON_ITEMS, ...VOCAB_ITEMS];
const SHADOW_ITEMS = LESSON_ITEMS;
const EASY_DUTCH = [
  {id:'jSyrqH_MMOM',level:'start',label:'入门生存词',title:'100 Words You Should Know When Coming to the Netherlands',note:'适合起步：先建立来荷兰马上会用的词汇地图。'},
  {id:'iA61Z0BAI90',level:'daily',label:'慢速小聊',title:'Small Talk (in Slow Dutch)',note:'适合日常：听完整小聊，练接话和自然节奏。'},
  {id:'w2xDfh3xQuA',level:'natural',label:'高频 kunnen',title:'50 Everyday Sentences with the Verb “kunnen”',note:'适合自然表达：把“能不能 / 可以不可以”放进更多真实句型。'}
];

function $(id){return document.getElementById(id);}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function currentLevel(){try{const value=JSON.parse(localStorage.getItem(LEVEL_KEY));return LEVEL_LABEL[value]?value:'daily';}catch(_){return'daily';}}
function levelDistance(item){const ranks={start:0,daily:1,natural:2};return Math.abs(ranks[item.level]-ranks[currentLevel()]);}
function prioritized(items){return [...items].sort((a,b)=>levelDistance(a)-levelDistance(b));}
function speak(text,rate=.94){if(!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='nl-NL';u.rate=rate;const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>/^nl(-|_)/i.test(v.lang))||voices.find(v=>/Dutch|Nederlands/i.test(v.name))||null;speechSynthesis.speak(u);}

function injectSections(){
  const future=document.querySelector('.future-section');
  if(!future||$('smartTools'))return;
  const wrapper=document.createElement('div');
  wrapper.innerHTML=`
  <section class="smart-section" id="smartTools"><div class="shell">
    <div class="smart-heading"><div><p class="eyebrow">SLIM LEREN</p><h2>别只学更多，先学适合你现在的。</h2></div><p class="zh-help">搜索可以看全部内容；FSRS 会优先引入你当前难度的新词和新句，到期复习则始终优先。</p></div>
    <div class="smart-grid">
      <article class="smart-card search-tool"><span class="smart-chip">Fuse.js</span><p class="eyebrow">SNEL ZOEKEN</p><h3>我现在想说什么？</h3><p class="zh-help">中文、荷兰文都能搜。同级内容优先，但不会把其他难度藏起来。</p><label class="smart-search-box"><span>⌕</span><input id="smartSearchInput" type="search" autocomplete="off" placeholder="例如：预约 / afspraak / 慢一点"></label><div class="smart-search-results" id="smartSearchResults" aria-live="polite"></div><p class="smart-source zh-help">OpenTaal 拼写助手按需加载；课程搜索和难度排序都在本机完成。</p></article>
      <article class="smart-card review-tool"><span class="smart-chip">FSRS v6</span><p class="eyebrow">HERHALEN</p><div class="smart-card-titleline"><h3>今天该复习什么？</h3><strong id="reviewDueCount">—</strong></div><p class="zh-help" id="reviewLevelNote">到期旧卡优先；免费版每天最多加入 ${FREE_DAILY_NEW_LIMIT} 个新词 / 新卡，复习不计入额度。</p><div class="review-stage" id="reviewStage"><p class="review-empty zh-help">正在加载智能复习器…</p></div></article>
    </div>
    <article class="shadow-card" id="shadowing"><div class="shadow-copy"><span class="smart-chip">WaveSurfer.js</span><p class="eyebrow">NAZEGGEN · SHADOWING</p><h3>听一句，自己说，再听自己。</h3><p class="zh-help">跟读句子会跟随当前难度。录音只留在浏览器，不上传。</p><label class="shadow-select-label" for="shadowPhrase">今天跟读</label><select id="shadowPhrase" class="shadow-select"></select><div class="shadow-actions"><button class="btn secondary" id="shadowReference" type="button">🔊 听原句</button><button class="btn primary" id="shadowRecord" type="button">● 开始录音</button><button class="btn secondary" id="shadowMine" type="button" disabled>▶ 听我的</button></div><p class="shadow-status zh-help" id="shadowStatus">第一次使用时，浏览器会询问麦克风权限。</p></div><div class="wave-panel"><div class="wave-caption"><span>我的声音</span><small id="shadowTimer">00:00</small></div><div id="shadowWaveform" class="shadow-waveform" aria-label="录音波形"></div></div></article>
  </div></section>
  <section class="easy-dutch-section" id="easyDutch"><div class="shell"><div class="smart-heading easy-heading"><div><p class="eyebrow">ECHT NEDERLANDS · EASY DUTCH</p><h2>课本之外，听荷兰人真的怎么说。</h2></div><p class="zh-help">默认推荐与你当前难度最接近的一条；三条公开内容始终都可以看。</p></div><div class="easy-layout"><div class="easy-player-wrap"><iframe id="easyDutchPlayer" class="easy-player" title="Easy Dutch" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><div class="easy-side"><div id="easyDutchChoices" class="easy-choices"></div><div class="watch-plan"><strong>别把视频当背景音：</strong><ol class="zh-help"><li>第一遍不暂停，先抓主题和节奏。</li><li>第二遍开 YouTube 自带字幕，记 3 个你真想用的表达。</li><li>第三遍挑一句，回到跟读区自己说一遍。</li></ol></div><a class="btn secondary easy-channel-link" href="https://www.youtube.com/@EasyDutch" target="_blank" rel="noopener">在 YouTube 打开 Easy Dutch ↗</a></div></div></div></section>`;
  [...wrapper.children].forEach(node=>future.parentNode.insertBefore(node,future));
}

function searchRank(item,score=0){return levelDistance(item)*10+score;}
async function initSearch(){
  const input=$('smartSearchInput'),results=$('smartSearchResults');if(!input||!results)return;
  let FuseCtor=null;try{FuseCtor=(await import('https://cdn.jsdelivr.net/npm/fuse.js@7.5.0/+esm')).default;}catch(error){console.warn('Fuse.js unavailable, using simple search fallback.',error);}
  const fuse=FuseCtor?new FuseCtor(SEARCH_ITEMS,{keys:[{name:'nl',weight:.5},{name:'zh',weight:.35},{name:'scene',weight:.15}],threshold:.38,ignoreLocation:true,includeScore:true}):null;
  const render=items=>{if(!items.length){results.innerHTML='<p class="search-empty zh-help">暂时没在本站课程里找到。</p>';return;}results.innerHTML=items.slice(0,6).map(item=>`<button class="search-result" type="button" data-search-speak="${escapeHtml(item.nl)}" data-level="${item.level}"><span><strong>${escapeHtml(item.nl)}</strong><small>${escapeHtml(item.scene)} · ${escapeHtml(item.kind)} · ${LEVEL_LABEL[item.level]}</small></span><span class="zh-help">${escapeHtml(item.zh)}</span><b>🔊</b></button>`).join('');};
  const doSearch=()=>{const q=input.value.trim();if(!q)return render(prioritized(SEARCH_ITEMS));if(fuse){const hits=fuse.search(q).sort((a,b)=>searchRank(a.item,a.score)-searchRank(b.item,b.score)).map(x=>x.item);return render(hits);}const low=q.toLocaleLowerCase();render(prioritized(SEARCH_ITEMS.filter(item=>`${item.nl} ${item.zh} ${item.scene}`.toLocaleLowerCase().includes(low))));};
  input.addEventListener('input',doSearch);results.addEventListener('click',e=>{const b=e.target.closest('[data-search-speak]');if(b)speak(b.dataset.searchSpeak);});addEventListener('learn-nl-level-change',doSearch);doSearch();
}

function serializeCard(card){return{...card,due:card.due instanceof Date?card.due.getTime():card.due,last_review:card.last_review instanceof Date?card.last_review.getTime():(card.last_review??null)};}
function loadCards(){try{return JSON.parse(localStorage.getItem(FSRS_STORAGE))||{};}catch(_){return{};}}
function saveCards(cards){localStorage.setItem(FSRS_STORAGE,JSON.stringify(cards));}
function formatWhen(input){const d=new Date(input),ms=d.getTime()-Date.now();if(ms<=60000)return'很快再见';const m=Math.round(ms/60000);if(m<60)return`${m} 分钟后`;const h=Math.round(ms/3600000);if(h<24)return`${h} 小时后`;const days=Math.round(ms/86400000);if(days<=30)return`${days} 天后`;return d.toLocaleDateString('zh-CN',{month:'short',day:'numeric'});}
function todayKey(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function loadIntro(){try{return JSON.parse(localStorage.getItem(FSRS_INTRO_STORAGE))||{};}catch(_){return{};}}
function saveIntro(value){localStorage.setItem(FSRS_INTRO_STORAGE,JSON.stringify(value));}

async function initReview(){
  const stage=$('reviewStage'),dueCount=$('reviewDueCount'),note=$('reviewLevelNote');if(!stage||!dueCount)return;
  try{
    const mod=await import('https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/+esm');
    const scheduler=mod.fsrs({request_retention:.9,maximum_interval:3650,enable_fuzz:true,enable_short_term:true});
    const {Rating,createEmptyCard}=mod;let cards=loadCards();let current=null;
    const getCard=id=>cards[id]||serializeCard(createEmptyCard(new Date()));
    const reviewedDue=()=>REVIEW_ITEMS.filter(item=>cards[item.id]&&new Date(cards[item.id].due).getTime()<=Date.now());
    const selectedNew=()=>{
      const level=currentLevel(),day=todayKey();let state=loadIntro();
      if(state.date!==day)state={date:day,byLevel:{}};
      state.byLevel=state.byLevel||{};
      let ids=Array.isArray(state.byLevel[level])?state.byLevel[level]:[];
      ids=ids.filter(id=>REVIEW_ITEMS.some(item=>item.id===id)&&!cards[id]);
      const pool=REVIEW_ITEMS.filter(item=>item.level===level&&!cards[item.id]&&!ids.includes(item.id));
      while(ids.length<FREE_DAILY_NEW_LIMIT&&pool.length)ids.push(pool.shift().id);
      state.byLevel[level]=ids.slice(0,FREE_DAILY_NEW_LIMIT);saveIntro(state);
      return ids.map(id=>REVIEW_ITEMS.find(item=>item.id===id)).filter(Boolean);
    };
    const dueItems=()=>{const old=reviewedDue();const oldIds=new Set(old.map(x=>x.id));return[...old,...selectedNew().filter(x=>!oldIds.has(x.id))];};
    const updateCount=()=>{const old=reviewedDue().length,fresh=selectedNew().length,total=dueItems().length;dueCount.textContent=`${total} 条（到期 ${old} / 新 ${fresh}）`;if(note)note.textContent=`当前：${LEVEL_LABEL[currentLevel()]} · 免费版每天最多 ${FREE_DAILY_NEW_LIMIT} 个同级新词 / 新卡；到期复习不占额度。`;};
    const pickNext=()=>{const due=dueItems();current=due[0]||null;updateCount();if(!current){stage.innerHTML='<div class="review-done"><strong>今天先到这里 ✓</strong><p class="zh-help">当前等级没有更多到期卡或今日新内容了。</p></div>';return;}const card=getCard(current.id),preview=scheduler.repeat(card,new Date()),ratings=[[Rating.Again,'忘了'],[Rating.Hard,'有点难'],[Rating.Good,'记得'],[Rating.Easy,'太简单']];stage.innerHTML=`<div class="review-scene">${escapeHtml(current.scene)} · ${escapeHtml(current.kind)} · ${LEVEL_LABEL[current.level]}</div><button class="review-speak" type="button" data-review-speak="${escapeHtml(current.nl)}">🔊</button><p class="review-dutch">${escapeHtml(current.nl)}</p><p class="review-cn zh-help">${escapeHtml(current.zh)}</p><p class="review-question zh-help">先自己回忆，再按真实感觉选：</p><div class="rating-grid">${ratings.map(([r,l])=>`<button type="button" data-fsrs-rating="${r}"><strong>${l}</strong><small>${formatWhen(preview[r].card.due)}</small></button>`).join('')}</div>`;};
    stage.addEventListener('click',e=>{const s=e.target.closest('[data-review-speak]');if(s)return speak(s.dataset.reviewSpeak);const b=e.target.closest('[data-fsrs-rating]');if(!b||!current)return;const result=scheduler.next(getCard(current.id),new Date(),Number(b.dataset.fsrsRating));cards[current.id]=serializeCard(result.card);saveCards(cards);pickNext();});
    addEventListener('learn-nl-level-change',()=>{current=null;pickNext();});pickNext();
  }catch(error){console.error('FSRS failed to load.',error);dueCount.textContent='离线';stage.innerHTML='<p class="review-empty zh-help">智能复习组件暂时没有加载成功。普通课程仍可正常使用。</p>';}
}

async function initShadowing(){
  const select=$('shadowPhrase'),recordButton=$('shadowRecord'),mineButton=$('shadowMine'),referenceButton=$('shadowReference'),status=$('shadowStatus'),timer=$('shadowTimer');if(!select||!recordButton||!mineButton||!referenceButton||!status||!timer)return;
  const renderOptions=()=>{let picks=SHADOW_ITEMS.filter(x=>x.level===currentLevel()).slice(0,5);if(!picks.length)picks=prioritized(SHADOW_ITEMS).slice(0,5);select.innerHTML=picks.map(item=>`<option value="${escapeHtml(item.nl)}">${escapeHtml(item.nl)} — ${escapeHtml(item.zh)}</option>`).join('');};
  renderOptions();addEventListener('learn-nl-level-change',renderOptions);referenceButton.addEventListener('click',()=>speak(select.value,.9));
  try{
    const [waveModule,recordModule]=await Promise.all([import('https://cdn.jsdelivr.net/npm/wavesurfer.js@7.12.11/+esm'),import('https://cdn.jsdelivr.net/npm/wavesurfer.js@7.12.11/dist/plugins/record.esm.js')]);const WaveSurfer=waveModule.default,RecordPlugin=recordModule.default;
    const wavesurfer=WaveSurfer.create({container:'#shadowWaveform',height:88,waveColor:'#8e918a',progressColor:'#5f685d',cursorColor:'#5f685d',normalize:true,barWidth:2,barGap:2,barRadius:2});const record=wavesurfer.registerPlugin(RecordPlugin.create({scrollingWaveform:true,renderRecordedAudio:true}));let isRecording=false;
    record.on('record-start',()=>{isRecording=true;recordButton.textContent='■ 停止录音';recordButton.classList.add('is-recording');mineButton.disabled=true;status.textContent='正在录音。说完整句子，别追求快。';});
    record.on('record-progress',duration=>{const total=Math.floor(duration/1000);timer.textContent=`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;});
    record.on('record-end',()=>{isRecording=false;recordButton.textContent='● 重新录音';recordButton.classList.remove('is-recording');mineButton.disabled=false;status.textContent='录好了。先听自己，再听一次原句。';});
    recordButton.addEventListener('click',async()=>{try{if(isRecording)return record.stopRecording();timer.textContent='00:00';await record.startRecording();}catch(error){console.error(error);status.textContent='没拿到麦克风权限。请在浏览器设置里允许使用麦克风。';}});
    mineButton.addEventListener('click',()=>wavesurfer.playPause());
  }catch(error){console.error('WaveSurfer failed to load.',error);recordButton.disabled=true;status.textContent='录音波形组件暂时没有加载成功；原句播放仍然可用。';}
}

function initEasyDutch(){
  const choices=$('easyDutchChoices'),player=$('easyDutchPlayer');if(!choices||!player)return;
  const render=active=>{const ordered=prioritized(EASY_DUTCH);choices.innerHTML=ordered.map(v=>`<button class="easy-choice ${v.id===active?'active':''}" type="button" data-easy-id="${v.id}" data-easy-title="${escapeHtml(v.title)}"><span>${escapeHtml(v.label)} · ${LEVEL_LABEL[v.level]}</span><strong>${escapeHtml(v.title)}</strong><small class="zh-help">${escapeHtml(v.note)}</small></button>`).join('');};
  const chooseDefault=()=>{const v=prioritized(EASY_DUTCH)[0];player.src=`https://www.youtube-nocookie.com/embed/${v.id}`;player.title=`Easy Dutch: ${v.title}`;render(v.id);};
  choices.addEventListener('click',e=>{const b=e.target.closest('[data-easy-id]');if(!b)return;player.src=`https://www.youtube-nocookie.com/embed/${b.dataset.easyId}`;player.title=`Easy Dutch: ${b.dataset.easyTitle}`;render(b.dataset.easyId);});
  addEventListener('learn-nl-level-change',chooseDefault);chooseDefault();
}

async function init(){injectSections();initEasyDutch();await Promise.allSettled([initSearch(),initReview(),initShadowing()]);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();