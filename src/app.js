// app.js — shell, router, library, shelves, book details, settings
import { renderFindSitesSettings } from './findbook.js';
import * as db from './db.js';
import * as store from './store.js';
import { t, tr, setLang, getLang, applyI18n } from './i18n.js';
import { renderStats } from './stats.js';
import { renderDiscover, bindDiscover, searchOpenLibrary } from './discover.js';
import { renderCommunity, bindCommunity } from './community.js';
import { openReader } from './reader.js';
import { renderBookPage } from './bookpage.js';
import { renderAuthorPage } from './author.js';
import { renderLists } from './lists.js';
import { fontPicker } from './fonts.js';
import * as dbfile from './dbfile.js';
import * as sync from './sync.js';

export { db, store, t, getLang };

/* Link a file from the device to an existing book (so it can be read). Must be called from a click handler. */
export function pickBookFile(book) {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.epub,.pdf,.txt'; inp.style.display = 'none';
    document.body.appendChild(inp);
    const done = v => { inp.remove(); resolve(v); };
    inp.addEventListener('cancel', () => done(null));
    inp.addEventListener('change', async () => {
      const file = inp.files && inp.files[0]; if (!file) return done(null);
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!['epub', 'pdf', 'txt'].includes(ext)) { toast('⚠ EPUB / PDF / TXT'); return done(null); }
      try {
        const old = book.fileKey;
        const fileKey = 'file-' + store.uid();
        await db.putFile(fileKey, file);
        store.updateBook(book.id, { format: ext, fileKey, fileName: file.name, source: book.source === 'openlibrary' ? 'openlibrary' : book.source });
        if (old) await db.deleteFile(old).catch(() => {});
        toast(getLang() === 'ar' ? '✓ تم ربط ملف الكتاب' : '✓ Book file linked');
        done(store.getBook(book.id));
      } catch (e) { console.error(e); toast('⚠ ' + (e.message || e)); done(null); }
    });
    inp.click();
  });
}
/* Start reading: open the linked file, or ask for the file first. */
export async function startReadingBook(book) {
  if (book.fileKey && book.format !== 'web') return openReader(book);
  const b = await pickBookFile(book);
  if (b) openReader(b);
}

