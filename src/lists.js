// lists.js — reading lists page: favorites, built-in smart lists, custom lists
import * as store from './store.js';
import { t, tr } from './i18n.js';
import { authorHTML, esc, coverHTML, toast, pickBookFile, startReadingBook, sortBooks } from './app.js';

const $ = (s, r = document) => r.querySelector(s);

function smart() {
  const bs = store.getState().books;
  return [
    { id: 'fav', icon: '❤', name: tr('المفضلة', 'Favorites'), books: bs.filter(b => b.favorite) },
    { id: 'reading', icon: '📖', name: t('shelf_reading'), books: bs.filter(b => b.shelf === 'reading') },
    { id: 'want', icon: '🔖', name: t('shelf_want'), books: bs.filter(b => b.shelf === 'want') },
    { id: 'finished', icon: '✅', name: tr('قرايتهم', 'Read'), books: bs.filter(b => b.shelf === 'finished') },
  ];
}
function custom() {
  return store.getState().lists.map(l => ({ id: l.id, icon: '📋', name: l.name, desc: l.desc, custom: true, books: l.bookIds.map(store.getBook).filter(Boolean) }));
}
const mosaic = books => `<div class="ls-mosaic">${[0, 1, 2, 3].map(i => books[i] && books[i].cover ? `<img src="${esc(books[i].cover)}" alt="">` : `<span></span>`).join('')}</div>`;

export function renderLists(view, id) {
  if (id) return renderOne(view, id);
  const all = [...smart(), ...custom()];
  view.innerHTML = `<div class="view-head"><h1>📋 ${t('navLists')}</h1></div>
    <div class="stat-card" style="margin-bottom:1.2rem"><h3 style="margin-bottom:.6rem">${tr('قائمة قراءة جديدة', 'New reading list')}</h3>
      <div class="search-row"><input id="nlName" placeholder="${tr('اسم القائمة (مثلًا: روايات الصيف)', 'List name (e.g. Summer reads)')}"><input id="nlDesc" placeholder="${tr('وصف (اختياري)', 'Description (optional)')}"><button id="nlBtn" class="btn btn-primary">＋ ${t('create')}</button></div></div>
    <div class="stat-card" style="margin-bottom:1.2rem"><h3 style="margin-bottom:.4rem">📥 ${tr('استيراد مكتبتك من Goodreads', 'Import your Goodreads library')}</h3>
      <p class="muted" style="margin-bottom:.6rem">${tr('في Goodreads: My Books ← Import and export ← Export Library، وبعدين اختار ملف CSV هنا. بيتعمل لكل رف قائمة، والتقييمات والتواريخ بتتنقل.', 'On Goodreads: My Books > Import and export > Export Library, then choose the CSV here. Each shelf becomes a list; ratings and dates carry over.')}</p>
      <button id="grBtn" class="btn">⬆ ${tr('اختار ملف CSV', 'Choose CSV file')}</button><input type="file" id="grIn" accept=".csv,text/csv" hidden></div>
    <div class="ls-grid" id="lsGrid"></div>`;
  const host = $('#lsGrid', view);
  all.forEach(l => {
    const c = document.createElement('div'); c.className = 'ls-card';
    c.innerHTML = `${mosaic(l.books)}<div class="ls-info"><div class="ls-name">${l.icon} ${esc(l.name)}</div><div class="muted">${l.books.length} ${tr('كتاب', 'books')}${l.custom ? '' : ' · ' + tr('تلقائية', 'auto')}</div>${l.desc ? `<div class="muted">${esc(l.desc)}</div>` : ''}</div>`;
    c.onclick = () => { location.hash = '#/lists/' + l.id; };
    host.appendChild(c);
  });
  const mk = () => {
    const n = $('#nlName', view).value.trim(); if (!n) return;
    const l = store.createList(n, $('#nlDesc', view).value.trim()); location.hash = '#/lists/' + l.id;
  };
  $('#nlBtn', view).onclick = mk;
  $('#grBtn', view).onclick = () => $('#grIn', view).click();
  $('#grIn', view).onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const r = importGoodreads(await f.text()); toast(`✓ ${r.added} ${tr('كتاب اتضافوا', 'books added')} · ${r.lists} ${tr('قوائم', 'lists')}`, 4000); renderLists(view); } catch (err) { toast('⚠ ' + err.message, 4000); } };
  $('#nlName', view).addEventListener('keydown', e => { if (e.key === 'Enter') mk(); });
}

