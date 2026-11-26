// series.js — series name / position / sibling books (Wikidata: "part of the series" P179 + "series ordinal" P1545).
// Free, keyless, CORS-open, so it works from a static site. Coverage is honest-partial: Wikidata knows popular
// series well and obscure or Arabic ones patchily. Callers must handle an empty result.
const OL = 'https://openlibrary.org';
const WD = 'https://query.wikidata.org/sparql';

async function getJSON(url, ms = 30000) {
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal}); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(timer); }
}
export const normTitle = s => String(s || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/^(the|a|an)\s+/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const normName = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const qid = u => (u || '').split('/').pop();

async function sparql(q) {
  let d;
  try { d = await getJSON(WD + '?format=json&query=' + encodeURIComponent(q)); }
  catch (e) { if (!/429|503/.test(e.message)) throw e; await new Promise(r => setTimeout(r, 6000)); d = await getJSON(WD + '?format=json&query=' + encodeURIComponent(q)); }
  return (d.results && d.results.bindings) || [];
}

const memo = new Map();
// Wikidata id of an author, preferring the id Open Library records for them.
export async function authorQid(name, olAuthorKey) {
  const k = 'a:' + (olAuthorKey || name);
  if (memo.has(k)) return memo.get(k);
  const p = (async () => {
    if (olAuthorKey) {
      try { const a = await getJSON(`${OL}/authors/${String(olAuthorKey).replace('/authors/', '')}.json`, 9000); const w = a.remote_ids && a.remote_ids.wikidata; if (w) return w; } catch {}
    }
    return '';
  })();
  memo.set(k, p); return p;
}

function parseOrd(v) { if (!v) return null; const m = String(v).match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; }

// All series that contain at least one book by this author, with every member (any author) in order.
// Returns [{ id, name, books:[{id,title,ord,year,author}] }]
export async function seriesByAuthor({ name, olAuthorKey }) {
  const k = 's:' + normName(name);
  if (memo.has(k)) return memo.get(k);
  const ck = 'qari.series.' + normName(name);
  try { const c = JSON.parse(localStorage.getItem(ck) || 'null'); if (c && Date.now() - c.t < 7 * 864e5) { const r = Promise.resolve(c.v); memo.set(k, r); return r; } } catch {}
  const p = (async () => {
    const q = await authorQid(name, olAuthorKey);
    const who = q ? `VALUES ?au { wd:${q} }` : `?au rdfs:label "${esc(name)}"@en. ?au wdt:P31 wd:Q5.`;
    const own = await sparql(`SELECT DISTINCT ?series WHERE { ${who} ?b0 wdt:P50 ?au; wdt:P179 ?series. } LIMIT 40`);
    const ids = own.map(r => qid(r.series.value)).filter(x => /^Q\d+$/.test(x));
    if (!ids.length) return [];
    const rows = await sparql(`SELECT ?series ?seriesLabel ?book ?bookLabel ?ord ?date ?authorLabel WHERE {
      VALUES ?series { ${ids.map(i => 'wd:' + i).join(' ')} }
      ?book p:P179 ?st. ?st ps:P179 ?series. OPTIONAL { ?st pq:P1545 ?ord } OPTIONAL { ?book wdt:P577 ?date } OPTIONAL { ?book wdt:P50 ?author }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ar". } }`);
    const by = new Map();
    for (const r of rows) {
      const sid = qid(r.series.value); if (/^Q\d+$/.test(r.seriesLabel.value)) continue;
      const s = by.get(sid) || { id: sid, name: r.seriesLabel.value, books: new Map() };
      const bid = qid(r.book.value);
      const cur = s.books.get(bid) || { id: bid, title: r.bookLabel.value, ord: null, year: '', author: '' };
      const o = parseOrd(r.ord && r.ord.value); if (o != null && cur.ord == null) cur.ord = o;
      if (r.date && !cur.year) cur.year = (r.date.value.match(/^-?\d{1,4}/) || [''])[0];
      if (r.authorLabel && !cur.author && !/^Q\d+$/.test(r.authorLabel.value)) cur.author = r.authorLabel.value;
      s.books.set(bid, cur); by.set(sid, s);
    }
    return [...by.values()].map(s => {
      let books = [...s.books.values()].filter(b => !/^Q\d+$/.test(b.title));
      const latin = x => /[A-Za-z]/.test(x);
      const nLatin = books.filter(b => latin(b.title)).length, preferLatin = nLatin * 2 >= books.length;
      // translations/editions often sit in the same series with the same number: keep one per number, in the series' main script
      const seen = new Map();
      for (const b of books) {
        if (b.ord == null) continue;
        const prev = seen.get(b.ord);
        if (!prev || (latin(b.title) === preferLatin && latin(prev.title) !== preferLatin)) seen.set(b.ord, b);
      }
      books = books.filter(b => b.ord == null || seen.get(b.ord) === b);
      const anyOrd = books.some(b => b.ord != null);
      if (anyOrd) books = books.filter(b => b.ord != null || !/\bseries\b|audiobook|omnibus|collection/i.test(b.title));
      books.sort((a, b) => anyOrd ? ((a.ord ?? 1e9) - (b.ord ?? 1e9) || (a.year || 9999) - (b.year || 9999)) : ((a.year || 9999) - (b.year || 9999)));
      return { id: s.id, name: s.name, books, ordered: anyOrd };
    }).filter(s => s.books.length > 1 && s.books.length <= 30)
      .filter(s => { // drop translated/film-only series in another script than the author's name
        const lat = x => /[A-Za-z]/.test(x), authLat = lat(name);
        return s.books.filter(b => lat(b.title) === authLat).length * 2 >= s.books.length; })
      .sort((a, b) => b.books.length - a.books.length);
  })();
  memo.set(k, p); p.then(v => { try { localStorage.setItem(ck, JSON.stringify({ t: Date.now(), v })); } catch {} }, () => memo.delete(k));
  return p;
}

// Series info for one book: { series:{name,books,ordered}, position, total } or null when Wikidata has nothing.
export async function seriesForBook({ title, author, olAuthorKey }) {
  const list = await seriesByAuthor({ name: author, olAuthorKey });
  const t = normTitle(title); if (!t) return null;
  const sub = x => normTitle(String(x).split(/[:\u2014]| - /)[0]);
  for (const eq of [x => normTitle(x) === t, x => sub(x) === sub(title)]) {
    for (const s of list) {
      const i = s.books.findIndex(b => eq(b.title));
      if (i >= 0) return { series: s, index: i, position: s.books[i].ord, total: s.books.length };
    }
  }
  return null;
}
