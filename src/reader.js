// reader.js — EPUB / PDF / TXT reader: themes, highlights, TTS, dictionary, sessions
import * as db from './db.js';
import * as store from './store.js';
import { t, getLang } from './i18n.js';
import { toast, esc, coverHTML } from './app.js';
import { fontStack, fontFaceCSS, fontPicker } from './fonts.js';
import { voices, onVoices, waitVoices, detectLang, pickVoice, preview, isNatural, langLabel, baseLang } from './tts.js';

const $ = (s, r = document) => r.querySelector(s);
let R = null; // active reader session

const HL_COLORS = ['#ffd54a', '#8ee08e', '#7ec8ff', '#ff9db0'];


/* ---- v1.3.0: layout presets, TOC, page bar ---- */
export function layoutMode() {

  // clientWidth stays the real layout width even if Chrome on Android expands the visual viewport on overflow
  const w = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
  return w < 700 ? 'phone' : w < 1100 ? 'tablet' : 'desktop';
}
function applyLayout(resize = true) {
  const m = layoutMode();
  const stage = $('#readerStage'), body = $('#readerBody');
  if (!stage || !body) return;
  ['phone', 'tablet', 'desktop'].forEach(x => { stage.classList.toggle('lay-' + x, x === m); body.classList.toggle('lay-' + x, x === m); });
  const l = store.getState().settings.layout || 'auto';
  $('#phoneBtn') && $('#phoneBtn').classList.toggle('on', l === 'phone');
  $('#tabletBtn') && $('#tabletBtn').classList.toggle('on', l === 'tablet');
  if (!resize || !R) return;
  if (R.rendition) { applyEpubTheme(); try { R.rendition.resize(); } catch {} }
  else if (R.pdf) renderPdfPage();
  else if (R.txtPages) renderTxtPage();
}
function setLayout(mode) {
  const s = store.getState().settings;
  const cur = s.layout || 'auto';
  const next = cur === mode ? 'auto' : mode;   // tapping the active preset returns to auto
  const patch = { layout: next };
  if (next === 'phone') Object.assign(patch, { fontSize: 18, lineHeight: 1.8 });
  if (next === 'tablet') Object.assign(patch, { fontSize: 21, lineHeight: 1.9 });
  Object.assign(s, patch); store.save();
  applyLayout();
  toast(next === 'auto' ? t('layoutAuto') : next === 'phone' ? t('layoutPhone') : t('layoutTablet'));
}
async function showTocPanel() {
  const panel = $('#readerPanel'); panel.classList.remove('hidden'); panel.dataset.kind = 'toc';
  panel.innerHTML = `<h3>📑 ${t('toc')}</h3><div id="tocList"><p class="muted">…</p></div>`;
  const list = panel.querySelector('#tocList');
  const items = [];   // {label, depth, go}
  try {
    if (R.epub) {
      const walk = (arr, d) => (arr || []).forEach(it => { items.push({ label: (it.label || '').trim(), depth: d, go: () => R.rendition.display(it.href) }); walk(it.subitems, d + 1); });
      walk(R.epub.navigation && R.epub.navigation.toc, 0);
    } else if (R.pdf) {
      const ol = await R.pdf.getOutline();
      const walk = async (arr, d) => { for (const it of arr || []) {
        const go = async () => { try { let dest = it.dest; if (typeof dest === 'string') dest = await R.pdf.getDestination(dest); const idx = await R.pdf.getPageIndex(dest[0]); R.pdfPage = idx + 1; renderPdfPage(); } catch {} };
        items.push({ label: (it.title || '').trim(), depth: d, go }); await walk(it.items, d + 1); } };
      await walk(ol, 0);
    } else if (R.txtPages) {
      const re = /^[ \t]*((?:chapter|part|book|section|الفصل|فصل|الباب|باب|الجزء|جزء|الكتاب)\b[^\n]{0,70})$/gim;
      R.txtPages.forEach((p, i) => { re.lastIndex = 0; const m = re.exec(p); if (m) items.push({ label: m[1].trim(), depth: 0, go: () => { R.txtIdx = i; renderTxtPage(); } }); });
    }
  } catch (e) { console.warn('toc failed', e); }
  if (!items.length) { list.innerHTML = `<p class="muted">${t('tocNone')}</p>`; return; }
  list.innerHTML = '';
  items.forEach(it => {
    const b = document.createElement('button'); b.className = 'toc-item' + (it.depth ? ' sub' : '');
    b.textContent = it.label || '—'; b.style.paddingInlineStart = (0.3 + it.depth * 1) + 'rem';
    b.onclick = async () => { await it.go(); panel.classList.add('hidden'); };
    list.appendChild(b);
  });
}
let sliderDrag = false;
function bindSlider() {
  const sl = $('#pageSlider'); if (!sl || sl._bound) return; sl._bound = true;
  const label = v => {
    if (!R) return '';
    if (R.pdf) return `${t('pageN').replace('{n}', Math.max(1, Math.round(v / 1000 * (R.pdf.numPages - 1)) + 1))} ${t('of')} ${R.pdf.numPages}`;
    if (R.txtPages) return `${Math.round(v / 1000 * (R.txtPages.length - 1)) + 1} / ${R.txtPages.length}`;
    if (R.rendition && R.locationsReady) { const tot = R.epub.locations.total; return `${Math.max(1, Math.round(v / 1000 * (tot - 1)) + 1)} / ${tot} · ${Math.round(v / 10)}%`; }
    return Math.round(v / 10) + '%';
  };
  sl.addEventListener('pointerdown', () => { sliderDrag = true; });
  sl.addEventListener('input', () => { sliderDrag = true; $('#readerProgressLabel').textContent = label(+sl.value); });
  sl.addEventListener('change', () => {
    sliderDrag = false; if (!R) return;
    const v = +sl.value / 1000;
    if (R.pdf) { R.pdfPage = Math.round(v * (R.pdf.numPages - 1)) + 1; renderPdfPage(); }
    else if (R.txtPages) { R.txtIdx = Math.round(v * (R.txtPages.length - 1)); renderTxtPage(); }
    else if (R.rendition) {
      if (!R.locationsReady) { toast(t('pagesPreparing')); updateProgress(); return; }
      const cfi = R.epub.locations.cfiFromPercentage(Math.min(0.999, v)); if (cfi) R.rendition.display(cfi);
    }
  });
  document.addEventListener('pointerup', () => { sliderDrag = false; });
}

