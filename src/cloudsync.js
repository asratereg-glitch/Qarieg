// cloudsync.js — sync the Qari state to Supabase (one JSONB row per user in
// public.user_data), mirroring the existing GitHub sync in sync.js.
// Last write wins; the GitHub sync keeps working independently.
// Book files stay in IndexedDB on the device — only the state JSON syncs.
import * as store from './store.js';
import { supabase } from './supabase.js';
import * as auth from './auth.js';

const KEY = 'qari.cloud';
const PUSH_DELAY = 10000, POLL_MS = 90000;

let meta = { userId: '', lastSync: 0, lastHash: null, changedAt: 0, cloudUpdatedAt: 0 };
let status = 'off';           // off | idle | syncing | error
let lastError = '', lastNote = '';
let busy = false, rerun = false, applying = false, pushTimer = null, pollTimer = null;
const subs = new Set();
let hooks = { onApplied: () => {}, confirm: msg => window.confirm(msg), lang: () => 'ar' };

const emit = () => subs.forEach(f => { try { f(); } catch {} });
const setStatus = (s, err = '') => { status = s; lastError = err; emit(); };
const saveMeta = () => { try { localStorage.setItem(KEY, JSON.stringify(meta)); } catch {} };
const tt = (ar, en) => (hooks.lang() === 'ar' ? ar : en);

export const onStatus = fn => subs.add(fn);
export const configure = h => Object.assign(hooks, h);
export const info = () => ({
  status, error: lastError, note: lastNote, connected: !!auth.getUser(), lastSync: meta.lastSync,
});

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
const myId = () => { const u = auth.getUser(); return u ? u.id : ''; };

function resetMetaFor(userId) {
  meta = { userId, lastSync: 0, lastHash: null, changedAt: 0, cloudUpdatedAt: 0 };
  saveMeta();
}

/* ---------- remote data ---------- */
async function getCloudRow() {
  const { data, error } = await supabase.from('user_data')
    .select('data,updated_at').eq('user_id', myId()).maybeSingle();
  if (error) throw error;
  return data; // null when the user has no cloud row yet
}

async function pushCloud() {
  const { data, error } = await supabase.from('user_data')
    .upsert({ user_id: myId(), data: syncState(store.getState()) }, { onConflict: 'user_id' })
    .select('updated_at').single();
  if (error) throw error;
  meta.lastHash = hashNow(); meta.lastSync = Date.now();
  meta.cloudUpdatedAt = data && data.updated_at ? Date.parse(data.updated_at) : Date.now();
  meta.changedAt = 0; saveMeta();
  return true;
}

async function applyCloud(row) {
  const local = store.getState();
  const data = Object.assign({}, row.data || {}, { metaCache: local.metaCache || {} });
  data.settings = Object.assign({}, data.settings || {}, { gbKey: (local.settings && local.settings.gbKey) || '' });
  applying = true;
  try { store.replaceState(data); } finally { applying = false; }
  meta.lastHash = hashNow(); meta.lastSync = Date.now();
  meta.cloudUpdatedAt = Date.parse(row.updated_at) || Date.now(); meta.changedAt = 0; saveMeta();
  try { hooks.onApplied(); } catch {}
  lastNote = tt('اتحمّلت بياناتك من السحابة', 'Your cloud data was loaded');
}

/* ---------- main cycle ---------- */
export async function syncNow(reason = 'manual') {
  if (!myId()) return false;
  if (busy) { rerun = true; return false; }
  if (meta.userId !== myId()) resetMetaFor(myId());
  busy = true; clearTimeout(pushTimer); lastNote = ''; setStatus('syncing');
  try {
    const row = await getCloudRow();
    const h = hashNow();
    if (!row) {
      if (!isEmptyLib()) await pushCloud();
      else { meta.lastHash = h; meta.lastSync = Date.now(); saveMeta(); }
    } else if (canon(syncState(row.data || {})) === h) {
      meta.lastHash = h; meta.lastSync = Date.now();
      meta.cloudUpdatedAt = Date.parse(row.updated_at) || meta.cloudUpdatedAt; saveMeta();
    } else if (!meta.lastSync && !isEmptyLib()) {
      // First sync on this device and both sides have data: ask.
      if (hooks.confirm(tt('السحابة فيها بيانات والجهاز ده كمان فيه بيانات.\nOK = استخدم بيانات السحابة (بيانات الجهاز بتتحفظ نسخة تقدر تنزلها من التصدير).\nCancel = ارفع بيانات الجهاز فوق السحابة.', 'The cloud has data and this device has data too.\nOK = use the cloud data (this device data can be exported first from Settings).\nCancel = upload this device data over the cloud.')))
        await applyCloud(row);
      else await pushCloud();
    } else {
      const cloudAt = Date.parse(row.updated_at) || 0;
      const dirty = h !== meta.lastHash;
      if (!dirty) await applyCloud(row);
      else if (cloudAt >= (meta.changedAt || 0)) await applyCloud(row);
      else await pushCloud();
    }
    setStatus('idle');
    return true;
  } catch (e) {
    console.error(e);
    const m = e.message || String(e);
    setStatus('error', /Could not find the table|relation .* does not exist|user_data/i.test(m)
      ? tt('جدول المزامنة لسه متعملش في Supabase — شغّل ملف الـ schema من لوحة التحكم', 'The sync table is not set up in Supabase yet — run the schema SQL from the dashboard')
      : m);
    return false;
  } finally {
    busy = false;
    if (rerun) { rerun = false; setTimeout(() => syncNow('rerun'), 500); }
  }
}

/* ---------- change tracking ---------- */
function onLocalChange() {
  if (applying || !myId()) return;
  if (hashNow() === meta.lastHash) return;
  meta.changedAt = Date.now(); saveMeta();
  clearTimeout(pushTimer); pushTimer = setTimeout(() => syncNow('auto'), PUSH_DELAY);
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(() => { if (document.visibilityState === 'visible' && !busy) syncNow('poll'); }, POLL_MS);
}

/* Call when the auth state changes (login/logout). */
export function onAuthChange() {
  clearTimeout(pushTimer); clearInterval(pollTimer);
  if (myId()) { setStatus('idle'); startPolling(); syncNow('login'); }
  else { setStatus('off'); lastError = ''; lastNote = ''; resetMetaFor(''); emit(); }
}

export function init() {
  try { const raw = localStorage.getItem(KEY); if (raw) Object.assign(meta, JSON.parse(raw)); } catch {}
  store.onChange(onLocalChange);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow('visible'); });
  window.addEventListener('online', () => syncNow('online'));
  if (myId()) { setStatus('idle'); startPolling(); syncNow('start'); }
}