/* ---------- helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function esc(s = '') { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export function authorHTML(name) {
  const n = String(name || '').trim();
  return n && n !== '—' ? `<span class="author-link" data-author="${esc(n)}" title="${getLang() === 'ar' ? 'كل كتب المؤلف' : 'All books by this author'}">${esc(n)}</span>` : esc(n || '—');
}
export function openAuthor(name) {
  const n = String(name || '').trim(); if (!n) return;
  location.hash = '#/author/' + encodeURIComponent(n);
}
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('.author-link');
  if (!a || !a.dataset.author) return;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  const ro = document.getElementById('readerOverlay'); if (ro && !ro.classList.contains('hidden')) return;
  openAuthor(a.dataset.author);
}, true);
export function toast(msg, ms = 2200) {
  const el = $('#toast'); el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.add('hidden'), ms);
}
export function stars(rating, interactive = false, cb = null) {
  const wrap = document.createElement('span');
  wrap.className = 'stars' + (interactive ? ' interactive' : '');
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement('span');
    s.textContent = i <= rating ? '★' : '☆';
    if (i > rating) s.classList.add('off');
    if (interactive) { s.dataset.v = i; s.onclick = () => cb && cb(i); }
    wrap.appendChild(s);
  }
  return wrap;
}
/* ---- covers: always high-res, lazy, with ISBN fallback and a placeholder only when nothing loads ---- */
export function hiCover(url) {
  if (!url || !/covers\.openlibrary\.org/.test(url)) return url || '';
  return url.replace(/-(S|M)\.jpg/, '-L.jpg').replace(/\?default=false/, '') + '?default=false';
}
export const isbnCover = isbn => isbn ? `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(String(isbn).replace(/[^0-9Xx]/g, ''))}-L.jpg?default=false` : '';
export function placeholderHTML(title, icon = '📕') { return `<div class="cover-fallback">${icon}<small>${esc(title || '')}</small></div>`; }
export function coverImgHTML(book, icon) {
  const src = hiCover(book.cover) || isbnCover(book.isbn);
  if (!src) return placeholderHTML(book.title, icon);
  return `<img class="cimg" src="${esc(src)}" alt="" loading="lazy" decoding="async" data-isbn="${esc(book.isbn || '')}" data-title="${esc(book.title || '')}" data-icon="${esc(icon || '📕')}" data-tried="${hiCover(book.cover) ? 'cover' : 'isbn'}">`;
}
document.addEventListener('error', e => {
  const im = e.target; if (!(im instanceof HTMLImageElement) || !im.classList.contains('cimg')) return;
  const isbn = im.dataset.isbn;
  if (im.dataset.tried === 'cover' && isbn) { im.dataset.tried = 'isbn'; im.src = isbnCover(isbn); return; }
  const d = document.createElement('div'); d.innerHTML = placeholderHTML(im.dataset.title, im.dataset.icon); im.replaceWith(d.firstChild);
}, true);
/* cover lookup by title+author (award lists etc.), cached */
const CKEY = 'qari.covers.v1'; let ccache = {}; try { ccache = JSON.parse(localStorage.getItem(CKEY) || '{}'); } catch {}
let cq = Promise.resolve();
export function findCover(title, author) {
  const k = (title + '|' + author).toLowerCase();
  if (k in ccache) return Promise.resolve(ccache[k]);
  const job = cq.then(() => new Promise(r => setTimeout(r, 120))).then(() => findCover1(title, author, k));
  cq = job.catch(() => {}); return job;
}
async function findCover1(title, author, k) {
  try {
    const r = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=3&fields=cover_i,key`);
    const d = await r.json(); const hit = (d.docs || []).find(x => x.cover_i);
    ccache[k] = hit ? { cover: `https://covers.openlibrary.org/b/id/${hit.cover_i}-L.jpg`, olKey: (hit.key || '').replace('/works/', '') } : null;
    try { localStorage.setItem(CKEY, JSON.stringify(ccache)); } catch {}
  } catch { return null; }
  return ccache[k];
}
export function coverHTML(book, small = false) {
  return coverImgHTML(book, book.format === 'pdf' ? '📄' : book.format === 'epub' ? '📕' : '📃');
}
function shelfName(s) { return ({ want: t('shelf_want'), reading: t('shelf_reading'), finished: t('shelf_finished') })[s] || s; }
export function fmtDate(iso) { try { return new Date(iso).toLocaleDateString(getLang() === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return ''; } }

/* ---------- theme & language ---------- */
function applySettings() {
  const s = store.getState().settings;
  document.body.dataset.theme = s.theme;
  document.documentElement.lang = s.lang;
  document.documentElement.dir = s.lang === 'ar' ? 'rtl' : 'ltr';
  setLang(s.lang);
  applyI18n();
  $('#addBookBtn').firstChild.textContent = '＋ '; // keep icon before label
}
store.onChange(() => { /* live updates handled per-view */ });

/* ---------- router ---------- */
const routes = {
  '': renderLibrary, 'shelves': renderShelves, 'stats': renderStatsRoute,
  'discover': renderDiscoverRoute, 'community': renderCommunityRoute, 'settings': renderSettings,
  'author': (v, a) => renderAuthorPage(v, a), 'book': (v, a) => renderBookPage(v, a, 'book'), 'work': (v, a) => renderBookPage(v, a, 'work'), 'lists': renderLists,
};
function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name, arg] = hash.split('/');
  const fn = routes[name] || renderLibrary;
  $$('#mainnav a').forEach(a => a.classList.toggle('active', a.dataset.route === (name || 'library')));
  const view = $('#view'); view.innerHTML = ''; window.scrollTo(0, 0);
  fn(view, arg);
}
window.addEventListener('hashchange', route);


/* ---------- shared sorting (library / lists / discover) ---------- */
export const SORT_MODES = ['year-desc', 'year-asc', 'rating-desc', 'rating-asc'];
export function sortLabel(mode) {
  return ({
    'default': tr('الافتراضي', 'Default'),
    'year-desc': tr('الأحدث إصدارًا', 'Newest release'),
    'year-asc': tr('الأقدم إصدارًا', 'Oldest release'),
    'rating-desc': tr('الأعلى تقييمًا', 'Highest rated'),
    'rating-asc': tr('الأقل تقييمًا', 'Lowest rated'),
  })[mode] || mode;
}
export function sortOptionsHTML(mode, withDefault = true) {
  const modes = (withDefault ? ['default'] : []).concat(SORT_MODES);
  return modes.map(m => `<option value="${m}"${m === mode ? ' selected' : ''}>${esc(sortLabel(m))}</option>`).join('');
}
/* Sorts a copy; items missing the key go last in both directions. */
export function sortBooks(books, mode) {
  const cmp = (get, dir) => (a, b) => {
    const x = get(a), y = get(b);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return (x - y) * dir;
  };
  const yr = b => { const y = parseInt(b.year, 10); return isNaN(y) ? null : y; };
  const rt = b => (b.rating > 0 ? b.rating : null);
  if (mode === 'year-desc') return books.slice().sort(cmp(yr, -1));
  if (mode === 'year-asc') return books.slice().sort(cmp(yr, 1));
  if (mode === 'rating-desc') return books.slice().sort(cmp(rt, -1));
  if (mode === 'rating-asc') return books.slice().sort(cmp(rt, 1));
  return books;
}

