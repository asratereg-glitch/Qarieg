// store.js — central state (localStorage) with versioning, sessions, streaks
const KEY = 'qari.state.v1';

const DEFAULTS = () => ({
  version: 1,
  settings: {
    lang: 'ar', theme: 'sepia', fontSize: 19, lineHeight: 1.9,
    fontFamily: 'auto', flow: 'paginated', ttsVoice: '', ttsRate: 1,
    goalYear: 24, goalMonth: 2, uiLangToggled: false, gbKey: '',
  },
  books: [],            // {id,title,author,format,cover,fileKey,source,addedAt,shelf,customShelves:[],progress,location,totalPages,currentPage,rating,review,subjects,isbn,finishedAt}
  customShelves: [],    // ["رف كذا"]
  highlights: [],       // {id,bookId,text,note,cfi,page,color,createdAt}
  sessions: [],         // {bookId,start,end,minutes,pages}
  readingDays: {},      // {"2026-11-25": minutes}
  achievements: {},     // {id: isoDate}
  comments: [],         // {id,bookId,chapter,author,text,createdAt,origin:'me'|'buddy'}
  lists: [],            // {id,name,desc,bookIds:[],createdAt}
  metaCache: {},        // olKey -> {ts, meta}
  buddy: { name: '' },
  activity: [],         // {type:'rating'|'review'|'comment'|'finished',bookId,text,createdAt}
});

let state = DEFAULTS();
const listeners = new Set();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = Object.assign(DEFAULTS(), parsed);
      state.settings = Object.assign(DEFAULTS().settings, parsed.settings || {});
    }
  } catch (e) { console.warn('state load failed, starting fresh', e); }
  return state;
}
export function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach(fn => fn(state));
}
export function getState(){ return state; }
export function onChange(fn){ listeners.add(fn); }

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const today = () => new Date().toISOString().slice(0, 10);

/* ---- books ---- */
export function addBook(book) {
  const b = Object.assign({
    id: uid(), title: 'بدون عنوان', author: '', format: 'txt', cover: '', fileKey: '',
    source: 'local', addedAt: new Date().toISOString(), shelf: 'want', customShelves: [],
    progress: 0, location: '', totalPages: 0, currentPage: 0, rating: 0, review: '',
    subjects: [], isbn: '', year: '', finishedAt: null, favorite: false, olKey: '',
  }, book);
  state.books.push(b); save(); return b;
}
export function getBook(id){ return state.books.find(b => b.id === id); }
export function updateBook(id, patch) {
  const b = getBook(id); if (!b) return null;
  Object.assign(b, patch);
  if (patch.shelf === 'finished' && !b.finishedAt) {
    b.finishedAt = new Date().toISOString(); b.progress = 100;
    pushActivity({ type: 'finished', bookId: id, text: b.title });
  }
  if (patch.rating !== undefined || patch.review !== undefined) {
    pushActivity({ type: patch.review !== undefined ? 'review' : 'rating', bookId: id, text: b.title });
  }
  save(); return b;
}
export function removeBook(id) {
  state.books = state.books.filter(b => b.id !== id);
  state.highlights = state.highlights.filter(h => h.bookId !== id);
  state.comments = state.comments.filter(c => c.bookId !== id);
  state.lists.forEach(l => { l.bookIds = l.bookIds.filter(x => x !== id); });
  save();
}

/* ---- shelves ---- */
export function addCustomShelf(name){ if (name && !state.customShelves.includes(name)) { state.customShelves.push(name); save(); } }
export function removeCustomShelf(name){
  state.customShelves = state.customShelves.filter(s => s !== name);
  state.books.forEach(b => b.customShelves = (b.customShelves || []).filter(s => s !== name));
  save();
}

