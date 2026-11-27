(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/store.js
  var store_exports = {};
  __export(store_exports, {
    addBook: () => addBook,
    addComment: () => addComment,
    addCustomShelf: () => addCustomShelf,
    addHighlight: () => addHighlight,
    addImage: () => addImage,
    badgeList: () => badgeList,
    bookComments: () => bookComments,
    bookHighlights: () => bookHighlights,
    bookImages: () => bookImages,
    createList: () => createList,
    currentStreak: () => currentStreak,
    deleteList: () => deleteList,
    exportJSON: () => exportJSON,
    findBookByOl: () => findBookByOl,
    finishedThisMonth: () => finishedThisMonth,
    finishedThisYear: () => finishedThisYear,
    getBook: () => getBook,
    getList: () => getList,
    getMeta: () => getMeta,
    getMetaStale: () => getMetaStale,
    getState: () => getState,
    importJSON: () => importJSON,
    listHas: () => listHas,
    listMove: () => listMove,
    listToggleBook: () => listToggleBook,
    listsOfBook: () => listsOfBook,
    load: () => load,
    logSession: () => logSession,
    onChange: () => onChange,
    recheckAchievements: () => recheckAchievements,
    removeBook: () => removeBook,
    removeComment: () => removeComment,
    removeCustomShelf: () => removeCustomShelf,
    removeHighlight: () => removeHighlight,
    removeImage: () => removeImage,
    replaceState: () => replaceState,
    save: () => save,
    sessionsThisYear: () => sessionsThisYear,
    setMeta: () => setMeta,
    snapshot: () => snapshot,
    today: () => today,
    toggleFavorite: () => toggleFavorite,
    uid: () => uid,
    updateBook: () => updateBook,
    updateComment: () => updateComment,
    updateHighlight: () => updateHighlight,
    updateImage: () => updateImage,
    updateList: () => updateList
  });
  var KEY = "qari.state.v1";
  var DEFAULTS = () => ({
    version: 1,
    settings: {
      lang: "ar",
      theme: "sepia",
      fontSize: 19,
      lineHeight: 1.9,
      fontFamily: "auto",
      flow: "paginated",
      ttsVoice: "",
      ttsVoices: {},
      ttsRate: 1,
      goalYear: 24,
      goalMonth: 2,
      uiLangToggled: false,
      gbKey: "",
      layout: "auto",
      findSites: []
    },
    books: [],
    // {id,title,author,format,cover,fileKey,source,addedAt,shelf,customShelves:[],progress,location,totalPages,currentPage,rating,review,subjects,isbn,finishedAt}
    customShelves: [],
    // ["رف كذا"]
    highlights: [],
    // {id,bookId,text,note,cfi,page,color,createdAt}
    sessions: [],
    // {bookId,start,end,minutes,pages}
    readingDays: {},
    // {"2026-11-25": minutes}
    achievements: {},
    // {id: isoDate}
    comments: [],
    // {id,bookId,chapter,author,text,createdAt,origin:'me'|'buddy'}
    lists: [],
    // {id,name,desc,bookIds:[],createdAt}
    images: [],
    // user images inside books {id,bookId,fileKey,cfi|page+at,caption,createdAt}
    metaCache: {},
    // olKey -> {ts, meta}
    buddy: { name: "" },
    activity: []
    // {type:'rating'|'review'|'comment'|'finished',bookId,text,createdAt}
  });
  var state = DEFAULTS();
  var listeners = /* @__PURE__ */ new Set();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign(DEFAULTS(), parsed);
        state.settings = Object.assign(DEFAULTS().settings, parsed.settings || {});
      }
    } catch (e) {
      console.warn("state load failed, starting fresh", e);
    }
    return state;
  }
  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
    listeners.forEach((fn) => fn(state));
  }
  function getState() {
    return state;
  }
  function onChange(fn) {
    listeners.add(fn);
  }
  var uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  var today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  function addBook(book) {
    const b = Object.assign({
      id: uid(),
      title: "\u0628\u062F\u0648\u0646 \u0639\u0646\u0648\u0627\u0646",
      author: "",
      format: "txt",
      cover: "",
      fileKey: "",
      source: "local",
      addedAt: (/* @__PURE__ */ new Date()).toISOString(),
      shelf: "want",
      customShelves: [],
      progress: 0,
      location: "",
      totalPages: 0,
      currentPage: 0,
      rating: 0,
      review: "",
      subjects: [],
      isbn: "",
      year: "",
      finishedAt: null,
      favorite: false,
      olKey: ""
    }, book);
    state.books.push(b);
    save();
    return b;
  }
  function getBook(id) {
    return state.books.find((b) => b.id === id);
  }
  function updateBook(id, patch) {
    const b = getBook(id);
    if (!b) return null;
    Object.assign(b, patch);
    if (patch.shelf === "finished" && !b.finishedAt) {
      b.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      b.progress = 100;
      pushActivity({ type: "finished", bookId: id, text: b.title });
    }
    if (patch.rating !== void 0 || patch.review !== void 0) {
      pushActivity({ type: patch.review !== void 0 ? "review" : "rating", bookId: id, text: b.title });
    }
    save();
    return b;
  }
  function removeBook(id) {
    state.books = state.books.filter((b) => b.id !== id);
    state.highlights = state.highlights.filter((h) => h.bookId !== id);
    state.comments = state.comments.filter((c) => c.bookId !== id);
    state.images = (state.images || []).filter((i) => i.bookId !== id);
    state.lists.forEach((l) => {
      l.bookIds = l.bookIds.filter((x) => x !== id);
    });
    save();
  }
  function addImage(img) {
    const o = Object.assign({ id: uid(), caption: "", createdAt: (/* @__PURE__ */ new Date()).toISOString() }, img);
    (state.images = state.images || []).push(o);
    o.fileKey = o.fileKey || "img-" + o.id;
    save();
    return o;
  }
  function removeImage(id) {
    state.images = (state.images || []).filter((i) => i.id !== id);
    save();
  }
  function updateImage(id, patch) {
    const im = (state.images || []).find((i) => i.id === id);
    if (im) {
      Object.assign(im, patch);
      save();
    }
    return im;
  }
  function bookImages(bookId) {
    return (state.images || []).filter((i) => i.bookId === bookId);
  }
  function addCustomShelf(name) {
    if (name && !state.customShelves.includes(name)) {
      state.customShelves.push(name);
      save();
    }
  }
  function removeCustomShelf(name) {
    state.customShelves = state.customShelves.filter((s) => s !== name);
    state.books.forEach((b) => b.customShelves = (b.customShelves || []).filter((s) => s !== name));
    save();
  }
  function toggleFavorite(id) {
    const b = getBook(id);
    if (!b) return false;
    b.favorite = !b.favorite;
    save();
    return b.favorite;
  }
  function createList(name, desc = "") {
    const l = { id: uid(), name: name.trim(), desc, bookIds: [], createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    state.lists.push(l);
    save();
    return l;
  }
  function getList(id) {
    return state.lists.find((l) => l.id === id);
  }
  function updateList(id, patch) {
    const l = getList(id);
    if (l) {
      Object.assign(l, patch);
      save();
    }
  }
  function deleteList(id) {
    state.lists = state.lists.filter((l) => l.id !== id);
    save();
  }
  function listHas(id, bookId) {
    const l = getList(id);
    return !!l && l.bookIds.includes(bookId);
  }
  function listToggleBook(id, bookId) {
    const l = getList(id);
    if (!l) return false;
    const i = l.bookIds.indexOf(bookId);
    if (i >= 0) l.bookIds.splice(i, 1);
    else l.bookIds.push(bookId);
    save();
    return i < 0;
  }
  function listMove(id, bookId, dir) {
    const l = getList(id);
    if (!l) return;
    const i = l.bookIds.indexOf(bookId), j = i + dir;
    if (i < 0 || j < 0 || j >= l.bookIds.length) return;
    [l.bookIds[i], l.bookIds[j]] = [l.bookIds[j], l.bookIds[i]];
    save();
  }
  function listsOfBook(bookId) {
    return state.lists.filter((l) => l.bookIds.includes(bookId));
  }
  function findBookByOl(olKey) {
    return state.books.find((b) => b.olKey === olKey);
  }
  function getMeta(olKey, maxAgeMs = 30 * 864e5) {
    const m = state.metaCache[olKey];
    return m && Date.now() - m.ts < maxAgeMs ? m.meta : null;
  }
  function getMetaStale(olKey) {
    const m = state.metaCache[olKey];
    return m ? m.meta : null;
  }
  function setMeta(olKey, meta2) {
    state.metaCache[olKey] = { ts: Date.now(), meta: meta2 };
    const keys = Object.keys(state.metaCache);
    if (keys.length > 60) keys.sort((a, b) => state.metaCache[a].ts - state.metaCache[b].ts).slice(0, keys.length - 60).forEach((k) => delete state.metaCache[k]);
    save();
  }
  function addHighlight(h) {
    const hl = Object.assign({ id: uid(), note: "", color: "#ffd54a", createdAt: (/* @__PURE__ */ new Date()).toISOString() }, h);
    state.highlights.push(hl);
    save();
    return hl;
  }
  function updateHighlight(id, patch) {
    const h = state.highlights.find((x) => x.id === id);
    if (h) {
      Object.assign(h, patch);
      save();
    }
  }
  function removeHighlight(id) {
    state.highlights = state.highlights.filter((x) => x.id !== id);
    save();
  }
  function bookHighlights(bookId) {
    return state.highlights.filter((h) => h.bookId === bookId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  function logSession(bookId, minutes, pages) {
    if (minutes <= 0) return;
    const s = { bookId, start: Date.now() - minutes * 6e4, end: Date.now(), minutes: Math.round(minutes), pages: Math.max(0, Math.round(pages)) };
    state.sessions.push(s);
    const d = today();
    state.readingDays[d] = (state.readingDays[d] || 0) + s.minutes;
    checkAchievements();
    save();
  }
  function sessionsThisYear(year = (/* @__PURE__ */ new Date()).getFullYear()) {
    return state.sessions.filter((s) => new Date(s.end).getFullYear() === year);
  }
  function finishedThisYear(year = (/* @__PURE__ */ new Date()).getFullYear()) {
    return state.books.filter((b) => b.finishedAt && new Date(b.finishedAt).getFullYear() === year);
  }
  function finishedThisMonth() {
    const n = /* @__PURE__ */ new Date();
    return state.books.filter((b) => {
      if (!b.finishedAt) return false;
      const d = new Date(b.finishedAt);
      return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
    });
  }
  function currentStreak() {
    let streak = 0;
    const d = /* @__PURE__ */ new Date();
    if (!state.readingDays[today()]) d.setDate(d.getDate() - 1);
    while (state.readingDays[d.toISOString().slice(0, 10)] > 0) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }
  var BADGES = [
    { id: "first_book", icon: "\u{1F4D5}", name: { ar: "\u0623\u0648\u0644 \u0643\u062A\u0627\u0628", en: "First book" } },
    { id: "five_books", icon: "\u{1F4DA}", name: { ar: "\u0665 \u0643\u062A\u0628", en: "5 books" } },
    { id: "streak_3", icon: "\u{1F525}", name: { ar: "\u0663 \u0623\u064A\u0627\u0645 \u0645\u062A\u0648\u0627\u0635\u0644\u0629", en: "3-day streak" } },
    { id: "streak_7", icon: "\u26A1", name: { ar: "\u0623\u0633\u0628\u0648\u0639 \u0643\u0627\u0645\u0644", en: "7-day streak" } },
    { id: "highlight_10", icon: "\u{1F58A}", name: { ar: "\u0661\u0660 \u0647\u0627\u064A\u0644\u0627\u064A\u062A\u0633", en: "10 highlights" } },
    { id: "hour_10", icon: "\u23F0", name: { ar: "\u0661\u0660 \u0633\u0627\u0639\u0627\u062A \u0642\u0631\u0627\u0621\u0629", en: "10 hours" } },
    { id: "goal_year", icon: "\u{1F3C6}", name: { ar: "\u0647\u062F\u0641 \u0627\u0644\u0633\u0646\u0629", en: "Yearly goal" } },
    { id: "reviewer", icon: "\u270D\uFE0F", name: { ar: "\u0646\u0627\u0642\u062F", en: "Reviewer" } }
  ];
  function badgeList() {
    return BADGES.map((b) => ({ ...b, unlocked: !!state.achievements[b.id], unlockedAt: state.achievements[b.id] }));
  }
  function unlock(id) {
    if (!state.achievements[id]) state.achievements[id] = (/* @__PURE__ */ new Date()).toISOString();
  }
  function checkAchievements() {
    const done = state.books.filter((b) => b.finishedAt).length;
    if (done >= 1) unlock("first_book");
    if (done >= 5) unlock("five_books");
    const st = currentStreak();
    if (st >= 3) unlock("streak_3");
    if (st >= 7) unlock("streak_7");
    if (state.highlights.length >= 10) unlock("highlight_10");
    const mins = state.sessions.reduce((a, s) => a + s.minutes, 0);
    if (mins >= 600) unlock("hour_10");
    if (state.books.some((b) => (b.review || "").trim().length > 10)) unlock("reviewer");
    if (state.settings.goalYear > 0 && finishedThisYear().length >= state.settings.goalYear) unlock("goal_year");
  }
  function recheckAchievements() {
    checkAchievements();
    save();
  }
  function updateComment(id, patch) {
    const c = state.comments.find((x) => x.id === id);
    if (c) {
      Object.assign(c, patch, { editedAt: (/* @__PURE__ */ new Date()).toISOString() });
      save();
    }
  }
  function removeComment(id) {
    state.comments = state.comments.filter((x) => x.id !== id);
    save();
  }
  function addComment(c) {
    const cm = Object.assign({ id: uid(), createdAt: (/* @__PURE__ */ new Date()).toISOString(), origin: "me" }, c);
    state.comments.push(cm);
    pushActivity({ type: "comment", bookId: c.bookId, text: c.text }, false);
    save();
    return cm;
  }
  function bookComments(bookId) {
    return state.comments.filter((c) => c.bookId === bookId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  function pushActivity(a, doSave = true) {
    state.activity.unshift(Object.assign({ createdAt: (/* @__PURE__ */ new Date()).toISOString() }, a));
    if (state.activity.length > 200) state.activity.length = 200;
    if (doSave) save();
  }
  function exportJSON() {
    return JSON.stringify({ app: "qari", version: 1, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), data: state }, null, 2);
  }
  function importJSON(jsonText) {
    const incoming = JSON.parse(jsonText);
    const data = incoming.data || incoming;
    if (!data || !Array.isArray(data.books)) throw new Error("not a qari export");
    const mergeById = (cur, inc) => {
      const map = new Map(cur.map((x) => [x.id, x]));
      inc.forEach((x) => {
        if (x && x.id && !map.has(x.id)) {
          map.set(x.id, x);
          cur.push(x);
        }
      });
    };
    mergeById(state.books, data.books || []);
    mergeById(state.highlights, data.highlights || []);
    mergeById(state.sessions, data.sessions || []);
    mergeById(state.comments, data.comments || []);
    (data.lists || []).forEach((l) => {
      const mine = state.lists.find((x) => x.id === l.id);
      if (!mine) state.lists.push(l);
      else (l.bookIds || []).forEach((b) => {
        if (!mine.bookIds.includes(b)) mine.bookIds.push(b);
      });
    });
    (data.books || []).forEach((b) => {
      const mine = getBook(b.id);
      if (mine && b.favorite) mine.favorite = true;
    });
    (data.customShelves || []).forEach((s) => {
      if (!state.customShelves.includes(s)) state.customShelves.push(s);
    });
    Object.entries(data.readingDays || {}).forEach(([d, m]) => {
      state.readingDays[d] = Math.max(state.readingDays[d] || 0, m);
    });
    Object.assign(state.achievements, data.achievements || {});
    state.activity = (data.activity || []).concat(state.activity).slice(0, 200);
    if (data.buddy && data.buddy.name && !state.buddy.name) state.buddy = data.buddy;
    recheckAchievements();
    save();
  }
  function snapshot() {
    return JSON.parse(JSON.stringify(state));
  }
  function replaceState(data) {
    if (!data || !Array.isArray(data.books)) throw new Error("not a qari database");
    state = Object.assign(DEFAULTS(), data);
    state.settings = Object.assign(DEFAULTS().settings, data.settings || {});
    save();
  }

  // src/i18n.js
  var STR = {
    ar: {
      addImage: "\u0625\u0636\u0627\u0641\u0629 \u0635\u0648\u0631\u0629 \u0644\u0644\u0643\u062A\u0627\u0628",
      imgHint: "\u0627\u0644\u0635\u0648\u0631\u0629 \u0628\u062A\u062A\u062D\u0637 \u0628\u0639\u062F \u0627\u0644\u0646\u0635 \u0627\u0644\u0644\u064A \u0645\u062D\u062F\u062F\u0647\u060C \u0648\u0644\u0648 \u0645\u0641\u064A\u0634 \u062A\u062D\u062F\u064A\u062F \u0628\u0639\u062F \u0623\u0648\u0644 \u0641\u0642\u0631\u0629 \u0641\u064A \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629. \u0645\u0645\u0643\u0646 \u062A\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0635\u0648\u0631\u0629 \u062C\u0648\u0627 \u0627\u0644\u0643\u062A\u0627\u0628 \u0639\u0634\u0627\u0646 \u062A\u0645\u0633\u062D\u0647\u0627.",
      imgCaption: "\u062A\u0639\u0644\u064A\u0642 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)",
      imgChoose: "\u0627\u062E\u062A\u0627\u0631 \u0635\u0648\u0631\u0629",
      imgInBook: "\u0627\u0644\u0635\u0648\u0631 \u0641\u064A \u0627\u0644\u0643\u062A\u0627\u0628",
      imgNone: "\u0645\u0641\u064A\u0634 \u0635\u0648\u0631 \u0644\u0633\u0647.",
      imgNoPos: "\u0645\u0634 \u0642\u0627\u062F\u0631 \u0623\u062D\u062F\u062F \u0627\u0644\u0645\u0643\u0627\u0646\u060C \u0627\u0639\u0645\u0644 \u0635\u0641\u062D\u0629 \u0648\u062C\u0631\u0628 \u062A\u0627\u0646\u064A",
      imgNoPdf: "\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0635\u0648\u0631 \u0645\u062F\u0639\u0648\u0645\u0629 \u0641\u064A EPUB \u0648 TXT \u0628\u0633\u060C \u0645\u0634 PDF.",
      imgSize: "\u0627\u0644\u062D\u062C\u0645",
      toc: "\u062C\u062F\u0648\u0644 \u0627\u0644\u0645\u062D\u062A\u0648\u064A\u0627\u062A",
      tocNone: "\u0627\u0644\u0643\u062A\u0627\u0628 \u062F\u0647 \u0645\u0641\u064A\u0647\u0648\u0634 \u062C\u062F\u0648\u0644 \u0645\u062D\u062A\u0648\u064A\u0627\u062A. \u0627\u0633\u062A\u062E\u062F\u0645 \u0634\u0631\u064A\u0637 \u0627\u0644\u0635\u0641\u062D\u0627\u062A \u062A\u062D\u062A.",
      layoutAuto: "\u062A\u0646\u0633\u064A\u0642 \u062A\u0644\u0642\u0627\u0626\u064A",
      layoutPhone: "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u0645\u0648\u0628\u0627\u064A\u0644",
      layoutTablet: "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u062A\u0627\u0628\u0644\u062A",
      pagesPreparing: "\u0628\u064A\u062C\u0647\u0651\u0632 \u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0635\u0641\u062D\u0627\u062A\u060C \u062C\u0631\u0628 \u0643\u0645\u0627\u0646 \u062B\u0648\u0627\u0646\u064A",
      appName: "\u0642\u0627\u0631\u0626",
      navLibrary: "\u0645\u0643\u062A\u0628\u062A\u064A",
      navShelves: "\u0627\u0644\u0631\u0641\u0648\u0641",
      navStats: "\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A\u064A",
      navDiscover: "\u0627\u0643\u062A\u0634\u0641",
      navCommunity: "\u0627\u0644\u0645\u062C\u062A\u0645\u0639",
      navSettings: "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A",
      navLists: "\u0627\u0644\u0642\u0648\u0627\u0626\u0645",
      addBook: "\u0623\u0636\u0641 \u0643\u062A\u0627\u0628",
      tabFile: "\u0645\u0646 \u062C\u0647\u0627\u0632\u0643",
      tabOnline: "\u0628\u062D\u062B \u0623\u0648\u0646\u0644\u0627\u064A\u0646",
      dropHint: "\u0627\u062E\u062A\u0627\u0631 \u0645\u0644\u0641 EPUB \u0623\u0648 PDF \u0623\u0648 TXT",
      localNote: "\u0627\u0644\u0643\u062A\u0627\u0628 \u0628\u064A\u062A\u062D\u0641\u0638 \u0639\u0644\u0649 \u062C\u0647\u0627\u0632\u0643. \u0645\u0641\u064A\u0634 \u062D\u0627\u062C\u0629 \u0628\u062A\u062A\u0631\u0641\u0639 \u0625\u0644\u0627 \u0644\u0648 \u0634\u063A\u0651\u0644\u062A \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A\u0629) \u0645\u0646 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A.",
      searchPh: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0643\u062A\u0627\u0628 \u0623\u0648 ISBN\u2026",
      search: "\u0628\u062D\u062B",
      emptyLib: "\u0645\u0643\u062A\u0628\u062A\u0643 \u0641\u0627\u0636\u064A\u0629 \u0644\u0633\u0647",
      emptyLibSub: "\u0636\u064A\u0641 \u0623\u0648\u0644 \u0643\u062A\u0627\u0628 \u0645\u0646 \u062C\u0647\u0627\u0632\u0643 \u0623\u0648 \u062F\u0648\u0631 \u0623\u0648\u0646\u0644\u0627\u064A\u0646",
      shelf_want: "\u0639\u0627\u064A\u0632 \u0623\u0642\u0631\u0627",
      shelf_reading: "\u0628\u0642\u0631\u0627 \u062D\u0627\u0644\u064A\u064B\u0627",
      shelf_finished: "\u062E\u0644\u0635\u062A",
      customShelves: "\u0631\u0641\u0648\u0641 \u0645\u062E\u0635\u0635\u0629",
      newShelf: "\u0631\u0641 \u062C\u062F\u064A\u062F",
      shelfNamePh: "\u0627\u0633\u0645 \u0627\u0644\u0631\u0641\u2026",
      create: "\u0625\u0646\u0634\u0627\u0621",
      continueReading: "\u0643\u0645\u0651\u0644 \u0627\u0644\u0642\u0631\u0627\u0621\u0629",
      progress: "\u0627\u0644\u062A\u0642\u062F\u0645",
      pages: "\u0635\u0641\u062D\u0629",
      of: "\u0645\u0646",
      myGoals: "\u0623\u0647\u062F\u0627\u0641\u064A",
      yearlyGoal: "\u0647\u062F\u0641 \u0627\u0644\u0633\u0646\u0629",
      monthlyGoal: "\u0647\u062F\u0641 \u0627\u0644\u0634\u0647\u0631",
      booksFinished: "\u0643\u062A\u0627\u0628 \u062E\u0644\u0635\u062A",
      streak: "\u0623\u064A\u0627\u0645 \u0645\u062A\u0648\u0627\u0635\u0644\u0629",
      streakDays: "\u064A\u0648\u0645 \u0648\u0631\u0627 \u0628\u0639\u0636",
      todayMin: "\u062F\u0642\u0627\u064A\u0642 \u0627\u0644\u0646\u0647\u0627\u0631\u062F\u0647",
      totalMin: "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062F\u0642\u0627\u064A\u0642",
      pagesPerHour: "\u0635\u0641\u062D\u0629/\u0633\u0627\u0639\u0629",
      badges: "\u0627\u0644\u0623\u0648\u0633\u0645\u0629",
      weeklyChart: "\u0622\u062E\u0631 14 \u064A\u0648\u0645 (\u062F\u0642\u0627\u064A\u0642)",
      yearlySummary: "\u0645\u0644\u062E\u0635 \u0627\u0644\u0633\u0646\u0629",
      topBooks: "\u0623\u0639\u0644\u0649 \u0643\u062A\u0628 \u062A\u0642\u064A\u064A\u0645\u064B\u0627",
      setGoals: "\u0639\u062F\u0651\u0644 \u0627\u0644\u0623\u0647\u062F\u0627\u0641",
      save: "\u062D\u0641\u0638",
      cancel: "\u0625\u0644\u063A\u0627\u0621",
      delete: "\u062D\u0630\u0641",
      edit: "\u062A\u0639\u062F\u064A\u0644",
      recommendations: "\u062A\u0631\u0634\u064A\u062D\u0627\u062A \u0639\u0644\u0649 \u0630\u0648\u0642\u0643",
      awards: "\u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u062C\u0648\u0627\u0626\u0632",
      moodSearch: "\u062F\u0648\u0631 \u0639\u0644\u0649 \u062D\u0633\u0628 \u0645\u0632\u0627\u062C\u0643",
      needRatings: "\u0642\u064A\u0651\u0645 \u0643\u062A\u0628 \u0628\u0640 4 \u0646\u062C\u0648\u0645 \u0623\u0648 \u0623\u0643\u062A\u0631 \u0639\u0634\u0627\u0646 \u062A\u0638\u0647\u0631\u0644\u0643 \u062A\u0631\u0634\u064A\u062D\u0627\u062A",
      loading: "\u0628\u064A\u062D\u0645\u0651\u0644\u2026",
      noResults: "\u0645\u0641\u064A\u0634 \u0646\u062A\u0627\u0626\u062C",
      addToLibrary: "\u0636\u064A\u0641 \u0644\u0644\u0645\u0643\u062A\u0628\u0629",
      added: "\u0627\u062A\u0636\u0627\u0641 \u2713",
      reviews: "\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0627\u062A",
      myActivity: "\u0646\u0634\u0627\u0637\u064A",
      buddyRead: "\u0642\u0631\u0627\u0621\u0629 \u0645\u0634\u062A\u0631\u0643\u0629",
      buddyName: "\u0627\u0633\u0645 \u0635\u0627\u062D\u0628\u0643",
      chapterComments: "\u062A\u0639\u0644\u064A\u0642\u0627\u062A \u0627\u0644\u0641\u0635\u0648\u0644",
      writeReview: "\u0627\u0643\u062A\u0628 \u0645\u0631\u0627\u062C\u0639\u0629\u2026",
      yourRating: "\u062A\u0642\u064A\u064A\u0645\u0643",
      exportData: "\u062A\u0635\u062F\u064A\u0631 \u0628\u064A\u0627\u0646\u0627\u062A\u064A",
      importData: "\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0628\u064A\u0627\u0646\u0627\u062A",
      exportHighlights: "\u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0647\u0627\u064A\u0644\u0627\u064A\u062A\u0633",
      importNote: "\u062F\u0645\u062C \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646 \u0645\u0644\u0641 JSON (\u0645\u0634 \u0647\u064A\u0645\u0633\u062D \u0627\u0644\u0645\u0648\u062C\u0648\u062F)",
      exported: "\u0627\u062A\u0635\u062F\u0631 \u2713",
      imported: "\u0627\u062A\u062F\u0645\u062C \u2713",
      settings: "\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A",
      language: "\u0627\u0644\u0644\u063A\u0629",
      theme: "\u0627\u0644\u0645\u0638\u0647\u0631",
      themeLight: "\u0641\u0627\u062A\u062D",
      themeSepia: "\u0633\u064A\u0628\u064A\u0627",
      themeDark: "\u0644\u064A\u0644\u064A",
      themeBlack: "\u0623\u0633\u0648\u062F OLED",
      fontSize: "\u062D\u062C\u0645 \u0627\u0644\u062E\u0637",
      lineHeight: "\u062A\u0628\u0627\u0639\u062F \u0627\u0644\u0623\u0633\u0637\u0631",
      fontFamily: "\u062E\u0637 \u0627\u0644\u0642\u0631\u0627\u0621\u0629",
      readingMode: "\u0648\u0636\u0639 \u0627\u0644\u0642\u0631\u0627\u0621\u0629",
      paginated: "\u0635\u0641\u062D\u0627\u062A",
      scrolled: "\u062A\u0645\u0631\u064A\u0631",
      ttsVoice: "\u0635\u0648\u062A \u0627\u0644\u0642\u0631\u0627\u0621\u0629",
      ttsSpeed: "\u0627\u0644\u0633\u0631\u0639\u0629",
      ttsAutoVoice: "\u062A\u0644\u0642\u0627\u0626\u064A (\u0623\u0641\u0636\u0644 \u0635\u0648\u062A)",
      ttsTest: "\u062A\u062C\u0631\u0628\u0629",
      ttsLangAr: "\u0639\u0631\u0628\u064A",
      ttsLangEn: "\u0625\u0646\u062C\u0644\u064A\u0632\u064A",
      ttsNoVoices: "\u0623\u0635\u0648\u0627\u062A \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0644\u0633\u0647 \u0628\u062A\u062D\u0645\u0651\u0644 \u2014 \u0627\u0642\u0641\u0644 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0648\u0627\u0641\u062A\u062D\u0647\u0627 \u062A\u0627\u0646\u064A",
      ttsNaturalOk: "\u2605 \u0635\u0648\u062A \u0637\u0628\u064A\u0639\u064A",
      ttsNaturalTip: "\u0645\u0641\u064A\u0634 \u0635\u0648\u062A \u0637\u0628\u064A\u0639\u064A \u0644\u0644\u063A\u0629 \u0627\u0644\u0643\u062A\u0627\u0628 \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632 \u062F\u0647. \u0639\u0644\u0649 \u0648\u064A\u0646\u062F\u0648\u0632 \u0627\u0641\u062A\u062D \u0642\u0627\u0631\u0626 \u0641\u064A Microsoft Edge \u0648\u062C\u0631\u0628 \u062A\u0627\u0646\u064A \u2014 Edge \u0628\u064A\u0648\u0641\u0631 \u0623\u0635\u0648\u0627\u062A \u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A \u0627\u0644\u0637\u0628\u064A\u0639\u064A\u0629 (\u0633\u0644\u0645\u0649 \u0648\u0634\u0627\u0643\u0631 \u0644\u0644\u0639\u0631\u0628\u064A).",
      highlights: "\u0627\u0644\u0647\u0627\u064A\u0644\u0627\u064A\u062A\u0633",
      addNote: "\u0636\u064A\u0641 \u0645\u0644\u0627\u062D\u0638\u0629\u2026",
      noHighlights: "\u0644\u0633\u0647 \u0645\u0641\u064A\u0634 \u0647\u0627\u064A\u0644\u0627\u064A\u062A\u0633 \u0641\u064A \u0627\u0644\u0643\u062A\u0627\u0628 \u062F\u0647",
      startReading: "\u0627\u0628\u062F\u0623 \u0627\u0644\u0642\u0631\u0627\u0621\u0629",
      session: "\u062C\u0644\u0633\u0629",
      removeBook: "\u0627\u062D\u0630\u0641 \u0627\u0644\u0643\u062A\u0627\u0628",
      confirmDelete: "\u0645\u062A\u0623\u0643\u062F\u061F \u0647\u064A\u062A\u0645\u0633\u062D \u0627\u0644\u0643\u062A\u0627\u0628 \u0648\u0647\u0627\u064A\u0644\u0627\u064A\u062A\u0633\u0647.",
      markFinished: "\u0639\u0644\u0651\u0645 \u0643\u0645\u062E\u0644\u0635",
      moveTo: "\u0627\u0646\u0642\u0644 \u0644\u0631\u0641",
      comments: "\u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A",
      addComment: "\u0627\u0643\u062A\u0628 \u062A\u0639\u0644\u064A\u0642 \u0639\u0644\u0649 \u0627\u0644\u0641\u0635\u0644\u2026",
      send: "\u0623\u0631\u0633\u0644",
      asMe: "\u0623\u0646\u0627",
      asBuddy: "\u0635\u0627\u062D\u0628\u064A",
      rate: "\u0642\u064A\u0651\u0645",
      overview: "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629",
      hugo: "\u062C\u0627\u0626\u0632\u0629 \u0647\u0648\u062C\u0648",
      nebula: "\u062C\u0627\u0626\u0632\u0629 \u0646\u064A\u0628\u0648\u0644\u0627",
      booker: "\u062C\u0627\u0626\u0632\u0629 \u0628\u0648\u0643\u0631",
      topRated: "\u0627\u0644\u0623\u0639\u0644\u0649 \u062A\u0642\u064A\u064A\u0645\u064B\u0627",
      mood_short_thrilling: "\u0642\u0635\u064A\u0631\u0629 \u0648\u0645\u0634\u0648\u0642\u0629",
      mood_cozy: "\u062F\u0627\u0641\u064A\u0629 \u0648\u0647\u0627\u062F\u064A\u0629",
      mood_cry: "\u0647\u062A\u0639\u064A\u0637\u0646\u064A",
      mood_think: "\u062A\u062E\u0644\u064A\u0646\u064A \u0623\u0641\u0643\u0631",
      mood_adventure: "\u0645\u063A\u0627\u0645\u0631\u0629",
      mood_funny: "\u062E\u0641\u064A\u0641\u0629 \u0648\u0645\u0636\u062D\u0643\u0629",
      dictLoading: "\u0628\u062F\u0648\u0651\u0631 \u0641\u064A \u0627\u0644\u0642\u0627\u0645\u0648\u0633\u2026",
      dictNone: "\u0645\u0641\u064A\u0634 \u062A\u0639\u0631\u064A\u0641 \u0645\u062A\u0627\u062D \u0623\u0648\u0641\u0644\u0627\u064A\u0646 \u2014 \u062C\u0631\u0651\u0628 \u0644\u0645\u0627 \u064A\u0643\u0648\u0646 \u0641\u064A \u0646\u062A",
      translate: "\u062A\u0631\u062C\u0645\u0629",
      define: "\u0642\u0627\u0645\u0648\u0633",
      note: "\u0645\u0644\u0627\u062D\u0638\u0629",
      highlight: "\u0647\u0627\u064A\u0644\u0627\u064A\u062A",
      copied: "\u0627\u062A\u0646\u0633\u062E",
      finishedOn: "\u062E\u0644\u0635\u062A \u0641\u064A",
      addedOn: "\u0627\u062A\u0636\u0627\u0641 \u0641\u064A",
      sessions: "\u062C\u0644\u0633\u0629",
      min: "\u062F\u0642\u064A\u0642\u0629",
      chapters: "\u0627\u0644\u0641\u0635\u0648\u0644",
      importBuddy: "\u0627\u0633\u062A\u0648\u0631\u062F \u062A\u0639\u0644\u064A\u0642\u0627\u062A \u0635\u0627\u062D\u0628\u0643",
      exportBuddy: "\u0635\u062F\u0631 \u062A\u0639\u0644\u064A\u0642\u0627\u062A\u064A",
      goalDone: "\u0645\u0628\u0631\u0648\u0643! \u062D\u0642\u0642\u062A \u0647\u062F\u0641\u0643 \u{1F389}",
      pageN: "\u0635\u0641\u062D\u0629 {n}",
      listening: "\u0628\u064A\u0642\u0631\u0627\u0644\u0643\u2026",
      stop: "\u0625\u064A\u0642\u0627\u0641",
      readOnline: "\u0627\u0642\u0631\u0623 \u0646\u0633\u062E\u0629 \u0623\u0648\u0646\u0644\u0627\u064A\u0646",
      sampleNote: "\u0643\u062A\u0627\u0628 \u0645\u0631\u062C\u0639\u064A \u0645\u0646 Open Library (\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u063A\u0644\u0627\u0641)."
    },
    en: {
      addImage: "Add image to book",
      imgHint: "The image goes after the text you selected, or after the first paragraph of the current page if nothing is selected. Tap an image inside the book to remove it.",
      imgCaption: "Caption (optional)",
      imgChoose: "Choose image",
      imgInBook: "Images in this book",
      imgNone: "No images yet.",
      imgNoPos: "Could not find the position, turn a page and retry",
      imgNoPdf: "Adding images works for EPUB and TXT, not PDF.",
      imgSize: "Size",
      toc: "Table of contents",
      tocNone: "This book has no table of contents. Use the page bar below.",
      layoutAuto: "Auto layout",
      layoutPhone: "Phone layout",
      layoutTablet: "Tablet layout",
      pagesPreparing: "Preparing page numbers, try again in a few seconds",
      appName: "Qari",
      navLibrary: "My Library",
      navShelves: "Shelves",
      navStats: "My Stats",
      navDiscover: "Discover",
      navCommunity: "Community",
      navSettings: "Settings",
      navLists: "Lists",
      addBook: "Add book",
      tabFile: "From device",
      tabOnline: "Search online",
      dropHint: "Pick an EPUB, PDF or TXT file",
      localNote: "Books are stored on your device. Nothing is uploaded unless you turn on the optional sync in Settings.",
      searchPh: "Book title or ISBN\u2026",
      search: "Search",
      emptyLib: "Your library is empty",
      emptyLibSub: "Add your first book from your device or search online",
      shelf_want: "Want to read",
      shelf_reading: "Reading",
      shelf_finished: "Finished",
      customShelves: "Custom shelves",
      newShelf: "New shelf",
      shelfNamePh: "Shelf name\u2026",
      create: "Create",
      continueReading: "Continue reading",
      progress: "Progress",
      pages: "pages",
      of: "of",
      myGoals: "My goals",
      yearlyGoal: "Yearly goal",
      monthlyGoal: "Monthly goal",
      booksFinished: "books finished",
      streak: "day streak",
      streakDays: "days in a row",
      todayMin: "Today's minutes",
      totalMin: "Total minutes",
      pagesPerHour: "pages/hour",
      badges: "Badges",
      weeklyChart: "Last 14 days (minutes)",
      yearlySummary: "Year in review",
      topBooks: "Top rated books",
      setGoals: "Edit goals",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      recommendations: "Picked for your taste",
      awards: "Award lists",
      moodSearch: "Search by mood",
      needRatings: "Rate books 4+ stars to get recommendations",
      loading: "Loading\u2026",
      noResults: "No results",
      addToLibrary: "Add to library",
      added: "Added \u2713",
      reviews: "Reviews",
      myActivity: "My activity",
      buddyRead: "Buddy reading",
      buddyName: "Your friend's name",
      chapterComments: "Chapter comments",
      writeReview: "Write a review\u2026",
      yourRating: "Your rating",
      exportData: "Export my data",
      importData: "Import data",
      exportHighlights: "Export highlights",
      importNote: "Merge data from a JSON file (existing data is kept)",
      exported: "Exported \u2713",
      imported: "Merged \u2713",
      settings: "Settings",
      language: "Language",
      theme: "Theme",
      themeLight: "Light",
      themeSepia: "Sepia",
      themeDark: "Dark",
      themeBlack: "OLED black",
      fontSize: "Font size",
      lineHeight: "Line spacing",
      fontFamily: "Reading font",
      readingMode: "Reading mode",
      paginated: "Pages",
      scrolled: "Scroll",
      ttsVoice: "Reading voice",
      ttsSpeed: "Speed",
      ttsAutoVoice: "Automatic (best voice)",
      ttsTest: "Test",
      ttsLangAr: "Arabic",
      ttsLangEn: "English",
      ttsNoVoices: "Voices are still loading \u2014 close and reopen settings",
      ttsNaturalOk: "\u2605 Natural voice",
      ttsNaturalTip: "This device has no natural voice for the book language. On Windows, open Qari in Microsoft Edge and try again \u2014 Edge exposes Microsoft Natural voices.",
      highlights: "Highlights",
      addNote: "Add a note\u2026",
      noHighlights: "No highlights in this book yet",
      startReading: "Start reading",
      session: "session",
      removeBook: "Remove book",
      confirmDelete: "Sure? The book and its highlights will be removed.",
      markFinished: "Mark finished",
      moveTo: "Move to shelf",
      comments: "Comments",
      addComment: "Comment on this chapter\u2026",
      send: "Send",
      asMe: "Me",
      asBuddy: "My friend",
      rate: "Rate",
      overview: "Overview",
      hugo: "Hugo Award",
      nebula: "Nebula Award",
      booker: "Booker Prize",
      topRated: "Top rated",
      mood_short_thrilling: "Short & thrilling",
      mood_cozy: "Cozy & calm",
      mood_cry: "Make me cry",
      mood_think: "Make me think",
      mood_adventure: "Adventure",
      mood_funny: "Light & funny",
      dictLoading: "Looking up\u2026",
      dictNone: "No definition available offline \u2014 try when online",
      translate: "Translate",
      define: "Define",
      note: "Note",
      highlight: "Highlight",
      copied: "Copied",
      finishedOn: "Finished on",
      addedOn: "Added on",
      sessions: "sessions",
      min: "min",
      chapters: "Chapters",
      importBuddy: "Import friend's comments",
      exportBuddy: "Export my comments",
      goalDone: "Congrats! Goal reached \u{1F389}",
      pageN: "Page {n}",
      listening: "Reading aloud\u2026",
      stop: "Stop",
      readOnline: "Read an online copy",
      sampleNote: "Reference book from Open Library (metadata + cover)."
    }
  };
  var lang = "ar";
  function setLang(l) {
    lang = STR[l] ? l : "ar";
  }
  function getLang() {
    return lang;
  }
  function tr(ar, en) {
    return lang === "ar" ? ar : en;
  }
  function t(key) {
    return STR[lang] && STR[lang][key] || STR.ar[key] || key;
  }
  function applyI18n(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPh);
    });
  }

  // src/findbook.js
  var BUILTIN_SITES = [
    { id: "ol", name: "Open Library", url: "https://openlibrary.org/search?q={query}" },
    { id: "gr", name: "Goodreads", url: "https://www.goodreads.com/search?q={query}" },
    { id: "gut", name: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/search/?query={query}" },
    { id: "gb", name: "Google Books", url: "https://www.google.com/search?tbm=bks&q={query}" },
    { id: "ia", name: "Internet Archive", url: "https://archive.org/search?query={query}" },
    { id: "kobo", name: "Kobo", url: "https://www.kobo.com/search?query={query}" },
    { id: "amz", name: "Amazon", url: "https://www.amazon.com/s?k={query}" }
  ];
  function customSites() {
    const a = getState().settings.findSites;
    return Array.isArray(a) ? a.filter((x) => x && x.name && x.url) : [];
  }
  function buildUrl(tpl, title, author) {
    const enc2 = (s) => encodeURIComponent(String(s || "").trim());
    const q = [title, author].filter(Boolean).join(" ");
    const out = String(tpl).replace(/\{title\}/gi, enc2(title)).replace(/\{author\}/gi, enc2(author)).replace(/\{query\}/gi, enc2(q));
    try {
      const u = new URL(out);
      return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
    } catch {
      return null;
    }
  }
  function validTemplate(tpl) {
    const s = String(tpl || "").trim();
    if (!/^https?:\/\//i.test(s)) return "scheme";
    if (!/\{(title|author|query)\}/i.test(s)) return "placeholder";
    try {
      new URL(s.replace(/\{(title|author|query)\}/gi, "x"));
    } catch {
      return "scheme";
    }
    return "";
  }
  function findBookHTML(title, author) {
    const sites = BUILTIN_SITES.concat(customSites().map((c, i) => ({ id: "c" + i, name: c.name, url: c.url, custom: true })));
    const links = sites.map((s) => {
      const u = buildUrl(s.url, title, author);
      return u ? `<a class="btn find-btn" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} \u2197</a>` : "";
    }).join("");
    return `<div class="chart-box"><h3>\u{1F50E} ${tr("\u0627\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0643\u062A\u0627\u0628", "Search for this book")}</h3>
    <p class="muted" style="margin-bottom:.5rem">${tr("\u0628\u064A\u0641\u062A\u062D \u0646\u062A\u0627\u064A\u062C \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0643\u062A\u0627\u0628 \u0641\u064A \u0645\u0648\u0642\u0639 \u062E\u0627\u0631\u062C\u064A. \u062A\u0642\u062F\u0631 \u062A\u0636\u064A\u0641 \u0645\u0648\u0627\u0642\u0639\u0643 \u0645\u0646 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A.", "Opens a search for this book on an outside site. You can add your own sites in Settings.")}</p>
    <div class="find-links">${links}</div></div>`;
  }
  function renderFindSitesSettings(host, rerender) {
    const list = customSites();
    host.innerHTML = `<h3 style="margin-bottom:.4rem">\u{1F50E} ${tr("\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0643\u062A\u0628", "Book search sites")}</h3>
    <p class="muted" style="margin-bottom:.6rem">${tr("\u0636\u064A\u0641 \u0645\u0648\u0642\u0639 \u0628\u0627\u0644\u0627\u0633\u0645 \u0648\u0635\u064A\u063A\u0629 \u0627\u0644\u0631\u0627\u0628\u0637. \u0627\u0643\u062A\u0628 {title} \u0645\u0643\u0627\u0646 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0643\u062A\u0627\u0628 \u0648{author} \u0645\u0643\u0627\u0646 \u0627\u0644\u0645\u0624\u0644\u0641\u060C \u0623\u0648 {query} \u0644\u0644\u0627\u062A\u0646\u064A\u0646 \u0645\u0639 \u0628\u0639\u0636. \u0645\u062B\u0627\u0644:", "Add a site by name and URL format. Use {title} for the book title, {author} for the author, or {query} for both together. Example:")} <code dir="ltr">https://example.com/search?q={query}</code></p>
    <div id="fsList"></div>
    <div style="display:grid;gap:.5rem;max-width:480px;margin-top:.6rem">
      <input id="fsName" placeholder="${tr("\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0642\u0639", "Site name")}" autocomplete="off">
      <input id="fsUrl" dir="ltr" placeholder="https://\u2026{query}" autocomplete="off">
      <div style="display:flex;gap:.5rem"><button id="fsAdd" class="btn btn-primary">${tr("\u0625\u0636\u0627\u0641\u0629", "Add")}</button><button id="fsCancel" class="btn" hidden>${tr("\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062A\u0639\u062F\u064A\u0644", "Cancel edit")}</button></div>
    </div>`;
    const lh = host.querySelector("#fsList");
    if (!list.length) lh.innerHTML = `<p class="muted">${tr("\u0645\u0641\u064A\u0634 \u0645\u0648\u0627\u0642\u0639 \u0645\u0636\u0627\u0641\u0629.", "No custom sites yet.")}</p>`;
    let editing = -1;
    const name = host.querySelector("#fsName"), url = host.querySelector("#fsUrl"), add = host.querySelector("#fsAdd"), cancel = host.querySelector("#fsCancel");
    const save2 = (arr) => {
      getState().settings.findSites = arr;
      save();
    };
    list.forEach((c, i) => {
      const row = document.createElement("div");
      row.className = "set-row";
      row.style.flexWrap = "wrap";
      row.innerHTML = `<span><b>${esc(c.name)}</b><br><span class="muted" dir="ltr" style="font-size:.75rem;word-break:break-all">${esc(c.url)}</span></span><span><button class="btn" data-e>${tr("\u062A\u0639\u062F\u064A\u0644", "Edit")}</button> <button class="btn" data-d>${tr("\u062D\u0630\u0641", "Delete")}</button></span>`;
      row.querySelector("[data-e]").onclick = () => {
        editing = i;
        name.value = c.name;
        url.value = c.url;
        add.textContent = tr("\u062D\u0641\u0638", "Save");
        cancel.hidden = false;
        name.focus();
      };
      row.querySelector("[data-d]").onclick = () => {
        if (!confirm(tr("\u062D\u0630\u0641 \u0627\u0644\u0645\u0648\u0642\u0639 \u062F\u0647\u061F", "Delete this site?"))) return;
        save2(list.filter((_, j) => j !== i));
        rerender();
      };
      lh.appendChild(row);
    });
    cancel.onclick = () => rerender();
    add.onclick = () => {
      const n = name.value.trim(), u = url.value.trim();
      if (!n) {
        toast(tr("\u0627\u0643\u062A\u0628 \u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0642\u0639", "Enter a site name"));
        return;
      }
      const bad = validTemplate(u);
      if (bad === "scheme") {
        toast(tr("\u0627\u0644\u0631\u0627\u0628\u0637 \u0644\u0627\u0632\u0645 \u064A\u0628\u062F\u0623 \u0628\u0640 http:// \u0623\u0648 https://", "The URL must start with http:// or https://"), 4e3);
        return;
      }
      if (bad === "placeholder") {
        toast(tr("\u0644\u0627\u0632\u0645 \u0627\u0644\u0631\u0627\u0628\u0637 \u064A\u062D\u062A\u0648\u064A {title} \u0623\u0648 {author} \u0623\u0648 {query}", "The URL must contain {title}, {author} or {query}"), 4e3);
        return;
      }
      const arr = list.slice();
      if (editing >= 0) arr[editing] = { name: n, url: u };
      else arr.push({ name: n, url: u });
      save2(arr);
      rerender();
    };
  }

  // src/db.js
  var db_exports = {};
  __export(db_exports, {
    allFileKeys: () => allFileKeys,
    clearFiles: () => clearFiles,
    deleteFile: () => deleteFile,
    getFile: () => getFile,
    metaDel: () => metaDel,
    metaGet: () => metaGet,
    metaPut: () => metaPut,
    onFilesChange: () => onFilesChange,
    putFile: () => putFile
  });
  var DB_NAME = "qari-files";
  var STORE = "files";
  var _db = null;
  var fileListeners = /* @__PURE__ */ new Set();
  function onFilesChange(fn) {
    fileListeners.add(fn);
  }
  var fire = () => fileListeners.forEach((fn) => {
    try {
      fn();
    } catch {
    }
  });
  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
        if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta");
      };
      req.onsuccess = () => {
        _db = req.result;
        resolve(_db);
      };
      req.onerror = () => reject(req.error);
    });
  }
  async function putFile(key, blob) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => {
        fire();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }
  async function getFile(key) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  async function deleteFile(key) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => {
        fire();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }
  async function allFileKeys() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const r = db.transaction(STORE).objectStore(STORE).getAllKeys();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function clearFiles() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
  async function metaGet(k) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const r = db.transaction("meta").objectStore("meta").get(k);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });
  }
  async function metaPut(k, v) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("meta", "readwrite");
      tx.objectStore("meta").put(v, k);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
  async function metaDel(k) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("meta", "readwrite");
      tx.objectStore("meta").delete(k);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  // src/stats.js
  var $ = (s, r = document) => r.querySelector(s);
  function renderStats(view) {
    const st = getState();
    const s = st.settings;
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const doneYear = finishedThisYear(year);
    const doneMonth = finishedThisMonth();
    const sessionsY = sessionsThisYear(year);
    const totalMin = sessionsY.reduce((a, x) => a + x.minutes, 0);
    const totalPages = sessionsY.reduce((a, x) => a + (x.pages || 0), 0);
    const todayMin = st.readingDays[(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)] || 0;
    const streak = currentStreak();
    const pph = totalMin > 0 ? Math.round(totalPages / (totalMin / 60)) : 0;
    view.innerHTML = `
    <div class="view-head"><h1>${t("navStats")}</h1><button id="editGoals" class="btn">\u270F ${t("setGoals")}</button></div>
    <div class="stat-cards">
      <div class="stat-card"><div class="lbl">${t("yearlyGoal")} (${year})</div><div class="num">${doneYear.length} / ${s.goalYear}</div>
        <div class="goal-track"><div class="goal-fill" style="width:${Math.min(100, doneYear.length / Math.max(1, s.goalYear) * 100)}%"></div></div></div>
      <div class="stat-card"><div class="lbl">${t("monthlyGoal")}</div><div class="num">${doneMonth.length} / ${s.goalMonth}</div>
        <div class="goal-track"><div class="goal-fill" style="width:${Math.min(100, doneMonth.length / Math.max(1, s.goalMonth) * 100)}%"></div></div></div>
      <div class="stat-card"><div class="lbl">${t("streakDays")}</div><div class="num">\u{1F525} ${streak}</div></div>
      <div class="stat-card"><div class="lbl">${t("todayMin")}</div><div class="num">${todayMin}</div></div>
      <div class="stat-card"><div class="lbl">${t("totalMin")} (${year})</div><div class="num">${totalMin}</div></div>
      <div class="stat-card"><div class="lbl">${t("pagesPerHour")}</div><div class="num">${pph}</div></div>
    </div>
    <h2 style="margin-bottom:.5rem">${t("badges")}</h2>
    <div class="badges" id="badgeRow"></div>
    <div class="chart-box"><h3 style="margin-bottom:.6rem">${t("weeklyChart")}</h3><canvas id="daysChart" width="1000" height="220"></canvas></div>
    <div class="chart-box"><h3 style="margin-bottom:.6rem">${t("yearlySummary")} ${year}</h3><div id="yearSummary"></div></div>
    <div class="chart-box"><h3 style="margin-bottom:.6rem">${t("topBooks")}</h3><div id="topBooks"></div></div>`;
    $("#editGoals", view).onclick = () => {
      const y = prompt(t("yearlyGoal"), s.goalYear);
      if (y === null) return;
      const m = prompt(t("monthlyGoal"), s.goalMonth);
      if (m === null) return;
      getState().settings.goalYear = Math.max(1, parseInt(y) || s.goalYear);
      getState().settings.goalMonth = Math.max(1, parseInt(m) || s.goalMonth);
      recheckAchievements();
      renderStats(view);
      if (doneYear.length >= getState().settings.goalYear) toast(t("goalDone"), 4e3);
    };
    const badgeRow = $("#badgeRow", view);
    badgeList().forEach((b) => {
      const d = document.createElement("div");
      d.className = "badge" + (b.unlocked ? "" : " locked");
      d.innerHTML = `<div class="b-icon">${b.icon}</div><div class="b-name">${esc(b.name[getLang()] || b.name.ar)}</div>`;
      badgeRow.appendChild(d);
    });
    drawDaysChart($("#daysChart", view), st.readingDays);
    renderYearSummary($("#yearSummary", view), year, sessionsY, doneYear);
    renderTopBooks($("#topBooks", view), st.books);
  }
  function drawDaysChart(canvas, readingDays) {
    const ctx = canvas.getContext("2d");
    const cs = getComputedStyle(document.body);
    const accent = cs.getPropertyValue("--accent").trim() || "#8b5e34";
    const muted = cs.getPropertyValue("--muted").trim() || "#999";
    const W = canvas.width, H = canvas.height, N2 = 14, pad = 34;
    const days = [];
    for (let i = N2 - 1; i >= 0; i--) {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    const vals = days.map((d) => readingDays[d.toISOString().slice(0, 10)] || 0);
    const max = Math.max(10, ...vals);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = muted;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(pad, 10);
    ctx.lineTo(pad, H - 24);
    ctx.lineTo(W, H - 24);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const bw = (W - pad - 10) / N2;
    days.forEach((d, i) => {
      const v = vals[i];
      const h = (H - 44) * (v / max);
      ctx.fillStyle = v > 0 ? accent : "rgba(120,120,120,.18)";
      ctx.beginPath();
      ctx.roundRect(pad + 6 + i * bw, H - 24 - h, bw - 10, Math.max(2, h), 4);
      ctx.fill();
      ctx.fillStyle = muted;
      ctx.font = "11px Cairo, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(d.getDate(), pad + 6 + i * bw + (bw - 10) / 2, H - 8);
      if (v > 0) ctx.fillText(v, pad + 6 + i * bw + (bw - 10) / 2, H - 30 - h);
    });
  }
  function renderYearSummary(host, year, sessions, doneYear) {
    const totalMin = sessions.reduce((a, x) => a + x.minutes, 0);
    const totalPages = sessions.reduce((a, x) => a + (x.pages || 0), 0);
    const hours = Math.floor(totalMin / 60), mins = totalMin % 60;
    const months = new Array(12).fill(0);
    sessions.forEach((s) => {
      months[new Date(s.end).getMonth()] += s.minutes;
    });
    const bestMonth = months.indexOf(Math.max(...months));
    const monthNames = getLang() === "ar" ? ["\u064A\u0646\u0627\u064A\u0631", "\u0641\u0628\u0631\u0627\u064A\u0631", "\u0645\u0627\u0631\u0633", "\u0623\u0628\u0631\u064A\u0644", "\u0645\u0627\u064A\u0648", "\u064A\u0648\u0646\u064A\u0648", "\u064A\u0648\u0644\u064A\u0648", "\u0623\u063A\u0633\u0637\u0633", "\u0633\u0628\u062A\u0645\u0628\u0631", "\u0623\u0643\u062A\u0648\u0628\u0631", "\u0646\u0648\u0641\u0645\u0628\u0631", "\u062F\u064A\u0633\u0645\u0628\u0631"] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    host.innerHTML = `
    <div class="stat-cards" style="margin-bottom:0">
      <div class="stat-card"><div class="num">${doneYear.length}</div><div class="lbl">${t("booksFinished")}</div></div>
      <div class="stat-card"><div class="num">${hours}h ${mins}m</div><div class="lbl">${t("totalMin")}</div></div>
      <div class="stat-card"><div class="num">${totalPages}</div><div class="lbl">${t("pages")}</div></div>
      <div class="stat-card"><div class="num">${sessions.length}</div><div class="lbl">${t("sessions")}</div></div>
      ${Math.max(...months) > 0 ? `<div class="stat-card"><div class="num">${monthNames[bestMonth]}</div><div class="lbl">\u2B50</div></div>` : ""}
    </div>
    <canvas id="monthsChart" width="1000" height="180" style="width:100%;margin-top:1rem"></canvas>`;
    const canvas = host.querySelector("#monthsChart");
    const ctx = canvas.getContext("2d");
    const cs = getComputedStyle(document.body);
    const accent = cs.getPropertyValue("--accent").trim() || "#8b5e34";
    const muted = cs.getPropertyValue("--muted").trim() || "#999";
    const W = canvas.width, H = canvas.height, pad = 34;
    const max = Math.max(10, ...months);
    const bw = (W - pad - 10) / 12;
    ctx.clearRect(0, 0, W, H);
    months.forEach((v, i) => {
      const h = (H - 40) * (v / max);
      ctx.fillStyle = v > 0 ? accent : "rgba(120,120,120,.15)";
      ctx.beginPath();
      ctx.roundRect(pad + 6 + i * bw, H - 24 - h, bw - 12, Math.max(2, h), 4);
      ctx.fill();
      ctx.fillStyle = muted;
      ctx.font = "11px Cairo, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(monthNames[i], pad + 6 + i * bw + (bw - 12) / 2, H - 8);
    });
  }
  function renderTopBooks(host, books) {
    const rated = books.filter((b) => b.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 5);
    host.innerHTML = rated.length ? "" : '<p class="muted">\u2014</p>';
    rated.forEach((b) => {
      const row = document.createElement("div");
      row.className = "result-row";
      row.style.marginBottom = ".4rem";
      row.innerHTML = `<div style="width:42px;height:62px" class="cover">${coverHTML(b)}</div>
      <div class="r-info"><div class="r-title">${esc(b.title)}</div><div class="r-author">${esc(b.author)}</div></div>`;
      row.appendChild(stars(b.rating));
      host.appendChild(row);
    });
  }

  // src/meta.js
  var OL = "https://openlibrary.org";
  var FIELDS = "key,title,author_name,author_key,cover_i,first_publish_year,edition_count,number_of_pages_median,ratings_average,ratings_count,want_to_read_count,already_read_count,currently_reading_count,subject,publisher,language,isbn,first_sentence";
  async function getJSON(url, ms = 12e3) {
    const ctl = new AbortController();
    const timer2 = setTimeout(() => ctl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer2);
    }
  }
  var cleanKey = (k) => (k || "").replace("/works/", "");
  var coverUrl = (id, size = "L") => id ? `https://covers.openlibrary.org/b/id/${id}-${size}.jpg?default=false` : "";
  function textOf(v) {
    return !v ? "" : typeof v === "string" ? v : v.value || "";
  }
  function cleanSubjects(list = []) {
    const seen = /* @__PURE__ */ new Set(), out = [];
    for (const s of list) {
      const k = s.toLowerCase();
      if (/[:=]|^nyt|award|bestseller|reviewed|large type|accessible|open library|protected daisy|in library|^fiction,/.test(k) || s.length > 32 || /\d{3}/.test(s)) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
      if (out.length >= 10) break;
    }
    return out;
  }
  function fromSearchDoc(d) {
    return {
      olKey: cleanKey(d.key),
      title: d.title || "",
      author: (d.author_name || [])[0] || "",
      authors: d.author_name || [],
      authorKey: (d.author_key || [])[0] || "",
      cover: coverUrl(d.cover_i),
      coverId: d.cover_i || 0,
      year: d.first_publish_year || "",
      pages: d.number_of_pages_median || 0,
      editions: d.edition_count || 0,
      rating: d.ratings_average || 0,
      ratingCount: d.ratings_count || 0,
      wantToRead: d.want_to_read_count || 0,
      alreadyRead: d.already_read_count || 0,
      currentlyReading: d.currently_reading_count || 0,
      subjects: d.subject || [],
      publisher: (d.publisher || [])[0] || "",
      languages: (d.language || []).slice(0, 8),
      isbn: (d.isbn || []).find((x) => x.length === 13) || (d.isbn || [])[0] || "",
      firstSentence: (d.first_sentence || [])[0] || ""
    };
  }
  async function olSearchDoc(q) {
    const data = await getJSON(`${OL}/search.json?${q}&limit=1&fields=${FIELDS}`);
    return data.docs && data.docs[0] ? fromSearchDoc(data.docs[0]) : null;
  }
  async function googleBooks(m) {
    const key = (getState().settings.gbKey || "").trim();
    const q = m.isbn ? `isbn:${m.isbn}` : `intitle:${m.title}${m.author ? "+inauthor:" + m.author : ""}`;
    const data = await getJSON(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q).replace(/%2B/g, "+")}&maxResults=1${key ? "&key=" + encodeURIComponent(key) : ""}`, 9e3);
    const v = data.items && data.items[0] && data.items[0].volumeInfo;
    if (!v) return null;
    return {
      rating: v.averageRating || 0,
      count: v.ratingsCount || 0,
      pages: v.pageCount || 0,
      categories: v.categories || [],
      description: v.description || "",
      publisher: v.publisher || "",
      date: v.publishedDate || "",
      link: v.infoLink || "",
      cover: v.imageLinks ? (v.imageLinks.thumbnail || "").replace("http://", "https://") : ""
    };
  }
  async function loadMeta(ref, { force = false } = {}) {
    let olKey = ref.olKey || "";
    if (olKey && !force) {
      const c = getMeta(olKey);
      if (c) return { ...c, fromCache: true };
    }
    let m = null, errors = [];
    try {
      if (olKey) m = await olSearchDoc(`q=key:/works/${olKey}`);
      else if (ref.isbn) m = await olSearchDoc(`isbn=${encodeURIComponent(ref.isbn)}`);
      if (!m && ref.title) m = await olSearchDoc(`title=${encodeURIComponent(ref.title)}${ref.author ? "&author=" + encodeURIComponent(ref.author) : ""}`);
    } catch (e) {
      errors.push("ol:" + e.message);
    }
    if (!m) {
      const stale = olKey && getMetaStale(olKey);
      if (stale) return { ...stale, fromCache: true, stale: true };
      return { olKey: "", title: ref.title || "", author: ref.author || "", cover: ref.cover || "", subjects: [], notFound: true, errors };
    }
    olKey = m.olKey;
    try {
      const w = await getJSON(`${OL}/works/${olKey}.json`);
      m.description = textOf(w.description).replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").replace(/\(\[source\][^)]*\)/g, "").split("\n\n----------")[0].trim();
      if (w.first_publish_date && !m.year) m.year = (w.first_publish_date.match(/\d{4}/) || [""])[0];
      if (!m.subjects.length && w.subjects) m.subjects = w.subjects;
      if (!m.authorKey && w.authors && w.authors[0]) m.authorKey = cleanKey(((w.authors[0].author || {}).key || "").replace("/authors/", ""));
    } catch (e) {
      errors.push("work:" + e.message);
    }
    if (m.authorKey) {
      try {
        const a = await getJSON(`${OL}/authors/${m.authorKey}.json`);
        m.authorBio = textOf(a.bio).split("\n")[0].slice(0, 600);
        m.authorBorn = a.birth_date || "";
        m.authorDied = a.death_date || "";
        m.authorPhoto = a.photos && a.photos[0] > 0 ? `https://covers.openlibrary.org/a/id/${a.photos[0]}-M.jpg` : "";
      } catch (e) {
      }
    }
    try {
      m.gb = await googleBooks(m);
    } catch (e) {
      m.gb = null;
      m.gbError = e.message;
    }
    if (m.gb && !m.description) m.description = m.gb.description.replace(/<[^>]+>/g, "");
    if (m.gb && !m.pages) m.pages = m.gb.pages;
    m.errors = errors;
    m.fetchedAt = (/* @__PURE__ */ new Date()).toISOString();
    setMeta(olKey, m);
    return m;
  }
  async function moreByAuthor(authorKey, exceptKey) {
    if (!authorKey) return [];
    const data = await getJSON(`${OL}/search.json?q=author_key:${authorKey}&sort=editions&limit=14&fields=key,title,author_name,cover_i,first_publish_year,ratings_average`);
    return (data.docs || []).filter((d) => cleanKey(d.key) !== exceptKey).slice(0, 12).map(fromSearchDoc);
  }
  async function similarBooks(subjects, exceptKey, exceptAuthorKey) {
    let subj = cleanSubjects(subjects).filter((s) => !/^(fiction|american|english|literature)/i.test(s)).slice(0, 2);
    if (!subj.length) subj = (subjects || []).filter((x) => x && x.length <= 40 && !/^(fiction|literature)/i.test(x)).slice(0, 2);
    if (!subj.length) return [];
    const run = async (q) => {
      const data = await getJSON(`${OL}/search.json?q=${encodeURIComponent(q)}&sort=rating&limit=20&fields=key,title,author_name,author_key,cover_i,first_publish_year,ratings_average,ratings_count`);
      return (data.docs || []).filter((d) => cleanKey(d.key) !== exceptKey && (d.author_key || [])[0] !== exceptAuthorKey && d.cover_i);
    };
    let docs = await run(subj.map((x) => `subject:"${x}"`).join(" AND "));
    if (docs.length < 6 && subj.length > 1) {
      try {
        const more = await run(`subject:"${subj[0]}"`);
        const seen = new Set(docs.map((d) => d.key));
        more.forEach((d) => {
          if (!seen.has(d.key)) docs.push(d);
        });
      } catch {
      }
    }
    return docs.slice(0, 12).map(fromSearchDoc);
  }
  var SDOC = "key,title,author_name,author_key,cover_i,first_publish_year,ratings_average,ratings_count,subject";
  function firstAuthorName(name) {
    return String(name || "").split(/\s*(?:,|&|;| and | و )\s*/i)[0].trim() || String(name || "").trim();
  }
  async function resolveAuthorKey(name) {
    const n = firstAuthorName(name);
    if (!n) return "";
    try {
      const d = await getJSON(`${OL}/search/authors.json?q=${encodeURIComponent(n)}&limit=5`);
      const docs = d.docs || [];
      const norm = (x) => String(x || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      const exact = docs.find((a) => norm(a.name) === norm(n));
      const best = exact || docs.slice().sort((a, b) => (b.work_count || 0) - (a.work_count || 0))[0];
      return best ? best.key : "";
    } catch {
      return "";
    }
  }
  async function worksByAuthor(name, page = 0, limit = 24, authorKey = "") {
    const n = firstAuthorName(name);
    const key = authorKey || await resolveAuthorKey(n);
    const off = page * limit;
    let data = null;
    if (key) {
      try {
        data = await getJSON(`${OL}/search.json?q=${encodeURIComponent("author_key:" + key)}&sort=editions&limit=${limit}&offset=${off}&fields=${SDOC},isbn`);
      } catch {
      }
    }
    if (!data || !(data.docs || []).length) data = await getJSON(`${OL}/search.json?author=${encodeURIComponent(n)}&limit=${limit}&offset=${off}&fields=${SDOC},isbn`);
    const docs = (data.docs || []).filter((d) => d.title);
    return { items: docs.map((d) => ({ ...fromSearchDoc(d), year: d.first_publish_year || "", subjects: (d.subject || []).slice(0, 8), isbn: (d.isbn || [])[0] || "" })), more: off + limit < (data.numFound || 0) };
  }
  async function googleRelated(q, exceptTitle) {
    const d = await getJSON(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20&orderBy=relevance&printType=books`);
    const seen = /* @__PURE__ */ new Set();
    return (d.items || []).map((v) => {
      const i = v.volumeInfo || {};
      return {
        olKey: "",
        title: i.title || "",
        author: (i.authors || [])[0] || "",
        rating: i.averageRating || 0,
        cover: ((i.imageLinks || {}).thumbnail || "").replace("http://", "https://"),
        subjects: i.categories || [],
        year: (i.publishedDate || "").slice(0, 4)
      };
    }).filter((x) => x.title && x.title.toLowerCase() !== String(exceptTitle || "").toLowerCase() && !seen.has(x.title.toLowerCase()) && seen.add(x.title.toLowerCase()));
  }
  async function relatedBooks({ subjects, olKey, authorKey, title, author }) {
    const out = [], seen = /* @__PURE__ */ new Set();
    const add = (items) => {
      for (const it of items || []) {
        const k = (it.title || "").toLowerCase();
        if (!k || k === String(title || "").toLowerCase() || it.olKey && it.olKey === olKey || seen.has(k)) continue;
        seen.add(k);
        out.push(it);
      }
    };
    const step = async (fn) => {
      if (out.length >= 8) return;
      try {
        add(await fn());
      } catch {
      }
    };
    await step(() => similarBooks(subjects, olKey, authorKey));
    await step(async () => (await worksByAuthor(author, 0, 14, authorKey)).items);
    const subj = cleanSubjects(subjects).slice(0, 2);
    await step(() => googleRelated(subj.length ? subj.map((s) => "subject:" + s).join(" ") : author ? "inauthor:" + firstAuthorName(author) : title, title));
    await step(async () => (await getJSON(`${OL}/search.json?q=${encodeURIComponent(String(title || "").replace(/[^\p{L}\p{N} ]/gu, " "))}&limit=15&fields=${SDOC}`)).docs.map(fromSearchDoc));
    await step(async () => (await getJSON(`${OL}/search.json?q=${encodeURIComponent('subject:"' + (subj[0] || "fiction") + '"')}&sort=rating&limit=15&fields=${SDOC}`)).docs.map(fromSearchDoc));
    return out.slice(0, 14);
  }

  // src/discover.js
  var $2 = (s, r = document) => r.querySelector(s);
  async function searchOpenLibrary(q, { subject = null, limit = 12, offset = 0 } = {}) {
    let url;
    if (subject) url = `https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json?limit=${limit}&offset=${offset}`;
    else if (/^(97[89])?\d{9}[\dXx]$/.test(q.replace(/-/g, ""))) url = `https://openlibrary.org/search.json?isbn=${encodeURIComponent(q)}&limit=${limit}&fields=key,title,author_name,cover_i,first_publish_year,subject,isbn,ratings_average,ratings_count`;
    else url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}&fields=key,title,author_name,cover_i,first_publish_year,subject,isbn,ratings_average,ratings_count`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("network " + res.status);
    const data = await res.json();
    const docs = subject ? data.works || [] : data.docs || [];
    return docs.map((d) => ({
      olKey: (d.key || "").replace("/works/", ""),
      title: d.title || "?",
      author: d.authors && d.authors[0] && d.authors[0].name || d.author_name && d.author_name[0] || "",
      year: d.first_publish_year || "",
      cover: d.cover_i || d.cover_id ? `https://covers.openlibrary.org/b/id/${d.cover_i || d.cover_id}-L.jpg` : "",
      rating: d.ratings_average || 0,
      ratingCount: d.ratings_count || 0,
      subjects: (d.subject || []).slice(0, 8),
      isbn: d.isbn && d.isbn[0] || ""
    })).filter((x) => x.title);
  }
  var OL_FIELDS = "&fields=key,title,author_name,cover_i,first_publish_year,subject,isbn,ratings_average,ratings_count";
  async function searchScoped(q, scope, page = 0, limit = 24) {
    if (scope === "author") {
      try {
        const r = await worksByAuthor(q, page, limit);
        if (r.items.length) return r;
      } catch {
      }
    }
    let url;
    if (scope === "title") url = `https://openlibrary.org/search.json?title=${encodeURIComponent(q)}&limit=${limit}&offset=${page * limit}${OL_FIELDS}`;
    else if (scope === "author") url = `https://openlibrary.org/search.json?author=${encodeURIComponent(q)}&limit=${limit}&offset=${page * limit}${OL_FIELDS}`;
    else if (scope === "subject") url = `https://openlibrary.org/search.json?q=${encodeURIComponent('subject:"' + q + '"')}&limit=${limit}&offset=${page * limit}${OL_FIELDS}`;
    else url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}&offset=${page * limit}${OL_FIELDS}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("network " + res.status);
    const data = await res.json();
    const items = (data.docs || []).map((d) => ({
      olKey: (d.key || "").replace("/works/", ""),
      title: d.title || "?",
      author: d.author_name && d.author_name[0] || "",
      year: d.first_publish_year || "",
      cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : "",
      rating: d.ratings_average || 0,
      ratingCount: d.ratings_count || 0,
      subjects: (d.subject || []).slice(0, 8),
      isbn: d.isbn && d.isbn[0] || ""
    })).filter((x) => x.title);
    return { items, more: (page + 1) * limit < (data.numFound || 0) };
  }
  var AWARDS = {
    hugo: [
      ["A Desolation Called Peace", "Arkady Martine", 2022],
      ["Network Effect", "Martha Wells", 2021],
      ["A Memory Called Empire", "Arkady Martine", 2020],
      ["The Calculating Stars", "Mary Robinette Kowal", 2019],
      ["The Stone Sky", "N.K. Jemisin", 2018],
      ["The Obelisk Gate", "N.K. Jemisin", 2017],
      ["The Fifth Season", "N.K. Jemisin", 2016],
      ["The Three-Body Problem", "Liu Cixin", 2015],
      ["Ancillary Justice", "Ann Leckie", 2014],
      ["Redshirts", "John Scalzi", 2013],
      ["Among Others", "Jo Walton", 2012]
    ],
    nebula: [
      ["Babel", "R.F. Kuang", 2022],
      ["A Master of Djinn", "P. Dj\xE8l\xED Clark", 2021],
      ["Network Effect", "Martha Wells", 2020],
      ["A Song for a New Day", "Sarah Pinsker", 2019],
      ["The Calculating Stars", "Mary Robinette Kowal", 2018],
      ["All the Birds in the Sky", "Charlie Jane Anders", 2016],
      ["Uprooted", "Naomi Novik", 2015],
      ["Ancillary Justice", "Ann Leckie", 2013],
      ["2312", "Kim Stanley Robinson", 2012],
      ["Blackout / All Clear", "Connie Willis", 2010]
    ],
    booker: [
      ["Orbital", "Samantha Harvey", 2024],
      ["Prophet Song", "Paul Lynch", 2023],
      ["The Seven Moons of Maali Almeida", "Shehan Karunatilaka", 2022],
      ["The Promise", "Damon Galgut", 2021],
      ["Shuggie Bain", "Douglas Stuart", 2020],
      ["Girl, Woman, Other", "Bernardine Evaristo", 2019],
      ["Milkman", "Anna Burns", 2018],
      ["Lincoln in the Bardo", "George Saunders", 2017],
      ["The Sellout", "Paul Beatty", 2016],
      ["A Brief History of Seven Killings", "Marlon James", 2015]
    ]
  };
  var MOODS = [
    { id: "short_thrilling", icon: "\u26A1", subject: "thriller" },
    { id: "cozy", icon: "\u{1F375}", subject: "cozy_fiction" },
    { id: "cry", icon: "\u{1F622}", subject: "tearjerkers" },
    { id: "think", icon: "\u{1F9E0}", subject: "philosophy" },
    { id: "adventure", icon: "\u{1F5FA}", subject: "adventure_stories" },
    { id: "funny", icon: "\u{1F604}", subject: "humorous_fiction" }
  ];
  var N = (id, ar, en, q, sub) => ({ id, ar, en, q, sub: sub || [] });
  var CATS = [
    { id: "fiction", kind: "fiction", ar: "\u0631\u0648\u0627\u0626\u064A", en: "Fiction", sub: [
      N("scifi", "\u062E\u064A\u0627\u0644 \u0639\u0644\u0645\u064A", "Science fiction", "science fiction", [N("dystopian", "\u062F\u064A\u0633\u062A\u0648\u0628\u064A\u0627", "Dystopian", "dystopian"), N("space", "\u0645\u0644\u0627\u062D\u0645 \u0641\u0636\u0627\u0626\u064A\u0629", "Space opera", "space opera"), N("cyber", "\u0633\u0627\u064A\u0628\u0631 \u0628\u0627\u0646\u0643", "Cyberpunk", "cyberpunk"), N("time", "\u0633\u0641\u0631 \u0639\u0628\u0631 \u0627\u0644\u0632\u0645\u0646", "Time travel", "time travel"), N("postapoc", "\u0645\u0627 \u0628\u0639\u062F \u0627\u0644\u0643\u0627\u0631\u062B\u0629", "Post-apocalyptic", "post-apocalyptic"), N("aliens", "\u0643\u0627\u0626\u0646\u0627\u062A \u0641\u0636\u0627\u0626\u064A\u0629", "Aliens / first contact", "extraterrestrial beings"), N("ai", "\u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0648\u0631\u0648\u0628\u0648\u062A\u0627\u062A", "AI & robots", "robots"), N("hardsf", "\u062E\u064A\u0627\u0644 \u0639\u0644\u0645\u064A \u0635\u0644\u0628", "Hard SF", "hard science fiction")]),
      N("fantasy", "\u0641\u0627\u0646\u062A\u0627\u0632\u064A\u0627", "Fantasy", "fantasy", [N("epic", "\u0645\u0644\u062D\u0645\u064A\u0629", "Epic fantasy", "epic fantasy"), N("urban", "\u062D\u0636\u0631\u064A\u0629", "Urban fantasy", "urban fantasy"), N("darkf", "\u0645\u0638\u0644\u0645\u0629", "Dark fantasy", "dark fantasy"), N("dragons", "\u062A\u0646\u0627\u0646\u064A\u0646", "Dragons", "dragons"), N("fairy", "\u062D\u0643\u0627\u064A\u0627\u062A \u062E\u0631\u0627\u0641\u064A\u0629", "Fairy tales", "fairy tales")]),
      N("mystery", "\u063A\u0645\u0648\u0636 \u0648\u062C\u0631\u064A\u0645\u0629", "Mystery & crime", "mystery", [N("detective", "\u062A\u062D\u0631\u064A", "Detective", "detective and mystery stories"), N("noir", "\u0646\u0648\u0627\u0631", "Noir", "noir"), N("cozy", "\u063A\u0645\u0648\u0636 \u0647\u0627\u062F\u0626", "Cozy mystery", "cozy mystery"), N("procedural", "\u0625\u062C\u0631\u0627\u0626\u064A \u0628\u0648\u0644\u064A\u0633\u064A", "Police procedural", "police procedural")]),
      N("thriller", "\u0625\u062B\u0627\u0631\u0629 \u0648\u062A\u0634\u0648\u064A\u0642", "Thriller", "thriller", [N("spy", "\u062C\u0627\u0633\u0648\u0633\u064A\u0629", "Espionage", "spy stories"), N("psych", "\u0646\u0641\u0633\u064A", "Psychological", "psychological thriller"), N("legal", "\u0642\u0627\u0646\u0648\u0646\u064A", "Legal thriller", "legal thriller"), N("suspense", "\u062A\u0634\u0648\u064A\u0642", "Suspense", "suspense")]),
      N("horror", "\u0631\u0639\u0628", "Horror", "horror", [N("ghost", "\u0642\u0635\u0635 \u0623\u0634\u0628\u0627\u062D", "Ghost stories", "ghost stories"), N("vampire", "\u0645\u0635\u0627\u0635\u0648 \u062F\u0645\u0627\u0621", "Vampires", "vampires"), N("gothic", "\u0642\u0648\u0637\u064A", "Gothic", "gothic fiction")]),
      N("romance", "\u0631\u0648\u0645\u0627\u0646\u0633\u064A", "Romance", "romance", [N("histrom", "\u062A\u0627\u0631\u064A\u062E\u064A", "Historical romance", "historical romance"), N("controm", "\u0645\u0639\u0627\u0635\u0631", "Contemporary romance", "contemporary romance")]),
      N("dystopia", "\u062F\u064A\u0633\u062A\u0648\u0628\u064A\u0627", "Dystopia", "dystopian"),
      N("paranormal", "\u062E\u0648\u0627\u0631\u0642", "Paranormal", "paranormal fiction"),
      N("contemp", "\u0645\u0639\u0627\u0635\u0631", "Contemporary", "contemporary fiction"),
      N("magrealism", "\u0648\u0627\u0642\u0639\u064A\u0629 \u0633\u062D\u0631\u064A\u0629", "Magical realism", "magic realism"),
      N("histfic", "\u0631\u0648\u0627\u064A\u0627\u062A \u062A\u0627\u0631\u064A\u062E\u064A\u0629", "Historical fiction", "historical fiction"),
      N("literary", "\u0623\u062F\u0628 \u0623\u062F\u0628\u064A", "Literary fiction", "literary fiction"),
      N("classics", "\u0643\u0644\u0627\u0633\u064A\u0643\u064A\u0627\u062A", "Classics", "classics", [N("russian", "\u0623\u062F\u0628 \u0631\u0648\u0633\u064A", "Russian literature", "russian fiction"), N("french", "\u0623\u062F\u0628 \u0641\u0631\u0646\u0633\u064A", "French literature", "french fiction"), N("english", "\u0623\u062F\u0628 \u0625\u0646\u062C\u0644\u064A\u0632\u064A", "English literature", "english fiction")]),
      N("arabicfic", "\u0631\u0648\u0627\u064A\u0627\u062A \u0639\u0631\u0628\u064A\u0629", "Arabic novels", "arabic fiction"),
      N("adventure", "\u0645\u063A\u0627\u0645\u0631\u0627\u062A", "Adventure", "adventure"),
      N("humor", "\u0643\u0648\u0645\u064A\u062F\u064A\u0627", "Humor", "humorous fiction"),
      N("war", "\u062D\u0631\u0628", "War fiction", "war stories"),
      N("ya", "\u0646\u0627\u0634\u0626\u0629", "Young adult", "young adult fiction")
    ] },
    { id: "nonfiction", kind: "nonfiction", ar: "\u063A\u064A\u0631 \u0631\u0648\u0627\u0626\u064A", en: "Non-fiction", sub: [
      N("history", "\u062A\u0627\u0631\u064A\u062E", "History", "history", [N("ancient", "\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u062F\u064A\u0645", "Ancient history", "ancient history"), N("medieval", "\u0627\u0644\u0639\u0635\u0648\u0631 \u0627\u0644\u0648\u0633\u0637\u0649", "Medieval", "middle ages"), N("ww2", "\u0627\u0644\u062D\u0631\u0628 \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u0629 \u0627\u0644\u062B\u0627\u0646\u064A\u0629", "World War II", "world war, 1939-1945"), N("islamhist", "\u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064A", "Islamic history", "islamic history"), N("egypt", "\u0645\u0635\u0631", "Egypt", "egypt")]),
      N("biography", "\u0633\u064A\u0631 \u0630\u0627\u062A\u064A\u0629", "Biography", "biography", [N("memoir", "\u0645\u0630\u0643\u0631\u0627\u062A", "Memoirs", "autobiography"), N("leaders", "\u0642\u0627\u062F\u0629 \u0648\u0633\u064A\u0627\u0633\u064A\u0648\u0646", "Leaders", "heads of state")]),
      N("philosophy", "\u0641\u0644\u0633\u0641\u0629", "Philosophy", "philosophy", [N("ethics", "\u0623\u062E\u0644\u0627\u0642", "Ethics", "ethics"), N("stoic", "\u0631\u0648\u0627\u0642\u064A\u0629", "Stoicism", "stoics"), N("exist", "\u0648\u062C\u0648\u062F\u064A\u0629", "Existentialism", "existentialism")]),
      N("psychology", "\u0639\u0644\u0645 \u0646\u0641\u0633", "Psychology", "psychology"),
      N("selfhelp", "\u062A\u0637\u0648\u064A\u0631 \u0630\u0627\u062A", "Self-help", "self-help", [N("habits", "\u0639\u0627\u062F\u0627\u062A \u0648\u0625\u0646\u062A\u0627\u062C\u064A\u0629", "Habits & productivity", "habit"), N("success", "\u0646\u062C\u0627\u062D", "Success", "success")]),
      N("business", "\u0623\u0639\u0645\u0627\u0644", "Business", "business", [N("entre", "\u0631\u064A\u0627\u062F\u0629 \u0623\u0639\u0645\u0627\u0644", "Entrepreneurship", "entrepreneurship"), N("leader", "\u0642\u064A\u0627\u062F\u0629", "Leadership", "leadership"), N("marketing", "\u062A\u0633\u0648\u064A\u0642", "Marketing", "marketing")]),
      N("economics", "\u0627\u0642\u062A\u0635\u0627\u062F", "Economics", "economics", [N("finance", "\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0648\u062A\u0645\u0648\u064A\u0644", "Investing & finance", "investments")]),
      N("science", "\u0639\u0644\u0648\u0645", "Science", "science", [N("physics", "\u0641\u064A\u0632\u064A\u0627\u0621", "Physics", "physics"), N("astro", "\u0641\u0644\u0643", "Astronomy", "astronomy"), N("bio", "\u0623\u062D\u064A\u0627\u0621", "Biology", "biology"), N("math", "\u0631\u064A\u0627\u0636\u064A\u0627\u062A", "Mathematics", "mathematics"), N("computers", "\u062D\u0627\u0633\u0648\u0628 \u0648\u062A\u0642\u0646\u064A\u0629", "Computers & technology", "computers")]),
      N("politics", "\u0633\u064A\u0627\u0633\u0629", "Politics", "political science"),
      N("religion", "\u062F\u064A\u0646", "Religion", "religion", [N("islam", "\u0625\u0633\u0644\u0627\u0645", "Islam", "islam"), N("christ", "\u0645\u0633\u064A\u062D\u064A\u0629", "Christianity", "christianity"), N("buddhism", "\u0628\u0648\u0630\u064A\u0629", "Buddhism", "buddhism")]),
      N("essays", "\u0645\u0642\u0627\u0644\u0627\u062A", "Essays", "essays"),
      N("travel", "\u0631\u062D\u0644\u0627\u062A", "Travel", "travel"),
      N("health", "\u0635\u062D\u0629", "Health", "health"),
      N("art", "\u0641\u0646", "Art", "art"),
      N("truecrime", "\u062C\u0631\u0627\u0626\u0645 \u062D\u0642\u064A\u0642\u064A\u0629", "True crime", "true crime"),
      N("spirit", "\u0631\u0648\u062D\u0627\u0646\u064A\u0627\u062A", "Spirituality", "spirituality"),
      N("sports", "\u0631\u064A\u0627\u0636\u0629", "Sports", "sports"),
      N("music", "\u0645\u0648\u0633\u064A\u0642\u0649", "Music", "music"),
      N("cook", "\u0637\u0628\u062E", "Cookbooks", "cooking"),
      N("parenting", "\u062A\u0631\u0628\u064A\u0629", "Parenting", "parenting"),
      N("education", "\u062A\u0639\u0644\u064A\u0645", "Education", "education"),
      N("nature", "\u0637\u0628\u064A\u0639\u0629", "Nature", "nature")
    ] },
    { id: "other", kind: "other", ar: "\u0623\u062E\u0631\u0649", en: "Other", sub: [
      N("poetry", "\u0634\u0639\u0631", "Poetry", "poetry"),
      N("drama", "\u0645\u0633\u0631\u062D\u064A\u0627\u062A", "Plays / drama", "drama"),
      N("shorts", "\u0642\u0635\u0635 \u0642\u0635\u064A\u0631\u0629", "Short stories", "short stories"),
      N("comics", "\u0643\u0648\u0645\u064A\u0643\u0633 \u0648\u0631\u0633\u0648\u0645", "Comics & graphic novels", "comics & graphic novels"),
      N("manga", "\u0645\u0627\u0646\u063A\u0627", "Manga", "manga"),
      N("kids", "\u0623\u0637\u0641\u0627\u0644", "Children's", "children's literature"),
      N("anthology", "\u0645\u062E\u062A\u0627\u0631\u0627\u062A", "Anthologies", "anthologies")
    ] }
  ];
  var FIC_EX = ' AND -subject:"history and criticism" AND -subject:"criticism" AND -subject:"biography" AND -subject:"nonfiction" AND -subject:"non-fiction"';
  var NONFIC_EX = ' AND -subject:"fiction" AND -subject:"juvenile fiction" AND -subject:"stories"';
  function olQuery(kind2, q) {
    const base = `subject:"${q}" AND ratings_count:[10 TO *]`;
    if (kind2 === "fiction") return base + ' AND subject:"fiction"' + FIC_EX;
    if (kind2 === "nonfiction") return base + NONFIC_EX;
    return base;
  }
  function isFictionCats(cats) {
    return (cats || []).some((c) => /fiction|novel|stories|fantasy/i.test(c) && !/nonfiction|non-fiction|criticism/i.test(c));
  }
  function isNonFictionCats(cats) {
    return !(cats || []).length || (cats || []).every((c) => !/fiction|novel|stories/i.test(c) || /nonfiction|non-fiction|criticism/i.test(c));
  }
  var PAGE = 24;
  var YEAR_RANGES = [["", "\u0643\u0644 \u0627\u0644\u0633\u0646\u0648\u0627\u062A", "All years"], ["2020-2029", "2020\u20132029", "2020\u20132029"], ["2010-2019", "2010\u20132019", "2010\u20132019"], ["2000-2009", "2000\u20132009", "2000\u20132009"], ["1990-1999", "1990\u20131999", "1990\u20131999"], ["1980-1989", "1980\u20131989", "1980\u20131989"], ["0-1979", "\u0642\u0628\u0644 1980", "Before 1980"]];
  function yrClause(yr) {
    if (!yr) return "";
    const [a, b] = yr.split("-");
    return ` AND first_publish_year:[${a || "*"} TO ${b || "*"}]`;
  }
  function inYear(it, yr) {
    if (!yr) return true;
    const [a, b] = yr.split("-").map(Number);
    const y = parseInt(it.year, 10);
    return !isNaN(y) && y >= a && y <= b;
  }
  async function topOL(node, page) {
    const q = olQuery(node.kind, node.q) + yrClause(node.yr);
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&sort=rating&limit=${PAGE}&offset=${page * PAGE}&fields=key,title,author_name,cover_i,first_publish_year,subject,isbn,ratings_average,ratings_count`);
    if (!res.ok) throw new Error("Open Library " + res.status);
    const d = await res.json();
    return { items: (d.docs || []).map((x) => ({
      olKey: (x.key || "").replace("/works/", ""),
      title: x.title,
      author: (x.author_name || [])[0] || "",
      year: x.first_publish_year || "",
      cover: x.cover_i ? `https://covers.openlibrary.org/b/id/${x.cover_i}-L.jpg` : "",
      subjects: (x.subject || []).slice(0, 8),
      isbn: (x.isbn || [])[0] || "",
      rating: x.ratings_average || 0,
      ratingCount: x.ratings_count || 0
    })), more: (page + 1) * PAGE < (d.numFound || 0) };
  }
  async function topGB(node, page) {
    const subject = node.q;
    const key = (getState().settings.gbKey || "").trim();
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent("subject:" + (node.kind === "fiction" ? "fiction " : "") + subject)}&orderBy=relevance&printType=books&maxResults=${PAGE}&startIndex=${page * PAGE}${key ? "&key=" + encodeURIComponent(key) : ""}`);
    if (res.status === 429) throw new Error(getLang() === "ar" ? "Google Books: \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u062C\u0627\u0646\u064A \u062E\u0644\u0635. \u062D\u0637 \u0645\u0641\u062A\u0627\u062D API \u0641\u064A \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A." : "Google Books quota reached. Add an API key in Settings.");
    if (!res.ok) throw new Error("Google Books " + res.status);
    const d = await res.json();
    const keep = (x) => {
      const c = (x.volumeInfo || {}).categories || [];
      return node.kind === "fiction" ? isFictionCats(c) : node.kind === "nonfiction" ? isNonFictionCats(c) : true;
    };
    return {
      items: (d.items || []).filter(keep).map((x) => {
        const v = x.volumeInfo || {};
        const ids = v.industryIdentifiers || [];
        return {
          olKey: "",
          title: v.title || "?",
          author: (v.authors || [])[0] || "",
          year: (v.publishedDate || "").slice(0, 4),
          cover: (v.imageLinks && (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail) || "").replace("http://", "https://").replace("zoom=1", "zoom=2"),
          subjects: (v.categories || []).slice(0, 6),
          isbn: (ids.find((i) => i.type === "ISBN_13") || ids[0] || {}).identifier || "",
          rating: v.averageRating || 0,
          ratingCount: v.ratingsCount || 0
        };
      }).filter((x) => inYear(x, node.yr)),
      more: (page + 1) * PAGE < (d.totalItems || 0) && (d.items || []).length > 0
    };
  }
  var SOURCES = { ol: ["Open Library", topOL], gb: ["Google Books", topGB] };
  async function wikidataAward(qid2, page) {
    const sp = `SELECT ?wLabel ?aLabel ?year WHERE { ?w wdt:P166 wd:${qid2} . OPTIONAL{?w wdt:P50 ?a} OPTIONAL{?w wdt:P577 ?d . BIND(YEAR(?d) AS ?year)} SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ar". } } ORDER BY DESC(?year) LIMIT ${PAGE} OFFSET ${page * PAGE}`;
    const res = await fetch("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(sp));
    if (!res.ok) throw new Error("Wikidata " + res.status);
    const d = await res.json();
    const seen = /* @__PURE__ */ new Set();
    const items = d.results.bindings.map((b) => ({ olKey: "", title: b.wLabel.value, author: b.aLabel ? b.aLabel.value : "", year: b.year ? b.year.value : "", cover: "", subjects: [], isbn: "", rating: 0, ratingCount: 0 })).filter((x) => !/^Q\d+$/.test(x.title) && !seen.has(x.title + x.author) && seen.add(x.title + x.author));
    return { items, more: d.results.bindings.length === PAGE };
  }
  var WD_AWARDS = [
    ["pulitzer", "\u0628\u0648\u0644\u064A\u062A\u0632\u0631 (\u0631\u0648\u0627\u064A\u0629)", "Pulitzer (Fiction)", "Q833633"],
    ["arabic", "\u0627\u0644\u062C\u0627\u0626\u0632\u0629 \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u0629 \u0644\u0644\u0631\u0648\u0627\u064A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629", "Intl. Prize for Arabic Fiction", "Q4118790"],
    ["nba", "\u0627\u0644\u062C\u0627\u0626\u0632\u0629 \u0627\u0644\u0648\u0637\u0646\u064A\u0629 \u0644\u0644\u0643\u062A\u0627\u0628", "National Book Award (Fiction)", "Q3873144"],
    ["goncourt", "\u063A\u0648\u0646\u0643\u0648\u0631", "Prix Goncourt", "Q187300"],
    ["hugoall", "\u0647\u0648\u063A\u0648 (\u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629)", "Hugo (full list)", "Q255032"],
    ["nebulaall", "\u0646\u064A\u0628\u0648\u0644\u0627 (\u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629)", "Nebula (full list)", "Q266012"],
    ["bookerall", "\u0628\u0648\u0643\u0631 (\u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629)", "Booker (full list)", "Q160082"]
  ];
  var ar0 = (a, e) => getLang() === "ar" ? a : e;
  function renderDiscover(view) {
    view.innerHTML = `
    <div class="view-head"><h1>${t("navDiscover")}</h1></div>
    <div class="disc-section"><div class="search-row">
      <select id="dScope"><option value="all">${ar0("\u0627\u0644\u0643\u0644", "All")}</option><option value="title">${ar0("\u0627\u0644\u0639\u0646\u0648\u0627\u0646", "Title")}</option><option value="author">${ar0("\u0627\u0644\u0645\u0624\u0644\u0641", "Author")}</option><option value="subject">${ar0("\u0627\u0644\u062A\u0635\u0646\u064A\u0641", "Subject")}</option></select>
      <input id="dQ" placeholder="${ar0("\u062F\u0648\u0651\u0631 \u0641\u064A \u0645\u0644\u0627\u064A\u064A\u0646 \u0627\u0644\u0643\u062A\u0628\u2026", "Search millions of books\u2026")}">
      <button id="dGo" class="btn btn-primary">\u{1F50D} ${ar0("\u0628\u062D\u062B", "Search")}</button></div></div>
    <div class="disc-section"><div class="chip-row" id="moodGrid" style="margin-bottom:0"></div></div>
    <div class="disc-section"><h2 style="margin-bottom:.7rem">${t("recommendations")}</h2>
      <p class="muted" id="recHint" style="margin-bottom:.7rem"></p><div class="award-row" id="recGrid"></div></div>
    <div class="disc-section"><h2 style="margin-bottom:.7rem">${t("awards")}</h2>
      <div class="chip-row" id="awardChips"></div><div class="award-row" id="awardList"></div></div>
    <div class="disc-section"><h2 style="margin-bottom:.7rem">${t("topRated")}</h2><div class="award-row" id="topRatedRow"></div></div>
    <div class="disc-section"><h2 style="margin-bottom:.4rem">\u{1F3C5} ${getLang() === "ar" ? "\u0623\u0641\u0636\u0644 \u0627\u0644\u0642\u0648\u0627\u0626\u0645 (\u062D\u0633\u0628 \u062A\u0642\u064A\u064A\u0645\u0627\u062A Open Library)" : "Top lists (by Open Library ratings)"}</h2>
      <p class="muted" style="margin-bottom:.6rem">${getLang() === "ar" ? "\u0623\u0639\u0644\u0649 \u0627\u0644\u0643\u062A\u0628 \u062A\u0642\u064A\u064A\u0645\u064B\u0627 \u0641\u064A \u0643\u0644 \u062A\u0635\u0646\u064A\u0641. \u062A\u0642\u062F\u0631 \u062A\u062D\u0641\u0638 \u0623\u064A \u0642\u0627\u0626\u0645\u0629 \u0643\u0642\u0627\u0626\u0645\u0629 \u0642\u0631\u0627\u0621\u0629 \u0639\u0646\u062F\u0643. \u0648\u0644\u0648 \u0639\u0646\u062F\u0643 \u0645\u0643\u062A\u0628\u0629 Goodreads\u060C \u0627\u0633\u062A\u0648\u0631\u062F\u0647\u0627 \u0645\u0646 \u062A\u0628\u0648\u064A\u0628 \u0627\u0644\u0642\u0648\u0627\u0626\u0645." : "Highest-rated books per subject. Save any list as your own reading list. Got a Goodreads library? Import its CSV from the Lists tab."}</p>
      <div style="margin-bottom:.6rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:center"><span><label class="muted">${getLang() === "ar" ? "\u0627\u0644\u0645\u0635\u062F\u0631" : "Source"}: </label><select id="topSrc">${Object.entries(SOURCES).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select></span>
      <span><label class="muted">${getLang() === "ar" ? "\u0633\u0646\u0648\u0627\u062A \u0627\u0644\u0625\u0635\u062F\u0627\u0631" : "Published"}: </label><select id="topYear">${YEAR_RANGES.map(([v, a, e]) => `<option value="${v}">${getLang() === "ar" ? a : e}</option>`).join("")}</select></span></div>
      <div class="chip-row" id="topKinds"></div><div id="topCrumb" class="muted" style="margin:.4rem 0"></div><div class="chip-row" id="topChips"></div></div>
    <div id="discResults" class="disc-section hidden"><div style="display:flex;gap:.8rem;align-items:center;flex-wrap:wrap;margin-bottom:.7rem"><h2 style="margin:0" id="discResultsTitle"></h2><select id="discSort" class="hidden" title="${getLang() === "ar" ? "\u0627\u0644\u062A\u0631\u062A\u064A\u0628" : "Sort"}">${sortOptionsHTML("default")}</select></div><div class="grid" id="discResultsGrid"></div></div>`;
    const mg = $2("#moodGrid", view);
    MOODS.forEach((m) => {
      const c = document.createElement("button");
      c.className = "chip";
      c.textContent = m.icon + " " + t("mood_" + m.id);
      c.onclick = () => showResults(view, t("mood_" + m.id), async (page) => {
        const items = await searchOpenLibrary("", { subject: m.subject, limit: 24, offset: page * 24 });
        return { items, more: items.length === 24 };
      });
      mg.appendChild(c);
    });
    const runSearch = () => {
      const q = $2("#dQ", view).value.trim();
      if (!q) return;
      const scope = $2("#dScope", view).value;
      const scopeName = $2("#dScope", view).selectedOptions[0].textContent;
      showResults(view, "\u{1F50D} " + q + " \xB7 " + scopeName, (page) => searchScoped(q, scope, page));
    };
    $2("#dGo", view).onclick = runSearch;
    $2("#dQ", view).addEventListener("keydown", (e) => {
      if (e.key === "Enter") runSearch();
    });
    const takePending = () => {
      try {
        const ps = JSON.parse(sessionStorage.getItem("qari.pendingSearch") || "null");
        if (ps && ps.q) {
          sessionStorage.removeItem("qari.pendingSearch");
          $2("#dScope", view).value = ps.scope || "all";
          $2("#dQ", view).value = ps.q;
          runSearch();
        }
      } catch {
      }
    };
    takePending();
    window.__qariDiscoverPending = takePending;
    const chips = $2("#awardChips", view);
    [["hugo", t("hugo")], ["nebula", t("nebula")], ["booker", t("booker")]].forEach(([k, label], i) => {
      const chip2 = document.createElement("button");
      chip2.className = "chip" + (i === 0 ? " active" : "");
      chip2.textContent = label;
      chip2.onclick = () => {
        chips.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
        chip2.classList.add("active");
        renderAward(view, k);
      };
      chips.appendChild(chip2);
    });
    const ar = getLang() === "ar", nm = (n) => ar ? n.ar : n.en;
    const kindsEl = $2("#topKinds", view), tc = $2("#topChips", view), crumb = $2("#topCrumb", view);
    let lastRun = null;
    const startList = (node, path) => {
      const src = $2("#topSrc", view).value;
      const yr = $2("#topYear", view).value;
      const ttl = path.map(nm).join(" \u203A ");
      showResults(view, "\u{1F3C5} " + ttl + (yr ? " \xB7 " + $2("#topYear", view).selectedOptions[0].textContent : "") + " \xB7 " + SOURCES[src][0], (page) => SOURCES[src][1]({ kind: path[0].kind, q: node.q, yr }, page), true);
    };
    const rerun2 = () => {
      if (lastRun) lastRun();
    };
    $2("#topSrc", view).onchange = rerun2;
    $2("#topYear", view).onchange = rerun2;
    const showLevel = (nodes, path) => {
      tc.innerHTML = "";
      crumb.textContent = path.map(nm).join(" \u203A ");
      nodes.forEach((n) => {
        const chip2 = document.createElement("button");
        chip2.className = "chip";
        chip2.textContent = nm(n) + (n.sub && n.sub.length ? " \u25BE" : "");
        chip2.onclick = () => {
          const np = path.concat(n);
          if (n.q) {
            startList(n, np);
            lastRun = () => startList(n, np);
          }
          if (n.sub && n.sub.length) {
            const back = path.length ? [] : [];
            showLevel(n.sub, np);
            addBack(nodes, path);
          } else {
            tc.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
          }
        };
        tc.appendChild(chip2);
      });
    };
    const addBack = (parentNodes, parentPath) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = "\u2B05 " + (ar ? "\u0631\u062C\u0648\u0639" : "Back");
      b.onclick = () => showLevel(parentNodes, parentPath);
      tc.prepend(b);
    };
    CATS.forEach((c) => {
      const chip2 = document.createElement("button");
      chip2.className = "chip";
      chip2.textContent = nm(c);
      chip2.onclick = () => {
        kindsEl.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
        chip2.classList.add("active");
        showLevel(c.sub, [c]);
      };
      kindsEl.appendChild(chip2);
    });
    kindsEl.firstChild.click();
    WD_AWARDS.forEach(([k, ar2, en, qid2]) => {
      const chip2 = document.createElement("button");
      chip2.className = "chip";
      chip2.textContent = (getLang() === "ar" ? ar2 : en) + " \u2197";
      chip2.onclick = () => showResults(view, "\u{1F3C6} " + (getLang() === "ar" ? ar2 : en) + " \xB7 Wikidata", (page) => wikidataAward(qid2, page));
      chips.appendChild(chip2);
    });
    renderAward(view, "hugo");
    renderTopRatedRow(view);
    renderRecommendations(view);
  }
  function awardCard(title, author, year, view) {
    const c = document.createElement("div");
    c.className = "book-card";
    c.style.minWidth = "150px";
    c.innerHTML = `<div class="cover">${placeholderHTML(title, "\u{1F3C6}")}</div>
    <div class="book-meta"><div class="book-title">${esc(title)}</div><div class="book-author">${authorHTML(author)} \xB7 ${year}</div></div>`;
    c.onclick = () => showResults(view, title, () => searchOpenLibrary(title + " " + author, { limit: 4 }));
    const cv = c.querySelector(".cover");
    const load2 = async () => {
      const f = await findCover(title, author);
      if (f && f.cover) {
        cv.innerHTML = coverImgHTML({ cover: f.cover, title }, "\u{1F3C6}");
        if (f.olKey) c.onclick = () => {
          location.hash = "#/work/" + f.olKey;
        };
      }
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => {
        if (es[0].isIntersecting) {
          io.disconnect();
          load2();
        }
      }, { rootMargin: "300px" });
      io.observe(c);
    } else load2();
    return c;
  }
  function renderAward(view, key) {
    const host = $2("#awardList", view);
    host.innerHTML = "";
    AWARDS[key].forEach(([ti, au, yr]) => host.appendChild(awardCard(ti, au, yr, view)));
  }
  function renderTopRatedRow(view) {
    const host = $2("#topRatedRow", view);
    host.innerHTML = "";
    const rated = getState().books.filter((b) => b.rating >= 4).sort((a, b) => b.rating - a.rating).slice(0, 8);
    if (!rated.length) {
      host.innerHTML = `<p class="muted">${t("needRatings")}</p>`;
      return;
    }
    rated.forEach((b) => {
      const c = document.createElement("div");
      c.className = "book-card";
      c.style.minWidth = "150px";
      c.innerHTML = `<div class="cover">${coverImgHTML(b, "\u2B50")}</div>
      <div class="book-meta"><div class="book-title">${esc(b.title)}</div><div class="book-author">${"\u2605".repeat(b.rating)}</div></div>`;
      c.onclick = () => {
        location.hash = "#/book/" + b.id;
      };
      host.appendChild(c);
    });
  }
  async function renderRecommendations(view) {
    const hint = $2("#recHint", view), grid = $2("#recGrid", view);
    const loved = getState().books.filter((b) => b.rating >= 4 && (b.subjects || []).length);
    if (!loved.length) {
      hint.textContent = t("needRatings");
      return;
    }
    hint.textContent = t("loading");
    const freq = {};
    loved.forEach((b) => b.subjects.forEach((s) => {
      freq[s] = (freq[s] || 0) + 1;
    }));
    const topSubjects = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([s]) => s);
    const owned = new Set(getState().books.map((b) => (b.title || "").toLowerCase()));
    try {
      const lists = await Promise.all(topSubjects.map((s) => searchOpenLibrary("", { subject: s.toLowerCase().replace(/\s+/g, "_"), limit: 8 }).catch(() => [])));
      const items = lists.flat().filter((x) => !owned.has(x.title.toLowerCase())).slice(0, 8);
      hint.textContent = topSubjects.length ? `(${topSubjects.join(" \xB7 ")})` : "";
      grid.innerHTML = "";
      items.forEach((it) => {
        const c = recCard(it, view);
        c.style.minWidth = "150px";
        c.style.maxWidth = "150px";
        grid.appendChild(c);
      });
    } catch {
      hint.textContent = t("dictNone");
    }
  }
  function recCard(it, view) {
    const c = document.createElement("div");
    c.className = "book-card";
    c.innerHTML = `<div class="cover">${coverImgHTML(it)}</div>
    <div class="book-meta"><div class="book-title">${esc(it.title)}</div><div class="book-author">${authorHTML(it.author)}</div>${it.rating ? `<div class="muted">\u2605 ${it.rating.toFixed(1)} (${it.ratingCount})</div>` : ""}
    <button class="btn btn-primary" style="margin-top:.4rem;font-size:.75rem;padding:.25rem .7rem">${t("addToLibrary")}</button></div>`;
    c.onclick = async () => {
      if (it.olKey) {
        location.hash = "#/work/" + it.olKey;
        return;
      }
      toast(t("loading"));
      const f = await findCover(it.title, it.author);
      if (f && f.olKey) {
        it.olKey = f.olKey;
        location.hash = "#/work/" + f.olKey;
      } else toast(getLang() === "ar" ? "\u0645\u0634 \u0644\u0627\u0642\u064A \u0635\u0641\u062D\u0629 \u0644\u0644\u0643\u062A\u0627\u0628 \u062F\u0647 \u0641\u064A Open Library" : "No Open Library page found for this book", 3e3);
    };
    if (!it.cover && !it.isbn) {
      const run = async () => {
        const f = await findCover(it.title, it.author);
        if (f) {
          if (f.cover) {
            it.cover = f.cover;
            c.querySelector(".cover").innerHTML = coverImgHTML(it);
          }
          if (f.olKey) {
            it.olKey = f.olKey;
            c.onclick = () => {
              location.hash = "#/work/" + f.olKey;
            };
          }
        }
      };
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((es) => {
          if (es[0].isIntersecting) {
            io.disconnect();
            run();
          }
        }, { rootMargin: "300px" });
        io.observe(c);
      } else run();
    }
    c.querySelector("button").onclick = (e) => {
      e.stopPropagation();
      addBook({ title: it.title, author: it.author, format: "web", cover: it.cover, source: "openlibrary", subjects: it.subjects, isbn: it.isbn, olKey: it.olKey || "", year: it.year || "", shelf: "want" });
      e.target.textContent = t("added");
      e.target.disabled = true;
      toast(t("added"));
    };
    return c;
  }
  async function showResults(view, title, fetcher, saveable = false) {
    const sec = $2("#discResults", view), grid = $2("#discResultsGrid", view), ttl = $2("#discResultsTitle", view), sortSel = $2("#discSort", view);
    sec.classList.remove("hidden");
    ttl.textContent = title;
    grid.innerHTML = `<p class="muted">${t("loading")}</p>`;
    sec.scrollIntoView({ behavior: "smooth" });
    const all = [];
    let page = 0, more = true, busy2 = false, token = {};
    grid.__token = token;
    let sortMode = "default", saveBtn = null;
    if (sortSel) {
      sortSel.value = "default";
      sortSel.classList.add("hidden");
      sortSel.onchange = () => {
        sortMode = sortSel.value;
        paint();
      };
    }
    const paint = () => {
      grid.innerHTML = "";
      if (!all.length) {
        grid.innerHTML = `<p class="muted">${t("noResults")}</p>`;
        return;
      }
      if (saveBtn) grid.appendChild(saveBtn);
      (sortMode === "default" ? all : sortBooks(all, sortMode)).forEach((it) => grid.appendChild(recCard(it, view)));
    };
    const old = sec.querySelector(".more-box");
    if (old) old.remove();
    const box = document.createElement("div");
    box.className = "more-box";
    sec.appendChild(box);
    const loadPage = async () => {
      if (busy2 || !more || grid.__token !== token) return;
      busy2 = true;
      try {
        const r = await fetcher(page);
        const items = Array.isArray(r) ? r : r.items;
        more = Array.isArray(r) ? false : r.more;
        page++;
        items.forEach((it) => all.push(it));
        if (page === 1 && saveable && items.length && !saveBtn) {
          saveBtn = document.createElement("button");
          saveBtn.className = "btn btn-primary";
          saveBtn.style.gridColumn = "1/-1";
          saveBtn.textContent = "\u{1F4CB} " + (getLang() === "ar" ? "\u0627\u062D\u0641\u0638\u0647\u0627 \u0643\u0642\u0627\u0626\u0645\u0629 \u0642\u0631\u0627\u0621\u0629 (\u0643\u0644 \u0627\u0644\u0644\u064A \u0638\u0627\u0647\u0631)" : "Save as reading list (everything loaded)");
          saveBtn.onclick = () => {
            const l = createList(title.replace(/^[^ ]+ /, "").split(" \xB7 ")[0], "Open Library");
            all.forEach((it) => {
              let bk = it.olKey && findBookByOl(it.olKey) || getState().books.find((x) => x.title === it.title && x.author === it.author);
              if (!bk) bk = addBook({ title: it.title, author: it.author, format: "web", cover: it.cover, source: "openlibrary", subjects: it.subjects, isbn: it.isbn, olKey: it.olKey || "", year: it.year || "", shelf: "want" });
              listToggleBook(l.id, bk.id);
            });
            toast(t("added"));
            location.hash = "#/lists/" + l.id;
          };
        }
        paint();
        if (sortSel) sortSel.classList.toggle("hidden", all.length < 2);
      } catch (e) {
        if (page === 0) grid.innerHTML = `<p class="muted">\u26A0 ${esc(e.message)}</p>`;
        more = false;
      }
      busy2 = false;
      box.innerHTML = more ? `<button class="btn" style="margin:1rem auto;display:block">${getLang() === "ar" ? "\u0639\u0631\u0636 \u0627\u0644\u0645\u0632\u064A\u062F" : "Load more"}</button>` : all.length ? `<p class="muted" style="text-align:center">${all.length} ${getLang() === "ar" ? "\u0643\u062A\u0627\u0628" : "books"}</p>` : "";
      const btn = box.querySelector("button");
      if (btn) {
        btn.onclick = loadPage;
        if ("IntersectionObserver" in window) {
          const io = new IntersectionObserver((es) => {
            if (es[0].isIntersecting) {
              io.disconnect();
              loadPage();
            }
          }, { rootMargin: "600px" });
          io.observe(btn);
        }
      }
    };
    loadPage();
  }
  function bindDiscover() {
  }

  // src/community.js
  var $3 = (s, r = document) => r.querySelector(s);
  function renderCommunity(view) {
    const st = getState();
    view.innerHTML = `
    <div class="view-head"><h1>${t("navCommunity")}</h1></div>
    <div class="stat-card" style="margin-bottom:1.4rem">
      <h3 style="margin-bottom:.6rem">\u{1F465} ${t("buddyRead")}</h3>
      <div class="search-row" style="max-width:360px"><input id="buddyName" placeholder="${t("buddyName")}" value="${esc(st.buddy.name || "")}"><button id="saveBuddy" class="btn">${t("save")}</button></div>
      <p class="muted" style="margin-bottom:.6rem">${getLang() === "ar" ? "\u0633\u062C\u0651\u0644 \u062A\u0639\u0644\u064A\u0642\u0627\u062A\u0643 \u0639\u0644\u0649 \u0641\u0635\u0648\u0644 \u0643\u062A\u0627\u0628 \u0628\u062A\u0642\u0631\u0627\u0647 \u0645\u0639 \u0635\u0627\u062D\u0628\u0643\u060C \u0648\u0628\u0627\u062F\u0644\u0648\u0627 \u0627\u0644\u0645\u0644\u0641\u0627\u062A: \u0635\u062F\u0651\u0631 \u062A\u0639\u0644\u064A\u0642\u0627\u062A\u0643 \u0648\u0627\u0628\u0639\u062A\u0647\u0627\u060C \u0648\u0627\u0633\u062A\u0648\u0631\u062F \u062A\u0639\u0644\u064A\u0642\u0627\u062A\u0647 \u2014 \u0628\u062A\u062A\u062F\u0645\u062C \u062A\u0644\u0642\u0627\u0626\u064A." : "Comment on chapters of a book you read with a friend, then swap files: export your comments and import theirs \u2014 they merge automatically."}</p>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <select id="buddyBook">${st.books.map((b) => `<option value="${b.id}">${esc(b.title)}</option>`).join("")}</select>
        <input id="chapterName" placeholder="${t("chapters")}\u2026" style="max-width:160px">
      </div>
      <div style="display:flex;gap:.5rem;margin-top:.5rem;align-items:flex-start">
        <textarea id="commentText" rows="2" style="flex:1" placeholder="${t("addComment")}"></textarea>
      </div>
      <div style="display:flex;gap:.5rem;margin-top:.5rem;flex-wrap:wrap">
        <button id="sendMe" class="btn btn-primary">${t("send")} (${t("asMe")})</button>
        <button id="sendBuddy" class="btn">${t("send")} (${t("asBuddy")})</button>
        <button id="expComments" class="btn">\u2B07 ${t("exportBuddy")}</button>
        <button id="impComments" class="btn">\u2B06 ${t("importBuddy")}</button>
        <input type="file" id="impFile" accept=".json" hidden>
      </div>
      <div id="commentsList" style="margin-top:1rem"></div>
    </div>
    <h2 style="margin-bottom:.7rem">${t("myActivity")}</h2>
    <div id="activityFeed"></div>`;
  }
  function bindCommunity(view) {
    const st = getState();
    $3("#saveBuddy", view).onclick = () => {
      st.buddy.name = $3("#buddyName", view).value.trim();
      save();
      toast(t("added"));
    };
    const refreshComments = () => renderComments(view);
    $3("#buddyBook", view).onchange = refreshComments;
    $3("#sendMe", view).onclick = () => postComment(view, getLang() === "ar" ? "\u0623\u0646\u0627" : "Me", "me");
    $3("#sendBuddy", view).onclick = () => {
      const name = (st.buddy.name || "").trim();
      if (!name) {
        toast(t("buddyName"));
        return;
      }
      postComment(view, name, "buddy");
    };
    $3("#expComments", view).onclick = () => {
      const mine = st.comments.filter((c) => c.origin === "me");
      const blob = new Blob([JSON.stringify({ app: "qari-comments", from: "me", comments: mine }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "qari-comments.json";
      a.click();
      toast(t("exported"));
    };
    $3("#impComments", view).onclick = () => $3("#impFile", view).click();
    $3("#impFile", view).onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        const arr = data.comments || data.data && data.data.comments || [];
        let added = 0;
        const have = new Set(st.comments.map((c) => c.id));
        arr.forEach((c) => {
          if (c && c.id && !have.has(c.id)) {
            st.comments.push(c);
            added++;
          }
        });
        save();
        toast(t("imported") + ` (${added})`);
        refreshComments();
        e.target.value = "";
      } catch (err) {
        toast("\u26A0 " + err.message, 3500);
      }
    };
    renderComments(view);
    renderActivity(view);
  }
  function postComment(view, author, origin) {
    const bookId = $3("#buddyBook", view).value;
    const chapter = $3("#chapterName", view).value.trim();
    const text = $3("#commentText", view).value.trim();
    if (!bookId || !text) return;
    addComment({ bookId, chapter, author, text, origin });
    $3("#commentText", view).value = "";
    renderComments(view);
  }
  function renderComments(view) {
    const bookId = $3("#buddyBook", view).value;
    const list = $3("#commentsList", view);
    const cms = bookComments(bookId);
    list.innerHTML = cms.length ? "" : '<p class="muted">\u2014</p>';
    cms.forEach((c) => {
      const d = document.createElement("div");
      d.className = "comment";
      d.innerHTML = `<div class="c-meta">${c.origin === "buddy" ? "\u{1F464}" : "\u{1F642}"} ${esc(c.author)} ${c.chapter ? "\xB7 " + esc(c.chapter) : ""} \xB7 ${fmtDate(c.createdAt)}</div><div>${esc(c.text)}</div>`;
      list.appendChild(d);
    });
  }
  function renderActivity(view) {
    const st = getState();
    const host = $3("#activityFeed", view);
    const feed = st.activity.slice(0, 30);
    host.innerHTML = feed.length ? "" : '<p class="muted">\u2014</p>';
    feed.forEach((a) => {
      const b = getBook(a.bookId);
      const d = document.createElement("div");
      d.className = "review-card";
      const icon = { rating: "\u2B50", review: "\u270D\uFE0F", comment: "\u{1F4AC}", finished: "\u2705" }[a.type] || "\u2022";
      d.innerHTML = `<div class="rc-head"><strong>${icon} ${esc(b ? b.title : a.text || "")}</strong><span class="muted">${fmtDate(a.createdAt)}</span></div>
      ${b && b.rating ? `<div style="margin-top:.25rem"></div>` : ""}
      ${b && a.type === "review" && b.review ? `<p style="margin-top:.3rem">${esc(b.review)}</p>` : ""}`;
      if (b && b.rating) d.querySelector(".rc-head").appendChild(stars(b.rating));
      host.appendChild(d);
    });
  }

  // src/fonts.js
  var DEFS = [
    ["auto", "'Amiri', Georgia, serif", "\u062A\u0644\u0642\u0627\u0626\u064A (\u0623\u0645\u064A\u0631\u064A)", "Auto (Amiri)", null, null, "ar"],
    ["amiri", "'Amiri', Georgia, serif", "\u0623\u0645\u064A\u0631\u064A (\u0646\u0633\u062E \u0643\u0644\u0627\u0633\u064A\u0643\u064A)", "Amiri (classic naskh)", null, null, "ar"],
    ["naskh", "'Noto Naskh Arabic', Georgia, serif", "\u0646\u0648\u062A\u0648 \u0646\u0633\u062E", "Noto Naskh", "noto-naskh-arabic", "Noto Naskh Arabic", "ar"],
    ["schehe", "'Scheherazade New', Georgia, serif", "\u0634\u0647\u0631\u0632\u0627\u062F", "Scheherazade New", "scheherazade-new", "Scheherazade New", "ar"],
    ["lateef", "'Lateef', Georgia, serif", "\u0644\u0637\u064A\u0641 (\u0646\u0633\u062A\u0639\u0644\u064A\u0642 \u062E\u0641\u064A\u0641)", "Lateef", "lateef", "Lateef", "ar"],
    ["markazi", "'Markazi Text', Georgia, serif", "\u0645\u0631\u0643\u0632\u064A", "Markazi Text", "markazi-text", "Markazi Text", "ar"],
    ["messiri", "'El Messiri', Georgia, serif", "\u0627\u0644\u0645\u0633\u064A\u0631\u064A", "El Messiri", "el-messiri", "El Messiri", "ar"],
    ["cairo", "'Cairo', system-ui, sans-serif", "\u0627\u0644\u0642\u0627\u0647\u0631\u0629 (\u0633\u0627\u0646 \u0633\u064A\u0631\u064A\u0641)", "Cairo (sans)", null, null, "ar"],
    ["tajawal", "'Tajawal', system-ui, sans-serif", "\u062A\u062C\u0648\u0627\u0644", "Tajawal (sans)", "tajawal", "Tajawal", "ar"],
    ["almarai", "'Almarai', system-ui, sans-serif", "\u0627\u0644\u0645\u0631\u0639\u064A", "Almarai (sans)", "almarai", "Almarai", "ar"],
    ["kufi", "'Noto Kufi Arabic', system-ui, sans-serif", "\u0646\u0648\u062A\u0648 \u0643\u0648\u0641\u064A", "Noto Kufi", "noto-kufi-arabic", "Noto Kufi Arabic", "ar"],
    ["lora", "'Lora', Georgia, serif", "Lora (\u0625\u0646\u062C\u0644\u064A\u0632\u064A \u0633\u064A\u0631\u064A\u0641)", "Lora (serif)", "lora", "Lora", "en"],
    ["georgia", "Georgia, 'Times New Roman', serif", "\u062C\u0648\u0631\u062C\u064A\u0627", "Georgia", null, null, "en"],
    ["system", "system-ui, 'Segoe UI', sans-serif", "\u062E\u0637 \u0627\u0644\u0646\u0638\u0627\u0645", "System sans", null, null, "en"]
  ];
  var FONTS = DEFS.map((d) => ({ id: d[0], stack: d[1], ar: d[2], en: d[3], prefix: d[4], family: d[5], script: d[6] }));
  function fontStack(id) {
    const f = FONTS.find((x) => x.id === id) || FONTS[0];
    return f.stack;
  }
  function fontLabel(f) {
    return getLang() === "ar" ? f.ar : f.en;
  }
  function fontFaceCSS() {
    const base = new URL("fonts/", document.baseURI).href;
    const faces = [];
    const add = (family, file, w) => faces.push(`@font-face{font-family:'${family}';src:url('${base}${file}') format('woff2');font-weight:${w};font-display:swap}`);
    [400, 700].forEach((w) => add("Amiri", `amiri-arabic-${w}-normal.woff2`, w));
    [400, 600, 700].forEach((w) => add("Cairo", `cairo-arabic-${w}-normal.woff2`, w));
    FONTS.filter((f) => f.prefix).forEach((f) => {
      const script = f.script === "en" ? "latin" : "arabic";
      [400, 700].forEach((w) => add(f.family, `${f.prefix}-${script}-${w}-normal.woff2`, w));
    });
    return faces.join("\n");
  }
  function fontPicker(current, onPick) {
    const wrap = document.createElement("div");
    wrap.className = "font-picker";
    const sample = getLang() === "ar" ? "\u0641\u064A \u0627\u0644\u0628\u062F\u0621 \u0643\u0627\u0646\u062A \u0627\u0644\u0643\u0644\u0645\u0629\u060C \u0648\u0643\u0627\u0646\u062A \u0627\u0644\u0643\u0644\u0645\u0629 \u062C\u0645\u064A\u0644\u0629. Reading is fun 123" : "The quick brown fox jumps over the lazy dog. \u0641\u064A \u0627\u0644\u0628\u062F\u0621 \u0643\u0627\u0646\u062A \u0627\u0644\u0643\u0644\u0645\u0629";
    wrap.innerHTML = `<div class="font-grid"></div><div class="font-preview" dir="auto"></div>`;
    const grid = wrap.querySelector(".font-grid"), prev2 = wrap.querySelector(".font-preview");
    const paint = (id) => {
      prev2.style.fontFamily = fontStack(id);
      prev2.textContent = sample;
      grid.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.font === id));
    };
    FONTS.forEach((f) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.font = f.id;
      b.className = "font-opt";
      b.style.fontFamily = f.stack;
      b.textContent = fontLabel(f);
      b.onclick = () => {
        paint(f.id);
        onPick(f.id);
      };
      grid.appendChild(b);
    });
    paint(current || "auto");
    return wrap;
  }

  // src/tts.js
  var NATURAL_RE = /natural|neural|online|premium|enhanced|siri/i;
  var ROBOTIC_RE = /hoda|naayf|compact|espeak|festival|pico/i;
  function voices() {
    try {
      return window.speechSynthesis && window.speechSynthesis.getVoices() || [];
    } catch {
      return [];
    }
  }
  function onVoices(cb) {
    if (!window.speechSynthesis) return () => {
    };
    const fire2 = () => cb(voices());
    window.speechSynthesis.addEventListener("voiceschanged", fire2);
    if (!voices().length) setTimeout(fire2, 400);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", fire2);
  }
  function waitVoices(ms = 1500) {
    return new Promise((res) => {
      if (voices().length) return res(voices());
      let done = false;
      let stop = () => {
      };
      const finish = (v) => {
        if (done) return;
        done = true;
        stop();
        res(v);
      };
      stop = onVoices((v) => {
        if (v.length) finish(v);
      });
      setTimeout(() => finish(voices()), ms);
    });
  }
  var baseLang = (l) => String(l || "").toLowerCase().replace("_", "-").split("-")[0];
  function quality(v) {
    if (!v) return -1e9;
    const name = (v.name || "") + " " + (v.voiceURI || "");
    let s = 0;
    if (NATURAL_RE.test(name)) s += 100;
    if (ROBOTIC_RE.test(name)) s -= 40;
    if (/google/i.test(name)) s += 30;
    if (v.localService === false) s += 15;
    if (v.default) s += 5;
    return s;
  }
  var isNatural = (v) => !!v && NATURAL_RE.test((v.name || "") + " " + (v.voiceURI || ""));
  function detectLang(text) {
    const t2 = String(text || "");
    const ar = (t2.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length;
    const lat = (t2.match(/[A-Za-z]/g) || []).length;
    if (!ar && !lat) return "";
    if (!ar) return "en";
    if (!lat) return "ar";
    return ar >= lat * 0.5 ? "ar" : "en";
  }
  function langScore(v, lang2) {
    const L = baseLang(lang2);
    let s = quality(v);
    if (!L) return s;
    const vl = String(v.lang || "").toLowerCase().replace("_", "-");
    if (vl === L) s += 12;
    else if (vl.startsWith(L + "-")) s += 10;
    else if (baseLang(vl) === L) s += 8;
    if (L === "ar" && /^ar-eg/.test(vl)) s += 25;
    return s;
  }
  function voicesFor(lang2) {
    const L = baseLang(lang2);
    return voices().filter((v) => !L || baseLang(v.lang) === L).slice().sort((a, b) => langScore(b, lang2) - langScore(a, lang2));
  }
  function pickVoice(lang2, preferURI) {
    const all = voices();
    if (!all.length) return null;
    const L = baseLang(lang2);
    if (preferURI) {
      const p = all.find((v) => v.voiceURI === preferURI || v.name === preferURI);
      if (p && (!L || baseLang(p.lang) === L)) return p;
    }
    const pool = voicesFor(lang2);
    if (pool.length) return pool[0];
    return all.slice().sort((a, b) => quality(b) - quality(a))[0] || null;
  }
  function sampleFor(lang2) {
    return baseLang(lang2) === "ar" ? "\u062F\u0647 \u0634\u0643\u0644 \u0627\u0644\u0635\u0648\u062A \u0627\u0644\u062C\u062F\u064A\u062F \u0641\u064A \u0642\u0627\u0631\u0626. \u062C\u0631\u0651\u0628 \u0627\u0644\u0633\u0631\u0639\u0629 \u0644\u0648 \u0639\u0627\u064A\u0632\u0647\u0627 \u0623\u0633\u0631\u0639 \u0623\u0648 \u0623\u0628\u0637\u0623." : "This is how your book will sound in Qari. Try another speed if you like it faster or slower.";
  }
  function preview(voice, lang2, rate = 1) {
    if (!window.speechSynthesis) return null;
    try {
      window.speechSynthesis.cancel();
    } catch {
    }
    const u = new SpeechSynthesisUtterance(sampleFor(lang2));
    try {
      if (voice) u.voice = voice;
    } catch (e) {
      console.warn("tts voice rejected, using language default", e);
    }
    u.lang = voice && voice.lang || (baseLang(lang2) === "ar" ? "ar-EG" : "en-US");
    u.rate = rate || 1;
    try {
      window.speechSynthesis.speak(u);
    } catch {
    }
    return u;
  }
  function langLabel(lang2) {
    const L = baseLang(lang2);
    if (!L) return "";
    try {
      const uiLang = document.documentElement.lang || "ar";
      const dn = new Intl.DisplayNames([uiLang], { type: "language" });
      return dn.of(L) || L;
    } catch {
      return L;
    }
  }

  // src/reader.js
  var $4 = (s, r = document) => r.querySelector(s);
  var R = null;
  var HL_COLORS = ["#ffd54a", "#8ee08e", "#7ec8ff", "#ff9db0"];
  function layoutMode() {
    const w = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
    return w < 700 ? "phone" : w < 1100 ? "tablet" : "desktop";
  }
  function applyLayout(resize = true) {
    const m = layoutMode();
    const stage = $4("#readerStage"), body = $4("#readerBody");
    if (!stage || !body) return;
    ["phone", "tablet", "desktop"].forEach((x) => {
      stage.classList.toggle("lay-" + x, x === m);
      body.classList.toggle("lay-" + x, x === m);
    });
    const l = getState().settings.layout || "auto";
    $4("#phoneBtn") && $4("#phoneBtn").classList.toggle("on", l === "phone");
    $4("#tabletBtn") && $4("#tabletBtn").classList.toggle("on", l === "tablet");
    if (!resize || !R) return;
    if (R.rendition) {
      applyEpubTheme();
      try {
        R.rendition.resize();
      } catch {
      }
    } else if (R.pdf) renderPdfPage();
    else if (R.txtPages) renderTxtPage();
  }
  async function showTocPanel() {
    const panel = $4("#readerPanel");
    panel.classList.remove("hidden");
    panel.dataset.kind = "toc";
    panel.innerHTML = `<h3>\u{1F4D1} ${t("toc")}</h3><div id="tocList"><p class="muted">\u2026</p></div>`;
    const list = panel.querySelector("#tocList");
    const items = [];
    try {
      if (R.epub) {
        const walk = (arr, d) => (arr || []).forEach((it) => {
          items.push({ label: (it.label || "").trim(), depth: d, go: () => R.rendition.display(it.href) });
          walk(it.subitems, d + 1);
        });
        walk(R.epub.navigation && R.epub.navigation.toc, 0);
      } else if (R.pdf) {
        const ol = await R.pdf.getOutline();
        const walk = async (arr, d) => {
          for (const it of arr || []) {
            const go = async () => {
              try {
                let dest = it.dest;
                if (typeof dest === "string") dest = await R.pdf.getDestination(dest);
                const idx = await R.pdf.getPageIndex(dest[0]);
                R.pdfPage = idx + 1;
                renderPdfPage();
              } catch {
              }
            };
            items.push({ label: (it.title || "").trim(), depth: d, go });
            await walk(it.items, d + 1);
          }
        };
        await walk(ol, 0);
      } else if (R.txtPages) {
        const re = /^[ \t]*((?:chapter|part|book|section|الفصل|فصل|الباب|باب|الجزء|جزء|الكتاب)\b[^\n]{0,70})$/gim;
        R.txtPages.forEach((p, i) => {
          re.lastIndex = 0;
          const m = re.exec(p);
          if (m) items.push({ label: m[1].trim(), depth: 0, go: () => {
            R.txtIdx = i;
            renderTxtPage();
          } });
        });
      }
    } catch (e) {
      console.warn("toc failed", e);
    }
    if (!items.length) {
      list.innerHTML = `<p class="muted">${t("tocNone")}</p>`;
      return;
    }
    list.innerHTML = "";
    items.forEach((it) => {
      const b = document.createElement("button");
      b.className = "toc-item" + (it.depth ? " sub" : "");
      b.textContent = it.label || "\u2014";
      b.style.paddingInlineStart = 0.3 + it.depth * 1 + "rem";
      b.onclick = async () => {
        await it.go();
        panel.classList.add("hidden");
      };
      list.appendChild(b);
    });
  }
  var sliderDrag = false;
  function bindSlider() {
    const sl = $4("#pageSlider");
    if (!sl || sl._bound) return;
    sl._bound = true;
    const label = (v) => {
      if (!R) return "";
      if (R.pdf) return `${t("pageN").replace("{n}", Math.max(1, Math.round(v / 1e3 * (R.pdf.numPages - 1)) + 1))} ${t("of")} ${R.pdf.numPages}`;
      if (R.txtPages) return `${Math.round(v / 1e3 * (R.txtPages.length - 1)) + 1} / ${R.txtPages.length}`;
      if (R.rendition && R.locationsReady) {
        const tot = R.epub.locations.total;
        return `${Math.max(1, Math.round(v / 1e3 * (tot - 1)) + 1)} / ${tot} \xB7 ${Math.round(v / 10)}%`;
      }
      return Math.round(v / 10) + "%";
    };
    sl.addEventListener("pointerdown", () => {
      sliderDrag = true;
    });
    sl.addEventListener("input", () => {
      sliderDrag = true;
      $4("#readerProgressLabel").textContent = label(+sl.value);
    });
    sl.addEventListener("change", () => {
      sliderDrag = false;
      if (!R) return;
      const v = +sl.value / 1e3;
      if (R.pdf) {
        R.pdfPage = Math.round(v * (R.pdf.numPages - 1)) + 1;
        renderPdfPage();
      } else if (R.txtPages) {
        R.txtIdx = Math.round(v * (R.txtPages.length - 1));
        renderTxtPage();
      } else if (R.rendition) {
        if (!R.locationsReady) {
          toast(t("pagesPreparing"));
          updateProgress();
          return;
        }
        const cfi = R.epub.locations.cfiFromPercentage(Math.min(0.999, v));
        if (cfi) R.rendition.display(cfi);
      }
    });
    document.addEventListener("pointerup", () => {
      sliderDrag = false;
    });
  }
  var imgUrlCache = /* @__PURE__ */ new Map();
  async function imgDataUrl(im) {
    if (imgUrlCache.has(im.id)) return imgUrlCache.get(im.id);
    const blob = await getFile(im.fileKey);
    if (!blob) return "";
    const u = await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.readAsDataURL(blob);
    });
    imgUrlCache.set(im.id, u);
    return u;
  }
  async function shrinkImage(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error("bad image"));
        i.src = url;
      });
      const sc = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * sc);
      c.height = Math.round(img.naturalHeight * sc);
      const x = c.getContext("2d");
      x.fillStyle = "#fff";
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  function blockAfter(range, doc) {
    let el = range.endContainer;
    while (el && el.nodeType !== 1) el = el.parentNode;
    const body = doc.body;
    while (el && el !== body && el.parentElement !== body && !/^(P|DIV|H[1-6]|LI|BLOCKQUOTE|SECTION|FIGURE|TABLE|PRE|UL|OL)$/.test(el.tagName)) el = el.parentElement;
    return el || body;
  }
  function makeFigure(doc, im, url) {
    const fig = doc.createElement("figure");
    fig.className = "qari-img";
    fig.dataset.id = im.id;
    fig.setAttribute("style", "margin:1em auto;text-align:center;break-inside:avoid;max-width:100%");
    const img = doc.createElement("img");
    img.src = url;
    img.alt = "";
    img.setAttribute("style", "max-width:100%;max-height:80vh;height:auto;border-radius:6px");
    if (im.scale && im.scale < 100) img.style.width = im.scale + "%";
    fig.appendChild(img);
    if (im.caption) {
      const c = doc.createElement("figcaption");
      c.textContent = im.caption;
      c.setAttribute("style", "font-size:.85em;opacity:.7;margin-top:.3em");
      fig.appendChild(c);
    }
    img.addEventListener("load", () => {
      try {
        R && R.rendition && R.rendition.resize();
      } catch {
      }
    });
    return fig;
  }
  async function placeEpubImages(contents) {
    if (!R || !R.epub) return;
    const doc = contents.document;
    doc.querySelectorAll("figure.qari-img").forEach((f) => f.remove());
    const imgs = bookImages(R.book.id).filter((i) => i.cfi && i.fileKey).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const im of imgs) {
      try {
        const sec = R.epub.spine.get(im.cfi);
        if (!sec || sec.index !== contents.sectionIndex) continue;
        const range = contents.range(im.cfi, "qari-img");
        if (!range) continue;
        const url = await imgDataUrl(im);
        if (!url) continue;
        const fig = makeFigure(doc, im, url);
        const el = blockAfter(range, doc);
        if (el === doc.body) doc.body.appendChild(fig);
        else el.insertAdjacentElement("afterend", fig);
      } catch (e) {
        console.warn("place image failed", e);
      }
    }
  }
  function refreshImages() {
    if (!R) return;
    if (R.rendition) {
      try {
        R.rendition.getContents().forEach((c) => placeEpubImages(c));
        setTimeout(() => {
          try {
            R.rendition.resize();
          } catch {
          }
        }, 150);
      } catch {
      }
    } else if (R.txtPages) renderTxtPage();
  }
  function askRemoveImage(id) {
    if (!confirm(getLang() === "ar" ? "\u0645\u0633\u062D \u0627\u0644\u0635\u0648\u0631\u0629 \u062F\u064A \u0645\u0646 \u0627\u0644\u0643\u062A\u0627\u0628\u061F" : "Remove this image from the book?")) return;
    const im = (getState().images || []).find((i) => i.id === id);
    removeImage(id);
    if (im) deleteFile(im.fileKey).catch(() => {
    });
    imgUrlCache.delete(id);
    refreshImages();
    const p = $4("#readerPanel");
    if (p && p.dataset.kind === "img") showImagePanel();
  }
  function capturePos() {
    if (R.rendition) {
      try {
        const c = R.rendition.getContents()[0];
        const sel = c.window.getSelection();
        if (sel && sel.rangeCount && !sel.isCollapsed) return { cfi: c.cfiFromRange(sel.getRangeAt(0), "qari-img") };
      } catch {
      }
      const loc = R.rendition.currentLocation();
      if (loc && loc.start) return { cfi: loc.start.cfi };
      return null;
    }
    if (R.txtPages) {
      let at = null;
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount && !sel.isCollapsed) {
          const rg = sel.getRangeAt(0);
          let n = rg.endContainer;
          if (n.nodeType === 3) n = n.parentNode;
          const sp = n.closest && n.closest(".seg");
          if (sp) at = +sp.dataset.off + (rg.endContainer.nodeType === 3 ? rg.endOffset : 0);
        }
      } catch {
      }
      return { page: R.txtIdx + 1, at };
    }
    return null;
  }
  async function showImagePanel() {
    const panel = $4("#readerPanel");
    panel.classList.remove("hidden");
    panel.dataset.kind = "img";
    const ar = getLang() === "ar";
    if (R.pdf || !(R.rendition || R.txtPages)) {
      panel.innerHTML = `<h3>\u{1F5BC} ${t("addImage")}</h3><p class="muted">${t("imgNoPdf")}</p>`;
      return;
    }
    if (!panel._pos || panel._bookId !== R.book.id || !panel._keep) {
      panel._pos = capturePos();
    }
    panel._bookId = R.book.id;
    panel._keep = false;
    const list = bookImages(R.book.id);
    panel.innerHTML = `<h3>\u{1F5BC} ${t("addImage")}</h3>
    <p class="muted" style="margin-bottom:.6rem">${t("imgHint")}</p>
    <input id="imgCap" placeholder="${t("imgCaption")}" style="width:100%;margin-bottom:.5rem">
    <button id="imgPick" class="btn btn-primary" style="margin-bottom:.4rem">\uFF0B ${t("imgChoose")}</button>
    <input type="file" id="imgFile" accept="image/*" hidden>
    <h4 style="margin:.8rem 0 .4rem">${t("imgInBook")} (${list.length})</h4><div id="imgList"></div>`;
    panel.querySelector("#imgPick").onclick = () => {
      panel._keep = true;
      panel.querySelector("#imgFile").click();
    };
    panel.querySelector("#imgFile").onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const pos = panel._pos || capturePos();
        if (!pos) throw new Error(t("imgNoPos"));
        const blob = await shrinkImage(f);
        const im = addImage(Object.assign({ bookId: R.book.id, caption: panel.querySelector("#imgCap").value.trim() }, pos));
        await putFile(im.fileKey, blob);
        panel._pos = null;
        refreshImages();
        toast(t("added"));
      } catch (err) {
        toast("\u26A0 " + (err.message || err), 3500);
      }
      showImagePanel();
    };
    const lh = panel.querySelector("#imgList");
    if (!list.length) lh.innerHTML = `<p class="muted">${t("imgNone")}</p>`;
    list.forEach(async (im) => {
      const row = document.createElement("div");
      row.className = "comment";
      row.innerHTML = `<div style="display:flex;gap:.5rem;align-items:center"><img style="width:56px;height:56px;object-fit:cover;border-radius:6px"><div style="flex:1" class="muted captext"></div><button class="icon-btn" data-act="jump">\u21A9</button><button class="icon-btn" data-act="del">\u{1F5D1}</button></div>
      <div style="display:flex;gap:.5rem;align-items:center;margin-top:.35rem"><span class="muted" style="font-size:.8rem">${t("imgSize")}</span><input type="range" min="20" max="100" step="5" value="${im.scale || 100}" style="flex:1"><span class="muted szv" style="font-size:.8rem;min-width:2.6em;text-align:end">${im.scale || 100}%</span></div>`;
      row.querySelector(".captext").textContent = im.caption || (im.page ? t("pageN").replace("{n}", im.page) : "");
      imgDataUrl(im).then((u) => {
        if (u) row.querySelector("img").src = u;
      });
      row.querySelector("[data-act=jump]").onclick = () => {
        if (im.cfi && R.rendition) R.rendition.display(im.cfi);
        else if (im.page && R.txtPages) {
          R.txtIdx = im.page - 1;
          renderTxtPage();
        }
      };
      row.querySelector("[data-act=del]").onclick = () => askRemoveImage(im.id);
      const rng = row.querySelector("input[type=range]");
      rng.oninput = () => {
        row.querySelector(".szv").textContent = rng.value + "%";
      };
      rng.onchange = () => {
        updateImage(im.id, { scale: +rng.value });
        refreshImages();
      };
      lh.appendChild(row);
    });
  }
  async function openReader(book) {
    const ov = $4("#readerOverlay");
    ov.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    $4("#readerTitle").textContent = book.title;
    $4("#readerPanel").classList.add("hidden");
    $4("#selPop").classList.add("hidden");
    R = {
      book,
      startedAt: Date.now(),
      pagesTurned: 0,
      epub: null,
      rendition: null,
      pdf: null,
      pdfPage: 1,
      txtPages: null,
      txtIdx: 0,
      ttsActive: false,
      locationsReady: false,
      selAt: 0,
      timer: null
    };
    R.timer = setInterval(() => {
      if (!R || document.hidden || $4("#readerOverlay").classList.contains("hidden")) return;
      const mins = (Date.now() - R.startedAt) / 6e4;
      const st = $4("#sessionTimer");
      if (st) st.textContent = mins < 60 ? `${Math.floor(mins)}:${String(Math.floor(mins % 1 * 60)).padStart(2, "0")}` : `${Math.floor(mins / 60)}h ${Math.floor(mins % 60)}m`;
    }, 1e3);
    bindChrome();
    bindSlider();
    applyLayout(false);
    if (book.format === "web" || !book.fileKey) {
      renderWebRef(book);
      return;
    }
    const blob = await getFile(book.fileKey);
    if (!blob) {
      $4("#readerStage").innerHTML = `<p class="muted" style="padding:2rem">\u26A0 \u0645\u0644\u0641 \u0627\u0644\u0643\u062A\u0627\u0628 \u0645\u0634 \u0645\u0648\u062C\u0648\u062F \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632.</p>`;
      return;
    }
    try {
      if (book.format === "epub") await openEpub(blob, book);
      else if (book.format === "pdf") await openPdf(blob, book);
      else openTxt(await blob.text(), book);
    } catch (e) {
      console.error(e);
      $4("#readerStage").innerHTML = `<p class="muted" style="padding:2rem">\u26A0 ${esc(e.message || String(e))}</p>`;
    }
    markReading();
  }
  function markReading() {
    if (R.book.shelf === "want") updateBook(R.book.id, { shelf: "reading" });
  }
  async function openEpub(blob, book) {
    const buf = await blob.arrayBuffer();
    const epub = ePub(buf);
    R.epub = epub;
    const s = getState().settings;
    const stage = $4("#readerStage");
    stage.innerHTML = "";
    const rendition = epub.renderTo(stage, { width: "100%", height: "100%", flow: s.flow === "scrolled" ? "scrolled-doc" : "paginated", spread: "none", allowScriptedContent: false, ignoreClass: "qari-img" });
    R.rendition = rendition;
    const wireContents = (c) => {
      try {
        const d = c.document;
        if (!d || d.__qariWired) return;
        d.__qariWired = 1;
        try {
          const st = d.createElement("style");
          st.textContent = fontFaceCSS();
          d.head.appendChild(st);
        } catch (e) {
          console.warn("font inject failed", e);
        }
        placeEpubImages(c);
        d.addEventListener("mousedown", () => window.__qariCloseFloating && window.__qariCloseFloating({}));
        d.addEventListener("touchstart", () => window.__qariCloseFloating && window.__qariCloseFloating({}), { passive: true });
        d.addEventListener("click", (ev) => {
          if (!R) return;
          if (Date.now() - (R.selAt || 0) < 500) return;
          const tg = ev.target;
          if (tg && tg.closest && tg.closest("a,button,input,img,figure")) return;
          const sel = d.getSelection && d.getSelection();
          if (sel && sel.toString().trim()) {
            sel.removeAllRanges();
            hideSelPop();
          }
          toggleReaderChrome();
        });
      } catch {
      }
    };
    rendition.hooks.content.register(wireContents);
    await epub.ready;
    await epub.loaded.navigation.catch(() => {
    });
    await rendition.display(book.location || void 0);
    applyEpubTheme();
    rendition.on("rendered", () => {
      applyEpubTheme();
      try {
        R.rendition.getContents().forEach(wireContents);
      } catch {
      }
    });
    const genLocations = () => epub.locations.generate(1200).then(() => {
      if (R && R.epub === epub) {
        R.locationsReady = true;
        updateProgress();
      }
    }).catch(() => {
    });
    if ("requestIdleCallback" in window) requestIdleCallback(genLocations, { timeout: 9e3 });
    else setTimeout(genLocations, 2500);
    updateProgress();
    rendition.on("relocated", () => {
      R.pagesTurned++;
      savePosition();
      updateProgress();
      if (R.ttsActive) speakCurrent();
    });
    rendition.on("selected", (cfiRange, contents) => {
      const range = epub.getRange(cfiRange);
      const text = range ? range.toString().trim() : "";
      if (!text) return;
      R.selAt = Date.now();
      showSelPop(contents, text, (action, color) => {
        if (action === "highlight") {
          const hl = addHighlight({ bookId: book.id, text: text.slice(0, 500), cfi: cfiRange, color });
          rendition.annotations.add("highlight", cfiRange, { id: hl.id }, null, "hl", { fill: color, "fill-opacity": "0.4" });
          contents.window.getSelection().removeAllRanges();
          hideSelPop();
        } else if (action === "note") {
          const note = prompt(t("addNote"));
          const hl = addHighlight({ bookId: book.id, text: text.slice(0, 500), cfi: cfiRange, note: note || "", color: "#7ec8ff" });
          rendition.annotations.add("highlight", cfiRange, { id: hl.id }, null, "hl", { fill: "#7ec8ff", "fill-opacity": "0.4" });
          contents.window.getSelection().removeAllRanges();
          hideSelPop();
        } else if (action === "define") {
          lookupWord(text);
        }
      });
    });
    rendition.on("rendered", () => {
      bookHighlights(book.id).forEach((h) => {
        if (h.cfi) try {
          rendition.annotations.add("highlight", h.cfi, { id: h.id }, null, "hl", { fill: h.color, "fill-opacity": "0.4" });
        } catch {
        }
      });
    });
  }
  function applyEpubTheme() {
    if (!R || !R.rendition) return;
    const s = getState().settings;
    const cs = getComputedStyle(document.body);
    const theme = {
      body: {
        color: cs.getPropertyValue("--text") + "!important",
        background: cs.getPropertyValue("--bg") + "!important",
        "font-size": s.fontSize + "px !important",
        "line-height": s.lineHeight + " !important",
        "font-family": fontStack(s.fontFamily) + " !important",
        padding: layoutMode() === "phone" ? "0 4px" : layoutMode() === "tablet" ? "0 16px" : "0 8px"
      },
      p: { "margin-bottom": "0.7em" },
      img: { "max-width": "100%" }
    };
    try {
      R.rendition.themes.register("qari", theme);
      R.rendition.themes.select("qari");
    } catch (e) {
    }
  }
  async function openPdf(blob, book) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "js/vendor/pdf.worker.min.js";
    const buf = await blob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    R.pdf = pdf;
    R.pdfPage = book.currentPage > 0 ? Math.min(book.currentPage, pdf.numPages) : 1;
    updateBook(book.id, { totalPages: pdf.numPages });
    await renderPdfPage();
  }
  async function renderPdfPage() {
    const stage = $4("#readerStage");
    const page = await R.pdf.getPage(R.pdfPage);
    const containerW = stage.clientWidth - 40;
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1.8, containerW / base.width);
    const vp = page.getViewport({ scale: Math.max(0.8, scale) });
    stage.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page";
    canvas.width = vp.width;
    canvas.height = vp.height;
    stage.appendChild(canvas);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
    R.pagesTurned++;
    savePosition();
    updateProgress();
  }
  function openTxt(text, book) {
    const chunks = [];
    const CH = 3200;
    let i = 0;
    while (i < text.length) {
      let end = Math.min(i + CH, text.length);
      if (end < text.length) {
        const nl = text.lastIndexOf("\n", end);
        if (nl > i + CH / 2) end = nl;
      }
      chunks.push(text.slice(i, end));
      i = end;
    }
    R.txtPages = chunks;
    R.txtIdx = Math.min(book.currentPage || 0, chunks.length - 1);
    updateBook(book.id, { totalPages: chunks.length });
    renderTxtPage();
  }
  function renderTxtPage() {
    const stage = $4("#readerStage");
    const s = getState().settings;
    const isAr = /[؀-ۿ]/.test(R.txtPages[R.txtIdx].slice(0, 200));
    stage.innerHTML = "";
    const div = document.createElement("div");
    div.className = "txt-page";
    div.dir = isAr ? "rtl" : "ltr";
    div.style.setProperty("--rfs", s.fontSize + "px");
    if (s.fontFamily && s.fontFamily !== "auto") div.style.fontFamily = fontStack(s.fontFamily);
    div.style.setProperty("--rlh", s.lineHeight);
    const pageText = R.txtPages[R.txtIdx];
    const pimgs = bookImages(R.book.id).filter((i) => i.page === R.txtIdx + 1 && i.fileKey).sort((a, b) => (a.at || 0) - (b.at || 0));
    let pos = 0;
    const seg = (from, to) => {
      const sp = document.createElement("span");
      sp.className = "seg";
      sp.dataset.off = from;
      sp.textContent = pageText.slice(from, to);
      div.appendChild(sp);
    };
    pimgs.forEach((im) => {
      const at = Math.min(pageText.length, Math.max(pos, im.at == null ? pageText.length : im.at));
      seg(pos, at);
      pos = at;
      const fig = document.createElement("figure");
      fig.className = "qari-img";
      fig.dataset.id = im.id;
      fig.innerHTML = '<img alt=""><figcaption></figcaption>';
      fig.querySelector("figcaption").textContent = im.caption || "";
      if (im.scale && im.scale < 100) fig.querySelector("img").style.width = im.scale + "%";
      imgDataUrl(im).then((u) => {
        if (u) fig.querySelector("img").src = u;
      });
      div.appendChild(fig);
    });
    seg(pos, pageText.length);
    stage.appendChild(div);
    div.addEventListener("mouseup", maybeShowTxtSel);
    R.pagesTurned++;
    savePosition();
    updateProgress();
  }
  function renderWebRef(book) {
    const stage = $4("#readerStage");
    stage.innerHTML = `<div class="txt-page" style="text-align:center">
    <div class="cover" style="max-width:200px;margin:0 auto 1rem;border-radius:10px;overflow:hidden">${coverHTML(book)}</div>
    <h2>${esc(book.title)}</h2><p class="muted">${esc(book.author)}</p>
    <p style="margin-top:1rem">${t("sampleNote")}</p>
    <p style="margin-top:.6rem"><a href="https://openlibrary.org/search?q=${encodeURIComponent(book.title)}" target="_blank" rel="noopener" style="color:var(--accent)">${t("readOnline")} \u2197</a></p>
  </div>`;
    $4("#readerProgressLabel").textContent = "";
    $4("#readerProgressFill").style.width = "0%";
  }
  function next() {
    if (!R) return;
    if (R.rendition) R.rendition.next();
    else if (R.pdf && R.pdfPage < R.pdf.numPages) {
      R.pdfPage++;
      renderPdfPage();
    } else if (R.txtPages && R.txtIdx < R.txtPages.length - 1) {
      R.txtIdx++;
      renderTxtPage();
    }
  }
  function prev() {
    if (!R) return;
    if (R.rendition) R.rendition.prev();
    else if (R.pdf && R.pdfPage > 1) {
      R.pdfPage--;
      renderPdfPage();
    } else if (R.txtPages && R.txtIdx > 0) {
      R.txtIdx--;
      renderTxtPage();
    }
  }
  function savePosition() {
    const patch = {};
    if (R.rendition) {
      const loc = R.rendition.currentLocation();
      if (loc && loc.start) {
        patch.location = loc.start.cfi;
        if (R.locationsReady && loc.start.percentage != null) patch.progress = Math.round(loc.start.percentage * 100);
        else patch.progress = R.book.progress;
      }
    } else if (R.pdf) {
      patch.currentPage = R.pdfPage;
      patch.progress = Math.round(R.pdfPage / R.pdf.numPages * 100);
      patch.location = String(R.pdfPage);
    } else if (R.txtPages) {
      patch.currentPage = R.txtIdx;
      patch.progress = Math.round((R.txtIdx + 1) / R.txtPages.length * 100);
      patch.location = String(R.txtIdx);
    } else return;
    Object.assign(R.book, patch);
    updateBook(R.book.id, patch);
  }
  function updateProgress() {
    if (!R) return;
    let label = "", pct = 0;
    if (R.rendition) {
      const loc = R.rendition.currentLocation();
      if (loc && loc.start) {
        pct = Math.round((loc.start.percentage || 0) * 100);
        label = pct + "%";
        if (R.locationsReady) {
          try {
            const n = R.epub.locations.locationFromCfi(loc.start.cfi);
            label = `${n + 1} / ${R.epub.locations.total} \xB7 ${pct}%`;
          } catch {
          }
        }
      }
    } else if (R.pdf) {
      pct = Math.round(R.pdfPage / R.pdf.numPages * 100);
      label = `${t("pageN").replace("{n}", R.pdfPage)} ${t("of")} ${R.pdf.numPages} \xB7 ${pct}%`;
    } else if (R.txtPages) {
      pct = Math.round((R.txtIdx + 1) / R.txtPages.length * 100);
      label = `${R.txtIdx + 1} / ${R.txtPages.length} \xB7 ${pct}%`;
    }
    if (!sliderDrag) {
      $4("#readerProgressLabel").textContent = label;
      const sl = $4("#pageSlider");
      if (sl) sl.value = R.pdf ? R.pdf.numPages > 1 ? Math.round((R.pdfPage - 1) / (R.pdf.numPages - 1) * 1e3) : 0 : R.txtPages ? R.txtPages.length > 1 ? Math.round(R.txtIdx / (R.txtPages.length - 1) * 1e3) : 0 : pct * 10;
    }
    $4("#readerProgressFill").style.width = pct + "%";
  }
  function showSelPop(contents, text, onAction) {
    const pop = $4("#selPop");
    if (!pop) return;
    pop.innerHTML = "";
    HL_COLORS.forEach((c, i) => {
      const d = document.createElement("div");
      d.className = "hl-dot" + (i === 0 ? " sel" : "");
      d.style.background = c;
      d.title = t("highlight");
      d.onclick = () => onAction("highlight", c);
      pop.appendChild(d);
    });
    const noteB = document.createElement("button");
    noteB.className = "icon-btn";
    noteB.textContent = "\u{1F4DD}";
    noteB.title = t("note");
    noteB.onclick = () => onAction("note");
    const defB = document.createElement("button");
    defB.className = "icon-btn";
    defB.textContent = "\u{1F4D6}";
    defB.title = t("define");
    defB.onclick = () => onAction("define");
    pop.append(noteB, defB);
    pop.classList.remove("hidden");
    pop.style.position = "fixed";
    let rect = null;
    try {
      if (contents) {
        const r = contents.window.getSelection().getRangeAt(0).getBoundingClientRect();
        const frame = $4("#readerStage iframe");
        const fr = frame ? frame.getBoundingClientRect() : { top: 0, left: 0 };
        rect = { top: fr.top + r.top, bottom: fr.top + r.bottom, left: fr.left + r.left, right: fr.left + r.right };
      } else rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
    } catch {
    }
    if (rect) {
      let top = rect.bottom + 8, left = rect.left;
      top = Math.max(60, Math.min(top, window.innerHeight - 60));
      left = Math.max(10, Math.min(left, window.innerWidth - 230));
      pop.style.top = top + "px";
      pop.style.left = left + "px";
      pop.style.transform = "";
    } else {
      pop.style.top = "70px";
      pop.style.left = "50%";
      pop.style.transform = "translateX(-50%)";
    }
  }
  function hideSelPop() {
    const p = $4("#selPop");
    if (p) p.classList.add("hidden");
  }
  function maybeShowTxtSel() {
    if (!R || !R.txtPages) return;
    const sel = window.getSelection();
    const txt = sel ? sel.toString().trim() : "";
    if (!txt) return;
    const st = $4("#readerStage");
    if (!st || !sel.anchorNode || !st.contains(sel.anchorNode)) return;
    if (Date.now() - (R.selAt || 0) < 600) return;
    R.selAt = Date.now();
    showSelPop(null, txt, (action, color) => {
      if (action === "highlight" || action === "note") {
        const note = action === "note" ? prompt(t("addNote")) || "" : "";
        addHighlight({ bookId: R.book.id, text: txt.slice(0, 500), page: R.txtIdx + 1, note, color: action === "note" ? "#7ec8ff" : color });
        if (sel && sel.removeAllRanges) sel.removeAllRanges();
        hideSelPop();
        toast(t("added"));
      } else if (action === "define") lookupWord(txt);
    });
  }
  async function lookupWord(text) {
    hideSelPop();
    const word = text.split(/\s+/)[0].replace(/[^\p{L}\p{N}''-]/gu, "");
    if (!word) return;
    const panel = $4("#readerPanel");
    panel.classList.remove("hidden");
    panel.innerHTML = `<h3>\u{1F4D6} ${esc(word)}</h3><p class="muted">${t("dictLoading")}</p>`;
    const isLatin = /^[a-zA-Z'-]+$/.test(word);
    let html = "";
    if (isLatin) {
      try {
        const res = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(word));
        if (res.ok) {
          const data = await res.json();
          const entry = data[0];
          html = (entry.meanings || []).slice(0, 3).map((m) => `<p><strong style="color:var(--accent)">${esc(m.partOfSpeech)}</strong><br>${(m.definitions || []).slice(0, 2).map((d) => "\u2022 " + esc(d.definition)).join("<br>")}</p>`).join("");
        }
      } catch {
      }
    }
    if (!html) html = `<p class="muted">${t("dictNone")}</p>`;
    const trUrl = isLatin ? "https://translate.google.com/?sl=en&tl=ar&text=" + encodeURIComponent(word) : "https://translate.google.com/?sl=auto&tl=en&text=" + encodeURIComponent(word);
    panel.innerHTML = `<h3>\u{1F4D6} ${esc(word)}</h3>${html}
    <p style="margin-top:.6rem"><a href="${trUrl}" target="_blank" rel="noopener" style="color:var(--accent)">${t("translate")} \u2197</a></p>`;
  }
  function currentText() {
    if (R.rendition) {
      try {
        return (R.rendition.getContents()[0].document.body.innerText || "").slice(0, 2200);
      } catch {
        return "";
      }
    }
    if (R.txtPages) return R.txtPages[R.txtIdx].slice(0, 2200);
    return "";
  }
  function bookLangOf() {
    const fromPage = detectLang((currentText() || "").slice(0, 1200));
    if (fromPage) return fromPage;
    const meta2 = R && R.epub && R.epub.packaging && R.epub.packaging.metadata && String(R.epub.packaging.metadata.language || "").toLowerCase();
    if (meta2) {
      if (/^ar\b/.test(meta2)) return "ar";
      if (/^en\b/.test(meta2)) return "en";
    }
    const fromTitle = detectLang(`${R && R.book && R.book.title || ""} ${R && R.book && R.book.author || ""}`);
    if (fromTitle) return fromTitle;
    return getState().settings.lang === "en" ? "en" : "ar";
  }
  function savedVoiceFor(lang2) {
    const s = getState().settings;
    return (s.ttsVoices || {})[lang2] || s.ttsVoice || "";
  }
  async function speakCurrent() {
    if (!R || !R.ttsActive) return;
    let text = currentText();
    if (R.pdf) {
      try {
        const page = await R.pdf.getPage(R.pdfPage);
        const tc = await page.getTextContent();
        text = tc.items.map((i) => i.str).join(" ").slice(0, 2200);
      } catch {
      }
    }
    text = (text || "").trim();
    if (!text) {
      R.ttsActive = false;
      const b = $4("#ttsBtn");
      if (b) b.style.color = "";
      return;
    }
    if (!R || !R.ttsActive) return;
    const s = getState().settings;
    const lang2 = bookLangOf();
    if (!voices().length) await waitVoices(1200);
    const v = pickVoice(lang2, savedVoiceFor(lang2));
    const u = new SpeechSynthesisUtterance(text);
    u.rate = s.ttsRate || 1;
    try {
      if (v) u.voice = v;
    } catch (e) {
      console.warn("tts voice rejected, using language default", e);
    }
    u.lang = v && v.lang || (lang2 === "ar" ? "ar-EG" : "en-US");
    u.onend = () => {
      if (R && R.ttsActive) next();
    };
    u.onerror = () => {
      if (R) R.ttsActive = false;
      const b = $4("#ttsBtn");
      if (b) b.style.color = "";
    };
    try {
      speechSynthesis.speak(u);
    } catch (e) {
      console.warn("tts failed", e);
      if (R) R.ttsActive = false;
    }
  }
  function toggleTts() {
    if (!R) return;
    if (R.ttsActive) {
      R.ttsActive = false;
      speechSynthesis.cancel();
      $4("#ttsBtn").style.color = "";
      toast(t("stop"));
    } else {
      R.ttsActive = true;
      $4("#ttsBtn").style.color = "var(--accent)";
      toast(t("listening"));
      speakCurrent();
    }
  }
  var chromeBound = false;
  function bindChrome() {
    if (chromeBound) return;
    chromeBound = true;
    const closeFloating = (e) => {
      const pn = $4("#readerPanel"), sp = $4("#selPop");
      if (pn && !pn.classList.contains("hidden") && !(e && e.target && e.target.closest && e.target.closest("#readerPanel,#readerSettingsBtn,#hlListBtn,#tocBtn,#imgBtn"))) pn.classList.add("hidden");
      if (sp && !sp.classList.contains("hidden") && !(e && e.target && e.target.closest && e.target.closest("#selPop"))) sp.classList.add("hidden");
    };
    document.addEventListener("pointerdown", closeFloating, true);
    window.__qariCloseFloating = closeFloating;
    document.addEventListener("selectionchange", () => {
      if (R && R.txtPages) maybeShowTxtSel();
    });
    $4("#prevZone").onclick = prev;
    $4("#nextZone").onclick = next;
    document.addEventListener("keydown", (e) => {
      if (!R || $4("#readerOverlay").classList.contains("hidden")) return;
      if (e.key === "ArrowLeft") document.documentElement.dir === "rtl" ? next() : prev();
      if (e.key === "ArrowRight") document.documentElement.dir === "rtl" ? prev() : next();
      if (e.key === "Escape") closeReader();
    });
    $4("#readerClose").onclick = closeReader;
    $4("#ttsBtn").onclick = toggleTts;
    $4("#tocBtn").onclick = () => {
      const p = $4("#readerPanel");
      if (!p.classList.contains("hidden") && p.dataset.kind === "toc") {
        p.classList.add("hidden");
        return;
      }
      showTocPanel();
    };
    $4("#imgBtn").onclick = () => {
      const p = $4("#readerPanel");
      if (!p.classList.contains("hidden") && p.dataset.kind === "img") {
        p.classList.add("hidden");
        return;
      }
      p._pos = null;
      showImagePanel();
    };
    window.addEventListener("resize", () => {
      if (R && !$4("#readerOverlay").classList.contains("hidden")) applyLayout(true);
    });
    $4("#readerSettingsBtn").onclick = () => {
      const p = $4("#readerPanel");
      if (!p.classList.contains("hidden") && p.dataset.kind === "settings") {
        p.classList.add("hidden");
        return;
      }
      showSettingsPanel();
      p.dataset.kind = "settings";
    };
    $4("#hlListBtn").onclick = () => {
      const p = $4("#readerPanel");
      if (!p.classList.contains("hidden") && p.dataset.kind === "hl") {
        p.classList.add("hidden");
        return;
      }
      showHighlightsPanel();
      p.dataset.kind = "hl";
    };
    $4("#readerStage").addEventListener("click", (ev) => {
      if (!R || $4("#readerOverlay").classList.contains("hidden")) return;
      if (Date.now() - (R.selAt || 0) < 500) return;
      const t2 = ev.target;
      if (t2 && t2.closest && t2.closest("a,button,input,textarea,select,#readerPanel,#selPop")) return;
      const sel = window.getSelection && window.getSelection();
      if (sel && sel.toString().trim()) {
        sel.removeAllRanges();
        hideSelPop();
      }
      toggleReaderChrome();
    });
  }
  function toggleReaderChrome() {
    const ov = $4("#readerOverlay");
    if (!ov) return;
    ov.classList.toggle("chrome-hidden");
  }
  function showSettingsPanel() {
    const s = getState().settings;
    const panel = $4("#readerPanel");
    panel.classList.remove("hidden");
    if (panel._voiceOff) {
      panel._voiceOff();
      panel._voiceOff = null;
    }
    panel.innerHTML = `<h3>\u2699 ${t("settings")}</h3>
    <div class="set-row"><span>${t("theme")}</span><div class="seg">
      <button data-th="light" class="${s.theme === "light" ? "active" : ""}">${t("themeLight")}</button>
      <button data-th="sepia" class="${s.theme === "sepia" ? "active" : ""}">${t("themeSepia")}</button>
      <button data-th="dark" class="${s.theme === "dark" ? "active" : ""}">${t("themeDark")}</button>
      <button data-th="black" class="${s.theme === "black" ? "active" : ""}">${t("themeBlack")}</button></div></div>
    <div style="margin-bottom:.6rem"><div style="font-size:.9rem;margin-bottom:.3rem">${t("fontFamily")}</div><div id="rFontHost"></div></div>
    <div class="set-row"><span>${t("fontSize")}</span><input type="range" id="rFs" min="15" max="28" value="${s.fontSize}"><span id="rFsV">${s.fontSize}</span></div>
    <div class="set-row"><span>${t("lineHeight")}</span><input type="range" id="rLh" min="14" max="26" value="${Math.round(s.lineHeight * 10)}"></div>
    <div class="set-row"><span>${t("readingMode")}</span><div class="seg">
      <button data-flow="paginated" class="${s.flow === "paginated" ? "active" : ""}">${t("paginated")}</button>
      <button data-flow="scrolled" class="${s.flow === "scrolled" ? "active" : ""}">${t("scrolled")}</button></div></div>
    <div class="set-row" style="align-items:flex-start;flex-direction:column;gap:.25rem"><span>${t("ttsVoice")} <span class="muted" id="rVoiceLang"></span></span>
      <div style="display:flex;gap:.4rem;align-items:center;width:100%">
        <select id="rVoice" style="flex:1;min-width:0"></select>
        <button class="btn" id="rVoiceTest">\u25B6 ${t("ttsTest")}</button>
      </div>
      <div class="muted" id="rVoiceHint" style="font-size:.78rem"></div></div>
    <div class="set-row"><span>${t("ttsSpeed")}</span><input type="range" id="rRate" min="5" max="20" value="${Math.round((s.ttsRate || 1) * 10)}"><span id="rRateV">${s.ttsRate || 1}x</span></div>`;
    const upd = (patch) => {
      Object.assign(getState().settings, patch);
      save();
    };
    panel.querySelector("#rFontHost").appendChild(fontPicker(s.fontFamily, (id) => {
      upd({ fontFamily: id });
      if (R && R.rendition) applyEpubTheme();
      if (R && R.txtPages) renderTxtPage();
    }));
    panel.querySelectorAll("[data-th]").forEach((b) => b.onclick = () => {
      upd({ theme: b.dataset.th });
      document.body.dataset.theme = b.dataset.th;
      panel.querySelectorAll("[data-th]").forEach((x) => x.classList.toggle("active", x === b));
      if (R && R.rendition) applyEpubTheme();
      if (R && R.txtPages) renderTxtPage();
    });
    panel.querySelectorAll("[data-flow]").forEach((b) => b.onclick = () => {
      upd({ flow: b.dataset.flow });
      if (R && R.rendition) {
        const bk = R.book;
        closeReader(false);
        openReader(bk);
      }
    });
    panel.querySelector("#rFs").oninput = (e) => {
      upd({ fontSize: +e.target.value });
      panel.querySelector("#rFsV").textContent = e.target.value;
      if (R && R.rendition) applyEpubTheme();
      if (R && R.txtPages) renderTxtPage();
    };
    panel.querySelector("#rLh").oninput = (e) => {
      upd({ lineHeight: +e.target.value / 10 });
      if (R && R.rendition) applyEpubTheme();
      if (R && R.txtPages) renderTxtPage();
    };
    panel.querySelector("#rRate").oninput = (e) => {
      upd({ ttsRate: +e.target.value / 10 });
      panel.querySelector("#rRateV").textContent = +e.target.value / 10 + "x";
    };
    bindVoicePicker(panel);
  }
  function shortVoiceName(v) {
    if (!v) return "";
    return String(v.name || v.voiceURI || "").replace(/\s+[-–]\s+[^-–]*\([^)]*\)\s*$/, "").replace(/^Microsoft\s+/i, "").trim();
  }
  function bindVoicePicker(panel) {
    const sel = panel.querySelector("#rVoice"), hint = panel.querySelector("#rVoiceHint"), langEl = panel.querySelector("#rVoiceLang");
    if (!sel) return;
    const stopSpeaking = () => {
      if (R && R.ttsActive) {
        R.ttsActive = false;
        try {
          speechSynthesis.cancel();
        } catch {
        }
        const b = $4("#ttsBtn");
        if (b) b.style.color = "";
      }
    };
    const fill = () => {
      const L = bookLangOf();
      const list = voices();
      const saved = (getState().settings.ttsVoices || {})[L] || "";
      const auto = pickVoice(L, saved);
      if (langEl) langEl.textContent = "\xB7 " + (L === "ar" ? t("ttsLangAr") : t("ttsLangEn"));
      const groups = /* @__PURE__ */ new Map();
      list.forEach((v) => {
        const k = baseLang(v.lang) || "?";
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(v);
      });
      const keys = [...groups.keys()].sort((a, b) => a === L ? -1 : b === L ? 1 : a.localeCompare(b));
      let html = `<option value="">${esc(t("ttsAutoVoice"))}${auto ? " \u2014 " + esc(shortVoiceName(auto)) : ""}</option>`;
      keys.forEach((k) => {
        const arr = groups.get(k).slice().sort((a, b) => (isNatural(b) ? 1 : 0) - (isNatural(a) ? 1 : 0) || a.name.localeCompare(b.name));
        html += `<optgroup label="${esc((k === L ? "\u2605 " : "") + langLabel(k))}">` + arr.map((v) => `<option value="${esc(v.voiceURI)}" title="${esc(v.name + " \u2014 " + v.lang)}"${saved === v.voiceURI ? " selected" : ""}>${esc(shortVoiceName(v))}${isNatural(v) ? " \u2605" : ""}</option>`).join("") + "</optgroup>";
      });
      sel.innerHTML = html;
      sel.value = saved && list.some((v) => v.voiceURI === saved) ? saved : "";
      const used = saved ? list.find((v) => v.voiceURI === saved) : auto;
      if (hint) hint.textContent = !list.length ? t("ttsNoVoices") : isNatural(used) ? `${t("ttsNaturalOk")} \u2014 ${shortVoiceName(used)}` : t("ttsNaturalTip");
    };
    sel.onchange = () => {
      const L = bookLangOf(), uri = sel.value, st = getState().settings;
      st.ttsVoices = Object.assign({}, st.ttsVoices || {});
      if (uri) st.ttsVoices[L] = uri;
      else delete st.ttsVoices[L];
      save();
      fill();
      stopSpeaking();
      preview(uri ? voices().find((v) => v.voiceURI === uri) : pickVoice(L, ""), L, getState().settings.ttsRate || 1);
    };
    panel.querySelector("#rVoiceTest").onclick = () => {
      const L = bookLangOf(), uri = sel.value;
      stopSpeaking();
      preview(uri ? voices().find((v) => v.voiceURI === uri) : pickVoice(L, ""), L, getState().settings.ttsRate || 1);
    };
    fill();
    panel._voiceOff = onVoices(fill);
  }
  function showHighlightsPanel() {
    const panel = $4("#readerPanel");
    panel.classList.remove("hidden");
    const hls = bookHighlights(R.book.id);
    panel.innerHTML = `<h3>\u{1F58A} ${t("highlights")} (${hls.length})</h3>
    <button id="expHl" class="btn" style="margin-bottom:.7rem">\u2B07 ${t("exportHighlights")} (Markdown)</button>
    <div id="hlPanelList"></div>`;
    const list = panel.querySelector("#hlPanelList");
    list.innerHTML = hls.length ? "" : `<p class="muted">${t("noHighlights")}</p>`;
    hls.forEach((h) => {
      const row = document.createElement("div");
      row.className = "comment";
      row.innerHTML = `<div style="border-inline-start:3px solid ${esc(h.color)};padding-inline-start:.5rem">${esc(h.text)}${h.note ? `<div class="muted">\u{1F4DD} ${esc(h.note)}</div>` : ""}</div>
      <div style="margin-top:.3rem"><button class="icon-btn" style="font-size:.8rem" data-act="jump">\u21A9</button><button class="icon-btn" style="font-size:.8rem" data-act="del">\u{1F5D1}</button></div>`;
      row.querySelector("[data-act=jump]").onclick = () => {
        if (h.cfi && R.rendition) R.rendition.display(h.cfi);
        else if (h.page && R.txtPages) {
          R.txtIdx = h.page - 1;
          renderTxtPage();
        } else if (h.page && R.pdf) {
          R.pdfPage = h.page;
          renderPdfPage();
        }
      };
      row.querySelector("[data-act=del]").onclick = () => {
        removeHighlight(h.id);
        showHighlightsPanel();
      };
      list.appendChild(row);
    });
    panel.querySelector("#expHl").onclick = () => {
      const md = `# ${R.book.title} \u2014 ${R.book.author}

` + hls.map((h) => `> ${h.text}

${h.note ? h.note + "\n\n" : ""}\u2014 *${new Date(h.createdAt).toLocaleDateString()}*
`).join("\n---\n\n");
      const blob = new Blob([md], { type: "text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (R.book.title || "highlights") + "-highlights.md";
      a.click();
      toast(t("exported"));
    };
  }
  function closeReader(log = true) {
    if (!R) return;
    if (R.ttsActive) {
      R.ttsActive = false;
      speechSynthesis.cancel();
    }
    const pn = $4("#readerPanel");
    if (pn && pn._voiceOff) {
      pn._voiceOff();
      pn._voiceOff = null;
    }
    clearInterval(R.timer);
    const mins = (Date.now() - R.startedAt) / 6e4;
    if (log) logSession(R.book.id, mins, R.pagesTurned);
    savePosition();
    if (R.book.progress >= 99.5 && R.book.shelf !== "finished") updateBook(R.book.id, { shelf: "finished" });
    try {
      R.rendition && R.rendition.destroy();
    } catch {
    }
    try {
      R.epub && R.epub.destroy();
    } catch {
    }
    try {
      R.pdf && R.pdf.destroy();
    } catch {
    }
    R = null;
    $4("#readerStage").innerHTML = "";
    $4("#readerOverlay").classList.add("hidden");
    document.body.style.overflow = "";
  }

  // src/series.js
  var OL2 = "https://openlibrary.org";
  var WD = "https://query.wikidata.org/sparql";
  async function getJSON2(url, ms = 3e4) {
    const ctl = new AbortController();
    const timer2 = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally {
      clearTimeout(timer2);
    }
  }
  var normTitle = (s) => String(s || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/^(the|a|an)\s+/, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  var normName = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  var esc2 = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  var qid = (u) => (u || "").split("/").pop();
  async function sparql(q) {
    let d;
    try {
      d = await getJSON2(WD + "?format=json&query=" + encodeURIComponent(q));
    } catch (e) {
      if (!/429|503/.test(e.message)) throw e;
      await new Promise((r) => setTimeout(r, 6e3));
      d = await getJSON2(WD + "?format=json&query=" + encodeURIComponent(q));
    }
    return d.results && d.results.bindings || [];
  }
  var memo = /* @__PURE__ */ new Map();
  async function authorQid(name, olAuthorKey) {
    const k = "a:" + (olAuthorKey || name);
    if (memo.has(k)) return memo.get(k);
    const p = (async () => {
      if (olAuthorKey) {
        try {
          const a = await getJSON2(`${OL2}/authors/${String(olAuthorKey).replace("/authors/", "")}.json`, 9e3);
          const w = a.remote_ids && a.remote_ids.wikidata;
          if (w) return w;
        } catch {
        }
      }
      return "";
    })();
    memo.set(k, p);
    return p;
  }
  function parseOrd(v) {
    if (!v) return null;
    const m = String(v).match(/\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }
  async function seriesByAuthor({ name, olAuthorKey }) {
    const k = "s:" + normName(name);
    if (memo.has(k)) return memo.get(k);
    const ck = "qari.series." + normName(name);
    try {
      const c = JSON.parse(localStorage.getItem(ck) || "null");
      if (c && Date.now() - c.t < 7 * 864e5) {
        const r = Promise.resolve(c.v);
        memo.set(k, r);
        return r;
      }
    } catch {
    }
    const p = (async () => {
      const q = await authorQid(name, olAuthorKey);
      const who = q ? `VALUES ?au { wd:${q} }` : `?au rdfs:label "${esc2(name)}"@en. ?au wdt:P31 wd:Q5.`;
      const own = await sparql(`SELECT DISTINCT ?series WHERE { ${who} ?b0 wdt:P50 ?au; wdt:P179 ?series. } LIMIT 40`);
      const ids = own.map((r) => qid(r.series.value)).filter((x) => /^Q\d+$/.test(x));
      if (!ids.length) return [];
      const rows = await sparql(`SELECT ?series ?seriesLabel ?book ?bookLabel ?ord ?date ?authorLabel WHERE {
      VALUES ?series { ${ids.map((i) => "wd:" + i).join(" ")} }
      ?book p:P179 ?st. ?st ps:P179 ?series. OPTIONAL { ?st pq:P1545 ?ord } OPTIONAL { ?book wdt:P577 ?date } OPTIONAL { ?book wdt:P50 ?author }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ar". } }`);
      const by = /* @__PURE__ */ new Map();
      for (const r of rows) {
        const sid = qid(r.series.value);
        if (/^Q\d+$/.test(r.seriesLabel.value)) continue;
        const s = by.get(sid) || { id: sid, name: r.seriesLabel.value, books: /* @__PURE__ */ new Map() };
        const bid = qid(r.book.value);
        const cur = s.books.get(bid) || { id: bid, title: r.bookLabel.value, ord: null, year: "", author: "" };
        const o = parseOrd(r.ord && r.ord.value);
        if (o != null && cur.ord == null) cur.ord = o;
        if (r.date && !cur.year) cur.year = (r.date.value.match(/^-?\d{1,4}/) || [""])[0];
        if (r.authorLabel && !cur.author && !/^Q\d+$/.test(r.authorLabel.value)) cur.author = r.authorLabel.value;
        s.books.set(bid, cur);
        by.set(sid, s);
      }
      return [...by.values()].map((s) => {
        let books = [...s.books.values()].filter((b) => !/^Q\d+$/.test(b.title));
        const latin = (x) => /[A-Za-z]/.test(x);
        const nLatin = books.filter((b) => latin(b.title)).length, preferLatin = nLatin * 2 >= books.length;
        const seen = /* @__PURE__ */ new Map();
        for (const b of books) {
          if (b.ord == null) continue;
          const prev2 = seen.get(b.ord);
          if (!prev2 || latin(b.title) === preferLatin && latin(prev2.title) !== preferLatin) seen.set(b.ord, b);
        }
        books = books.filter((b) => b.ord == null || seen.get(b.ord) === b);
        const anyOrd = books.some((b) => b.ord != null);
        if (anyOrd) books = books.filter((b) => b.ord != null || !/\bseries\b|audiobook|omnibus|collection/i.test(b.title));
        books.sort((a, b) => anyOrd ? (a.ord ?? 1e9) - (b.ord ?? 1e9) || (a.year || 9999) - (b.year || 9999) : (a.year || 9999) - (b.year || 9999));
        return { id: s.id, name: s.name, books, ordered: anyOrd };
      }).filter((s) => s.books.length > 1 && s.books.length <= 30).filter((s) => {
        const lat = (x) => /[A-Za-z]/.test(x), authLat = lat(name);
        return s.books.filter((b) => lat(b.title) === authLat).length * 2 >= s.books.length;
      }).sort((a, b) => b.books.length - a.books.length);
    })();
    memo.set(k, p);
    p.then((v) => {
      try {
        localStorage.setItem(ck, JSON.stringify({ t: Date.now(), v }));
      } catch {
      }
    }, () => memo.delete(k));
    return p;
  }
  async function seriesForBook({ title, author, olAuthorKey }) {
    const list = await seriesByAuthor({ name: author, olAuthorKey });
    const t2 = normTitle(title);
    if (!t2) return null;
    const sub = (x) => normTitle(String(x).split(/[:\u2014]| - /)[0]);
    for (const eq of [(x) => normTitle(x) === t2, (x) => sub(x) === sub(title)]) {
      for (const s of list) {
        const i = s.books.findIndex((b) => eq(b.title));
        if (i >= 0) return { series: s, index: i, position: s.books[i].ord, total: s.books.length };
      }
    }
    return null;
  }

  // src/author.js
  var OL3 = "https://openlibrary.org";
  var $5 = (s, r = document) => r.querySelector(s);
  var TOKEN = 0;
  async function openBookByTitle(title, author) {
    toast(t("loading"));
    const f = await findCover(title, author).catch(() => null);
    if (f && f.olKey) location.hash = "#/work/" + f.olKey;
    else toast(tr("\u0645\u0634 \u0644\u0627\u0642\u064A \u0635\u0641\u062D\u0629 \u0644\u0644\u0643\u062A\u0627\u0628 \u062F\u0647 \u0641\u064A Open Library", "No Open Library page found for this book"), 3e3);
  }
  function seriesBoxHTML(s, current, author) {
    const cur = String(current || "").toLowerCase();
    return `<div class="series-card"><h3>\u{1F4DA} ${esc(s.name)} <small class="muted">\xB7 ${s.books.length} ${tr("\u0643\u062A\u0628", "books")}</small></h3>
    <ol class="series-list">${s.books.map((b, i) => `<li ${b.title.toLowerCase() === cur ? 'class="cur"' : ""}><a href="#" data-title="${esc(b.title)}" data-author="${esc(b.author || author || "")}"><span class="sn">${b.ord != null ? b.ord : i + 1}</span> ${esc(b.title)}${b.year ? ` <span class="muted">(${esc(b.year)})</span>` : ""}</a></li>`).join("")}</ol>
    <div class="muted" style="font-size:.75rem">${s.ordered ? tr("\u0627\u0644\u062A\u0631\u062A\u064A\u0628 \u062D\u0633\u0628 \u0631\u0642\u0645 \u0627\u0644\u0643\u062A\u0627\u0628 \u0641\u064A Wikidata.", "Order = book number recorded on Wikidata.") : tr("\u0645\u0641\u064A\u0634 \u062A\u0631\u0642\u064A\u0645 \u0645\u0633\u062C\u0651\u0644\u060C \u0641\u0627\u0644\u062A\u0631\u062A\u064A\u0628 \u062D\u0633\u0628 \u0633\u0646\u0629 \u0627\u0644\u0646\u0634\u0631.", "No book numbers recorded, so ordered by publication year.")}</div></div>`;
  }
  function bindSeriesLinks(root) {
    root.querySelectorAll(".series-list a").forEach((a) => a.onclick = (e) => {
      e.preventDefault();
      openBookByTitle(a.dataset.title, a.dataset.author);
    });
  }
  async function renderAuthorPage(view, rawName) {
    const name = decodeURIComponent(rawName || "").trim();
    const tok = ++TOKEN;
    view.innerHTML = `<div class="view-head"><button class="btn" id="auBack">\u2190 ${tr("\u0631\u062C\u0648\u0639", "Back")}</button><h1 dir="auto">${esc(name)}</h1></div>
    <div class="chart-box" id="auBio" hidden></div>
    <div id="auSeries"><p class="muted">${tr("\u0628\u062F\u0648\u0651\u0631 \u0639\u0644\u0649 \u0627\u0644\u0633\u0644\u0627\u0633\u0644\u2026", "Looking for series\u2026")}</p></div>
    <h2 class="bp-h2">${tr("\u0643\u0644 \u0627\u0644\u0643\u062A\u0628", "All books")}</h2>
    <div class="grid" id="auGrid"><p class="muted">${t("loading")}</p></div><div id="auMore"></div>`;
    $5("#auBack", view).onclick = () => history.length > 1 ? history.back() : location.hash = "#/discover";
    const key = await resolveAuthorKey(name);
    if (tok !== TOKEN) return;
    if (key) fetch(`${OL3}/authors/${String(key).replace("/authors/", "")}.json`).then((r) => r.json()).then((a) => {
      if (tok !== TOKEN) return;
      const bio = typeof a.bio === "string" ? a.bio : a.bio && a.bio.value || "";
      const photo = a.photos && a.photos[0] > 0 ? `https://covers.openlibrary.org/a/id/${a.photos[0]}-M.jpg` : "";
      if (!bio && !photo) return;
      const box = $5("#auBio", view);
      box.hidden = false;
      box.innerHTML = `<div class="bp-author">${photo ? `<img src="${esc(photo)}" alt="">` : ""}<div><strong>${esc(a.name || name)}</strong><div class="muted">${esc([a.birth_date, a.death_date].filter(Boolean).join(" \u2013 "))}</div></div></div>${bio ? `<p class="bp-bio" dir="auto">${esc(bio.split("\n")[0].slice(0, 700))}</p>` : ""}`;
    }).catch(() => {
    });
    seriesByAuthor({ name: firstAuthorName(name), olAuthorKey: key }).then((list) => {
      if (tok !== TOKEN) return;
      const host = $5("#auSeries", view);
      host.innerHTML = list.length ? `<h2 class="bp-h2">${tr("\u0627\u0644\u0633\u0644\u0627\u0633\u0644", "Series")}</h2>` + list.map((s) => seriesBoxHTML(s, "", name)).join("") + `<p class="muted" style="font-size:.75rem">${tr("\u0627\u0644\u0645\u0635\u062F\u0631: Wikidata. \u0627\u0644\u062A\u063A\u0637\u064A\u0629 \u0645\u0634 \u0643\u0627\u0645\u0644\u0629\u060C \u062E\u0635\u0648\u0635\u064B\u0627 \u0644\u0644\u0643\u062A\u0628 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0648\u0627\u0644\u0623\u0642\u0644 \u0634\u0647\u0631\u0629.", "Source: Wikidata. Coverage is partial, especially for Arabic and lesser-known books.")}</p>` : `<p class="muted">${tr("\u0645\u0641\u064A\u0634 \u0628\u064A\u0627\u0646\u0627\u062A \u0633\u0644\u0627\u0633\u0644 \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0624\u0644\u0641 \u0641\u064A Wikidata (\u0645\u0645\u0643\u0646 \u064A\u0643\u0648\u0646 \u0639\u0646\u062F\u0647 \u0633\u0644\u0633\u0644\u0629 \u0628\u0633 \u0645\u0634 \u0645\u062A\u0633\u062C\u0644\u0629).", "No series data for this author on Wikidata (a series may exist but not be recorded there).")}</p>`;
      bindSeriesLinks(host);
    }).catch(() => {
      const host = $5("#auSeries", view);
      if (host) host.innerHTML = `<p class="muted">${tr("\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0633\u0644\u0627\u0633\u0644 (\u0627\u0644\u0646\u062A \u0623\u0648 Wikidata \u0645\u0634 \u0645\u062A\u0627\u062D \u062F\u0644\u0648\u0642\u062A\u064A).", "Could not load series (offline, or Wikidata is busy right now).")}</p>`;
    });
    const grid = $5("#auGrid", view), more = $5("#auMore", view);
    let page = 0, busy2 = false;
    const seen = /* @__PURE__ */ new Set();
    const load2 = async () => {
      if (busy2) return;
      busy2 = true;
      try {
        const r = await worksByAuthor(name, page, 24, key);
        if (tok !== TOKEN) return;
        if (!page) grid.innerHTML = "";
        page++;
        r.items.forEach((it) => {
          const k = it.olKey || it.title;
          if (seen.has(k)) return;
          seen.add(k);
          const c = document.createElement("div");
          c.className = "book-card";
          c.innerHTML = `<div class="cover">${coverImgHTML(it)}</div><div class="book-meta"><div class="book-title">${esc(it.title)}</div><div class="book-author">${it.year ? esc(it.year) : ""}${it.rating ? " \xB7 \u2605 " + it.rating.toFixed(1) : ""}</div></div>`;
          c.onclick = () => it.olKey ? location.hash = "#/work/" + it.olKey : openBookByTitle(it.title, name);
          grid.appendChild(c);
        });
        if (!seen.size) grid.innerHTML = `<p class="muted">${t("noResults")}</p>`;
        more.innerHTML = r.more ? `<button class="btn" style="margin:1rem auto;display:block">${tr("\u0639\u0631\u0636 \u0627\u0644\u0645\u0632\u064A\u062F", "Load more")}</button>` : "";
        const b = more.querySelector("button");
        if (b) b.onclick = load2;
      } catch (e) {
        if (!page) grid.innerHTML = `<p class="muted">\u26A0 ${esc(e.message)}</p>`;
      }
      busy2 = false;
    };
    load2();
  }

  // src/bookpage.js
  var $6 = (s, r = document) => r.querySelector(s);
  var nf = (n) => (n || 0).toLocaleString(getLang() === "ar" ? "ar-EG" : "en-US");
  var TOKEN2 = 0;
  function basicMeta(b) {
    return { olKey: b.olKey || "", title: b.title, author: b.author, cover: b.cover, subjects: b.subjects || [], isbn: b.isbn, pages: b.totalPages || 0, basic: true };
  }
  function ensureLib(meta2) {
    const subj = cleanSubjects(meta2.subjects);
    return addBook({
      title: meta2.title || "?",
      author: meta2.author || "",
      format: "web",
      cover: meta2.cover || "",
      source: "openlibrary",
      subjects: subj,
      isbn: meta2.isbn || "",
      olKey: meta2.olKey || "",
      year: meta2.year || "",
      shelf: "want",
      totalPages: meta2.pages || 0
    });
  }
  async function renderBookPage(view, arg2, kind2) {
    let lib = null, olKey = "";
    if (kind2 === "book") {
      lib = getBook(arg2);
      if (!lib) {
        view.innerHTML = `<p class="muted">?</p>`;
        return;
      }
      olKey = lib.olKey || "";
    } else {
      olKey = arg2;
      lib = findBookByOl(arg2);
      if (lib) {
        location.replace("#/book/" + lib.id);
        return;
      }
    }
    const tok = ++TOKEN2;
    let meta2 = olKey && getMeta(olKey) || null;
    if (meta2) {
      draw(view, lib, meta2, tok);
      return;
    }
    draw(view, lib, lib ? basicMeta(lib) : { olKey, title: "\u2026", author: "", subjects: [], basic: true }, tok, true);
    const fresh = await loadMeta(lib ? { olKey, title: lib.title, author: lib.author, isbn: lib.isbn, cover: lib.cover } : { olKey });
    if (tok !== TOKEN2) return;
    if (lib && fresh.olKey) {
      const patch = {};
      if (!lib.olKey) patch.olKey = fresh.olKey;
      if (!lib.cover && fresh.cover) patch.cover = fresh.cover;
      if (!(lib.subjects || []).length) patch.subjects = cleanSubjects(fresh.subjects);
      if (!lib.isbn && fresh.isbn) patch.isbn = fresh.isbn;
      if (Object.keys(patch).length) updateBook(lib.id, patch);
    }
    draw(view, lib, fresh, tok);
  }
  function chip(text) {
    return `<span class="bp-chip">${esc(text)}</span>`;
  }
  function ratingBox(label, value, count, extra = "") {
    if (!value) return `<div class="bp-rate muted-box"><div class="bp-rate-l">${label}</div><div class="bp-rate-v">\u2014</div><div class="muted">${tr("\u0645\u0641\u064A\u0634 \u062A\u0642\u064A\u064A\u0645\u0627\u062A", "no ratings")}</div></div>`;
    return `<div class="bp-rate"><div class="bp-rate-l">${label}</div><div class="bp-rate-v">\u2605 ${value.toFixed(1)}<small>/5</small></div><div class="muted">${nf(count)} ${tr("\u062A\u0642\u064A\u064A\u0645", "ratings")}${extra}</div></div>`;
  }
  function draw(view, lib, meta2, tok, loading = false) {
    const title = lib && lib.title || meta2.title || "?";
    const author = lib && lib.author || meta2.author || "";
    const cover = lib && lib.cover || meta2.cover || "";
    const ol = meta2.olKey;
    const subjects = cleanSubjects(meta2.subjects && meta2.subjects.length ? meta2.subjects : lib ? lib.subjects : []).slice(0, 8);
    const gb = meta2.gb;
    const hls = lib ? bookHighlights(lib.id) : [];
    const comments = lib ? bookComments(lib.id) : [];
    const myLists = lib ? listsOfBook(lib.id) : [];
    const shelfOpts = lib ? [["want", t("shelf_want")], ["reading", t("shelf_reading")], ["finished", t("shelf_finished")], ...getState().customShelves.map((s) => [s, s])] : [];
    const details = [
      [tr("\u0627\u0644\u0639\u0646\u0648\u0627\u0646", "Title"), title],
      [tr("\u0627\u0644\u0645\u0624\u0644\u0641", "Author"), author],
      [tr("\u0623\u0648\u0644 \u0646\u0634\u0631", "First published"), meta2.year],
      [tr("\u0639\u062F\u062F \u0627\u0644\u0635\u0641\u062D\u0627\u062A", "Pages"), meta2.pages ? nf(meta2.pages) : ""],
      [tr("\u0639\u062F\u062F \u0627\u0644\u0625\u0635\u062F\u0627\u0631\u0627\u062A", "Editions"), meta2.editions ? nf(meta2.editions) : ""],
      [tr("\u0627\u0644\u0646\u0627\u0634\u0631", "Publisher"), meta2.publisher || gb && gb.publisher],
      [tr("\u0627\u0644\u0644\u063A\u0627\u062A", "Languages"), (meta2.languages || []).join(", ")],
      ["ISBN", meta2.isbn],
      [tr("\u0627\u0644\u0635\u064A\u063A\u0629", "Format"), lib && lib.format !== "web" ? lib.format.toUpperCase() : ""]
    ].filter((r) => r[1]);
    view.innerHTML = `
  <section class="bp-hero">
    <div class="bp-backdrop" style="${cover ? `background-image:url('${esc(cover)}')` : ""}"></div>
    <div class="bp-hero-inner">
      <div class="bp-poster"><div class="cover">${cover ? `<img src="${esc(cover)}" alt="">` : coverHTML({ title, format: lib ? lib.format : "web" })}</div></div>
      <div class="bp-info">
        <h1>${esc(title)} ${meta2.year ? `<span class="bp-year">(${esc(meta2.year)})</span>` : ""}</h1>
        <div class="bp-sub">${author ? `<a href="#/discover" id="bpAuthor" class="bp-alink" title="${tr("\u0643\u0644 \u0643\u062A\u0628 \u0627\u0644\u0645\u0624\u0644\u0641", "All books by this author")}">${esc(author)}</a>` : ""}${meta2.pages ? ` \xB7 ${nf(meta2.pages)} ${t("pages")}` : ""}${meta2.editions ? ` \xB7 ${nf(meta2.editions)} ${tr("\u0625\u0635\u062F\u0627\u0631", "editions")}` : ""}</div>
        <div class="bp-chips">${subjects.map(chip).join("")}${loading ? `<span class="muted">${t("loading")}</span>` : ""}</div>
        <div class="bp-ratings">
          ${ratingBox("Open Library", meta2.rating, meta2.ratingCount)}
          ${gb ? ratingBox("Google Books", gb.rating, gb.count) : ""}
          <div class="bp-rate bp-mine"><div class="bp-rate-l">${tr("\u062A\u0642\u064A\u064A\u0645\u0643", "Your rating")}</div><div id="ratingHost"></div><div class="muted">${tr("\u0627\u0636\u063A\u0637 \u0627\u0644\u0646\u062C\u0648\u0645", "tap the stars")}</div></div>
        </div>
        ${meta2.wantToRead || meta2.alreadyRead || meta2.currentlyReading ? `<div class="bp-community">\u{1F516} ${nf(meta2.wantToRead)} ${tr("\u0639\u0627\u064A\u0632\u064A\u0646 \u064A\u0642\u0631\u0648\u0647", "want to read")} \xB7 \u{1F4D6} ${nf(meta2.currentlyReading)} ${tr("\u0628\u064A\u0642\u0631\u0648\u0647", "reading")} \xB7 \u2705 ${nf(meta2.alreadyRead)} ${tr("\u0642\u0631\u0648\u0647", "have read")}</div>` : ""}
        <div class="bp-actions">
          ${lib ? `<button id="readBtn" class="btn btn-primary">\u25B6 ${t("startReading")}</button><button id="attachBtn" class="btn" title="${tr("\u0627\u062E\u062A\u0627\u0631 \u0645\u0644\u0641 \u0627\u0644\u0643\u062A\u0627\u0628 \u0645\u0646 \u062C\u0647\u0627\u0632\u0643", "Choose the book file from your device")}">\u{1F4CE} ${lib.fileKey ? tr("\u063A\u064A\u0651\u0631 \u0627\u0644\u0645\u0644\u0641", "Change file") : tr("\u0627\u0631\u0628\u0637 \u0645\u0644\u0641 \u0627\u0644\u0643\u062A\u0627\u0628", "Link book file")}</button>` : ""}
          ${!lib ? `<button id="addLibBtn" class="btn btn-primary">\uFF0B ${t("addToLibrary")}</button>` : ""}
          <button id="favBtn" class="btn ${lib && lib.favorite ? "btn-fav on" : "btn-fav"}">${lib && lib.favorite ? "\u2764" : "\u{1F90D}"} ${tr("\u0627\u0644\u0645\u0641\u0636\u0644\u0629", "Favorite")}</button>
          <button id="listsBtn" class="btn">\u{1F4CB} ${tr("\u0627\u0644\u0642\u0648\u0627\u0626\u0645", "Lists")}${myLists.length ? ` (${myLists.length})` : ""}</button>
          ${lib ? `<select id="shelfSel" title="${tr("\u0627\u0644\u0631\u0641", "Shelf")}">${shelfOpts.map(([v, l]) => `<option value="${esc(v)}" ${lib.shelf === v || (lib.customShelves || []).includes(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>` : ""}
          ${lib && lib.shelf !== "finished" ? `<button id="finishBtn" class="btn">\u2713 ${t("markFinished")}</button>` : ""}
        </div>
        ${myLists.length ? `<div class="bp-chips" style="margin-top:.6rem">${myLists.map((l) => `<a class="bp-chip link" href="#/lists/${l.id}">\u{1F4CB} ${esc(l.name)}</a>`).join("")}</div>` : ""}
      </div>
    </div>
  </section>

  ${lib ? `<div class="bp-progress"><div class="muted">${lib.format.toUpperCase()} \xB7 ${t("addedOn")} ${fmtDate(lib.addedAt)} ${lib.finishedAt ? "\xB7 " + t("finishedOn") + " " + fmtDate(lib.finishedAt) : ""}</div>
    <div class="prog-track" style="height:8px"><div class="prog-fill" style="width:${Math.round(lib.progress)}%"></div></div>
    <div class="muted" style="margin-top:.3rem">${t("progress")}: ${Math.round(lib.progress)}%</div></div>` : ""}

  <div class="bp-cols">
    <div class="bp-main">
      <div class="chart-box"><h3>${tr("\u0646\u0628\u0630\u0629", "Overview")}</h3>
        ${meta2.description ? `<p class="bp-desc" id="descP" dir="auto">${esc(meta2.description)}</p><button class="btn bp-more" id="moreDesc">${tr("\u0627\u0642\u0631\u0623 \u0627\u0644\u0645\u0632\u064A\u062F", "Read more")}</button>` : `<p class="muted">${loading ? t("loading") : meta2.notFound ? tr("\u0645\u0641\u064A\u0634 \u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0648\u0646\u0644\u0627\u064A\u0646 \u0644\u0644\u0643\u062A\u0627\u0628 \u062F\u0647 (\u0623\u0648 \u0645\u0641\u064A\u0634 \u0646\u062A).", "No online data found for this book (or you are offline).") : tr("\u0645\u0641\u064A\u0634 \u0648\u0635\u0641 \u0645\u062A\u0627\u062D.", "No description available.")}</p>`}
        ${meta2.firstSentence ? `<blockquote class="bp-quote" dir="auto">\u201C${esc(meta2.firstSentence)}\u201D<div class="muted">${tr("\u0623\u0648\u0644 \u062C\u0645\u0644\u0629", "First sentence")}</div></blockquote>` : ""}
      </div>

      <div id="seriesBox"></div>

      ${findBookHTML(title, author)}

      <div class="chart-box"><h3>\u{1F4AC} ${tr("\u062A\u0639\u0644\u064A\u0642\u0627\u062A\u064A", "My comments")} (${comments.length})</h3>
        <div class="bp-composer">
          <textarea id="cmText" rows="2" placeholder="${tr("\u0627\u0643\u062A\u0628 \u062A\u0639\u0644\u064A\u0642\u0643 \u0639\u0644\u0649 \u0627\u0644\u0643\u062A\u0627\u0628 \u0623\u0648 \u0641\u0635\u0644\u2026", "Write a comment on the book or a chapter\u2026")}"></textarea>
          <div class="bp-composer-row"><input id="cmChapter" placeholder="${tr("\u0627\u0644\u0641\u0635\u0644 / \u0627\u0644\u0635\u0641\u062D\u0629 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)", "Chapter / page (optional)")}"><button id="cmAdd" class="btn btn-primary">${t("send")}</button></div>
        </div>
        <div id="cmList"></div>
      </div>

      ${lib ? `<div class="chart-box"><h3>\u270D\uFE0F ${t("writeReview")}</h3>
        <textarea id="reviewBox" rows="3" style="width:100%">${esc(lib.review || "")}</textarea>
        <button id="saveReview" class="btn" style="margin-top:.4rem">${t("save")}</button></div>
      <div class="chart-box"><h3>\u{1F58A} ${t("highlights")} (${hls.length})</h3><div id="hlList"></div></div>` : ""}

      <h2 class="bp-h2" id="authorRowT" ${author ? "" : "hidden"}>${tr("\u0643\u0645\u0627\u0646 \u0644\u0644\u0645\u0624\u0644\u0641", "More by this author")}</h2><div class="award-row" id="authorRow"></div>
      <h2 class="bp-h2" id="simRowT">${tr("\u0643\u062A\u0628 \u0645\u0634\u0627\u0628\u0647\u0629", "More like this")}</h2><div class="award-row" id="simRow"></div>
    </div>
    <aside class="bp-side">
      <div class="chart-box"><h3>${tr("\u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644", "Details")}</h3>
        <table class="bp-table">${details.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>
        <div class="bp-links">${ol ? `<a href="https://openlibrary.org/works/${esc(ol)}" target="_blank" rel="noopener">Open Library \u2197</a>` : ""}${gb && gb.link ? `<a href="${esc(gb.link)}" target="_blank" rel="noopener">Google Books \u2197</a>` : ""}</div>
      </div>
      ${meta2.authorKey && (meta2.authorBio || meta2.authorPhoto) ? `<div class="chart-box"><h3>${tr("\u0639\u0646 \u0627\u0644\u0645\u0624\u0644\u0641", "About the author")}</h3>
        <div class="bp-author">${meta2.authorPhoto ? `<img src="${esc(meta2.authorPhoto)}" alt="">` : ""}<div><strong>${esc(author)}</strong>
        <div class="muted">${esc([meta2.authorBorn, meta2.authorDied].filter(Boolean).join(" \u2013 "))}</div></div></div>
        ${meta2.authorBio ? `<p class="bp-bio" dir="auto">${esc(meta2.authorBio)}</p>` : ""}</div>` : ""}
      ${lib ? `<button id="delBtn" class="btn btn-danger" style="width:100%">\u{1F5D1} ${t("removeBook")}</button>` : ""}
    </aside>
  </div>`;
    const redraw = () => draw(view, lib, meta2, tok, false);
    const need = () => {
      if (!lib) {
        lib = ensureLib(meta2);
        toast(t("added"));
      }
      return lib;
    };
    const after = (created) => {
      if (created) location.hash = "#/book/" + lib.id;
      else redraw();
    };
    $6("#ratingHost", view).appendChild(stars(lib ? lib.rating : 0, true, (v) => {
      const c = !lib;
      need();
      updateBook(lib.id, { rating: v });
      after(c);
    }));
    const rb = $6("#readBtn", view);
    if (rb) rb.onclick = () => startReadingBook(lib);
    const ab = $6("#attachBtn", view);
    if (ab) ab.onclick = async () => {
      if (await pickBookFile(lib)) renderBookPage(view, arg, kind);
    };
    const ab2 = $6("#addLibBtn", view);
    if (ab2) ab2.onclick = () => {
      need();
      after(true);
    };
    $6("#favBtn", view).onclick = () => {
      const c = !lib;
      need();
      const on = toggleFavorite(lib.id);
      toast(on ? "\u2764 " + tr("\u0627\u062A\u0636\u0627\u0641 \u0644\u0644\u0645\u0641\u0636\u0644\u0629", "Added to favorites") : tr("\u0627\u062A\u0634\u0627\u0644 \u0645\u0646 \u0627\u0644\u0645\u0641\u0636\u0644\u0629", "Removed from favorites"));
      after(c);
    };
    $6("#listsBtn", view).onclick = () => openListsPicker(() => {
      const c = !lib;
      need();
      return { lib, created: c };
    }, () => lib, () => {
      if (lib) redraw();
    });
    const sel = $6("#shelfSel", view);
    if (sel) sel.onchange = (e) => {
      const v = e.target.value;
      if (["want", "reading", "finished"].includes(v)) updateBook(lib.id, { shelf: v });
      else {
        const cs = new Set(lib.customShelves || []);
        cs.has(v) ? cs.delete(v) : cs.add(v);
        updateBook(lib.id, { customShelves: [...cs] });
      }
      redraw();
    };
    const fb = $6("#finishBtn", view);
    if (fb) fb.onclick = () => {
      updateBook(lib.id, { shelf: "finished" });
      redraw();
    };
    const dl = $6("#delBtn", view);
    if (dl) dl.onclick = async () => {
      if (!confirm(t("confirmDelete"))) return;
      if (lib.fileKey) await deleteFile(lib.fileKey).catch(() => {
      });
      removeBook(lib.id);
      location.hash = "#/";
    };
    const sr = $6("#saveReview", view);
    if (sr) sr.onclick = () => {
      updateBook(lib.id, { review: $6("#reviewBox", view).value });
      toast(t("added"));
    };
    const md = $6("#moreDesc", view);
    if (md) {
      const p = $6("#descP", view);
      md.onclick = () => {
        const open2 = p.classList.toggle("open");
        md.textContent = open2 ? tr("\u0623\u0642\u0644", "Show less") : tr("\u0627\u0642\u0631\u0623 \u0627\u0644\u0645\u0632\u064A\u062F", "Read more");
      };
      if (meta2.description.length < 480) md.remove();
    }
    $6("#cmAdd", view).onclick = () => {
      const text = $6("#cmText", view).value.trim();
      if (!text) return;
      const c = !lib;
      need();
      addComment({ bookId: lib.id, chapter: $6("#cmChapter", view).value.trim(), author: tr("\u0623\u0646\u0627", "Me"), text, origin: "me" });
      after(c);
    };
    const cmHost = $6("#cmList", view);
    cmHost.innerHTML = comments.length ? "" : `<p class="muted">${tr("\u0644\u0633\u0647 \u0645\u0641\u064A\u0634 \u062A\u0639\u0644\u064A\u0642\u0627\u062A.", "No comments yet.")}</p>`;
    comments.forEach((c) => {
      const row = document.createElement("div");
      row.className = "comment";
      row.innerHTML = `<div class="c-meta">${c.origin === "buddy" ? "\u{1F464}" : "\u{1F642}"} ${esc(c.author)} ${c.chapter ? "\xB7 " + esc(c.chapter) : ""} \xB7 ${fmtDate(c.createdAt)}${c.editedAt ? " \xB7 " + tr("\u0645\u0639\u062F\u0651\u0644", "edited") : ""}
      <span class="c-actions"><button class="icon-btn" data-a="edit" title="${t("edit")}">\u270E</button><button class="icon-btn" data-a="del" title="${t("delete")}">\u{1F5D1}</button></span></div><div dir="auto" style="white-space:pre-wrap">${esc(c.text)}</div>`;
      row.querySelector("[data-a=del]").onclick = () => {
        if (confirm(tr("\u062A\u062D\u0630\u0641 \u0627\u0644\u062A\u0639\u0644\u064A\u0642\u061F", "Delete this comment?"))) {
          removeComment(c.id);
          redraw();
        }
      };
      row.querySelector("[data-a=edit]").onclick = () => {
        const txt = prompt(t("edit"), c.text);
        if (txt !== null && txt.trim()) {
          updateComment(c.id, { text: txt.trim() });
          redraw();
        }
      };
      cmHost.appendChild(row);
    });
    const hlHost = $6("#hlList", view);
    if (hlHost) {
      hlHost.innerHTML = hls.length ? "" : `<p class="muted">${t("noHighlights")}</p>`;
      hls.forEach((h) => {
        const row = document.createElement("div");
        row.className = "review-card";
        row.innerHTML = `<div style="border-inline-start:4px solid ${esc(h.color)};padding-inline-start:.7rem">
        <div style="font-family:var(--font-read-ar)">${esc(h.text)}</div>
        ${h.note ? `<div class="muted" style="margin-top:.3rem">\u{1F4DD} ${esc(h.note)}</div>` : ""}
        <div class="muted" style="font-size:.72rem;margin-top:.3rem">${fmtDate(h.createdAt)} <button class="icon-btn" style="font-size:.8rem">\u{1F5D1}</button></div></div>`;
        row.querySelector("button").onclick = () => {
          removeHighlight(h.id);
          redraw();
        };
        hlHost.appendChild(row);
      });
    }
    const aLink = view.querySelector("#bpAuthor");
    if (aLink) aLink.onclick = (e) => {
      e.preventDefault();
      openAuthor(author);
    };
    if (!loading) {
      const mini = (it) => {
        const c = document.createElement("div");
        c.className = "book-card bp-mini";
        c.innerHTML = `<div class="cover">${it.cover ? `<img src="${esc(it.cover)}" loading="lazy" alt="">` : `<div class="cover-fallback">\u{1F4D5}<small>${esc(it.title)}</small></div>`}</div>
        <div class="book-meta"><div class="book-title">${esc(it.title)}</div><div class="book-author">${authorHTML(it.author)}${it.rating ? " \xB7 \u2605 " + it.rating.toFixed(1) : ""}</div></div>`;
        c.onclick = async () => {
          if (it.olKey) {
            location.hash = "#/work/" + it.olKey;
            return;
          }
          const f = await findCover(it.title, it.author).catch(() => null);
          if (f && f.olKey) location.hash = "#/work/" + f.olKey;
          else {
            try {
              sessionStorage.setItem("qari.pendingSearch", JSON.stringify({ q: it.title, scope: "title" }));
            } catch {
            }
            location.hash = "#/discover";
            if (window.__qariDiscoverPending) window.__qariDiscoverPending();
          }
        };
        return c;
      };
      const fill = (id, titleId, p) => p.then((items) => {
        if (tok !== TOKEN2) return;
        const host = document.getElementById(id);
        if (!host) return;
        const ti = document.getElementById(titleId);
        if (!items.length) {
          if (ti) ti.hidden = true;
          return;
        }
        if (ti) ti.hidden = false;
        items.forEach((i) => host.appendChild(mini(i)));
      }).catch(() => {
        const ti = document.getElementById(titleId);
        if (ti) ti.hidden = true;
      });
      const curTitle = lib && lib.title || meta2.title;
      const sb = document.getElementById("seriesBox");
      if (sb && author) {
        sb.innerHTML = `<div class="chart-box"><h3>\u{1F4DA} ${tr("\u0627\u0644\u0633\u0644\u0633\u0644\u0629", "Series")}</h3><p class="muted">${tr("\u0628\u062F\u0648\u0651\u0631 \u0639\u0644\u0649 \u0627\u0644\u0633\u0644\u0633\u0644\u0629\u2026", "Checking for a series\u2026")}</p></div>`;
        seriesForBook({ title: curTitle, author, olAuthorKey: meta2.authorKey }).then((r) => {
          if (tok !== TOKEN2) return;
          const el = document.getElementById("seriesBox");
          if (!el) return;
          if (!r) {
            el.innerHTML = `<div class="chart-box"><h3>\u{1F4DA} ${tr("\u0627\u0644\u0633\u0644\u0633\u0644\u0629", "Series")}</h3><p class="muted">${tr("\u0645\u0641\u064A\u0634 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0633\u0644\u0633\u0644\u0629 \u0644\u0643\u062A\u0627\u0628 \u062F\u0647 \u0641\u064A Wikidata. \u0645\u0645\u0643\u0646 \u064A\u0643\u0648\u0646 \u0633\u062A\u0627\u0646\u062F \u0623\u0644\u0648\u0646\u060C \u0623\u0648 \u0627\u0644\u0633\u0644\u0633\u0644\u0629 \u0645\u0634 \u0645\u062A\u0633\u062C\u0644\u0629 (\u0627\u0644\u062A\u063A\u0637\u064A\u0629 \u0636\u0639\u064A\u0641\u0629 \u0644\u0644\u0643\u062A\u0628 \u0627\u0644\u0639\u0631\u0628\u064A\u0629).", "No series info for this book on Wikidata. It may be a standalone, or the series just is not recorded there (coverage is weak for Arabic books).")} <a href="#" id="seriesAuthorLink">${tr("\u0643\u0644 \u0643\u062A\u0628 \u0627\u0644\u0645\u0624\u0644\u0641", "All books by this author")}</a></p></div>`;
            const l = el.querySelector("#seriesAuthorLink");
            if (l) l.onclick = (e) => {
              e.preventDefault();
              openAuthor(author);
            };
            return;
          }
          const pos = r.position != null ? `${tr("\u0627\u0644\u0643\u062A\u0627\u0628 \u0631\u0642\u0645", "Book")} ${r.position} ${tr("\u0645\u0646", "of")} ${r.total}` : `${tr("\u0627\u0644\u0643\u062A\u0627\u0628", "Book")} ${r.index + 1} ${tr("\u0645\u0646", "of")} ${r.total}`;
          el.innerHTML = `<div class="chart-box"><h3>\u{1F4DA} ${tr("\u0627\u0644\u0633\u0644\u0633\u0644\u0629", "Series")}: ${esc(r.series.name)}</h3><p class="muted" style="margin-bottom:.4rem">${pos} \xB7 ${tr("\u0627\u0644\u0645\u0635\u062F\u0631: Wikidata", "Source: Wikidata")}</p>${seriesBoxHTML(r.series, curTitle, author).replace(/^<div class="series-card"><h3>.*?<\/h3>/, '<div class="series-card">')}</div>`;
          bindSeriesLinks(el);
        }).catch(() => {
          const el = document.getElementById("seriesBox");
          if (el) el.innerHTML = `<div class="chart-box"><h3>\u{1F4DA} ${tr("\u0627\u0644\u0633\u0644\u0633\u0644\u0629", "Series")}</h3><p class="muted">${tr("\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u0645\u064A\u0644 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0633\u0644\u0633\u0644\u0629 \u062F\u0644\u0648\u0642\u062A\u064A.", "Could not load series info right now.")}</p></div>`;
        });
      }
      const authorItems = (async () => {
        let items = meta2.authorKey ? await moreByAuthor(meta2.authorKey, meta2.olKey).catch(() => []) : [];
        if (!items.length && author) items = (await worksByAuthor(author, 0, 14).catch(() => ({ items: [] }))).items.filter((x) => x.olKey !== meta2.olKey && x.title !== curTitle).slice(0, 12);
        return items;
      })();
      fill("authorRow", "authorRowT", authorItems);
      fill("simRow", "simRowT", relatedBooks({ subjects: meta2.subjects || lib && lib.subjects || [], olKey: meta2.olKey, authorKey: meta2.authorKey, title: curTitle, author }));
    }
  }
  function openListsPicker(getBook2, peekBook, onDone) {
    const m = document.createElement("div");
    m.className = "modal";
    const render = () => {
      const lists = getState().lists;
      m.innerHTML = `<div class="modal-card" style="max-width:420px"><div class="modal-head"><h2>\u{1F4CB} ${tr("\u0623\u0636\u0641 \u0644\u0642\u0627\u0626\u0645\u0629", "Add to list")}</h2><button class="icon-btn" id="lpClose">\u2715</button></div>
      <div id="lpRows">${lists.length ? "" : `<p class="muted">${tr("\u0645\u0639\u0646\u062F\u0643\u0634 \u0642\u0648\u0627\u0626\u0645 \u0644\u0633\u0647. \u0627\u0639\u0645\u0644 \u0623\u0648\u0644 \u0648\u0627\u062D\u062F\u0629:", "No lists yet. Create your first:")}</p>`}</div>
      <div class="search-row" style="margin-top:.8rem"><input id="lpName" placeholder="${tr("\u0627\u0633\u0645 \u0642\u0627\u0626\u0645\u0629 \u062C\u062F\u064A\u062F\u0629\u2026", "New list name\u2026")}"><button id="lpNew" class="btn btn-primary">\uFF0B</button></div></div>`;
      const host = m.querySelector("#lpRows");
      lists.forEach((l) => {
        const lab = document.createElement("label");
        lab.className = "lp-row";
        const pb = peekBook();
        const cur = !!pb && listHas(l.id, pb.id);
        lab.innerHTML = `<input type="checkbox" ${cur ? "checked" : ""}><span>${esc(l.name)}</span><span class="muted">${l.bookIds.length}</span>`;
        lab.querySelector("input").onchange = () => {
          const { lib, created } = getBook2();
          listToggleBook(l.id, lib.id);
          if (created) {
            m.remove();
            location.hash = "#/book/" + lib.id;
          } else {
            onDone();
            render();
          }
        };
        host.appendChild(lab);
      });
      m.querySelector("#lpClose").onclick = () => {
        m.remove();
        onDone();
      };
      const mk = () => {
        const name = m.querySelector("#lpName").value.trim();
        if (!name) return;
        const l = createList(name);
        const { lib, created } = getBook2();
        listToggleBook(l.id, lib.id);
        if (created) {
          m.remove();
          location.hash = "#/book/" + lib.id;
        } else {
          onDone();
          render();
        }
      };
      m.querySelector("#lpNew").onclick = mk;
      m.querySelector("#lpName").addEventListener("keydown", (e) => {
        if (e.key === "Enter") mk();
      });
    };
    m.addEventListener("click", (e) => {
      if (e.target === m) {
        m.remove();
        onDone();
      }
    });
    document.body.appendChild(m);
    render();
  }

  // src/lists.js
  var $7 = (s, r = document) => r.querySelector(s);
  function smart() {
    const bs = getState().books;
    return [
      { id: "fav", icon: "\u2764", name: tr("\u0627\u0644\u0645\u0641\u0636\u0644\u0629", "Favorites"), books: bs.filter((b) => b.favorite) },
      { id: "reading", icon: "\u{1F4D6}", name: t("shelf_reading"), books: bs.filter((b) => b.shelf === "reading") },
      { id: "want", icon: "\u{1F516}", name: t("shelf_want"), books: bs.filter((b) => b.shelf === "want") },
      { id: "finished", icon: "\u2705", name: tr("\u0642\u0631\u0627\u064A\u062A\u0647\u0645", "Read"), books: bs.filter((b) => b.shelf === "finished") }
    ];
  }
  function custom() {
    return getState().lists.map((l) => ({ id: l.id, icon: "\u{1F4CB}", name: l.name, desc: l.desc, custom: true, books: l.bookIds.map(getBook).filter(Boolean) }));
  }
  var mosaic = (books) => `<div class="ls-mosaic">${[0, 1, 2, 3].map((i) => books[i] && books[i].cover ? `<img src="${esc(books[i].cover)}" alt="">` : `<span></span>`).join("")}</div>`;
  function renderLists(view, id) {
    if (id) return renderOne(view, id);
    const all = [...smart(), ...custom()];
    view.innerHTML = `<div class="view-head"><h1>\u{1F4CB} ${t("navLists")}</h1></div>
    <div class="stat-card" style="margin-bottom:1.2rem"><h3 style="margin-bottom:.6rem">${tr("\u0642\u0627\u0626\u0645\u0629 \u0642\u0631\u0627\u0621\u0629 \u062C\u062F\u064A\u062F\u0629", "New reading list")}</h3>
      <div class="search-row"><input id="nlName" placeholder="${tr("\u0627\u0633\u0645 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 (\u0645\u062B\u0644\u064B\u0627: \u0631\u0648\u0627\u064A\u0627\u062A \u0627\u0644\u0635\u064A\u0641)", "List name (e.g. Summer reads)")}"><input id="nlDesc" placeholder="${tr("\u0648\u0635\u0641 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)", "Description (optional)")}"><button id="nlBtn" class="btn btn-primary">\uFF0B ${t("create")}</button></div></div>
    <div class="stat-card" style="margin-bottom:1.2rem"><h3 style="margin-bottom:.4rem">\u{1F4E5} ${tr("\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0645\u0643\u062A\u0628\u062A\u0643 \u0645\u0646 Goodreads", "Import your Goodreads library")}</h3>
      <p class="muted" style="margin-bottom:.6rem">${tr("\u0641\u064A Goodreads: My Books \u2190 Import and export \u2190 Export Library\u060C \u0648\u0628\u0639\u062F\u064A\u0646 \u0627\u062E\u062A\u0627\u0631 \u0645\u0644\u0641 CSV \u0647\u0646\u0627. \u0628\u064A\u062A\u0639\u0645\u0644 \u0644\u0643\u0644 \u0631\u0641 \u0642\u0627\u0626\u0645\u0629\u060C \u0648\u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A \u0648\u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E \u0628\u062A\u062A\u0646\u0642\u0644.", "On Goodreads: My Books > Import and export > Export Library, then choose the CSV here. Each shelf becomes a list; ratings and dates carry over.")}</p>
      <button id="grBtn" class="btn">\u2B06 ${tr("\u0627\u062E\u062A\u0627\u0631 \u0645\u0644\u0641 CSV", "Choose CSV file")}</button><input type="file" id="grIn" accept=".csv,text/csv" hidden></div>
    <div class="ls-grid" id="lsGrid"></div>`;
    const host = $7("#lsGrid", view);
    all.forEach((l) => {
      const c = document.createElement("div");
      c.className = "ls-card";
      c.innerHTML = `${mosaic(l.books)}<div class="ls-info"><div class="ls-name">${l.icon} ${esc(l.name)}</div><div class="muted">${l.books.length} ${tr("\u0643\u062A\u0627\u0628", "books")}${l.custom ? "" : " \xB7 " + tr("\u062A\u0644\u0642\u0627\u0626\u064A\u0629", "auto")}</div>${l.desc ? `<div class="muted">${esc(l.desc)}</div>` : ""}</div>`;
      c.onclick = () => {
        location.hash = "#/lists/" + l.id;
      };
      host.appendChild(c);
    });
    const mk = () => {
      const n = $7("#nlName", view).value.trim();
      if (!n) return;
      const l = createList(n, $7("#nlDesc", view).value.trim());
      location.hash = "#/lists/" + l.id;
    };
    $7("#nlBtn", view).onclick = mk;
    $7("#grBtn", view).onclick = () => $7("#grIn", view).click();
    $7("#grIn", view).onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const r = importGoodreads(await f.text());
        toast(`\u2713 ${r.added} ${tr("\u0643\u062A\u0627\u0628 \u0627\u062A\u0636\u0627\u0641\u0648\u0627", "books added")} \xB7 ${r.lists} ${tr("\u0642\u0648\u0627\u0626\u0645", "lists")}`, 4e3);
        renderLists(view);
      } catch (err) {
        toast("\u26A0 " + err.message, 4e3);
      }
    };
    $7("#nlName", view).addEventListener("keydown", (e) => {
      if (e.key === "Enter") mk();
    });
  }
  function renderOne(view, id) {
    const l = [...smart(), ...custom()].find((x) => x.id === id);
    if (!l) {
      location.hash = "#/lists";
      return;
    }
    let sort = "manual";
    const draw2 = () => {
      let books = l.custom ? l.books.map((b) => b) : l.books.slice();
      if (l.custom) books = getList(id).bookIds.map(getBook).filter(Boolean);
      if (sort === "title") books.sort((a, b) => a.title.localeCompare(b.title));
      else if (sort === "added") books.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
      else books = sortBooks(books, sort);
      view.innerHTML = `<div class="view-head"><div><a href="#/lists" class="muted">\u2039 ${t("navLists")}</a><h1>${l.icon} ${esc(l.name)} <span class="count muted">(${books.length})</span></h1>${l.desc ? `<div class="muted">${esc(l.desc)}</div>` : ""}</div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
        <select id="lsSort"><option value="manual">${tr("\u0627\u0644\u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u0623\u0635\u0644\u064A", "Original order")}</option><option value="added">${tr("\u0627\u0644\u0623\u062D\u062F\u062B \u0625\u0636\u0627\u0641\u0629", "Newest first")}</option><option value="title">${tr("\u0623\u0628\u062C\u062F\u064A\u064B\u0627", "A\u2013Z")}</option><option value="year-desc">${tr("\u0627\u0644\u0623\u062D\u062F\u062B \u0625\u0635\u062F\u0627\u0631\u064B\u0627", "Newest release")}</option><option value="year-asc">${tr("\u0627\u0644\u0623\u0642\u062F\u0645 \u0625\u0635\u062F\u0627\u0631\u064B\u0627", "Oldest release")}</option><option value="rating-desc">${tr("\u0627\u0644\u0623\u0639\u0644\u0649 \u062A\u0642\u064A\u064A\u0645\u064B\u0627", "Highest rated")}</option><option value="rating-asc">${tr("\u0627\u0644\u0623\u0642\u0644 \u062A\u0642\u064A\u064A\u0645\u064B\u0627", "Lowest rated")}</option></select>
        <button id="lsCopy" class="btn">\u29C9 ${tr("\u0646\u0633\u062E \u0643\u0646\u0635", "Copy as text")}</button>
        ${l.custom ? `<button id="lsRename" class="btn">${t("edit")}</button><button id="lsDel" class="btn btn-danger">${t("delete")}</button>` : ""}</div></div>
      <div class="grid" id="lsBooks"></div>`;
      $7("#lsSort", view).value = sort;
      $7("#lsSort", view).onchange = (e) => {
        sort = e.target.value;
        draw2();
      };
      const g = $7("#lsBooks", view);
      if (!books.length) g.innerHTML = `<p class="muted">${l.custom ? tr('\u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0641\u0627\u0636\u064A\u0629. \u0627\u0641\u062A\u062D \u0623\u064A \u0643\u062A\u0627\u0628 \u0648\u0627\u0636\u063A\u0637 "\u0627\u0644\u0642\u0648\u0627\u0626\u0645" \u0639\u0634\u0627\u0646 \u062A\u0636\u064A\u0641\u0647 \u0647\u0646\u0627.', 'Empty list. Open any book and tap "Lists" to add it here.') : "\u2014"}</p>`;
      books.forEach((b, i) => {
        const el = document.createElement("div");
        el.className = "book-card";
        el.innerHTML = `<div class="cover">${coverHTML(b)}</div>${b.favorite ? '<span class="shelf-badge fav">\u2764</span>' : ""}
        <div class="book-meta"><div class="book-title">${esc(b.title)}</div><div class="book-author">${authorHTML(b.author)}</div>
        <div class="ls-read"><button class="btn btn-primary btn-sm" data-act="read">\u25B6 ${t("startReading")}</button><button class="icon-btn" data-act="attach" title="${b.fileKey ? tr("\u063A\u064A\u0651\u0631 \u0645\u0644\u0641 \u0627\u0644\u0643\u062A\u0627\u0628", "Change book file") : tr("\u0627\u062E\u062A\u0627\u0631 \u0645\u0644\u0641 \u0627\u0644\u0643\u062A\u0627\u0628 \u0645\u0646 \u062C\u0647\u0627\u0632\u0643", "Choose the book file from your device")}">${b.fileKey ? "\u{1F4CE}\u2713" : "\u{1F4CE}"}</button></div>
        ${l.custom && sort === "manual" ? `<div class="ls-ctrl"><button class="icon-btn" data-d="-1">\u2191</button><button class="icon-btn" data-d="1">\u2193</button><button class="icon-btn" data-d="x">\u2715</button></div>` : ""}</div>`;
        el.onclick = () => {
          location.hash = "#/book/" + b.id;
        };
        el.querySelector("[data-act=read]").onclick = (ev) => {
          ev.stopPropagation();
          startReadingBook(b);
        };
        el.querySelector("[data-act=attach]").onclick = async (ev) => {
          ev.stopPropagation();
          if (await pickBookFile(b)) draw2();
        };
        el.querySelectorAll(".ls-ctrl button").forEach((btn) => btn.onclick = (ev) => {
          ev.stopPropagation();
          if (btn.dataset.d === "x") listToggleBook(id, b.id);
          else listMove(id, b.id, +btn.dataset.d);
          draw2();
        });
        g.appendChild(el);
      });
      $7("#lsCopy", view).onclick = async () => {
        const txt = `${l.name}
` + books.map((b, i) => `${i + 1}. ${b.title}${b.author ? " \u2014 " + b.author : ""}`).join("\n");
        try {
          await navigator.clipboard.writeText(txt);
          toast(t("copied"));
        } catch {
          prompt("", txt);
        }
      };
      if (l.custom) {
        $7("#lsRename", view).onclick = () => {
          const n = prompt(tr("\u0627\u0633\u0645 \u0627\u0644\u0642\u0627\u0626\u0645\u0629", "List name"), l.name);
          if (!n || !n.trim()) return;
          const d = prompt(tr("\u0627\u0644\u0648\u0635\u0641", "Description"), l.desc || "");
          updateList(id, { name: n.trim(), desc: d || "" });
          l.name = n.trim();
          l.desc = d || "";
          draw2();
        };
        $7("#lsDel", view).onclick = () => {
          if (confirm(tr("\u062A\u062D\u0630\u0641 \u0627\u0644\u0642\u0627\u0626\u0645\u0629\u061F \u0627\u0644\u0643\u062A\u0628 \u0647\u062A\u0641\u0636\u0644 \u0641\u064A \u0645\u0643\u062A\u0628\u062A\u0643.", "Delete this list? Books stay in your library."))) {
            deleteList(id);
            location.hash = "#/lists";
          }
        };
      }
    };
    draw2();
  }
  function parseCSV(text) {
    const rows = [];
    let row = [], f = "", q = false;
    text = text.replace(/^\uFEFF/, "");
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            f += '"';
            i++;
          } else q = false;
        } else f += c;
      } else if (c === '"') q = true;
      else if (c === ",") {
        row.push(f);
        f = "";
      } else if (c === "\n") {
        row.push(f);
        rows.push(row);
        row = [];
        f = "";
      } else if (c !== "\r") f += c;
    }
    if (f || row.length) {
      row.push(f);
      rows.push(row);
    }
    return rows;
  }
  var cleanIsbn = (v) => (v || "").replace(/[="\s]/g, "");
  function importGoodreads(text) {
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error("CSV \u0641\u0627\u0636\u064A");
    const h = rows[0].map((x) => x.trim());
    const ix = (n) => h.indexOf(n);
    if (ix("Title") < 0) throw new Error(tr("\u0627\u0644\u0645\u0644\u0641 \u0645\u0634 \u062A\u0635\u062F\u064A\u0631 Goodreads", "Not a Goodreads export"));
    const g = (r, n) => ix(n) >= 0 ? (r[ix(n)] || "").trim() : "";
    const books = getState().books;
    let added = 0;
    const listIds = {};
    const listFor = (name) => {
      if (!listIds[name]) {
        const ex = getState().lists.find((l) => l.name === name);
        listIds[name] = (ex || createList(name, "Goodreads")).id;
      }
      return listIds[name];
    };
    const shelfMap = { read: "finished", "currently-reading": "reading", "to-read": "want" };
    rows.slice(1).forEach((r) => {
      const title = g(r, "Title").replace(/\s*\([^)]*#\d+[^)]*\)\s*$/, "").trim();
      if (!title) return;
      const author = g(r, "Author");
      const isbn = cleanIsbn(g(r, "ISBN13")) || cleanIsbn(g(r, "ISBN"));
      const ex = g(r, "Exclusive Shelf");
      const rating = +g(r, "My Rating") || 0;
      const dr = g(r, "Date Read").replace(/\//g, "-");
      let b = books.find((x) => x.title.toLowerCase() === title.toLowerCase() && (x.author || "").toLowerCase() === author.toLowerCase());
      if (!b) {
        b = addBook({
          title,
          author,
          format: "web",
          source: "goodreads-csv",
          isbn,
          cover: "",
          shelf: shelfMap[ex] || "want",
          rating,
          totalPages: +g(r, "Number of Pages") || 0,
          review: g(r, "My Review"),
          finishedAt: ex === "read" ? dr ? new Date(dr).toISOString() : (/* @__PURE__ */ new Date()).toISOString() : null
        });
        if (isNaN(Date.parse(b.finishedAt || "2000"))) b.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
        added++;
      }
      const shelves = new Set(g(r, "Bookshelves").split(",").map((x) => x.trim()).filter(Boolean));
      if (ex) shelves.add(ex);
      shelves.forEach((s) => {
        const lid = listFor("Goodreads: " + s);
        if (!listHas(lid, b.id)) listToggleBook(lid, b.id);
      });
    });
    save();
    return { added, lists: Object.keys(listIds).length };
  }

  // src/dbfile.js
  var FORMAT = "qari-db";
  var handle = null;
  var status = "none";
  var lastSaved = null;
  var lastError = "";
  var timer = null;
  var saving = false;
  var again = false;
  var subs = /* @__PURE__ */ new Set();
  var set = (s, err = "") => {
    status = s;
    lastError = err;
    subs.forEach((f) => {
      try {
        f();
      } catch {
      }
    });
  };
  var supported = () => typeof window.showSaveFilePicker === "function";
  var info = () => ({ status, name: handle ? handle.name : "", lastSaved, lastError, supported: supported() });
  var onStatus = (fn) => subs.add(fn);
  async function build() {
    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify({ format: FORMAT, version: 1, savedAt: (/* @__PURE__ */ new Date()).toISOString() }));
    zip.file("data.json", JSON.stringify(snapshot()));
    const keys = await allFileKeys();
    const used = new Set(getState().books.map((b) => b.fileKey).concat((getState().images || []).map((i) => i.fileKey)).filter(Boolean));
    for (const k of keys) {
      if (!used.has(k)) continue;
      const b = await getFile(k);
      if (b) zip.file("files/" + k, b, { binary: true });
    }
    return zip.generateAsync({ type: "blob", compression: "STORE" });
  }
  async function writeTo(h) {
    const blob = await build();
    const w = await h.createWritable();
    await w.write(blob);
    await w.close();
    lastSaved = /* @__PURE__ */ new Date();
  }
  async function saveNow() {
    if (!handle) return false;
    if (saving) {
      again = true;
      return false;
    }
    saving = true;
    clearTimeout(timer);
    try {
      if (await handle.queryPermission({ mode: "readwrite" }) !== "granted") {
        set("needs-permission");
        return false;
      }
      set("saving");
      await writeTo(handle);
      set("ready");
      return true;
    } catch (e) {
      console.error(e);
      set("error", e.message || String(e));
      return false;
    } finally {
      saving = false;
      if (again) {
        again = false;
        schedule();
      }
    }
  }
  function schedule() {
    if (!handle || status === "needs-permission") return;
    clearTimeout(timer);
    timer = setTimeout(saveNow, 2500);
  }
  async function grant() {
    if (!handle) return;
    if (await handle.requestPermission({ mode: "readwrite" }) === "granted") {
      set("ready");
      await saveNow();
    }
  }
  async function createFile() {
    const h = await showSaveFilePicker({ suggestedName: "qari-library.qari", types: [{ description: "Qari database", accept: { "application/zip": [".qari"] } }] });
    handle = h;
    await metaPut("handle", h).catch(() => {
    });
    set("ready");
    await saveNow();
  }
  async function restoreFrom(file) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const mf = zip.file("manifest.json"), dj = zip.file("data.json");
    if (!mf || !dj) throw new Error("not a qari database");
    const data = JSON.parse(await dj.async("text"));
    await clearFiles();
    const names = Object.keys(zip.files).filter((n) => n.startsWith("files/") && !zip.files[n].dir);
    for (const n of names) await putFile(n.slice(6), await zip.files[n].async("blob"));
    replaceState(data);
    return { books: data.books.length, files: names.length };
  }
  async function openFile() {
    const [h] = await showOpenFilePicker({ types: [{ description: "Qari database", accept: { "application/zip": [".qari"] } }] });
    if (await h.requestPermission({ mode: "readwrite" }) !== "granted") throw new Error("permission denied");
    const r = await restoreFrom(await h.getFile());
    handle = h;
    await metaPut("handle", h).catch(() => {
    });
    set("ready");
    return r;
  }
  async function disconnect() {
    handle = null;
    clearTimeout(timer);
    await metaDel("handle");
    set("none");
  }
  async function downloadBackup() {
    const blob = await build();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "qari-library-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".qari";
    a.click();
    lastSaved = /* @__PURE__ */ new Date();
    set(status);
  }
  async function init() {
    if (!supported()) {
      set("unsupported");
    } else {
      try {
        handle = await metaGet("handle");
        if (handle) set(await handle.queryPermission({ mode: "readwrite" }) === "granted" ? "ready" : "needs-permission");
      } catch (e) {
        handle = null;
      }
    }
    onChange(schedule);
    onFilesChange(schedule);
    window.addEventListener("beforeunload", () => {
      if (handle && timer) saveNow();
    });
  }

  // src/sync.js
  var KEY2 = "qari.sync";
  var API = "https://api.github.com";
  var DATA_PATH = "data.json";
  var MAX_FILE = 40 * 1024 * 1024;
  var PUSH_DELAY = 12e3;
  var POLL_MS = 9e4;
  var meta = { token: "", owner: "", repo: "qari-data", sha: null, hash: null, changedAt: 0, lastSync: 0 };
  var status2 = "off";
  var lastError2 = "";
  var lastNote = "";
  var conflictNote = "";
  var conflictBackup = null;
  var busy = false;
  var rerun = false;
  var applying = false;
  var pushTimer = null;
  var pollTimer = null;
  var subs2 = /* @__PURE__ */ new Set();
  var hooks = { onApplied: () => {
  }, confirm: (msg) => window.confirm(msg), lang: () => "ar" };
  var emit = () => subs2.forEach((f) => {
    try {
      f();
    } catch {
    }
  });
  var setStatus = (s, err = "") => {
    status2 = s;
    lastError2 = err;
    emit();
  };
  var saveMeta = () => localStorage.setItem(KEY2, JSON.stringify(meta));
  var tt = (ar, en) => hooks.lang() === "ar" ? ar : en;
  var onStatus2 = (fn) => subs2.add(fn);
  var configure = (h) => Object.assign(hooks, h);
  var info2 = () => ({
    status: status2,
    error: lastError2,
    note: lastNote,
    conflictNote,
    connected: !!meta.token,
    owner: meta.owner,
    repo: meta.repo,
    lastSync: meta.lastSync,
    hasConflictBackup: !!conflictBackup
  });
  function canon(v) {
    if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
    if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
    return JSON.stringify(v);
  }
  function syncState(s) {
    const c = JSON.parse(JSON.stringify(s));
    delete c.metaCache;
    if (c.settings) delete c.settings.gbKey;
    return c;
  }
  var hashNow = () => canon(syncState(getState()));
  var isEmptyLib = () => {
    const s = getState();
    return !s.books.length && !s.lists.length && !s.highlights.length && !s.comments.length;
  };
  var b64 = (str) => {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
    return btoa(bin);
  };
  var unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
  var blobToB64 = (blob) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
  var enc = (p) => p.split("/").map(encodeURIComponent).join("/");
  async function gh(method, path, body, accept) {
    const r = await fetch(API + path + (method === "GET" ? (path.includes("?") ? "&" : "?") + "_=" + Date.now() : ""), {
      method,
      cache: "no-store",
      headers: Object.assign({ Authorization: "Bearer " + meta.token, Accept: accept || "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, body ? { "Content-Type": "application/json" } : {}),
      body: body ? JSON.stringify(body) : void 0
    });
    return r;
  }
  var repoPath = () => `/repos/${encodeURIComponent(meta.owner)}/${encodeURIComponent(meta.repo)}`;
  async function errOf(r) {
    let m = "";
    try {
      m = (await r.json()).message || "";
    } catch {
    }
    return `GitHub ${r.status}${m ? ": " + m : ""}`;
  }
  async function getRemote() {
    const r = await gh("GET", `${repoPath()}/contents/${DATA_PATH}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(await errOf(r));
    const j = await r.json();
    let text;
    if (j.encoding === "base64" && j.content) text = unb64(j.content);
    else {
      const rr = await gh("GET", `${repoPath()}/contents/${DATA_PATH}`, null, "application/vnd.github.raw");
      if (!rr.ok) throw new Error(await errOf(rr));
      text = await rr.text();
    }
    const doc = JSON.parse(text);
    if (!doc || doc.format !== "qari-sync" || !doc.state || !Array.isArray(doc.state.books)) throw new Error(tt("\u0627\u0644\u0645\u0644\u0641 \u0641\u064A \u0627\u0644\u0631\u064A\u0628\u0648 \u0645\u0634 \u0628\u062A\u0627\u0639 \u0642\u0627\u0631\u0626", "data.json in the repo is not a Qari file"));
    return { sha: j.sha, doc };
  }
  async function pushData(sha) {
    const doc = { format: "qari-sync", version: 1, savedAt: (/* @__PURE__ */ new Date()).toISOString(), state: syncState(getState()) };
    const hash = canon(doc.state);
    const body = { message: "Qari sync " + doc.savedAt, content: b64(JSON.stringify(doc)) };
    if (sha) body.sha = sha;
    const r = await gh("PUT", `${repoPath()}/contents/${DATA_PATH}`, body);
    if (r.status === 409 || r.status === 422) return { conflict: true };
    if (!r.ok) throw new Error(await errOf(r));
    const j = await r.json();
    meta.sha = j.content.sha;
    meta.hash = hash;
    meta.lastSync = Date.now();
    saveMeta();
    return { ok: true };
  }
  async function applyRemote(remote, why) {
    if (!isEmptyLib() && canon(syncState(remote.doc.state)) !== hashNow()) {
      conflictBackup = JSON.stringify({ format: "qari-sync", savedAt: (/* @__PURE__ */ new Date()).toISOString(), state: syncState(getState()) });
    }
    const local = getState();
    const data = Object.assign({}, remote.doc.state, { metaCache: local.metaCache || {} });
    data.settings = Object.assign({}, data.settings || {}, { gbKey: local.settings && local.settings.gbKey || "" });
    applying = true;
    try {
      replaceState(data);
    } finally {
      applying = false;
    }
    meta.sha = remote.sha;
    meta.hash = hashNow();
    meta.lastSync = Date.now();
    meta.changedAt = 0;
    saveMeta();
    try {
      hooks.onApplied();
    } catch {
    }
    lastNote = why || "";
  }
  async function syncFiles() {
    const st = getState();
    const books = st.books.filter((b) => b.fileKey && b.format !== "web").concat((st.images || []).filter((i) => i.fileKey));
    if (!books.length) return;
    const r = await gh("GET", `${repoPath()}/contents/files`);
    let remote = /* @__PURE__ */ new Set();
    if (r.ok) (await r.json()).forEach((f) => remote.add(f.name));
    else if (r.status !== 404) throw new Error(await errOf(r));
    const local = new Set(await allFileKeys());
    let skipped = 0;
    for (const b of books) {
      const k = b.fileKey;
      if (local.has(k) && !remote.has(k)) {
        const blob = await getFile(k);
        if (!blob) continue;
        if (blob.size > MAX_FILE) {
          skipped++;
          continue;
        }
        const pr = await gh("PUT", `${repoPath()}/contents/files/${enc(k)}`, { message: "Qari book file " + k, content: await blobToB64(blob) });
        if (!pr.ok && pr.status !== 422) throw new Error(await errOf(pr));
      } else if (!local.has(k) && remote.has(k)) {
        const dr = await gh("GET", `${repoPath()}/contents/files/${enc(k)}`, null, "application/vnd.github.raw");
        if (!dr.ok) throw new Error(await errOf(dr));
        await putFile(k, await dr.blob());
      }
    }
    if (skipped) lastNote = tt(`${skipped} \u0643\u062A\u0627\u0628 \u0623\u0643\u0628\u0631 \u0645\u0646 40MB \u0645\u0627 \u0627\u062A\u0631\u0641\u0639\u0634`, `${skipped} book file(s) over 40MB were not uploaded`);
  }
  async function syncNow(reason = "manual") {
    if (!meta.token) return false;
    if (busy) {
      rerun = true;
      return false;
    }
    busy = true;
    clearTimeout(pushTimer);
    lastNote = "";
    setStatus("syncing");
    try {
      const remote = await getRemote();
      const h = hashNow();
      if (!remote) {
        if (!isEmptyLib()) {
          const p = await pushData(null);
          if (p.conflict) {
            rerun = true;
          }
        }
      } else if (!meta.sha) {
        if (isEmptyLib() || canon(syncState(remote.doc.state)) === h) await applyRemote(remote, "");
        else if (hooks.confirm(tt("\u0627\u0644\u0631\u064A\u0628\u0648 \u0641\u064A\u0647 \u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u062C\u0647\u0627\u0632 \u062F\u0647 \u0643\u0645\u0627\u0646 \u0641\u064A\u0647 \u0628\u064A\u0627\u0646\u0627\u062A.\nOK = \u0627\u0633\u062A\u062E\u062F\u0645 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0631\u064A\u0628\u0648 (\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062C\u0647\u0627\u0632 \u0628\u062A\u062A\u062D\u0641\u0638 \u0646\u0633\u062E\u0629 \u062A\u0642\u062F\u0631 \u062A\u0646\u0632\u0644\u0647\u0627).\nCancel = \u0627\u0631\u0641\u0639 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062C\u0647\u0627\u0632 \u0641\u0648\u0642 \u0627\u0644\u0631\u064A\u0628\u0648.", "The repo has data and this device has data too.\nOK = use the repo data (this device's data is kept as a downloadable copy).\nCancel = upload this device's data over the repo."))) {
          await applyRemote(remote, tt("\u0627\u062A\u0633\u062A\u062E\u062F\u0645\u062A \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0631\u064A\u0628\u0648", "Repo data was used"));
        } else {
          const p = await pushData(remote.sha);
          if (p.conflict) rerun = true;
        }
      } else if (remote.sha === meta.sha) {
        if (h !== meta.hash) {
          const p = await pushData(meta.sha);
          if (p.conflict) rerun = true;
        }
      } else {
        const dirty = h !== meta.hash;
        if (canon(syncState(remote.doc.state)) === h) {
          meta.sha = remote.sha;
          meta.hash = h;
          meta.lastSync = Date.now();
          saveMeta();
        } else if (!dirty) await applyRemote(remote, "");
        else {
          const remoteAt = Date.parse(remote.doc.savedAt) || 0;
          if (remoteAt >= (meta.changedAt || 0)) {
            await applyRemote(remote, "");
            conflictNote = tt("\u26A0 \u062A\u0639\u0627\u0631\u0636: \u0627\u062A\u0639\u062F\u0651\u0644 \u0645\u0646 \u062C\u0647\u0627\u0632\u064A\u0646. \u0627\u062A\u0627\u062E\u062F\u062A \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0623\u062D\u062F\u062B (\u0645\u0646 \u0627\u0644\u062C\u0647\u0627\u0632 \u0627\u0644\u062A\u0627\u0646\u064A) \u0648\u0646\u0633\u062E\u0629 \u0627\u0644\u062C\u0647\u0627\u0632 \u062F\u0647 \u0627\u062A\u062D\u0641\u0638\u062A \u0648\u062A\u0642\u062F\u0631 \u062A\u0646\u0632\u0644\u0647\u0627.", "\u26A0 Conflict: edited on two devices. The newer version (from the other device) was kept; this device's copy was saved and can be downloaded.");
          } else {
            const p = await pushData(remote.sha);
            if (p.conflict) rerun = true;
            conflictNote = tt("\u26A0 \u062A\u0639\u0627\u0631\u0636: \u0627\u062A\u0639\u062F\u0651\u0644 \u0645\u0646 \u062C\u0647\u0627\u0632\u064A\u0646. \u0627\u062A\u0627\u062E\u062F\u062A \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0623\u062D\u062F\u062B (\u0628\u062A\u0627\u0639\u0629 \u0627\u0644\u062C\u0647\u0627\u0632 \u062F\u0647) \u0648\u0627\u062A\u062D\u0641\u0638\u062A \u0641\u064A \u0627\u0644\u0631\u064A\u0628\u0648. \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0631\u064A\u0628\u0648 (commits).", "\u26A0 Conflict: edited on two devices. The newer version (this device) was kept and pushed. The older one is in the repo history (commits).");
          }
          conflictNote = conflictNote + " (" + (/* @__PURE__ */ new Date()).toLocaleTimeString() + ")";
        }
      }
      if (!rerun) await syncFiles();
      setStatus("idle");
      return true;
    } catch (e) {
      console.error(e);
      setStatus("error", e.message || String(e));
      return false;
    } finally {
      busy = false;
      if (rerun) {
        rerun = false;
        setTimeout(() => syncNow("rerun"), 500);
      }
    }
  }
  function onLocalChange() {
    if (applying || !meta.token) return;
    if (hashNow() === meta.hash) return;
    meta.changedAt = Date.now();
    saveMeta();
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => syncNow("auto"), PUSH_DELAY);
  }
  async function connect(owner, repo, token) {
    owner = (owner || "").trim();
    repo = (repo || "").trim();
    token = (token || "").trim();
    if (!owner || !repo || !token) throw new Error(tt("\u0627\u0645\u0644\u0627 \u0627\u0644\u062E\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0644\u0627\u062A\u0629", "Fill all three fields"));
    const prev2 = meta;
    meta = { token, owner, repo, sha: null, hash: null, changedAt: 0, lastSync: 0 };
    try {
      const r = await gh("GET", repoPath());
      if (r.status === 404 || r.status === 403 || r.status === 401) throw new Error(tt("\u0645\u0634 \u0642\u0627\u062F\u0631 \u0623\u062F\u062E\u0644 \u0639\u0644\u0649 \u0627\u0644\u0631\u064A\u0628\u0648. \u0627\u062A\u0623\u0643\u062F \u0645\u0646 \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u062A\u0648\u0643\u0646 \u0648\u0625\u0646\u0647 \u0645\u062F\u0651\u064A Contents \u0642\u0631\u0627\u0621\u0629 \u0648\u0643\u062A\u0627\u0628\u0629 \u0644\u0644\u0631\u064A\u0628\u0648 \u062F\u0647.", "Cannot reach the repo. Check the name, and that the token has Contents read and write on it."));
      if (!r.ok) throw new Error(await errOf(r));
      const j = await r.json();
      if (!j.private) throw new Error(tt("\u0627\u0644\u0631\u064A\u0628\u0648 \u062F\u0647 \u0639\u0627\u0645 (Public). \u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0644\u0627\u0632\u0645 \u062A\u062A\u062D\u0641\u0638 \u0641\u064A \u0631\u064A\u0628\u0648 \u062E\u0627\u0635 (Private).", "This repo is public. Your data must go to a private repo."));
      if (j.permissions && j.permissions.push === false) throw new Error(tt("\u0627\u0644\u062A\u0648\u0643\u0646 \u0645\u0641\u064A\u0647\u0648\u0634 \u0635\u0644\u0627\u062D\u064A\u0629 \u0643\u062A\u0627\u0628\u0629 \u0639\u0644\u0649 \u0627\u0644\u0631\u064A\u0628\u0648.", "The token has no write access to the repo."));
    } catch (e) {
      meta = prev2;
      throw e;
    }
    saveMeta();
    setStatus("idle");
    startPolling();
    return syncNow("connect");
  }
  function disconnect2() {
    meta = { token: "", owner: "", repo: "qari-data", sha: null, hash: null, changedAt: 0, lastSync: 0 };
    localStorage.removeItem(KEY2);
    clearTimeout(pushTimer);
    clearInterval(pollTimer);
    conflictBackup = null;
    lastNote = "";
    conflictNote = "";
    setStatus("off");
  }
  function dismissConflict() {
    conflictNote = "";
    emit();
  }
  function downloadConflictBackup() {
    if (!conflictBackup) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([conflictBackup], { type: "application/json" }));
    a.download = "qari-local-copy-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".json";
    a.click();
  }
  var savedDefaults = () => ({ owner: meta.owner, repo: meta.repo });
  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (document.visibilityState === "visible" && !busy) syncNow("poll");
    }, POLL_MS);
  }
  function init2() {
    try {
      const raw = localStorage.getItem(KEY2);
      if (raw) Object.assign(meta, JSON.parse(raw));
    } catch {
    }
    onChange(onLocalChange);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") syncNow("visible");
    });
    window.addEventListener("online", () => syncNow("online"));
    if (meta.token) {
      setStatus("idle");
      startPolling();
      syncNow("start");
    }
  }

  // src/app.js
  function pickBookFile(book) {
    return new Promise((resolve) => {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = ".epub,.pdf,.txt";
      inp.style.display = "none";
      document.body.appendChild(inp);
      const done = (v) => {
        inp.remove();
        resolve(v);
      };
      inp.addEventListener("cancel", () => done(null));
      inp.addEventListener("change", async () => {
        const file = inp.files && inp.files[0];
        if (!file) return done(null);
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        if (!["epub", "pdf", "txt"].includes(ext)) {
          toast("\u26A0 EPUB / PDF / TXT");
          return done(null);
        }
        try {
          const old = book.fileKey;
          const fileKey = "file-" + uid();
          await putFile(fileKey, file);
          updateBook(book.id, { format: ext, fileKey, fileName: file.name, source: book.source === "openlibrary" ? "openlibrary" : book.source });
          if (old) await deleteFile(old).catch(() => {
          });
          toast(getLang() === "ar" ? "\u2713 \u062A\u0645 \u0631\u0628\u0637 \u0645\u0644\u0641 \u0627\u0644\u0643\u062A\u0627\u0628" : "\u2713 Book file linked");
          done(getBook(book.id));
        } catch (e) {
          console.error(e);
          toast("\u26A0 " + (e.message || e));
          done(null);
        }
      });
      inp.click();
    });
  }
  async function startReadingBook(book) {
    if (book.fileKey && book.format !== "web") return openReader(book);
    const b = await pickBookFile(book);
    if (b) openReader(b);
  }
  var $8 = (sel, root = document) => root.querySelector(sel);
  var $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  function esc(s = "") {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function authorHTML(name) {
    const n = String(name || "").trim();
    return n && n !== "\u2014" ? `<span class="author-link" data-author="${esc(n)}" title="${getLang() === "ar" ? "\u0643\u0644 \u0643\u062A\u0628 \u0627\u0644\u0645\u0624\u0644\u0641" : "All books by this author"}">${esc(n)}</span>` : esc(n || "\u2014");
  }
  function openAuthor(name) {
    const n = String(name || "").trim();
    if (!n) return;
    location.hash = "#/author/" + encodeURIComponent(n);
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest(".author-link");
    if (!a || !a.dataset.author) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const ro = document.getElementById("readerOverlay");
    if (ro && !ro.classList.contains("hidden")) return;
    openAuthor(a.dataset.author);
  }, true);
  function toast(msg, ms = 2200) {
    const el = $8("#toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), ms);
  }
  function stars(rating, interactive = false, cb = null) {
    const wrap = document.createElement("span");
    wrap.className = "stars" + (interactive ? " interactive" : "");
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement("span");
      s.textContent = i <= rating ? "\u2605" : "\u2606";
      if (i > rating) s.classList.add("off");
      if (interactive) {
        s.dataset.v = i;
        s.onclick = () => cb && cb(i);
      }
      wrap.appendChild(s);
    }
    return wrap;
  }
  function hiCover(url) {
    if (!url || !/covers\.openlibrary\.org/.test(url)) return url || "";
    return url.replace(/-(S|M)\.jpg/, "-L.jpg").replace(/\?default=false/, "") + "?default=false";
  }
  var isbnCover = (isbn) => isbn ? `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(String(isbn).replace(/[^0-9Xx]/g, ""))}-L.jpg?default=false` : "";
  function placeholderHTML(title, icon = "\u{1F4D5}") {
    return `<div class="cover-fallback">${icon}<small>${esc(title || "")}</small></div>`;
  }
  function coverImgHTML(book, icon) {
    const src = hiCover(book.cover) || isbnCover(book.isbn);
    if (!src) return placeholderHTML(book.title, icon);
    return `<img class="cimg" src="${esc(src)}" alt="" loading="lazy" decoding="async" data-isbn="${esc(book.isbn || "")}" data-title="${esc(book.title || "")}" data-icon="${esc(icon || "\u{1F4D5}")}" data-tried="${hiCover(book.cover) ? "cover" : "isbn"}">`;
  }
  document.addEventListener("error", (e) => {
    const im = e.target;
    if (!(im instanceof HTMLImageElement) || !im.classList.contains("cimg")) return;
    const isbn = im.dataset.isbn;
    if (im.dataset.tried === "cover" && isbn) {
      im.dataset.tried = "isbn";
      im.src = isbnCover(isbn);
      return;
    }
    const d = document.createElement("div");
    d.innerHTML = placeholderHTML(im.dataset.title, im.dataset.icon);
    im.replaceWith(d.firstChild);
  }, true);
  var CKEY = "qari.covers.v1";
  var ccache = {};
  try {
    ccache = JSON.parse(localStorage.getItem(CKEY) || "{}");
  } catch {
  }
  var cq = Promise.resolve();
  function findCover(title, author) {
    const k = (title + "|" + author).toLowerCase();
    if (k in ccache) return Promise.resolve(ccache[k]);
    const job = cq.then(() => new Promise((r) => setTimeout(r, 120))).then(() => findCover1(title, author, k));
    cq = job.catch(() => {
    });
    return job;
  }
  async function findCover1(title, author, k) {
    try {
      const r = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=3&fields=cover_i,key`);
      const d = await r.json();
      const hit = (d.docs || []).find((x) => x.cover_i);
      ccache[k] = hit ? { cover: `https://covers.openlibrary.org/b/id/${hit.cover_i}-L.jpg`, olKey: (hit.key || "").replace("/works/", "") } : null;
      try {
        localStorage.setItem(CKEY, JSON.stringify(ccache));
      } catch {
      }
    } catch {
      return null;
    }
    return ccache[k];
  }
  function coverHTML(book, small = false) {
    return coverImgHTML(book, book.format === "pdf" ? "\u{1F4C4}" : book.format === "epub" ? "\u{1F4D5}" : "\u{1F4C3}");
  }
  function shelfName(s) {
    return { want: t("shelf_want"), reading: t("shelf_reading"), finished: t("shelf_finished") }[s] || s;
  }
  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(getLang() === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }
  function applySettings() {
    const s = getState().settings;
    document.body.dataset.theme = s.theme;
    document.documentElement.lang = s.lang;
    document.documentElement.dir = s.lang === "ar" ? "rtl" : "ltr";
    setLang(s.lang);
    applyI18n();
    $8("#addBookBtn").firstChild.textContent = "\uFF0B ";
  }
  onChange(() => {
  });
  var routes = {
    "": renderLibrary,
    "shelves": renderShelves,
    "stats": renderStatsRoute,
    "discover": renderDiscoverRoute,
    "community": renderCommunityRoute,
    "settings": renderSettings,
    "author": (v, a) => renderAuthorPage(v, a),
    "book": (v, a) => renderBookPage(v, a, "book"),
    "work": (v, a) => renderBookPage(v, a, "work"),
    "lists": renderLists
  };
  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    const [name, arg2] = hash.split("/");
    const fn = routes[name] || renderLibrary;
    $$("#mainnav a").forEach((a) => a.classList.toggle("active", a.dataset.route === (name || "library")));
    const view = $8("#view");
    view.innerHTML = "";
    window.scrollTo(0, 0);
    fn(view, arg2);
  }
  window.addEventListener("hashchange", route);
  var SORT_MODES = ["year-desc", "year-asc", "rating-desc", "rating-asc"];
  function sortLabel(mode) {
    return {
      "default": tr("\u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A", "Default"),
      "year-desc": tr("\u0627\u0644\u0623\u062D\u062F\u062B \u0625\u0635\u062F\u0627\u0631\u064B\u0627", "Newest release"),
      "year-asc": tr("\u0627\u0644\u0623\u0642\u062F\u0645 \u0625\u0635\u062F\u0627\u0631\u064B\u0627", "Oldest release"),
      "rating-desc": tr("\u0627\u0644\u0623\u0639\u0644\u0649 \u062A\u0642\u064A\u064A\u0645\u064B\u0627", "Highest rated"),
      "rating-asc": tr("\u0627\u0644\u0623\u0642\u0644 \u062A\u0642\u064A\u064A\u0645\u064B\u0627", "Lowest rated")
    }[mode] || mode;
  }
  function sortOptionsHTML(mode, withDefault = true) {
    const modes = (withDefault ? ["default"] : []).concat(SORT_MODES);
    return modes.map((m) => `<option value="${m}"${m === mode ? " selected" : ""}>${esc(sortLabel(m))}</option>`).join("");
  }
  function sortBooks(books, mode) {
    const cmp = (get, dir) => (a, b) => {
      const x = get(a), y = get(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (x - y) * dir;
    };
    const yr = (b) => {
      const y = parseInt(b.year, 10);
      return isNaN(y) ? null : y;
    };
    const rt = (b) => b.rating > 0 ? b.rating : null;
    if (mode === "year-desc") return books.slice().sort(cmp(yr, -1));
    if (mode === "year-asc") return books.slice().sort(cmp(yr, 1));
    if (mode === "rating-desc") return books.slice().sort(cmp(rt, -1));
    if (mode === "rating-asc") return books.slice().sort(cmp(rt, 1));
    return books;
  }
  function bookCard(b, onDelete = null) {
    const el = document.createElement("div");
    el.className = "book-card";
    el.innerHTML = `
    <div class="cover">${coverHTML(b)}</div>
    ${b.favorite ? '<span class="fav-badge">\u2764</span>' : ""}
    ${b.shelf !== "want" ? `<span class="shelf-badge">${esc(shelfName(b.shelf))}</span>` : ""}
    ${onDelete ? `<button class="del-btn" title="${tr("\u062D\u0630\u0641 \u0645\u0646 \u0627\u0644\u0645\u0643\u062A\u0628\u0629", "Remove from library")}">\u{1F5D1}</button>` : ""}
    <div class="book-meta">
      <div class="book-title">${esc(b.title)}</div>
      <div class="book-author">${authorHTML(b.author)}</div>
      <div class="prog-track"><div class="prog-fill" style="width:${Math.round(b.progress || 0)}%"></div></div>
      <button class="read-link" title="${tr("\u0627\u0642\u0631\u0627 \u0627\u0644\u0622\u0646", "Read now")}">\u{1F4D6} ${tr("\u0627\u0642\u0631\u0627", "Read")}</button>
    </div>`;
    el.querySelector(".read-link").onclick = (ev) => {
      ev.stopPropagation();
      startReadingBook(b);
    };
    el.onclick = () => {
      location.hash = "#/book/" + b.id;
    };
    if (onDelete) {
      el.querySelector(".del-btn").onclick = (ev) => {
        ev.stopPropagation();
        if (confirm(tr('\u062A\u062D\u0630\u0641 "', 'Remove "') + b.title + tr('" \u0645\u0646 \u0645\u0643\u062A\u0628\u062A\u0643\u061F (\u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0648\u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A \u0648\u0627\u0644\u0647\u0627\u064A\u0644\u0627\u064A\u062A\u0633 \u0628\u062A\u0648\u0639\u0647 \u0643\u0645\u0627\u0646)', '" from your library? Its rating, comments and highlights go too.'))) {
          removeBook(b.id);
          toast(tr("\u2713 \u0627\u062A\u062D\u0630\u0641", "\u2713 Removed"));
          onDelete();
        }
      };
    }
    return el;
  }
  var libFilter = { q: "", fav: false, sort: "default" };
  function renderLibrary(view) {
    const st = getState();
    view.innerHTML = `
    <div class="view-head"><h1>${t("navLibrary")}</h1><span class="muted">${st.books.filter((b) => b.shelf !== "finished").length} ${t("pages") === "\u0635\u0641\u062D\u0629" ? "\u0643\u062A\u0627\u0628" : "books"}</span></div>
    ${st.books.length === 0 ? `<div class="empty-state"><div class="big">\u{1F4DA}</div><h2>${t("emptyLib")}</h2><p>${t("emptyLibSub")}</p></div>` : `
    <div class="lib-filter"><input id="libQ" placeholder="${getLang() === "ar" ? "\u062F\u0648\u0651\u0631 \u0641\u064A \u0645\u0643\u062A\u0628\u062A\u0643\u2026" : "Search your library\u2026"}" value="${esc(libFilter.q)}">
      <button class="chip ${libFilter.fav ? "active" : ""}" id="favChip">\u2764 ${getLang() === "ar" ? "\u0627\u0644\u0645\u0641\u0636\u0644\u0629" : "Favorites"}</button>
      <select id="libSort" title="${getLang() === "ar" ? "\u0627\u0644\u062A\u0631\u062A\u064A\u0628" : "Sort"}">${sortOptionsHTML(libFilter.sort)}</select></div>`}
    <div id="readingRow"></div>
    <div class="grid" id="libGrid"></div>`;
    const paint = () => {
      const q = libFilter.q.trim().toLowerCase();
      const match = (b) => (!libFilter.fav || b.favorite) && (!q || (b.title + " " + (b.author || "")).toLowerCase().includes(q));
      const reading = sortBooks(st.books.filter((b) => b.shelf === "reading" && match(b)), libFilter.sort);
      const rest = sortBooks(st.books.filter((b) => b.shelf !== "reading" && b.shelf !== "finished" && match(b)), libFilter.sort);
      const row = $8("#readingRow", view);
      row.innerHTML = "";
      if (reading.length) {
        row.innerHTML = `<h2 style="margin-bottom:.7rem;font-size:1.1rem">\u25B6 ${t("continueReading")}</h2>`;
        const g = document.createElement("div");
        g.className = "grid";
        g.style.marginBottom = "1.6rem";
        reading.forEach((b) => g.appendChild(bookCard(b, paint)));
        row.appendChild(g);
      }
      const grid = $8("#libGrid", view);
      grid.innerHTML = "";
      rest.forEach((b) => grid.appendChild(bookCard(b, paint)));
    };
    paint();
    const qi = $8("#libQ", view);
    if (qi) qi.oninput = () => {
      libFilter.q = qi.value;
      paint();
    };
    const fc = $8("#favChip", view);
    if (fc) fc.onclick = () => {
      libFilter.fav = !libFilter.fav;
      fc.classList.toggle("active", libFilter.fav);
      paint();
    };
    const ls = $8("#libSort", view);
    if (ls) ls.onchange = () => {
      libFilter.sort = ls.value;
      paint();
    };
  }
  function renderShelves(view) {
    const st = getState();
    const groups = [["reading", t("shelf_reading")], ["want", t("shelf_want")], ["finished", t("shelf_finished")]];
    view.innerHTML = `<div class="view-head"><h1>${t("navShelves")}</h1></div>
    <div class="search-row" style="max-width:420px"><input id="newShelfName" placeholder="${t("shelfNamePh")}"><button id="newShelfBtn" class="btn">\uFF0B ${t("newShelf")}</button></div>
    <div id="shelfBlocks"></div>`;
    $8("#newShelfBtn", view).onclick = () => {
      const v = $8("#newShelfName", view).value.trim();
      if (v) {
        addCustomShelf(v);
        renderShelves(view);
      }
    };
    const host = $8("#shelfBlocks", view);
    let closed = [];
    try {
      closed = JSON.parse(localStorage.getItem("qari_shelves_closed") || "[]");
    } catch {
    }
    const renderBlock = (title, books, removable = null) => {
      const block = document.createElement("details");
      block.className = "shelf-block";
      const id = (removable ? "c:" : "s:") + title;
      block.open = !closed.includes(id);
      block.innerHTML = `<summary><span class="caret">\u25BE</span><h2>${esc(title)} <span class="count">(${books.length})</span></h2> ${removable ? `<button class="btn btn-danger" style="padding:.15rem .6rem;font-size:.75rem">${t("delete")}</button>` : ""}</summary>`;
      block.addEventListener("toggle", () => {
        closed = closed.filter((x) => x !== id);
        if (!block.open) closed.push(id);
        try {
          localStorage.setItem("qari_shelves_closed", JSON.stringify(closed));
        } catch {
        }
      });
      if (removable) block.querySelector("button").onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeCustomShelf(removable);
        renderShelves(view);
      };
      const grid = document.createElement("div");
      grid.className = "grid";
      books.forEach((b) => grid.appendChild(bookCard(b, () => renderShelves(view))));
      if (!books.length) grid.innerHTML = `<p class="muted">\u2014</p>`;
      block.appendChild(grid);
      host.appendChild(block);
    };
    groups.forEach(([key, label]) => renderBlock(label, st.books.filter((b) => b.shelf === key)));
    st.customShelves.forEach((cs) => renderBlock(cs, st.books.filter((b) => (b.customShelves || []).includes(cs)), cs));
  }
  function renderSettings(view) {
    const s = getState().settings;
    view.innerHTML = `
    <div class="view-head"><h1>${t("settings")}</h1></div>
    <div class="muted" style="font-size:.8rem;margin-bottom:.5rem">Qari v1.5.5</div>
    <div class="stat-card" style="max-width:520px">
      <div class="set-row"><span>${t("language")}</span>
        <div class="seg"><button data-lang="ar" class="${s.lang === "ar" ? "active" : ""}">\u0627\u0644\u0639\u0631\u0628\u064A\u0629</button><button data-lang="en" class="${s.lang === "en" ? "active" : ""}">English</button></div></div>
      <div class="set-row"><span>${t("theme")}</span>
        <div class="seg"><button data-th="light" class="${s.theme === "light" ? "active" : ""}">${t("themeLight")}</button><button data-th="sepia" class="${s.theme === "sepia" ? "active" : ""}">${t("themeSepia")}</button><button data-th="dark" class="${s.theme === "dark" ? "active" : ""}">${t("themeDark")}</button><button data-th="black" class="${s.theme === "black" ? "active" : ""}">${t("themeBlack")}</button></div></div>
      <div class="set-row"><span>${t("fontSize")}</span><input type="range" id="fsRange" min="15" max="28" value="${s.fontSize}"><span id="fsVal">${s.fontSize}</span></div>
      <div class="set-row"><span>${t("lineHeight")}</span><input type="range" id="lhRange" min="14" max="26" value="${Math.round(s.lineHeight * 10)}"><span id="lhVal">${s.lineHeight}</span></div>
      <div style="margin-bottom:.9rem"><div style="margin-bottom:.4rem;font-size:.9rem">${t("fontFamily")}</div><div id="fontHost"></div></div>
      <div class="set-row"><span>${t("readingMode")}</span>
        <div class="seg"><button data-flow="paginated" class="${s.flow === "paginated" ? "active" : ""}">${t("paginated")}</button><button data-flow="scrolled" class="${s.flow === "scrolled" ? "active" : ""}">${t("scrolled")}</button></div></div>
      <hr style="border:none;border-top:1px solid var(--border);margin:1rem 0">
      <div class="set-row" style="flex-wrap:wrap"><span>Google Books API key <span class="muted">(${getLang() === "ar" ? "\u0627\u062E\u062A\u064A\u0627\u0631\u064A\u060C \u0644\u0648 \u062A\u0642\u064A\u064A\u0645\u0627\u062A \u062C\u0648\u062C\u0644 \u0645\u0634 \u0638\u0627\u0647\u0631\u0629" : "optional, if Google ratings do not show"})</span></span><input id="gbKey" style="flex:1;min-width:200px" value="${esc(s.gbKey || "")}" placeholder="AIza\u2026"></div>
      <hr style="border:none;border-top:1px solid var(--border);margin:1rem 0">
      <div id="findSitesBox" class="stat-card"></div>
      <div id="dbBox" class="stat-card" style="margin-top:1rem"></div>
      <div id="syncBox" class="stat-card" style="margin-top:1rem"></div>
      <hr style="border:none;border-top:1px solid var(--border);margin:1rem 0">
      <div class="set-row"><span>${t("exportData")}</span><button id="exportBtn" class="btn">\u2B07 JSON</button></div>
      <div class="set-row"><span>${t("importData")}</span><button id="importBtn" class="btn">\u2B06 JSON</button></div>
      <p class="muted">${t("importNote")}</p>
      <input type="file" id="importFile" accept=".json" hidden>
    </div>`;
    const upd = (patch) => {
      Object.assign(getState().settings, patch);
      save();
      applySettings();
    };
    $$(".seg [data-lang]", view).forEach((b) => b.onclick = () => {
      upd({ lang: b.dataset.lang });
      route();
    });
    $$(".seg [data-th]", view).forEach((b) => b.onclick = () => {
      upd({ theme: b.dataset.th });
      renderSettings(view);
    });
    $$(".seg [data-flow]", view).forEach((b) => b.onclick = () => {
      upd({ flow: b.dataset.flow });
      renderSettings(view);
    });
    $8("#fsRange", view).oninput = (e) => {
      $8("#fsVal", view).textContent = e.target.value;
      upd({ fontSize: +e.target.value });
    };
    $8("#lhRange", view).oninput = (e) => {
      const v = (+e.target.value / 10).toFixed(1);
      $8("#lhVal", view).textContent = v;
      upd({ lineHeight: +v });
    };
    $8("#fontHost", view).appendChild(fontPicker(s.fontFamily, (id) => upd({ fontFamily: id })));
    {
      const fh = $8("#findSitesBox", view);
      const rf = () => renderFindSitesSettings(fh, rf);
      rf();
    }
    $8("#gbKey", view).oninput = (e) => upd({ gbKey: e.target.value.trim() });
    drawDbBox(view);
    drawSyncBox(view);
    $8("#exportBtn", view).onclick = () => {
      const blob = new Blob([exportJSON()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "qari-backup-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json";
      a.click();
      toast(t("exported"));
    };
    $8("#importBtn", view).onclick = () => $8("#importFile", view).click();
    $8("#importFile", view).onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        importJSON(await f.text());
        toast(t("imported"));
        route();
      } catch (err) {
        toast("\u26A0 " + err.message, 3500);
      }
    };
  }
  var dbText = () => {
    const ar = getLang() === "ar", i = info();
    const when = i.lastSaved ? i.lastSaved.toLocaleTimeString() : "";
    return {
      none: ar ? "\u26AA \u0645\u0641\u064A\u0634 \u0645\u0644\u0641 \u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0631\u0628\u0648\u0637" : "\u26AA No database file linked",
      ready: (ar ? "\u{1F7E2} \u0645\u062D\u0641\u0648\u0638 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0641\u064A " : "\u{1F7E2} Auto-saved to ") + i.name + (when ? " \xB7 " + when : ""),
      saving: ar ? "\u{1F7E1} \u0628\u064A\u062A\u062D\u0641\u0638\u2026" : "\u{1F7E1} Saving\u2026",
      "needs-permission": (ar ? "\u{1F7E0} \u0645\u062D\u062A\u0627\u062C \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629 \u0644\u0644\u0645\u0644\u0641 " : "\u{1F7E0} Permission needed for ") + i.name,
      error: "\u{1F534} " + i.lastError,
      unsupported: ar ? "\u26AA \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u062F\u0647 \u0645\u0628\u064A\u062F\u0639\u0645\u0634 \u0627\u0644\u062D\u0641\u0638 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0641\u064A \u0645\u0644\u0641\u060C \u0627\u0633\u062A\u062E\u062F\u0645 \u0646\u0633\u062E\u0629 \u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u064A\u062F\u0648\u064A\u0629" : "\u26AA This browser cannot auto-save to a file; use manual backup"
    }[i.status];
  };
  function updateDbChip() {
    const c = $8("#dbChip");
    if (!c) return;
    const i = info();
    c.textContent = { none: "\u{1F4BE}", ready: "\u{1F4BE}\u2713", saving: "\u{1F4BE}\u2026", "needs-permission": "\u{1F4BE}\u26A0", error: "\u{1F4BE}\u2715", unsupported: "\u{1F4BE}" }[i.status];
    c.title = dbText();
    c.dataset.s = i.status;
  }
  function drawDbBox(view) {
    const box = $8("#dbBox", view);
    if (!box) return;
    const ar = getLang() === "ar", i = info();
    const st = getState();
    box.innerHTML = `<h3 style="margin-bottom:.5rem">\u{1F4BE} ${ar ? "\u0645\u0644\u0641 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A" : "Database file"}</h3>
    <p class="muted" style="margin-bottom:.6rem">${ar ? "\u0645\u0644\u0641 \u0648\u0627\u062D\u062F (.qari) \u0639\u0644\u0649 \u062C\u0647\u0627\u0632\u0643 \u0641\u064A\u0647 \u0643\u0644 \u062D\u0627\u062C\u0629: \u0627\u0644\u0645\u0643\u062A\u0628\u0629\u060C \u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0643\u062A\u0628\u060C \u0627\u0644\u0642\u0648\u0627\u0626\u0645\u060C \u0627\u0644\u0645\u0641\u0636\u0644\u0629\u060C \u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A\u060C \u0627\u0644\u0647\u0627\u064A\u0644\u0627\u064A\u062A\u0633\u060C \u0627\u0644\u062A\u0642\u062F\u0645\u060C \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0648\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A. \u0628\u064A\u062A\u062D\u062F\u062B \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0628\u0639\u062F \u0623\u064A \u062A\u063A\u064A\u064A\u0631." : "One file (.qari) on your device holding everything: library, book files, lists, favorites, comments, highlights, progress, stats and settings. Updated automatically after every change."}</p>
    <div id="dbStatus" style="margin-bottom:.6rem;font-weight:600">${dbText()}</div>
    <div class="muted" style="margin-bottom:.6rem">${st.books.length} ${ar ? "\u0643\u062A\u0627\u0628" : "books"} \xB7 ${st.lists.length} ${ar ? "\u0642\u0648\u0627\u0626\u0645" : "lists"} \xB7 ${st.comments.length} ${ar ? "\u062A\u0639\u0644\u064A\u0642\u0627\u062A" : "comments"} \xB7 ${st.highlights.length} ${ar ? "\u0647\u0627\u064A\u0644\u0627\u064A\u062A" : "highlights"}</div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap">
      ${i.supported ? `<button id="dbCreate" class="btn btn-primary">\uFF0B ${ar ? "\u0625\u0646\u0634\u0627\u0621 \u0645\u0644\u0641 \u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A" : "Create database file"}</button><button id="dbOpen" class="btn">\u{1F4C2} ${ar ? "\u0641\u062A\u062D \u0645\u0644\u0641 \u0645\u0648\u062C\u0648\u062F (\u0627\u0633\u062A\u0631\u062C\u0627\u0639)" : "Open existing file (restore)"}</button>` : ""}
      ${i.status === "needs-permission" ? `<button id="dbGrant" class="btn btn-primary">${ar ? "\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062D\u0641\u0638" : "Re-enable saving"}</button>` : ""}
      ${i.name ? `<button id="dbSave" class="btn">${ar ? "\u062D\u0641\u0638 \u0627\u0644\u0622\u0646" : "Save now"}</button><button id="dbOff" class="btn btn-danger">${ar ? "\u0641\u0635\u0644 \u0627\u0644\u0645\u0644\u0641" : "Unlink"}</button>` : ""}
      <button id="dbDl" class="btn">\u2B07 ${ar ? "\u0646\u0633\u062E\u0629 \u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 (.qari)" : "Backup (.qari)"}</button>
      <button id="dbUp" class="btn">\u2B06 ${ar ? "\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0645\u0646 \u0645\u0644\u0641" : "Restore from file"}</button>
      <input type="file" id="dbUpIn" accept=".qari,.zip" hidden>
    </div>`;
    const redraw = () => drawDbBox(view);
    const guard = (fn) => async (...a) => {
      try {
        await fn(...a);
      } catch (e) {
        if (e && e.name !== "AbortError") toast("\u26A0 " + (e.message || e), 3500);
      }
      redraw();
    };
    const confirmRestore = () => confirm(ar ? "\u0627\u0644\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0647\u064A\u0633\u062A\u0628\u062F\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0641\u064A \u0627\u0644\u0645\u062A\u0635\u0641\u062D \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0644\u0641. \u0645\u062A\u0623\u0643\u062F\u061F" : "Restoring replaces the data currently in this browser with the file contents. Continue?");
    const b = (id) => $8(id, box);
    if (b("#dbCreate")) b("#dbCreate").onclick = guard(() => createFile());
    if (b("#dbOpen")) b("#dbOpen").onclick = guard(async () => {
      if (st.books.length && !confirmRestore()) return;
      const r = await openFile();
      applySettings();
      toast(`\u2713 ${r.books} ${ar ? "\u0643\u062A\u0627\u0628 \u0627\u062A\u0633\u062A\u0631\u062C\u0639\u0648\u0627" : "books restored"}`);
      route();
    });
    if (b("#dbGrant")) b("#dbGrant").onclick = guard(() => grant());
    if (b("#dbSave")) b("#dbSave").onclick = guard(async () => {
      await saveNow();
      toast("\u2713");
    });
    if (b("#dbOff")) b("#dbOff").onclick = guard(() => disconnect());
    b("#dbDl").onclick = guard(() => downloadBackup());
    b("#dbUp").onclick = () => b("#dbUpIn").click();
    b("#dbUpIn").onchange = guard(async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (st.books.length && !confirmRestore()) return;
      const r = await restoreFrom(f);
      applySettings();
      toast(`\u2713 ${r.books} ${ar ? "\u0643\u062A\u0627\u0628 \u0627\u062A\u0633\u062A\u0631\u062C\u0639\u0648\u0627" : "books restored"}`);
      route();
    });
  }
  var syncText = () => {
    const ar = getLang() === "ar", i = info2();
    const when = i.lastSync ? new Date(i.lastSync).toLocaleString() : "";
    if (!i.connected) return ar ? "\u26AA \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0645\u0634 \u0645\u062A\u0648\u0635\u0644\u0629" : "\u26AA Sync is not connected";
    if (i.status === "syncing") return ar ? "\u{1F7E1} \u0628\u064A\u0632\u0627\u0645\u0646\u2026" : "\u{1F7E1} Syncing\u2026";
    if (i.status === "error") return "\u{1F534} " + i.error;
    return (ar ? "\u{1F7E2} \u0645\u062A\u0632\u0627\u0645\u0646 \u0645\u0639 " : "\u{1F7E2} Synced with ") + i.owner + "/" + i.repo + (when ? " \xB7 " + when : "");
  };
  function updateSyncUi() {
    const c = $8("#syncChip");
    const i = info2();
    if (c) {
      c.style.display = i.connected ? "" : "none";
      c.textContent = { idle: "\u2601\u2713", syncing: "\u2601\u2026", error: "\u2601\u2715", off: "\u2601" }[i.status] || "\u2601";
      c.title = syncText();
      c.dataset.s = i.status;
    }
    const sb = $8("#syncStatus");
    if (sb) sb.textContent = syncText();
    const sn = $8("#syncNote");
    if (sn) sn.textContent = i.note || "";
    let bn = $8("#syncBanner");
    if (i.conflictNote) {
      if (!bn) {
        bn = document.createElement("div");
        bn.id = "syncBanner";
        bn.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#b45309;color:#fff;padding:.6rem .8rem;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;font-size:.9rem";
        document.body.appendChild(bn);
      }
      const ar = getLang() === "ar";
      bn.innerHTML = `<span style="flex:1;min-width:200px"></span>${i.hasConflictBackup ? `<button class="btn" id="syncBakBtn">${ar ? "\u0646\u0632\u0651\u0644 \u0646\u0633\u062E\u0629 \u0627\u0644\u062C\u0647\u0627\u0632" : "Download this device copy"}</button>` : ""}<button class="btn" id="syncOkBtn">${ar ? "\u062A\u0645\u0627\u0645" : "OK"}</button>`;
      bn.firstChild.textContent = i.conflictNote;
      const bk = bn.querySelector("#syncBakBtn");
      if (bk) bk.onclick = () => downloadConflictBackup();
      bn.querySelector("#syncOkBtn").onclick = () => dismissConflict();
    } else if (bn) bn.remove();
  }
  function drawSyncBox(view) {
    const box = $8("#syncBox", view);
    if (!box) return;
    const ar = getLang() === "ar", i = info2(), d = savedDefaults();
    box.innerHTML = `<h3 style="margin-bottom:.5rem">\u2601 ${ar ? "\u0645\u0632\u0627\u0645\u0646\u0629 \u0628\u064A\u0646 \u0627\u0644\u0623\u062C\u0647\u0632\u0629 (GitHub)" : "Sync across devices (GitHub)"}</h3>
    <p class="muted" style="margin-bottom:.6rem">${ar ? "\u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u062E\u062A\u064A\u0627\u0631\u064A\u0629. \u0644\u0645\u0627 \u062A\u0634\u063A\u0651\u0644\u0647\u0627 \u0628\u064A\u062A\u0631\u0641\u0639 \u0644\u0644\u0631\u064A\u0628\u0648 \u0627\u0644\u062E\u0627\u0635 (Private) \u0627\u0644\u0644\u064A \u0627\u0646\u062A \u0627\u062E\u062A\u0631\u062A\u0647 \u0639\u0644\u0649 GitHub: \u0627\u0644\u0645\u0643\u062A\u0628\u0629 \u0648\u0627\u0644\u062A\u0642\u062F\u0645 \u0648\u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A \u0648\u0627\u0644\u0647\u0627\u064A\u0644\u0627\u064A\u062A\u0633 \u0648\u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0648\u0627\u0644\u0642\u0648\u0627\u0626\u0645 \u0648\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0648\u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0643\u062A\u0628 \u0648\u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u0644\u064A \u0636\u0641\u062A\u0647\u0627\u060C \u0648\u0628\u064A\u062D\u062F\u0651\u062B\u0647\u0627 \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627. \u0645\u0633\u062D \u062D\u0627\u062C\u0629 \u0641\u064A \u0642\u0627\u0631\u0626 \u0645\u0634 \u0628\u064A\u0645\u0633\u062D \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0642\u062F\u064A\u0645\u0629 \u0627\u0644\u0644\u064A \u0627\u062A\u0631\u0641\u0639\u062A \u0642\u0628\u0644 \u0643\u062F\u0647: \u0647\u062A\u0641\u0636\u0644 \u0641\u064A \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0631\u064A\u0628\u0648 (commits) \u0644\u062D\u062F \u0645\u0627 \u062A\u0645\u0633\u062D\u0647\u0627 \u0627\u0646\u062A \u0645\u0646 GitHub. \u0644\u0648 \u0627\u062A\u0639\u062F\u0651\u0644 \u0645\u0646 \u062C\u0647\u0627\u0632\u064A\u0646 \u0641\u064A \u0646\u0641\u0633 \u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0623\u062D\u062F\u062B \u0628\u062A\u0643\u0633\u0628 \u0648\u0628\u062A\u0638\u0647\u0631\u0644\u0643 \u0631\u0633\u0627\u0644\u0629. \u0627\u0644\u062A\u0648\u0643\u0646 \u0628\u064A\u062A\u062E\u0632\u0646 \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632 \u062F\u0647 \u0628\u0633." : "Sync is optional. When you turn it on, it uploads to the private GitHub repo you chose: library, progress, comments, highlights, notes, lists, settings, book files and images you added, and keeps them updated. Deleting something in Qari does not erase copies uploaded earlier: they stay in the repo history (commits) until you delete them on GitHub. If two devices edit at once the newer version wins and you get a warning. The token is stored on this device only."}</p>
    <div id="syncStatus" style="margin-bottom:.4rem;font-weight:600">${esc(syncText())}</div>
    <div id="syncNote" class="muted" style="margin-bottom:.6rem"></div>
    ${i.connected ? `<div style="display:flex;gap:.5rem;flex-wrap:wrap"><button id="syncNow" class="btn btn-primary">${ar ? "\u0632\u0627\u0645\u0646 \u0627\u0644\u0622\u0646" : "Sync now"}</button><button id="syncOff" class="btn btn-danger">${ar ? "\u0641\u0635\u0644 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629" : "Disconnect"}</button></div>` : `<div style="display:grid;gap:.5rem;max-width:420px">
        <input id="syncOwner" placeholder="GitHub username" value="${esc(d.owner || "asratereg-glitch")}" autocomplete="off">
        <input id="syncRepo" placeholder="repo" value="${esc(d.repo || "qari-data")}" autocomplete="off">
        <input id="syncToken" type="password" placeholder="${ar ? "\u0627\u0644\u062A\u0648\u0643\u0646 (github_pat_\u2026)" : "Token (github_pat_\u2026)"}" autocomplete="off">
        <button id="syncGo" class="btn btn-primary">${ar ? "\u062A\u0648\u0635\u064A\u0644 \u0648\u0628\u062F\u0621 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629" : "Connect and start syncing"}</button></div>`}`;
    const guard = (fn) => async () => {
      try {
        await fn();
      } catch (e) {
        toast("\u26A0 " + (e.message || e), 5e3);
      }
      drawSyncBox(view);
      updateSyncUi();
    };
    const go = $8("#syncGo", box);
    if (go) go.onclick = guard(async () => {
      go.disabled = true;
      await connect($8("#syncOwner", box).value, $8("#syncRepo", box).value, $8("#syncToken", box).value);
      const e = info2();
      toast(e.status === "error" ? "\u26A0 " + e.error : "\u2713", 3e3);
    });
    const sn = $8("#syncNow", box);
    if (sn) sn.onclick = guard(async () => {
      await syncNow("manual");
      const e = info2();
      toast(e.status === "error" ? "\u26A0 " + e.error : "\u2713", 3e3);
    });
    const so = $8("#syncOff", box);
    if (so) so.onclick = guard(async () => {
      if (confirm(ar ? "\u0641\u0635\u0644 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629\u061F \u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632 \u0648\u0627\u0644\u0631\u064A\u0628\u0648 \u0647\u062A\u0641\u0636\u0644 \u0632\u064A \u0645\u0627 \u0647\u064A." : "Disconnect sync? Data on this device and in the repo stays as is.")) disconnect2();
    });
    updateSyncUi();
  }
  function renderStatsRoute(view) {
    renderStats(view);
  }
  function renderDiscoverRoute(view) {
    renderDiscover(view);
    bindDiscover(view);
  }
  function renderCommunityRoute(view) {
    renderCommunity(view);
    bindCommunity(view);
  }
  function openAddModal() {
    const m = $8("#addModal");
    m.classList.remove("hidden");
    $$(".modal-tabs .tab", m).forEach((tabBtn) => tabBtn.onclick = () => {
      $$(".modal-tabs .tab", m).forEach((x) => x.classList.toggle("active", x === tabBtn));
      $8("#pane-file", m).classList.toggle("hidden", tabBtn.dataset.tab !== "file");
      $8("#pane-online", m).classList.toggle("hidden", tabBtn.dataset.tab !== "online");
    });
  }
  function closeAddModal() {
    $8("#addModal").classList.add("hidden");
  }
  async function handleFile(file) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["epub", "pdf", "txt"].includes(ext)) {
      toast("\u26A0 EPUB / PDF / TXT");
      return;
    }
    const fileKey = "file-" + uid();
    await putFile(fileKey, file);
    let meta2 = { title: file.name.replace(/\.(epub|pdf|txt)$/i, ""), author: "", cover: "", subjects: [] };
    if (ext === "epub") {
      try {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const containerXml = await zip.file("META-INF/container.xml").async("text");
        const m = /full-path="([^"]+)"/.exec(containerXml);
        const opfPath = m ? m[1] : "OEBPS/content.opf";
        const opf = await zip.file(opfPath).async("text");
        const doc = new DOMParser().parseFromString(opf, "application/xml");
        const getMeta2 = (tag) => {
          const el = doc.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", tag)[0] || doc.getElementsByTagName("dc:" + tag)[0];
          return el ? el.textContent.trim() : "";
        };
        if (getMeta2("title")) meta2.title = getMeta2("title");
        if (getMeta2("creator")) meta2.author = getMeta2("creator");
        const items = [...doc.getElementsByTagName("item")];
        let coverHref = "";
        const metaCover = [...doc.getElementsByTagName("meta")].find((x) => x.getAttribute("name") === "cover");
        if (metaCover) {
          const it = items.find((x) => x.getAttribute("id") === metaCover.getAttribute("content"));
          if (it) coverHref = it.getAttribute("href");
        }
        if (!coverHref) {
          const it = items.find((x) => (x.getAttribute("properties") || "").includes("cover-image"));
          if (it) coverHref = it.getAttribute("href");
        }
        if (coverHref) {
          const base = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
          const cf = zip.file(base + coverHref) || zip.file(coverHref);
          if (cf) {
            const blob = await cf.async("blob");
            meta2.cover = await new Promise((res) => {
              const fr = new FileReader();
              fr.onload = () => res(fr.result);
              fr.onerror = () => res("");
              fr.readAsDataURL(blob);
            });
          }
        }
      } catch (e) {
        console.warn("epub meta read failed", e);
      }
    }
    const b = addBook({ ...meta2, format: ext, fileKey, source: "local", shelf: "want" });
    toast(t("added"));
    closeAddModal();
    location.hash = "#/book/" + b.id;
  }
  async function runOnlineSearch() {
    const q = $8("#onlineQuery").value.trim();
    if (!q) return;
    const host = $8("#onlineResults");
    host.innerHTML = `<p class="muted">${t("loading")}</p>`;
    try {
      const items = await searchOpenLibrary(q);
      host.innerHTML = items.length ? "" : `<p class="muted">${t("noResults")}</p>`;
      items.forEach((it) => {
        const row = document.createElement("div");
        row.className = "result-row";
        row.style.cursor = "pointer";
        row.innerHTML = `${it.cover ? `<img src="${esc(it.cover)}" alt="">` : `<div style="width:42px;height:62px;background:var(--border);border-radius:4px;display:flex;align-items:center;justify-content:center">\u{1F4D5}</div>`}
        <div class="r-info"><div class="r-title">${esc(it.title)}</div><div class="r-author">${esc(it.author)} ${it.year ? "\xB7 " + it.year : ""}</div></div>
        <button class="btn btn-primary" style="padding:.3rem .8rem;font-size:.8rem">${t("addToLibrary")}</button>`;
        row.onclick = () => {
          if (it.olKey) {
            closeAddModal();
            location.hash = "#/work/" + it.olKey;
          }
        };
        row.querySelector("button").onclick = (ev) => {
          ev.stopPropagation();
          const b = addBook({ title: it.title, author: it.author, format: "web", cover: it.cover || "", source: "openlibrary", subjects: it.subjects || [], isbn: it.isbn || "", olKey: it.olKey || "", year: it.year || "", shelf: "want" });
          row.querySelector("button").textContent = t("added");
          row.querySelector("button").disabled = true;
          setTimeout(() => {
            closeAddModal();
            location.hash = "#/book/" + b.id;
          }, 500);
        };
        host.appendChild(row);
      });
    } catch (e) {
      host.innerHTML = `<p class="muted">\u26A0 ${esc(e.message)}</p>`;
    }
  }
  function setDevice() {
    const w = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth), h = window.innerHeight;
    const d = w < 700 ? "phone" : w < 1100 ? "tablet" : "desktop";
    const de = document.documentElement;
    de.dataset.device = d;
    de.dataset.orient = w >= h ? "landscape" : "portrait";
    document.body && (document.body.dataset.device = d);
  }
  setDevice();
  window.addEventListener("resize", setDevice);
  window.addEventListener("orientationchange", setDevice);
  async function boot() {
    load();
    applySettings();
    const chip2 = document.createElement("button");
    chip2.id = "dbChip";
    chip2.className = "icon-btn";
    $8("#topbar").appendChild(chip2);
    chip2.onclick = async () => {
      const i = info();
      if (i.status === "needs-permission") {
        try {
          await grant();
        } catch {
        }
      } else location.hash = "#/settings";
    };
    onStatus(() => {
      updateDbChip();
      const sb = $8("#dbStatus");
      if (sb) sb.textContent = dbText();
    });
    await init();
    updateDbChip();
    const sc = document.createElement("button");
    sc.id = "syncChip";
    sc.className = "icon-btn";
    sc.style.display = "none";
    sc.onclick = () => {
      location.hash = "#/settings";
    };
    $8("#topbar").appendChild(sc);
    configure({ lang: getLang, onApplied: () => {
      applySettings();
      route();
    } });
    onStatus2(updateSyncUi);
    init2();
    updateSyncUi();
    $8("#addBookBtn").onclick = openAddModal;
    $$("#addModal .modal-close").forEach((b) => b.onclick = closeAddModal);
    $8("#addModal").addEventListener("click", (e) => {
      if (e.target.id === "addModal") closeAddModal();
    });
    $8("#dropzone").onclick = () => $8("#fileInput").click();
    $8("#fileInput").onchange = (e) => {
      const f = e.target.files[0];
      if (f) handleFile(f);
      e.target.value = "";
    };
    $8("#dropzone").addEventListener("dragover", (e) => e.preventDefault());
    $8("#dropzone").addEventListener("drop", (e) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    });
    $8("#onlineSearchBtn").onclick = runOnlineSearch;
    $8("#onlineQuery").addEventListener("keydown", (e) => {
      if (e.key === "Enter") runOnlineSearch();
    });
    route();
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      const hadSW = !!navigator.serviceWorker.controller;
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hadSW && !reloaded) {
          reloaded = true;
          location.reload();
        }
      });
      navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((r) => {
        r.update().catch(() => {
        });
        setInterval(() => {
          if (document.visibilityState === "visible") r.update().catch(() => {
          });
        }, 18e5);
      }).catch(() => {
      });
    }
    setTimeout(() => {
      const sp = $8("#splash");
      sp.style.opacity = "0";
      setTimeout(() => sp.remove(), 450);
    }, 500);
  }
  boot();
})();
