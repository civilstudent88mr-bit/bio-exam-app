import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Database, Prefs, ThemeMode, ActiveRole } from '@/types';
import { loadPrefs, savePrefs } from '@/services/storage';
import { loadDatabase } from '@/services/api';
import { createEmptyDb } from '@/services/storage';

interface AppContextValue {
  db: Database;
  reloadDb: () => Promise<void>;
  dbLoading: boolean;
  dbError: string | null;
  prefs: Prefs;
  setPrefs: (updater: Prefs | ((prev: Prefs) => Prefs)) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  activeRole: ActiveRole;
  setActiveRole: (r: ActiveRole) => void;
  teacherId: string | null;
  setTeacherId: (id: string | null) => void;
  studentId: string | null;
  setStudentId: (id: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => createEmptyDb());
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [prefs, setPrefsState] = useState<Prefs>(() => loadPrefs());

  const reloadDb = useCallback(async () => {
    setDbLoading(true);
    setDbError(null);
    try {
      const data = await loadDatabase();
      setDb(data);
    } catch (err: any) {
      setDbError(err?.message || 'خطا در بارگذاری داده‌ها');
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadDb();
  }, [reloadDb]);

  useEffect(() => { savePrefs(prefs); }, [prefs]);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [prefs.theme]);

  const setPrefs = useCallback((updater: Prefs | ((prev: Prefs) => Prefs)) => {
    setPrefsState(prev => typeof updater === 'function' ? (updater as (p: Prefs) => Prefs)(prev) : updater);
  }, []);

  const toggleTheme = useCallback(() => {
    setPrefsState(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  }, []);

  const setActiveRole = useCallback((r: ActiveRole) => {
    setPrefsState(prev => ({ ...prev, activeRole: r }));
  }, []);

  const setTeacherId = useCallback((id: string | null) => {
    setPrefsState(prev => ({ ...prev, teacherId: id }));
  }, []);

  const setStudentId = useCallback((id: string | null) => {
    setPrefsState(prev => ({ ...prev, studentId: id }));
  }, []);

  return (
    <AppContext.Provider value={{
      db, reloadDb, dbLoading, dbError,
      prefs, setPrefs,
      theme: prefs.theme, toggleTheme,
      activeRole: prefs.activeRole, setActiveRole,
      teacherId: prefs.teacherId, setTeacherId,
      studentId: prefs.studentId, setStudentId,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
