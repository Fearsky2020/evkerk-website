const LESSON_ITEMS = [
  {id:'supermarket::Waar kan ik dit vinden?', scene:'在超市', kind:'句子', nl:'Waar kan ik dit vinden?', zh:'我在哪里可以找到这个？'},
  {id:'supermarket::Hoeveel kost dit?', scene:'在超市', kind:'句子', nl:'Hoeveel kost dit?', zh:'这个多少钱？'},
  {id:'supermarket::Heeft u dit ook in een andere maat?', scene:'在超市', kind:'句子', nl:'Heeft u dit ook in een andere maat?', zh:'这个有其他尺寸吗？'},
  {id:'supermarket::Mag ik een tasje?', scene:'在超市', kind:'句子', nl:'Mag ik een tasje?', zh:'可以给我一个袋子吗？'},
  {id:'supermarket::Kan ik pinnen?', scene:'在超市', kind:'句子', nl:'Kan ik pinnen?', zh:'我可以刷卡吗？'},
  {id:'doctor::Ik wil graag een afspraak maken.', scene:'看医生', kind:'句子', nl:'Ik wil graag een afspraak maken.', zh:'我想预约一下。'},
  {id:'doctor::Ik heb sinds gisteren pijn.', scene:'看医生', kind:'句子', nl:'Ik heb sinds gisteren pijn.', zh:'我从昨天开始疼。'},
  {id:'doctor::Ik voel me niet goed.', scene:'看医生', kind:'句子', nl:'Ik voel me niet goed.', zh:'我感觉不舒服。'},
  {id:'doctor::Moet ik medicijnen gebruiken?', scene:'看医生', kind:'句子', nl:'Moet ik medicijnen gebruiken?', zh:'我需要用药吗？'},
  {id:'doctor::Wanneer moet ik terugkomen?', scene:'看医生', kind:'句子', nl:'Wanneer moet ik terugkomen?', zh:'我什么时候需要再来？'},
  {id:'gemeente::Ik heb een afspraak om tien uur.', scene:'市政府', kind:'句子', nl:'Ik heb een afspraak om tien uur.', zh:'我十点有一个预约。'},
  {id:'gemeente::Waar moet ik me melden?', scene:'市政府', kind:'句子', nl:'Waar moet ik me melden?', zh:'我应该在哪里报到？'},
  {id:'gemeente::Welke documenten heb ik nodig?', scene:'市政府', kind:'句子', nl:'Welke documenten heb ik nodig?', zh:'我需要哪些文件？'},
  {id:'gemeente::Kunt u mij hiermee helpen?', scene:'市政府', kind:'句子', nl:'Kunt u mij hiermee helpen?', zh:'您能帮我处理这个吗？'},
  {id:'gemeente::Wanneer is het klaar?', scene:'市政府', kind:'句子', nl:'Wanneer is het klaar?', zh:'什么时候可以办好？'},
  {id:'neighbors::Goedemorgen! Alles goed?', scene:'邻居寒暄', kind:'句子', nl:'Goedemorgen! Alles goed?', zh:'早上好！都好吗？'},
  {id:'neighbors::Hoe was je weekend?', scene:'邻居寒暄', kind:'句子', nl:'Hoe was je weekend?', zh:'你周末过得怎么样？'},
  {id:'neighbors::Lekker weer vandaag, hè?', scene:'邻居寒暄', kind:'句子', nl:'Lekker weer vandaag, hè?', zh:'今天天气不错，是吧？'},
  {id:'neighbors::Fijne dag nog!', scene:'邻居寒暄', kind:'句子', nl:'Fijne dag nog!', zh:'祝你今天接下来愉快！'},
  {id:'neighbors::Tot ziens!', scene:'邻居寒暄', kind:'句子', nl:'Tot ziens!', zh:'再见！'},
  {id:'phone::Goedemorgen, u spreekt met Wang.', scene:'打电话', kind:'句子', nl:'Goedemorgen, u spreekt met Wang.', zh:'早上好，我是 Wang。'},
  {id:'phone::Ik bel voor een afspraak.', scene:'打电话', kind:'句子', nl:'Ik bel voor een afspraak.', zh:'我打电话是为了预约。'},
  {id:'phone::Kunt u dat herhalen, alstublieft?', scene:'打电话', kind:'句子', nl:'Kunt u dat herhalen, alstublieft?', zh:'您可以再说一遍吗？'},
  {id:'phone::Kunt u iets langzamer spreken?', scene:'打电话', kind:'句子', nl:'Kunt u iets langzamer spreken?', zh:'您可以说慢一点吗？'},
  {id:'phone::Dank u wel voor uw hulp.', scene:'打电话', kind:'句子', nl:'Dank u wel voor uw hulp.', zh:'谢谢您的帮助。'},
  {id:'church::Welkom in onze kerk.', scene:'教会', kind:'句子', nl:'Welkom in onze kerk.', zh:'欢迎来到我们的教会。'},
  {id:'church::Zullen we samen bidden?', scene:'教会', kind:'句子', nl:'Zullen we samen bidden?', zh:'我们一起祷告好吗？'},
  {id:'church::De dienst begint om tien uur.', scene:'教会', kind:'句子', nl:'De dienst begint om tien uur.', zh:'聚会十点开始。'}
];