/* ---- v1.3.1: user images inside books ---- */
const imgUrlCache = new Map();
async function imgDataUrl(im) {
  if (imgUrlCache.has(im.id)) return imgUrlCache.get(im.id);
  const blob = await db.getFile(im.fileKey); if (!blob) return '';
  const u = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  imgUrlCache.set(im.id, u); return u;
}
async function shrinkImage(file) {   // max 1600px, JPEG 0.85 (keeps sync light)
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('bad image')); i.src = url; });
    const sc = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
  } finally { URL.revokeObjectURL(url); }
}
function blockAfter(range, doc) {
  let el = range.endContainer; while (el && el.nodeType !== 1) el = el.parentNode;
  const body = doc.body;
  while (el && el !== body && el.parentElement !== body && !/^(P|DIV|H[1-6]|LI|BLOCKQUOTE|SECTION|FIGURE|TABLE|PRE|UL|OL)$/.test(el.tagName)) el = el.parentElement;
  return el || body;
}
function makeFigure(doc, im, url) {
  const fig = doc.createElement('figure'); fig.className = 'qari-img'; fig.dataset.id = im.id;
  fig.setAttribute('style', 'margin:1em auto;text-align:center;break-inside:avoid;max-width:100%');
  const img = doc.createElement('img'); img.src = url; img.alt = ''; img.setAttribute('style', 'max-width:100%;max-height:80vh;height:auto;border-radius:6px');
  if (im.scale && im.scale < 100) img.style.width = im.scale + '%';
  fig.appendChild(img);
  if (im.caption) { const c = doc.createElement('figcaption'); c.textContent = im.caption; c.setAttribute('style', 'font-size:.85em;opacity:.7;margin-top:.3em'); fig.appendChild(c); }
  img.addEventListener('load', () => { try { R && R.rendition && R.rendition.resize(); } catch {} });
  return fig;
}
async function placeEpubImages(contents) {
  if (!R || !R.epub) return;
  const doc = contents.document;
  doc.querySelectorAll('figure.qari-img').forEach(f => f.remove());
  const imgs = store.bookImages(R.book.id).filter(i => i.cfi && i.fileKey).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const im of imgs) {
    try {
      const sec = R.epub.spine.get(im.cfi);
      if (!sec || sec.index !== contents.sectionIndex) continue;
      const range = contents.range(im.cfi, 'qari-img'); if (!range) continue;
      const url = await imgDataUrl(im); if (!url) continue;
      const fig = makeFigure(doc, im, url);
      const el = blockAfter(range, doc);
      if (el === doc.body) doc.body.appendChild(fig); else el.insertAdjacentElement('afterend', fig);
    } catch (e) { console.warn('place image failed', e); }
  }
}
function refreshImages() {
  if (!R) return;
  if (R.rendition) { try { R.rendition.getContents().forEach(c => placeEpubImages(c)); setTimeout(() => { try { R.rendition.resize(); } catch {} }, 150); } catch {} }
  else if (R.txtPages) renderTxtPage();
}
function askRemoveImage(id) {
  if (!confirm(getLang() === 'ar' ? 'مسح الصورة دي من الكتاب؟' : 'Remove this image from the book?')) return;
  const im = (store.getState().images || []).find(i => i.id === id);
  store.removeImage(id); if (im) db.deleteFile(im.fileKey).catch(() => {}); imgUrlCache.delete(id);
  refreshImages(); const p = $('#readerPanel'); if (p && p.dataset.kind === 'img') showImagePanel();
}

function capturePos() {          // where a new image goes: after the selected text, else the current page start
  if (R.rendition) {
    try {
      const c = R.rendition.getContents()[0];
      const sel = c.window.getSelection();
      if (sel && sel.rangeCount && !sel.isCollapsed) return { cfi: c.cfiFromRange(sel.getRangeAt(0), 'qari-img') };
    } catch {}
    const loc = R.rendition.currentLocation();
    if (loc && loc.start) return { cfi: loc.start.cfi };
    return null;
  }
  if (R.txtPages) {
    let at = null;
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && !sel.isCollapsed) {
        const rg = sel.getRangeAt(0); let n = rg.endContainer; if (n.nodeType === 3) n = n.parentNode;
        const sp = n.closest && n.closest('.seg');
        if (sp) at = (+sp.dataset.off) + (rg.endContainer.nodeType === 3 ? rg.endOffset : 0);
      }
    } catch {}
    return { page: R.txtIdx + 1, at };
  }
  return null;
}
async function showImagePanel() {
  const panel = $('#readerPanel'); panel.classList.remove('hidden'); panel.dataset.kind = 'img';
  const ar = getLang() === 'ar';
  if (R.pdf || !(R.rendition || R.txtPages)) { panel.innerHTML = `<h3>🖼 ${t('addImage')}</h3><p class="muted">${t('imgNoPdf')}</p>`; return; }
  if (!panel._pos || panel._bookId !== R.book.id || !panel._keep) { panel._pos = capturePos(); }
  panel._bookId = R.book.id; panel._keep = false;
  const list = store.bookImages(R.book.id);
  panel.innerHTML = `<h3>🖼 ${t('addImage')}</h3>
    <p class="muted" style="margin-bottom:.6rem">${t('imgHint')}</p>
    <input id="imgCap" placeholder="${t('imgCaption')}" style="width:100%;margin-bottom:.5rem">
    <button id="imgPick" class="btn btn-primary" style="margin-bottom:.4rem">＋ ${t('imgChoose')}</button>
    <input type="file" id="imgFile" accept="image/*" hidden>
    <h4 style="margin:.8rem 0 .4rem">${t('imgInBook')} (${list.length})</h4><div id="imgList"></div>`;
  panel.querySelector('#imgPick').onclick = () => { panel._keep = true; panel.querySelector('#imgFile').click(); };
  panel.querySelector('#imgFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const pos = panel._pos || capturePos(); if (!pos) throw new Error(t('imgNoPos'));
      const blob = await shrinkImage(f);
      const im = store.addImage(Object.assign({ bookId: R.book.id, caption: panel.querySelector('#imgCap').value.trim() }, pos));
      await db.putFile(im.fileKey, blob);
      panel._pos = null; refreshImages(); toast(t('added'));
    } catch (err) { toast('⚠ ' + (err.message || err), 3500); }
    showImagePanel();
  };
  const lh = panel.querySelector('#imgList');
  if (!list.length) lh.innerHTML = `<p class="muted">${t('imgNone')}</p>`;
  list.forEach(async im => {
    const row = document.createElement('div'); row.className = 'comment';
    row.innerHTML = `<div style="display:flex;gap:.5rem;align-items:center"><img style="width:56px;height:56px;object-fit:cover;border-radius:6px"><div style="flex:1" class="muted captext"></div><button class="icon-btn" data-act="jump">↩</button><button class="icon-btn" data-act="del">🗑</button></div>
      <div style="display:flex;gap:.5rem;align-items:center;margin-top:.35rem"><span class="muted" style="font-size:.8rem">${t('imgSize')}</span><input type="range" min="20" max="100" step="5" value="${im.scale || 100}" style="flex:1"><span class="muted szv" style="font-size:.8rem;min-width:2.6em;text-align:end">${im.scale || 100}%</span></div>`;
    row.querySelector('.captext').textContent = im.caption || (im.page ? (t('pageN').replace('{n}', im.page)) : '');
    imgDataUrl(im).then(u => { if (u) row.querySelector('img').src = u; });
    row.querySelector('[data-act=jump]').onclick = () => { if (im.cfi && R.rendition) R.rendition.display(im.cfi); else if (im.page && R.txtPages) { R.txtIdx = im.page - 1; renderTxtPage(); } };
    row.querySelector('[data-act=del]').onclick = () => askRemoveImage(im.id);
    const rng = row.querySelector('input[type=range]');
    rng.oninput = () => { row.querySelector('.szv').textContent = rng.value + '%'; };
    rng.onchange = () => { store.updateImage(im.id, { scale: +rng.value }); refreshImages(); };
    lh.appendChild(row);
  });
}

