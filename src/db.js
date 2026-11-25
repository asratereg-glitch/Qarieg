// db.js — IndexedDB layer for book files (blobs) and large data
const DB_NAME = 'qari-files';
const STORE = 'files';
let _db = null;
const fileListeners = new Set();
export function onFilesChange(fn) { fileListeners.add(fn); }
const fire = () => fileListeners.forEach(fn => { try { fn(); } catch {} });

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => { const d = req.result; if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE); if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta'); };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

export async function putFile(key, blob) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => { fire(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFile(key) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFile(key) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => { fire(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

export async function allFileKeys() {
  const db = await open();
  return new Promise((resolve, reject) => { const r = db.transaction(STORE).objectStore(STORE).getAllKeys(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
export async function clearFiles() {
  const db = await open();
  return new Promise((resolve, reject) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).clear(); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
}
export async function metaGet(k) {
  const db = await open();
  return new Promise((resolve, reject) => { const r = db.transaction('meta').objectStore('meta').get(k); r.onsuccess = () => resolve(r.result || null); r.onerror = () => reject(r.error); });
}
export async function metaPut(k, v) {
  const db = await open();
  return new Promise((resolve, reject) => { const tx = db.transaction('meta', 'readwrite'); tx.objectStore('meta').put(v, k); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
}
export async function metaDel(k) {
  const db = await open();
  return new Promise((resolve, reject) => { const tx = db.transaction('meta', 'readwrite'); tx.objectStore('meta').delete(k); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
}
