const BOOKS = ['创世记','出埃及记','利未记','民数记','申命记','约书亚记','士师记','路得记','撒母耳记上','撒母耳记下','列王纪上','列王纪下','历代志上','历代志下','以斯拉记','尼希米记','以斯帖记','约伯记','诗篇','箴言','传道书','雅歌','以赛亚书','耶利米书','耶利米哀歌','以西结书','但以理书','何西阿书','约珥书','阿摩司书','俄巴底亚书','约拿书','弥迦书','那鸿书','哈巴谷书','西番雅书','哈该书','撒迦利亚书','玛拉基书','马太福音','马可福音','路加福音','约翰福音','使徒行传','罗马书','哥林多前书','哥林多后书','加拉太书','以弗所书','腓立比书','歌罗西书','帖撒罗尼迦前书','帖撒罗尼迦后书','提摩太前书','提摩太后书','提多书','腓利门书','希伯来书','雅各书','彼得前书','彼得后书','约翰一书','约翰二书','约翰三书','犹大书','启示录'];

const STORY_HINTS = [
  { aliases: ['毒瓜','毒汤','锅里有毒','吃了毒瓜','误食有毒植物'], terms: ['野瓜','锅中有致死的毒物','无毒'] },
  { aliases: ['找先知治病','先知治病','去找先知治病','求先知医治'], terms: ['乃缦','大麻风','以利沙'] },
  { aliases: ['斧头掉水里','斧子掉水里','斧头掉在水里'], terms: ['斧头掉在水里','斧子是借的'] },
  { aliases: ['小孩子拿吃的给耶稣','小孩拿吃的给耶稣','孩子给耶稣饼和鱼','五饼二鱼'], terms: ['孩童','五个大麦饼','两条鱼'] },
  { aliases: ['约书亚过约旦河','过约旦河'], terms: ['过了约旦河','约旦河'] },
  { aliases: ['耶稣复活了一个人','耶稣叫死人复活','耶稣使死人复活'], terms: ['闺女我吩咐你起来','少年人我吩咐你起来','拉撒路出来'] },
  { aliases: ['耶稣医治了瞎子','耶稣治瞎子','瞎子得医治'], terms: ['瞎子','生来是瞎眼的'] },
  { aliases: ['瘫子得医治','瘫子被医治','有人抬瘫子来'], terms: ['瘫子','褥子'] },
  { aliases: ['女人拿礼物给耶稣','女人拿礼物来给耶稣','女人拿香膏给耶稣','女人用香膏膏耶稣'], terms: ['玉瓶极贵的香膏','香膏抹'] },
  { aliases: ['有人爬树看耶稣','爬树看耶稣'], terms: ['撒该','桑树'] },
  { aliases: ['浪子回头','小儿子回家'], terms: ['小儿子','死而复活失而又得'] },
  { aliases: ['好撒玛利亚人','撒玛利亚人救人'], terms: ['撒玛利亚人','油和酒倒在他的伤处'] },
  { aliases: ['十个大麻风','十个麻风病人'], terms: ['十个长大麻风的','大麻风'] },
];

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

function storyHintFor(query) {
  const q = norm(query);
  if (!q) return null;
  return STORY_HINTS.find(hint => hint.aliases.some(alias => q.includes(norm(alias)))) || null;
}

function searchByTerms(rows, terms, limit) {
  const found = [];
  const seen = new Set();
  for (const term of terms) {
    const exact = [];
    const fuzzy = [];
    for (const row of rows) {
      const key = `${row[0]}:${row[1]}:${row[2]}`;
      if (seen.has(key)) continue;
      const ntext = norm(row[3]);
      const nterm = norm(term);
      if (ntext.includes(nterm)) exact.push({ row, score: 150 });
      else {
        const score = fuzzyScore(row[3], term);
        if (score >= 0.72) fuzzy.push({ row, score });
      }
    }
    exact.sort((a, b) => a.row[0] - b.row[0] || a.row[1] - b.row[1] || a.row[2] - b.row[2]);
    fuzzy.sort((a, b) => b.score - a.score || a.row[0] - b.row[0] || a.row[1] - b.row[1] || a.row[2] - b.row[2]);
    for (const item of [...exact, ...fuzzy].slice(0, 2)) {
      const key = `${item.row[0]}:${item.row[1]}:${item.row[2]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(item);
      if (found.length >= limit) return found;
    }
  }
  return found;
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
    let mode = 'text';
    let matchedHint = null;

    if (ref) {
      mode = 'reference';
      results = rows
        .filter(row => row[0] === ref.bookIndex && row[1] === ref.chapter && (ref.verseStart == null || (row[2] >= ref.verseStart && row[2] <= ref.verseEnd)))
        .slice(0, limit)
        .map(row => toResult(row, 100));
    } else {
      const hint = storyHintFor(query);
      if (hint) {
        const hinted = searchByTerms(rows, hint.terms, limit);
        if (hinted.length) {
          mode = 'story_hint';
          matchedHint = hint.aliases[0];
          results = hinted.map(({ row, score }) => toResult(row, score));
        }
      }
      if (!results.length) {
        const scored = [];
        for (const row of rows) {
          const score = fuzzyScore(row[3], query);
          if (score >= 99 || score >= 0.62) scored.push({ row, score });
        }
        scored.sort((a, b) => b.score - a.score || a.row[0] - b.row[0] || a.row[1] - b.row[1] || a.row[2] - b.row[2]);
        results = scored.slice(0, limit).map(({ row, score }) => toResult(row, score));
      }
    }

    return json({
      ok: true,
      query,
      mode,
      matched_hint: matchedHint,
      version: 'cuvs',
      version_label: '和合本（简体）',
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('BIBLE_SEARCH_FAILED', error?.message || error);
    return json({ ok: false, error: 'bible search unavailable' }, 503);
  }
}
