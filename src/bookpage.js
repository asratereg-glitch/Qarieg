// bookpage.js — IMDb-style book page (library book or online work), favorites, lists, comments
import * as store from './store.js';
import * as db from './db.js';
import * as auth from './auth.js';
import { saveToMyLibrary, getPublicBook, publishExistingBook, deletePublicBook } from './public.js';
import { t, tr, getLang } from './i18n.js';
import { authorHTML, openAuthor, findCover, esc, stars, coverHTML, fmtDate, toast, pickBookFile, startReadingBook } from './app.js';
import { findBookHTML } from './findbook.js';
import { loadMeta, moreByAuthor, similarBooks, relatedBooks, worksByAuthor, cleanSubjects, coverUrl } from './meta.js';
import { openReader } from './reader.js';
import { seriesForBook } from './series.js';
import { seriesBoxHTML, bindSeriesLinks } from './author.js';

const $ = (s, r = document) => r.querySelector(s);
const nf = n => (n || 0).toLocaleString(getLang() === 'ar' ? 'ar-EG' : 'en-US');
let TOKEN = 0;

function shelfLabel(v) { return ({ want: t('shelf_want'), reading: t('shelf_reading'), finished: t('shelf_finished'), translations: t('shelf_translations') })[v] || v; }

function basicMeta(b) {
  return { olKey: b.olKey || '', title: b.title, author: b.author, cover: b.cover, subjects: b.subjects || [], isbn: b.isbn, pages: b.totalPages || 0, basic: true };
}

function ensureLib(meta) {
  const subj = cleanSubjects(meta.subjects);
  return store.addBook({ title: meta.title || '?', author: meta.author || '', format: 'web', cover: meta.cover || '', source: 'openlibrary',
    subjects: subj, isbn: meta.isbn || '', olKey: meta.olKey || '', year: meta.year || '', shelf: 'want', totalPages: meta.pages || 0 });
}

export async function renderBookPage(view, arg, kind) {
  let lib = null, olKey = '';
  if (kind === 'pub') {
    // Public book page: load the public row, resolve the user's saved copy.
    let pb = null;
    try { pb = await getPublicBook(arg); } catch (e) { view.innerHTML = `<p class="muted">⚠ ${esc(e.message || e)}</p>`; return; }
    if (!pb) { view.innerHTML = `<p class="muted">?</p>`; return; }
    lib = store.findBookByPublicId(pb.id);
    const meta = { olKey: pb.ol_key || '', title: pb.title, author: pb.author, cover: pb.cover, subjects: pb.subjects || [], isbn: pb.isbn || '', year: pb.year || '', description: pb.description || '', pages: 0 };
    draw(view, lib, meta, ++TOKEN, false, pb);
    return;
  }
  if (kind === 'book') {
    lib = store.getBook(arg);
    if (!lib) { view.innerHTML = `<p class="muted">?</p>`; return; }
    olKey = lib.olKey || '';
  } else {
    olKey = arg;
    lib = store.findBookByOl(arg);
    if (lib) { location.replace('#/book/' + lib.id); return; }
  }
  const tok = ++TOKEN;
  let meta = (olKey && store.getMeta(olKey)) || null;
  if (meta) { draw(view, lib, meta, tok); return; }
  draw(view, lib, lib ? basicMeta(lib) : { olKey, title: '…', author: '', subjects: [], basic: true }, tok, true);
  const fresh = await loadMeta(lib ? { olKey, title: lib.title, author: lib.author, isbn: lib.isbn, cover: lib.cover } : { olKey });
  if (tok !== TOKEN) return;
  if (lib && fresh.olKey) {
    const patch = {};
    if (!lib.olKey) patch.olKey = fresh.olKey;
    if (!lib.cover && fresh.cover) patch.cover = fresh.cover;
    if (!(lib.subjects || []).length) patch.subjects = cleanSubjects(fresh.subjects);
    if (!lib.isbn && fresh.isbn) patch.isbn = fresh.isbn;
    if (Object.keys(patch).length) store.updateBook(lib.id, patch);
  }
  draw(view, lib, fresh, tok);
}

