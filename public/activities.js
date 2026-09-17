const I18N = {
  zh: {
    brandName: '基督教福音教会', brandSubtitle: 'EVANGELIEKERK', home: '返回首页', title: '一起经历的故事。', intro: '这里收录教会活动、团契活动和咖啡会友小组的照片。新的活动会从后台自动加入。', loading: '活动相册正在载入。', empty: '目前还没有公开的活动相册。', photoCount: (n) => `${n} 张照片`, categories: { church: '教会生活', fellowship: '团契活动', group: '咖啡会友小组' }, close: '关闭'
  },
  nl: {
    brandName: 'Evangeliekerk', brandSubtitle: 'CHRISTELIJKE EVANGELISCHE GEMEENTE', home: 'Terug naar home', title: 'Verhalen die we samen beleven.', intro: 'Hier verzamelen we foto’s van gemeenteleven, fellowship en koffiegroepen. Nieuwe activiteiten worden vanuit het beheerpaneel toegevoegd.', loading: 'Activiteiten worden geladen.', empty: 'Er zijn nog geen openbare fotoalbums.', photoCount: (n) => `${n} foto’s`, categories: { church: 'Gemeenteleven', fellowship: 'Fellowship', group: 'Koffiegroep' }, close: 'Sluiten'
  }
};

let lang = localStorage.getItem('evkerk-lang') === 'nl' ? 'nl' : 'zh';
let theme = localStorage.getItem('evkerk-theme') === 'dark' ? 'dark' : 'light';
let albums = [];

function t(){ return I18N[lang]; }
function applyTheme(){ document.documentElement.dataset.theme = theme; document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀' : '☾'; }
function escapeHtml(value=''){ return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function categoryLabel(category){ return t().categories[category] || category || ''; }

function render(){
  const copy = t();
  document.documentElement.lang = lang === 'nl' ? 'nl' : 'zh-CN';
  document.getElementById('brandName').textContent = copy.brandName;
  document.getElementById('brandSubtitle').textContent = copy.brandSubtitle;
  document.getElementById('homeLink').textContent = copy.home;
  document.getElementById('langToggle').textContent = lang === 'nl' ? '中' : 'NL';
  document.getElementById('pageTitle').textContent = copy.title;
  document.getElementById('pageIntro').textContent = copy.intro;
  document.getElementById('closePhoto').setAttribute('aria-label', copy.close);

  const list = document.getElementById('albumList');
  if (!albums.length) {
    list.innerHTML = `<div class="archive-empty"><strong>${escapeHtml(copy.empty)}</strong></div>`;
    return;
  }
  list.innerHTML = albums.map(album => {
    const title = lang === 'nl' ? (album.title_nl || album.title_zh || '') : (album.title_zh || album.title_nl || '');
    const subtitle = lang === 'nl' ? (album.subtitle_nl || album.subtitle_zh || '') : (album.subtitle_zh || album.subtitle_nl || '');
    const photos = Array.isArray(album.photos) ? album.photos : [];
    return `<article class="album">
      <div class="album-head"><div><span class="album-category">${escapeHtml(categoryLabel(album.category))}</span><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</div><div class="album-meta">${escapeHtml(album.event_date || '')}<br>${escapeHtml(copy.photoCount(photos.length))}</div></div>
      <div class="photo-grid">${photos.map(photo => `<button type="button" data-photo="${escapeHtml(photo.url)}"><img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.alt || title)}" loading="lazy"></button>`).join('')}</div>
    </article>`;
  }).join('');
  list.querySelectorAll('[data-photo]').forEach(btn => btn.addEventListener('click', () => openPhoto(btn.dataset.photo)));
}

function openPhoto(url){ document.getElementById('largePhoto').src = url; document.getElementById('photoDialog').showModal(); }

document.getElementById('closePhoto').addEventListener('click', () => document.getElementById('photoDialog').close());
document.getElementById('photoDialog').addEventListener('click', event => { if (event.target.id === 'photoDialog') event.currentTarget.close(); });
document.getElementById('themeToggle').addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('evkerk-theme', theme); applyTheme(); });
document.getElementById('langToggle').addEventListener('click', () => { lang = lang === 'nl' ? 'zh' : 'nl'; localStorage.setItem('evkerk-lang', lang); render(); });

applyTheme();
render();
fetch('/api/activity-gallery?limit=24').then(r => r.ok ? r.json() : Promise.reject()).then(data => { albums = Array.isArray(data?.albums) ? data.albums : []; render(); }).catch(() => { document.getElementById('albumList').innerHTML = `<div class="archive-empty"><strong>${escapeHtml(t().loading)}</strong></div>`; });
