const BOOKS = ['创世记','出埃及记','利未记','民数记','申命记','约书亚记','士师记','路得记','撒母耳记上','撒母耳记下','列王纪上','列王纪下','历代志上','历代志下','以斯拉记','尼希米记','以斯帖记','约伯记','诗篇','箴言','传道书','雅歌','以赛亚书','耶利米书','耶利米哀歌','以西结书','但以理书','何西阿书','约珥书','阿摩司书','俄巴底亚书','约拿书','弥迦书','那鸿书','哈巴谷书','西番雅书','哈该书','撒迦利亚书','玛拉基书','马太福音','马可福音','路加福音','约翰福音','使徒行传','罗马书','哥林多前书','哥林多后书','加拉太书','以弗所书','腓立比书','歌罗西书','帖撒罗尼迦前书','帖撒罗尼迦后书','提摩太前书','提摩太后书','提多书','腓利门书','希伯来书','雅各书','彼得前书','彼得后书','约翰一书','约翰二书','约翰三书','犹大书','启示录'];

let cachedIndex = null;

function norm(text) {
  return String(text || '').toLowerCase().replace(/[\s，。；：、！？,.!?;:'"“”‘’（）()\[\]【】]/g, '');
}

function bigrams(text) {
  const s = norm(text);
  const out = [];
  for (let i = 0; i < s.length - 1; i += 1) out.push(s.slice(i, i + 2));
  return out;
}

function fuzzyScore(text, query) {
  const t = norm(text);
  const q = norm(query);
  if (!q) return 0;
  const pos = t.indexOf(q);
  if (pos >= 0) return 100 - Math.min(pos, 50) / 10;
  if (q.length < 2) return 0;
  const bg = bigrams(q);
  if (!bg.length) return 0;
  let hit = 0;
  for (const b of bg) if (t.includes(b)) hit += 1;
  return hit / bg.length;
}

async function loadIndex(env) {
  if (cachedIndex) return cachedIndex;
  const response = await env.ASSETS.fetch(new Request('https://evkerk.nl/data/bible-cuvs-search.json'));
  if (!response.ok) throw new Error(`bible search index ${response.status}`);
  cachedIndex = await response.json();
  return cachedIndex;
}

function parseReference(query) {
  const compact = String(query || '').replace(/\s+/g, '');
  for (let i = 0; i < BOOKS.length; i += 1) {
    const book = BOOKS[i];
    if (!compact.startsWith(book)) continue;
    const rest = compact.slice(book.length);
    const match = rest.match(/^第?(\d+)章?(?:[:：](\d+)(?:[-–—](\d+))?)?$/);
    if (!match) continue;
    return {
      bookIndex: i,
      chapter: Number(match[1]),
      verseStart: match[2] ? Number(match[2]) : null,
      verseEnd: match[3] ? Number(match[3]) : (match[2] ? Number(match[2]) : null),
    };
  }
  return null;
}

function toResult(row, score = 100) {
  const [bookIndex, chapter, verse, text] = row;
  const book = BOOKS[bookIndex] || '';
  return {
    reference: `${book} ${chapter}:${verse}`,
    book,
    book_index: bookIndex,
    chapter,
    verse,
    text,
    score,
    open_url: `https://evkerk.nl/bible?book=${bookIndex}&chapter=${chapter}&verse=${verse}`,
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? 'public, max-age=300' : 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

export async function handleBibleSearch(request, env, url = new URL(request.url)) {
  if (url.pathname !== '/api/bible/search') return null;
  if (!['GET', 'POST', 'OPTIONS'].includes(request.method)) return json({ ok: false, error: 'method not allowed' }, 405);
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
      },
    });
  }

  let query = url.searchParams.get('q') || '';
  let requestedLimit = Number(url.searchParams.get('limit') || 5);
  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    query = String(body.q ?? body.query ?? query);
    requestedLimit = Number(body.limit ?? requestedLimit);
  }
  query = String(query).trim().slice(0, 120);
  const limit = Math.max(1, Math.min(10, Number.isFinite(requestedLimit) ? requestedLimit : 5));
  if (!query) return json({ ok: false, error: 'q is required' }, 400);

  try {
    const index = await loadIndex(env);
    const rows = Array.isArray(index?.rows) ? index.rows : [];
    const ref = parseReference(query);
    let results = [];

    if (ref) {
      results = rows
        .filter(row => row[0] === ref.bookIndex && row[1] === ref.chapter && (ref.verseStart == null || (row[2] >= ref.verseStart && row[2] <= ref.verseEnd)))
        .slice(0, limit)
        .map(row => toResult(row, 100));
    } else {
      const scored = [];
      for (const row of rows) {
        const score = fuzzyScore(row[3], query);
        if (score >= 99 || score >= 0.62) scored.push({ row, score });
      }
      scored.sort((a, b) => b.score - a.score || a.row[0] - b.row[0] || a.row[1] - b.row[1] || a.row[2] - b.row[2]);
      results = scored.slice(0, limit).map(({ row, score }) => toResult(row, score));
    }

    return json({ ok: true, query, count: results.length, results });
  } catch (error) {
    console.error('BIBLE_SEARCH_FAILED', error?.message || error);
    return json({ ok: false, error: 'bible search unavailable' }, 503);
  }
}
