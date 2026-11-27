// tts.js — read-aloud voice selection for Qari
// Lists the voices the device exposes, scores them so natural/neural ones win,
// remembers one voice per language, and works out which language a book is in.

const NATURAL_RE = /natural|neural|online|premium|enhanced|siri/i;
const ROBOTIC_RE = /hoda|naayf|compact|espeak|festival|pico/i;

export function voices() {
  try { return (window.speechSynthesis && window.speechSynthesis.getVoices()) || []; }
  catch { return []; }
}

// voice lists arrive asynchronously on most browsers (first getVoices() is often empty)
export function onVoices(cb) {
  if (!window.speechSynthesis) return () => {};
  const fire = () => cb(voices());
  window.speechSynthesis.addEventListener('voiceschanged', fire);
  if (!voices().length) setTimeout(fire, 400);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', fire);
}

export function waitVoices(ms = 1500) {
  return new Promise(res => {
    if (voices().length) return res(voices());
    let done = false;
    let stop = () => {};
    const finish = v => { if (done) return; done = true; stop(); res(v); };
    stop = onVoices(v => { if (v.length) finish(v); });
    setTimeout(() => finish(voices()), ms);
  });
}

export const baseLang = l => String(l || '').toLowerCase().replace('_', '-').split('-')[0];

export function quality(v) {
  if (!v) return -1e9;
  const name = (v.name || '') + ' ' + (v.voiceURI || '');
  let s = 0;
  if (NATURAL_RE.test(name)) s += 100;
  if (ROBOTIC_RE.test(name)) s -= 40;
  if (/google/i.test(name)) s += 30;
  if (v.localService === false) s += 15;   // cloud voices are usually the better ones
  if (v.default) s += 5;
  return s;
}

export const isNatural = v => !!v && NATURAL_RE.test((v.name || '') + ' ' + (v.voiceURI || ''));

// which language is this text in: Arabic letters vs Latin letters
export function detectLang(text) {
  const t = String(text || '');
  const ar = (t.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length;
  const lat = (t.match(/[A-Za-z]/g) || []).length;
  if (!ar && !lat) return '';
  if (!ar) return 'en';
  if (!lat) return 'ar';
  return ar >= lat * 0.5 ? 'ar' : 'en';   // Arabic-first app: mixed pages lean Arabic
}

export function langScore(v, lang) {
  const L = baseLang(lang);
  let s = quality(v);
  if (!L) return s;
  const vl = String(v.lang || '').toLowerCase().replace('_', '-');
  if (vl === L) s += 12;
  else if (vl.startsWith(L + '-')) s += 10;
  else if (baseLang(vl) === L) s += 8;
  if (L === 'ar' && /^ar-eg/.test(vl)) s += 25;   // Egyptian first for Arabic books
  return s;
}

export function voicesFor(lang) {
  const L = baseLang(lang);
  return voices()
    .filter(v => !L || baseLang(v.lang) === L)
    .slice()
    .sort((a, b) => langScore(b, lang) - langScore(a, lang));
}

// saved choice for this language, else the best voice that language has,
// else the best voice on the device (so reading still works)
export function pickVoice(lang, preferURI) {
  const all = voices();
  if (!all.length) return null;
  const L = baseLang(lang);
  if (preferURI) {
    const p = all.find(v => v.voiceURI === preferURI || v.name === preferURI);
    if (p && (!L || baseLang(p.lang) === L)) return p;
  }
  const pool = voicesFor(lang);
  if (pool.length) return pool[0];
  return all.slice().sort((a, b) => quality(b) - quality(a))[0] || null;
}

export function sampleFor(lang) {
  return baseLang(lang) === 'ar'
    ? 'ده شكل الصوت الجديد في قارئ. جرّب السرعة لو عايزها أسرع أو أبطأ.'
    : 'This is how your book will sound in Qari. Try another speed if you like it faster or slower.';
}

export function preview(voice, lang, rate = 1) {
  if (!window.speechSynthesis) return null;
  try { window.speechSynthesis.cancel(); } catch {}
  const u = new SpeechSynthesisUtterance(sampleFor(lang));
  if (voice) u.voice = voice;
  u.lang = (voice && voice.lang) || (baseLang(lang) === 'ar' ? 'ar-EG' : 'en-US');
  u.rate = rate || 1;
  try { window.speechSynthesis.speak(u); } catch {}
  return u;
}

export function langLabel(lang) {
  const L = baseLang(lang);
  if (!L) return '';
  try {
    const uiLang = document.documentElement.lang || 'ar';
    const dn = new Intl.DisplayNames([uiLang], { type: 'language' });
    return dn.of(L) || L;
  } catch { return L; }
}
