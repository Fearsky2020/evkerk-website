(() => {
  const translations = {
    zh: {
      'brand.cn':'基督教福音教会','brand.subtitle':'EVANGELIEKERK','nav.gatherings':'聚会','nav.activities':'近期活动','nav.welcome':'第一次来','nav.sermons':'讲道','nav.ministries':'小组与事工','nav.about':'关于我们','nav.visit':'来参加聚会',
      'hero.eyebrow':'DEN HAAG · RIJSWIJK · ZOETERMEER','hero.title':'在恩典中认识耶稣\n在真理中活出自由','hero.lead':'无论你刚开始认识信仰，还是正在寻找一个属灵的家，都欢迎你来到福音教会。','hero.primary':'查看本周聚会','hero.secondary':'第一次来？','hero.photo.title':'Zoetermeer 福音教会','hero.photo':'每周日 10:00–12:00',
      'gatherings.eyebrow':'SUNDAY GATHERINGS','gatherings.title':'这个星期天，欢迎回家。','gatherings.text':'两个聚会地点，都欢迎第一次来的朋友。主日若有临时调整，将在网站首页更新。','gatherings.dh.label':'海牙 / Rijswijk','gatherings.dh.sep6':'9月6日 Rijswijk 暂停聚会；联合崇拜暨洗礼请前往 Zoetermeer（10:00）','gatherings.dh.title':'海牙基督教福音教会','gatherings.dh.meta':'每周日 · 中文崇拜 · 敬拜、讲道、圣餐、主日学','gatherings.zm.title':'Zoetermeer 基督教福音教会','gatherings.zm.meta':'每周日上午 · 中文崇拜与荷兰文崇拜 · 敬拜、讲道、圣餐、主日学','gatherings.map':'打开地图 →','schedule.monday':'每周一','schedule.saturday':'每周六','schedule.sunday':'每周日','schedule.serviceCourse':'服事小组课程','schedule.sundayService':'主日聚会','schedule.bilingualService':'中文及荷兰文主日聚会','schedule.sundaySchool':'主日学','schedule.bibleStudy':'查经班',
      'welcome.eyebrow':'FIRST TIME HERE?','welcome.title':'第一次来，不需要准备什么。','welcome.text':'你可以安静听信息、一起敬拜，也可以只是先认识这里。无需报名，也不会有人要求你一定做什么。','welcome.1.title':'有人欢迎你','welcome.1.text':'接待同工会帮助你找到座位、儿童主日学或合适的语言聚会。','welcome.2.title':'敬拜与信息','welcome.2.text':'用诗歌、祷告和圣经信息，一起认识神的恩典。','welcome.3.title':'留下来聊一会儿','welcome.3.text':'聚会后通常有交通时间，可以认识弟兄姊妹，也可以请同工为你祷告。',
      'activities.eyebrow':'RECENT LIFE','activities.title':'教会最近在发生什么？','activities.text':'教会活动、团契活动和小组生活都会在这里更新。照片会自动轮播，点击左右箭头也能查看。','activities.churchlife':'教会生活','activities.gathering':'主日聚会','activities.zoetermeer.title':'Zoetermeer 福音教会','activities.zoetermeer.meta':'Piet Heinplein 13 · Zoetermeer','activities.sanctuary.title':'一起敬拜、聆听与相遇','activities.sanctuary.meta':'每周日 10:00–12:00 · Zoetermeer',
      'sermons.eyebrow':'LATEST MESSAGE','sermons.title':'最新讲道','sermons.text':'错过了主日？在这里重温圣经信息，与我们一起在真理中成长。','sermons.placeholder.label':'主日信息','sermons.placeholder.title':'最新讲道正在整理','sermons.placeholder.text':'欢迎先来参加本周主日聚会。',
      'ministries.eyebrow':'LIFE TOGETHER','ministries.title':'不只是在星期天见面。','ministries.text':'在小组、儿童和青少年事工中一起生活、祷告、学习和彼此扶持。','ministries.groups':'社区小组','ministries.children':'儿童主日学','ministries.children.text':'帮助不同年龄的孩子用他们能理解的方式认识神。','ministries.youth':'青少年','ministries.youth.text':'为青少年预备适合他们阶段的信息、关系和活动。',
      'about.eyebrow':'ABOUT EVANGELIEKERK','about.title':'一个把恩典与真理放在中心的教会。','about.text':'我们盼望人在耶稣基督里认识神的爱，在圣经真理中成长，并在真实生活里彼此扶持。','about.values':'恩典 · 真理 · 生命',
      'contact.eyebrow':'COME AND SEE','contact.title':'这个星期天，来坐坐。','contact.text':'无需预约。提前 10–15 分钟到达，会更方便认识接待同工和找到座位。','contact.button':'查看聚会地点'
    },
    nl: {
      'brand.cn':'Evangeliekerk','brand.subtitle':'基督教福音教会','nav.gatherings':'Samenkomsten','nav.activities':'Activiteiten','nav.welcome':'Eerste keer','nav.sermons':'Preken','nav.ministries':'Kringen & bediening','nav.about':'Over ons','nav.visit':'Bezoek een dienst',
      'hero.eyebrow':'DEN HAAG · RIJSWIJK · ZOETERMEER','hero.title':'Jezus leren kennen.\nLeven in genade en waarheid.','hero.lead':'Of je het christelijk geloof net ontdekt of op zoek bent naar een geestelijk thuis: je bent van harte welkom bij Evangeliekerk.','hero.primary':'Bekijk de zondag','hero.secondary':'Eerste keer?','hero.photo.title':'Evangeliekerk Zoetermeer','hero.photo':'Elke zondag 10:00–12:00',
      'gatherings.eyebrow':'SUNDAY GATHERINGS','gatherings.title':'Welkom thuis, deze zondag.','gatherings.text':'Op beide locaties zijn nieuwe bezoekers van harte welkom. Tijdelijke wijzigingen worden op de homepage vermeld.','gatherings.dh.label':'Den Haag / Rijswijk','gatherings.dh.sep6':'Op 6 september is er geen dienst in Rijswijk. De gezamenlijke dienst en doop zijn om 10:00 in Zoetermeer.','gatherings.dh.title':'Evangeliekerk Den Haag','gatherings.dh.meta':'Elke zondag · Chinese dienst · aanbidding, preek, avondmaal en zondagsschool','gatherings.zm.title':'Evangeliekerk Zoetermeer','gatherings.zm.meta':'Elke zondagochtend · Chinese en Nederlandstalige dienst · aanbidding, preek, avondmaal en zondagsschool','gatherings.map':'Open kaart →','schedule.monday':'Elke maandag','schedule.saturday':'Elke zaterdag','schedule.sunday':'Elke zondag','schedule.serviceCourse':'Cursus voor bedieningsteam','schedule.sundayService':'Zondagsdienst','schedule.bilingualService':'Chinese en Nederlandstalige zondagsdienst','schedule.sundaySchool':'Zondagsschool','schedule.bibleStudy':'Bijbelstudie',
      'welcome.eyebrow':'FIRST TIME HERE?','welcome.title':'Voor je eerste bezoek hoef je niets voor te bereiden.','welcome.text':'Je mag rustig luisteren, meezingen of gewoon eerst kennismaken. Aanmelden is niet nodig en er wordt niets van je verwacht.','welcome.1.title':'Je wordt welkom geheten','welcome.1.text':'Ons ontvangstteam helpt je met een plek, de zondagsschool of de passende taalgroep.','welcome.2.title':'Aanbidding & boodschap','welcome.2.text':'Met liederen, gebed en de Bijbel leren we samen Gods genade kennen.','welcome.3.title':'Blijf gerust even','welcome.3.text':'Na de dienst is er tijd voor ontmoeting, gesprek en persoonlijk gebed.',
      'activities.eyebrow':'RECENT LIFE','activities.title':'Wat gebeurt er in onze gemeente?','activities.text':'Gemeenteactiviteiten, fellowship en kringleven verschijnen hier. De foto’s wisselen automatisch; je kunt ook de pijlen gebruiken.','activities.churchlife':'Gemeenteleven','activities.gathering':'Zondagse dienst','activities.zoetermeer.title':'Evangeliekerk Zoetermeer','activities.zoetermeer.meta':'Piet Heinplein 13 · Zoetermeer','activities.sanctuary.title':'Samen aanbidden, luisteren en ontmoeten','activities.sanctuary.meta':'Elke zondag 10:00–12:00 · Zoetermeer',
      'sermons.eyebrow':'LATEST MESSAGE','sermons.title':'Laatste preek','sermons.text':'Een zondag gemist? Luister hier naar de Bijbelse boodschap en groei met ons mee.','sermons.placeholder.label':'Zondagsboodschap','sermons.placeholder.title':'De nieuwste preek wordt voorbereid','sermons.placeholder.text':'Je bent alvast van harte welkom bij de dienst van deze zondag.',
      'ministries.eyebrow':'LIFE TOGETHER','ministries.title':'Gemeente-zijn is meer dan zondag.','ministries.text':'In kringen en kinder- en jongerenwerk delen we leven, gebed, groei en onderlinge steun.','ministries.groups':'Huiskringen','ministries.children':'Zondagsschool','ministries.children.text':'Kinderen leren God kennen op een manier die past bij hun leeftijd.','ministries.youth':'Jongeren','ministries.youth.text':'Ruimte voor geloof, relaties en activiteiten die aansluiten bij jongeren.',
      'about.eyebrow':'ABOUT EVANGELIEKERK','about.title':'Een gemeente met genade en waarheid in het centrum.','about.text':'Wij verlangen ernaar dat mensen Gods liefde leren kennen in Jezus Christus, groeien in de waarheid van de Bijbel en elkaar in het dagelijks leven ondersteunen.','about.values':'GENADE · WAARHEID · LEVEN',
      'contact.eyebrow':'COME AND SEE','contact.title':'Kom deze zondag eens kijken.','contact.text':'Aanmelden is niet nodig. Kom bij voorkeur 10–15 minuten eerder om rustig binnen te komen en kennis te maken.','contact.button':'Bekijk locaties'
    }
  };
  const langToggle = document.getElementById('langToggle');
  const themeToggle = document.getElementById('themeToggle');
  const langKey = 'evkerk-lang';
  const themeKey = 'evkerk-theme';

  function applyLanguage(lang, remember = true) {
    const dict = translations[lang] || translations.zh;
    document.documentElement.lang = lang === 'nl' ? 'nl' : 'zh-CN';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const value = dict[el.dataset.i18n];
      if (!value) return;
      if (el.tagName === 'H1') el.innerHTML = value.replace('\n','<br>');
      else el.textContent = value;
    });
    langToggle.textContent = lang === 'nl' ? '中文' : 'NL';
    if (remember) localStorage.setItem(langKey, lang);
  }

  function applyTheme(theme, remember = true) {
    const dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    themeToggle.textContent = dark ? '☀︎' : '☾';
    themeToggle.title = dark ? 'Light mode' : 'Dark mode';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#121512' : '#f6f2ea';
    if (remember) localStorage.setItem(themeKey, dark ? 'dark' : 'light');
  }

  const savedLang = localStorage.getItem(langKey) || 'zh';
  const savedTheme = localStorage.getItem(themeKey) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyLanguage(savedLang, false);
  applyTheme(savedTheme, false);

  const dateParts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Amsterdam', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date()).map(part => [part.type, part.value]));
  const todayAmsterdam = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  document.querySelectorAll('[data-special-until]').forEach(notice => {
    notice.hidden = todayAmsterdam > notice.dataset.specialUntil;
  });

  langToggle.addEventListener('click', () => applyLanguage(document.documentElement.lang === 'nl' ? 'zh' : 'nl'));
  themeToggle.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

})();