function chip(text) { return `<span class="bp-chip">${esc(text)}</span>`; }

function ratingBox(label, value, count, extra = '') {
  if (!value) return `<div class="bp-rate muted-box"><div class="bp-rate-l">${label}</div><div class="bp-rate-v">—</div><div class="muted">${tr('مفيش تقييمات', 'no ratings')}</div></div>`;
  return `<div class="bp-rate"><div class="bp-rate-l">${label}</div><div class="bp-rate-v">★ ${value.toFixed(1)}<small>/5</small></div><div class="muted">${nf(count)} ${tr('تقييم', 'ratings')}${extra}</div></div>`;
}

function draw(view, lib, meta, tok, loading = false, pub = null) {
  const title = (lib && lib.title) || meta.title || '?';
  const author = (lib && lib.author) || meta.author || '';
  const cover = (lib && lib.cover) || meta.cover || '';
  const ol = meta.olKey;
  const subjects = cleanSubjects(meta.subjects && meta.subjects.length ? meta.subjects : (lib ? lib.subjects : [])).slice(0, 8);
  const gb = meta.gb;
  const hls = lib ? store.bookHighlights(lib.id) : [];
  const comments = lib ? store.bookComments(lib.id) : [];
  const myLists = lib ? store.listsOfBook(lib.id) : [];
  const shelfOpts = lib ? [['translations', t('shelf_translations')], ['want', t('shelf_want')], ['reading', t('shelf_reading')], ['finished', t('shelf_finished')], ...store.getState().customShelves.map(s => [s, s])] : [];
  const details = [
    [tr('العنوان', 'Title'), title], [tr('المؤلف', 'Author'), author], [tr('أول نشر', 'First published'), meta.year],
    [tr('عدد الصفحات', 'Pages'), meta.pages ? nf(meta.pages) : ''], [tr('عدد الإصدارات', 'Editions'), meta.editions ? nf(meta.editions) : ''],
    [tr('الناشر', 'Publisher'), meta.publisher || (gb && gb.publisher)], [tr('اللغات', 'Languages'), (meta.languages || []).join(', ')],
    ['ISBN', meta.isbn], [tr('الصيغة', 'Format'), lib && lib.format !== 'web' ? lib.format.toUpperCase() : ''],
  ].filter(r => r[1]);

  view.innerHTML = `
  <section class="bp-hero">
    <div class="bp-backdrop" style="${cover ? `background-image:url('${esc(cover)}')` : ''}"></div>
    <div class="bp-hero-inner">
      <div class="bp-poster"><div class="cover">${cover ? `<img src="${esc(cover)}" alt="">` : coverHTML({ title, format: lib ? lib.format : 'web' })}</div></div>
      <div class="bp-info">
        <h1>${esc(title)} ${meta.year ? `<span class="bp-year">(${esc(meta.year)})</span>` : ''}</h1>
        <div class="bp-sub">${author ? `<a href="#/discover" id="bpAuthor" class="bp-alink" title="${tr('كل كتب المؤلف', 'All books by this author')}">${esc(author)}</a>` : ''}${meta.pages ? ` · ${nf(meta.pages)} ${t('pages')}` : ''}${meta.editions ? ` · ${nf(meta.editions)} ${tr('إصدار', 'editions')}` : ''}</div>
        <div class="bp-chips">${subjects.map(chip).join('')}${loading ? `<span class="muted">${t('loading')}</span>` : ''}</div>
        <div class="bp-ratings">
          ${ratingBox('Open Library', meta.rating, meta.ratingCount)}
          ${gb ? ratingBox('Google Books', gb.rating, gb.count) : ''}
          <div class="bp-rate bp-mine"><div class="bp-rate-l">${tr('تقييمك', 'Your rating')}</div><div id="ratingHost"></div><div class="muted">${tr('اضغط النجوم', 'tap the stars')}</div></div>
        </div>
        ${meta.wantToRead || meta.alreadyRead || meta.currentlyReading ? `<div class="bp-community">🔖 ${nf(meta.wantToRead)} ${tr('عايزين يقروه', 'want to read')} · 📖 ${nf(meta.currentlyReading)} ${tr('بيقروه', 'reading')} · ✅ ${nf(meta.alreadyRead)} ${tr('قروه', 'have read')}</div>` : ''}
        <div class="bp-actions">
          ${lib ? `<button id="readBtn" class="btn btn-primary">▶ ${t('startReading')}</button><button id="attachBtn" class="btn" title="${tr('اختار ملف الكتاب من جهازك', 'Choose the book file from your device')}">📎 ${lib.fileKey ? tr('غيّر الملف', 'Change file') : tr('اربط ملف الكتاب', 'Link book file')}</button>` : ''}
          ${!lib ? `<button id="addLibBtn" class="btn btn-primary">＋ ${t(pub ? 'addToMyLibrary' : 'addToLibrary')}</button>` : ''}
          <button id="favBtn" class="btn ${lib && lib.favorite ? 'btn-fav on' : 'btn-fav'}">${lib && lib.favorite ? '❤' : '🤍'} ${tr('المفضلة', 'Favorite')}</button>
          <button id="listsBtn" class="btn">📋 ${tr('القوائم', 'Lists')}${myLists.length ? ` (${myLists.length})` : ''}</button>
          ${lib ? `<select id="shelfSel" title="${tr('الرف', 'Shelf')}">${shelfOpts.map(([v, l]) => `<option value="${esc(v)}" ${lib.shelf === v || (lib.customShelves || []).includes(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : ''}
          ${lib && lib.shelf !== 'finished' ? `<button id="finishBtn" class="btn">✓ ${t('markFinished')}</button>` : ''}
        </div>
        ${myLists.length ? `<div class="bp-chips" style="margin-top:.6rem">${myLists.map(l => `<a class="bp-chip link" href="#/lists/${l.id}">📋 ${esc(l.name)}</a>`).join('')}</div>` : ''}
      </div>
    </div>
  </section>

  ${lib ? `<div class="bp-progress"><div class="muted">${lib.format.toUpperCase()} · ${t('addedOn')} ${fmtDate(lib.addedAt)} ${lib.finishedAt ? '· ' + t('finishedOn') + ' ' + fmtDate(lib.finishedAt) : ''}</div>
    <div class="prog-track" style="height:8px"><div class="prog-fill" style="width:${Math.round(lib.progress)}%"></div></div>
    <div class="muted" style="margin-top:.3rem">${t('progress')}: ${Math.round(lib.progress)}%</div></div>` : ''}

  <div class="bp-cols">
    <div class="bp-main">
      <div class="chart-box"><h3>${tr('نبذة', 'Overview')}</h3>
        ${meta.description ? `<p class="bp-desc" id="descP" dir="auto">${esc(meta.description)}</p><button class="btn bp-more" id="moreDesc">${tr('اقرأ المزيد', 'Read more')}</button>` : `<p class="muted">${loading ? t('loading') : (meta.notFound ? tr('مفيش بيانات أونلاين للكتاب ده (أو مفيش نت).', 'No online data found for this book (or you are offline).') : tr('مفيش وصف متاح.', 'No description available.'))}</p>`}
        ${meta.firstSentence ? `<blockquote class="bp-quote" dir="auto">“${esc(meta.firstSentence)}”<div class="muted">${tr('أول جملة', 'First sentence')}</div></blockquote>` : ''}
      </div>

      <div id="seriesBox"></div>

      ${findBookHTML(title, author)}

      <div class="chart-box"><h3>💬 ${tr('تعليقاتي', 'My comments')} (${comments.length})</h3>
        <div class="bp-composer">
          <textarea id="cmText" rows="2" placeholder="${tr('اكتب تعليقك على الكتاب أو فصل…', 'Write a comment on the book or a chapter…')}"></textarea>
          <div class="bp-composer-row"><input id="cmChapter" placeholder="${tr('الفصل / الصفحة (اختياري)', 'Chapter / page (optional)')}"><button id="cmAdd" class="btn btn-primary">${t('send')}</button></div>
        </div>
        <div id="cmList"></div>
      </div>

      ${lib ? `<div class="chart-box"><h3>✍️ ${t('writeReview')}</h3>
        <textarea id="reviewBox" rows="3" style="width:100%">${esc(lib.review || '')}</textarea>
        <button id="saveReview" class="btn" style="margin-top:.4rem">${t('save')}</button></div>
      <div class="chart-box"><h3>🖊 ${t('highlights')} (${hls.length})</h3><div id="hlList"></div></div>` : ''}

      <h2 class="bp-h2" id="authorRowT" ${author ? '' : 'hidden'}>${tr('كمان للمؤلف', 'More by this author')}</h2><div class="award-row" id="authorRow"></div>
      <h2 class="bp-h2" id="simRowT">${tr('كتب مشابهة', 'More like this')}</h2><div class="award-row" id="simRow"></div>
    </div>
    <aside class="bp-side">
      <div class="chart-box"><h3>${tr('التفاصيل', 'Details')}</h3>
        <table class="bp-table">${details.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
        <div class="bp-links">${ol ? `<a href="https://openlibrary.org/works/${esc(ol)}" target="_blank" rel="noopener">Open Library ↗</a>` : ''}${gb && gb.link ? `<a href="${esc(gb.link)}" target="_blank" rel="noopener">Google Books ↗</a>` : ''}</div>
      </div>
      ${meta.authorKey && (meta.authorBio || meta.authorPhoto) ? `<div class="chart-box"><h3>${tr('عن المؤلف', 'About the author')}</h3>
        <div class="bp-author">${meta.authorPhoto ? `<img src="${esc(meta.authorPhoto)}" alt="">` : ''}<div><strong>${esc(author)}</strong>
        <div class="muted">${esc([meta.authorBorn, meta.authorDied].filter(Boolean).join(' – '))}</div></div></div>
        ${meta.authorBio ? `<p class="bp-bio" dir="auto">${esc(meta.authorBio)}</p>` : ''}</div>` : ''}
      ${lib ? `<button id="delBtn" class="btn btn-danger" style="width:100%">🗑 ${t('removeBook')}</button>` : ''}
      ${lib && auth.isAdmin() && !lib.public_book_id ? `<button id="pubBtn" class="btn" style="width:100%;margin-top:.5rem">📢 ${t('publishToPublic')}</button>` : ''}
      ${pub && auth.isAdmin() ? `<button id="delPubBtn" class="btn btn-danger" style="width:100%;margin-top:.5rem">🗑 ${t('removeFromPublic')}</button>` : ''}
    </aside>
  </div>`;

  const redraw = () => draw(view, lib, meta, tok, false, pub);
  // make sure the book exists in the library before mutating; returns the (possibly new) book
  // (public books are saved via the shared helper: copy, don't reference)
  const need = () => { if (!lib) { lib = pub ? saveToMyLibrary(pub) : ensureLib(meta); toast(t('added')); } return lib; };
  const after = (created) => { if (created) location.hash = '#/book/' + lib.id; else redraw(); };

  $('#ratingHost', view).appendChild(stars(lib ? lib.rating : 0, true, v => { const c = !lib; need(); store.updateBook(lib.id, { rating: v }); after(c); }));
  const rb = $('#readBtn', view); if (rb) rb.onclick = () => startReadingBook(lib);
  const ab = $('#attachBtn', view); if (ab) ab.onclick = async () => { if (await pickBookFile(lib)) renderBookPage(view, arg, kind); };
  const ab2 = $('#addLibBtn', view); if (ab2) ab2.onclick = () => { need(); after(true); };
  $('#favBtn', view).onclick = () => { const c = !lib; need(); const on = store.toggleFavorite(lib.id); toast(on ? '❤ ' + tr('اتضاف للمفضلة', 'Added to favorites') : tr('اتشال من المفضلة', 'Removed from favorites')); after(c); };
  $('#listsBtn', view).onclick = () => openListsPicker(() => { const c = !lib; need(); return { lib, created: c }; }, () => lib, () => { if (lib) redraw(); });
  const sel = $('#shelfSel', view);
  if (sel) sel.onchange = e => {
    const v = e.target.value;
    if (['want', 'reading', 'finished', 'translations'].includes(v)) store.updateBook(lib.id, { shelf: v });
    else { const cs = new Set(lib.customShelves || []); cs.has(v) ? cs.delete(v) : cs.add(v); store.updateBook(lib.id, { customShelves: [...cs] }); }
    redraw();
  };
  const fb = $('#finishBtn', view); if (fb) fb.onclick = () => { store.updateBook(lib.id, { shelf: 'finished' }); redraw(); };
  const dl = $('#delBtn', view);
  if (dl) dl.onclick = async () => {
    if (!confirm(t('confirmDelete'))) return;
    if (lib.fileKey) await db.deleteFile(lib.fileKey).catch(() => {});
    store.removeBook(lib.id); location.hash = '#/';
  };
  const pbBtn = $('#pubBtn', view);
  if (pbBtn) pbBtn.onclick = async () => {
    pbBtn.disabled = true;
    try { const pb = await publishExistingBook(lib); toast(t('published')); location.hash = '#/pub/' + pb.id; }
    catch (e) { toast('⚠ ' + (e.message || e), 5000); pbBtn.disabled = false; }
  };
  const dpb = $('#delPubBtn', view);
  if (dpb) dpb.onclick = async () => {
    if (!confirm(t('confirmDeletePublic'))) return;
    dpb.disabled = true;
    try { await deletePublicBook(pub.id); toast(t('removedFromPublic')); location.hash = '#/'; }
    catch (e) { toast('⚠ ' + (e.message || e), 5000); dpb.disabled = false; }
  };
  const sr = $('#saveReview', view); if (sr) sr.onclick = () => { store.updateBook(lib.id, { review: $('#reviewBox', view).value }); toast(t('added')); };
  const md = $('#moreDesc', view);
  if (md) { const p = $('#descP', view); md.onclick = () => { const open = p.classList.toggle('open'); md.textContent = open ? tr('أقل', 'Show less') : tr('اقرأ المزيد', 'Read more'); }; if (meta.description.length < 480) md.remove(); }

  // comments
  $('#cmAdd', view).onclick = () => {
    const text = $('#cmText', view).value.trim(); if (!text) return;
    const c = !lib; need();
    store.addComment({ bookId: lib.id, chapter: $('#cmChapter', view).value.trim(), author: tr('أنا', 'Me'), text, origin: 'me' });
    after(c);
  };
  const cmHost = $('#cmList', view);
  cmHost.innerHTML = comments.length ? '' : `<p class="muted">${tr('لسه مفيش تعليقات.', 'No comments yet.')}</p>`;
  comments.forEach(c => {
    const row = document.createElement('div'); row.className = 'comment';
    row.innerHTML = `<div class="c-meta">${c.origin === 'buddy' ? '👤' : '🙂'} ${esc(c.author)} ${c.chapter ? '· ' + esc(c.chapter) : ''} · ${fmtDate(c.createdAt)}${c.editedAt ? ' · ' + tr('معدّل', 'edited') : ''}
      <span class="c-actions"><button class="icon-btn" data-a="edit" title="${t('edit')}">✎</button><button class="icon-btn" data-a="del" title="${t('delete')}">🗑</button></span></div><div dir="auto" style="white-space:pre-wrap">${esc(c.text)}</div>`;
    row.querySelector('[data-a=del]').onclick = () => { if (confirm(tr('تحذف التعليق؟', 'Delete this comment?'))) { store.removeComment(c.id); redraw(); } };
    row.querySelector('[data-a=edit]').onclick = () => {
      const txt = prompt(t('edit'), c.text);
      if (txt !== null && txt.trim()) { store.updateComment(c.id, { text: txt.trim() }); redraw(); }
    };
    cmHost.appendChild(row);
  });

  // highlights
  const hlHost = $('#hlList', view);
  if (hlHost) {
    hlHost.innerHTML = hls.length ? '' : `<p class="muted">${t('noHighlights')}</p>`;
    hls.forEach(h => {
      const row = document.createElement('div'); row.className = 'review-card';
      row.innerHTML = `<div style="border-inline-start:4px solid ${esc(h.color)};padding-inline-start:.7rem">
        <div style="font-family:var(--font-read-ar)">${esc(h.text)}</div>
        ${h.note ? `<div class="muted" style="margin-top:.3rem">📝 ${esc(h.note)}</div>` : ''}
        <div class="muted" style="font-size:.72rem;margin-top:.3rem">${fmtDate(h.createdAt)} <button class="icon-btn" style="font-size:.8rem">🗑</button></div></div>`;
      row.querySelector('button').onclick = () => { store.removeHighlight(h.id); redraw(); };
      hlHost.appendChild(row);
    });
  }

  const aLink = view.querySelector('#bpAuthor');
  if (aLink) aLink.onclick = e => {
    e.preventDefault();
    openAuthor(author);
  };

  // lazy rows (only after the full meta is in, and only once per render)
  if (!loading) {
    const mini = it => {
      const c = document.createElement('div'); c.className = 'book-card bp-mini';
      c.innerHTML = `<div class="cover">${it.cover ? `<img src="${esc(it.cover)}" loading="lazy" alt="">` : `<div class="cover-fallback">📕<small>${esc(it.title)}</small></div>`}</div>
        <div class="book-meta"><div class="book-title">${esc(it.title)}</div><div class="book-author">${authorHTML(it.author)}${it.rating ? ' · ★ ' + it.rating.toFixed(1) : ''}</div></div>`;
      c.onclick = async () => {
        if (it.olKey) { location.hash = '#/work/' + it.olKey; return; }
        const f = await findCover(it.title, it.author).catch(() => null);
        if (f && f.olKey) location.hash = '#/work/' + f.olKey;
        else { try { sessionStorage.setItem('qari.pendingSearch', JSON.stringify({ q: it.title, scope: 'title' })); } catch {} location.hash = '#/discover'; if (window.__qariDiscoverPending) window.__qariDiscoverPending(); }
      };
      return c;
    };
    const fill = (id, titleId, p) => p.then(items => {
      if (tok !== TOKEN) return;
      const host = document.getElementById(id); if (!host) return;
      const ti = document.getElementById(titleId);
      if (!items.length) { if (ti) ti.hidden = true; return; }
      if (ti) ti.hidden = false;
      items.forEach(i => host.appendChild(mini(i)));
    }).catch(() => { const ti = document.getElementById(titleId); if (ti) ti.hidden = true; });
    const curTitle = (lib && lib.title) || meta.title;
    const sb = document.getElementById('seriesBox');
    if (sb && author) {
      sb.innerHTML = `<div class="chart-box"><h3>📚 ${tr('السلسلة', 'Series')}</h3><p class="muted">${tr('بدوّر على السلسلة…', 'Checking for a series…')}</p></div>`;
      seriesForBook({ title: curTitle, author, olAuthorKey: meta.authorKey }).then(r => {
        if (tok !== TOKEN) return; const el = document.getElementById('seriesBox'); if (!el) return;
        if (!r) { el.innerHTML = `<div class="chart-box"><h3>📚 ${tr('السلسلة', 'Series')}</h3><p class="muted">${tr('مفيش معلومات سلسلة لكتاب ده في Wikidata. ممكن يكون ستاند ألون، أو السلسلة مش متسجلة (التغطية ضعيفة للكتب العربية).', 'No series info for this book on Wikidata. It may be a standalone, or the series just is not recorded there (coverage is weak for Arabic books).')} <a href="#" id="seriesAuthorLink">${tr('كل كتب المؤلف', 'All books by this author')}</a></p></div>`; const l = el.querySelector('#seriesAuthorLink'); if (l) l.onclick = e => { e.preventDefault(); openAuthor(author); }; return; }
        const pos = r.position != null ? `${tr('الكتاب رقم', 'Book')} ${r.position} ${tr('من', 'of')} ${r.total}` : `${tr('الكتاب', 'Book')} ${r.index + 1} ${tr('من', 'of')} ${r.total}`;
        el.innerHTML = `<div class="chart-box"><h3>📚 ${tr('السلسلة', 'Series')}: ${esc(r.series.name)}</h3><p class="muted" style="margin-bottom:.4rem">${pos} · ${tr('المصدر: Wikidata', 'Source: Wikidata')}</p>${seriesBoxHTML(r.series, curTitle, author).replace(/^<div class="series-card"><h3>.*?<\/h3>/, '<div class="series-card">')}</div>`;
        bindSeriesLinks(el);
      }).catch(() => { const el = document.getElementById('seriesBox'); if (el) el.innerHTML = `<div class="chart-box"><h3>📚 ${tr('السلسلة', 'Series')}</h3><p class="muted">${tr('تعذّر تحميل معلومات السلسلة دلوقتي.', 'Could not load series info right now.')}</p></div>`; });
    }
    const authorItems = (async () => {
      let items = meta.authorKey ? await moreByAuthor(meta.authorKey, meta.olKey).catch(() => []) : [];
      if (!items.length && author) items = (await worksByAuthor(author, 0, 14).catch(() => ({ items: [] }))).items.filter(x => x.olKey !== meta.olKey && x.title !== curTitle).slice(0, 12);
      return items;
    })();
    fill('authorRow', 'authorRowT', authorItems);
    fill('simRow', 'simRowT', relatedBooks({ subjects: meta.subjects || (lib && lib.subjects) || [], olKey: meta.olKey, authorKey: meta.authorKey, title: curTitle, author }));
  }
}

/* ---------- add-to-list popup ---------- */
export function openListsPicker(getBook, peekBook, onDone) {
  const m = document.createElement('div'); m.className = 'modal';
  const render = () => {
    const lists = store.getState().lists;
    m.innerHTML = `<div class="modal-card" style="max-width:420px"><div class="modal-head"><h2>📋 ${tr('أضف لقائمة', 'Add to list')}</h2><button class="icon-btn" id="lpClose">✕</button></div>
      <div id="lpRows">${lists.length ? '' : `<p class="muted">${tr('معندكش قوائم لسه. اعمل أول واحدة:', 'No lists yet. Create your first:')}</p>`}</div>
      <div class="search-row" style="margin-top:.8rem"><input id="lpName" placeholder="${tr('اسم قائمة جديدة…', 'New list name…')}"><button id="lpNew" class="btn btn-primary">＋</button></div></div>`;
    const host = m.querySelector('#lpRows');
    lists.forEach(l => {
      const lab = document.createElement('label'); lab.className = 'lp-row';
      const pb = peekBook(); const cur = !!pb && store.listHas(l.id, pb.id);
      lab.innerHTML = `<input type="checkbox" ${cur ? 'checked' : ''}><span>${esc(l.name)}</span><span class="muted">${l.bookIds.length}</span>`;
      lab.querySelector('input').onchange = () => {
        const { lib, created } = getBook(); store.listToggleBook(l.id, lib.id);
        if (created) { m.remove(); location.hash = '#/book/' + lib.id; } else { onDone(); render(); }
      };
      host.appendChild(lab);
    });
    m.querySelector('#lpClose').onclick = () => { m.remove(); onDone(); };
    const mk = () => {
      const name = m.querySelector('#lpName').value.trim(); if (!name) return;
      const l = store.createList(name); const { lib, created } = getBook(); store.listToggleBook(l.id, lib.id);
      if (created) { m.remove(); location.hash = '#/book/' + lib.id; } else { onDone(); render(); }
    };
    m.querySelector('#lpNew').onclick = mk;
    m.querySelector('#lpName').addEventListener('keydown', e => { if (e.key === 'Enter') mk(); });
  };
  m.addEventListener('click', e => { if (e.target === m) { m.remove(); onDone(); } });
  document.body.appendChild(m); render();
}