/* ---- favorites & lists ---- */
export function toggleFavorite(id){ const b = getBook(id); if (!b) return false; b.favorite = !b.favorite; save(); return b.favorite; }
export function createList(name, desc = ''){ const l = { id: uid(), name: name.trim(), desc, bookIds: [], createdAt: new Date().toISOString() }; state.lists.push(l); save(); return l; }
export function getList(id){ return state.lists.find(l => l.id === id); }
export function updateList(id, patch){ const l = getList(id); if (l) { Object.assign(l, patch); save(); } }
export function deleteList(id){ state.lists = state.lists.filter(l => l.id !== id); save(); }
export function listHas(id, bookId){ const l = getList(id); return !!l && l.bookIds.includes(bookId); }
export function listToggleBook(id, bookId){ const l = getList(id); if (!l) return false; const i = l.bookIds.indexOf(bookId); if (i >= 0) l.bookIds.splice(i, 1); else l.bookIds.push(bookId); save(); return i < 0; }
export function listMove(id, bookId, dir){ const l = getList(id); if (!l) return; const i = l.bookIds.indexOf(bookId), j = i + dir; if (i < 0 || j < 0 || j >= l.bookIds.length) return; [l.bookIds[i], l.bookIds[j]] = [l.bookIds[j], l.bookIds[i]]; save(); }
export function listsOfBook(bookId){ return state.lists.filter(l => l.bookIds.includes(bookId)); }
export function findBookByOl(olKey){ return state.books.find(b => b.olKey === olKey); }
export function getMeta(olKey, maxAgeMs = 30 * 864e5){ const m = state.metaCache[olKey]; return m && (Date.now() - m.ts < maxAgeMs) ? m.meta : null; }
export function getMetaStale(olKey){ const m = state.metaCache[olKey]; return m ? m.meta : null; }
export function setMeta(olKey, meta){
  state.metaCache[olKey] = { ts: Date.now(), meta };
  const keys = Object.keys(state.metaCache);
  if (keys.length > 60) keys.sort((a, b) => state.metaCache[a].ts - state.metaCache[b].ts).slice(0, keys.length - 60).forEach(k => delete state.metaCache[k]);
  save();
}

/* ---- highlights ---- */
export function addHighlight(h){ const hl = Object.assign({ id: uid(), note: '', color: '#ffd54a', createdAt: new Date().toISOString() }, h); state.highlights.push(hl); save(); return hl; }
export function updateHighlight(id, patch){ const h = state.highlights.find(x => x.id === id); if (h) { Object.assign(h, patch); save(); } }
export function removeHighlight(id){ state.highlights = state.highlights.filter(x => x.id !== id); save(); }
export function bookHighlights(bookId){ return state.highlights.filter(h => h.bookId === bookId).sort((a,b) => a.createdAt.localeCompare(b.createdAt)); }

