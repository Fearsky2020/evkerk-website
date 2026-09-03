(() => {
  const figure=document.querySelector('.hero-visual');
  if(!figure)return;
  const image=figure.querySelector('img');
  const title=figure.querySelector('.hero-photo-note strong');
  const subtitle=figure.querySelector('.hero-photo-note span');
  let slides=[]; let index=0; let timer;
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
  fetch('/api/hero-slides',{headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():Promise.reject()).then(body=>{slides=body.slides||[];if(slides.length){show(0);start()}}).catch(()=>{});
  figure.addEventListener('mouseenter',()=>clearInterval(timer));figure.addEventListener('mouseleave',start);
})();
