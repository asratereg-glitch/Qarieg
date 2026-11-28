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
import * as pub from './public.js';
import * as auth from './auth.js';
import * as cloudsync from './cloudsync.js';
import { renderAccount, refreshAccountView } from './account.js';

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
/* Start reading: open the linked file, or ask for the file first.
   Public saved books without a local file yet download it from the public
   repo first (lazy download; after that they read offline like any book). */
export async function startReadingBook(book) {
  if (book.fileKey && book.format !== 'web') return openReader(book);
  if (book.source === 'public' && book.public_file_path) {
    try {
      const r = await fetch(pub.publicFileUrl(book.public_file_path), { cache: 'no-store' });
      if (!r.ok) throw new Error('download failed');
      const blob = await r.blob();
      const fileKey = 'file-' + store.uid();
      await db.putFile(fileKey, blob);
      const b = store.updateBook(book.id, { fileKey });
      if (b) return openReader(b);
    } catch (e) { console.warn('public file download failed', e); }
  }
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
function shelfName(s) { return ({ want: t('shelf_want'), reading: t('shelf_reading'), finished: t('shelf_finished'), translations: t('shelf_translations') })[s] || s; }
export function fmtDate(iso) { try { return new Date(iso).toLocaleDateString(getLang() === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return ''; } }

/* ---------- theme & language ---------- */
function applySettings() {
  const s = store.getState().settings;
  document.body.dataset.theme = s.theme;
  document.documentElement.lang = s.lang;
  document.documentElement.dir = s.lang === 'ar' ? 'rtl' : 'ltr';
  setLang(s.lang);
  applyI18n();
  updateAccountNav(); // applyI18n resets the account nav link to "الحساب"; re-apply the login/logout label
  $('#addBookBtn').firstChild.textContent = '＋ '; // keep icon before label
}
store.onChange(() => { /* live updates handled per-view */ });

/* ---------- router ---------- */
const routes = {
  '': renderLibrary, 'shelves': renderShelves, 'stats': renderStatsRoute,
  'discover': renderDiscoverRoute, 'community': renderCommunityRoute, 'settings': renderSettings,
  'author': (v, a) => renderAuthorPage(v, a), 'book': (v, a) => renderBookPage(v, a, 'book'), 'work': (v, a) => renderBookPage(v, a, 'work'), 'pub': (v, a) => renderBookPage(v, a, 'pub'), 'lists': renderLists,
  'account': renderAccount,
};
function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name, arg] = hash.split('/');
  // Settings page is admin-only: non-admins (and logged-out users) go to the library
  if (name === 'settings' && !auth.isAdmin()) { location.hash = '#/'; return; }
  // مكتبتى / القوائم / إحصائياتي are login-only: logged-out users go to the login page
  if ((name === 'shelves' || name === 'lists' || name === 'stats') && !auth.isLoggedIn()) { location.hash = '#/account'; return; }
  const fn = routes[name] || renderLibrary;
  $$('#mainnav a').forEach(a => a.classList.toggle('active', a.dataset.route === (name || 'library')));
  const view = $('#view'); view.innerHTML = ''; window.scrollTo(0, 0);
  fn(view, arg);
}
window.addEventListener('hashchange', route);

/* Settings page is admin-only: hide its nav link and the topbar chips that lead to it for non-admins. */
function updateSettingsVisibility() {
  const admin = auth.isAdmin();
  const link = document.querySelector('#mainnav a[data-route="settings"]');
  if (link) link.style.display = admin ? '' : 'none';
  const db = $('#dbChip'); if (db) db.style.display = admin ? '' : 'none';
  const sc = $('#syncChip');
  if (sc) { if (admin) updateSyncUi(); else sc.style.display = 'none'; }
  const ab = $('#addBookBtn'); if (ab) ab.style.display = admin ? '' : 'none';
}


/* Account nav link doubles as Login/Logout: logged out it reads "تسجيل الدخول" (Sign in),
   logged in it reads "خروج" (Sign out). Labels are literals: the i18n login/logout keys
   ("تسجيل دخول" / "تسجيل الخروج") are not the exact words requested. */
function updateAccountNav() {
  const link = document.querySelector('#mainnav a[data-route="account"]');
  if (!link) return;
  link.textContent = auth.isLoggedIn()
    ? (getLang() === 'ar' ? 'خروج' : 'Sign out')
    : (getLang() === 'ar' ? 'تسجيل الدخول' : 'Sign in');
  updatePrivateNavVisibility();
}

/* مكتبتى / القوائم / إحصائياتي show only after login: hide their nav links for
   logged-out visitors (the router also redirects direct links to #/account). */