/* ---- sessions / stats ---- */
export function logSession(bookId, minutes, pages) {
  if (minutes <= 0) return;
  const s = { bookId, start: Date.now() - minutes * 60000, end: Date.now(), minutes: Math.round(minutes), pages: Math.max(0, Math.round(pages)) };
  state.sessions.push(s);
  const d = today();
  state.readingDays[d] = (state.readingDays[d] || 0) + s.minutes;
  checkAchievements();
  save();
}
export function sessionsThisYear(year = new Date().getFullYear()) {
  return state.sessions.filter(s => new Date(s.end).getFullYear() === year);
}
export function finishedThisYear(year = new Date().getFullYear()) {
  return state.books.filter(b => b.finishedAt && new Date(b.finishedAt).getFullYear() === year);
}
export function finishedThisMonth() {
  const n = new Date();
  return state.books.filter(b => { if (!b.finishedAt) return false; const d = new Date(b.finishedAt); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth(); });
}
export function currentStreak() {
  let streak = 0;
  const d = new Date();
  if (!state.readingDays[today()]) d.setDate(d.getDate() - 1); // today not yet read: count from yesterday
  while (state.readingDays[d.toISOString().slice(0, 10)] > 0) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

/* ---- achievements ---- */
const BADGES = [
  { id: 'first_book', icon: '📕', name: { ar: 'أول كتاب', en: 'First book' } },
  { id: 'five_books', icon: '📚', name: { ar: '٥ كتب', en: '5 books' } },
  { id: 'streak_3', icon: '🔥', name: { ar: '٣ أيام متواصلة', en: '3-day streak' } },
  { id: 'streak_7', icon: '⚡', name: { ar: 'أسبوع كامل', en: '7-day streak' } },
  { id: 'highlight_10', icon: '🖊', name: { ar: '١٠ هايلايتس', en: '10 highlights' } },
  { id: 'hour_10', icon: '⏰', name: { ar: '١٠ ساعات قراءة', en: '10 hours' } },
  { id: 'goal_year', icon: '🏆', name: { ar: 'هدف السنة', en: 'Yearly goal' } },
  { id: 'reviewer', icon: '✍️', name: { ar: 'ناقد', en: 'Reviewer' } },
];
export function badgeList(){ return BADGES.map(b => ({ ...b, unlocked: !!state.achievements[b.id], unlockedAt: state.achievements[b.id] })); }
function unlock(id){ if (!state.achievements[id]) state.achievements[id] = new Date().toISOString(); }
function checkAchievements() {
  const done = state.books.filter(b => b.finishedAt).length;
  if (done >= 1) unlock('first_book');
  if (done >= 5) unlock('five_books');
  const st = currentStreak();
  if (st >= 3) unlock('streak_3');
  if (st >= 7) unlock('streak_7');
  if (state.highlights.length >= 10) unlock('highlight_10');
  const mins = state.sessions.reduce((a, s) => a + s.minutes, 0);
  if (mins >= 600) unlock('hour_10');
  if (state.books.some(b => (b.review || '').trim().length > 10)) unlock('reviewer');
  if (state.settings.goalYear > 0 && finishedThisYear().length >= state.settings.goalYear) unlock('goal_year');
}
export function recheckAchievements(){ checkAchievements(); save(); }

/* ---- comments / activity ---- */
export function updateComment(id, patch){ const c = state.comments.find(x => x.id === id); if (c) { Object.assign(c, patch, { editedAt: new Date().toISOString() }); save(); } }
export function removeComment(id){ state.comments = state.comments.filter(x => x.id !== id); save(); }
export function addComment(c){ const cm = Object.assign({ id: uid(), createdAt: new Date().toISOString(), origin: 'me' }, c); state.comments.push(cm); pushActivity({ type: 'comment', bookId: c.bookId, text: c.text }, false); save(); return cm; }
export function bookComments(bookId){ return state.comments.filter(c => c.bookId === bookId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
function pushActivity(a, doSave = true){
  state.activity.unshift(Object.assign({ createdAt: new Date().toISOString() }, a));
  if (state.activity.length > 200) state.activity.length = 200;
  if (doSave) save();
}

/* ---- export / import ---- */
export function exportJSON() {
  return JSON.stringify({ app: 'qari', version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
}
export function importJSON(jsonText) {
  const incoming = JSON.parse(jsonText);
  const data = incoming.data || incoming;
  if (!data || !Array.isArray(data.books)) throw new Error('not a qari export');
  const mergeById = (cur, inc) => {
    const map = new Map(cur.map(x => [x.id, x]));
    inc.forEach(x => { if (x && x.id && !map.has(x.id)) { map.set(x.id, x); cur.push(x); } });
  };
  mergeById(state.books, data.books || []);
  mergeById(state.highlights, data.highlights || []);
  mergeById(state.sessions, data.sessions || []);
  mergeById(state.comments, data.comments || []);
  (data.lists || []).forEach(l => {
    const mine = state.lists.find(x => x.id === l.id);
    if (!mine) state.lists.push(l);
    else (l.bookIds || []).forEach(b => { if (!mine.bookIds.includes(b)) mine.bookIds.push(b); });
  });
  (data.books || []).forEach(b => { const mine = getBook(b.id); if (mine && b.favorite) mine.favorite = true; });
  (data.customShelves || []).forEach(s => { if (!state.customShelves.includes(s)) state.customShelves.push(s); });
  Object.entries(data.readingDays || {}).forEach(([d, m]) => { state.readingDays[d] = Math.max(state.readingDays[d] || 0, m); });
  Object.assign(state.achievements, data.achievements || {});
  state.activity = (data.activity || []).concat(state.activity).slice(0, 200);
  if (data.buddy && data.buddy.name && !state.buddy.name) state.buddy = data.buddy;
  recheckAchievements();
  save();
}

/* ---- full snapshot / restore (database file) ---- */
export function snapshot() { return JSON.parse(JSON.stringify(state)); }
export function replaceState(data) {
  if (!data || !Array.isArray(data.books)) throw new Error('not a qari database');
  state = Object.assign(DEFAULTS(), data);
  state.settings = Object.assign(DEFAULTS().settings, data.settings || {});
  save();
}
