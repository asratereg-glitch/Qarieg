// discover.js — online search, taste recommendations, award lists, mood search
import * as store from './store.js';
import { t, getLang } from './i18n.js';
import { worksByAuthor } from './meta.js';
import { authorHTML, esc, toast, coverImgHTML, placeholderHTML, findCover, sortBooks, sortOptionsHTML } from './app.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Open Library ---------- */
export async function searchOpenLibrary(q, { subject = null, limit = 12, offset = 0 } = {}) {
  let url;
  if (subject) url = `https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json?limit=${limit}&offset=${offset}`;
  else if (/^(97[89])?\d{9}[\dXx]$/.test(q.replace(/-/g, ''))) url = `https://openlibrary.org/search.json?isbn=${encodeURIComponent(q)}&limit=${limit}&fields=key,title,author_name,cover_i,first_publish_year,subject,isbn,ratings_average,ratings_count`;
  else url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}&fields=key,title,author_name,cover_i,first_publish_year,subject,isbn,ratings_average,ratings_count`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('network ' + res.status);
  const data = await res.json();
  const docs = subject ? (data.works || []) : (data.docs || []);
  return docs.map(d => ({
    olKey: (d.key || '').replace('/works/', ''),
    title: d.title || '?',
    author: (d.authors && d.authors[0] && d.authors[0].name) || (d.author_name && d.author_name[0]) || '',
    year: d.first_publish_year || '',
    cover: (d.cover_i || d.cover_id) ? `https://covers.openlibrary.org/b/id/${d.cover_i || d.cover_id}-L.jpg` : '',
    rating: d.ratings_average || 0, ratingCount: d.ratings_count || 0,
    subjects: (d.subject || []).slice(0, 8),
    isbn: (d.isbn && d.isbn[0]) || '',
  })).filter(x => x.title);
}

/* ---------- scoped search (title / author / subject / all) ---------- */
const OL_FIELDS = '&fields=key,title,author_name,cover_i,first_publish_year,subject,isbn,ratings_average,ratings_count';
export async function searchScoped(q, scope, page = 0, limit = 24) {
  if (scope === 'author') { try { const r = await worksByAuthor(q, page, limit); if (r.items.length) return r; } catch {} }
  let url;
  if (scope === 'title') url = `https://openlibrary.org/search.json?title=${encodeURIComponent(q)}&limit=${limit}&offset=${page * limit}${OL_FIELDS}`;
  else if (scope === 'author') url = `https://openlibrary.org/search.json?author=${encodeURIComponent(q)}&limit=${limit}&offset=${page * limit}${OL_FIELDS}`;
  else if (scope === 'subject') url = `https://openlibrary.org/search.json?q=${encodeURIComponent('subject:"' + q + '"')}&limit=${limit}&offset=${page * limit}${OL_FIELDS}`;
  else url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}&offset=${page * limit}${OL_FIELDS}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('network ' + res.status);
  const data = await res.json();
  const items = (data.docs || []).map(d => ({
    olKey: (d.key || '').replace('/works/', ''), title: d.title || '?',
    author: (d.author_name && d.author_name[0]) || '', year: d.first_publish_year || '',
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : '',
    rating: d.ratings_average || 0, ratingCount: d.ratings_count || 0,
    subjects: (d.subject || []).slice(0, 8), isbn: (d.isbn && d.isbn[0]) || '',
  })).filter(x => x.title);
  return { items, more: (page + 1) * limit < (data.numFound || 0) };
}

/* ---------- curated award lists ---------- */
const AWARDS = {
  hugo: [
    ['A Desolation Called Peace', 'Arkady Martine', 2022], ['Network Effect', 'Martha Wells', 2021],
    ['A Memory Called Empire', 'Arkady Martine', 2020],
    ['The Calculating Stars', 'Mary Robinette Kowal', 2019], ['The Stone Sky', 'N.K. Jemisin', 2018],
    ['The Obelisk Gate', 'N.K. Jemisin', 2017], ['The Fifth Season', 'N.K. Jemisin', 2016],
    ['The Three-Body Problem', 'Liu Cixin', 2015], ['Ancillary Justice', 'Ann Leckie', 2014],
    ['Redshirts', 'John Scalzi', 2013], ['Among Others', 'Jo Walton', 2012],
  ],
  nebula: [
    ['Babel', 'R.F. Kuang', 2022], ['A Master of Djinn', 'P. Djèlí Clark', 2021],
    ['Network Effect', 'Martha Wells', 2020], ['A Song for a New Day', 'Sarah Pinsker', 2019],
    ['The Calculating Stars', 'Mary Robinette Kowal', 2018], ['All the Birds in the Sky', 'Charlie Jane Anders', 2016],
    ['Uprooted', 'Naomi Novik', 2015], ['Ancillary Justice', 'Ann Leckie', 2013],
    ['2312', 'Kim Stanley Robinson', 2012], ['Blackout / All Clear', 'Connie Willis', 2010],
  ],
  booker: [
    ['Orbital', 'Samantha Harvey', 2024], ['Prophet Song', 'Paul Lynch', 2023],
    ['The Seven Moons of Maali Almeida', 'Shehan Karunatilaka', 2022], ['The Promise', 'Damon Galgut', 2021],
    ['Shuggie Bain', 'Douglas Stuart', 2020], ['Girl, Woman, Other', 'Bernardine Evaristo', 2019],
    ['Milkman', 'Anna Burns', 2018], ['Lincoln in the Bardo', 'George Saunders', 2017],
    ['The Sellout', 'Paul Beatty', 2016], ['A Brief History of Seven Killings', 'Marlon James', 2015],
  ],
};
const MOODS = [
  { id: 'short_thrilling', icon: '⚡', subject: 'thriller' },
  { id: 'cozy', icon: '🍵', subject: 'cozy_fiction' },
  { id: 'cry', icon: '😢', subject: 'tearjerkers' },
  { id: 'think', icon: '🧠', subject: 'philosophy' },
  { id: 'adventure', icon: '🗺', subject: 'adventure_stories' },
  { id: 'funny', icon: '😄', subject: 'humorous_fiction' },
];

