export function normalizeName(name: string): string {
  return name.trim().replace(/\u064A/g, '\u06CC').replace(/\u0643/g, '\u06A9');
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
