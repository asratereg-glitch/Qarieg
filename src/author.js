// author.js — author page: bio, series (with order), every book. Reached by tapping any author name.
import { t, tr, getLang } from './i18n.js';
import { esc, toast, findCover, coverImgHTML, authorHTML } from './app.js';
import { worksByAuthor, resolveAuthorKey, firstAuthorName } from './meta.js';
import { seriesByAuthor } from './series.js';

const OL = 'https://openlibrary.org';
const $ = (s, r = document) => r.querySelector(s);
let TOKEN = 0;

export async function openBookByTitle(title, author) {
  toast(t('loading'));
  const f = await findCover(title, author).catch(() => null);
  if (f && f.olKey) location.hash = '#/work/' + f.olKey;
  else toast(tr('مش لاقي صفحة للكتاب ده في Open Library', 'No Open Library page found for this book'), 3000);
}

// Renders a series box: numbered books in order. `current` is the title to highlight.
export function seriesBoxHTML(s, current, author) {
  const cur = String(current || '').toLowerCase();
  return `<div class="series-card"><h3>📚 ${esc(s.name)} <small class="muted">· ${s.books.length} ${tr('كتب', 'books')}</small></h3>
    <ol class="series-list">${s.books.map((b, i) => `<li ${b.title.toLowerCase() === cur ? 'class="cur"' : ''}><a href="#" data-title="${esc(b.title)}" data-author="${esc(b.author || author || '')}"><span class="sn">${b.ord != null ? b.ord : i + 1}</span> ${esc(b.title)}${b.year ? ` <span class="muted">(${esc(b.year)})</span>` : ''}</a></li>`).join('')}</ol>
    <div class="muted" style="font-size:.75rem">${s.ordered ? tr('الترتيب حسب رقم الكتاب في Wikidata.', 'Order = book number recorded on Wikidata.') : tr('مفيش ترقيم مسجّل، فالترتيب حسب سنة النشر.', 'No book numbers recorded, so ordered by publication year.')}</div></div>`;
}
export function bindSeriesLinks(root) {
  root.querySelectorAll('.series-list a').forEach(a => a.onclick = e => { e.preventDefault(); openBookByTitle(a.dataset.title, a.dataset.author); });
}

export async function renderAuthorPage(view, rawName) {
  const name = decodeURIComponent(rawName || '').trim();
  const tok = ++TOKEN;
  view.innerHTML = `<div class="view-head"><button class="btn" id="auBack">← ${tr('رجوع', 'Back')}</button><h1 dir="auto">${esc(name)}</h1></div>
    <div class="chart-box" id="auBio" hidden></div>
    <div id="auSeries"><p class="muted">${tr('بدوّر على السلاسل…', 'Looking for series…')}</p></div>
    <h2 class="bp-h2">${tr('كل الكتب', 'All books')}</h2>
    <div class="grid" id="auGrid"><p class="muted">${t('loading')}</p></div><div id="auMore"></div>`;
  $('#auBack', view).onclick = () => history.length > 1 ? history.back() : (location.hash = '#/discover');
  const key = await resolveAuthorKey(name);
  if (tok !== TOKEN) return;

  // bio (optional)
  if (key) fetch(`${OL}/authors/${String(key).replace('/authors/', '')}.json`).then(r => r.json()).then(a => {
    if (tok !== TOKEN) return;
    const bio = typeof a.bio === 'string' ? a.bio : (a.bio && a.bio.value) || '';
    const photo = a.photos && a.photos[0] > 0 ? `https://covers.openlibrary.org/a/id/${a.photos[0]}-M.jpg` : '';
    if (!bio && !photo) return;
    const box = $('#auBio', view); box.hidden = false;
    box.innerHTML = `<div class="bp-author">${photo ? `<img src="${esc(photo)}" alt="">` : ''}<div><strong>${esc(a.name || name)}</strong><div class="muted">${esc([a.birth_date, a.death_date].filter(Boolean).join(' – '))}</div></div></div>${bio ? `<p class="bp-bio" dir="auto">${esc(bio.split('\n')[0].slice(0, 700))}</p>` : ''}`;
  }).catch(() => {});

  // series
  seriesByAuthor({ name: firstAuthorName(name), olAuthorKey: key }).then(list => {
    if (tok !== TOKEN) return;
    const host = $('#auSeries', view);
    host.innerHTML = list.length
      ? `<h2 class="bp-h2">${tr('السلاسل', 'Series')}</h2>` + list.map(s => seriesBoxHTML(s, '', name)).join('') + `<p class="muted" style="font-size:.75rem">${tr('المصدر: Wikidata. التغطية مش كاملة، خصوصًا للكتب العربية والأقل شهرة.', 'Source: Wikidata. Coverage is partial, especially for Arabic and lesser-known books.')}</p>`
      : `<p class="muted">${tr('مفيش بيانات سلاسل لهذا المؤلف في Wikidata (ممكن يكون عنده سلسلة بس مش متسجلة).', 'No series data for this author on Wikidata (a series may exist but not be recorded there).')}</p>`;
    bindSeriesLinks(host);
  }).catch(() => { const host = $('#auSeries', view); if (host) host.innerHTML = `<p class="muted">${tr('تعذّر تحميل السلاسل (النت أو Wikidata مش متاح دلوقتي).', 'Could not load series (offline, or Wikidata is busy right now).')}</p>`; });

  // all books
  const grid = $('#auGrid', view), more = $('#auMore', view);
  let page = 0, busy = false; const seen = new Set();
  const load = async () => {
    if (busy) return; busy = true;
    try {
      const r = await worksByAuthor(name, page, 24, key);
      if (tok !== TOKEN) return;
      if (!page) grid.innerHTML = '';
      page++;
      r.items.forEach(it => {
        const k = it.olKey || it.title; if (seen.has(k)) return; seen.add(k);
        const c = document.createElement('div'); c.className = 'book-card';
        c.innerHTML = `<div class="cover">${coverImgHTML(it)}</div><div class="book-meta"><div class="book-title">${esc(it.title)}</div><div class="book-author">${it.year ? esc(it.year) : ''}${it.rating ? ' · ★ ' + it.rating.toFixed(1) : ''}</div></div>`;
        c.onclick = () => it.olKey ? (location.hash = '#/work/' + it.olKey) : openBookByTitle(it.title, name);
        grid.appendChild(c);
      });
      if (!seen.size) grid.innerHTML = `<p class="muted">${t('noResults')}</p>`;
      more.innerHTML = r.more ? `<button class="btn" style="margin:1rem auto;display:block">${tr('عرض المزيد', 'Load more')}</button>` : '';
      const b = more.querySelector('button'); if (b) b.onclick = load;
    } catch (e) { if (!page) grid.innerHTML = `<p class="muted">⚠ ${esc(e.message)}</p>`; }
    busy = false;
  };
  load();
}
