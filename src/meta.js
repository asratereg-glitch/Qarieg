// meta.js — book metadata for the IMDb-style page: Open Library (keyless) + Google Books (optional, best effort)
import * as store from './store.js';

const OL = 'https://openlibrary.org';
const FIELDS = 'key,title,author_name,author_key,cover_i,first_publish_year,edition_count,number_of_pages_median,ratings_average,ratings_count,want_to_read_count,already_read_count,currently_reading_count,subject,publisher,language,isbn,first_sentence';

async function getJSON(url, ms = 12000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally { clearTimeout(timer); }
}

export const cleanKey = k => (k || '').replace('/works/', '');
export const coverUrl = (id, size = 'L') => id ? `https://covers.openlibrary.org/b/id/${id}-${size}.jpg?default=false` : '';

function textOf(v) { return !v ? '' : typeof v === 'string' ? v : (v.value || ''); }

// Subjects worth showing as genre chips (OL mixes in award/nyt/etc. tags).
export function cleanSubjects(list = []) {
  const seen = new Set(), out = [];
  for (const s of list) {
    const k = s.toLowerCase();
    if (/[:=]|^nyt|award|bestseller|reviewed|large type|accessible|open library|protected daisy|in library|^fiction,/.test(k) || s.length > 32 || /\d{3}/.test(s)) continue;
    if (seen.has(k)) continue; seen.add(k); out.push(s);
    if (out.length >= 10) break;
  }
  return out;
}

function fromSearchDoc(d) {
  return {
    olKey: cleanKey(d.key), title: d.title || '', author: (d.author_name || [])[0] || '', authors: d.author_name || [],
    authorKey: (d.author_key || [])[0] || '', cover: coverUrl(d.cover_i), coverId: d.cover_i || 0,
    year: d.first_publish_year || '', pages: d.number_of_pages_median || 0, editions: d.edition_count || 0,
    rating: d.ratings_average || 0, ratingCount: d.ratings_count || 0,
    wantToRead: d.want_to_read_count || 0, alreadyRead: d.already_read_count || 0, currentlyReading: d.currently_reading_count || 0,
    subjects: d.subject || [], publisher: (d.publisher || [])[0] || '', languages: (d.language || []).slice(0, 8),
    isbn: (d.isbn || []).find(x => x.length === 13) || (d.isbn || [])[0] || '', firstSentence: (d.first_sentence || [])[0] || '',
  };
}

async function olSearchDoc(q) {
  const data = await getJSON(`${OL}/search.json?${q}&limit=1&fields=${FIELDS}`);
  return data.docs && data.docs[0] ? fromSearchDoc(data.docs[0]) : null;
}