export async function openReader(book) {
  const ov = $('#readerOverlay');
  ov.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  $('#readerTitle').textContent = book.title;
  $('#readerPanel').classList.add('hidden');
  $('#selPop').classList.add('hidden');

  R = {
    book, startedAt: Date.now(), pagesTurned: 0,
    epub: null, rendition: null, pdf: null, pdfPage: 1,
    txtPages: null, txtIdx: 0, ttsActive: false, locationsReady: false,
    selAt: 0, timer: null,
  };
  R.timer = setInterval(() => {
    if (!R || document.hidden || $('#readerOverlay').classList.contains('hidden')) return;
    const mins = (Date.now() - R.startedAt) / 60000;
    const st = $('#sessionTimer'); if (st) st.textContent = mins < 60 ? `${Math.floor(mins)}:${String(Math.floor((mins % 1) * 60)).padStart(2, '0')}` : `${Math.floor(mins / 60)}h ${Math.floor(mins % 60)}m`;
  }, 1000);

  bindChrome(); bindSlider(); applyLayout(false);

  if (book.format === 'web' || !book.fileKey) { renderWebRef(book); return; }
  const blob = await db.getFile(book.fileKey);
  if (!blob) { $('#readerStage').innerHTML = `<p class="muted" style="padding:2rem">⚠ ملف الكتاب مش موجود على الجهاز.</p>`; return; }

  try {
    if (book.format === 'epub') await openEpub(blob, book);
    else if (book.format === 'pdf') await openPdf(blob, book);
    else openTxt(await blob.text(), book);
  } catch (e) {
    console.error(e);
    $('#readerStage').innerHTML = `<p class="muted" style="padding:2rem">⚠ ${esc(e.message || String(e))}</p>`;
  }
  markReading();
}

function markReading() {
  if (R.book.shelf === 'want') store.updateBook(R.book.id, { shelf: 'reading' });
}

/* ================= EPUB ================= */
async function openEpub(blob, book) {
  const buf = await blob.arrayBuffer();
  const epub = ePub(buf);
  R.epub = epub;
  const s = store.getState().settings;
  const stage = $('#readerStage'); stage.innerHTML = '';
  const rendition = epub.renderTo(stage, { width: '100%', height: '100%', flow: s.flow === 'scrolled' ? 'scrolled-doc' : 'paginated', spread: 'none', allowScriptedContent: false, ignoreClass: 'qari-img' });
  R.rendition = rendition;
  // epub.js content hooks do not fire reliably in this vendored version, so wire each
  // loaded section's document directly from the 'rendered' event (guarded to run once per doc)
  const wireContents = (c) => {
    try {
      const d = c.document; if (!d || d.__qariWired) return; d.__qariWired = 1;
      try { const st = d.createElement('style'); st.textContent = fontFaceCSS(); d.head.appendChild(st); } catch (e) { console.warn('font inject failed', e); }
      placeEpubImages(c);
      d.addEventListener('mousedown', () => window.__qariCloseFloating && window.__qariCloseFloating({}));
      d.addEventListener('touchstart', () => window.__qariCloseFloating && window.__qariCloseFloating({}), { passive: true });
      // plain tap inside the page toggles the top/bottom bars; a selection gesture (recent 'selected') is ignored
      d.addEventListener('click', (ev) => { if (!R) return; if (Date.now() - (R.selAt || 0) < 500) return; const tg = ev.target; if (tg && tg.closest && tg.closest('a,button,input,img,figure')) return; const sel = d.getSelection && d.getSelection(); if (sel && sel.toString().trim()) { sel.removeAllRanges(); hideSelPop(); } toggleReaderChrome(); });
    } catch {}
  };
  rendition.hooks.content.register(wireContents);
  await epub.ready;
  await epub.loaded.navigation.catch(() => {});
  await rendition.display(book.location || undefined);
  applyEpubTheme();
  rendition.on('rendered', () => { applyEpubTheme(); try { R.rendition.getContents().forEach(wireContents); } catch {} });
  // defer the heavy location walk to idle time so opening a book stays cheap on battery
  const genLocations = () => epub.locations.generate(1200).then(() => { if (R && R.epub === epub) { R.locationsReady = true; updateProgress(); } }).catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(genLocations, { timeout: 9000 }); else setTimeout(genLocations, 2500);
  updateProgress();

  rendition.on('relocated', () => {
    R.pagesTurned++;
    savePosition();
    updateProgress();
    if (R.ttsActive) speakCurrent();
  });
  rendition.on('selected', (cfiRange, contents) => {
    const range = epub.getRange(cfiRange);
    const text = range ? range.toString().trim() : '';
    if (!text) return;
    R.selAt = Date.now();
    showSelPop(contents, text, (action, color) => {
      if (action === 'highlight') {
        const hl = store.addHighlight({ bookId: book.id, text: text.slice(0, 500), cfi: cfiRange, color });
        rendition.annotations.add('highlight', cfiRange, { id: hl.id }, null, 'hl', { fill: color, 'fill-opacity': '0.4' });
        contents.window.getSelection().removeAllRanges();
        hideSelPop();
      } else if (action === 'note') {
        const note = prompt(t('addNote'));
        const hl = store.addHighlight({ bookId: book.id, text: text.slice(0, 500), cfi: cfiRange, note: note || '', color: '#7ec8ff' });
        rendition.annotations.add('highlight', cfiRange, { id: hl.id }, null, 'hl', { fill: '#7ec8ff', 'fill-opacity': '0.4' });
        contents.window.getSelection().removeAllRanges();
        hideSelPop();
      } else if (action === 'define') { lookupWord(text); }
    });
  });
  // restore stored highlights
  rendition.on('rendered', () => {
    store.bookHighlights(book.id).forEach(h => {
      if (h.cfi) try { rendition.annotations.add('highlight', h.cfi, { id: h.id }, null, 'hl', { fill: h.color, 'fill-opacity': '0.4' }); } catch {}
    });
  });
}

