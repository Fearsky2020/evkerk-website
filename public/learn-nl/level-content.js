const LC_LEVEL_KEY='learn-nl-level-v1';
const LC_SHOW_ALL='learn-nl-level-show-all-v1';
const LC_LABEL={start:'起步',daily:'日常',natural:'自然'};
const LC_RANK={start:0,daily:1,natural:2};

const LC_LEVEL_MAP=new Map([
['Waar kan ik dit vinden?','start'],['Hoeveel kost dit?','start'],['Heeft u dit ook in een andere maat?','daily'],['Mag ik een tasje?','start'],['Kan ik pinnen?','start'],
['Ik wil graag een afspraak maken.','start'],['Ik heb sinds gisteren pijn.','daily'],['Ik voel me niet goed.','start'],['Moet ik medicijnen gebruiken?','daily'],['Wanneer moet ik terugkomen?','daily'],
['Ik heb een afspraak om tien uur.','daily'],['Waar moet ik me melden?','daily'],['Welke documenten heb ik nodig?','daily'],['Kunt u mij hiermee helpen?','daily'],['Wanneer is het klaar?','daily'],
['Goedemorgen! Alles goed?','start'],['Hoe was je weekend?','daily'],['Lekker weer vandaag, hè?','daily'],['Fijne dag nog!','start'],['Tot ziens!','start'],
['Goedemorgen, u spreekt met Wang.','daily'],['Ik bel voor een afspraak.','daily'],['Kunt u dat herhalen, alstublieft?','start'],['Kunt u iets langzamer spreken?','start'],['Dank u wel voor uw hulp.','start']
]);

const LC_EXTRA={
  supermarket:[
    ['natural','Ik zoek iets vergelijkbaars, maar dan zonder suiker.','我想找类似的东西，但不要含糖。'],
    ['natural','Is er misschien een alternatief dat iets goedkoper is?','有没有稍微便宜一点的替代品？']
  ],
  doctor:[
    ['daily','Ik wil graag een afspraak maken, het liefst in de ochtend.','我想预约，最好是在上午。'],
    ['natural',"De pijn komt en gaat, maar wordt 's avonds meestal erger.",'疼痛时有时无，但晚上通常更严重。'],
    ['natural','Ik wil graag weten of ik hiermee gewoon kan blijven werken.','我想知道这种情况是否还能正常工作。']
  ],
  gemeente:[
    ['natural','Ik heb hier eerder over gebeld, maar ik weet niet zeker wat de volgende stap is.','我之前为这件事打过电话，但不太确定下一步该怎么做。'],
    ['natural','Kunt u aangeven hoe lang de verwerking ongeveer duurt?','您能告诉我处理大概需要多久吗？']
  ],
  neighbors:[
    ['natural','We wonen hier nog niet zo lang, dus we leren de buurt nog een beetje kennen.','我们搬来还不久，还在慢慢熟悉这个社区。'],
    ['natural','Als we ooit te veel lawaai maken, zeg het gerust.','如果我们哪天太吵，请尽管告诉我们。']
  ],
  phone:[
    ['natural','Ik bel omdat ik nog geen bevestiging van mijn afspraak heb ontvangen.','我打来是因为还没有收到预约确认。'],
    ['natural','Kunt u mij doorverbinden met iemand die hierover gaat?','您能帮我转接负责这件事的人吗？']
  ]
};

