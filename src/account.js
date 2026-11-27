// account.js — Account view (#/account): sign up / log in, cloud sync status,
// and (for admins) user management. Arabic-first, same components as Settings.
import * as auth from './auth.js';
import * as cloudsync from './cloudsync.js';
import { t, tr, getLang } from './i18n.js';
import { esc, toast, fmtDate } from './app.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* Re-render the account view when auth state changes (used by app.js). */
export function refreshAccountView() {
  if ((location.hash.replace(/^#\/?/, '').split('/')[0] || '') === 'account') {
    const view = $('#view');
    if (view) renderAccount(view);
  }
}

let mode = 'login'; // 'login' | 'signup'

export function renderAccount(view) {
  const ar = getLang() === 'ar';
  const user = auth.getUser();
  const profile = auth.getProfile();
  const perr = auth.getProfileError();

  if (!user) {
    view.innerHTML = `
    <div class="view-head"><h1>${t('navAccount')}</h1></div>
    <div class="stat-card" style="max-width:520px">
      <p class="muted" style="margin-bottom:.8rem">${ar ? 'سجّل دخول عشان مفضلاتك وتقدمك وقوائمك تتحفظ في حسابك وتتزامن بين أجهزتك. من غير حساب، التطبيق بيشتغل زي ما هو — على الجهاز ده بس.' : 'Log in so your favorites, progress and lists are saved to your account and synced across devices. Without an account the app works as before — on this device only.'}</p>
      <div class="seg" style="margin-bottom:.8rem">
        <button data-m="login" class="${mode === 'login' ? 'active' : ''}">${t('login')}</button>
        <button data-m="signup" class="${mode === 'signup' ? 'active' : ''}">${t('signup')}</button>
      </div>
      <div style="display:grid;gap:.5rem">
        ${mode === 'signup' ? `<input id="acName" type="text" placeholder="${t('displayName')}" autocomplete="name">` : ''}
        <input id="acEmail" type="email" placeholder="${t('email')}" autocomplete="email" dir="ltr">
        <input id="acPass" type="password" placeholder="${t('password')}" autocomplete="current-password" dir="ltr">
        <button id="acGo" class="btn btn-primary">${mode === 'signup' ? t('signup') : t('login')}</button>
        <button id="acGoogle" class="btn">G ${ar ? 'دخول بجوجل' : 'Continue with Google'}</button>
        <div id="acMsg" class="muted"></div>
      </div>
    </div>`;
    $$('.seg [data-m]', view).forEach(b => b.onclick = () => { mode = b.dataset.m; renderAccount(view); });
    const msg = m => { const el = $('#acMsg', view); if (el) el.textContent = m || ''; };
    $('#acGo', view).onclick = async () => {
      const email = $('#acEmail', view).value.trim();
      const pass = $('#acPass', view).value;
      const name = mode === 'signup' ? ($('#acName', view).value.trim() || '') : '';
      if (!email || !pass) { msg(ar ? 'اكتب الإيميل والباسورد' : 'Enter email and password'); return; }
      const btn = $('#acGo', view); btn.disabled = true;
      try {
        if (mode === 'signup') {
          const r = await auth.signUp(email, pass, name);
          if (r.needsConfirmation) {
            msg(ar ? '✓ اتعمل الحساب! افتح إيميلك واضغط رابط التأكيد، وبعدين سجّل دخول.' : '✓ Account created! Open your email and click the confirmation link, then log in.');
            toast('✓ ' + (ar ? 'اتعمل الحساب' : 'Account created'));
          } else { toast('✓ ' + (ar ? 'أهلًا بيك في قارئ' : 'Welcome to Qari')); }
        } else {
          await auth.signIn(email, pass);
          toast('✓ ' + (ar ? 'أهلًا برجوعك' : 'Welcome back'));
        }
        renderAccount(view);
      } catch (e) { msg('⚠ ' + (e.message || e)); }
      btn.disabled = false;
    };
    $('#acGoogle', view).onclick = async () => {
      try { await auth.signInWithGoogle(); }
      catch (e) { msg('⚠ ' + (e.message || e)); }
    };
    return;
  }

  // ---- logged in ----
  const cs = cloudsync.info();
  const syncLine = !cs.connected ? (ar ? '⚪ مش متصل' : '⚪ Not connected')
    : cs.status === 'syncing' ? (ar ? '🟡 بيتزامن…' : '🟡 Syncing…')
    : cs.status === 'error' ? ('🔴 ' + (cs.error || ''))
    : (ar ? '🟢 متزامن' : '🟢 Synced') + (cs.lastSync ? ' · ' + new Date(cs.lastSync).toLocaleString() : '');
  view.innerHTML = `
    <div class="view-head"><h1>${t('navAccount')}</h1></div>
    <div class="stat-card" style="max-width:520px">
      <div style="display:flex;gap:.7rem;align-items:center;margin-bottom:.6rem">
        <div style="font-size:2rem">👤</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700">${esc(profile ? (profile.display_name || '') : '')} ${profile && profile.role === 'admin' ? `<span class="badge">👑 ${ar ? 'أدمن' : 'Admin'}</span>` : ''}</div>
          <div class="muted" dir="ltr" style="text-align:${ar ? 'right' : 'left'}">${esc(user.email || '')}</div>
        </div>
      </div>
      ${perr ? `<p class="muted">⚠ ${esc(perr)}</p>` : ''}
      ${profile ? `
      <div class="set-row"><span>${t('displayName')}</span>
        <input id="acNameEdit" style="flex:1;min-width:140px" value="${esc(profile.display_name || '')}">
        <button id="acNameSave" class="btn">${t('save')}</button></div>` : ''}
      <hr style="border:none;border-top:1px solid var(--border);margin:1rem 0">
      <h3 style="margin-bottom:.4rem">☁ ${ar ? 'المزامنة السحابية' : 'Cloud sync'}</h3>
      <div class="muted" style="margin-bottom:.6rem">${ar ? 'مفضلاتك وتقدمك وقوائمك وهايلايتسك محفوظين في حسابك وبيتزامنوا بين أجهزتك.' : 'Your favorites, progress, lists and highlights are saved to your account and synced across devices.'}</div>
      <div style="margin-bottom:.6rem;font-weight:600">${esc(syncLine)}</div>
      ${cs.note ? `<div class="muted" style="margin-bottom:.6rem">${esc(cs.note)}</div>` : ''}
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button id="acSyncNow" class="btn btn-primary">${ar ? 'زامن الآن' : 'Sync now'}</button>
        <button id="acLogout" class="btn btn-danger">${t('logout')}</button>
      </div>
    </div>
    <div id="adminBox" style="margin-top:1rem"></div>`;
  const nameSave = $('#acNameSave', view);
  if (nameSave) nameSave.onclick = async () => {
    try { await auth.updateDisplayName($('#acNameEdit', view).value); toast('✓'); renderAccount(view); }
    catch (e) { toast('⚠ ' + (e.message || e), 3500); }
  };
  $('#acSyncNow', view).onclick = async () => { await cloudsync.syncNow('manual'); renderAccount(view); };
  $('#acLogout', view).onclick = async () => { await auth.signOut(); toast(ar ? 'تم تسجيل الخروج' : 'Logged out'); renderAccount(view); };
  if (auth.isAdmin()) drawAdminBox(view);
}

/* ---------- admin: user list ---------- */
async function drawAdminBox(view) {
  const box = $('#adminBox', view); if (!box) return;
  const ar = getLang() === 'ar';
  box.innerHTML = `<div class="stat-card" style="max-width:720px">
    <h3 style="margin-bottom:.4rem">👑 ${ar ? 'إدارة المستخدمين' : 'User management'}</h3>
    <div id="adminList"><p class="muted">${t('loading')}</p></div>
    <button id="adminRefresh" class="btn" style="margin-top:.6rem">${ar ? 'تحديث القائمة' : 'Refresh list'}</button></div>`;
  const paint = async () => {
    const host = $('#adminList', box); if (!host) return;
    try {
      const users = await auth.listUsers();
      if (!users.length) { host.innerHTML = `<p class="muted">—</p>`; return; }
      host.innerHTML = '';
      users.forEach(u => {
        const row = document.createElement('div');
        row.className = 'result-row';
        row.innerHTML = `<div class="r-info">
            <div class="r-title" dir="ltr" style="text-align:${ar ? 'right' : 'left'}">${esc(u.email || '')}</div>
            <div class="r-author">${esc(u.display_name || '—')} · ${u.role === 'admin' ? '👑 ' + (ar ? 'أدمن' : 'Admin') : (ar ? 'يوزر' : 'User')}${u.banned ? ' · ⛔ ' + (ar ? 'محظور' : 'Banned') : ''} · ${u.created_at ? fmtDate(u.created_at) : ''}</div>
          </div>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap">
            <button class="btn" data-act="role" style="padding:.3rem .7rem;font-size:.8rem">${u.role === 'admin' ? (ar ? 'إلغاء الأدمن' : 'Remove admin') : (ar ? 'ترقية لأدمن' : 'Make admin')}</button>
            <button class="btn ${u.banned ? '' : 'btn-danger'}" data-act="ban" style="padding:.3rem .7rem;font-size:.8rem">${u.banned ? (ar ? 'إلغاء الحظر' : 'Unban') : (ar ? 'حظر' : 'Ban')}</button>
          </div>`;
        row.querySelector('[data-act="role"]').onclick = async ev => {
          const b = ev.currentTarget; b.disabled = true;
          try { await auth.setUserRole(u.id, u.role === 'admin' ? 'user' : 'admin'); toast('✓'); await paint(); }
          catch (e) { toast('⚠ ' + (e.message || e), 3500); b.disabled = false; }
        };
        row.querySelector('[data-act="ban"]').onclick = async ev => {
          const b = ev.currentTarget; b.disabled = true;
          try { await auth.setUserBanned(u.id, !u.banned); toast('✓'); await paint(); }
          catch (e) { toast('⚠ ' + (e.message || e), 3500); b.disabled = false; }
        };
        host.appendChild(row);
      });
    } catch (e) {
      host.innerHTML = `<p class="muted">⚠ ${esc(e.message || e)}</p>`;
    }
  };
  $('#adminRefresh', box).onclick = paint;
  await paint();
}