function renderOne(view, id) {
  const l = [...smart(), ...custom()].find(x => x.id === id);
  if (!l) { location.hash = '#/lists'; return; }
  let sort = 'manual';
  const draw = () => {
    let books = l.custom ? l.books.map(b => b) : l.books.slice();
    if (l.custom) books = store.getList(id).bookIds.map(store.getBook).filter(Boolean);
    if (sort === 'title') books.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'added') books.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    else books = sortBooks(books, sort);
    view.innerHTML = `<div class="view-head"><div><a href="#/lists" class="muted">‹ ${t('navLists')}</a><h1>${l.icon} ${esc(l.name)} <span class="count muted">(${books.length})</span></h1>${l.desc ? `<div class="muted">${esc(l.desc)}</div>` : ''}</div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
        <select id="lsSort"><option value="manual">${tr('الترتيب الأصلي', 'Original order')}</option><option value="added">${tr('الأحدث إضافة', 'Newest first')}</option><option value="title">${tr('أبجديًا', 'A–Z')}</option><option value="year-desc">${tr('الأحدث إصدارًا', 'Newest release')}</option><option value="year-asc">${tr('الأقدم إصدارًا', 'Oldest release')}</option><option value="rating-desc">${tr('الأعلى تقييمًا', 'Highest rated')}</option><option value="rating-asc">${tr('الأقل تقييمًا', 'Lowest rated')}</option></select>
        <button id="lsCopy" class="btn">⧉ ${tr('نسخ كنص', 'Copy as text')}</button>
        ${l.custom ? `<button id="lsRename" class="btn">${t('edit')}</button><button id="lsDel" class="btn btn-danger">${t('delete')}</button>` : ''}</div></div>
      <div class="grid" id="lsBooks"></div>`;
    $('#lsSort', view).value = sort;
    $('#lsSort', view).onchange = e => { sort = e.target.value; draw(); };
    const g = $('#lsBooks', view);
    if (!books.length) g.innerHTML = `<p class="muted">${l.custom ? tr('القائمة فاضية. افتح أي كتاب واضغط "القوائم" عشان تضيفه هنا.', 'Empty list. Open any book and tap "Lists" to add it here.') : '—'}</p>`;
    books.forEach((b, i) => {
      const el = document.createElement('div'); el.className = 'book-card';
      el.innerHTML = `<div class="cover">${coverHTML(b)}</div>${b.favorite ? '<span class="shelf-badge fav">❤</span>' : ''}
        <div class="book-meta"><div class="book-title">${esc(b.title)}</div><div class="book-author">${authorHTML(b.author)}</div>
        <div class="ls-read"><button class="btn btn-primary btn-sm" data-act="read">▶ ${t('startReading')}</button><button class="icon-btn" data-act="attach" title="${b.fileKey ? tr('غيّر ملف الكتاب', 'Change book file') : tr('اختار ملف الكتاب من جهازك', 'Choose the book file from your device')}">${b.fileKey ? '📎✓' : '📎'}</button></div>
        ${l.custom && sort === 'manual' ? `<div class="ls-ctrl"><button class="icon-btn" data-d="-1">↑</button><button class="icon-btn" data-d="1">↓</button><button class="icon-btn" data-d="x">✕</button></div>` : ''}</div>`;
      el.onclick = () => { location.hash = '#/book/' + b.id; };
      el.querySelector('[data-act=read]').onclick = ev => { ev.stopPropagation(); startReadingBook(b); };
      el.querySelector('[data-act=attach]').onclick = async ev => { ev.stopPropagation(); if (await pickBookFile(b)) draw(); };
      el.querySelectorAll('.ls-ctrl button').forEach(btn => btn.onclick = ev => {
        ev.stopPropagation();
        if (btn.dataset.d === 'x') store.listToggleBook(id, b.id); else store.listMove(id, b.id, +btn.dataset.d);
        draw();
      });
      g.appendChild(el);
    });
    $('#lsCopy', view).onclick = async () => {
      const txt = `${l.name}\n` + books.map((b, i) => `${i + 1}. ${b.title}${b.author ? ' — ' + b.author : ''}`).join('\n');
      try { await navigator.clipboard.writeText(txt); toast(t('copied')); } catch { prompt('', txt); }
    };
    if (l.custom) {
      $('#lsRename', view).onclick = () => {
        const n = prompt(tr('اسم القائمة', 'List name'), l.name); if (!n || !n.trim()) return;
        const d = prompt(tr('الوصف', 'Description'), l.desc || '');
        store.updateList(id, { name: n.trim(), desc: d || '' }); l.name = n.trim(); l.desc = d || ''; draw();
      };
      $('#lsDel', view).onclick = () => { if (confirm(tr('تحذف القائمة؟ الكتب هتفضل في مكتبتك.', 'Delete this list? Books stay in your library.'))) { store.deleteList(id); location.hash = '#/lists'; } };
    }
  };
  draw();
}

