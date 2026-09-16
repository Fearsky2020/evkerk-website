(()=>{
  const params=new URLSearchParams(location.search);
  const book=Number(params.get('book'));
  const chapter=Number(params.get('chapter'));
  const verse=Number(params.get('verse'));
  if(!Number.isInteger(book)||book<0||book>65||!Number.isInteger(chapter)||chapter<1)return;

  const stateKey='evkerk-web:bible-state';
  let current=null;
  try{current=JSON.parse(localStorage.getItem(stateKey)||'null')}catch{}
  if(!current||Number(current.bookIndex)!==book||Number(current.chapter)!==chapter){
    localStorage.setItem(stateKey,JSON.stringify({bookIndex:book,chapter}));
    location.reload();
    return;
  }

  if(!Number.isInteger(verse)||verse<1)return;
  let tries=0;
  const timer=setInterval(()=>{
    const el=document.querySelector(`[data-verse="${verse}"]`);
    if(el){
      clearInterval(timer);
      el.classList.add('selected');
      el.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    tries+=1;
    if(tries>50)clearInterval(timer);
  },120);
})();
