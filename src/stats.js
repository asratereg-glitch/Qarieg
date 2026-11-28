// stats.js — goals, streak, badges, charts, yearly summary
import * as store from './store.js';
import * as auth from './auth.js';
import { t, getLang } from './i18n.js';
import { esc, stars, coverHTML, toast } from './app.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* Display name for the greeting: an edited profile name wins; otherwise the
   Google full name (profile falls back to the email prefix for Google users),
   then the profile name / email prefix. Logged out -> no greeting. */
function displayName() {
  const user = auth.getUser();
  if (!user) return '';
  const profile = auth.getProfile();
  const meta = user.user_metadata || {};
  const emailPrefix = (user.email || '').split('@')[0];
  const profileName = (profile && profile.display_name || '').trim();
  const metaName = (meta.display_name || meta.full_name || meta.name || '').trim();
  if (profileName && profileName !== emailPrefix) return profileName;
  if (metaName) return metaName;
  return profileName || emailPrefix;
}

export function renderStats(view) {
  const st = store.getState();
  const s = st.settings;
  const year = new Date().getFullYear();
  const doneYear = store.finishedThisYear(year);
  const doneMonth = store.finishedThisMonth();
  const sessionsY = store.sessionsThisYear(year);
  const totalMin = sessionsY.reduce((a, x) => a + x.minutes, 0);
  const totalPages = sessionsY.reduce((a, x) => a + (x.pages || 0), 0);
  const todayMin = st.readingDays[new Date().toISOString().slice(0, 10)] || 0;
  const streak = store.currentStreak();
  const pph = totalMin > 0 ? Math.round(totalPages / (totalMin / 60)) : 0;
  const name = displayName();

  view.innerHTML = `
    <div class="view-head"><h1>${t('navStats')}</h1><button id="editGoals" class="btn">✏ ${t('setGoals')}</button></div>
    ${name ? `<p style="font-size:1.1rem;font-weight:600;margin-bottom:1rem">${t('helloUser').replace('{name}', esc(name))}</p>` : ''}
    <div class="stat-cards">
      <div class="stat-card"><div class="lbl">${t('yearlyGoal')} (${year})</div><div class="num">${doneYear.length} / ${s.goalYear}</div>
        <div class="goal-track"><div class="goal-fill" style="width:${Math.min(100, doneYear.length / Math.max(1, s.goalYear) * 100)}%"></div></div></div>
      <div class="stat-card"><div class="lbl">${t('monthlyGoal')}</div><div class="num">${doneMonth.length} / ${s.goalMonth}</div>
        <div class="goal-track"><div class="goal-fill" style="width:${Math.min(100, doneMonth.length / Math.max(1, s.goalMonth) * 100)}%"></div></div></div>
      <div class="stat-card"><div class="lbl">${t('streakDays')}</div><div class="num">🔥 ${streak}</div></div>
      <div class="stat-card"><div class="lbl">${t('todayMin')}</div><div class="num">${todayMin}</div></div>
      <div class="stat-card"><div class="lbl">${t('totalMin')} (${year})</div><div class="num">${totalMin}</div></div>
      <div class="stat-card"><div class="lbl">${t('pagesPerHour')}</div><div class="num">${pph}</div></div>
    </div>
    <h2 style="margin-bottom:.5rem">${t('badges')}</h2>
    <div class="badges" id="badgeRow"></div>
    <div class="chart-box"><h3 style="margin-bottom:.6rem">${t('weeklyChart')}</h3><canvas id="daysChart" width="1000" height="220"></canvas></div>
    <div class="chart-box"><h3 style="margin-bottom:.6rem">${t('yearlySummary')} ${year}</h3><div id="yearSummary"></div></div>
    <div class="chart-box"><h3 style="margin-bottom:.6rem">${t('topBooks')}</h3><div id="topBooks"></div></div>`;

  $('#editGoals', view).onclick = () => {
    const y = prompt(t('yearlyGoal'), s.goalYear); if (y === null) return;
    const m = prompt(t('monthlyGoal'), s.goalMonth); if (m === null) return;
    store.getState().settings.goalYear = Math.max(1, parseInt(y) || s.goalYear);
    store.getState().settings.goalMonth = Math.max(1, parseInt(m) || s.goalMonth);
    store.recheckAchievements(); renderStats(view);
    if (doneYear.length >= store.getState().settings.goalYear) toast(t('goalDone'), 4000);
  };

  const badgeRow = $('#badgeRow', view);
  store.badgeList().forEach(b => {
    const d = document.createElement('div');
    d.className = 'badge' + (b.unlocked ? '' : ' locked');
    d.innerHTML = `<div class="b-icon">${b.icon}</div><div class="b-name">${esc(b.name[getLang()] || b.name.ar)}</div>`;
    badgeRow.appendChild(d);
  });

  drawDaysChart($('#daysChart', view), st.readingDays);
  renderYearSummary($('#yearSummary', view), year, sessionsY, doneYear);
  renderTopBooks($('#topBooks', view), st.books);
}