function applyEpubTheme() {
  if (!R || !R.rendition) return;
  const s = store.getState().settings;
  const cs = getComputedStyle(document.body);
  const theme = {
    body: {
      color: cs.getPropertyValue('--text') + '!important',
      background: cs.getPropertyValue('--bg') + '!important',
      'font-size': s.fontSize + 'px !important',
      'line-height': s.lineHeight + ' !important',
      'font-family': fontStack(s.fontFamily) + ' !important',
      padding: layoutMode() === 'phone' ? '0 4px' : layoutMode() === 'tablet' ? '0 16px' : '0 8px',
    },
    p: { 'margin-bottom': '0.7em' },
    img: { 'max-width': '100%' },
  };
  try {
    R.rendition.themes.register('qari', theme);
    R.rendition.themes.select('qari');
  } catch (e) { /* contents not attached yet; re-applied on next rendered */ }
}

/* ================= PDF ================= */
async function openPdf(blob, book) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
  const buf = await blob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  R.pdf = pdf;
  R.pdfPage = book.currentPage > 0 ? Math.min(book.currentPage, pdf.numPages) : 1;
  store.updateBook(book.id, { totalPages: pdf.numPages });
  await renderPdfPage();
}

async function renderPdfPage() {
  const stage = $('#readerStage');
  const page = await R.pdf.getPage(R.pdfPage);
  const containerW = stage.clientWidth - 40;
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(1.8, containerW / base.width);
  const vp = page.getViewport({ scale: Math.max(0.8, scale) });
  stage.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.className = 'pdf-page';
  canvas.width = vp.width; canvas.height = vp.height;
  stage.appendChild(canvas);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  R.pagesTurned++;
  savePosition(); updateProgress();
}

/* ================= TXT ================= */
function openTxt(text, book) {
  const chunks = [];
  const CH = 3200;
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + CH, text.length);
    if (end < text.length) { const nl = text.lastIndexOf('\n', end); if (nl > i + CH / 2) end = nl; }
    chunks.push(text.slice(i, end)); i = end;
  }
  R.txtPages = chunks;
  R.txtIdx = Math.min(book.currentPage || 0, chunks.length - 1);
  store.updateBook(book.id, { totalPages: chunks.length });
  renderTxtPage();
}

function renderTxtPage() {
  const stage = $('#readerStage');
  const s = store.getState().settings;
  const isAr = /[؀-ۿ]/.test(R.txtPages[R.txtIdx].slice(0, 200));
  stage.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'txt-page';
  div.dir = isAr ? 'rtl' : 'ltr';
  div.style.setProperty('--rfs', s.fontSize + 'px');
  if (s.fontFamily && s.fontFamily !== 'auto') div.style.fontFamily = fontStack(s.fontFamily);
  div.style.setProperty('--rlh', s.lineHeight);
  const pageText = R.txtPages[R.txtIdx];
  const pimgs = store.bookImages(R.book.id).filter(i => i.page === R.txtIdx + 1 && i.fileKey).sort((a, b) => (a.at || 0) - (b.at || 0));
  let pos = 0;
  const seg = (from, to) => { const sp = document.createElement('span'); sp.className = 'seg'; sp.dataset.off = from; sp.textContent = pageText.slice(from, to); div.appendChild(sp); };
  pimgs.forEach(im => {
    const at = Math.min(pageText.length, Math.max(pos, im.at == null ? pageText.length : im.at));
    seg(pos, at); pos = at;
    const fig = document.createElement('figure'); fig.className = 'qari-img'; fig.dataset.id = im.id;
    fig.innerHTML = '<img alt=""><figcaption></figcaption>'; fig.querySelector('figcaption').textContent = im.caption || '';
    if (im.scale && im.scale < 100) fig.querySelector('img').style.width = im.scale + '%';
    imgDataUrl(im).then(u => { if (u) fig.querySelector('img').src = u; });
    div.appendChild(fig);
  });
  seg(pos, pageText.length);
  stage.appendChild(div);
  div.addEventListener('mouseup', maybeShowTxtSel);
  R.pagesTurned++;
  savePosition(); updateProgress();
}

/* ================= web reference book ================= */
function renderWebRef(book) {
  const stage = $('#readerStage');
  stage.innerHTML = `<div class="txt-page" style="text-align:center">
    <div class="cover" style="max-width:200px;margin:0 auto 1rem;border-radius:10px;overflow:hidden">${coverHTML(book)}</div>
    <h2>${esc(book.title)}</h2><p class="muted">${esc(book.author)}</p>
    <p style="margin-top:1rem">${t('sampleNote')}</p>
    <p style="margin-top:.6rem"><a href="https://openlibrary.org/search?q=${encodeURIComponent(book.title)}" target="_blank" rel="noopener" style="color:var(--accent)">${t('readOnline')} ↗</a></p>
  </div>`;
  $('#readerProgressLabel').textContent = '';
  $('#readerProgressFill').style.width = '0%';
}