/* ---------- category tree: kind -> genre -> sub-genre ---------- */
// Tree modelled on Goodreads' genre list (names/hierarchy), data from Open Library / Google Books
// node: [id, ar, en, subject query, children?]
const N = (id, ar, en, q, sub) => ({ id, ar, en, q, sub: sub || [] });
export const CATS = [
  { id: 'fiction', kind: 'fiction', ar: 'روائي', en: 'Fiction', sub: [
    N('scifi', 'خيال علمي', 'Science fiction', 'science fiction', [N('dystopian', 'ديستوبيا', 'Dystopian', 'dystopian'), N('space', 'ملاحم فضائية', 'Space opera', 'space opera'), N('cyber', 'سايبر بانك', 'Cyberpunk', 'cyberpunk'), N('time', 'سفر عبر الزمن', 'Time travel', 'time travel'), N('postapoc', 'ما بعد الكارثة', 'Post-apocalyptic', 'post-apocalyptic'), N('aliens', 'كائنات فضائية', 'Aliens / first contact', 'extraterrestrial beings'), N('ai', 'ذكاء اصطناعي وروبوتات', 'AI & robots', 'robots'), N('hardsf', 'خيال علمي صلب', 'Hard SF', 'hard science fiction')]),
    N('fantasy', 'فانتازيا', 'Fantasy', 'fantasy', [N('epic', 'ملحمية', 'Epic fantasy', 'epic fantasy'), N('urban', 'حضرية', 'Urban fantasy', 'urban fantasy'), N('darkf', 'مظلمة', 'Dark fantasy', 'dark fantasy'), N('dragons', 'تنانين', 'Dragons', 'dragons'), N('fairy', 'حكايات خرافية', 'Fairy tales', 'fairy tales')]),
    N('mystery', 'غموض وجريمة', 'Mystery & crime', 'mystery', [N('detective', 'تحري', 'Detective', 'detective and mystery stories'), N('noir', 'نوار', 'Noir', 'noir'), N('cozy', 'غموض هادئ', 'Cozy mystery', 'cozy mystery'), N('procedural', 'إجرائي بوليسي', 'Police procedural', 'police procedural')]),
    N('thriller', 'إثارة وتشويق', 'Thriller', 'thriller', [N('spy', 'جاسوسية', 'Espionage', 'spy stories'), N('psych', 'نفسي', 'Psychological', 'psychological thriller'), N('legal', 'قانوني', 'Legal thriller', 'legal thriller'), N('suspense', 'تشويق', 'Suspense', 'suspense')]),
    N('horror', 'رعب', 'Horror', 'horror', [N('ghost', 'قصص أشباح', 'Ghost stories', 'ghost stories'), N('vampire', 'مصاصو دماء', 'Vampires', 'vampires'), N('gothic', 'قوطي', 'Gothic', 'gothic fiction')]),
    N('romance', 'رومانسي', 'Romance', 'romance', [N('histrom', 'تاريخي', 'Historical romance', 'historical romance'), N('controm', 'معاصر', 'Contemporary romance', 'contemporary romance')]),
    N('dystopia', 'ديستوبيا', 'Dystopia', 'dystopian'),
    N('paranormal', 'خوارق', 'Paranormal', 'paranormal fiction'),
    N('contemp', 'معاصر', 'Contemporary', 'contemporary fiction'),
    N('magrealism', 'واقعية سحرية', 'Magical realism', 'magic realism'),
    N('histfic', 'روايات تاريخية', 'Historical fiction', 'historical fiction'),
    N('literary', 'أدب أدبي', 'Literary fiction', 'literary fiction'),
    N('classics', 'كلاسيكيات', 'Classics', 'classics', [N('russian', 'أدب روسي', 'Russian literature', 'russian fiction'), N('french', 'أدب فرنسي', 'French literature', 'french fiction'), N('english', 'أدب إنجليزي', 'English literature', 'english fiction')]),
    N('arabicfic', 'روايات عربية', 'Arabic novels', 'arabic fiction'),
    N('adventure', 'مغامرات', 'Adventure', 'adventure'),
    N('humor', 'كوميديا', 'Humor', 'humorous fiction'),
    N('war', 'حرب', 'War fiction', 'war stories'),
    N('ya', 'ناشئة', 'Young adult', 'young adult fiction'),
  ] },
  { id: 'nonfiction', kind: 'nonfiction', ar: 'غير روائي', en: 'Non-fiction', sub: [
    N('history', 'تاريخ', 'History', 'history', [N('ancient', 'التاريخ القديم', 'Ancient history', 'ancient history'), N('medieval', 'العصور الوسطى', 'Medieval', 'middle ages'), N('ww2', 'الحرب العالمية الثانية', 'World War II', 'world war, 1939-1945'), N('islamhist', 'التاريخ الإسلامي', 'Islamic history', 'islamic history'), N('egypt', 'مصر', 'Egypt', 'egypt')]),
    N('biography', 'سير ذاتية', 'Biography', 'biography', [N('memoir', 'مذكرات', 'Memoirs', 'autobiography'), N('leaders', 'قادة وسياسيون', 'Leaders', 'heads of state')]),
    N('philosophy', 'فلسفة', 'Philosophy', 'philosophy', [N('ethics', 'أخلاق', 'Ethics', 'ethics'), N('stoic', 'رواقية', 'Stoicism', 'stoics'), N('exist', 'وجودية', 'Existentialism', 'existentialism')]),
    N('psychology', 'علم نفس', 'Psychology', 'psychology'),
    N('selfhelp', 'تطوير ذات', 'Self-help', 'self-help', [N('habits', 'عادات وإنتاجية', 'Habits & productivity', 'habit'), N('success', 'نجاح', 'Success', 'success')]),
    N('business', 'أعمال', 'Business', 'business', [N('entre', 'ريادة أعمال', 'Entrepreneurship', 'entrepreneurship'), N('leader', 'قيادة', 'Leadership', 'leadership'), N('marketing', 'تسويق', 'Marketing', 'marketing')]),
    N('economics', 'اقتصاد', 'Economics', 'economics', [N('finance', 'استثمار وتمويل', 'Investing & finance', 'investments')]),
    N('science', 'علوم', 'Science', 'science', [N('physics', 'فيزياء', 'Physics', 'physics'), N('astro', 'فلك', 'Astronomy', 'astronomy'), N('bio', 'أحياء', 'Biology', 'biology'), N('math', 'رياضيات', 'Mathematics', 'mathematics'), N('computers', 'حاسوب وتقنية', 'Computers & technology', 'computers')]),
    N('politics', 'سياسة', 'Politics', 'political science'),
    N('religion', 'دين', 'Religion', 'religion', [N('islam', 'إسلام', 'Islam', 'islam'), N('christ', 'مسيحية', 'Christianity', 'christianity'), N('buddhism', 'بوذية', 'Buddhism', 'buddhism')]),
    N('essays', 'مقالات', 'Essays', 'essays'),
    N('travel', 'رحلات', 'Travel', 'travel'),
    N('health', 'صحة', 'Health', 'health'),
    N('art', 'فن', 'Art', 'art'),
    N('truecrime', 'جرائم حقيقية', 'True crime', 'true crime'), N('spirit', 'روحانيات', 'Spirituality', 'spirituality'), N('sports', 'رياضة', 'Sports', 'sports'), N('music', 'موسيقى', 'Music', 'music'), N('cook', 'طبخ', 'Cookbooks', 'cooking'), N('parenting', 'تربية', 'Parenting', 'parenting'), N('education', 'تعليم', 'Education', 'education'), N('nature', 'طبيعة', 'Nature', 'nature'),
  ] },
  { id: 'other', kind: 'other', ar: 'أخرى', en: 'Other', sub: [
    N('poetry', 'شعر', 'Poetry', 'poetry'), N('drama', 'مسرحيات', 'Plays / drama', 'drama'), N('shorts', 'قصص قصيرة', 'Short stories', 'short stories'),
    N('comics', 'كوميكس ورسوم', 'Comics & graphic novels', 'comics & graphic novels'), N('manga', 'مانغا', 'Manga', 'manga'), N('kids', 'أطفال', "Children's", "children's literature"), N('anthology', 'مختارات', 'Anthologies', 'anthologies'),
  ] },
];
const FIC_EX = ' AND -subject:"history and criticism" AND -subject:"criticism" AND -subject:"biography" AND -subject:"nonfiction" AND -subject:"non-fiction"';
const NONFIC_EX = ' AND -subject:"fiction" AND -subject:"juvenile fiction" AND -subject:"stories"';
function olQuery(kind, q) {
  const base = `subject:"${q}" AND ratings_count:[10 TO *]`;
  if (kind === 'fiction') return base + ' AND subject:"fiction"' + FIC_EX;
  if (kind === 'nonfiction') return base + NONFIC_EX;
  return base;
}
function isFictionCats(cats) { return (cats || []).some(c => /fiction|novel|stories|fantasy/i.test(c) && !/nonfiction|non-fiction|criticism/i.test(c)); }
function isNonFictionCats(cats) { return !(cats || []).length || (cats || []).every(c => !/fiction|novel|stories/i.test(c) || /nonfiction|non-fiction|criticism/i.test(c)); }