function drawDaysChart(canvas, readingDays) {
  const ctx = canvas.getContext('2d');
  const cs = getComputedStyle(document.body);
  const accent = cs.getPropertyValue('--accent').trim() || '#8b5e34';
  const muted = cs.getPropertyValue('--muted').trim() || '#999';
  const W = canvas.width, H = canvas.height, N = 14, pad = 34;
  const days = [];
  for (let i = N - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const vals = days.map(d => readingDays[d.toISOString().slice(0, 10)] || 0);
  const max = Math.max(10, ...vals);
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = muted; ctx.globalAlpha = .3;
  ctx.beginPath(); ctx.moveTo(pad, 10); ctx.lineTo(pad, H - 24); ctx.lineTo(W, H - 24); ctx.stroke();
  ctx.globalAlpha = 1;
  const bw = (W - pad - 10) / N;
  days.forEach((d, i) => {
    const v = vals[i];
    const h = (H - 44) * (v / max);
    ctx.fillStyle = v > 0 ? accent : 'rgba(120,120,120,.18)';
    ctx.beginPath();
    ctx.roundRect(pad + 6 + i * bw, H - 24 - h, bw - 10, Math.max(2, h), 4);
    ctx.fill();
    ctx.fillStyle = muted; ctx.font = '11px Cairo, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(d.getDate(), pad + 6 + i * bw + (bw - 10) / 2, H - 8);
    if (v > 0) ctx.fillText(v, pad + 6 + i * bw + (bw - 10) / 2, H - 30 - h);
  });
}

function renderYearSummary(host, year, sessions, doneYear) {
  const totalMin = sessions.reduce((a, x) => a + x.minutes, 0);
  const totalPages = sessions.reduce((a, x) => a + (x.pages || 0), 0);
  const hours = Math.floor(totalMin / 60), mins = totalMin % 60;
  const months = new Array(12).fill(0);
  sessions.forEach(s => { months[new Date(s.end).getMonth()] += s.minutes; });
  const bestMonth = months.indexOf(Math.max(...months));
  const monthNames = getLang() === 'ar'
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  host.innerHTML = `
    <div class="stat-cards" style="margin-bottom:0">
      <div class="stat-card"><div class="num">${doneYear.length}</div><div class="lbl">${t('booksFinished')}</div></div>
      <div class="stat-card"><div class="num">${hours}h ${mins}m</div><div class="lbl">${t('totalMin')}</div></div>
      <div class="stat-card"><div class="num">${totalPages}</div><div class="lbl">${t('pages')}</div></div>
      <div class="stat-card"><div class="num">${sessions.length}</div><div class="lbl">${t('sessions')}</div></div>
      ${Math.max(...months) > 0 ? `<div class="stat-card"><div class="num">${monthNames[bestMonth]}</div><div class="lbl">⭐</div></div>` : ''}
    </div>
    <canvas id="monthsChart" width="1000" height="180" style="width:100%;margin-top:1rem"></canvas>`;
  const canvas = host.querySelector('#monthsChart');
  const ctx = canvas.getContext('2d');
  const cs = getComputedStyle(document.body);
  const accent = cs.getPropertyValue('--accent').trim() || '#8b5e34';
  const muted = cs.getPropertyValue('--muted').trim() || '#999';
  const W = canvas.width, H = canvas.height, pad = 34;
  const max = Math.max(10, ...months);
  const bw = (W - pad - 10) / 12;
  ctx.clearRect(0, 0, W, H);
  months.forEach((v, i) => {
    const h = (H - 40) * (v / max);
    ctx.fillStyle = v > 0 ? accent : 'rgba(120,120,120,.15)';
    ctx.beginPath(); ctx.roundRect(pad + 6 + i * bw, H - 24 - h, bw - 12, Math.max(2, h), 4); ctx.fill();
    ctx.fillStyle = muted; ctx.font = '11px Cairo, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(monthNames[i], pad + 6 + i * bw + (bw - 12) / 2, H - 8);
  });
}

function renderTopBooks(host, books) {
  const rated = books.filter(b => b.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 5);
  host.innerHTML = rated.length ? '' : '<p class="muted">—</p>';
  rated.forEach(b => {
    const row = document.createElement('div'); row.className = 'result-row';
    row.style.marginBottom = '.4rem';
    row.innerHTML = `<div style="width:42px;height:62px" class="cover">${coverHTML(b)}</div>
      <div class="r-info"><div class="r-title">${esc(b.title)}</div><div class="r-author">${esc(b.author)}</div></div>`;
    row.appendChild(stars(b.rating));
    host.appendChild(row);
  });
}