/* ================= navigation / progress / position ================= */
function next() {
  if (!R) return;
  if (R.rendition) R.rendition.next();
  else if (R.pdf && R.pdfPage < R.pdf.numPages) { R.pdfPage++; renderPdfPage(); }
  else if (R.txtPages && R.txtIdx < R.txtPages.length - 1) { R.txtIdx++; renderTxtPage(); }
}
function prev() {
  if (!R) return;
  if (R.rendition) R.rendition.prev();
  else if (R.pdf && R.pdfPage > 1) { R.pdfPage--; renderPdfPage(); }
  else if (R.txtPages && R.txtIdx > 0) { R.txtIdx--; renderTxtPage(); }
}

function savePosition() {
  const patch = {};
  if (R.rendition) {
    const loc = R.rendition.currentLocation();
    if (loc && loc.start) {
      patch.location = loc.start.cfi;
      if (R.locationsReady && loc.start.percentage != null) patch.progress = Math.round(loc.start.percentage * 100);
      else patch.progress = R.book.progress; // locations not generated yet: keep last known
    }
  } else if (R.pdf) {
    patch.currentPage = R.pdfPage;
    patch.progress = Math.round(R.pdfPage / R.pdf.numPages * 100);
    patch.location = String(R.pdfPage);
  } else if (R.txtPages) {
    patch.currentPage = R.txtIdx;
    patch.progress = Math.round((R.txtIdx + 1) / R.txtPages.length * 100);
    patch.location = String(R.txtIdx);
  } else return;
  Object.assign(R.book, patch);
  store.updateBook(R.book.id, patch);
}

function updateProgress() {
  if (!R) return;
  let label = '', pct = 0;
  if (R.rendition) {
    const loc = R.rendition.currentLocation();
    if (loc && loc.start) {
      pct = Math.round((loc.start.percentage || 0) * 100);
      label = pct + '%';
      if (R.locationsReady) { try { const n = R.epub.locations.locationFromCfi(loc.start.cfi); label = `${n + 1} / ${R.epub.locations.total} · ${pct}%`; } catch {} }
    }
  } else if (R.pdf) {
    pct = Math.round(R.pdfPage / R.pdf.numPages * 100);
    label = `${t('pageN').replace('{n}', R.pdfPage)} ${t('of')} ${R.pdf.numPages} · ${pct}%`;
  } else if (R.txtPages) {
    pct = Math.round((R.txtIdx + 1) / R.txtPages.length * 100);
    label = `${R.txtIdx + 1} / ${R.txtPages.length} · ${pct}%`;
  }
  if (!sliderDrag) {
    $('#readerProgressLabel').textContent = label;
    const sl = $('#pageSlider'); if (sl) sl.value = R.pdf ? (R.pdf.numPages > 1 ? Math.round((R.pdfPage - 1) / (R.pdf.numPages - 1) * 1000) : 0) : R.txtPages ? (R.txtPages.length > 1 ? Math.round(R.txtIdx / (R.txtPages.length - 1) * 1000) : 0) : pct * 10;
  }
  $('#readerProgressFill').style.width = pct + '%';
}

/* ================= selection popup & dictionary ================= */
function showSelPop(contents, text, onAction) {
  const pop = $('#selPop');
  if (!pop) return;
  pop.innerHTML = '';
  HL_COLORS.forEach((c, i) => {
    const d = document.createElement('div');
    d.className = 'hl-dot' + (i === 0 ? ' sel' : '');
    d.style.background = c; d.title = t('highlight');
    d.onclick = () => onAction('highlight', c);
    pop.appendChild(d);
  });
  const noteB = document.createElement('button'); noteB.className = 'icon-btn'; noteB.textContent = '📝'; noteB.title = t('note');
  noteB.onclick = () => onAction('note');
  const defB = document.createElement('button'); defB.className = 'icon-btn'; defB.textContent = '📖'; defB.title = t('define');
  defB.onclick = () => onAction('define');
  pop.append(noteB, defB);
  pop.classList.remove('hidden');
  // position near selection (fixed, relative to viewport)
  pop.style.position = 'fixed';
  let rect = null;
  try {
    if (contents) {
      const r = contents.window.getSelection().getRangeAt(0).getBoundingClientRect();
      const frame = $('#readerStage iframe');
      const fr = frame ? frame.getBoundingClientRect() : { top: 0, left: 0 };
      rect = { top: fr.top + r.top, bottom: fr.top + r.bottom, left: fr.left + r.left, right: fr.left + r.right };
    } else rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
  } catch {}
  if (rect) {
    let top = rect.bottom + 8, left = rect.left;
    top = Math.max(60, Math.min(top, window.innerHeight - 60));
    left = Math.max(10, Math.min(left, window.innerWidth - 230));
    pop.style.top = top + 'px'; pop.style.left = left + 'px'; pop.style.transform = '';
  } else { pop.style.top = '70px'; pop.style.left = '50%'; pop.style.transform = 'translateX(-50%)'; }
}
function hideSelPop() { const p = $('#selPop'); if (p) p.classList.add('hidden'); }

// TXT selection -> highlight menu. Fires on mouseup (desktop) and selectionchange (touch long-press).
function maybeShowTxtSel() {
  if (!R || !R.txtPages) return;
  const sel = window.getSelection();
  const txt = sel ? sel.toString().trim() : '';
  if (!txt) return;
  const st = $('#readerStage'); if (!st || !sel.anchorNode || !st.contains(sel.anchorNode)) return;
  if (Date.now() - (R.selAt || 0) < 600) return;
  R.selAt = Date.now();
  showSelPop(null, txt, (action, color) => {
    if (action === 'highlight' || action === 'note') {
      const note = action === 'note' ? (prompt(t('addNote')) || '') : '';
      store.addHighlight({ bookId: R.book.id, text: txt.slice(0, 500), page: R.txtIdx + 1, note, color: action === 'note' ? '#7ec8ff' : color });
      if (sel && sel.removeAllRanges) sel.removeAllRanges(); hideSelPop(); toast(t('added'));
    } else if (action === 'define') lookupWord(txt);
  });
}

