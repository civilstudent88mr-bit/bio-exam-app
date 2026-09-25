export function normalizeName(name: string): string {
  return name.trim().replace(/\u064A/g, '\u06CC').replace(/\u0643/g, '\u06A9');
}

function authEmail(role: 'teacher' | 'student', name: string): string {
  const normalized = normalizeName(name);
  let hash = 2166136261;
  for (const character of normalized) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `${role}.${(hash >>> 0).toString(36)}@accounts.bioexam.local`;
}

export async function establishAuthSession(role: 'teacher' | 'student', name: string, password: string): Promise<string> {
  const email = authEmail(role, name);
  const login = await supabase.auth.signInWithPassword({ email, password });
  let data: { user: NonNullable<typeof login.data.user> | null; session: NonNullable<typeof login.data.session> | null } = login.data;
  let error = login.error;
  if (error) {
    const signup = await supabase.auth.signUp({ email, password, options: { data: { role, display_name: name } } });
    data = { user: signup.data.user, session: signup.data.session };
    error = signup.error;
  }
  if (error) throw new Error(error.message);
  if (!data.user || !data.session) throw new Error('در تنظیمات Supabase گزینه تأیید ایمیل را خاموش کنید و دوباره تلاش کنید');
  return data.user.id;
}

export async function signOutAuth(): Promise<void> {
  await supabase.auth.signOut();
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return 'رمز عبور باید حداقل ۶ کاراکتر باشد';
  if (!/\d/.test(password)) return 'رمز عبور باید شامل عدد باشد';
  if (!/[a-zA-Z\u0600-\u06FF]/.test(password)) return 'رمز عبور باید شامل حروف باشد';
  return null;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

interface LockoutState {
  attempts: number;
  lockedUntil: number;
}

const lockoutKey = (role: string) => `lockout-${role}`;

export function getLockoutState(role: string): LockoutState {
  try {
    const raw = sessionStorage.getItem(lockoutKey(role));
    if (!raw) return { attempts: 0, lockedUntil: 0 };
    return JSON.parse(raw);
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
}

export function recordFailedAttempt(role: string): LockoutState {
  const state = getLockoutState(role);
  const attempts = state.attempts + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
  const newState = { attempts, lockedUntil };
  sessionStorage.setItem(lockoutKey(role), JSON.stringify(newState));
  return newState;
}

export function clearLockout(role: string): void {
  sessionStorage.removeItem(lockoutKey(role));
}

export function isLocked(role: string): boolean {
  const state = getLockoutState(role);
  if (state.lockedUntil > Date.now()) return true;
  if (state.lockedUntil > 0 && state.lockedUntil <= Date.now()) {
    clearLockout(role);
  }
  return false;
}

export function getLockoutRemaining(role: string): number {
  const state = getLockoutState(role);
  return Math.max(0, Math.ceil((state.lockedUntil - Date.now()) / 1000));
}
import { supabase } from '@/lib/supabase';