/* ---------- library ---------- */
function bookCard(b, onDelete = null) {
  const el = document.createElement('div');
  el.className = 'book-card';
  el.innerHTML = `
    <div class="cover">${coverHTML(b)}</div>
    ${b.favorite ? '<span class="fav-badge">❤</span>' : ''}
    ${b.shelf !== 'want' ? `<span class="shelf-badge">${esc(shelfName(b.shelf))}</span>` : ''}
    ${onDelete ? `<button class="del-btn" title="${tr('حذف من المكتبة', 'Remove from library')}">🗑</button>` : ''}
    <div class="book-meta">
      <div class="book-title">${esc(b.title)}</div>
      <div class="book-author">${authorHTML(b.author)}</div>
      <div class="prog-track"><div class="prog-fill" style="width:${Math.round(b.progress || 0)}%"></div></div>
      <button class="read-link" title="${tr('اقرا الآن', 'Read now')}">📖 ${tr('اقرا', 'Read')}</button>
    </div>`;
  el.querySelector('.read-link').onclick = ev => { ev.stopPropagation(); startReadingBook(b); };
  el.onclick = () => { location.hash = '#/book/' + b.id; };
  if (onDelete) {
    el.querySelector('.del-btn').onclick = ev => {
      ev.stopPropagation();
      if (confirm(tr('تحذف "', 'Remove "') + b.title + tr('" من مكتبتك؟ (التقييم والتعليقات والهايلايتس بتوعه كمان)', '" from your library? Its rating, comments and highlights go too.'))) { store.removeBook(b.id); toast(tr('✓ اتحذف', '✓ Removed')); onDelete(); }
    };
  }
  return el;
}

let libFilter = { q: '', fav: false, sort: 'default' };
function renderLibrary(view) {
  const st = store.getState();
  view.innerHTML = `
    <div class="view-head"><h1>${t('navLibrary')}</h1><span class="muted">${st.books.filter(b => b.shelf !== 'finished').length} ${t('pages') === 'صفحة' ? 'كتاب' : 'books'}</span></div>
    ${st.books.length === 0 ? `<div class="empty-state"><div class="big">📚</div><h2>${t('emptyLib')}</h2><p>${t('emptyLibSub')}</p></div>` : `
    <div class="lib-filter"><input id="libQ" placeholder="${getLang() === 'ar' ? 'دوّر في مكتبتك…' : 'Search your library…'}" value="${esc(libFilter.q)}">
      <button class="chip ${libFilter.fav ? 'active' : ''}" id="favChip">❤ ${getLang() === 'ar' ? 'المفضلة' : 'Favorites'}</button>
      <select id="libSort" title="${getLang() === 'ar' ? 'الترتيب' : 'Sort'}">${sortOptionsHTML(libFilter.sort)}</select></div>`}
    <div id="readingRow"></div>
    <div class="grid" id="libGrid"></div>`;
  const paint = () => {
    const q = libFilter.q.trim().toLowerCase();
    const match = b => (!libFilter.fav || b.favorite) && (!q || (b.title + ' ' + (b.author || '')).toLowerCase().includes(q));
    const reading = sortBooks(st.books.filter(b => b.shelf === 'reading' && match(b)), libFilter.sort);
    const rest = sortBooks(st.books.filter(b => b.shelf !== 'reading' && b.shelf !== 'finished' && match(b)), libFilter.sort);
    const row = $('#readingRow', view); row.innerHTML = '';
    if (reading.length) {
      row.innerHTML = `<h2 style="margin-bottom:.7rem;font-size:1.1rem">▶ ${t('continueReading')}</h2>`;
      const g = document.createElement('div'); g.className = 'grid'; g.style.marginBottom = '1.6rem';
      reading.forEach(b => g.appendChild(bookCard(b, paint))); row.appendChild(g);
    }
    const grid = $('#libGrid', view); grid.innerHTML = '';
    rest.forEach(b => grid.appendChild(bookCard(b, paint)));
  };
  paint();
  const qi = $('#libQ', view); if (qi) qi.oninput = () => { libFilter.q = qi.value; paint(); };
  const fc = $('#favChip', view); if (fc) fc.onclick = () => { libFilter.fav = !libFilter.fav; fc.classList.toggle('active', libFilter.fav); paint(); };
  const ls = $('#libSort', view); if (ls) ls.onchange = () => { libFilter.sort = ls.value; paint(); };
}