async function googleBooks(m) {
  const key = (store.getState().settings.gbKey || '').trim();
  const q = m.isbn ? `isbn:${m.isbn}` : `intitle:${m.title}${m.author ? '+inauthor:' + m.author : ''}`;
  const data = await getJSON(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q).replace(/%2B/g, '+')}&maxResults=1${key ? '&key=' + encodeURIComponent(key) : ''}`, 9000);
  const v = data.items && data.items[0] && data.items[0].volumeInfo;
  if (!v) return null;
  return { rating: v.averageRating || 0, count: v.ratingsCount || 0, pages: v.pageCount || 0, categories: v.categories || [],
    description: v.description || '', publisher: v.publisher || '', date: v.publishedDate || '', link: v.infoLink || '', cover: v.imageLinks ? (v.imageLinks.thumbnail || '').replace('http://', 'https://') : '' };
}

// ref: { olKey } or { title, author, isbn }. Returns normalized meta; never throws for partial failures.
export async function loadMeta(ref, { force = false } = {}) {
  let olKey = ref.olKey || '';
  if (olKey && !force) { const c = store.getMeta(olKey); if (c) return { ...c, fromCache: true }; }
  let m = null, errors = [];
  try {
    if (olKey) m = await olSearchDoc(`q=key:/works/${olKey}`);
    else if (ref.isbn) m = await olSearchDoc(`isbn=${encodeURIComponent(ref.isbn)}`);
    if (!m && ref.title) m = await olSearchDoc(`title=${encodeURIComponent(ref.title)}${ref.author ? '&author=' + encodeURIComponent(ref.author) : ''}`);
  } catch (e) { errors.push('ol:' + e.message); }
  if (!m) {
    const stale = olKey && store.getMetaStale(olKey);
    if (stale) return { ...stale, fromCache: true, stale: true };
    return { olKey: '', title: ref.title || '', author: ref.author || '', cover: ref.cover || '', subjects: [], notFound: true, errors };
  }
  olKey = m.olKey;
  try {
    const w = await getJSON(`${OL}/works/${olKey}.json`);
    m.description = textOf(w.description).replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').replace(/\(\[source\][^)]*\)/g, '').split('\n\n----------')[0].trim();
    if (w.first_publish_date && !m.year) m.year = (w.first_publish_date.match(/\d{4}/) || [''])[0];
    if (!m.subjects.length && w.subjects) m.subjects = w.subjects;
    if (!m.authorKey && w.authors && w.authors[0]) m.authorKey = cleanKey(((w.authors[0].author || {}).key || '').replace('/authors/', ''));
  } catch (e) { errors.push('work:' + e.message); }
  if (m.authorKey) {
    try {
      const a = await getJSON(`${OL}/authors/${m.authorKey}.json`);
      m.authorBio = textOf(a.bio).split('\n')[0].slice(0, 600);
      m.authorBorn = a.birth_date || ''; m.authorDied = a.death_date || '';
      m.authorPhoto = a.photos && a.photos[0] > 0 ? `https://covers.openlibrary.org/a/id/${a.photos[0]}-M.jpg` : '';
    } catch (e) { /* optional */ }
  }
  try { m.gb = await googleBooks(m); } catch (e) { m.gb = null; m.gbError = e.message; }
  if (m.gb && !m.description) m.description = m.gb.description.replace(/<[^>]+>/g, '');
  if (m.gb && !m.pages) m.pages = m.gb.pages;
  m.errors = errors; m.fetchedAt = new Date().toISOString();
  store.setMeta(olKey, m);
  return m;
}

export async function moreByAuthor(authorKey, exceptKey) {
  if (!authorKey) return [];
  const data = await getJSON(`${OL}/search.json?q=author_key:${authorKey}&sort=editions&limit=14&fields=key,title,author_name,cover_i,first_publish_year,ratings_average`);
  return (data.docs || []).filter(d => cleanKey(d.key) !== exceptKey).slice(0, 12).map(fromSearchDoc);
}

export async function similarBooks(subjects, exceptKey, exceptAuthorKey) {
  let subj = cleanSubjects(subjects).filter(s => !/^(fiction|american|english|literature)/i.test(s)).slice(0, 2);
  if (!subj.length) subj = (subjects || []).filter(x => x && x.length <= 40 && !/^(fiction|literature)/i.test(x)).slice(0, 2);
  if (!subj.length) return [];
  const run = async q => {
    const data = await getJSON(`${OL}/search.json?q=${encodeURIComponent(q)}&sort=rating&limit=20&fields=key,title,author_name,author_key,cover_i,first_publish_year,ratings_average,ratings_count`);
    return (data.docs || []).filter(d => cleanKey(d.key) !== exceptKey && (d.author_key || [])[0] !== exceptAuthorKey && d.cover_i);
  };
  let docs = await run(subj.map(x => `subject:"${x}"`).join(' AND '));
  if (docs.length < 6 && subj.length > 1) {
    try { const more = await run(`subject:"${subj[0]}"`); const seen = new Set(docs.map(d => d.key)); more.forEach(d => { if (!seen.has(d.key)) docs.push(d); }); } catch {}
  }
  return docs.slice(0, 12).map(fromSearchDoc);
}


