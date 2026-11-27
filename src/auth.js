// auth.js — Supabase Auth for Qari: sign up / log in / log out, profile + role.
// Profiles live in public.profiles (created automatically on sign-up by a
// database trigger). RLS: a user reads their own profile; admins read all.
import { supabase } from './supabase.js';
import { getLang } from './i18n.js';

const ar = () => getLang() === 'ar';

let user = null;        // supabase auth user (or null)
let profile = null;     // row from public.profiles (or null)
let profileError = '';  // last profile-load error (e.g. schema not applied yet)
let banned = false;     // true when the logged-in profile is banned
const subs = new Set();

const emit = () => subs.forEach(f => { try { f(); } catch {} });
export const onAuthChange = fn => subs.add(fn);
export const getUser = () => user;
export const getProfile = () => profile;
export const getProfileError = () => profileError;
export const isLoggedIn = () => !!user;
export const isAdmin = () => !!profile && profile.role === 'admin';
export const isBanned = () => banned;

function friendlyError(e) {
  const m = (e && e.message) || String(e || '');
  if (/Invalid login credentials/i.test(m)) return ar() ? 'الإيميل أو الباسورد غلط' : 'Invalid email or password';
  if (/Email not confirmed/i.test(m)) return ar() ? 'الإيميل لسه متأكدش — افتح رسالة التأكيد في إيميلك' : 'Email not confirmed — check your inbox for the confirmation message';
  if (/User already registered/i.test(m)) return ar() ? 'الإيميل ده مسجّل قبل كده — جرّب تسجيل الدخول' : 'This email is already registered — try logging in';
  if (/Password should be at least/i.test(m)) return ar() ? 'الباسورد لازم 6 حروف على الأقل' : 'Password must be at least 6 characters';
  if (/redirect.*not allowed|provider is not enabled/i.test(m)) return ar() ? 'الدخول بجوجل مش مفعّل لسه في إعدادات المشروع' : 'Google sign-in is not enabled yet in the project settings';
  return m;
}

/* Load the profile row for the current user. If it is banned, sign out at once. */
export async function loadProfile() {
  profile = null; profileError = ''; banned = false;
  if (!user) { emit(); return null; }
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) { profileError = error.message; emit(); return null; }
  profile = data || null;
  if (profile && profile.banned) {
    banned = true;
    await supabase.auth.signOut();
    user = null; profile = null;
    emit();
    return null;
  }
  emit();
  return profile;
}

export async function signUp(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { display_name: (displayName || '').trim() } },
  });
  if (error) throw new Error(friendlyError(error));
  // With email confirmation on (Supabase default) there is no session yet:
  // the user must confirm from their inbox first.
  if (data.session && data.user) {
    user = data.user;
    await loadProfile();
    return { needsConfirmation: false };
  }
  return { needsConfirmation: true };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendlyError(error));
  user = data.user;
  await loadProfile();
  if (banned) throw new Error(ar() ? 'الحساب ده محظور' : 'This account is banned');
  return true;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) throw new Error(friendlyError(error));
}

export async function signOut() {
  await supabase.auth.signOut();
  user = null; profile = null; banned = false;
  emit();
}

export async function updateDisplayName(name) {
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').update({ display_name: (name || '').trim() }).eq('id', user.id).select().single();
  if (error) throw new Error(error.message);
  profile = data;
  emit();
  return profile;
}

/* ---------- admin: manage users (RLS allows this for admins only) ---------- */
export async function listUsers() {
  const { data, error } = await supabase.from('profiles')
    .select('id,email,display_name,role,banned,created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function setUserRole(id, role) {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setUserBanned(id, value) {
  const { error } = await supabase.from('profiles').update({ banned: value }).eq('id', id);
  if (error) throw new Error(error.message);
}

/* Restore the session on boot and follow auth changes (incl. OAuth redirect). */
export async function initAuth() {
  const { data } = await supabase.auth.getSession();
  user = (data && data.session && data.session.user) || null;
  if (user) await loadProfile();
  supabase.auth.onAuthStateChange(async (_event, session) => {
    const next = (session && session.user) || null;
    if ((next && !user) || (!next && user) || (next && user && next.id !== user.id)) {
      user = next;
      if (user) await loadProfile(); else { profile = null; banned = false; emit(); }
    }
  });
  emit();
}