export async function topBySubject(subject, limit = 20) {
  const q = `subject:"${subject}" AND ratings_count:[25 TO *]`;
  const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&sort=rating&limit=${limit}&fields=key,title,author_name,cover_i,first_publish_year,subject,isbn,ratings_average,ratings_count`);
  if (!res.ok) throw new Error('network ' + res.status);
  const data = await res.json();
  return (data.docs || []).map(d => ({ olKey: (d.key || '').replace('/works/', ''), title: d.title, author: (d.author_name || [])[0] || '', year: d.first_publish_year || '',
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : '', subjects: (d.subject || []).slice(0, 8), isbn: (d.isbn || [])[0] || '', rating: d.ratings_average || 0, ratingCount: d.ratings_count || 0 }));
}

/* ---------- extra sources (all public, keyless unless noted) ---------- */
const PAGE = 24;
export const YEAR_RANGES = [['', 'كل السنوات', 'All years'], ['2020-2029', '2020–2029', '2020–2029'], ['2010-2019', '2010–2019', '2010–2019'], ['2000-2009', '2000–2009', '2000–2009'], ['1990-1999', '1990–1999', '1990–1999'], ['1980-1989', '1980–1989', '1980–1989'], ['0-1979', 'قبل 1980', 'Before 1980']];
function yrClause(yr) { if (!yr) return ''; const [a, b] = yr.split('-'); return ` AND first_publish_year:[${a || '*'} TO ${b || '*'}]`; }
function inYear(it, yr) { if (!yr) return true; const [a, b] = yr.split('-').map(Number); const y = parseInt(it.year, 10); return !isNaN(y) && y >= a && y <= b; }

export async function topOL(node, page) {
  const q = olQuery(node.kind, node.q) + yrClause(node.yr);
  const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&sort=rating&limit=${PAGE}&offset=${page * PAGE}&fields=key,title,author_name,cover_i,first_publish_year,subject,isbn,ratings_average,ratings_count`);
  if (!res.ok) throw new Error('Open Library ' + res.status);
  const d = await res.json();
  return { items: (d.docs || []).map(x => ({ olKey: (x.key || '').replace('/works/', ''), title: x.title, author: (x.author_name || [])[0] || '', year: x.first_publish_year || '',
    cover: x.cover_i ? `https://covers.openlibrary.org/b/id/${x.cover_i}-L.jpg` : '', subjects: (x.subject || []).slice(0, 8), isbn: (x.isbn || [])[0] || '', rating: x.ratings_average || 0, ratingCount: x.ratings_count || 0 })), more: (page + 1) * PAGE < (d.numFound || 0) };
}
export async function topGB(node, page) {
  const subject = node.q;
  const key = (store.getState().settings.gbKey || '').trim();
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent('subject:' + (node.kind === 'fiction' ? 'fiction ' : '') + subject)}&orderBy=relevance&printType=books&maxResults=${PAGE}&startIndex=${page * PAGE}${key ? '&key=' + encodeURIComponent(key) : ''}`);
  if (res.status === 429) throw new Error(getLang() === 'ar' ? 'Google Books: الحد المجاني خلص. حط مفتاح API في الإعدادات.' : 'Google Books quota reached. Add an API key in Settings.');
  if (!res.ok) throw new Error('Google Books ' + res.status);
  const d = await res.json();
  const keep = x => { const c = (x.volumeInfo || {}).categories || []; return node.kind === 'fiction' ? isFictionCats(c) : node.kind === 'nonfiction' ? isNonFictionCats(c) : true; };
  return { items: (d.items || []).filter(keep).map(x => { const v = x.volumeInfo || {}; const ids = v.industryIdentifiers || [];
    return { olKey: '', title: v.title || '?', author: (v.authors || [])[0] || '', year: (v.publishedDate || '').slice(0, 4),
      cover: (v.imageLinks && (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail) || '').replace('http://', 'https://').replace('zoom=1', 'zoom=2'), subjects: (v.categories || []).slice(0, 6),
      isbn: ((ids.find(i => i.type === 'ISBN_13') || ids[0] || {}).identifier) || '', rating: v.averageRating || 0, ratingCount: v.ratingsCount || 0 }; }).filter(x => inYear(x, node.yr)),
    more: (page + 1) * PAGE < (d.totalItems || 0) && (d.items || []).length > 0 };
}
export async function topGut(topic, page) {
  const res = await fetch(`https://gutendex.com/books/?topic=${encodeURIComponent(topic)}&sort=popular&page=${page + 1}`);
  if (!res.ok) throw new Error('Gutendex ' + res.status);
  const d = await res.json();
  return { items: (d.results || []).map(x => ({ olKey: '', title: x.title, author: ((x.authors || [])[0] || {}).name || '', year: '', cover: (x.formats || {})['image/jpeg'] || '', subjects: (x.subjects || []).slice(0, 4), isbn: '', rating: 0, ratingCount: 0 })), more: !!d.next };
}
const SOURCES = { ol: ['Open Library', topOL], gb: ['Google Books', topGB] };
export async function wikidataAward(qid, page) {
  const sp = `SELECT ?wLabel ?aLabel ?year WHERE { ?w wdt:P166 wd:${qid} . OPTIONAL{?w wdt:P50 ?a} OPTIONAL{?w wdt:P577 ?d . BIND(YEAR(?d) AS ?year)} SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ar". } } ORDER BY DESC(?year) LIMIT ${PAGE} OFFSET ${page * PAGE}`;
  const res = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sp));
  if (!res.ok) throw new Error('Wikidata ' + res.status);
  const d = await res.json(); const seen = new Set();
  const items = d.results.bindings.map(b => ({ olKey: '', title: b.wLabel.value, author: b.aLabel ? b.aLabel.value : '', year: b.year ? b.year.value : '', cover: '', subjects: [], isbn: '', rating: 0, ratingCount: 0 }))
    .filter(x => !/^Q\d+$/.test(x.title) && !seen.has(x.title + x.author) && seen.add(x.title + x.author));
  return { items, more: d.results.bindings.length === PAGE };
}
const WD_AWARDS = [['pulitzer', 'بوليتزر (رواية)', 'Pulitzer (Fiction)', 'Q833633'], ['arabic', 'الجائزة العالمية للرواية العربية', 'Intl. Prize for Arabic Fiction', 'Q4118790'],
  ['nba', 'الجائزة الوطنية للكتاب', 'National Book Award (Fiction)', 'Q3873144'], ['goncourt', 'غونكور', 'Prix Goncourt', 'Q187300'],
  ['hugoall', 'هوغو (القائمة الكاملة)', 'Hugo (full list)', 'Q255032'], ['nebulaall', 'نيبولا (القائمة الكاملة)', 'Nebula (full list)', 'Q266012'], ['bookerall', 'بوكر (القائمة الكاملة)', 'Booker (full list)', 'Q160082']];