/* ---------- shelves ---------- */
function renderShelves(view) {
  const st = store.getState();
  const groups = [['reading', t('shelf_reading')], ['want', t('shelf_want')], ['finished', t('shelf_finished')]];
  view.innerHTML = `<div class="view-head"><h1>${t('navShelves')}</h1></div>
    <div class="search-row" style="max-width:420px"><input id="newShelfName" placeholder="${t('shelfNamePh')}"><button id="newShelfBtn" class="btn">＋ ${t('newShelf')}</button></div>
    <div id="shelfBlocks"></div>`;
  $('#newShelfBtn', view).onclick = () => {
    const v = $('#newShelfName', view).value.trim();
    if (v) { store.addCustomShelf(v); renderShelves(view); }
  };
  const host = $('#shelfBlocks', view);
  let closed = []; try { closed = JSON.parse(localStorage.getItem('qari_shelves_closed') || '[]'); } catch {}
  const renderBlock = (title, books, removable = null) => {
    const block = document.createElement('details'); block.className = 'shelf-block';
    const id = (removable ? 'c:' : 's:') + title;
    block.open = !closed.includes(id);
    block.innerHTML = `<summary><span class="caret">▾</span><h2>${esc(title)} <span class="count">(${books.length})</span></h2> ${removable ? `<button class="btn btn-danger" style="padding:.15rem .6rem;font-size:.75rem">${t('delete')}</button>` : ''}</summary>`;
    block.addEventListener('toggle', () => {
      closed = closed.filter(x => x !== id); if (!block.open) closed.push(id);
      try { localStorage.setItem('qari_shelves_closed', JSON.stringify(closed)); } catch {}
    });
    if (removable) block.querySelector('button').onclick = (e) => { e.preventDefault(); e.stopPropagation(); store.removeCustomShelf(removable); renderShelves(view); };
    const grid = document.createElement('div'); grid.className = 'grid';
    books.forEach(b => grid.appendChild(bookCard(b, () => renderShelves(view))));
    if (!books.length) grid.innerHTML = `<p class="muted">—</p>`;
    block.appendChild(grid); host.appendChild(block);
  };
  groups.forEach(([key, label]) => renderBlock(label, st.books.filter(b => b.shelf === key)));
  st.customShelves.forEach(cs => renderBlock(cs, st.books.filter(b => (b.customShelves || []).includes(cs)), cs));
}

/* ---------- settings ---------- */
function renderSettings(view) {
  const s = store.getState().settings;
  view.innerHTML = `
    <div class="view-head"><h1>${t('settings')}</h1></div>
    <div class="muted" style="font-size:.8rem;margin-bottom:.5rem">Qari v1.5.5</div>
    <div class="stat-card" style="max-width:520px">
      <div class="set-row"><span>${t('language')}</span>
        <div class="seg"><button data-lang="ar" class="${s.lang === 'ar' ? 'active' : ''}">العربية</button><button data-lang="en" class="${s.lang === 'en' ? 'active' : ''}">English</button></div></div>
      <div class="set-row"><span>${t('theme')}</span>
        <div class="seg"><button data-th="light" class="${s.theme === 'light' ? 'active' : ''}">${t('themeLight')}</button><button data-th="sepia" class="${s.theme === 'sepia' ? 'active' : ''}">${t('themeSepia')}</button><button data-th="dark" class="${s.theme === 'dark' ? 'active' : ''}">${t('themeDark')}</button><button data-th="black" class="${s.theme === 'black' ? 'active' : ''}">${t('themeBlack')}</button></div></div>
      <div class="set-row"><span>${t('fontSize')}</span><input type="range" id="fsRange" min="15" max="28" value="${s.fontSize}"><span id="fsVal">${s.fontSize}</span></div>
      <div class="set-row"><span>${t('lineHeight')}</span><input type="range" id="lhRange" min="14" max="26" value="${Math.round(s.lineHeight * 10)}"><span id="lhVal">${s.lineHeight}</span></div>
      <div style="margin-bottom:.9rem"><div style="margin-bottom:.4rem;font-size:.9rem">${t('fontFamily')}</div><div id="fontHost"></div></div>
      <div class="set-row"><span>${t('readingMode')}</span>
        <div class="seg"><button data-flow="paginated" class="${s.flow === 'paginated' ? 'active' : ''}">${t('paginated')}</button><button data-flow="scrolled" class="${s.flow === 'scrolled' ? 'active' : ''}">${t('scrolled')}</button></div></div>
      <hr style="border:none;border-top:1px solid var(--border);margin:1rem 0">
      <div class="set-row" style="flex-wrap:wrap"><span>Google Books API key <span class="muted">(${getLang() === 'ar' ? 'اختياري، لو تقييمات جوجل مش ظاهرة' : 'optional, if Google ratings do not show'})</span></span><input id="gbKey" style="flex:1;min-width:200px" value="${esc(s.gbKey || '')}" placeholder="AIza…"></div>
      <hr style="border:none;border-top:1px solid var(--border);margin:1rem 0">
      <div id="findSitesBox" class="stat-card"></div>
      <div id="dbBox" class="stat-card" style="margin-top:1rem"></div>
      <div id="syncBox" class="stat-card" style="margin-top:1rem"></div>
      <hr style="border:none;border-top:1px solid var(--border);margin:1rem 0">
      <div class="set-row"><span>${t('exportData')}</span><button id="exportBtn" class="btn">⬇ JSON</button></div>
      <div class="set-row"><span>${t('importData')}</span><button id="importBtn" class="btn">⬆ JSON</button></div>
      <p class="muted">${t('importNote')}</p>
      <input type="file" id="importFile" accept=".json" hidden>
    </div>`;
  const upd = (patch) => { Object.assign(store.getState().settings, patch); store.save(); applySettings(); };
  $$('.seg [data-lang]', view).forEach(b => b.onclick = () => { upd({ lang: b.dataset.lang }); route(); });
  $$('.seg [data-th]', view).forEach(b => b.onclick = () => { upd({ theme: b.dataset.th }); renderSettings(view); });
  $$('.seg [data-flow]', view).forEach(b => b.onclick = () => { upd({ flow: b.dataset.flow }); renderSettings(view); });
  $('#fsRange', view).oninput = e => { $('#fsVal', view).textContent = e.target.value; upd({ fontSize: +e.target.value }); };
  $('#lhRange', view).oninput = e => { const v = (+e.target.value / 10).toFixed(1); $('#lhVal', view).textContent = v; upd({ lineHeight: +v }); };
  $('#fontHost', view).appendChild(fontPicker(s.fontFamily, id => upd({ fontFamily: id })));
  { const fh = $('#findSitesBox', view); const rf = () => renderFindSitesSettings(fh, rf); rf(); }
  $('#gbKey', view).oninput = e => upd({ gbKey: e.target.value.trim() });
  drawDbBox(view);
  drawSyncBox(view);
  $('#exportBtn', view).onclick = () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'qari-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    toast(t('exported'));
  };
  $('#importBtn', view).onclick = () => $('#importFile', view).click();
  $('#importFile', view).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { store.importJSON(await f.text()); toast(t('imported')); route(); }
    catch (err) { toast('⚠ ' + err.message, 3500); }
  };
}

