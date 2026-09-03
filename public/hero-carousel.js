(() => {
  const figure=document.querySelector('.hero-visual');
  if(!figure)return;
  const image=figure.querySelector('img');
  const title=figure.querySelector('.hero-photo-note strong');
  const subtitle=figure.querySelector('.hero-photo-note span');
  const churchSlides=[
    {image_url:'/assets/zoetermeer-exterior.webp',title_zh:'Zoetermeer 基督教福音教会',title_nl:'Evangeliekerk Zoetermeer',subtitle_zh:'每周日 10:00–12:00',subtitle_nl:'Elke zondag 10:00–12:00'},
    {image_url:'/assets/rijswijk-3384.webp',title_zh:'Rijswijk 基督教福音教会',title_nl:'Evangeliekerk Rijswijk',subtitle_zh:'Oranjelaan 62 · Rijswijk',subtitle_nl:'Oranjelaan 62 · Rijswijk'},
    {image_url:'/assets/rijswijk-3389.webp',title_zh:'Rijswijk 教会礼堂',title_nl:'Kerkzaal Rijswijk',subtitle_zh:'每周日中文聚会',subtitle_nl:'Chinese dienst op zondag'},
    {image_url:'/assets/rijswijk-3618.webp',title_zh:'Rijswijk 主日敬拜',title_nl:'Zondagsdienst in Rijswijk',subtitle_zh:'在敬拜与真理中一同成长',subtitle_nl:'Samen groeien in aanbidding en waarheid'}
  ];
  let slides=[...churchSlides]; let index=0; let timer;
  const lang=()=>document.documentElement.lang==='nl'?'nl':'zh';
  function text(slide,key){return lang()==='nl'?(slide[key+'_nl']||slide[key+'_zh']||''):(slide[key+'_zh']||slide[key+'_nl']||'')}
  function show(next){
    if(!slides.length)return;
    index=(next+slides.length)%slides.length; const slide=slides[index];
    image.classList.add('is-changing');
    const preload=new Image();
    preload.onload=()=>{image.src=slide.image_url;image.alt=text(slide,'title');title.textContent=text(slide,'title');subtitle.textContent=text(slide,'subtitle');requestAnimationFrame(()=>image.classList.remove('is-changing'))};
    preload.src=slide.image_url;
  }
  function start(){clearInterval(timer);if(slides.length>1&&!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>show(index+1),6000)}
  new MutationObserver(()=>show(index)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  show(0); start();
  fetch('/api/hero-slides',{headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():Promise.reject()).then(body=>{
    const managed=body.slides||[];
    slides=[...churchSlides,...managed];
    show(0); start();
  }).catch(()=>{});
  figure.addEventListener('mouseenter',()=>clearInterval(timer));figure.addEventListener('mouseleave',start);
})();
