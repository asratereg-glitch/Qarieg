// fonts.js — reading fonts (all bundled locally under /fonts, work offline)
import { getLang } from './i18n.js';

// [id, css family, label ar, label en, weights available, filePrefix, script]
const DEFS = [
  ['auto', "'Amiri', Georgia, serif", 'تلقائي (أميري)', 'Auto (Amiri)', null, null, 'ar'],
  ['amiri', "'Amiri', Georgia, serif", 'أميري (نسخ كلاسيكي)', 'Amiri (classic naskh)', null, null, 'ar'],
  ['naskh', "'Noto Naskh Arabic', Georgia, serif", 'نوتو نسخ', 'Noto Naskh', 'noto-naskh-arabic', 'Noto Naskh Arabic', 'ar'],
  ['schehe', "'Scheherazade New', Georgia, serif", 'شهرزاد', 'Scheherazade New', 'scheherazade-new', 'Scheherazade New', 'ar'],
  ['lateef', "'Lateef', Georgia, serif", 'لطيف (نستعليق خفيف)', 'Lateef', 'lateef', 'Lateef', 'ar'],
  ['markazi', "'Markazi Text', Georgia, serif", 'مركزي', 'Markazi Text', 'markazi-text', 'Markazi Text', 'ar'],
  ['messiri', "'El Messiri', Georgia, serif", 'المسيري', 'El Messiri', 'el-messiri', 'El Messiri', 'ar'],
  ['cairo', "'Cairo', system-ui, sans-serif", 'القاهرة (سان سيريف)', 'Cairo (sans)', null, null, 'ar'],
  ['tajawal', "'Tajawal', system-ui, sans-serif", 'تجوال', 'Tajawal (sans)', 'tajawal', 'Tajawal', 'ar'],
  ['almarai', "'Almarai', system-ui, sans-serif", 'المرعي', 'Almarai (sans)', 'almarai', 'Almarai', 'ar'],
  ['kufi', "'Noto Kufi Arabic', system-ui, sans-serif", 'نوتو كوفي', 'Noto Kufi', 'noto-kufi-arabic', 'Noto Kufi Arabic', 'ar'],
  ['lora', "'Lora', Georgia, serif", 'Lora (إنجليزي سيريف)', 'Lora (serif)', 'lora', 'Lora', 'en'],
  ['georgia', "Georgia, 'Times New Roman', serif", 'جورجيا', 'Georgia', null, null, 'en'],
  ['system', "system-ui, 'Segoe UI', sans-serif", 'خط النظام', 'System sans', null, null, 'en'],
];
export const FONTS = DEFS.map(d => ({ id: d[0], stack: d[1], ar: d[2], en: d[3], prefix: d[4], family: d[5], script: d[6] }));

export function fontStack(id) {
  const f = FONTS.find(x => x.id === id) || FONTS[0];
  return f.stack;
}
export function fontLabel(f) { return getLang() === 'ar' ? f.ar : f.en; }

// CSS @font-face text for the EPUB iframe (it cannot see the page's stylesheet).
export function fontFaceCSS() {
  const base = new URL('fonts/', document.baseURI).href;
  const faces = [];
  const add = (family, file, w) => faces.push(`@font-face{font-family:'${family}';src:url('${base}${file}') format('woff2');font-weight:${w};font-display:swap}`);
  [400, 700].forEach(w => add('Amiri', `amiri-arabic-${w}-normal.woff2`, w));
  [400, 600, 700].forEach(w => add('Cairo', `cairo-arabic-${w}-normal.woff2`, w));
  FONTS.filter(f => f.prefix).forEach(f => {
    const script = f.script === 'en' ? 'latin' : 'arabic';
    [400, 700].forEach(w => add(f.family, `${f.prefix}-${script}-${w}-normal.woff2`, w));
  });
  return faces.join('\n');
}

// Shared <select> + live preview. onPick(id) is called on change.
export function fontPicker(current, onPick) {
  const wrap = document.createElement('div');
  wrap.className = 'font-picker';
  const sample = getLang() === 'ar' ? 'في البدء كانت الكلمة، وكانت الكلمة جميلة. Reading is fun 123' : 'The quick brown fox jumps over the lazy dog. في البدء كانت الكلمة';
  wrap.innerHTML = `<div class="font-grid"></div><div class="font-preview" dir="auto"></div>`;
  const grid = wrap.querySelector('.font-grid'), prev = wrap.querySelector('.font-preview');
  const paint = id => {
    prev.style.fontFamily = fontStack(id); prev.textContent = sample;
    grid.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.font === id));
  };
  FONTS.forEach(f => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.font = f.id; b.className = 'font-opt';
    b.style.fontFamily = f.stack; b.textContent = fontLabel(f);
    b.onclick = () => { paint(f.id); onPick(f.id); };
    grid.appendChild(b);
  });
  paint(current || 'auto');
  return wrap;
}
