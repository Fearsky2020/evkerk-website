(()=>{
const TOKEN_KEY='evkerk_teacher_token';
const initial=localStorage.getItem(TOKEN_KEY)||'';
let reloadScheduled=false;

function applyExecutorState(){
  const option=document.querySelector('select[name="executor"] option[value="xiaoguang"]');
  if(option&&!option.disabled){
    option.disabled=true;
    option.textContent='小光（接口已预留，暂未接执行器）';
  }
}

const timer=setInterval(()=>{
  applyExecutorState();
  const now=localStorage.getItem(TOKEN_KEY)||'';
  if(!initial&&now&&!reloadScheduled){
    reloadScheduled=true;
    clearInterval(timer);
    location.reload();
  }
},300);

setTimeout(()=>clearInterval(timer),30000);
})();