const LC_DAILY={
  start:[
    ['Kunt u dat herhalen, alstublieft?','您可以再说一遍吗？','听不懂时最值得先掌握的求救句。'],
    ['Waar kan ik dit vinden?','我在哪里可以找到这个？','超市、商店、车站都能直接用。'],
    ['Hoeveel kost dit?','这个多少钱？','购物时最基础、最高频。'],
    ['Fijne dag nog!','祝你今天接下来愉快！','结账、办完事以后非常常见。']
  ],
  daily:[
    ['Ik wil graag een afspraak maken, het liefst in de ochtend.','我想预约，最好是在上午。','开始练一句里放两个信息：目的 + 时间偏好。'],
    ['Welke documenten heb ik nodig?','我需要哪些文件？','市政府、银行、学校都很实用。'],
    ['Lekker weer vandaag, hè?','今天天气不错，是吧？','练荷兰式自然小聊。'],
    ['Goedemorgen, u spreekt met Wang.','早上好，我是 Wang。','电话里自然地自报身份。']
  ],
  natural:[
    ['Ik heb hier eerder over gebeld, maar ik weet niet zeker wat de volgende stap is.','我之前为这件事打过电话，但不太确定下一步该怎么做。','练“背景 + 转折 + 请求下一步”的完整表达。'],
    ['Kunt u aangeven hoe lang de verwerking ongeveer duurt?','您能告诉我处理大概需要多久吗？','比简单问“什么时候好”更自然。'],
    ['Als we ooit te veel lawaai maken, zeg het gerust.','如果我们哪天太吵，请尽管告诉我们。','邻里关系里非常自然的柔和表达。'],
    ['Ik bel omdat ik nog geen bevestiging van mijn afspraak heb ontvangen.','我打来是因为还没有收到预约确认。','练习说明来电原因，而不是只说“我有预约”。']
  ]
};

function lcRead(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch(_){return fallback;}}
function lcLevel(){const x=lcRead(LC_LEVEL_KEY,'daily');return LC_LABEL[x]?x:'daily';}
function lcEsc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function lcSceneId(){const eyebrow=document.getElementById('lessonEyebrow')?.textContent?.toLowerCase()||'';if(eyebrow.includes('bood'))return'supermarket';if(eyebrow.includes('huisarts'))return'doctor';if(eyebrow.includes('gemeente'))return'gemeente';if(eyebrow.includes('buren'))return'neighbors';if(eyebrow.includes('telefoon'))return'phone';return'supermarket';}
function lcMastered(){return new Set(lcRead('learn-nl-mastered-v1',[]));}

function lcGuide(){
  let guide=document.getElementById('levelLessonGuide');
  const heading=document.querySelector('.lesson-heading');if(!heading)return null;
  if(!guide){guide=document.createElement('div');guide.id='levelLessonGuide';guide.className='level-lesson-guide';heading.insertAdjacentElement('afterend',guide);}
  const level=lcLevel(),all=Boolean(lcRead(LC_SHOW_ALL,false));
  guide.innerHTML=`<span><b>${LC_LABEL[level]}</b> · 当前推荐</span><p class="zh-help">${level==='start'?'先看短句，别一次塞太多。':level==='daily'?'同级句优先，保留少量基础句做热身。':'优先解释、追问和补充信息；简单句默认收起来。'}</p><button type="button" data-lc-all>${all?'只看推荐':'显示全部难度'}</button>`;
  guide.querySelector('[data-lc-all]')?.addEventListener('click',()=>{localStorage.setItem(LC_SHOW_ALL,JSON.stringify(!all));lcApplyLesson(true);});
  return guide;
}

function lcExtraRow(sceneId,level,nl,zh){
  const key=`${sceneId}::${nl}`,mastered=lcMastered().has(key);
  const row=document.createElement('article');row.className=`phrase-row level-extra ${mastered?'is-mastered':''}`;row.dataset.key=key;row.dataset.lcLevel=level;row.innerHTML=`<div><span class="phrase-level-badge">${LC_LABEL[level]}</span><p class="phrase-dutch">${lcEsc(nl)}</p><p class="phrase-cn zh-help">${lcEsc(zh)}</p></div><div class="phrase-actions"><button class="round-action speak" type="button" data-speak="${lcEsc(nl)}" aria-label="播放">🔊</button><button class="round-action master ${mastered?'active':''}" type="button" data-master="${lcEsc(key)}" aria-label="标记已掌握">${mastered?'✓':'○'}</button></div>`;return row;
}