/* ---------- database file ---------- */
const dbText = () => {
  const ar = getLang() === 'ar', i = dbfile.info();
  const when = i.lastSaved ? i.lastSaved.toLocaleTimeString() : '';
  return ({
    none: ar ? '⚪ مفيش ملف قاعدة بيانات مربوط' : '⚪ No database file linked',
    ready: (ar ? '🟢 محفوظ تلقائيًا في ' : '🟢 Auto-saved to ') + i.name + (when ? ' · ' + when : ''),
    saving: ar ? '🟡 بيتحفظ…' : '🟡 Saving…',
    'needs-permission': (ar ? '🟠 محتاج تأكيد الصلاحية للملف ' : '🟠 Permission needed for ') + i.name,
    error: '🔴 ' + i.lastError,
    unsupported: ar ? '⚪ المتصفح ده مبيدعمش الحفظ التلقائي في ملف، استخدم نسخة احتياطية يدوية' : '⚪ This browser cannot auto-save to a file; use manual backup',
  })[i.status];
};
function updateDbChip() {
  const c = $('#dbChip'); if (!c) return; const i = dbfile.info();
  c.textContent = ({ none: '💾', ready: '💾✓', saving: '💾…', 'needs-permission': '💾⚠', error: '💾✕', unsupported: '💾' })[i.status];
  c.title = dbText();
  c.dataset.s = i.status;
}
function drawDbBox(view) {
  const box = $('#dbBox', view); if (!box) return;
  const ar = getLang() === 'ar', i = dbfile.info();
  const st = store.getState();
  box.innerHTML = `<h3 style="margin-bottom:.5rem">💾 ${ar ? 'ملف قاعدة البيانات' : 'Database file'}</h3>
    <p class="muted" style="margin-bottom:.6rem">${ar ? 'ملف واحد (.qari) على جهازك فيه كل حاجة: المكتبة، ملفات الكتب، القوائم، المفضلة، التعليقات، الهايلايتس، التقدم، الإحصائيات والإعدادات. بيتحدث تلقائيًا بعد أي تغيير.' : 'One file (.qari) on your device holding everything: library, book files, lists, favorites, comments, highlights, progress, stats and settings. Updated automatically after every change.'}</p>
    <div id="dbStatus" style="margin-bottom:.6rem;font-weight:600">${dbText()}</div>
    <div class="muted" style="margin-bottom:.6rem">${st.books.length} ${ar ? 'كتاب' : 'books'} · ${st.lists.length} ${ar ? 'قوائم' : 'lists'} · ${st.comments.length} ${ar ? 'تعليقات' : 'comments'} · ${st.highlights.length} ${ar ? 'هايلايت' : 'highlights'}</div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap">
      ${i.supported ? `<button id="dbCreate" class="btn btn-primary">＋ ${ar ? 'إنشاء ملف قاعدة بيانات' : 'Create database file'}</button><button id="dbOpen" class="btn">📂 ${ar ? 'فتح ملف موجود (استرجاع)' : 'Open existing file (restore)'}</button>` : ''}
      ${i.status === 'needs-permission' ? `<button id="dbGrant" class="btn btn-primary">${ar ? 'تفعيل الحفظ' : 'Re-enable saving'}</button>` : ''}
      ${i.name ? `<button id="dbSave" class="btn">${ar ? 'حفظ الآن' : 'Save now'}</button><button id="dbOff" class="btn btn-danger">${ar ? 'فصل الملف' : 'Unlink'}</button>` : ''}
      <button id="dbDl" class="btn">⬇ ${ar ? 'نسخة احتياطية (.qari)' : 'Backup (.qari)'}</button>
      <button id="dbUp" class="btn">⬆ ${ar ? 'استرجاع من ملف' : 'Restore from file'}</button>
      <input type="file" id="dbUpIn" accept=".qari,.zip" hidden>
    </div>`;
  const redraw = () => drawDbBox(view);
  const guard = fn => async (...a) => { try { await fn(...a); } catch (e) { if (e && e.name !== 'AbortError') toast('⚠ ' + (e.message || e), 3500); } redraw(); };
  const confirmRestore = () => confirm(ar ? 'الاسترجاع هيستبدل البيانات الحالية في المتصفح ببيانات الملف. متأكد؟' : 'Restoring replaces the data currently in this browser with the file contents. Continue?');
  const b = id => $(id, box);
  if (b('#dbCreate')) b('#dbCreate').onclick = guard(() => dbfile.createFile());
  if (b('#dbOpen')) b('#dbOpen').onclick = guard(async () => { if (st.books.length && !confirmRestore()) return; const r = await dbfile.openFile(); applySettings(); toast(`✓ ${r.books} ${ar ? 'كتاب اتسترجعوا' : 'books restored'}`); route(); });
  if (b('#dbGrant')) b('#dbGrant').onclick = guard(() => dbfile.grant());
  if (b('#dbSave')) b('#dbSave').onclick = guard(async () => { await dbfile.saveNow(); toast('✓'); });
  if (b('#dbOff')) b('#dbOff').onclick = guard(() => dbfile.disconnect());
  b('#dbDl').onclick = guard(() => dbfile.downloadBackup());
  b('#dbUp').onclick = () => b('#dbUpIn').click();
  b('#dbUpIn').onchange = guard(async e => { const f = e.target.files[0]; if (!f) return; if (st.books.length && !confirmRestore()) return; const r = await dbfile.restoreFrom(f); applySettings(); toast(`✓ ${r.books} ${ar ? 'كتاب اتسترجعوا' : 'books restored'}`); route(); });
}