/* ---------- view ---------- */
const ar0 = (a, e) => getLang() === 'ar' ? a : e;
export function renderDiscover(view) {
  view.innerHTML = `
    <div class="view-head"><h1>${t('navDiscover')}</h1></div>
    <div class="disc-section"><div class="search-row">
      <select id="dScope"><option value="all">${ar0('الكل', 'All')}</option><option value="title">${ar0('العنوان', 'Title')}</option><option value="author">${ar0('المؤلف', 'Author')}</option><option value="subject">${ar0('التصنيف', 'Subject')}</option></select>
      <input id="dQ" placeholder="${ar0('دوّر في ملايين الكتب…', 'Search millions of books…')}">
      <button id="dGo" class="btn btn-primary">🔍 ${ar0('بحث', 'Search')}</button></div></div>
    <div class="disc-section"><div class="chip-row" id="moodGrid" style="margin-bottom:0"></div></div>
    <div class="disc-section"><h2 style="margin-bottom:.7rem">${t('recommendations')}</h2>
      <p class="muted" id="recHint" style="margin-bottom:.7rem"></p><div class="award-row" id="recGrid"></div></div>
    <div class="disc-section"><h2 style="margin-bottom:.7rem">${t('awards')}</h2>
      <div class="chip-row" id="awardChips"></div><div class="award-row" id="awardList"></div></div>
    <div class="disc-section"><h2 style="margin-bottom:.7rem">${t('topRated')}</h2><div class="award-row" id="topRatedRow"></div></div>
    <div class="disc-section"><h2 style="margin-bottom:.4rem">🏅 ${getLang() === 'ar' ? 'أفضل القوائم (حسب تقييمات Open Library)' : 'Top lists (by Open Library ratings)'}</h2>
      <p class="muted" style="margin-bottom:.6rem">${getLang() === 'ar' ? 'أعلى الكتب تقييمًا في كل تصنيف. تقدر تحفظ أي قائمة كقائمة قراءة عندك. ولو عندك مكتبة Goodreads، استوردها من تبويب القوائم.' : 'Highest-rated books per subject. Save any list as your own reading list. Got a Goodreads library? Import its CSV from the Lists tab.'}</p>
      <div style="margin-bottom:.6rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:center"><span><label class="muted">${getLang() === 'ar' ? 'المصدر' : 'Source'}: </label><select id="topSrc">${Object.entries(SOURCES).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></span>
      <span><label class="muted">${getLang() === 'ar' ? 'سنوات الإصدار' : 'Published'}: </label><select id="topYear">${YEAR_RANGES.map(([v, a, e]) => `<option value="${v}">${getLang() === 'ar' ? a : e}</option>`).join('')}</select></span></div>
      <div class="chip-row" id="topKinds"></div><div id="topCrumb" class="muted" style="margin:.4rem 0"></div><div class="chip-row" id="topChips"></div></div>
    <div id="discResults" class="disc-section hidden"><div style="display:flex;gap:.8rem;align-items:center;flex-wrap:wrap;margin-bottom:.7rem"><h2 style="margin:0" id="discResultsTitle"></h2><select id="discSort" class="hidden" title="${getLang() === 'ar' ? 'الترتيب' : 'Sort'}">${sortOptionsHTML('default')}</select></div><div class="grid" id="discResultsGrid"></div></div>`;

  const mg = $('#moodGrid', view);
  MOODS.forEach(m => {
    const c = document.createElement('button'); c.className = 'chip';
    c.textContent = m.icon + ' ' + t('mood_' + m.id);
    c.onclick = () => showResults(view, t('mood_' + m.id), async page => { const items = await searchOpenLibrary('', { subject: m.subject, limit: 24, offset: page * 24 }); return { items, more: items.length === 24 }; });
    mg.appendChild(c);
  });

  const runSearch = () => {
    const q = $('#dQ', view).value.trim(); if (!q) return;
    const scope = $('#dScope', view).value;
    const scopeName = $('#dScope', view).selectedOptions[0].textContent;
    showResults(view, '🔍 ' + q + ' · ' + scopeName, page => searchScoped(q, scope, page));
  };
  $('#dGo', view).onclick = runSearch;
  $('#dQ', view).addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });
  const takePending = () => { try {
    const ps = JSON.parse(sessionStorage.getItem('qari.pendingSearch') || 'null');
    if (ps && ps.q) { sessionStorage.removeItem('qari.pendingSearch'); $('#dScope', view).value = ps.scope || 'all'; $('#dQ', view).value = ps.q; runSearch(); }
  } catch {} };
  takePending();
  window.__qariDiscoverPending = takePending;

  const chips = $('#awardChips', view);
  [['hugo', t('hugo')], ['nebula', t('nebula')], ['booker', t('booker')]].forEach(([k, label], i) => {
    const chip = document.createElement('button'); chip.className = 'chip' + (i === 0 ? ' active' : '');
    chip.textContent = label;
    chip.onclick = () => { chips.querySelectorAll('.chip').forEach(x => x.classList.remove('active')); chip.classList.add('active'); renderAward(view, k); };
    chips.appendChild(chip);
  });
  const ar = getLang() === 'ar', nm = n => ar ? n.ar : n.en;
  const kindsEl = $('#topKinds', view), tc = $('#topChips', view), crumb = $('#topCrumb', view);
  let lastRun = null;
  const startList = (node, path) => { const src = $('#topSrc', view).value; const yr = $('#topYear', view).value; const ttl = path.map(nm).join(' › ');
    showResults(view, '🏅 ' + ttl + (yr ? ' · ' + $('#topYear', view).selectedOptions[0].textContent : '') + ' · ' + SOURCES[src][0], page => SOURCES[src][1]({ kind: path[0].kind, q: node.q, yr }, page), true); };
  const rerun = () => { if (lastRun) lastRun(); };
  $('#topSrc', view).onchange = rerun; $('#topYear', view).onchange = rerun;
  const showLevel = (nodes, path) => {
    tc.innerHTML = ''; crumb.textContent = path.map(nm).join(' › ');
    nodes.forEach(n => { const chip = document.createElement('button'); chip.className = 'chip'; chip.textContent = nm(n) + (n.sub && n.sub.length ? ' ▾' : '');
      chip.onclick = () => { const np = path.concat(n); if (n.q) { startList(n, np); lastRun = () => startList(n, np); }
        if (n.sub && n.sub.length) { const back = path.length ? [] : []; showLevel(n.sub, np); addBack(nodes, path); } else { tc.querySelectorAll('.chip').forEach(x => x.classList.remove('active')); } };
      tc.appendChild(chip); });
  };
  const addBack = (parentNodes, parentPath) => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = '⬅ ' + (ar ? 'رجوع' : 'Back'); b.onclick = () => showLevel(parentNodes, parentPath); tc.prepend(b); };
  CATS.forEach(c => { const chip = document.createElement('button'); chip.className = 'chip'; chip.textContent = nm(c);
    chip.onclick = () => { kindsEl.querySelectorAll('.chip').forEach(x => x.classList.remove('active')); chip.classList.add('active'); showLevel(c.sub, [c]); };
    kindsEl.appendChild(chip); });
  kindsEl.firstChild.click();
  WD_AWARDS.forEach(([k, ar, en, qid]) => { const chip = document.createElement('button'); chip.className = 'chip'; chip.textContent = (getLang() === 'ar' ? ar : en) + ' ↗';
    chip.onclick = () => showResults(view, '🏆 ' + (getLang() === 'ar' ? ar : en) + ' · Wikidata', page => wikidataAward(qid, page)); chips.appendChild(chip); });
  renderAward(view, 'hugo');
  renderTopRatedRow(view);
  renderRecommendations(view);
}