const VOCAB_ITEMS = [
  ['在超市','de kassa','收银台'],['在超市','de aanbieding','特价 / 优惠'],['在超市','de tas','袋子'],['在超市','contant','现金'],['在超市','pinnen','刷卡 / 借记卡支付'],
  ['看医生','de afspraak','预约'],['看医生','de klacht','症状 / 不适'],['看医生','de pijn','疼痛'],['看医生','het recept','处方'],['看医生','de apotheek','药房'],
  ['市政府','de gemeente','市政府'],['市政府','het formulier','表格'],['市政府','het paspoort','护照'],['市政府','de inschrijving','登记 / 注册'],
  ['邻居寒暄','de buurman','男邻居'],['邻居寒暄','de buurvrouw','女邻居'],['邻居寒暄','gezellig','愉快 / 有氛围'],['邻居寒暄','het weekend','周末'],['邻居寒暄','het weer','天气'],
  ['打电话','bellen','打电话'],['打电话','doorverbinden','转接电话'],['打电话','bereikbaar','可以联系到'],['打电话','het nummer','号码'],['打电话','een momentje','稍等一下']
].map(([scene,nl,zh], index) => ({id:`vocab-${index}`,scene,kind:'单词',nl,zh}));

const SEARCH_ITEMS = [...LESSON_ITEMS, ...VOCAB_ITEMS];
const REVIEW_ITEMS = LESSON_ITEMS.filter(item => !item.id.startsWith('church::'));
const FSRS_STORAGE = 'learn-nl-fsrs-cards-v1';

const EASY_DUTCH = [
  {id:'jSyrqH_MMOM',label:'入门生存词',title:'100 Words You Should Know When Coming to the Netherlands',note:'适合第一次建立“来荷兰就会用”的词汇地图。'},
  {id:'iA61Z0BAI90',label:'慢速小聊',title:'Small Talk (in Slow Dutch)',note:'跟我们“邻居寒暄”场景很搭，先听节奏再模仿。'},
  {id:'w2xDfh3xQuA',label:'高频 kunnen',title:'50 Everyday Sentences with the Verb “kunnen”',note:'练“能不能、可以不可以”，日常求助特别常用。'}
];

