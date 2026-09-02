(() => {
  'use strict';

  const VERSION = '0.2';
  const FREE_DAILY_MAX = 20;
  const DEFAULT_DAILY_GOAL = 20;
  const FREQ_URL = 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/nl/nl_50k.txt';
  const SETTINGS_KEY = 'taalvia-lock-settings-v2';
  const LEGACY_SETTINGS_KEY = 'taalvia-lock-settings-v1';
  const STATE_KEY = 'taalvia-lock-learning-v1';
  const TODAY_KEY = 'taalvia-lock-today-v2';

  // Curated learner-facing layer. The 5,000-word frequency corpus ranks/selects;
  // this layer provides reliable Chinese meaning, article and example context.
  const WORDS = [
    {w:'goed',d:'goed',z:'好；好的',t:'形容词',e:'Dat is een goed idee.',c:'那是个好主意。',l:'start'},
    {w:'tijd',d:'de tijd',z:'时间',t:'名词 · de',e:'Heb je vandaag tijd?',c:'你今天有时间吗？',l:'start'},
    {w:'huis',d:'het huis',z:'房子；家',t:'名词 · het',e:'Dit is mijn huis.',c:'这是我的家。',l:'start'},
    {w:'dag',d:'de dag',z:'天；日子',t:'名词 · de',e:'Fijne dag!',c:'祝你今天愉快！',l:'start'},
    {w:'werk',d:'het werk',z:'工作',t:'名词 · het',e:'Ik ga naar mijn werk.',c:'我要去上班。',l:'start'},
    {w:'mensen',d:'de mensen',z:'人们',t:'名词 · de · 复数',e:'Er zijn veel mensen.',c:'这里有很多人。',l:'start'},
    {w:'jaar',d:'het jaar',z:'年',t:'名词 · het',e:'Ik woon hier al vijf jaar.',c:'我已经在这里住五年了。',l:'start'},
    {w:'vragen',d:'vragen',z:'问；提问',t:'动词',e:'Mag ik iets vragen?',c:'我可以问个问题吗？',l:'start'},
    {w:'weten',d:'weten',z:'知道',t:'动词',e:'Ik weet het niet.',c:'我不知道。',l:'start'},
    {w:'komen',d:'komen',z:'来',t:'动词',e:'Kom je morgen?',c:'你明天来吗？',l:'start'},
    {w:'gaan',d:'gaan',z:'去；走',t:'动词',e:'We gaan naar huis.',c:'我们回家。',l:'start'},
    {w:'maken',d:'maken',z:'做；制作',t:'动词',e:'Ik maak vanavond eten.',c:'我今晚做饭。',l:'start'},
    {w:'vinden',d:'vinden',z:'觉得；找到',t:'动词',e:'Wat vind je hiervan?',c:'你觉得这个怎么样？',l:'start'},
    {w:'denken',d:'denken',z:'想；思考',t:'动词',e:'Ik denk dat het goed is.',c:'我觉得这样很好。',l:'start'},
    {w:'helpen',d:'helpen',z:'帮助',t:'动词',e:'Kunt u mij helpen?',c:'您能帮我吗？',l:'start'},
    {w:'geven',d:'geven',z:'给',t:'动词',e:'Kun je mij dat geven?',c:'你能把那个给我吗？',l:'start'},
    {w:'nemen',d:'nemen',z:'拿；乘坐；取',t:'动词',e:'Ik neem de trein.',c:'我坐火车。',l:'start'},
    {w:'eten',d:'eten',z:'吃；食物',t:'动词 / 名词',e:'Wat wil je eten?',c:'你想吃什么？',l:'start'},
    {w:'drinken',d:'drinken',z:'喝',t:'动词',e:'Wil je iets drinken?',c:'你想喝点什么吗？',l:'start'},
    {w:'spreken',d:'spreken',z:'说；讲（语言）',t:'动词',e:'Spreekt u Engels?',c:'您会说英语吗？',l:'start'},
    {w:'leren',d:'leren',z:'学习',t:'动词',e:'Ik leer Nederlands.',c:'我在学荷兰语。',l:'start'},
    {w:'begrijp',d:'begrijpen',z:'理解；明白',t:'动词',e:'Ik begrijp wat je bedoelt.',c:'我明白你的意思。',l:'start'},
    {w:'vandaag',d:'vandaag',z:'今天',t:'副词',e:'Vandaag heb ik les.',c:'我今天有课。',l:'start'},
    {w:'morgen',d:'morgen',z:'明天；早晨',t:'副词 / 名词',e:'Tot morgen!',c:'明天见！',l:'start'},
    {w:'gisteren',d:'gisteren',z:'昨天',t:'副词',e:'Gisteren was ik thuis.',c:'昨天我在家。',l:'start'},
    {w:'graag',d:'graag',z:'乐意；喜欢',t:'副词',e:'Ik drink graag koffie.',c:'我喜欢喝咖啡。',l:'start'},
    {w:'snel',d:'snel',z:'快；快速的',t:'形容词 / 副词',e:'De trein is heel snel.',c:'这趟火车很快。',l:'start'},
    {w:'rustig',d:'rustig',z:'安静的；慢慢来',t:'形容词 / 副词',e:'Doe maar rustig.',c:'慢慢来。',l:'start'},
    {w:'belangrijk',d:'belangrijk',z:'重要的',t:'形容词',e:'Dit is belangrijk.',c:'这很重要。',l:'start'},
    {w:'duidelijk',d:'duidelijk',z:'清楚的；明确的',t:'形容词',e:'Is het zo duidelijk?',c:'这样清楚吗？',l:'start'},

    {w:'afspraak',d:'de afspraak',z:'预约；约定',t:'名词 · de',e:'Ik heb morgen een afspraak.',c:'我明天有个预约。',l:'daily'},
    {w:'week',d:'de week',z:'星期；周',t:'名词 · de',e:'Volgende week ben ik vrij.',c:'我下周有空。',l:'daily'},
    {w:'school',d:'de school',z:'学校',t:'名词 · de',e:'De kinderen zijn op school.',c:'孩子们在学校。',l:'daily'},
    {w:'dokter',d:'de dokter',z:'医生',t:'名词 · de',e:'Ik moet naar de dokter.',c:'我得去看医生。',l:'daily'},
    {w:'kamer',d:'de kamer',z:'房间',t:'名词 · de',e:'De kamer is boven.',c:'房间在楼上。',l:'daily'},
    {w:'deur',d:'de deur',z:'门',t:'名词 · de',e:'Doe de deur maar dicht.',c:'把门关上吧。',l:'daily'},
    {w:'water',d:'het water',z:'水',t:'名词 · het',e:'Mag ik een glas water?',c:'可以给我一杯水吗？',l:'daily'},
    {w:'telefoon',d:'de telefoon',z:'电话；手机',t:'名词 · de',e:'Mijn telefoon ligt thuis.',c:'我的手机在家里。',l:'daily'},
    {w:'nummer',d:'het nummer',z:'号码；数字',t:'名词 · het',e:'Wat is uw telefoonnummer?',c:'您的电话号码是多少？',l:'daily'},
    {w:'buurt',d:'de buurt',z:'附近；社区',t:'名词 · de',e:'Ik woon in deze buurt.',c:'我住在这个社区。',l:'daily'},
    {w:'baan',d:'de baan',z:'工作；职位',t:'名词 · de',e:'Hij zoekt een nieuwe baan.',c:'他在找一份新工作。',l:'daily'},
    {w:'winkel',d:'de winkel',z:'商店',t:'名词 · de',e:'De winkel is nog open.',c:'商店还开着。',l:'daily'},
    {w:'kopen',d:'kopen',z:'购买',t:'动词',e:'Waar kan ik dit kopen?',c:'我在哪里可以买到这个？',l:'daily'},
    {w:'betalen',d:'betalen',z:'付款',t:'动词',e:'Kan ik met pin betalen?',c:'我可以刷卡付款吗？',l:'daily'},
    {w:'bellen',d:'bellen',z:'打电话',t:'动词',e:'Ik bel je vanavond.',c:'我今晚给你打电话。',l:'daily'},
    {w:'wachten',d:'wachten',z:'等待',t:'动词',e:'Ik wacht buiten.',c:'我在外面等。',l:'daily'},
    {w:'brengen',d:'brengen',z:'带来；送',t:'动词',e:'Kun je mij naar huis brengen?',c:'你能送我回家吗？',l:'daily'},
    {w:'zoeken',d:'zoeken',z:'寻找',t:'动词',e:'Ik zoek het station.',c:'我在找火车站。',l:'daily'},
    {w:'gebruiken',d:'gebruiken',z:'使用',t:'动词',e:'Mag ik dit gebruiken?',c:'我可以用这个吗？',l:'daily'},
    {w:'beginnen',d:'beginnen',z:'开始',t:'动词',e:'De les begint om negen uur.',c:'课程九点开始。',l:'daily'},
    {w:'stoppen',d:'stoppen',z:'停止；停下',t:'动词',e:'De bus stopt hier.',c:'公交车在这里停。',l:'daily'},
    {w:'blijven',d:'blijven',z:'停留；继续保持',t:'动词',e:'Ik blijf vandaag thuis.',c:'我今天待在家里。',l:'daily'},
    {w:'mogelijk',d:'mogelijk',z:'可能的；可行的',t:'形容词',e:'Is dat morgen mogelijk?',c:'明天可以吗？',l:'daily'},
    {w:'genoeg',d:'genoeg',z:'足够',t:'形容词 / 副词',e:'Dat is genoeg voor vandaag.',c:'今天这样就够了。',l:'daily'},
    {w:'lekker',d:'lekker',z:'好吃；舒服；惬意',t:'形容词 / 副词',e:'De soep is lekker.',c:'这个汤很好喝。',l:'daily'},
    {w:'veilig',d:'veilig',z:'安全的',t:'形容词',e:'Is deze buurt veilig?',c:'这个社区安全吗？',l:'daily'},
    {w:'moeilijk',d:'moeilijk',z:'困难的',t:'形容词',e:'Nederlands is soms moeilijk.',c:'荷兰语有时候很难。',l:'daily'},
    {w:'samen',d:'samen',z:'一起',t:'副词',e:'We doen dit samen.',c:'我们一起做这件事。',l:'daily'},
    {w:'meestal',d:'meestal',z:'通常；大多数时候',t:'副词',e:'Ik ga meestal met de fiets.',c:'我通常骑自行车去。',l:'daily'},
    {w:'misschien',d:'misschien',z:'也许；可能',t:'副词',e:'Misschien kom ik later.',c:'我可能晚点来。',l:'daily'},

    {w:'eigenlijk',d:'eigenlijk',z:'其实；实际上',t:'副词',e:'Wat bedoel je eigenlijk?',c:'你到底是什么意思？',l:'natural'},
    {w:'precies',d:'precies',z:'正好；准确地',t:'副词 / 形容词',e:'Dat is precies wat ik bedoel.',c:'这正是我的意思。',l:'natural'},
    {w:'waarschijnlijk',d:'waarschijnlijk',z:'很可能；大概',t:'副词 / 形容词',e:'Hij komt waarschijnlijk later.',c:'他大概会晚点来。',l:'natural'},
    {w:'natuurlijk',d:'natuurlijk',z:'当然；自然的',t:'副词 / 形容词',e:'Natuurlijk kan ik helpen.',c:'我当然可以帮忙。',l:'natural'},
    {w:'inderdaad',d:'inderdaad',z:'确实；的确',t:'副词',e:'Dat klopt inderdaad.',c:'那确实没错。',l:'natural'},
    {w:'trouwens',d:'trouwens',z:'顺便说；话说回来',t:'副词',e:'Trouwens, hoe gaat het met je?',c:'对了，你最近怎么样？',l:'natural'},
    {w:'blijkbaar',d:'blijkbaar',z:'显然；看来',t:'副词',e:'Hij is blijkbaar al weg.',c:'看来他已经走了。',l:'natural'},
    {w:'uiteindelijk',d:'uiteindelijk',z:'最终；最后',t:'副词',e:'Uiteindelijk kwam alles goed.',c:'最后一切都好了。',l:'natural'},
    {w:'verschil',d:'het verschil',z:'差别；区别',t:'名词 · het',e:'Wat is het verschil?',c:'有什么区别？',l:'natural'},
    {w:'reden',d:'de reden',z:'原因；理由',t:'名词 · de',e:'Wat is de reden?',c:'原因是什么？',l:'natural'},
    {w:'manier',d:'de manier',z:'方式；方法',t:'名词 · de',e:'Dat is een goede manier.',c:'这是个好方法。',l:'natural'},
    {w:'gevoel',d:'het gevoel',z:'感觉；感受',t:'名词 · het',e:'Ik heb daar een goed gevoel bij.',c:'我对此感觉不错。',l:'natural'},
    {w:'ervaring',d:'de ervaring',z:'经验；经历',t:'名词 · de',e:'Dat was een mooie ervaring.',c:'那是一次很好的经历。',l:'natural'},
    {w:'keuze',d:'de keuze',z:'选择',t:'名词 · de',e:'Je hebt twee keuzes.',c:'你有两个选择。',l:'natural'},
    {w:'besluit',d:'het besluit',z:'决定；决议',t:'名词 · het',e:'We nemen morgen een besluit.',c:'我们明天做决定。',l:'natural'},
    {w:'veranderen',d:'veranderen',z:'改变；变化',t:'动词',e:'De situatie kan snel veranderen.',c:'情况可能很快改变。',l:'natural'},
    {w:'proberen',d:'proberen',z:'尝试',t:'动词',e:'Ik wil het nog een keer proberen.',c:'我想再试一次。',l:'natural'},
    {w:'vertellen',d:'vertellen',z:'告诉；讲述',t:'动词',e:'Kun je mij meer vertellen?',c:'你能多告诉我一些吗？',l:'natural'},
    {w:'bedoelen',d:'bedoelen',z:'意思是；意指',t:'动词',e:'Wat bedoel je daarmee?',c:'你那是什么意思？',l:'natural'},
    {w:'verwachten',d:'verwachten',z:'期待；预计',t:'动词',e:'Wanneer verwacht je hem?',c:'你预计他什么时候来？',l:'natural'},
    {w:'bespreken',d:'bespreken',z:'讨论；商量',t:'动词',e:'We bespreken het morgen.',c:'我们明天讨论这件事。',l:'natural'},
    {w:'regelen',d:'regelen',z:'安排；处理',t:'动词',e:'Ik zal het voor je regelen.',c:'我会替你安排好。',l:'natural'},
    {w:'onthouden',d:'onthouden',z:'记住',t:'动词',e:'Ik probeer dit woord te onthouden.',c:'我在努力记住这个单词。',l:'natural'},
    {w:'vergeten',d:'vergeten',z:'忘记',t:'动词',e:'Ik ben zijn naam vergeten.',c:'我忘了他的名字。',l:'natural'},
    {w:'vertrouwen',d:'vertrouwen',z:'信任；相信',t:'动词 / 名词',e:'Ik vertrouw op jou.',c:'我相信你。',l:'natural'},
    {w:'oplossing',d:'de oplossing',z:'解决办法',t:'名词 · de',e:'We zoeken samen een oplossing.',c:'我们一起找解决办法。',l:'natural'},
    {w:'informatie',d:'de informatie',z:'信息；资料',t:'名词 · de',e:'Waar kan ik meer informatie vinden?',c:'我在哪里能找到更多信息？',l:'natural'},
    {w:'belangrijkste',d:'het belangrijkste',z:'最重要的事；最重要的',t:'形容词名词化',e:'Dit is het belangrijkste punt.',c:'这是最重要的一点。',l:'natural'},
    {w:'ongeveer',d:'ongeveer',z:'大约；大概',t:'副词',e:'Het duurt ongeveer tien minuten.',c:'大约需要十分钟。',l:'natural'},
    {w:'vooral',d:'vooral',z:'尤其；主要',t:'副词',e:'Ik gebruik het vooral voor mijn werk.',c:'我主要把它用于工作。',l:'natural'}
  ];

  const els = {};
  let settings = loadSettings();
  let learning = loadJson(STATE_KEY, {known:[],hard:[]});
  let today = [];
  let current = 0;
  let rankMap = new Map();
  let corpusState = '本地候选';
  let deferredInstallPrompt = null;
  let hiddenAt = 0;

  function loadJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed && typeof parsed === 'object' ? {...fallback,...parsed} : {...fallback};
    } catch (_) { return {...fallback}; }
  }

  function loadSettings() {
    const fallback = {level:'start',showChinese:true,showExample:true,lockNotify:false,dailyGoal:DEFAULT_DAILY_GOAL};
    const fresh = loadJson(SETTINGS_KEY, fallback);
    if (localStorage.getItem(SETTINGS_KEY)) return normalizeSettings(fresh);
    const legacy = loadJson(LEGACY_SETTINGS_KEY, fallback);
    return normalizeSettings({...fallback,...legacy,dailyGoal:DEFAULT_DAILY_GOAL});
  }

  function normalizeSettings(value) {
    const goal = Number(value.dailyGoal);
    return {
      ...value,
      level:['start','daily','natural'].includes(value.level) ? value.level : 'start',
      dailyGoal:Number.isFinite(goal) ? Math.max(1,Math.min(FREE_DAILY_MAX,Math.round(goal))) : DEFAULT_DAILY_GOAL,
      showChinese:value.showChinese !== false,
      showExample:value.showExample !== false,
      lockNotify:!!value.lockNotify
    };
  }

  function saveJson(key,value){ localStorage.setItem(key,JSON.stringify(value)); }
  function dailyLimit(){ return Math.max(1,Math.min(FREE_DAILY_MAX,Number(settings.dailyGoal)||DEFAULT_DAILY_GOAL)); }

  function dateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function hash(input) {
    let h = 2166136261;
    for (let i=0;i<input.length;i++) { h ^= input.charCodeAt(i); h = Math.imul(h,16777619); }
    return h >>> 0;
  }

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffled(items,random) {
    const copy = items.slice();
    for (let i=copy.length-1;i>0;i--) {
      const j = Math.floor(random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy;
  }

  function currentPool() {
    const levels = settings.level === 'start' ? ['start'] : settings.level === 'daily' ? ['start','daily'] : ['daily','natural'];
    let pool = WORDS.filter(item => levels.includes(item.l));
    if (rankMap.size) {
      const inCorpus = pool.filter(item => rankMap.has(item.w));
      if (inCorpus.length >= dailyLimit()) pool = inCorpus;
    }
    return pool.slice().sort((a,b)=>(rankMap.get(a.w)||999999)-(rankMap.get(b.w)||999999));
  }

  function chooseToday() {
    const limit = dailyLimit();
    const signature = `${VERSION}|${dateKey()}|${settings.level}`;
    const snapshot = loadJson(TODAY_KEY, {signature:'',words:[]});
    let stored = [];

    if (snapshot.signature === signature && Array.isArray(snapshot.words)) {
      stored = snapshot.words.map(token => WORDS.find(item => item.w === token)).filter(Boolean);
      if (stored.length >= limit) return stored.slice(0,limit);
    }

    const pool = currentPool();
    const known = new Set(learning.known);
    const hard = new Set(learning.hard);
    const random = rng(hash(signature));
    const hardWords = shuffled(pool.filter(item => hard.has(item.w) && !known.has(item.w)),random);
    const freshWords = shuffled(pool.filter(item => !known.has(item.w) && !hard.has(item.w)),random);
    const rest = shuffled(pool,random);
    const ordered = [...hardWords,...freshWords,...rest];
    const seen = new Set(stored.map(item => item.w));

    for (const word of ordered) {
      if (stored.length >= limit) break;
      if (!seen.has(word.w)) { stored.push(word); seen.add(word.w); }
    }

    saveJson(TODAY_KEY,{signature,words:stored.map(item=>item.w)});
    return stored.slice(0,limit);
  }

  async function loadCorpus() {
    els.corpusStatus.textContent = '载入中';
    try {
      const response = await fetch(FREQ_URL,{cache:'force-cache'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const lines = (await response.text()).split(/\r?\n/).filter(Boolean).slice(0,5000);
      if (lines.length < 4500) throw new Error('frequency corpus incomplete');
      rankMap = new Map(lines.map((line,index)=>[line.trim().split(/\s+/)[0],index+1]));
      corpusState = '5000 已加载';
      els.corpusStatus.textContent = '5000';
    } catch (error) {
      corpusState = '离线候选';
      els.corpusStatus.textContent = '离线';
      console.warn('[TAALVIA Lock] frequency corpus unavailable; using curated offline order.',error);
    }
    today = chooseToday();
    if (current >= today.length) current = 0;
    renderAll();
  }

  function bindElements() {
    ['previewTime','wordMeta','wordDutch','wordType','wordZh','wordExample','exampleNl','exampleZh','prevWord','nextWord','wordDots',
      'todayGrid','levelSelect','dailyGoal','dailyGoalValue','todayTargetHeadline','showChinese','showExample','lockNotify','settingsStatus','installButton','notificationButton',
      'testNotification','exportCards','knownCount','hardCount','corpusStatus','deviceHint'].forEach(id=>els[id]=document.getElementById(id));
  }

  function renderClock() {
    els.previewTime.textContent = new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit'}).format(new Date());
  }

  function renderCurrent() {
    if (!today.length) return;
    current = ((current % today.length) + today.length) % today.length;
    const word = today[current];
    const rank = rankMap.get(word.w);
    els.wordMeta.textContent = `WOORD ${current+1} / ${today.length}${rank ? ` · TOP ${rank}` : ''}`;
    els.wordDutch.textContent = word.d;
    els.wordType.textContent = word.t;
    els.wordZh.textContent = word.z;
    els.wordZh.hidden = !settings.showChinese;
    els.exampleNl.textContent = word.e;
    els.exampleZh.textContent = word.c;
    els.exampleZh.hidden = !settings.showChinese;
    els.wordExample.hidden = !settings.showExample;
    [...els.wordDots.children].forEach((dot,index)=>dot.classList.toggle('active',index===current));
    [...els.todayGrid.children].forEach((card,index)=>card.classList.toggle('active',index===current));
  }

  function renderTodayGrid() {
    els.todayGrid.replaceChildren();
    today.forEach((word,index)=>{
      const article = document.createElement('article');
      article.className = `today-card${index===current?' active':''}`;
      article.innerHTML = `<span class="slot">WOORD ${index+1} / ${today.length}</span><h3></h3><p class="meaning"></p><p class="tiny-example"></p><div class="card-actions"><button type="button" data-action="known">✓ 认识了</button><button type="button" data-action="hard">↻ 不熟，再来</button></div>`;
      article.querySelector('h3').textContent = word.d;
      article.querySelector('.meaning').textContent = settings.showChinese ? word.z : word.t;
      article.querySelector('.tiny-example').textContent = settings.showExample ? word.e : word.t;
      article.querySelector('[data-action=known]').classList.toggle('active',learning.known.includes(word.w));
      article.querySelector('[data-action=hard]').classList.toggle('active',learning.hard.includes(word.w));
      article.addEventListener('click',event=>{
        const button=event.target.closest('button');
        if(button){
          if(button.dataset.action==='known') markKnown(word.w);
          if(button.dataset.action==='hard') markHard(word.w);
          return;
        }
        current=index; renderCurrent();
      });
      els.todayGrid.append(article);
    });
  }

  function renderDots() {
    els.wordDots.replaceChildren();
    today.forEach((_,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.setAttribute('aria-label',`第 ${index+1} 个单词`);
      button.addEventListener('click',()=>{current=index;renderCurrent();});
      els.wordDots.append(button);
    });
  }

  function renderSettings() {
    els.levelSelect.value=settings.level;
    els.dailyGoal.value=String(dailyLimit());
    els.dailyGoalValue.value=String(dailyLimit());
    els.dailyGoalValue.textContent=String(dailyLimit());
    els.todayTargetHeadline.textContent=String(dailyLimit());
    els.showChinese.checked=!!settings.showChinese;
    els.showExample.checked=!!settings.showExample;
    els.lockNotify.checked=!!settings.lockNotify;
    els.knownCount.textContent=learning.known.length;
    els.hardCount.textContent=learning.hard.length;
    els.settingsStatus.textContent=`已保存到本机 · 今日目标 ${dailyLimit()} 词 · 免费版上限 ${FREE_DAILY_MAX} · ${corpusState}`;
    els.exportCards.textContent=`导出今日 ${today.length || dailyLimit()} 张锁屏图`;
  }

  function renderAll(){ renderClock();renderDots();renderTodayGrid();renderSettings();renderCurrent(); }

  function markKnown(token) {
    const known=new Set(learning.known),hard=new Set(learning.hard);
    known.add(token);hard.delete(token);
    learning={known:[...known],hard:[...hard]};saveJson(STATE_KEY,learning);
    renderTodayGrid();renderSettings();renderCurrent();
  }

  function markHard(token) {
    const known=new Set(learning.known),hard=new Set(learning.hard);
    hard.add(token);known.delete(token);
    learning={known:[...known],hard:[...hard]};saveJson(STATE_KEY,learning);
    renderTodayGrid();renderSettings();renderCurrent();
  }

  function saveSettings(regenerate=false) {
    settings=normalizeSettings({...settings,level:els.levelSelect.value,dailyGoal:Number(els.dailyGoal.value),showChinese:els.showChinese.checked,showExample:els.showExample.checked,lockNotify:els.lockNotify.checked});
    saveJson(SETTINGS_KEY,settings);
    if(regenerate){ today=chooseToday(); if(current>=today.length) current=0; }
    renderAll();
  }

  async function registerServiceWorker() {
    if(!('serviceWorker' in navigator)) return null;
    try { return await navigator.serviceWorker.register('./sw.js',{scope:'./'}); }
    catch(error){ console.warn('[TAALVIA Lock] service worker registration failed.',error); return null; }
  }

  async function swReady(){ const registration=await registerServiceWorker(); return registration ? navigator.serviceWorker.ready : null; }

  async function showNotification(index=current) {
    if(!('Notification' in window)||Notification.permission!=='granted'||!today.length) return false;
    const registration=await swReady();
    if(!registration?.active&&!navigator.serviceWorker.controller) return false;
    const safeIndex=((index%today.length)+today.length)%today.length;
    const word=today[safeIndex];
    const target=navigator.serviceWorker.controller||registration.active||registration.waiting;
    target?.postMessage({type:'TAALVIA_LOCK_SHOW',card:{word:word.w,display:word.d,zh:word.z,example:word.e,slot:safeIndex+1,total:today.length,showChinese:settings.showChinese,showExample:settings.showExample}});
    return true;
  }

  async function enableNotifications() {
    if(!('Notification' in window)) { els.settingsStatus.textContent='这台浏览器不支持网页通知。';els.lockNotify.checked=false;saveSettings();return; }
    let permission=Notification.permission;
    if(permission==='default') permission=await Notification.requestPermission();
    if(permission!=='granted'){els.settingsStatus.textContent='系统没有授予通知权限。';els.lockNotify.checked=false;saveSettings();return;}
    els.lockNotify.checked=true;saveSettings();await showNotification(current);
    els.settingsStatus.textContent='锁屏通知已开启；已发送一张测试卡。';
  }

  function wrapCanvasText(ctx,text,maxWidth) {
    const chars=[...text],lines=[];let line='';
    for(const char of chars){const test=line+char;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=char;}else line=test;}
    if(line)lines.push(line);return lines;
  }

  function cardBlob(word,index) {
    return new Promise(resolve=>{
      const canvas=document.createElement('canvas');canvas.width=1290;canvas.height=2796;
      const ctx=canvas.getContext('2d');const gradient=ctx.createLinearGradient(0,0,1290,2796);
      gradient.addColorStop(0,'#102c56');gradient.addColorStop(.52,'#146779');gradient.addColorStop(1,'#0c8b76');ctx.fillStyle=gradient;ctx.fillRect(0,0,1290,2796);
      ctx.fillStyle='rgba(255,255,255,.11)';ctx.beginPath();ctx.arc(1100,310,330,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(13,208,159,.13)';ctx.beginPath();ctx.arc(120,2450,440,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#d1fae5';ctx.font='800 34px system-ui,sans-serif';ctx.fillText(`TAALVIA LOCK  ·  ${index+1} / ${today.length}`,100,300);
      ctx.fillStyle='#ffffff';ctx.font='800 118px system-ui,sans-serif';const wordLines=wrapCanvasText(ctx,word.d,1090);wordLines.slice(0,2).forEach((line,i)=>ctx.fillText(line,100,980+i*135));
      let y=980+(wordLines.length*135)+55;ctx.fillStyle='#d8f3f0';ctx.font='600 40px system-ui,sans-serif';ctx.fillText(word.t,100,y);
      if(settings.showChinese){y+=125;ctx.fillStyle='#ffffff';ctx.font='700 62px system-ui,sans-serif';wrapCanvasText(ctx,word.z,1090).slice(0,2).forEach((line,i)=>ctx.fillText(line,100,y+i*78));y+=95;}
      if(settings.showExample){y+=90;ctx.strokeStyle='rgba(255,255,255,.26)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(100,y);ctx.lineTo(1190,y);ctx.stroke();y+=105;ctx.fillStyle='#ffffff';ctx.font='650 45px system-ui,sans-serif';wrapCanvasText(ctx,word.e,1090).slice(0,3).forEach((line,i)=>ctx.fillText(line,100,y+i*62));if(settings.showChinese){y+=190;ctx.fillStyle='#d6e8e9';ctx.font='500 35px system-ui,sans-serif';wrapCanvasText(ctx,word.c,1090).slice(0,3).forEach((line,i)=>ctx.fillText(line,100,y+i*52));}}
      ctx.fillStyle='rgba(255,255,255,.75)';ctx.font='700 28px system-ui,sans-serif';ctx.fillText('taalvia.nl  ·  Unlock your Dutch',100,2605);ctx.fillStyle='rgba(255,255,255,.55)';ctx.font='500 24px system-ui,sans-serif';ctx.fillText(dateKey(),100,2660);canvas.toBlob(resolve,'image/png',.94);
    });
  }

  async function exportToday() {
    if(!today.length)return;
    els.exportCards.disabled=true;els.exportCards.textContent='正在生成…';
    try{
      const files=[];
      for(let i=0;i<today.length;i++){const blob=await cardBlob(today[i],i);files.push(new File([blob],`taalvia-lock-${dateKey()}-${i+1}.png`,{type:'image/png'}));}
      if(navigator.share&&navigator.canShare?.({files})) await navigator.share({files,title:'TAALVIA 今日锁屏单词',text:`今天的 ${today.length} 张荷兰语锁屏单词卡`});
      else files.forEach((file,index)=>{const link=document.createElement('a');link.href=URL.createObjectURL(file);link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),3000+index*250);});
    }catch(error){if(error?.name!=='AbortError')console.error('[TAALVIA Lock] export failed.',error);}
    finally{els.exportCards.disabled=false;els.exportCards.textContent=`导出今日 ${today.length} 张锁屏图`;}
  }

  function bindEvents() {
    els.prevWord.addEventListener('click',()=>{if(today.length){current=(current-1+today.length)%today.length;renderCurrent();}});
    els.nextWord.addEventListener('click',()=>{if(today.length){current=(current+1)%today.length;renderCurrent();}});
    els.levelSelect.addEventListener('change',()=>saveSettings(true));
    els.dailyGoal.addEventListener('input',()=>{els.dailyGoalValue.value=els.dailyGoal.value;els.dailyGoalValue.textContent=els.dailyGoal.value;els.todayTargetHeadline.textContent=els.dailyGoal.value;});
    els.dailyGoal.addEventListener('change',()=>saveSettings(true));
    els.showChinese.addEventListener('change',()=>saveSettings());
    els.showExample.addEventListener('change',()=>saveSettings());
    els.lockNotify.addEventListener('change',async()=>{if(els.lockNotify.checked)await enableNotifications();else saveSettings();});
    els.notificationButton.addEventListener('click',enableNotifications);
    els.testNotification.addEventListener('click',async()=>{if(!('Notification' in window)||Notification.permission!=='granted')return enableNotifications();if(today.length){current=(current+1)%today.length;renderCurrent();await showNotification(current);}});
    els.exportCards.addEventListener('click',exportToday);
    els.installButton.addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;els.installButton.hidden=true;});
    window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;els.installButton.hidden=false;});
    window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;els.installButton.hidden=true;});
    document.addEventListener('visibilitychange',async()=>{if(document.visibilityState==='hidden'){hiddenAt=Date.now();if(settings.lockNotify&&Notification.permission==='granted'&&today.length){current=(current+1)%today.length;await showNotification(current);}}else if(hiddenAt&&Date.now()-hiddenAt>1500)renderCurrent();});
  }

  function applySlotFromUrl(){const slot=Number(new URLSearchParams(location.search).get('slot'));if(slot>=1&&slot<=FREE_DAILY_MAX)current=slot-1;}

  function deviceCopy() {
    const ua=navigator.userAgent.toLowerCase();
    if(/iphone|ipad|ipod/.test(ua)) els.deviceHint.textContent=`iPhone：可把“今日 ${dailyLimit()} 张锁屏图”保存到照片，再放进“照片随机显示”锁屏。网页本身不能监听 iOS 解锁事件。`;
    else if(/android/.test(ua)) els.deviceHint.textContent='Android：安装 TAALVIA Lock 并允许通知。页面从前台进入后台/锁屏时，会轮到今日词池里的下一张单词卡；浏览器本身没有系统“解锁事件”权限。';
  }

  async function init() {
    bindElements();applySlotFromUrl();bindEvents();deviceCopy();renderAll();await registerServiceWorker();await loadCorpus();
  }

  document.addEventListener('DOMContentLoaded',init);
})();