function awardCard(title, author, year, view) {
  const c = document.createElement('div'); c.className = 'book-card'; c.style.minWidth = '150px';
  c.innerHTML = `<div class="cover">${placeholderHTML(title, '🏆')}</div>
    <div class="book-meta"><div class="book-title">${esc(title)}</div><div class="book-author">${authorHTML(author)} · ${year}</div></div>`;
  c.onclick = () => showResults(view, title, () => searchOpenLibrary(title + ' ' + author, { limit: 4 }));
  const cv = c.querySelector('.cover');
  const load = async () => { const f = await findCover(title, author); if (f && f.cover) { cv.innerHTML = coverImgHTML({ cover: f.cover, title }, '🏆'); if (f.olKey) c.onclick = () => { location.hash = '#/work/' + f.olKey; }; } };
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '300px' }); io.observe(c); } else load();
  return c;
}
function renderAward(view, key) {
  const host = $('#awardList', view); host.innerHTML = '';
  AWARDS[key].forEach(([ti, au, yr]) => host.appendChild(awardCard(ti, au, yr, view)));
}
function renderTopRatedRow(view) {
  const host = $('#topRatedRow', view); host.innerHTML = '';
  const rated = store.getState().books.filter(b => b.rating >= 4).sort((a, b) => b.rating - a.rating).slice(0, 8);
  if (!rated.length) { host.innerHTML = `<p class="muted">${t('needRatings')}</p>`; return; }
  rated.forEach(b => {
    const c = document.createElement('div'); c.className = 'book-card'; c.style.minWidth = '150px';
    c.innerHTML = `<div class="cover">${coverImgHTML(b, '⭐')}</div>
      <div class="book-meta"><div class="book-title">${esc(b.title)}</div><div class="book-author">${'★'.repeat(b.rating)}</div></div>`;
    c.onclick = () => { location.hash = '#/book/' + b.id; };
    host.appendChild(c);
  });
}