/* ---------- v1.1.4: author lookup + never-empty "similar books" ---------- */
const SDOC = 'key,title,author_name,author_key,cover_i,first_publish_year,ratings_average,ratings_count,subject';
export function firstAuthorName(name) { return String(name || '').split(/\s*(?:,|&|;| and | و )\s*/i)[0].trim() || String(name || '').trim(); }
export async function resolveAuthorKey(name) {
  const n = firstAuthorName(name); if (!n) return '';
  try {
    const d = await getJSON(`${OL}/search/authors.json?q=${encodeURIComponent(n)}&limit=5`);
    const docs = d.docs || [];
    const norm = x => String(x || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const exact = docs.find(a => norm(a.name) === norm(n));
    const best = exact || docs.slice().sort((a, b) => (b.work_count || 0) - (a.work_count || 0))[0];
    return best ? best.key : '';
  } catch { return ''; }
}
// Works by an author (page = 0-based). Resolves the Open Library author id first; falls back to a plain author-name search.
export async function worksByAuthor(name, page = 0, limit = 24, authorKey = '') {
  const n = firstAuthorName(name);
  const key = authorKey || await resolveAuthorKey(n);
  const off = page * limit;
  let data = null;
  if (key) { try { data = await getJSON(`${OL}/search.json?q=${encodeURIComponent('author_key:' + key)}&sort=editions&limit=${limit}&offset=${off}&fields=${SDOC},isbn`); } catch {} }
  if (!data || !(data.docs || []).length) data = await getJSON(`${OL}/search.json?author=${encodeURIComponent(n)}&limit=${limit}&offset=${off}&fields=${SDOC},isbn`);
  const docs = (data.docs || []).filter(d => d.title);
  return { items: docs.map(d => ({ ...fromSearchDoc(d), year: d.first_publish_year || '', subjects: (d.subject || []).slice(0, 8), isbn: (d.isbn || [])[0] || '' })), more: off + limit < (data.numFound || 0) };
}
async function googleRelated(q, exceptTitle) {
  const d = await getJSON(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20&orderBy=relevance&printType=books`);
  const seen = new Set();
  return (d.items || []).map(v => { const i = v.volumeInfo || {}; return {
    olKey: '', title: i.title || '', author: (i.authors || [])[0] || '', rating: i.averageRating || 0,
    cover: ((i.imageLinks || {}).thumbnail || '').replace('http://', 'https://'), subjects: i.categories || [], year: (i.publishedDate || '').slice(0, 4) }; })
    .filter(x => x.title && x.title.toLowerCase() !== String(exceptTitle || '').toLowerCase() && !seen.has(x.title.toLowerCase()) && seen.add(x.title.toLowerCase()));
}
// Always tries to return something: subjects -> same author -> Google Books -> title words -> popular books.
export async function relatedBooks({ subjects, olKey, authorKey, title, author }) {
  const out = [], seen = new Set();
  const add = items => { for (const it of items || []) { const k = (it.title || '').toLowerCase(); if (!k || k === String(title || '').toLowerCase() || (it.olKey && it.olKey === olKey) || seen.has(k)) continue; seen.add(k); out.push(it); } };
  const step = async fn => { if (out.length >= 8) return; try { add(await fn()); } catch {} };
  await step(() => similarBooks(subjects, olKey, authorKey));
  await step(async () => (await worksByAuthor(author, 0, 14, authorKey)).items);
  const subj = cleanSubjects(subjects).slice(0, 2);
  await step(() => googleRelated(subj.length ? subj.map(s => 'subject:' + s).join(' ') : (author ? 'inauthor:' + firstAuthorName(author) : title), title));
  await step(async () => (await getJSON(`${OL}/search.json?q=${encodeURIComponent(String(title || '').replace(/[^\p{L}\p{N} ]/gu, ' '))}&limit=15&fields=${SDOC}`)).docs.map(fromSearchDoc));
  await step(async () => (await getJSON(`${OL}/search.json?q=${encodeURIComponent('subject:"' + (subj[0] || 'fiction') + '"')}&sort=rating&limit=15&fields=${SDOC}`)).docs.map(fromSearchDoc));
  return out.slice(0, 14);
}
