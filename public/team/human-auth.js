(()=>{
const form=document.getElementById('loginForm'),identifier=document.getElementById('identifier'),secret=document.getElementById('token'),msg=document.getElementById('loginMessage');
if(!form||!identifier||!secret)return;
const label=secret.closest('label');if(label&&label.firstChild)label.firstChild.textContent='密码 / 老师访问密钥';
const forgot=document.createElement('button');forgot.type='button';forgot.className='back';forgot.id='forgotPasswordBtn';forgot.textContent='忘记密码？用找回邮箱重置';msg.before(forgot);
let bypass=false;
function setMessage(text,type=''){msg.textContent=text||'';msg.className=`message ${type}`.trim()}
async function call(path,body){const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({ok:false,error:'服务器返回异常'}));if(!r.ok)throw new Error(d.error||'操作失败');return d}
function fromB64(s){const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
function toB64(bytes){return btoa(String.fromCharCode(...bytes))}
async function deriveVerifier(password,saltB64,iterations){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:fromB64(saltB64),iterations},key,256);return toB64(new Uint8Array(bits))}
async function makeProof(verifierB64,nonce){const key=await crypto.subtle.importKey('raw',fromB64(verifierB64),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(nonce));return toB64(new Uint8Array(sig))}
async function humanLogin(id,password){const challenge=await call('/api/human-auth/challenge',{identifier:id});const verifier=await deriveVerifier(password,challenge.salt,challenge.iterations);const proof=await makeProof(verifier,challenge.nonce);return call('/api/human-auth/login',{identifier:id,nonce:challenge.nonce,proof})}
form.addEventListener('submit',async e=>{
  if(bypass){bypass=false;return}
  const id=identifier.value.trim(),password=secret.value;
  if(!id||!password)return;
  if(/^EVK-(?:T-)?/.test(password))return;
  e.preventDefault();e.stopImmediatePropagation();setMessage('正在登录…');
  try{await humanLogin(id,password);bypass=true;secret.value='session';form.requestSubmit()}catch(err){setMessage(err.message,'error')}
},true);

document.getElementById('logoutBtn')?.addEventListener('click',()=>{fetch('/api/human-auth/logout',{method:'POST',credentials:'same-origin',keepalive:true}).catch(()=>{})},true);

function ensureDialog(){let d=document.getElementById('passwordRecoveryDialog');if(d)return d;d=document.createElement('dialog');d.id='passwordRecoveryDialog';d.innerHTML=`<div class="dialog-card"><button class="close" data-recovery-close>×</button><p class="eyebrow">账号找回</p><div id="recoveryRequest"><h1>重置密码</h1><p class="muted">输入你绑定的找回邮箱，我们会发一封一次性重置邮件。</p><label>找回邮箱<input id="recoveryEmail" type="email" autocomplete="email"></label><button class="primary" id="sendRecoveryEmail" type="button">发送重置邮件</button><p class="message" id="recoveryMessage"></p></div><div id="recoveryReset" hidden><h1>设置新密码</h1><p class="muted">链接15分钟有效，用一次就失效。</p><label>新密码<input id="newRecoveryPassword" type="password" autocomplete="new-password"></label><label>再输入一次<input id="newRecoveryPassword2" type="password" autocomplete="new-password"></label><button class="primary" id="saveRecoveryPassword" type="button">保存新密码</button><p class="message" id="resetMessage"></p></div></div>`;document.body.append(d);d.addEventListener('click',e=>{if(e.target.matches('[data-recovery-close]'))d.close()});
  document.getElementById('sendRecoveryEmail').addEventListener('click',async()=>{const box=document.getElementById('recoveryMessage');box.textContent='正在发送…';box.className='message';try{const out=await call('/api/human-auth/forgot',{email:document.getElementById('recoveryEmail').value.trim()});box.textContent=out.message||'如果邮箱已绑定，你会收到重置邮件。';box.className='message ok'}catch(err){box.textContent=err.message;box.className='message error'}});
  document.getElementById('saveRecoveryPassword').addEventListener('click',async()=>{const p1=document.getElementById('newRecoveryPassword').value,p2=document.getElementById('newRecoveryPassword2').value,box=document.getElementById('resetMessage');if(p1!==p2){box.textContent='两次密码不一致';box.className='message error';return}if(p1.length<10){box.textContent='新密码至少10个字符';box.className='message error';return}box.textContent='正在保存…';box.className='message';try{const salt=crypto.getRandomValues(new Uint8Array(16)),saltB64=toB64(salt),iterations=210000,verifier=await deriveVerifier(p1,saltB64,iterations);await call('/api/human-auth/reset',{token:new URLSearchParams(location.search).get('reset')||'',password_hash:verifier,password_salt:saltB64,password_iterations:iterations});box.textContent='密码已经重置。现在可以用新密码登录。';box.className='message ok';history.replaceState({},'',location.pathname);setTimeout(()=>d.close(),1200)}catch(err){box.textContent=err.message;box.className='message error'}});
  return d
}
forgot.addEventListener('click',()=>{const d=ensureDialog();document.getElementById('recoveryRequest').hidden=false;document.getElementById('recoveryReset').hidden=true;d.showModal()});
const resetToken=new URLSearchParams(location.search).get('reset');if(resetToken){const d=ensureDialog();document.getElementById('recoveryRequest').hidden=true;document.getElementById('recoveryReset').hidden=false;d.showModal()}
})();