async function renderRecommendations(view) {
  const hint = $('#recHint', view), grid = $('#recGrid', view);
  const loved = store.getState().books.filter(b => b.rating >= 4 && (b.subjects || []).length);
  if (!loved.length) { hint.textContent = t('needRatings'); return; }
  hint.textContent = t('loading');
  const freq = {};
  loved.forEach(b => b.subjects.forEach(s => { freq[s] = (freq[s] || 0) + 1; }));
  const topSubjects = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([s]) => s);
  const owned = new Set(store.getState().books.map(b => (b.title || '').toLowerCase()));
  try {
    const lists = await Promise.all(topSubjects.map(s => searchOpenLibrary('', { subject: s.toLowerCase().replace(/\s+/g, '_'), limit: 8 }).catch(() => [])));
    const items = lists.flat().filter(x => !owned.has(x.title.toLowerCase())).slice(0, 8);
    hint.textContent = topSubjects.length ? `(${topSubjects.join(' · ')})` : '';
    grid.innerHTML = '';
    items.forEach(it => { const c = recCard(it, view); c.style.minWidth = '150px'; c.style.maxWidth = '150px'; grid.appendChild(c); });
  } catch { hint.textContent = t('dictNone'); }
}

function recCard(it, view) {
  const c = document.createElement('div'); c.className = 'book-card';
  c.innerHTML = `<div class="cover">${coverImgHTML(it)}</div>
    <div class="book-meta"><div class="book-title">${esc(it.title)}</div><div class="book-author">${authorHTML(it.author)}</div>${it.rating ? `<div class="muted">★ ${it.rating.toFixed(1)} (${it.ratingCount})</div>` : ''}
    <button class="btn btn-primary" style="margin-top:.4rem;font-size:.75rem;padding:.25rem .7rem">${t('addToLibrary')}</button></div>`;
  c.onclick = async () => {
    if (it.olKey) { location.hash = '#/work/' + it.olKey; return; }
    toast(t('loading'));
    const f = await findCover(it.title, it.author);
    if (f && f.olKey) { it.olKey = f.olKey; location.hash = '#/work/' + f.olKey; }
    else toast(getLang() === 'ar' ? 'مش لاقي صفحة للكتاب ده في Open Library' : 'No Open Library page found for this book', 3000);
  };
  if (!it.cover && !it.isbn) {
    const run = async () => { const f = await findCover(it.title, it.author); if (f) { if (f.cover) { it.cover = f.cover; c.querySelector('.cover').innerHTML = coverImgHTML(it); } if (f.olKey) { it.olKey = f.olKey; c.onclick = () => { location.hash = '#/work/' + f.olKey; }; } } };
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); run(); } }, { rootMargin: '300px' }); io.observe(c); } else run();
  }
  c.querySelector('button').onclick = e => {
    e.stopPropagation();
    store.addBook({ title: it.title, author: it.author, format: 'web', cover: it.cover, source: 'openlibrary', subjects: it.subjects, isbn: it.isbn, olKey: it.olKey || '', year: it.year || '', shelf: 'want' });
    e.target.textContent = t('added'); e.target.disabled = true; toast(t('added'));
  };
  return c;
}