/* ---------- GitHub sync ---------- */
const syncText = () => {
  const ar = getLang() === 'ar', i = sync.info();
  const when = i.lastSync ? new Date(i.lastSync).toLocaleString() : '';
  if (!i.connected) return ar ? '⚪ المزامنة مش متوصلة' : '⚪ Sync is not connected';
  if (i.status === 'syncing') return ar ? '🟡 بيزامن…' : '🟡 Syncing…';
  if (i.status === 'error') return '🔴 ' + i.error;
  return (ar ? '🟢 متزامن مع ' : '🟢 Synced with ') + i.owner + '/' + i.repo + (when ? ' · ' + when : '');
};
function updateSyncUi() {
  const c = $('#syncChip'); const i = sync.info();
  if (c) { c.style.display = i.connected ? '' : 'none'; c.textContent = ({ idle: '☁✓', syncing: '☁…', error: '☁✕', off: '☁' })[i.status] || '☁'; c.title = syncText(); c.dataset.s = i.status; }
  const sb = $('#syncStatus'); if (sb) sb.textContent = syncText();
  const sn = $('#syncNote'); if (sn) sn.textContent = i.note || '';
  let bn = $('#syncBanner');
  if (i.conflictNote) {
    if (!bn) { bn = document.createElement('div'); bn.id = 'syncBanner'; bn.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b45309;color:#fff;padding:.6rem .8rem;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;font-size:.9rem'; document.body.appendChild(bn); }
    const ar = getLang() === 'ar';
    bn.innerHTML = `<span style="flex:1;min-width:200px"></span>${i.hasConflictBackup ? `<button class="btn" id="syncBakBtn">${ar ? 'نزّل نسخة الجهاز' : 'Download this device copy'}</button>` : ''}<button class="btn" id="syncOkBtn">${ar ? 'تمام' : 'OK'}</button>`;
    bn.firstChild.textContent = i.conflictNote;
    const bk = bn.querySelector('#syncBakBtn'); if (bk) bk.onclick = () => sync.downloadConflictBackup();
    bn.querySelector('#syncOkBtn').onclick = () => sync.dismissConflict();
  } else if (bn) bn.remove();
}
function drawSyncBox(view) {
  const box = $('#syncBox', view); if (!box) return;
  const ar = getLang() === 'ar', i = sync.info(), d = sync.savedDefaults();
  box.innerHTML = `<h3 style="margin-bottom:.5rem">☁ ${ar ? 'مزامنة بين الأجهزة (GitHub)' : 'Sync across devices (GitHub)'}</h3>
    <p class="muted" style="margin-bottom:.6rem">${ar ? 'المزامنة اختيارية. لما تشغّلها بيترفع للريبو الخاص (Private) اللي انت اخترته على GitHub: المكتبة والتقدم والتعليقات والهايلايتس والملاحظات والقوائم والإعدادات وملفات الكتب والصور اللي ضفتها، وبيحدّثها تلقائيًا. مسح حاجة في قارئ مش بيمسح النسخ القديمة اللي اترفعت قبل كده: هتفضل في تاريخ الريبو (commits) لحد ما تمسحها انت من GitHub. لو اتعدّل من جهازين في نفس الوقت النسخة الأحدث بتكسب وبتظهرلك رسالة. التوكن بيتخزن على الجهاز ده بس.' : 'Sync is optional. When you turn it on, it uploads to the private GitHub repo you chose: library, progress, comments, highlights, notes, lists, settings, book files and images you added, and keeps them updated. Deleting something in Qari does not erase copies uploaded earlier: they stay in the repo history (commits) until you delete them on GitHub. If two devices edit at once the newer version wins and you get a warning. The token is stored on this device only.'}</p>
    <div id="syncStatus" style="margin-bottom:.4rem;font-weight:600">${esc(syncText())}</div>
    <div id="syncNote" class="muted" style="margin-bottom:.6rem"></div>
    ${i.connected ? `<div style="display:flex;gap:.5rem;flex-wrap:wrap"><button id="syncNow" class="btn btn-primary">${ar ? 'زامن الآن' : 'Sync now'}</button><button id="syncOff" class="btn btn-danger">${ar ? 'فصل المزامنة' : 'Disconnect'}</button></div>`
    : `<div style="display:grid;gap:.5rem;max-width:420px">
        <input id="syncOwner" placeholder="GitHub username" value="${esc(d.owner || 'asratereg-glitch')}" autocomplete="off">
        <input id="syncRepo" placeholder="repo" value="${esc(d.repo || 'qari-data')}" autocomplete="off">
        <input id="syncToken" type="password" placeholder="${ar ? 'التوكن (github_pat_…)' : 'Token (github_pat_…)'}" autocomplete="off">
        <button id="syncGo" class="btn btn-primary">${ar ? 'توصيل وبدء المزامنة' : 'Connect and start syncing'}</button></div>`}`;
  const guard = fn => async () => { try { await fn(); } catch (e) { toast('⚠ ' + (e.message || e), 5000); } drawSyncBox(view); updateSyncUi(); };
  const go = $('#syncGo', box); if (go) go.onclick = guard(async () => { go.disabled = true; await sync.connect($('#syncOwner', box).value, $('#syncRepo', box).value, $('#syncToken', box).value); const e = sync.info(); toast(e.status === 'error' ? '⚠ ' + e.error : '✓', 3000); });
  const sn = $('#syncNow', box); if (sn) sn.onclick = guard(async () => { await sync.syncNow('manual'); const e = sync.info(); toast(e.status === 'error' ? '⚠ ' + e.error : '✓', 3000); });
  const so = $('#syncOff', box); if (so) so.onclick = guard(async () => { if (confirm(ar ? 'فصل المزامنة؟ بياناتك على الجهاز والريبو هتفضل زي ما هي.' : 'Disconnect sync? Data on this device and in the repo stays as is.')) sync.disconnect(); });
  updateSyncUi();
}

/* ---------- stats / discover / community routes ---------- */
function renderStatsRoute(view) { renderStats(view); }
function renderDiscoverRoute(view) { renderDiscover(view); bindDiscover(view); }
function renderCommunityRoute(view) { renderCommunity(view); bindCommunity(view); }

/* ---------- add-book modal ---------- */
function openAddModal() {
  const m = $('#addModal'); m.classList.remove('hidden');
  $$('.modal-tabs .tab', m).forEach(tabBtn => tabBtn.onclick = () => {
    $$('.modal-tabs .tab', m).forEach(x => x.classList.toggle('active', x === tabBtn));
    $('#pane-file', m).classList.toggle('hidden', tabBtn.dataset.tab !== 'file');
    $('#pane-online', m).classList.toggle('hidden', tabBtn.dataset.tab !== 'online');
  });
}
function closeAddModal() { $('#addModal').classList.add('hidden'); }

async function handleFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!['epub', 'pdf', 'txt'].includes(ext)) { toast('⚠ EPUB / PDF / TXT'); return; }
  const fileKey = 'file-' + store.uid();
  await db.putFile(fileKey, file);
  let meta = { title: file.name.replace(/\.(epub|pdf|txt)$/i, ''), author: '', cover: '', subjects: [] };
  if (ext === 'epub') {
    try {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const containerXml = await zip.file('META-INF/container.xml').async('text');
      const m = /full-path="([^"]+)"/.exec(containerXml);
      const opfPath = m ? m[1] : 'OEBPS/content.opf';
      const opf = await zip.file(opfPath).async('text');
      const doc = new DOMParser().parseFromString(opf, 'application/xml');
      const getMeta = tag => {
        const el = doc.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', tag)[0] || doc.getElementsByTagName('dc:' + tag)[0];
        return el ? el.textContent.trim() : '';
      };
      if (getMeta('title')) meta.title = getMeta('title');
      if (getMeta('creator')) meta.author = getMeta('creator');
      const items = [...doc.getElementsByTagName('item')];
      let coverHref = '';
      const metaCover = [...doc.getElementsByTagName('meta')].find(x => x.getAttribute('name') === 'cover');
      if (metaCover) { const it = items.find(x => x.getAttribute('id') === metaCover.getAttribute('content')); if (it) coverHref = it.getAttribute('href'); }
      if (!coverHref) { const it = items.find(x => (x.getAttribute('properties') || '').includes('cover-image')); if (it) coverHref = it.getAttribute('href'); }
      if (coverHref) {
        const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
        const cf = zip.file(base + coverHref) || zip.file(coverHref);
        if (cf) {
          const blob = await cf.async('blob');
          meta.cover = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(''); fr.readAsDataURL(blob); });
        }
      }
    } catch (e) { console.warn('epub meta read failed', e); }
  }
  const b = store.addBook({ ...meta, format: ext, fileKey, source: 'local', shelf: 'want' });
  toast(t('added')); closeAddModal(); location.hash = '#/book/' + b.id;
}

