(()=>{
const TOKEN_KEY='evkerk-admin-token',ACCOUNT_KEY='evkerk-admin-account';
async function me(){const r=await fetch('/api/admin/me',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)return null;return r.json().catch(()=>null)}
async function logout(){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(ACCOUNT_KEY);await fetch('/api/human-auth/logout',{method:'POST',credentials:'same-origin'}).catch(()=>{});location.replace('/team/')}
(async()=>{
  const data=await me();if(!data?.user)return;
  const identity=data.user.email||data.user.name||'';
  localStorage.setItem(TOKEN_KEY,'session');if(identity)localStorage.setItem(ACCOUNT_KEY,identity);
  const tokenInput=document.getElementById('token'),accountInput=document.getElementById('adminAccount');
  if(tokenInput)tokenInput.value='session';if(accountInput&&identity)accountInput.value=identity;
  const loginForm=document.getElementById('loginForm');if(loginForm)loginForm.hidden=true;
  const top=document.querySelector('.top');if(top&&!top.querySelector('[data-team-home]')){const link=document.createElement('a');link.href='/team/';link.dataset.teamHome='1';link.textContent='← 返回同工首页';top.prepend(link)}
  const logoutButton=document.getElementById('logoutAdmin');if(logoutButton)logoutButton.onclick=logout;
})();
})();