async function lookupWord(text) {
  hideSelPop();
  const word = text.split(/\s+/)[0].replace(/[^\p{L}\p{N}''-]/gu, '');
  if (!word) return;
  const panel = $('#readerPanel');
  panel.classList.remove('hidden');
  panel.innerHTML = `<h3>📖 ${esc(word)}</h3><p class="muted">${t('dictLoading')}</p>`;
  const isLatin = /^[a-zA-Z'-]+$/.test(word);
  let html = '';
  if (isLatin) {
    try {
      const res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word));
      if (res.ok) {
        const data = await res.json();
        const entry = data[0];
        html = (entry.meanings || []).slice(0, 3).map(m =>
          `<p><strong style="color:var(--accent)">${esc(m.partOfSpeech)}</strong><br>${(m.definitions || []).slice(0, 2).map(d => '• ' + esc(d.definition)).join('<br>')}</p>`).join('');
      }
    } catch {}
  }
  if (!html) html = `<p class="muted">${t('dictNone')}</p>`;
  const trUrl = isLatin
    ? 'https://translate.google.com/?sl=en&tl=ar&text=' + encodeURIComponent(word)
    : 'https://translate.google.com/?sl=auto&tl=en&text=' + encodeURIComponent(word);
  panel.innerHTML = `<h3>📖 ${esc(word)}</h3>${html}
    <p style="margin-top:.6rem"><a href="${trUrl}" target="_blank" rel="noopener" style="color:var(--accent)">${t('translate')} ↗</a></p>`;
}

/* ================= TTS ================= */
function currentText() {
  if (R.rendition) {
    try { return (R.rendition.getContents()[0].document.body.innerText || '').slice(0, 2200); } catch { return ''; }
  }
  if (R.txtPages) return R.txtPages[R.txtIdx].slice(0, 2200);
  return ''; // pdf handled async in speakCurrent
}
// which language are we reading right now: the page text wins, then epub metadata,
// then title/author, then the UI language
function bookLangOf() {
  const fromPage = detectLang((currentText() || '').slice(0, 1200));
  if (fromPage) return fromPage;
  const meta = R && R.epub && R.epub.packaging && R.epub.packaging.metadata && String(R.epub.packaging.metadata.language || '').toLowerCase();
  if (meta) { if (/^ar\b/.test(meta)) return 'ar'; if (/^en\b/.test(meta)) return 'en'; }
  const fromTitle = detectLang(`${(R && R.book && R.book.title) || ''} ${(R && R.book && R.book.author) || ''}`);
  if (fromTitle) return fromTitle;
  return store.getState().settings.lang === 'en' ? 'en' : 'ar';
}
function savedVoiceFor(lang) {
  const s = store.getState().settings;
  return (s.ttsVoices || {})[lang] || s.ttsVoice || '';
}
async function speakCurrent() {
  if (!R || !R.ttsActive) return;
  let text = currentText();
  if (R.pdf) {
    try {
      const page = await R.pdf.getPage(R.pdfPage);
      const tc = await page.getTextContent();
      text = tc.items.map(i => i.str).join(' ').slice(0, 2200);
    } catch {}
  }
  text = (text || '').trim();
  if (!text) { R.ttsActive = false; const b = $('#ttsBtn'); if (b) b.style.color = ''; return; }
  if (!R || !R.ttsActive) return;
  const s = store.getState().settings;
  const lang = bookLangOf();
  if (!voices().length) await waitVoices(1200);
  const v = pickVoice(lang, savedVoiceFor(lang));
  const u = new SpeechSynthesisUtterance(text);
  u.rate = s.ttsRate || 1;
  // a voice object from an older voice list can be rejected by Chrome; the language still carries the read
  try { if (v) u.voice = v; } catch (e) { console.warn('tts voice rejected, using language default', e); }
  u.lang = (v && v.lang) || (lang === 'ar' ? 'ar-EG' : 'en-US');
  u.onend = () => { if (R && R.ttsActive) next(); };
  u.onerror = () => { if (R) R.ttsActive = false; const b = $('#ttsBtn'); if (b) b.style.color = ''; };
  try { speechSynthesis.speak(u); } catch (e) { console.warn('tts failed', e); if (R) R.ttsActive = false; }
}
function toggleTts() {
  if (!R) return;
  if (R.ttsActive) { R.ttsActive = false; speechSynthesis.cancel(); $('#ttsBtn').style.color = ''; toast(t('stop')); }
  else { R.ttsActive = true; $('#ttsBtn').style.color = 'var(--accent)'; toast(t('listening')); speakCurrent(); }
}