async function runOnlineSearch() {
  const q = $('#onlineQuery').value.trim(); if (!q) return;
  const host = $('#onlineResults'); host.innerHTML = `<p class="muted">${t('loading')}</p>`;
  try {
    const items = await searchOpenLibrary(q);
    host.innerHTML = items.length ? '' : `<p class="muted">${t('noResults')}</p>`;
    items.forEach(it => {
      const row = document.createElement('div'); row.className = 'result-row';
      row.style.cursor = 'pointer';
      row.innerHTML = `${it.cover ? `<img src="${esc(it.cover)}" alt="">` : `<div style="width:42px;height:62px;background:var(--border);border-radius:4px;display:flex;align-items:center;justify-content:center">📕</div>`}
        <div class="r-info"><div class="r-title">${esc(it.title)}</div><div class="r-author">${esc(it.author)} ${it.year ? '· ' + it.year : ''}</div></div>
        <button class="btn btn-primary" style="padding:.3rem .8rem;font-size:.8rem">${t('addToLibrary')}</button>`;
      row.onclick = () => { if (it.olKey) { closeAddModal(); location.hash = '#/work/' + it.olKey; } };
      row.querySelector('button').onclick = (ev) => {
        ev.stopPropagation();
        const b = store.addBook({ title: it.title, author: it.author, format: 'web', cover: it.cover || '', source: 'openlibrary', subjects: it.subjects || [], isbn: it.isbn || '', olKey: it.olKey || '', year: it.year || '', shelf: 'want' });
        row.querySelector('button').textContent = t('added'); row.querySelector('button').disabled = true;
        setTimeout(() => { closeAddModal(); location.hash = '#/book/' + b.id; }, 500);
      };
      host.appendChild(row);
    });
  } catch (e) { host.innerHTML = `<p class="muted">⚠ ${esc(e.message)}</p>`; }
}

