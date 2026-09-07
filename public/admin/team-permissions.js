(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const auth = () => ({
    Authorization: `Bearer ${localStorage.getItem('evkerk-admin-token') || ''}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });

  async function get(url) {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', headers: auth() });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  }

  async function post(url, data) {
    const response = await fetch(url, {
      method: 'POST', credentials: 'same-origin', headers: auth(), body: JSON.stringify(data || {}),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok === false) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  }

  function addStyles() {
    if ($('#teamPermissionStyles')) return;
    const style = document.createElement('style');
    style.id = 'teamPermissionStyles';
    style.textContent = `
      .team-perm-card{margin-top:16px}.team-perm-list{display:grid;gap:12px}
      .team-person{padding:15px;border:1px solid var(--line);border-radius:14px;background:#fff}
      .team-person-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
      .team-person h3{margin:0 0 5px}.team-person p{margin:0;color:var(--muted);font-size:12px}
      .service-checks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
      .service-check{display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid var(--line);border-radius:10px;background:#fbfdfd;font-size:13px}
      .service-check input{width:auto}.service-check.planned{border-style:dashed;color:var(--muted)}
      .service-tag{font-size:11px;color:var(--muted)}.catalog-list{display:flex;gap:7px;flex-wrap:wrap}
      .catalog-chip{padding:6px 9px;border:1px solid var(--line);border-radius:999px;background:#fff;font-size:12px}
      .catalog-chip.planned{border-style:dashed;color:var(--muted)}
      @media(max-width:720px){.service-checks{grid-template-columns:1fr 1fr}}
      @media(max-width:480px){.service-checks{grid-template-columns:1fr}.team-person-head{display:block}}
    `;
    document.head.appendChild(style);
  }

  function prepareExistingForm() {
    const tab = $('[data-tab="users"]');
    if (tab) tab.textContent = '同工账号';
    const panel = $('#users');
    if (!panel) return;

    const form = $('#adminUserForm');
    if (form) {
      const title = $('h2', form);
      if (title) title.textContent = '新建同工账号';
      const note = $('.upload-note', form);
      if (note) note.textContent = '填写同工姓名和邮箱。创建后，同工在官网“同工入口”用邮箱设置自己的密码；旧访问密钥仅保留作迁移/应急。';
      const email = form.elements.email;
      if (email) {
        email.required = true;
        const label = email.closest('label');
        if (label?.firstChild) label.firstChild.textContent = '邮箱';
      }
      const role = form.elements.role;
      if (role) {
        role.value = 'uploader';
        const label = role.closest('label');
        if (label) label.hidden = true;
      }
      const submit = form.querySelector('button[type="submit"]');
      if (submit) submit.textContent = '创建同工账号';
    }

    const listTitle = $('#adminUserList')?.closest('.card')?.querySelector('h2');
    if (listTitle) listTitle.textContent = '同工账号（兼容管理）';
  }

  function ensureHost() {
    const panel = $('#users');
    if (!panel) return null;
    let host = $('#teamPermissionManager');
    if (!host) {
      host = document.createElement('section');
      host.id = 'teamPermissionManager';
      host.className = 'card team-perm-card';
      host.innerHTML = `
        <h2>同工服事权限</h2>
        <p class="upload-note">这里决定每个同工登录后能看到、能进入哪些服事。技术角色由系统自动兼容，不需要手动理解。</p>
        <div id="teamPermissionList" class="team-perm-list"><p class="hint">正在读取…</p></div>
      `;
      panel.appendChild(host);
    }
    return host;
  }

  function serviceCheckbox(service, selected) {
    const planned = service.status === 'planned';
    return `
      <label class="service-check ${planned ? 'planned' : ''}">
        <input type="checkbox" value="${esc(service.id)}" ${selected.has(service.id) ? 'checked' : ''}>
        <span>${esc(service.icon || '•')} ${esc(service.title_zh)}${planned ? '<small class="service-tag"> · 待接入</small>' : ''}</span>
      </label>
    `;
  }

  function userCard(user, catalog, permissions) {
    const selected = new Set(permissions[user.id] || []);
    const checks = catalog.filter((service) => service.status !== 'hidden')
      .map((service) => serviceCheckbox(service, selected)).join('');
    return `
      <article class="team-person" data-team-user="${esc(user.id)}">
        <div class="team-person-head">
          <div>
            <h3>${esc(user.name)}</h3>
            <p>${esc(user.email || '未填写邮箱')} · ${user.password_ready ? '密码已设置' : '尚未设置密码'} · ${user.status === 'active' ? '正常' : '已停用'}</p>
          </div>
          <button class="ux-btn primary" type="button" data-save-services>保存服事</button>
        </div>
        <div class="service-checks">${checks}</div>
        <p class="msg" data-service-msg></p>
      </article>
    `;
  }

  function renderCatalog(host, catalog) {
    let box = $('#teamServiceCatalog');
    if (!box) {
      box = document.createElement('div');
      box.id = 'teamServiceCatalog';
      box.innerHTML = `
        <hr>
        <h2>服事目录</h2>
        <p class="hint">目录可以持续扩展。标记“待接入”的服事已经有权限接口，将来接页面或 App 时直接使用同一个 service_id。</p>
        <div class="catalog-list" data-catalog-list></div>
        <form id="newServiceForm" class="grid" style="margin-top:14px">
          <label>服事 ID<input name="id" placeholder="例如 kitchen_team" required pattern="[a-z0-9_]+"></label>
          <label>中文名称<input name="title_zh" placeholder="例如 餐饮二组" required></label>
          <label>图标<input name="icon" placeholder="🍲"></label>
          <label>状态<select name="status"><option value="planned">待接入</option><option value="active">已接入</option><option value="hidden">隐藏</option></select></label>
          <label class="full">说明<input name="description_zh" placeholder="这个服事负责什么"></label>
          <label class="full">入口地址（尚未开发可留空）<input name="href" placeholder="/team/.../"></label>
          <div class="actions full"><button class="btn" type="submit">新增服事项</button><span class="msg" data-new-service-msg></span></div>
        </form>
      `;
      host.appendChild(box);
      $('#newServiceForm').onsubmit = async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const msg = $('[data-new-service-msg]', form);
        const data = Object.fromEntries(new FormData(form));
        msg.textContent = '保存中…';
        try {
          await post('/api/admin/team-services', data);
          form.reset();
          msg.textContent = '已加入服事目录';
          msg.className = 'msg ok';
          await render();
        } catch (error) {
          msg.textContent = error.message;
          msg.className = 'msg';
        }
      };
    }

    const list = $('[data-catalog-list]', box);
    if (list) {
      list.innerHTML = catalog.map((service) => `
        <span class="catalog-chip ${service.status === 'planned' ? 'planned' : ''}">
          ${esc(service.icon || '•')} ${esc(service.title_zh)}${service.status === 'planned' ? ' · 待接入' : ''}
        </span>
      `).join('');
    }
  }

  async function render() {
    const host = ensureHost();
    if (!host) return;
    try {
      const [usersData, permissionData] = await Promise.all([
        get('/api/admin/users'), get('/api/admin/team-services'),
      ]);
      const users = usersData.users || [];
      const catalog = permissionData.catalog || [];
      const permissions = permissionData.permissions || {};
      const list = $('#teamPermissionList');
      list.innerHTML = users.length
        ? users.map((user) => userCard(user, catalog, permissions)).join('')
        : '<p class="hint">还没有同工账号。</p>';

      list.querySelectorAll('[data-save-services]').forEach((button) => {
        button.onclick = async () => {
          const card = button.closest('[data-team-user]');
          const msg = card.querySelector('[data-service-msg]');
          const services = [...card.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
          button.disabled = true;
          msg.textContent = '保存中…';
          try {
            await post(`/api/admin/users/${encodeURIComponent(card.dataset.teamUser)}/services`, { services });
            msg.textContent = '已保存';
            msg.className = 'msg ok';
            setTimeout(() => render(), 200);
          } catch (error) {
            msg.textContent = error.message;
            msg.className = 'msg';
          } finally {
            button.disabled = false;
          }
        };
      });

      renderCatalog(host, catalog);
    } catch (error) {
      const list = $('#teamPermissionList');
      if (list) list.innerHTML = `<p class="hint">${esc(error.message)}</p>`;
    }
  }

  async function boot() {
    addStyles();
    prepareExistingForm();
    try {
      const me = await get('/api/admin/me');
      if (me.user?.role !== 'owner') return;
      await render();
    } catch {}
  }

  boot();
  new MutationObserver(() => {
    prepareExistingForm();
    if ($('#users')?.classList.contains('active') && !$('#teamPermissionManager')) render();
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
})();
