(() => {
  const token = () => localStorage.getItem('evkerk-admin-token') || '';
  const authHeaders = () => ({ Authorization: `Bearer ${token()}`, Accept: 'application/json' });

  function addStyle() {
    if (document.getElementById('adminEnhancementStyle')) return;
    const style = document.createElement('style');
    style.id = 'adminEnhancementStyle';
    style.textContent = `
      .ux-note{margin:10px 0 0;padding:10px 12px;border:1px solid #bfe9f8;border-radius:10px;background:#eef9fd;color:#17617e;font-size:13px;line-height:1.55}
      .ux-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .ux-btn{border:1px solid #cedde2;border-radius:9px;background:#fff;padding:9px 12px;font-weight:800;cursor:pointer}
      .ux-btn.primary{background:#087fae;border-color:#087fae;color:#fff}
      .ux-btn[disabled]{opacity:.55;cursor:wait}
      .schedule-card{margin:0 0 16px;padding:18px;border:1px solid #d7e5e9;border-radius:18px;background:#fff}
      .schedule-card h2{margin:0 0 8px;font-size:20px}.schedule-card p{margin:0 0 14px;color:#6d716a;font-size:13px;line-height:1.55}
      .schedule-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.schedule-grid label{display:grid;gap:6px;font-size:13px;font-weight:750}.schedule-grid input{width:100%;border:1px solid #cedde2;border-radius:10px;padding:11px;font:inherit}
      @media(max-width:640px){.schedule-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function simplifyHeroForm() {
    const form = document.getElementById('heroForm');
    if (!form || form.dataset.uxEnhanced) return;
    form.dataset.uxEnhanced = '1';
    const order = form.querySelector('[name="sort_order"]');
    if (order) {
      const label = order.closest('label');
      order.type = 'hidden';
      order.value = String(Date.now());
      if (label) label.style.display = 'none';
    }
    const note = form.querySelector('.upload-note');
    if (note) note.textContent = '一次上传一张首页照片。上传后会自动加入轮播，并默认排在最前面；下方可直接调整顺序。';
  }

  async function moveHero(id, direction, button) {
    const list = await fetch('/api/admin/hero-slides', { headers: authHeaders() }).then(r => r.json());
    const slides = Array.isArray(list.slides) ? list.slides : [];
    const index = slides.findIndex(s => s.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= slides.length) return;
    const current = slides[index];
    const target = slides[targetIndex];
    button.disabled = true;
    try {
      await Promise.all([
        fetch(`/api/admin/hero-slides/${encodeURIComponent(current.id)}/update`, {method:'POST', headers:{...authHeaders(),'Content-Type':'application/json'}, body:JSON.stringify({...current, sort_order: target.sort_order})}),
        fetch(`/api/admin/hero-slides/${encodeURIComponent(target.id)}/update`, {method:'POST', headers:{...authHeaders(),'Content-Type':'application/json'}, body:JSON.stringify({...target, sort_order: current.sort_order})}),
      ]);
      location.reload();
    } finally { button.disabled = false; }
  }

  function enhanceHeroList() {
    const list = document.getElementById('heroList');
    if (!list) return;
    const items = [...list.querySelectorAll('.hero-admin-item')];
    items.forEach((item, index) => {
      if (item.dataset.uxEnhanced) return;
      item.dataset.uxEnhanced = '1';
      const idInput = item.querySelector('[name="id"], [data-id]');
      const id = idInput?.value || item.dataset.id || item.querySelector('button[data-id]')?.dataset.id;
      const orderInput = item.querySelector('[name="sort_order"]');
      if (orderInput) orderInput.closest('label')?.setAttribute('hidden','');
      if (!id) return;
      const actions = document.createElement('div');
      actions.className = 'ux-actions';
      const up = document.createElement('button'); up.type='button'; up.className='ux-btn'; up.textContent='↑ 往前'; up.disabled = index === 0;
      const down = document.createElement('button'); down.type='button'; down.className='ux-btn'; down.textContent='↓ 往后'; down.disabled = index === items.length-1;
      up.onclick = () => moveHero(id,-1,up); down.onclick = () => moveHero(id,1,down);
      actions.append(up,down); item.appendChild(actions);
    });
  }

  function enhanceSermons() {
    const list = document.getElementById('sermonList');
    if (!list) return;
    list.querySelectorAll('.sermon-item').forEach(item => {
      if (item.dataset.uxEnhanced) return;
      item.dataset.uxEnhanced = '1';
      const draft = item.querySelector('.status-pill.draft') || /草稿/.test(item.textContent);
      if (!draft) return;
      const editButton = [...item.querySelectorAll('button')].find(b => /编辑/.test(b.textContent));
      if (!editButton) return;
      const republish = document.createElement('button');
      republish.type='button'; republish.className='ux-btn primary'; republish.textContent='重新发布到官网';
      republish.onclick = () => { editButton.click(); setTimeout(() => { const form=document.getElementById('sermonForm'); const status=form?.querySelector('[name="status"]'); if(status){status.value='published'; status.dispatchEvent(new Event('change',{bubbles:true})); form.scrollIntoView({behavior:'smooth',block:'start'});} },50); };
      (item.querySelector('.actions') || item).appendChild(republish);
    });
  }

  function addScheduleShortcut() {
    const tabs = document.querySelector('.tabs');
    if (!tabs || document.querySelector('[data-schedule-shortcut]')) return;
    const button = document.createElement('button');
    button.type='button'; button.dataset.scheduleShortcut='1'; button.textContent='固定聚会时间';
    button.onclick = () => {
      const gatherings = [
        ['Rijswijk 主日聚会','每周日 12:30–15:30','Oranjelaan 62, Rijswijk'],
        ['Rijswijk 主日学','每周日 12:30–14:30','Oranjelaan 62, Rijswijk'],
        ['Zoetermeer 服事小组课程','每周六 10:00–12:00','Piet Heinplein 13, Zoetermeer'],
        ['Zoetermeer 主日聚会','每周日 10:00–12:00','Piet Heinplein 13, Zoetermeer'],
        ['Zoetermeer 主日学','每周日 10:00–12:00','Piet Heinplein 13, Zoetermeer'],
        ['Zoetermeer 查经班','每周一 10:00–12:00','Piet Heinplein 13, Zoetermeer'],
      ];
      let card = document.getElementById('scheduleShortcutCard');
      if (!card) {
        card=document.createElement('section'); card.id='scheduleShortcutCard'; card.className='schedule-card';
        card.innerHTML=`<h2>固定聚会时间</h2><p>这里先把官网当前固定安排集中展示出来，避免再去“日历同步”里猜。下一步会把这些内容接成可直接保存的后台字段。</p><div>${gatherings.map(g=>`<div style="padding:10px 0;border-bottom:1px solid #eee"><strong>${g[0]}</strong><br><span>${g[1]} · ${g[2]}</span></div>`).join('')}</div><div class="ux-note">临时变动仍请使用“特别活动 / 公告”。固定时间编辑接口正在收口，避免直接改错线上日历。</div>`;
        tabs.insertAdjacentElement('afterend',card);
      }
      card.scrollIntoView({behavior:'smooth',block:'start'});
    };
    tabs.insertBefore(button, tabs.querySelector('[data-tab="sync"]') || null);
  }

  function run() { addStyle(); simplifyHeroForm(); enhanceHeroList(); enhanceSermons(); addScheduleShortcut(); }
  run();
  const observer = new MutationObserver(run); observer.observe(document.body,{subtree:true,childList:true});
})();