function updatePrivateNavVisibility() {
  const loggedIn = auth.isLoggedIn();
  ['shelves', 'lists', 'stats'].forEach(r => {
    const link = document.querySelector(`#mainnav a[data-route="${r}"]`);
    if (link) link.style.display = loggedIn ? '' : 'none';
  });
}


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

/* ---------- public library (الرئيسية) ---------- */
/* A public book card: no per-user progress, no delete — a save button
   instead. Clicking the card opens the public book page (#/pub/<id>). */
function pubCard(pb, savedId) {
  const el = document.createElement('div');
  el.className = 'book-card';
  el.innerHTML = `
    <div class="cover">${coverHTML(pb)}</div>
    <div class="book-meta">
      <div class="book-title">${esc(pb.title)}</div>
      <div class="book-author">${authorHTML(pb.author)}</div>
      <button class="read-link pub-save-btn">${savedId ? '✓ ' + t('inMyLibrary') : '＋ ' + t('addToMyLibrary')}</button>
    </div>`;
  el.querySelector('.pub-save-btn').onclick = ev => {
    ev.stopPropagation();
    pub.saveToMyLibrary(pb);
    ev.currentTarget.textContent = '✓ ' + t('inMyLibrary');
    toast(t('added'));
  };
  el.onclick = () => { location.hash = '#/pub/' + pb.id; };
  return el;
}

let pubFilter = { q: '', cat: '', sort: 'default' };
async function renderLibrary(view) {
  view.innerHTML = `
    <div class="view-head"><h1>${t('navLibrary')}</h1><span class="muted" id="pubCount"></span></div>
    <div class="chip-row" id="pubCats" style="margin-bottom:.7rem"></div>
    <div class="lib-filter"><input id="pubQ" placeholder="${getLang() === 'ar' ? 'دوّر في المكتبة العامة…' : 'Search the public library…'}" value="${esc(pubFilter.q)}">
      <select id="pubSort" title="${getLang() === 'ar' ? 'الترتيب' : 'Sort'}">${sortOptionsHTML(pubFilter.sort)}</select></div>
    <div class="grid" id="pubGrid"></div>
    <p class="muted" id="pubMsg"></p>`;
  let catalog = null;
  const paintCats = () => {
    const host = $('#pubCats', view); if (!host) return;
    host.innerHTML = '';
    const cats = (catalog && catalog.categories) || [];
    const all = document.createElement('button');
    all.className = 'chip' + (pubFilter.cat === '' ? ' active' : '');
    all.textContent = t('allCategories');
    all.onclick = () => { pubFilter.cat = ''; paint(); };
    host.appendChild(all);
    cats.forEach(c => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (pubFilter.cat === c.id ? ' active' : '');
      chip.textContent = c.name;
      chip.onclick = () => { pubFilter.cat = c.id; paint(); };
      host.appendChild(chip);
    });
    if (auth.isAdmin()) {
      const add = document.createElement('button');
      add.className = 'chip'; add.textContent = '＋ ' + t('addCategory');
      add.onclick = async () => {
        const name = prompt(t('categoryNamePh'));
        if (!name || !name.trim()) return;
        try { await pub.addCategory(name.trim()); toast(t('added')); renderLibrary(view); }
        catch (e) { toast('⚠ ' + (e.message || e), 4000); }
      };
      host.appendChild(add);
    }
  };
  const paint = () => {
    if (!catalog) return;
    const q = pubFilter.q.trim().toLowerCase();
    const match = b => (!pubFilter.cat || b.category_id === pubFilter.cat) && (!q || ((b.title || '') + ' ' + (b.author || '')).toLowerCase().includes(q));
    const list = sortBooks(catalog.books.filter(match), pubFilter.sort);
    const grid = $('#pubGrid', view); if (!grid) return;
    grid.innerHTML = '';
    if (!catalog.books.length) {
      grid.innerHTML = `<div class="empty-state"><div class="big">📚</div><h2>${esc(t('emptyPublic'))}</h2><p>${esc(t('emptyPublicSub'))}</p></div>`;
    } else {
      const savedIds = new Map(store.getState().books.filter(b => b.public_book_id).map(b => [b.public_book_id, b.id]));
      list.forEach(pb => grid.appendChild(pubCard(pb, savedIds.get(pb.id))));
    }
    const cnt = $('#pubCount', view); if (cnt) cnt.textContent = catalog.books.length + ' ' + (getLang() === 'ar' ? 'كتاب' : 'books');
    const msg = $('#pubMsg', view); if (msg) msg.textContent = catalog.books.length && !list.length ? t('noResults') : '';
    paintCats();
  };
  try {
    catalog = await pub.getCatalog();
  } catch (e) {
    const msg = $('#pubMsg', view); if (msg) msg.textContent = '⚠ ' + (e.message || e);
    return;
  }
  paint();
  const qi = $('#pubQ', view); if (qi) qi.oninput = () => { pubFilter.q = qi.value; paint(); };
  const ls = $('#pubSort', view); if (ls) ls.onchange = () => { pubFilter.sort = ls.value; paint(); };
}

