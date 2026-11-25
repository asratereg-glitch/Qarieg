// dbfile.js — one real database file on the user's disk (.qari = zip: data.json + files/*)
// Working copy stays in the browser (localStorage + IndexedDB); every change is auto-saved to the file.
import * as db from './db.js';
import * as store from './store.js';

const FORMAT = 'qari-db';
let handle = null;          // FileSystemFileHandle
let status = 'none';        // none | ready | needs-permission | saving | error | unsupported
let lastSaved = null, lastError = '', timer = null, saving = false, again = false;
const subs = new Set();
const set = (s, err = '') => { status = s; lastError = err; subs.forEach(f => { try { f(); } catch {} }); };

export const supported = () => typeof window.showSaveFilePicker === 'function';
export const info = () => ({ status, name: handle ? handle.name : '', lastSaved, lastError, supported: supported() });
export const onStatus = fn => subs.add(fn);

async function build() {
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify({ format: FORMAT, version: 1, savedAt: new Date().toISOString() }));
  zip.file('data.json', JSON.stringify(store.snapshot()));
  const keys = await db.allFileKeys();
  const used = new Set(store.getState().books.map(b => b.fileKey).filter(Boolean));
  for (const k of keys) { if (!used.has(k)) continue; const b = await db.getFile(k); if (b) zip.file('files/' + k, b, { binary: true }); }
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}

async function writeTo(h) {
  const blob = await build();
  const w = await h.createWritable(); await w.write(blob); await w.close();
  lastSaved = new Date();
}

export async function saveNow() {
  if (!handle) return false;
  if (saving) { again = true; return false; }
  saving = true; clearTimeout(timer);
  try {
    if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') { set('needs-permission'); return false; }
    set('saving'); await writeTo(handle); set('ready'); return true;
  } catch (e) { console.error(e); set('error', e.message || String(e)); return false; }
  finally { saving = false; if (again) { again = false; schedule(); } }
}
function schedule() { if (!handle || status === 'needs-permission') return; clearTimeout(timer); timer = setTimeout(saveNow, 2500); }

export async function grant() {            // must run from a click
  if (!handle) return;
  if ((await handle.requestPermission({ mode: 'readwrite' })) === 'granted') { set('ready'); await saveNow(); }
}

export async function createFile() {       // pick where to create the database file
  const h = await showSaveFilePicker({ suggestedName: 'qari-library.qari', types: [{ description: 'Qari database', accept: { 'application/zip': ['.qari'] } }] });
  handle = h; await db.metaPut('handle', h).catch(() => {}); set('ready'); await saveNow();
}

export async function restoreFrom(file) {  // load a database file into the app (replaces local data)
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const mf = zip.file('manifest.json'), dj = zip.file('data.json');
  if (!mf || !dj) throw new Error('not a qari database');
  const data = JSON.parse(await dj.async('text'));
  await db.clearFiles();
  const names = Object.keys(zip.files).filter(n => n.startsWith('files/') && !zip.files[n].dir);
  for (const n of names) await db.putFile(n.slice(6), await zip.files[n].async('blob'));
  store.replaceState(data);
  return { books: data.books.length, files: names.length };
}

export async function openFile() {         // pick an existing database file, restore, and keep auto-saving to it
  const [h] = await showOpenFilePicker({ types: [{ description: 'Qari database', accept: { 'application/zip': ['.qari'] } }] });
  if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('permission denied');
  const r = await restoreFrom(await h.getFile());
  handle = h; await db.metaPut('handle', h).catch(() => {}); set('ready');
  return r;
}

export async function disconnect() { handle = null; clearTimeout(timer); await db.metaDel('handle'); set('none'); }

export async function downloadBackup() {   // fallback when the browser has no file access API
  const blob = await build();
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'qari-library-' + new Date().toISOString().slice(0, 10) + '.qari'; a.click();
  lastSaved = new Date(); set(status);
}
export async function restoreFromPicker(inputFile) { return restoreFrom(inputFile); }

export async function init() {
  if (!supported()) { set('unsupported'); }
  else {
    try {
      handle = await db.metaGet('handle');
      if (handle) set((await handle.queryPermission({ mode: 'readwrite' })) === 'granted' ? 'ready' : 'needs-permission');
    } catch (e) { handle = null; }
  }
  store.onChange(schedule); db.onFilesChange(schedule);
  window.addEventListener('beforeunload', () => { if (handle && timer) saveNow(); });
}
