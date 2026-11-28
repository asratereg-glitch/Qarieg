// public.js — public library backed by the public GitHub repo qari-public.
// Reads are public (raw.githubusercontent.com, no token). Writes (admin only)
// reuse the GitHub sync token stored on this device (localStorage 'qari.sync'),
// the same token src/sync.js uses for the private backup repo.
import * as db from './db.js';
import * as store from './store.js';
import { t } from './i18n.js';

const OWNER = 'asratereg-glitch';
const REPO = 'qari-public';
const BRANCH = 'main';
const CATALOG_PATH = 'public-books.json';
const API = 'https://api.github.com';
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`;
const MAX_FILE = 40 * 1024 * 1024; // same cap as sync.js
const CATALOG_TTL_MS = 60 * 1000;

const TRANSLATIONS = { id: 'cat-translations', name: 'ترجمات', sort_order: 0 };
const emptyCatalog = () => ({ format: 'qari-public', version: 1, categories: [{ ...TRANSLATIONS }], books: [] });

/* ---------- small helpers (same shapes as sync.js) ---------- */
const b64 = str => { const bytes = new TextEncoder().encode(str); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0)));
const blobToB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
const enc = p => p.split('/').map(encodeURIComponent).join('/');

function getSyncCreds() {
  try { const raw = JSON.parse(localStorage.getItem('qari.sync') || '{}'); return { token: raw.token || '', owner: raw.owner || '' }; }
  catch { return { token: '', owner: '' }; }
}
function requireToken() {
  const { token } = getSyncCreds();
  if (!token) throw new Error(t('publishNeedsSync'));
  return token;
}
async function errOf(r) { let m = ''; try { m = (await r.json()).message || ''; } catch {} return `GitHub ${r.status}${m ? ': ' + m : ''}`; }
function ghHeaders(token, extra) {
  const h = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) h.Authorization = 'Bearer ' + token;
  return Object.assign(h, extra || {});
}

/* Contents API: GET a path -> {sha, doc} (doc = parsed JSON, or null for non-JSON / missing). */
async function ghGet(path, token) {
  const r = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${enc(path)}`, { headers: ghHeaders(token) });
  if (r.status === 404) return { sha: null, doc: null };
  if (!r.ok) throw new Error(await errOf(r));
  const j = await r.json();
  if (j.type === 'file' && j.encoding === 'base64' && j.content) {
    let doc = null; try { doc = JSON.parse(unb64(j.content)); } catch {}
    return { sha: j.sha, doc };
  }
  return { sha: j.sha || null, doc: null };
}
async function ghPut(path, body, token) {
  return fetch(`${API}/repos/${OWNER}/${REPO}/contents/${enc(path)}`, {
    method: 'PUT', headers: ghHeaders(token, { 'Content-Type': 'application/json' }), body: JSON.stringify(body),
  });
}
async function ghDelete(path, sha, token) {
  return fetch(`${API}/repos/${OWNER}/${REPO}/contents/${enc(path)}`, {
    method: 'DELETE', headers: ghHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ message: 'Qari public library: delete ' + path, sha }),
  });
}

