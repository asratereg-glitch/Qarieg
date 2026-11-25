// sync.js — sync the Qari data (and book files) to a PRIVATE GitHub repo through the contents API.
// Token is stored only on this device (localStorage 'qari.sync'), never inside the library data or backups.
import * as db from './db.js';
import * as store from './store.js';

const KEY = 'qari.sync';
const API = 'https://api.github.com';
const DATA_PATH = 'data.json';
const MAX_FILE = 40 * 1024 * 1024;
const PUSH_DELAY = 12000, POLL_MS = 90000;

let meta = { token: '', owner: '', repo: 'qari-data', sha: null, hash: null, changedAt: 0, lastSync: 0 };
let status = 'off';           // off | idle | syncing | error | conflict
let lastError = '', lastNote = '', conflictNote = '', conflictBackup = null;
let busy = false, rerun = false, applying = false, pushTimer = null, pollTimer = null;
const subs = new Set();
let hooks = { onApplied: () => {}, confirm: msg => window.confirm(msg), lang: () => 'ar' };

const emit = () => subs.forEach(f => { try { f(); } catch {} });
const setStatus = (s, err = '') => { status = s; lastError = err; emit(); };
const saveMeta = () => localStorage.setItem(KEY, JSON.stringify(meta));
const tt = (ar, en) => (hooks.lang() === 'ar' ? ar : en);

export const onStatus = fn => subs.add(fn);
export const configure = h => Object.assign(hooks, h);
export const info = () => ({
  status, error: lastError, note: lastNote, conflictNote, connected: !!meta.token,
  owner: meta.owner, repo: meta.repo, lastSync: meta.lastSync, hasConflictBackup: !!conflictBackup,
});

/* ---------- helpers ---------- */
function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function syncState(s) {            // what gets synced (no caches, no API keys)
  const c = JSON.parse(JSON.stringify(s));
  delete c.metaCache; if (c.settings) delete c.settings.gbKey;
  return c;
}
const hashNow = () => canon(syncState(store.getState()));
const isEmptyLib = () => { const s = store.getState(); return !s.books.length && !s.lists.length && !s.highlights.length && !s.comments.length; };
const b64 = str => { const bytes = new TextEncoder().encode(str); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0)));
const blobToB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
const enc = p => p.split('/').map(encodeURIComponent).join('/');