function $(id){ return document.getElementById(id); }
function escapeHtml(value){ return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function speak(text, rate = 0.94){
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'nl-NL';
  utterance.rate = rate;
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(v => /^nl(-|_)/i.test(v.lang)) || voices.find(v => /Dutch|Nederlands/i.test(v.name));
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

function injectSections(){
  const future = document.querySelector('.future-section');
  if (!future || document.getElementById('smartTools')) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <section class="smart-section" id="smartTools">
      <div class="shell">
        <div class="smart-heading">
          <div><p class="eyebrow">SLIM LEREN</p><h2>别只学更多，先把会的变成真的会。</h2></div>
          <p class="zh-help">这一层使用成熟的开源组件：模糊搜索、FSRS 间隔复习和浏览器录音波形。所有学习记录仍只保存在本机。</p>
        </div>
        <div class="smart-grid">
          <article class="smart-card search-tool">
            <span class="smart-chip">Fuse.js</span><p class="eyebrow">SNEL ZOEKEN</p><h3>我现在想说什么？</h3>
            <p class="zh-help">中文、荷兰文都能搜；拼错一点也尽量帮你找到本站已经学过的句子。</p>
            <label class="smart-search-box"><span aria-hidden="true">⌕</span><input id="smartSearchInput" type="search" autocomplete="off" placeholder="例如：预约 / afspraak / 慢一点"></label>
            <div class="smart-search-results" id="smartSearchResults" aria-live="polite"></div>
            <p class="smart-source zh-help">完整荷兰语拼写词库已选定 OpenTaal（BSD/CC BY）。它的原始词表约 5 MB，因此 v0.3 不在手机首屏硬塞整库，后续会做轻量索引。</p>
          </article>
          <article class="smart-card review-tool">
            <span class="smart-chip">FSRS v6</span><p class="eyebrow">HERHALEN</p>
            <div class="smart-card-titleline"><h3>今天该复习什么？</h3><strong id="reviewDueCount">—</strong></div>
            <p class="zh-help">系统不再只有“我会了”。每次回忆后选真实感受，它会自动安排下一次出现时间。</p>
            <div class="review-stage" id="reviewStage"><p class="review-empty zh-help">正在加载智能复习器…</p></div>
          </article>
        </div>
        <article class="shadow-card" id="shadowing">
          <div class="shadow-copy">
            <span class="smart-chip">WaveSurfer.js</span><p class="eyebrow">NAZEGGEN · SHADOWING</p><h3>听一句，自己说，再听自己。</h3>
            <p class="zh-help">先不假装“AI 评分”。v0.3 做最实用的一步：原句 → 麦克风录音 → 看波形 → 回放对照。录音不会上传服务器。</p>
            <label class="shadow-select-label" for="shadowPhrase">今天跟读</label><select id="shadowPhrase" class="shadow-select"></select>
            <div class="shadow-actions"><button class="btn secondary" id="shadowReference" type="button">🔊 听原句</button><button class="btn primary" id="shadowRecord" type="button">● 开始录音</button><button class="btn secondary" id="shadowMine" type="button" disabled>▶ 听我的</button></div>
            <p class="shadow-status zh-help" id="shadowStatus">第一次使用时，浏览器会询问麦克风权限。</p>
          </div>
          <div class="wave-panel"><div class="wave-caption"><span>我的声音</span><small id="shadowTimer">00:00</small></div><div id="shadowWaveform" class="shadow-waveform" aria-label="录音波形"></div></div>
        </article>
      </div>
    </section>
    <section class="easy-dutch-section" id="easyDutch">
      <div class="shell">
        <div class="smart-heading easy-heading">
          <div><p class="eyebrow">ECHT NEDERLANDS · EASY DUTCH</p><h2>课本之外，听荷兰人真的怎么说。</h2></div>
          <p class="zh-help">这里使用 Easy Dutch 官方 YouTube 播放器。视频仍属于 Easy Dutch / Easy Languages；我们只在旁边提供自己的学习路线，不复制其会员 transcript、音频或练习材料。</p>
        </div>
        <div class="easy-layout">
          <div class="easy-player-wrap"><iframe id="easyDutchPlayer" class="easy-player" src="https://www.youtube-nocookie.com/embed/jSyrqH_MMOM" title="Easy Dutch: 100 Words You Should Know When Coming to the Netherlands" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
          <div class="easy-side">
            <div id="easyDutchChoices" class="easy-choices"></div>
            <div class="watch-plan"><strong>别把视频当背景音：</strong><ol class="zh-help"><li>第一遍不暂停，先抓主题和节奏。</li><li>第二遍开 YouTube 自带字幕，记 3 个你真想用的表达。</li><li>第三遍挑一句，回到上面的跟读区自己说一遍。</li></ol></div>
            <a class="btn secondary easy-channel-link" href="https://www.youtube.com/@EasyDutch" target="_blank" rel="noopener">在 YouTube 打开 Easy Dutch ↗</a>
          </div>
        </div>
      </div>
    </section>`;
  [...wrapper.children].forEach(node => future.parentNode.insertBefore(node, future));
}

async function initSearch(){
  const input = $('smartSearchInput'); const results = $('smartSearchResults'); if (!input || !results) return;
  let FuseCtor = null;
  try { const mod = await import('https://cdn.jsdelivr.net/npm/fuse.js@7.5.0/+esm'); FuseCtor = mod.default; }
  catch (error) { console.warn('Fuse.js unavailable, using simple search fallback.', error); }
  const fuse = FuseCtor ? new FuseCtor(SEARCH_ITEMS,{keys:[{name:'nl',weight:0.5},{name:'zh',weight:0.35},{name:'scene',weight:0.15}],threshold:0.38,ignoreLocation:true,includeScore:true}) : null;
  const render = (items) => {
    if (!items.length) { results.innerHTML = '<p class="search-empty zh-help">暂时没在本站课程里找到。以后这里会接 OpenTaal 轻量词库和司南表达建议。</p>'; return; }
    results.innerHTML = items.slice(0,6).map(item => `<button class="search-result" type="button" data-search-speak="${escapeHtml(item.nl)}"><span><strong>${escapeHtml(item.nl)}</strong><small>${escapeHtml(item.scene)} · ${escapeHtml(item.kind)}</small></span><span class="zh-help">${escapeHtml(item.zh)}</span><b aria-hidden="true">🔊</b></button>`).join('');
  };
  const doSearch = () => { const query=input.value.trim(); if(!query)return render(SEARCH_ITEMS.slice(0,5)); if(fuse)return render(fuse.search(query).map(result=>result.item)); const q=query.toLocaleLowerCase(); render(SEARCH_ITEMS.filter(item=>`${item.nl} ${item.zh} ${item.scene}`.toLocaleLowerCase().includes(q))); };
  input.addEventListener('input',doSearch); results.addEventListener('click',event=>{const button=event.target.closest('[data-search-speak]');if(button)speak(button.dataset.searchSpeak);}); render(SEARCH_ITEMS.slice(0,5));
}

function serializeCard(card){ return {...card,due:card.due instanceof Date?card.due.getTime():card.due,last_review:card.last_review instanceof Date?card.last_review.getTime():(card.last_review??null)}; }
function loadCards(){ try{return JSON.parse(localStorage.getItem(FSRS_STORAGE))||{};}catch(_){return{};} }
function saveCards(cards){ localStorage.setItem(FSRS_STORAGE,JSON.stringify(cards)); }
function formatWhen(dateInput){ const date=new Date(dateInput);const ms=date.getTime()-Date.now();if(ms<=60000)return'很快再见';const minutes=Math.round(ms/60000);if(minutes<60)return`${minutes} 分钟后`;const hours=Math.round(ms/3600000);if(hours<24)return`${hours} 小时后`;const days=Math.round(ms/86400000);if(days<=30)return`${days} 天后`;return date.toLocaleDateString('zh-CN',{month:'short',day:'numeric'}); }

async function initReview(){
  const stage=$('reviewStage');const dueCount=$('reviewDueCount');if(!stage||!dueCount)return;
  try{
    const mod=await import('https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/+esm');
    const scheduler=mod.fsrs({request_retention:0.9,maximum_interval:3650,enable_fuzz:true,enable_short_term:true});const{Rating,createEmptyCard}=mod;let cards=loadCards();let current=null;
    const getCard=id=>cards[id]||serializeCard(createEmptyCard(new Date())); const dueItems=()=>REVIEW_ITEMS.filter(item=>new Date(getCard(item.id).due).getTime()<=Date.now()); const updateCount=()=>{dueCount.textContent=`${dueItems().length} 条`;};
    const pickNext=()=>{
      const due=dueItems();current=due[0]||null;updateCount();if(!current){stage.innerHTML='<div class="review-done"><strong>今天先到这里 ✓</strong><p class="zh-help">FSRS 会在合适的时间把句子重新送回来，不用一口气刷完。</p></div>';return;}
      const card=getCard(current.id);const preview=scheduler.repeat(card,new Date());const ratings=[[Rating.Again,'忘了'],[Rating.Hard,'有点难'],[Rating.Good,'记得'],[Rating.Easy,'太简单']];
      stage.innerHTML=`<div class="review-scene">${escapeHtml(current.scene)}</div><button class="review-speak" type="button" data-review-speak="${escapeHtml(current.nl)}">🔊</button><p class="review-dutch">${escapeHtml(current.nl)}</p><p class="review-cn zh-help">${escapeHtml(current.zh)}</p><p class="review-question zh-help">别看“熟不熟”，先在脑子里回忆一下，再选：</p><div class="rating-grid">${ratings.map(([rating,label])=>`<button type="button" data-fsrs-rating="${rating}"><strong>${label}</strong><small>${formatWhen(preview[rating].card.due)}</small></button>`).join('')}</div>`;
    };
    stage.addEventListener('click',event=>{const speakButton=event.target.closest('[data-review-speak]');if(speakButton)return speak(speakButton.dataset.reviewSpeak);const ratingButton=event.target.closest('[data-fsrs-rating]');if(!ratingButton||!current)return;const rating=Number(ratingButton.dataset.fsrsRating);const result=scheduler.next(getCard(current.id),new Date(),rating);cards[current.id]=serializeCard(result.card);saveCards(cards);pickNext();}); pickNext();
  }catch(error){console.error('FSRS failed to load.',error);dueCount.textContent='离线';stage.innerHTML='<p class="review-empty zh-help">智能复习组件暂时没有加载成功。普通场景、听力和测验仍可正常使用。</p>';}
}

async function initShadowing(){
  const select=$('shadowPhrase');const recordButton=$('shadowRecord');const mineButton=$('shadowMine');const referenceButton=$('shadowReference');const status=$('shadowStatus');const timer=$('shadowTimer');if(!select||!recordButton||!mineButton||!referenceButton||!status||!timer)return;
  const favorites=[REVIEW_ITEMS.find(x=>x.nl.includes('langzamer')),REVIEW_ITEMS.find(x=>x.nl.includes('afspraak maken')),REVIEW_ITEMS.find(x=>x.nl.includes('Alles goed')),REVIEW_ITEMS.find(x=>x.nl.includes('helpen')),REVIEW_ITEMS.find(x=>x.nl.includes('herhalen'))].filter(Boolean);
  select.innerHTML=favorites.map(item=>`<option value="${escapeHtml(item.nl)}">${escapeHtml(item.nl)} — ${escapeHtml(item.zh)}</option>`).join('');referenceButton.addEventListener('click',()=>speak(select.value,0.9));
  try{
    const[waveModule,recordModule]=await Promise.all([import('https://cdn.jsdelivr.net/npm/wavesurfer.js@7.12.11/+esm'),import('https://cdn.jsdelivr.net/npm/wavesurfer.js@7.12.11/dist/plugins/record.esm.js')]);const WaveSurfer=waveModule.default;const RecordPlugin=recordModule.default;
    const wavesurfer=WaveSurfer.create({container:'#shadowWaveform',height:88,waveColor:'#8e918a',progressColor:'#5f685d',cursorColor:'#5f685d',normalize:true,barWidth:2,barGap:2,barRadius:2});const record=wavesurfer.registerPlugin(RecordPlugin.create({scrollingWaveform:true,renderRecordedAudio:true}));let isRecording=false;
    record.on('record-start',()=>{isRecording=true;recordButton.textContent='■ 停止录音';recordButton.classList.add('is-recording');mineButton.disabled=true;status.textContent='正在录音。说完整句子，别追求快。';});
    record.on('record-progress',duration=>{const total=Math.floor(duration/1000);timer.textContent=`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;});
    record.on('record-end',()=>{isRecording=false;recordButton.textContent='● 重新录音';recordButton.classList.remove('is-recording');mineButton.disabled=false;status.textContent='录好了。先听自己，再听一次原句，比较节奏、停顿和重音。';});
    recordButton.addEventListener('click',async()=>{try{if(isRecording)return record.stopRecording();timer.textContent='00:00';await record.startRecording();}catch(error){console.error(error);status.textContent='没拿到麦克风权限。请在浏览器设置里允许这个网站使用麦克风。';}});mineButton.addEventListener('click',()=>wavesurfer.playPause());
  }catch(error){console.error('WaveSurfer failed to load.',error);recordButton.disabled=true;status.textContent='录音波形组件暂时没有加载成功；原句播放仍然可用。';}
}

function initEasyDutch(){
  const choices=$('easyDutchChoices');const player=$('easyDutchPlayer');if(!choices||!player)return;
  const renderChoices=activeId=>{choices.innerHTML=EASY_DUTCH.map(video=>`<button class="easy-choice ${video.id===activeId?'active':''}" type="button" data-easy-id="${video.id}" data-easy-title="${escapeHtml(video.title)}"><span>${escapeHtml(video.label)}</span><strong>${escapeHtml(video.title)}</strong><small class="zh-help">${escapeHtml(video.note)}</small></button>`).join('');};
  choices.addEventListener('click',event=>{const button=event.target.closest('[data-easy-id]');if(!button)return;player.src=`https://www.youtube-nocookie.com/embed/${button.dataset.easyId}`;player.title=`Easy Dutch: ${button.dataset.easyTitle}`;renderChoices(button.dataset.easyId);});renderChoices(EASY_DUTCH[0].id);
}

async function init(){injectSections();initEasyDutch();await Promise.allSettled([initSearch(),initReview(),initShadowing()]);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
