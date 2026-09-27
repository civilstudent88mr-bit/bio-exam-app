import { type ReactNode } from 'react';
import { useApp } from '@/context/AppContext';
import { Moon, Sun, GraduationCap, BookOpen, LogOut, Loader2 } from 'lucide-react';

export function Header() {
  const { theme, toggleTheme, activeRole, setActiveRole, teacherId, studentId, setTeacherId, setStudentId, dbLoading } = useApp();

  const loggedIn = activeRole === 'teacher' ? !!teacherId : !!studentId;

  const handleLogout = () => {
    if (activeRole === 'teacher') setTeacherId(null);
    else setStudentId(null);
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-lg border-b"
      style={{ backgroundColor: 'rgb(var(--color-surface) / 0.85)', borderColor: 'rgb(var(--color-border))' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-md">
              <GraduationCap size={22} />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-base leading-tight">آزمون‌ساز زیست‌شناسی</h1>
              <p className="text-xs text-muted leading-tight">مدارس و کنکور</p>
            </div>
            {dbLoading && <Loader2 size={14} className="animate-spin text-muted" />}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl p-1 gap-1"
              style={{ backgroundColor: 'rgb(var(--color-border) / 0.4)' }}>
              <button
                className={`btn px-3 py-1.5 text-xs ${activeRole === 'teacher' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveRole('teacher')}
              >
                <BookOpen size={14} />
                <span className="hidden sm:inline">پنل معلم</span>
              </button>
              <button
                className={`btn px-3 py-1.5 text-xs ${activeRole === 'student' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveRole('student')}
              >
                <GraduationCap size={14} />
                <span className="hidden sm:inline">پنل دانش‌آموز</span>
              </button>
            </div>

            <button onClick={toggleTheme} className="btn btn-ghost p-2.5 rounded-xl" title="تغییر تم">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {loggedIn && (
              <button onClick={handleLogout} className="btn btn-ghost p-2.5 rounded-xl" title="خروج">
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</div>;
}

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ icon, label, value, color = 'text-primary-500' }: StatCardProps) {
  return (
    <div className="card flex items-center gap-3 animate-fade-in">
      <div className={`p-2.5 rounded-xl bg-primary-50 dark:bg-slate-700 ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

export function LoadingSpinner({ message = 'در حال بارگذاری...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 size={36} className="animate-spin text-primary-500 mb-3" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center mb-3">
        <span className="text-error-500 text-xl">!</span>
      </div>
      <p className="text-sm text-error-500 font-medium">{message}</p>
    </div>
  );
}