/* ---- Goodreads CSV import (the user's own export file) ---- */
function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
const cleanIsbn = v => (v || '').replace(/[="\s]/g, '');
export function importGoodreads(text) {
  const rows = parseCSV(text); if (rows.length < 2) throw new Error('CSV فاضي');
  const h = rows[0].map(x => x.trim()); const ix = n => h.indexOf(n);
  if (ix('Title') < 0) throw new Error(tr('الملف مش تصدير Goodreads', 'Not a Goodreads export'));
  const g = (r, n) => (ix(n) >= 0 ? (r[ix(n)] || '').trim() : '');
  const books = store.getState().books; let added = 0; const listIds = {};
  const listFor = name => { if (!listIds[name]) { const ex = store.getState().lists.find(l => l.name === name); listIds[name] = (ex || store.createList(name, 'Goodreads')).id; } return listIds[name]; };
  const shelfMap = { read: 'finished', 'currently-reading': 'reading', 'to-read': 'want' };
  rows.slice(1).forEach(r => {
    const title = g(r, 'Title').replace(/\s*\([^)]*#\d+[^)]*\)\s*$/, '').trim(); if (!title) return;
    const author = g(r, 'Author'); const isbn = cleanIsbn(g(r, 'ISBN13')) || cleanIsbn(g(r, 'ISBN'));
    const ex = g(r, 'Exclusive Shelf'); const rating = +g(r, 'My Rating') || 0; const dr = g(r, 'Date Read').replace(/\//g, '-');
    let b = books.find(x => x.title.toLowerCase() === title.toLowerCase() && (x.author || '').toLowerCase() === author.toLowerCase());
    if (!b) {
      b = store.addBook({ title, author, format: 'web', source: 'goodreads-csv', isbn, cover: '', shelf: shelfMap[ex] || 'want', rating, totalPages: +g(r, 'Number of Pages') || 0,
        review: g(r, 'My Review'), finishedAt: ex === 'read' ? (dr ? new Date(dr).toISOString() : new Date().toISOString()) : null });
      if (isNaN(Date.parse(b.finishedAt || '2000'))) b.finishedAt = new Date().toISOString();
      added++;
    }
    const shelves = new Set(g(r, 'Bookshelves').split(',').map(x => x.trim()).filter(Boolean));
    if (ex) shelves.add(ex);
    shelves.forEach(s => { const lid = listFor('Goodreads: ' + s); if (!store.listHas(lid, b.id)) store.listToggleBook(lid, b.id); });
  });
  store.save();
  return { added, lists: Object.keys(listIds).length };
}