/* ================= reader chrome ================= */
let chromeBound = false;
function bindChrome() {
  if (chromeBound) return; chromeBound = true;
  const closeFloating = (e) => {
    const pn = $('#readerPanel'), sp = $('#selPop');
    if (pn && !pn.classList.contains('hidden') && !(e && e.target && e.target.closest && e.target.closest('#readerPanel,#readerSettingsBtn,#hlListBtn,#tocBtn,#imgBtn'))) pn.classList.add('hidden');
    if (sp && !sp.classList.contains('hidden') && !(e && e.target && e.target.closest && e.target.closest('#selPop'))) sp.classList.add('hidden');
  };
  document.addEventListener('pointerdown', closeFloating, true);
  window.__qariCloseFloating = closeFloating;
  document.addEventListener('selectionchange', () => { if (R && R.txtPages) maybeShowTxtSel(); });
  $('#prevZone').onclick = prev;
  $('#nextZone').onclick = next;
  document.addEventListener('keydown', e => {
    if (!R || $('#readerOverlay').classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') (document.documentElement.dir === 'rtl' ? next() : prev());
    if (e.key === 'ArrowRight') (document.documentElement.dir === 'rtl' ? prev() : next());
    if (e.key === 'Escape') closeReader();
  });
  $('#readerClose').onclick = closeReader;
  $('#ttsBtn').onclick = toggleTts;
  $('#tocBtn').onclick = () => { const p = $('#readerPanel'); if (!p.classList.contains('hidden') && p.dataset.kind === 'toc') { p.classList.add('hidden'); return; } showTocPanel(); };
  $('#imgBtn').onclick = () => { const p = $('#readerPanel'); if (!p.classList.contains('hidden') && p.dataset.kind === 'img') { p.classList.add('hidden'); return; } p._pos = null; showImagePanel(); };
  window.addEventListener('resize', () => { if (R && !$('#readerOverlay').classList.contains('hidden')) applyLayout(true); });
  $('#readerSettingsBtn').onclick = () => { const p = $('#readerPanel'); if (!p.classList.contains('hidden') && p.dataset.kind === 'settings') { p.classList.add('hidden'); return; } showSettingsPanel(); p.dataset.kind = 'settings'; };
  $('#hlListBtn').onclick = () => { const p = $('#readerPanel'); if (!p.classList.contains('hidden') && p.dataset.kind === 'hl') { p.classList.add('hidden'); return; } showHighlightsPanel(); p.dataset.kind = 'hl'; };
  $('#readerStage').addEventListener('click', (ev) => {
    if (!R || $('#readerOverlay').classList.contains('hidden')) return;
    if (Date.now() - (R.selAt || 0) < 500) return;
    const t = ev.target; if (t && t.closest && t.closest('a,button,input,textarea,select,#readerPanel,#selPop')) return;
    const sel = window.getSelection && window.getSelection();
    if (sel && sel.toString().trim()) { sel.removeAllRanges(); hideSelPop(); }
    toggleReaderChrome();
  });
}

function toggleReaderChrome() {
  const ov = $('#readerOverlay'); if (!ov) return;
  // bars are hidden with visibility (no layout change): resizing the epub mid-book shifted the column offset and lost the page
  ov.classList.toggle('chrome-hidden');
}

function showSettingsPanel() {
  const s = store.getState().settings;
  const panel = $('#readerPanel'); panel.classList.remove('hidden');
  if (panel._voiceOff) { panel._voiceOff(); panel._voiceOff = null; }   // stop listening to voiceschanged from the last render
  panel.innerHTML = `<h3>⚙ ${t('settings')}</h3>
    <div class="set-row"><span>${t('theme')}</span><div class="seg">
      <button data-th="light" class="${s.theme === 'light' ? 'active' : ''}">${t('themeLight')}</button>
      <button data-th="sepia" class="${s.theme === 'sepia' ? 'active' : ''}">${t('themeSepia')}</button>
      <button data-th="dark" class="${s.theme === 'dark' ? 'active' : ''}">${t('themeDark')}</button>
      <button data-th="black" class="${s.theme === 'black' ? 'active' : ''}">${t('themeBlack')}</button></div></div>
    <div style="margin-bottom:.6rem"><div style="font-size:.9rem;margin-bottom:.3rem">${t('fontFamily')}</div><div id="rFontHost"></div></div>
    <div class="set-row"><span>${t('fontSize')}</span><input type="range" id="rFs" min="15" max="28" value="${s.fontSize}"><span id="rFsV">${s.fontSize}</span></div>
    <div class="set-row"><span>${t('lineHeight')}</span><input type="range" id="rLh" min="14" max="26" value="${Math.round(s.lineHeight * 10)}"></div>
    <div class="set-row"><span>${t('readingMode')}</span><div class="seg">
      <button data-flow="paginated" class="${s.flow === 'paginated' ? 'active' : ''}">${t('paginated')}</button>
      <button data-flow="scrolled" class="${s.flow === 'scrolled' ? 'active' : ''}">${t('scrolled')}</button></div></div>
    <div class="set-row" style="align-items:flex-start;flex-direction:column;gap:.25rem"><span>${t('ttsVoice')} <span class="muted" id="rVoiceLang"></span></span>
      <div style="display:flex;gap:.4rem;align-items:center;width:100%">
        <select id="rVoice" style="flex:1;min-width:0"></select>
        <button class="btn" id="rVoiceTest">▶ ${t('ttsTest')}</button>
      </div>
      <div class="muted" id="rVoiceHint" style="font-size:.78rem"></div></div>
    <div class="set-row"><span>${t('ttsSpeed')}</span><input type="range" id="rRate" min="5" max="20" value="${Math.round((s.ttsRate || 1) * 10)}"><span id="rRateV">${s.ttsRate || 1}x</span></div>`;
  const upd = (patch) => { Object.assign(store.getState().settings, patch); store.save(); };
  panel.querySelector('#rFontHost').appendChild(fontPicker(s.fontFamily, id => { upd({ fontFamily: id }); if (R && R.rendition) applyEpubTheme(); if (R && R.txtPages) renderTxtPage(); }));
  panel.querySelectorAll('[data-th]').forEach(b => b.onclick = () => {
    upd({ theme: b.dataset.th }); document.body.dataset.theme = b.dataset.th;
    panel.querySelectorAll('[data-th]').forEach(x => x.classList.toggle('active', x === b));
    if (R && R.rendition) applyEpubTheme();
    if (R && R.txtPages) renderTxtPage();
  });
  panel.querySelectorAll('[data-flow]').forEach(b => b.onclick = () => {
    upd({ flow: b.dataset.flow });
    if (R && R.rendition) { const bk = R.book; closeReader(false); openReader(bk); }
  });
  panel.querySelector('#rFs').oninput = e => { upd({ fontSize: +e.target.value }); panel.querySelector('#rFsV').textContent = e.target.value; if (R && R.rendition) applyEpubTheme(); if (R && R.txtPages) renderTxtPage(); };
  panel.querySelector('#rLh').oninput = e => { upd({ lineHeight: +e.target.value / 10 }); if (R && R.rendition) applyEpubTheme(); if (R && R.txtPages) renderTxtPage(); };
  panel.querySelector('#rRate').oninput = e => { upd({ ttsRate: +e.target.value / 10 }); panel.querySelector('#rRateV').textContent = (+e.target.value / 10) + 'x'; };
  bindVoicePicker(panel);
}

/* ---- voice picker: every device voice, natural ones marked and preferred ---- */
// Windows/iOS voice names are long ("Microsoft Shakir Online (Natural) - Arabic (Egypt)");
// the language is already in the group label, so the row shows just the voice.
function shortVoiceName(v) {
  if (!v) return '';
  return String(v.name || v.voiceURI || '')
    .replace(/\s+[-–]\s+[^-–]*\([^)]*\)\s*$/, '')
    .replace(/^Microsoft\s+/i, '')
    .trim();
}
function bindVoicePicker(panel) {
  const sel = panel.querySelector('#rVoice'), hint = panel.querySelector('#rVoiceHint'), langEl = panel.querySelector('#rVoiceLang');
  if (!sel) return;
  const stopSpeaking = () => { if (R && R.ttsActive) { R.ttsActive = false; try { speechSynthesis.cancel(); } catch {} const b = $('#ttsBtn'); if (b) b.style.color = ''; } };
  const fill = () => {
    const L = bookLangOf();
    // Keep the picker focused on the languages Qari reads aloud: Arabic and English.
    const list = voices().filter(v => ['ar', 'en'].includes(baseLang(v.lang)));
    const saved = (store.getState().settings.ttsVoices || {})[L] || '';
    const auto = pickVoice(L, saved);
    if (langEl) langEl.textContent = '· ' + (L === 'ar' ? t('ttsLangAr') : t('ttsLangEn'));
    const groups = new Map();
    list.forEach(v => { const k = baseLang(v.lang) || '?'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(v); });
    const keys = [...groups.keys()].sort((a, b) => (a === L ? -1 : b === L ? 1 : a.localeCompare(b)));
    let html = `<option value="">${esc(t('ttsAutoVoice'))}${auto ? ' — ' + esc(shortVoiceName(auto)) : ''}</option>`;
    keys.forEach(k => {
      const arr = groups.get(k).slice().sort((a, b) => (isNatural(b) ? 1 : 0) - (isNatural(a) ? 1 : 0) || a.name.localeCompare(b.name));
      html += `<optgroup label="${esc((k === L ? '★ ' : '') + langLabel(k))}">` + arr.map(v =>
        `<option value="${esc(v.voiceURI)}" title="${esc(v.name + ' — ' + v.lang)}"${saved === v.voiceURI ? ' selected' : ''}>${esc(shortVoiceName(v))}${isNatural(v) ? ' ★' : ''}</option>`).join('') + '</optgroup>';
    });
    sel.innerHTML = html;
    sel.value = saved && list.some(v => v.voiceURI === saved) ? saved : '';
    const used = saved ? list.find(v => v.voiceURI === saved) : auto;
    if (hint) hint.textContent = !list.length ? t('ttsNoVoices')
      : isNatural(used) ? `${t('ttsNaturalOk')} — ${shortVoiceName(used)}`
      : t('ttsNaturalTip');
  };
  sel.onchange = () => {
    const L = bookLangOf(), uri = sel.value, st = store.getState().settings;
    st.ttsVoices = Object.assign({}, st.ttsVoices || {});
    if (uri) st.ttsVoices[L] = uri; else delete st.ttsVoices[L];
    store.save();
    fill();
    stopSpeaking();
    preview(uri ? voices().find(v => v.voiceURI === uri) : pickVoice(L, ''), L, store.getState().settings.ttsRate || 1);
  };
  panel.querySelector('#rVoiceTest').onclick = () => {
    const L = bookLangOf(), uri = sel.value;
    stopSpeaking();
    preview(uri ? voices().find(v => v.voiceURI === uri) : pickVoice(L, ''), L, store.getState().settings.ttsRate || 1);
  };
  fill();
  panel._voiceOff = onVoices(fill);   // devices hand the list over late; refresh when it arrives
}