/* ---------- shelves ---------- */
function renderShelves(view) {
  const st = store.getState();
  const groups = [['translations', t('shelf_translations')], ['reading', t('shelf_reading')], ['want', t('shelf_want')], ['finished', t('shelf_finished')]];
  view.innerHTML = `<div class="view-head"><h1>${t('navShelves')}</h1></div>
    <div class="search-row" id="newShelfRow" style="max-width:420px"><input id="newShelfName" placeholder="${t('shelfNamePh')}"><button id="newShelfBtn" class="btn">＋ ${t('newShelf')}</button></div>
    <div id="shelfBlocks"></div>`;
  if (!auth.isAdmin()) { const nr = $('#newShelfRow', view); if (nr) nr.style.display = 'none'; }
  $('#newShelfBtn', view).onclick = () => {
    if (!auth.isAdmin()) return;
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
    <div class="muted" style="font-size:.8rem;margin-bottom:.5rem">Qari v1.5.6</div>
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
  if (c) { c.style.display = (i.connected && auth.isAdmin()) ? '' : 'none'; c.textContent = ({ idle: '☁✓', syncing: '☁…', error: '☁✕', off: '☁' })[i.status] || '☁'; c.title = syncText(); c.dataset.s = i.status; }
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

/* ---------- add-book modal (admin-only: publishes to the public library) ---------- */
function openAddModal() {
  if (!auth.isAdmin()) return; // adding books is admin-only
  const m = $('#addModal'); m.classList.remove('hidden');
  // Category picker for the public book: injected once, applies to both tabs.
  let row = $('#pubCatRow', m);
  if (!row) {
    row = document.createElement('div');
    row.id = 'pubCatRow'; row.className = 'search-row'; row.style.marginBottom = '.6rem';
    row.innerHTML = `<label class="muted" style="align-self:center">${t('categories')}:</label><select id="pubCatSel" style="flex:1"></select>`;
    m.querySelector('.modal-tabs').after(row);
  }
  const sel = $('#pubCatSel', m);
  pub.listCategories().then(cats => {
    sel.innerHTML = `<option value="">—</option>` + cats.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    const tr = cats.find(c => c.name === 'ترجمات');
    sel.value = tr ? tr.id : (cats[0] ? cats[0].id : '');
  }).catch(() => {});
  $$('.modal-tabs .tab', m).forEach(tabBtn => tabBtn.onclick = () => {
    $$('.modal-tabs .tab', m).forEach(x => x.classList.toggle('active', x === tabBtn));
    $('#pane-file', m).classList.toggle('hidden', tabBtn.dataset.tab !== 'file');
    $('#pane-online', m).classList.toggle('hidden', tabBtn.dataset.tab !== 'online');
  });
}
function closeAddModal() { $('#addModal').classList.add('hidden'); if (pendingPublish) hideCoverStep(); }

/* ---------- cover step (admin reviews / changes the cover before publishing) ---------- */
let pendingPublish = null;
function paintCoverPreview() {
  const host = $('#coverPreview'); if (!host) return;
  const c = pendingPublish ? pendingPublish.cover : '';
  host.innerHTML = c
    ? `<img src="${esc(c)}" alt="" style="width:100%;border-radius:10px;border:1px solid var(--border);display:block">`
    : `<div style="width:100%;height:190px;border:1px dashed var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:2.5rem">📕</div>`;
}
function showCoverStep(pending) {
  pendingPublish = { ...pending, cover: pending.meta.cover || '' };
  const m = $('#addModal');
  $('#coverBookTitle', m).textContent = pending.meta.title || '?';
  $('#coverBookAuthor', m).textContent = pending.meta.author || '';
  m.querySelector('.modal-head h2').textContent = t('coverStep');
  m.querySelector('.modal-tabs').style.display = 'none';
  $('#pane-file', m).classList.add('hidden');
  $('#pane-online', m).classList.add('hidden');
  $('#pane-cover', m).classList.remove('hidden');
  paintCoverPreview();
}
function hideCoverStep() {
  const m = $('#addModal');
  $('#pane-cover', m).classList.add('hidden');
  m.querySelector('.modal-tabs').style.display = '';
  m.querySelector('.modal-head h2').textContent = t('addBook');
  const origin = pendingPublish ? pendingPublish.origin : 'file';
  $$('.modal-tabs .tab', m).forEach(x => x.classList.toggle('active', x.dataset.tab === origin));
  $('#pane-file', m).classList.toggle('hidden', origin !== 'file');
  $('#pane-online', m).classList.toggle('hidden', origin !== 'online');
  pendingPublish = null;
}
/* Downscale an uploaded cover image to max 600px on the long side (keeps
   public-books.json small); returns a JPEG data URL. */
function downscaleCover(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 600 / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      res(cv.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    img.src = url;
  });
}

async function handleFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!['epub', 'pdf', 'txt'].includes(ext)) { toast('⚠ EPUB / PDF / TXT'); return; }
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
  // Cover step: the admin reviews / changes the cover before publishing.
  const categoryId = ($('#pubCatSel') || {}).value || '';
  showCoverStep({ file, meta, format: ext, categoryId: categoryId || null, origin: 'file' });
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
        const categoryId = ($('#pubCatSel') || {}).value || '';
        // Cover step first: the admin reviews / changes the cover, then publishes.
        showCoverStep({ file: null, meta: { title: it.title, author: it.author, cover: it.cover || '', subjects: it.subjects || [], isbn: it.isbn || '', olKey: it.olKey || '', year: it.year || '' }, format: 'web', categoryId: categoryId || null, origin: 'online' });
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
  // Supabase Auth + cloud sync (optional: the app stays fully local when logged out)
  await auth.initAuth();
  updateSettingsVisibility();
  updateAccountNav();
  // Account nav link is the logout button when logged in; logged out it navigates to #/account normally
  const accLink = document.querySelector('#mainnav a[data-route="account"]');
  if (accLink) accLink.addEventListener('click', async (e) => {
    if (!auth.isLoggedIn()) return;
    e.preventDefault();
    await auth.signOut();
    toast(getLang() === 'ar' ? '✓ تم تسجيل الخروج' : '✓ Signed out');
    location.hash = '#/';
  });
  cloudsync.configure({ lang: getLang, onApplied: () => { applySettings(); route(); } });
  cloudsync.init();
  auth.onAuthChange(() => { cloudsync.onAuthChange(); refreshAccountView(); updateSettingsVisibility(); updateAccountNav(); const cur = location.hash.replace(/^#\/?/, '').split('/')[0]; if ((!auth.isLoggedIn() && ['shelves', 'lists', 'stats'].includes(cur)) || (!auth.isAdmin() && cur === 'settings')) route(); });
  $('#addBookBtn').onclick = openAddModal;
  $$('#addModal .modal-close').forEach(b => b.onclick = closeAddModal);
  // Cover step buttons (inside the add-book modal)
  $('#coverChangeBtn').onclick = () => $('#coverInput').click();
  $('#coverInput').onchange = async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f || !pendingPublish) return;
    try { pendingPublish.cover = await downscaleCover(f); paintCoverPreview(); }
    catch { toast('⚠ ' + t('coverUrlInvalid'), 3500); }
  };
  $('#coverUrlBtn').onclick = () => {
    if (!pendingPublish) return;
    const cur = pendingPublish.cover && pendingPublish.cover.startsWith('http') ? pendingPublish.cover : '';
    const url = prompt(t('coverUrlPh'), cur);
    if (url == null) return;
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) { toast('⚠ ' + t('coverUrlInvalid'), 3500); return; }
    pendingPublish.cover = u; paintCoverPreview();
  };
  $('#coverRemoveBtn').onclick = () => { if (!pendingPublish) return; pendingPublish.cover = ''; paintCoverPreview(); };
  $('#coverBackBtn').onclick = hideCoverStep;
  $('#coverPublishBtn').onclick = async () => {
    if (!pendingPublish) return;
    const btn = $('#coverPublishBtn'); btn.disabled = true;
    try {
      const p = pendingPublish;
      const pb = await pub.publishBook({ file: p.file, fileName: p.file ? p.file.name : '', meta: { ...p.meta, cover: p.cover }, format: p.format, categoryId: p.categoryId });
      pub.saveToMyLibrary(pb, p.file);
      toast(t('published')); closeAddModal(); location.hash = '#/pub/' + pb.id;
    } catch (e) { toast('⚠ ' + (e.message || e), 5000); }
    btn.disabled = false;
  };
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
