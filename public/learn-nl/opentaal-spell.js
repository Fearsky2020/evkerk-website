const OPENTAAL_CORRECTIONS_URL = 'https://raw.githubusercontent.com/OpenTaal/opentaal-wordlist/master/elements/corrections.tsv';
const OPENTAAL_CACHE = 'opentaal-corrections-v1';
let correctionMapPromise = null;

function parseCorrections(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const tab = line.indexOf('\t');
    if (tab < 1) continue;
    const wrong = line.slice(0, tab).trim().toLocaleLowerCase('nl-NL');
    const right = line.slice(tab + 1).trim();
    if (wrong && right) map.set(wrong, right);
  }
  return map;
}

async function loadCorrections() {
  if (correctionMapPromise) return correctionMapPromise;
  correctionMapPromise = (async () => {
    let response = null;
    if ('caches' in window) {
      const cache = await caches.open(OPENTAAL_CACHE);
      response = await cache.match(OPENTAAL_CORRECTIONS_URL);
      if (!response && navigator.onLine) {
        const network = await fetch(OPENTAAL_CORRECTIONS_URL, { mode: 'cors', cache: 'force-cache' });
        if (network.ok) {
          response = network.clone();
          await cache.put(OPENTAAL_CORRECTIONS_URL, network.clone());
        }
      }
    } else if (navigator.onLine) {
      response = await fetch(OPENTAAL_CORRECTIONS_URL, { mode: 'cors', cache: 'force-cache' });
    }
    if (!response || !response.ok) throw new Error('OpenTaal corrections unavailable');
    return parseCorrections(await response.text());
  })();
  return correctionMapPromise;
}

function looksDutchToken(value) {
  const q = value.trim();
  return q.length >= 3 && q.length <= 48 && /^[a-zA-ZÀ-ÿ0-9+.'’ -]+$/.test(q) && !/\s{2,}/.test(q);
}

function ensureHintHost(input) {
  let host = document.getElementById('openTaalSpellHint');
  if (host) return host;
  host = document.createElement('div');
  host.id = 'openTaalSpellHint';
  host.className = 'opentaal-hint';
  host.hidden = true;
  const box = input.closest('.smart-search-box');
  if (box) box.insertAdjacentElement('afterend', host);
  else input.insertAdjacentElement('afterend', host);
  return host;
}

function firstSuggestion(value) {
  return String(value || '').split(';').map(x => x.trim()).filter(Boolean)[0] || '';
}

async function checkSpelling(input, host, token) {
  if (!looksDutchToken(token)) {
    host.hidden = true;
    host.innerHTML = '';
    return;
  }
  try {
    host.hidden = false;
    host.innerHTML = '<span class="opentaal-loading">OpenTaal 拼写表检查中…</span>';
    const map = await loadCorrections();
    if (input.value.trim() !== token) return;
    const correction = map.get(token.toLocaleLowerCase('nl-NL'));
    if (!correction) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    const best = firstSuggestion(correction);
    if (!best) return;
    host.innerHTML = `
      <span class="opentaal-mark">Aa</span>
      <span>可能是：<strong>${escapeHtml(best)}</strong></span>
      <button type="button" data-opentaal-use="${escapeHtml(best)}">改成这个</button>
      <small>OpenTaal 常见拼写修正</small>`;
  } catch (error) {
    console.warn('OpenTaal spelling helper unavailable.', error);
    host.hidden = true;
    host.innerHTML = '';
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function initOpenTaalSpell() {
  const input = document.getElementById('smartSearchInput');
  if (!input) return;
  const host = ensureHintHost(input);
  const source = document.querySelector('.smart-source');
  if (source) source.textContent = 'OpenTaal 拼写助手使用约 288 KB 的常见拼写修正表：只在输入荷兰语时按需加载，首次成功后缓存到浏览器；不把 5 MB / 40 万词完整词库塞进手机。';
  let timer = null;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const token = input.value.trim();
    if (!looksDutchToken(token)) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    timer = setTimeout(() => checkSpelling(input, host, token), 320);
  });

  host.addEventListener('click', event => {
    const button = event.target.closest('[data-opentaal-use]');
    if (!button) return;
    input.value = button.dataset.opentaalUse;
    host.hidden = true;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOpenTaalSpell, { once: true });
} else {
  initOpenTaalSpell();
}

import('./learning-loop.js').catch(error => console.warn('Learning loop unavailable.', error));