let lcApplying=false;
function lcApplyLesson(){
  const list=document.getElementById('phraseList');if(!list||lcApplying)return;
  lcApplying=true;
  const scene=lcSceneId(),level=lcLevel(),showAll=Boolean(lcRead(LC_SHOW_ALL,false)),target=LC_RANK[level];
  list.querySelectorAll('.level-extra').forEach(n=>n.remove());
  for(const [itemLevel,nl,zh] of LC_EXTRA[scene]||[]) list.appendChild(lcExtraRow(scene,itemLevel,nl,zh));
  const rows=[...list.querySelectorAll('.phrase-row')];
  rows.forEach(row=>{
    const nl=row.querySelector('.phrase-dutch')?.textContent?.trim()||'';
    const itemLevel=row.dataset.lcLevel||LC_LEVEL_MAP.get(nl)||'daily';
    row.dataset.lcLevel=itemLevel;
    let badge=row.querySelector('.phrase-level-badge');
    if(!badge){badge=document.createElement('span');badge.className='phrase-level-badge';row.querySelector('div')?.prepend(badge);}
    badge.textContent=LC_LABEL[itemLevel];
    const rank=LC_RANK[itemLevel],distance=target-rank;
    const recommended=showAll||itemLevel===level||(level!=='start'&&distance===1);
    row.hidden=!recommended;
    row.classList.toggle('level-secondary',itemLevel!==level);
  });
  const visible=rows.filter(r=>!r.hidden).sort((a,b)=>Math.abs(LC_RANK[a.dataset.lcLevel]-target)-Math.abs(LC_RANK[b.dataset.lcLevel]-target));
  const current=[...list.children].filter(n=>!n.hidden);
  if(visible.some((n,i)=>current[i]!==n))visible.forEach(n=>list.appendChild(n));
  lcGuide();
  lcApplying=false;
}

function lcApplyDaily(){
  const pool=LC_DAILY[lcLevel()]||LC_DAILY.daily;
  const now=new Date(),start=new Date(now.getFullYear(),0,0),day=Math.floor((now-start)/86400000);
  const [nl,zh,note]=pool[day%pool.length];
  const dutch=document.getElementById('dailyDutch'),cn=document.getElementById('dailyChinese'),desc=document.getElementById('dailyNote');
  if(!dutch||!cn||!desc)return;
  dutch.textContent=nl;cn.textContent=zh;desc.textContent=`${LC_LABEL[lcLevel()]} · ${note}`;
  const speak=document.getElementById('dailySpeak'),slow=document.getElementById('dailySlow'),master=document.getElementById('dailyMaster');
  if(speak)speak.dataset.speak=nl;if(slow)slow.dataset.speak=nl;
  if(master){const key=`daily-level::${lcLevel()}::${nl}`;master.dataset.master=key;const mastered=lcMastered().has(key);master.textContent=mastered?'✓ 已掌握':'○ 我会了';master.classList.toggle('is-mastered',mastered);}
}

function lcMarkScenes(){
  const level=lcLevel();const rec={start:['supermarket','neighbors'],daily:['doctor','gemeente','phone'],natural:['gemeente','phone','neighbors']}[level]||[];
  document.querySelectorAll('#sceneGrid [data-scene]').forEach(card=>{card.classList.toggle('level-recommended',rec.includes(card.dataset.scene));let chip=card.querySelector('.scene-level-chip');if(rec.includes(card.dataset.scene)){if(!chip){chip=document.createElement('span');chip.className='scene-level-chip';card.appendChild(chip);}chip.textContent=`${LC_LABEL[level]}推荐`;}else chip?.remove();});
}

function lcInit(){
  const list=document.getElementById('phraseList');
  if(list)new MutationObserver(()=>setTimeout(lcApplyLesson,0)).observe(list,{childList:true});
  const scenes=document.getElementById('sceneGrid');
  if(scenes)new MutationObserver(()=>setTimeout(lcMarkScenes,0)).observe(scenes,{childList:true});
  document.getElementById('dailyMaster')?.addEventListener('click',()=>setTimeout(lcApplyDaily,0));
  addEventListener('learn-nl-level-change',()=>{setTimeout(()=>{lcApplyLesson();lcApplyDaily();lcMarkScenes();},0);});
  lcApplyLesson();lcApplyDaily();lcMarkScenes();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',lcInit,{once:true});else lcInit();