/* ---------- catalog reads (public, no token) ---------- */
let cache = null, cacheAt = 0;
async function readCatalog() {
  const r = await fetch(`${RAW}/${CATALOG_PATH}`, { cache: 'no-store' });
  if (r.status === 404) return emptyCatalog();
  if (!r.ok) throw new Error('GitHub ' + r.status);
  const doc = await r.json();
  if (!doc || doc.format !== 'qari-public') throw new Error('bad public catalog');
  if (!Array.isArray(doc.categories) || !doc.categories.length) doc.categories = [{ ...TRANSLATIONS }];
  if (!Array.isArray(doc.books)) doc.books = [];
  return doc;
}
export async function getCatalog(force = false) {
  if (cache && !force && Date.now() - cacheAt < CATALOG_TTL_MS) return cache;
  cache = await readCatalog(); cacheAt = Date.now();
  return cache;
}
export async function listCategories() {
  const c = await getCatalog();
  return (c.categories || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}
export async function listPublicBooks({ categoryId = '', q = '' } = {}) {
  const c = await getCatalog();
  const needle = (q || '').trim().toLowerCase();
  return c.books.filter(b =>
    (!categoryId || b.category_id === categoryId) &&
    (!needle || ((b.title || '') + ' ' + (b.author || '')).toLowerCase().includes(needle))
  );
}
export async function getPublicBook(id) {
  const c = await getCatalog();
  return c.books.find(b => b.id === id) || null;
}
export async function getCategoryName(categoryId) {
  if (!categoryId) return '';
  const c = await getCatalog();
  const cat = c.categories.find(x => x.id === categoryId);
  return cat ? cat.name : '';
}
/* Sync read of the in-memory catalog cache (already loaded when the user is
   looking at a public card/page). Used by saveToMyLibrary for the shelf map. */
export function getCachedCategoryName(categoryId) {
  if (!categoryId || !cache) return '';
  const cat = (cache.categories || []).find(c => c.id === categoryId);
  return cat ? cat.name : '';
}
export const publicFileUrl = filePath => `${RAW}/${filePath}`;

/* ---------- catalog writes (admin, token required) ---------- */
// Read-modify-write public-books.json. On a 409 (sha changed under us) re-read
// once and retry; if it still conflicts, throw so the admin can retry.
async function writeCatalog(mutator) {
  const token = requireToken();
  const apply = async () => {
    const cur = await ghGet(CATALOG_PATH, token);
    const doc = cur.doc && cur.doc.format === 'qari-public' ? cur.doc : emptyCatalog();
    if (!Array.isArray(doc.categories)) doc.categories = [{ ...TRANSLATIONS }];
    if (!Array.isArray(doc.books)) doc.books = [];
    const next = mutator(JSON.parse(JSON.stringify(doc)));
    const body = { message: 'Qari public library update', content: b64(JSON.stringify(next)) };
    if (cur.sha) body.sha = cur.sha;
    const r = await ghPut(CATALOG_PATH, body, token);
    if (r.status === 409 || r.status === 422) return 'conflict';
    if (!r.ok) throw new Error(await errOf(r));
    cache = next; cacheAt = Date.now();
    return 'ok';
  };
  let res = await apply();
  if (res === 'conflict') res = await apply();
  if (res === 'conflict') throw new Error(t('publishConflict'));
}

export async function addCategory(name) {
  requireToken();
  const n = (name || '').trim();
  if (!n) throw new Error(t('categoryNamePh'));
  let created = null;
  await writeCatalog(doc => {
    const ex = doc.categories.find(c => c.name === n);
    if (ex) { created = ex; return doc; }
    created = { id: 'cat-' + store.uid(), name: n, sort_order: Math.max(0, ...doc.categories.map(c => c.sort_order || 0)) + 1 };
    doc.categories.push(created);
    return doc;
  });
  return created;
}

/* Publish a new public book. file is a File/Blob (or null for metadata-only).
   Uploads the file first (no orphan catalog row if it fails), then the row. */
export async function publishBook({ file, fileName = '', meta, format, categoryId }) {
  const token = requireToken();
  if (file && file.size > MAX_FILE) throw new Error(t('fileTooBig'));
  const id = crypto.randomUUID();
  let file_path = null, file_size = 0, file_name = '';
  if (file) {
    const fileKey = 'file-' + store.uid();
    const r = await ghPut(`files/${fileKey}`, { message: 'Qari public book file ' + fileKey, content: await blobToB64(file) }, token);
    if (!r.ok && r.status !== 422) throw new Error(await errOf(r));
    file_path = `files/${fileKey}`; file_size = file.size; file_name = fileName || file.name || '';
  }
  const row = {
    id, title: meta.title || '?', author: meta.author || '', cover: meta.cover || '',
    description: meta.description || '', format: format || 'web',
    category_id: categoryId || null, file_path, file_size, file_name,
    ol_key: meta.olKey || '', isbn: meta.isbn || '', year: meta.year || '',
    subjects: meta.subjects || [], created_by: '', created_at: new Date().toISOString(),
  };
  await writeCatalog(doc => { doc.books.unshift(row); return doc; });
  return row;
}

/* Publish one of the admin's existing private books (seeding tool + ongoing
   promotion). Uploads the file from the admin's IndexedDB, then links the
   local copy to the public row so the page shows it as saved. */
export async function publishExistingBook(localBook) {
  requireToken();
  const cats = await listCategories();
  const catId = localBook.shelf === 'translations'
    ? ((cats.find(c => c.name === 'ترجمات') || cats[0] || {}).id || null)
    : null;
  let fileBlob = null;
  if (localBook.fileKey && localBook.format !== 'web') fileBlob = await db.getFile(localBook.fileKey);
  const row = await publishBook({
    file: fileBlob, fileName: localBook.fileName || '',
    meta: { title: localBook.title, author: localBook.author, cover: localBook.cover, description: '', olKey: localBook.olKey, isbn: localBook.isbn, year: localBook.year, subjects: localBook.subjects },
    format: fileBlob ? localBook.format : 'web', categoryId: catId,
  });
  store.updateBook(localBook.id, { public_book_id: row.id, public_file_path: row.file_path || '' });
  return row;
}

export async function deletePublicBook(id) {
  requireToken();
  const token = getSyncCreds().token;
  const cat = await getCatalog(true);
  const row = cat.books.find(b => b.id === id);
  if (!row) return false;
  await writeCatalog(doc => { doc.books = doc.books.filter(b => b.id !== id); return doc; });
  if (row.file_path) {
    try {
      const cur = await ghGet(row.file_path, token);
      if (cur.sha) await ghDelete(row.file_path, cur.sha, token);
    } catch {}
  }
  return true;
}

/* ---------- save to my library (copy, don't reference) ---------- */
export function findSavedBook(input) {
  const st = store.getState();
  if (input.public_book_id) {
    const b = st.books.find(x => x.public_book_id === input.public_book_id);
    if (b) return b;
  }
  if (input.olKey) {
    const b = store.findBookByOl(input.olKey);
    if (b) return b;
  }
  return st.books.find(x => x.title === input.title && (x.author || '') === (input.author || '')) || null;
}

async function downloadPublicFile(book) {
  try {
    const r = await fetch(publicFileUrl(book.public_file_path), { cache: 'no-store' });
    if (!r.ok) return;
    await db.putFile(book.fileKey, await r.blob());
  } catch {}
}

/* Copies a public (or Discover) book into the user's own library as an
   ordinary local book, so progress / favorite / lists / highlights all work
   per-user and sync via the existing user_data sync. The file is downloaded
   into IndexedDB (on save, or lazily on first read); pass fileBlob to skip
   the download when the blob is already on this device (admin publish flow). */
export function saveToMyLibrary(input, fileBlob) {
  const found = findSavedBook(input);
  if (found) return found;
  const catName = input.categoryName || getCachedCategoryName(input.category_id);
  const shelf = catName === 'ترجمات' ? 'translations' : 'want';
  const fileKey = input.public_file_path ? 'file-' + store.uid() : '';
  const b = store.addBook({
    title: input.title, author: input.author || '', format: input.format || 'web',
    cover: input.cover || '', source: input.public_book_id ? 'public' : 'openlibrary',
    subjects: input.subjects || [], isbn: input.isbn || '', olKey: input.olKey || '',
    year: input.year || '', shelf, fileKey,
    public_book_id: input.public_book_id || '', public_file_path: input.public_file_path || '',
  });
  if (fileBlob) db.putFile(fileKey, fileBlob).catch(() => {});
  else if (input.public_file_path) downloadPublicFile(b);
  return b;
}