async function showResults(view, title, fetcher, saveable = false) {
  const sec = $('#discResults', view), grid = $('#discResultsGrid', view), ttl = $('#discResultsTitle', view), sortSel = $('#discSort', view);
  sec.classList.remove('hidden'); ttl.textContent = title;
  grid.innerHTML = `<p class="muted">${t('loading')}</p>`;
  sec.scrollIntoView({ behavior: 'smooth' });
  const all = []; let page = 0, more = true, busy = false, token = {};
  grid.__token = token;
  let sortMode = 'default', saveBtn = null;
  if (sortSel) { sortSel.value = 'default'; sortSel.classList.add('hidden'); sortSel.onchange = () => { sortMode = sortSel.value; paint(); }; }
  const paint = () => {
    grid.innerHTML = '';
    if (!all.length) { grid.innerHTML = `<p class="muted">${t('noResults')}</p>`; return; }
    if (saveBtn) grid.appendChild(saveBtn);
    (sortMode === 'default' ? all : sortBooks(all, sortMode)).forEach(it => grid.appendChild(recCard(it, view)));
  };
  const old = sec.querySelector('.more-box'); if (old) old.remove();
  const box = document.createElement('div'); box.className = 'more-box'; sec.appendChild(box);
  const loadPage = async () => {
    if (busy || !more || grid.__token !== token) return; busy = true;
    try {
      const r = await fetcher(page); const items = Array.isArray(r) ? r : r.items; more = Array.isArray(r) ? false : r.more; page++;
      items.forEach(it => all.push(it));
      if (page === 1 && saveable && items.length && !saveBtn) {
        saveBtn = document.createElement('button'); saveBtn.className = 'btn btn-primary'; saveBtn.style.gridColumn = '1/-1'; saveBtn.textContent = '📋 ' + (getLang() === 'ar' ? 'احفظها كقائمة قراءة (كل اللي ظاهر)' : 'Save as reading list (everything loaded)');
        saveBtn.onclick = () => {
          const l = store.createList(title.replace(/^[^ ]+ /, '').split(' · ')[0], 'Open Library');
          all.forEach(it => { let bk = (it.olKey && store.findBookByOl(it.olKey)) || store.getState().books.find(x => x.title === it.title && x.author === it.author);
            if (!bk) bk = store.addBook({ title: it.title, author: it.author, format: 'web', cover: it.cover, source: 'openlibrary', subjects: it.subjects, isbn: it.isbn, olKey: it.olKey || '', year: it.year || '', shelf: 'want' });
            store.listToggleBook(l.id, bk.id); });
          toast(t('added')); location.hash = '#/lists/' + l.id;
        };
      }
      paint();
      if (sortSel) sortSel.classList.toggle('hidden', all.length < 2);
    } catch (e) { if (page === 0) grid.innerHTML = `<p class="muted">⚠ ${esc(e.message)}</p>`; more = false; }
    busy = false;
    box.innerHTML = more ? `<button class="btn" style="margin:1rem auto;display:block">${getLang() === 'ar' ? 'عرض المزيد' : 'Load more'}</button>` : (all.length ? `<p class="muted" style="text-align:center">${all.length} ${getLang() === 'ar' ? 'كتاب' : 'books'}</p>` : '');
    const btn = box.querySelector('button'); if (btn) { btn.onclick = loadPage; if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); loadPage(); } }, { rootMargin: '600px' }); io.observe(btn); } }
  };
  loadPage();
}

export function bindDiscover() { /* all bindings done in render */ }