/* ---------- boot ---------- */
function setDevice() {
  // clientWidth stays the real layout width even if Chrome on Android expands the visual viewport on overflow
  const w = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth), h = window.innerHeight;
  const d = w < 700 ? 'phone' : w < 1100 ? 'tablet' : 'desktop';
  const de = document.documentElement;
  de.dataset.device = d; de.dataset.orient = w >= h ? 'landscape' : 'portrait';
  document.body && (document.body.dataset.device = d);
}
setDevice(); window.addEventListener('resize', setDevice); window.addEventListener('orientationchange', setDevice);
async function boot() {
  store.load();
  applySettings();
  const chip = document.createElement('button'); chip.id = 'dbChip'; chip.className = 'icon-btn'; $('#topbar').appendChild(chip);
  chip.onclick = async () => { const i = dbfile.info(); if (i.status === 'needs-permission') { try { await dbfile.grant(); } catch {} } else location.hash = '#/settings'; };
  dbfile.onStatus(() => { updateDbChip(); const sb = $('#dbStatus'); if (sb) sb.textContent = dbText(); });
  await dbfile.init(); updateDbChip();
  const sc = document.createElement('button'); sc.id = 'syncChip'; sc.className = 'icon-btn'; sc.style.display = 'none'; sc.onclick = () => { location.hash = '#/settings'; }; $('#topbar').appendChild(sc);
  sync.configure({ lang: getLang, onApplied: () => { applySettings(); route(); } });
  sync.onStatus(updateSyncUi);
  sync.init(); updateSyncUi();
  $('#addBookBtn').onclick = openAddModal;
  $$('#addModal .modal-close').forEach(b => b.onclick = closeAddModal);
  $('#addModal').addEventListener('click', e => { if (e.target.id === 'addModal') closeAddModal(); });
  $('#dropzone').onclick = () => $('#fileInput').click();
  $('#fileInput').onchange = e => { const f = e.target.files[0]; if (f) handleFile(f); e.target.value = ''; };
  $('#dropzone').addEventListener('dragover', e => e.preventDefault());
  $('#dropzone').addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); });
  $('#onlineSearchBtn').onclick = runOnlineSearch;
  $('#onlineQuery').addEventListener('keydown', e => { if (e.key === 'Enter') runOnlineSearch(); });
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const hadSW = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => { r.update().catch(() => {}); setInterval(() => { if (document.visibilityState === 'visible') r.update().catch(() => {}); }, 1800000); }).catch(() => {});
  }
  setTimeout(() => { const sp = $('#splash'); sp.style.opacity = '0'; setTimeout(() => sp.remove(), 450); }, 500);
}
boot();
