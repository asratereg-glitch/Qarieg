// community.js — ratings, reviews, activity feed, buddy reading (local + export/import merge)
import * as store from './store.js';
import { t, getLang } from './i18n.js';
import { esc, stars, fmtDate, toast } from './app.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function renderCommunity(view) {
  const st = store.getState();
  view.innerHTML = `
    <div class="view-head"><h1>${t('navCommunity')}</h1></div>
    <div class="stat-card" style="margin-bottom:1.4rem">
      <h3 style="margin-bottom:.6rem">👥 ${t('buddyRead')}</h3>
      <div class="search-row" style="max-width:360px"><input id="buddyName" placeholder="${t('buddyName')}" value="${esc(st.buddy.name || '')}"><button id="saveBuddy" class="btn">${t('save')}</button></div>
      <p class="muted" style="margin-bottom:.6rem">${getLang() === 'ar' ? 'سجّل تعليقاتك على فصول كتاب بتقراه مع صاحبك، وبادلوا الملفات: صدّر تعليقاتك وابعتها، واستورد تعليقاته — بتتدمج تلقائي.' : 'Comment on chapters of a book you read with a friend, then swap files: export your comments and import theirs — they merge automatically.'}</p>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <select id="buddyBook">${st.books.map(b => `<option value="${b.id}">${esc(b.title)}</option>`).join('')}</select>
        <input id="chapterName" placeholder="${t('chapters')}…" style="max-width:160px">
      </div>
      <div style="display:flex;gap:.5rem;margin-top:.5rem;align-items:flex-start">
        <textarea id="commentText" rows="2" style="flex:1" placeholder="${t('addComment')}"></textarea>
      </div>
      <div style="display:flex;gap:.5rem;margin-top:.5rem;flex-wrap:wrap">
        <button id="sendMe" class="btn btn-primary">${t('send')} (${t('asMe')})</button>
        <button id="sendBuddy" class="btn">${t('send')} (${t('asBuddy')})</button>
        <button id="expComments" class="btn">⬇ ${t('exportBuddy')}</button>
        <button id="impComments" class="btn">⬆ ${t('importBuddy')}</button>
        <input type="file" id="impFile" accept=".json" hidden>
      </div>
      <div id="commentsList" style="margin-top:1rem"></div>
    </div>
    <h2 style="margin-bottom:.7rem">${t('myActivity')}</h2>
    <div id="activityFeed"></div>`;
}

export function bindCommunity(view) {
  const st = store.getState();
  $('#saveBuddy', view).onclick = () => { st.buddy.name = $('#buddyName', view).value.trim(); store.save(); toast(t('added')); };
  const refreshComments = () => renderComments(view);
  $('#buddyBook', view).onchange = refreshComments;
  $('#sendMe', view).onclick = () => postComment(view, getLang() === 'ar' ? 'أنا' : 'Me', 'me');
  $('#sendBuddy', view).onclick = () => {
    const name = (st.buddy.name || '').trim();
    if (!name) { toast(t('buddyName')); return; }
    postComment(view, name, 'buddy');
  };
  $('#expComments', view).onclick = () => {
    const mine = st.comments.filter(c => c.origin === 'me');
    const blob = new Blob([JSON.stringify({ app: 'qari-comments', from: 'me', comments: mine }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'qari-comments.json'; a.click();
    toast(t('exported'));
  };
  $('#impComments', view).onclick = () => $('#impFile', view).click();
  $('#impFile', view).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const arr = data.comments || (data.data && data.data.comments) || [];
      let added = 0;
      const have = new Set(st.comments.map(c => c.id));
      arr.forEach(c => { if (c && c.id && !have.has(c.id)) { st.comments.push(c); added++; } });
      store.save(); toast(t('imported') + ` (${added})`); refreshComments(); e.target.value = '';
    } catch (err) { toast('⚠ ' + err.message, 3500); }
  };
  renderComments(view);
  renderActivity(view);
}

function postComment(view, author, origin) {
  const bookId = $('#buddyBook', view).value;
  const chapter = $('#chapterName', view).value.trim();
  const text = $('#commentText', view).value.trim();
  if (!bookId || !text) return;
  store.addComment({ bookId, chapter, author, text, origin });
  $('#commentText', view).value = '';
  renderComments(view);
}

function renderComments(view) {
  const bookId = $('#buddyBook', view).value;
  const list = $('#commentsList', view);
  const cms = store.bookComments(bookId);
  list.innerHTML = cms.length ? '' : '<p class="muted">—</p>';
  cms.forEach(c => {
    const d = document.createElement('div'); d.className = 'comment';
    d.innerHTML = `<div class="c-meta">${c.origin === 'buddy' ? '👤' : '🙂'} ${esc(c.author)} ${c.chapter ? '· ' + esc(c.chapter) : ''} · ${fmtDate(c.createdAt)}</div><div>${esc(c.text)}</div>`;
    list.appendChild(d);
  });
}

function renderActivity(view) {
  const st = store.getState();
  const host = $('#activityFeed', view);
  const feed = st.activity.slice(0, 30);
  host.innerHTML = feed.length ? '' : '<p class="muted">—</p>';
  feed.forEach(a => {
    const b = store.getBook(a.bookId);
    const d = document.createElement('div'); d.className = 'review-card';
    const icon = { rating: '⭐', review: '✍️', comment: '💬', finished: '✅' }[a.type] || '•';
    d.innerHTML = `<div class="rc-head"><strong>${icon} ${esc(b ? b.title : a.text || '')}</strong><span class="muted">${fmtDate(a.createdAt)}</span></div>
      ${b && b.rating ? `<div style="margin-top:.25rem"></div>` : ''}
      ${b && a.type === 'review' && b.review ? `<p style="margin-top:.3rem">${esc(b.review)}</p>` : ''}`;
    if (b && b.rating) d.querySelector('.rc-head').appendChild(stars(b.rating));
    host.appendChild(d);
  });
}
