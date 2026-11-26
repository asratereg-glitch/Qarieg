// findbook.js — "Find this book" links on the book page + custom sites in Settings (v1.5.0)
import * as store from './store.js';
import { esc, toast } from './app.js';
import { tr } from './i18n.js';

export const BUILTIN_SITES = [
  { id: 'ol', name: 'Open Library', url: 'https://openlibrary.org/search?q={query}' },
  { id: 'gut', name: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/search/?query={query}' },
  { id: 'gb', name: 'Google Books', url: 'https://www.google.com/search?tbm=bks&q={query}' },
  { id: 'ia', name: 'Internet Archive', url: 'https://archive.org/search?query={query}' },
  { id: 'kobo', name: 'Kobo', url: 'https://www.kobo.com/search?query={query}' },
  { id: 'amz', name: 'Amazon', url: 'https://www.amazon.com/s?k={query}' },
];

export function customSites() {
  const a = store.getState().settings.findSites;
  return Array.isArray(a) ? a.filter(x => x && x.name && x.url) : [];
}

// Fill a template. {title} {author} {query} (= title + author). Returns null if the result is not an http(s) URL.
export function buildUrl(tpl, title, author) {
  const enc = s => encodeURIComponent(String(s || '').trim());
  const q = [title, author].filter(Boolean).join(' ');
  const out = String(tpl).replace(/\{title\}/gi, enc(title)).replace(/\{author\}/gi, enc(author)).replace(/\{query\}/gi, enc(q));
  try { const u = new URL(out); return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null; } catch { return null; }
}

export function validTemplate(tpl) {
  const s = String(tpl || '').trim();
  if (!/^https?:\/\//i.test(s)) return 'scheme';
  if (!/\{(title|author|query)\}/i.test(s)) return 'placeholder';
  try { new URL(s.replace(/\{(title|author|query)\}/gi, 'x')); } catch { return 'scheme'; }
  return '';
}

export function findBookHTML(title, author) {
  const sites = BUILTIN_SITES.concat(customSites().map((c, i) => ({ id: 'c' + i, name: c.name, url: c.url, custom: true })));
  const links = sites.map(s => { const u = buildUrl(s.url, title, author); return u ? `<a class="btn find-btn" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a>` : ''; }).join('');
  return `<div class="chart-box"><h3>🔎 ${tr('ابحث عن الكتاب', 'Search for this book')}</h3>
    <p class="muted" style="margin-bottom:.5rem">${tr('بيفتح نتايج البحث عن الكتاب في موقع خارجي. تقدر تضيف مواقعك من الإعدادات.', 'Opens a search for this book on an outside site. You can add your own sites in Settings.')}</p>
    <div class="find-links">${links}</div></div>`;
}

export function renderFindSitesSettings(host, rerender) {
  const list = customSites();
  host.innerHTML = `<h3 style="margin-bottom:.4rem">🔎 ${tr('مواقع البحث عن الكتب', 'Book search sites')}</h3>
    <p class="muted" style="margin-bottom:.6rem">${tr('ضيف موقع بالاسم وصيغة الرابط. اكتب {title} مكان عنوان الكتاب و{author} مكان المؤلف، أو {query} للاتنين مع بعض. مثال:', 'Add a site by name and URL format. Use {title} for the book title, {author} for the author, or {query} for both together. Example:')} <code dir="ltr">https://example.com/search?q={query}</code></p>
    <div id="fsList"></div>
    <div style="display:grid;gap:.5rem;max-width:480px;margin-top:.6rem">
      <input id="fsName" placeholder="${tr('اسم الموقع', 'Site name')}" autocomplete="off">
      <input id="fsUrl" dir="ltr" placeholder="https://…{query}" autocomplete="off">
      <div style="display:flex;gap:.5rem"><button id="fsAdd" class="btn btn-primary">${tr('إضافة', 'Add')}</button><button id="fsCancel" class="btn" hidden>${tr('إلغاء التعديل', 'Cancel edit')}</button></div>
    </div>`;
  const lh = host.querySelector('#fsList');
  if (!list.length) lh.innerHTML = `<p class="muted">${tr('مفيش مواقع مضافة.', 'No custom sites yet.')}</p>`;
  let editing = -1;
  const name = host.querySelector('#fsName'), url = host.querySelector('#fsUrl'), add = host.querySelector('#fsAdd'), cancel = host.querySelector('#fsCancel');
  const save = arr => { store.getState().settings.findSites = arr; store.save(); };
  list.forEach((c, i) => {
    const row = document.createElement('div'); row.className = 'set-row'; row.style.flexWrap = 'wrap';
    row.innerHTML = `<span><b>${esc(c.name)}</b><br><span class="muted" dir="ltr" style="font-size:.75rem;word-break:break-all">${esc(c.url)}</span></span><span><button class="btn" data-e>${tr('تعديل', 'Edit')}</button> <button class="btn" data-d>${tr('حذف', 'Delete')}</button></span>`;
    row.querySelector('[data-e]').onclick = () => { editing = i; name.value = c.name; url.value = c.url; add.textContent = tr('حفظ', 'Save'); cancel.hidden = false; name.focus(); };
    row.querySelector('[data-d]').onclick = () => { if (!confirm(tr('حذف الموقع ده؟', 'Delete this site?'))) return; save(list.filter((_, j) => j !== i)); rerender(); };
    lh.appendChild(row);
  });
  cancel.onclick = () => rerender();
  add.onclick = () => {
    const n = name.value.trim(), u = url.value.trim();
    if (!n) { toast(tr('اكتب اسم الموقع', 'Enter a site name')); return; }
    const bad = validTemplate(u);
    if (bad === 'scheme') { toast(tr('الرابط لازم يبدأ بـ http:// أو https://', 'The URL must start with http:// or https://'), 4000); return; }
    if (bad === 'placeholder') { toast(tr('لازم الرابط يحتوي {title} أو {author} أو {query}', 'The URL must contain {title}, {author} or {query}'), 4000); return; }
    const arr = list.slice();
    if (editing >= 0) arr[editing] = { name: n, url: u }; else arr.push({ name: n, url: u });
    save(arr); rerender();
  };
}