async function gh(method, path, body, accept) {
  const r = await fetch(API + path + (method === 'GET' ? (path.includes('?') ? '&' : '?') + '_=' + Date.now() : ''), {
    method, cache: 'no-store',
    headers: Object.assign({ Authorization: 'Bearer ' + meta.token, Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  return r;
}
const repoPath = () => `/repos/${encodeURIComponent(meta.owner)}/${encodeURIComponent(meta.repo)}`;
async function errOf(r) { let m = ''; try { m = (await r.json()).message || ''; } catch {} return `GitHub ${r.status}${m ? ': ' + m : ''}`; }

/* ---------- remote data ---------- */
async function getRemote() {
  const r = await gh('GET', `${repoPath()}/contents/${DATA_PATH}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(await errOf(r));
  const j = await r.json();
  let text;
  if (j.encoding === 'base64' && j.content) text = unb64(j.content);
  else { const rr = await gh('GET', `${repoPath()}/contents/${DATA_PATH}`, null, 'application/vnd.github.raw'); if (!rr.ok) throw new Error(await errOf(rr)); text = await rr.text(); }
  const doc = JSON.parse(text);
  if (!doc || doc.format !== 'qari-sync' || !doc.state || !Array.isArray(doc.state.books)) throw new Error(tt('الملف في الريبو مش بتاع قارئ', 'data.json in the repo is not a Qari file'));
  return { sha: j.sha, doc };
}
async function pushData(sha) {
  const doc = { format: 'qari-sync', version: 1, savedAt: new Date().toISOString(), state: syncState(store.getState()) };
  const hash = canon(doc.state);
  const body = { message: 'Qari sync ' + doc.savedAt, content: b64(JSON.stringify(doc)) };
  if (sha) body.sha = sha;
  const r = await gh('PUT', `${repoPath()}/contents/${DATA_PATH}`, body);
  if (r.status === 409 || r.status === 422) return { conflict: true };
  if (!r.ok) throw new Error(await errOf(r));
  const j = await r.json();
  meta.sha = j.content.sha; meta.hash = hash; meta.lastSync = Date.now(); saveMeta();
  return { ok: true };
}
async function applyRemote(remote, why) {
  if (!isEmptyLib() && canon(syncState(remote.doc.state)) !== hashNow()) {   // keep local copy of what we overwrite
    conflictBackup = JSON.stringify({ format: 'qari-sync', savedAt: new Date().toISOString(), state: syncState(store.getState()) });
  }
  const local = store.getState();
  const data = Object.assign({}, remote.doc.state, { metaCache: local.metaCache || {} });
  data.settings = Object.assign({}, data.settings || {}, { gbKey: (local.settings && local.settings.gbKey) || '' });
  applying = true;
  try { store.replaceState(data); } finally { applying = false; }
  meta.sha = remote.sha; meta.hash = hashNow(); meta.lastSync = Date.now(); meta.changedAt = 0; saveMeta();
  try { hooks.onApplied(); } catch {}
  lastNote = why || '';
}

/* ---------- book files ---------- */
async function syncFiles() {
  const books = store.getState().books.filter(b => b.fileKey && b.format !== 'web');
  if (!books.length) return;
  const r = await gh('GET', `${repoPath()}/contents/files`);
  let remote = new Set();
  if (r.ok) (await r.json()).forEach(f => remote.add(f.name)); else if (r.status !== 404) throw new Error(await errOf(r));
  const local = new Set(await db.allFileKeys());
  let skipped = 0;
  for (const b of books) {
    const k = b.fileKey;
    if (local.has(k) && !remote.has(k)) {
      const blob = await db.getFile(k); if (!blob) continue;
      if (blob.size > MAX_FILE) { skipped++; continue; }
      const pr = await gh('PUT', `${repoPath()}/contents/files/${enc(k)}`, { message: 'Qari book file ' + k, content: await blobToB64(blob) });
      if (!pr.ok && pr.status !== 422) throw new Error(await errOf(pr));
    } else if (!local.has(k) && remote.has(k)) {
      const dr = await gh('GET', `${repoPath()}/contents/files/${enc(k)}`, null, 'application/vnd.github.raw');
      if (!dr.ok) throw new Error(await errOf(dr));
      await db.putFile(k, await dr.blob());
    }
  }
  if (skipped) lastNote = tt(`${skipped} كتاب أكبر من 40MB ما اترفعش`, `${skipped} book file(s) over 40MB were not uploaded`);
}

/* ---------- main cycle ---------- */
export async function syncNow(reason = 'manual') {
  if (!meta.token) return false;
  if (busy) { rerun = true; return false; }
  busy = true; clearTimeout(pushTimer); lastNote = ''; setStatus('syncing');
  try {
    const remote = await getRemote();
    const h = hashNow();
    if (!remote) {
      if (!isEmptyLib()) { const p = await pushData(null); if (p.conflict) { rerun = true; } }
    } else if (!meta.sha) {                       // first connect on this device
      if (isEmptyLib() || canon(syncState(remote.doc.state)) === h) await applyRemote(remote, '');
      else if (hooks.confirm(tt('الريبو فيه بيانات والجهاز ده كمان فيه بيانات.\nOK = استخدم بيانات الريبو (بيانات الجهاز بتتحفظ نسخة تقدر تنزلها).\nCancel = ارفع بيانات الجهاز فوق الريبو.', 'The repo has data and this device has data too.\nOK = use the repo data (this device\'s data is kept as a downloadable copy).\nCancel = upload this device\'s data over the repo.')))
        { await applyRemote(remote, tt('اتستخدمت بيانات الريبو', 'Repo data was used')); }
      else { const p = await pushData(remote.sha); if (p.conflict) rerun = true; }
    } else if (remote.sha === meta.sha) {
      if (h !== meta.hash) { const p = await pushData(meta.sha); if (p.conflict) rerun = true; }
    } else {                                       // remote changed since our last sync
      const dirty = h !== meta.hash;
      if (canon(syncState(remote.doc.state)) === h) { meta.sha = remote.sha; meta.hash = h; meta.lastSync = Date.now(); saveMeta(); }
      else if (!dirty) await applyRemote(remote, '');
      else {                                       // both sides changed: last write wins
        const remoteAt = Date.parse(remote.doc.savedAt) || 0;
        if (remoteAt >= (meta.changedAt || 0)) {
          await applyRemote(remote, '');
          conflictNote = tt('⚠ تعارض: اتعدّل من جهازين. اتاخدت النسخة الأحدث (من الجهاز التاني) ونسخة الجهاز ده اتحفظت وتقدر تنزلها.', '⚠ Conflict: edited on two devices. The newer version (from the other device) was kept; this device\'s copy was saved and can be downloaded.');
        } else {
          const p = await pushData(remote.sha); if (p.conflict) rerun = true;
          conflictNote = tt('⚠ تعارض: اتعدّل من جهازين. اتاخدت النسخة الأحدث (بتاعة الجهاز ده) واتحفظت في الريبو. القديمة موجودة في تاريخ الريبو (commits).', '⚠ Conflict: edited on two devices. The newer version (this device) was kept and pushed. The older one is in the repo history (commits).');
        }
        conflictNote = conflictNote + ' (' + new Date().toLocaleTimeString() + ')';
      }
    }
    if (!rerun) await syncFiles();
    setStatus('idle');
    return true;
  } catch (e) {
    console.error(e); setStatus('error', e.message || String(e)); return false;
  } finally {
    busy = false;
    if (rerun) { rerun = false; setTimeout(() => syncNow('rerun'), 500); }
  }
}

/* ---------- change tracking ---------- */
function onLocalChange() {
  if (applying || !meta.token) return;
  if (hashNow() === meta.hash) return;
  meta.changedAt = Date.now(); saveMeta();
  clearTimeout(pushTimer); pushTimer = setTimeout(() => syncNow('auto'), PUSH_DELAY);
}

/* ---------- connect / disconnect ---------- */
export async function connect(owner, repo, token) {
  owner = (owner || '').trim(); repo = (repo || '').trim(); token = (token || '').trim();
  if (!owner || !repo || !token) throw new Error(tt('املا الخانات التلاتة', 'Fill all three fields'));
  const prev = meta;
  meta = { token, owner, repo, sha: null, hash: null, changedAt: 0, lastSync: 0 };
  try {
    const r = await gh('GET', repoPath());
    if (r.status === 404 || r.status === 403 || r.status === 401) throw new Error(tt('مش قادر أدخل على الريبو. اتأكد من الاسم والتوكن وإنه مدّي Contents قراءة وكتابة للريبو ده.', 'Cannot reach the repo. Check the name, and that the token has Contents read and write on it.'));
    if (!r.ok) throw new Error(await errOf(r));
    const j = await r.json();
    if (!j.private) throw new Error(tt('الريبو ده عام (Public). بياناتك لازم تتحفظ في ريبو خاص (Private).', 'This repo is public. Your data must go to a private repo.'));
    if (j.permissions && j.permissions.push === false) throw new Error(tt('التوكن مفيهوش صلاحية كتابة على الريبو.', 'The token has no write access to the repo.'));
  } catch (e) { meta = prev; throw e; }
  saveMeta(); setStatus('idle'); startPolling();
  return syncNow('connect');
}
export function disconnect() {
  meta = { token: '', owner: '', repo: 'qari-data', sha: null, hash: null, changedAt: 0, lastSync: 0 };
  localStorage.removeItem(KEY); clearTimeout(pushTimer); clearInterval(pollTimer); conflictBackup = null; lastNote = ''; conflictNote = '';
  setStatus('off');
}
export function dismissConflict() { conflictNote = ''; emit(); }
export function downloadConflictBackup() {
  if (!conflictBackup) return;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conflictBackup], { type: 'application/json' }));
  a.download = 'qari-local-copy-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json'; a.click();
}
export const savedDefaults = () => ({ owner: meta.owner, repo: meta.repo });

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(() => { if (document.visibilityState === 'visible' && !busy) syncNow('poll'); }, POLL_MS);
}

export function init() {
  try { const raw = localStorage.getItem(KEY); if (raw) Object.assign(meta, JSON.parse(raw)); } catch {}
  store.onChange(onLocalChange);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow('visible'); });
  window.addEventListener('online', () => syncNow('online'));
  if (meta.token) { setStatus('idle'); startPolling(); syncNow('start'); }
}