function showHighlightsPanel() {
  const panel = $('#readerPanel'); panel.classList.remove('hidden');
  const hls = store.bookHighlights(R.book.id);
  panel.innerHTML = `<h3>🖊 ${t('highlights')} (${hls.length})</h3>
    <button id="expHl" class="btn" style="margin-bottom:.7rem">⬇ ${t('exportHighlights')} (Markdown)</button>
    <div id="hlPanelList"></div>`;
  const list = panel.querySelector('#hlPanelList');
  list.innerHTML = hls.length ? '' : `<p class="muted">${t('noHighlights')}</p>`;
  hls.forEach(h => {
    const row = document.createElement('div'); row.className = 'comment';
    row.innerHTML = `<div style="border-inline-start:3px solid ${esc(h.color)};padding-inline-start:.5rem">${esc(h.text)}${h.note ? `<div class="muted">📝 ${esc(h.note)}</div>` : ''}</div>
      <div style="margin-top:.3rem"><button class="icon-btn" style="font-size:.8rem" data-act="jump">↩</button><button class="icon-btn" style="font-size:.8rem" data-act="del">🗑</button></div>`;
    row.querySelector('[data-act=jump]').onclick = () => {
      if (h.cfi && R.rendition) R.rendition.display(h.cfi);
      else if (h.page && R.txtPages) { R.txtIdx = h.page - 1; renderTxtPage(); }
      else if (h.page && R.pdf) { R.pdfPage = h.page; renderPdfPage(); }
    };
    row.querySelector('[data-act=del]').onclick = () => { store.removeHighlight(h.id); showHighlightsPanel(); };
    list.appendChild(row);
  });
  panel.querySelector('#expHl').onclick = () => {
    const md = `# ${R.book.title} — ${R.book.author}\n\n` + hls.map(h => `> ${h.text}\n\n${h.note ? h.note + '\n\n' : ''}— *${new Date(h.createdAt).toLocaleDateString()}*\n`).join('\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (R.book.title || 'highlights') + '-highlights.md'; a.click();
    toast(t('exported'));
  };
}

export function closeReader(log = true) {
  if (!R) return;
  if (R.ttsActive) { R.ttsActive = false; speechSynthesis.cancel(); }
  const pn = $('#readerPanel');
  if (pn && pn._voiceOff) { pn._voiceOff(); pn._voiceOff = null; }
  clearInterval(R.timer);
  const mins = (Date.now() - R.startedAt) / 60000;
  if (log) store.logSession(R.book.id, mins, R.pagesTurned);
  savePosition();
  if (R.book.progress >= 99.5 && R.book.shelf !== 'finished') store.updateBook(R.book.id, { shelf: 'finished' });
  try { R.rendition && R.rendition.destroy(); } catch {}
  try { R.epub && R.epub.destroy(); } catch {}
  try { R.pdf && R.pdf.destroy(); } catch {}
  R = null;
  $('#readerStage').innerHTML = '';
  $('#readerOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}
