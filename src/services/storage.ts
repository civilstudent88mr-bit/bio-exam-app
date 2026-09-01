import type { Database, Prefs } from '@/types';

const STORAGE_KEY = 'bio-exam-db';
const PREFS_KEY = 'bio-exam-prefs';

const DB_VERSION = 1;

export function createEmptyDb(): Database {
  return {
    version: DB_VERSION,
    schools: [],
    classes: [],
    teachers: [],
    students: [],
    questions: [],
    exams: [],
    attempts: [],
    selfQuizzes: [],
    vaultFolders: [],
    notes: [],
    transactions: [],
  };
}

export function loadDb(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyDb();
    const parsed = JSON.parse(raw) as Database;
    const base = createEmptyDb();
    return { ...base, ...parsed, version: DB_VERSION };
  } catch {
    return createEmptyDb();
  }
}

export function saveDb(db: Database): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function exportDb(db: Database): void {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bio-exam-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importDb(file: File): Promise<Database> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Database;
        const base = createEmptyDb();
        resolve({ ...base, ...parsed, version: DB_VERSION });
      } catch {
        reject(new Error('فایل نامعتبر است'));
      }
    };
    reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
    reader.readAsText(file);
  });
}

const defaultPrefs: Prefs = {
  theme: 'light',
  activeRole: 'teacher',
  teacherId: null,
  studentId: null,
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...defaultPrefs };
    return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {
    return { ...defaultPrefs };
  }
}

export function savePrefs(prefs: Prefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function genExamCode(): string {
  return `EX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
