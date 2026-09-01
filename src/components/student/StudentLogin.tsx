import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Field, Select } from '@/components/ui/Form';
import { GraduationCap, LogIn, Loader2, KeyRound, Phone } from 'lucide-react';
import { createStudent, loginStudent, resetStudentPassword } from '@/services/api';
import { normalizeName, validatePassword, isLocked, getLockoutRemaining, recordFailedAttempt, clearLockout } from '@/services/auth';

export function StudentLogin() {
  const { db, setStudentId, reloadDb } = useApp();
  const { notify } = useToast();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetName, setResetName] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetPass, setResetPass] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [lockSecs, setLockSecs] = useState(0);

  const ROLE = 'student';
  const classes = db.classes.filter(c => c.schoolId === schoolId);

  useEffect(() => {
    if (!isLocked(ROLE)) { setLockSecs(0); return; }
    setLockSecs(getLockoutRemaining(ROLE));
    const t = setInterval(() => {
      const r = getLockoutRemaining(ROLE);
      setLockSecs(r);
      if (r <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normName = normalizeName(name);
    if (!normName || !password.trim()) { notify('نام و رمز را وارد کنید', 'warning'); return; }
    if (isLocked(ROLE)) { notify(`فرم قفل است. ${getLockoutRemaining(ROLE)} ثانیه صبر کنید`, 'warning'); return; }

    if (mode === 'register') {
      const pwErr = validatePassword(password);
      if (pwErr) { notify(pwErr, 'warning'); return; }
      if (!phone.trim()) { notify('شماره تماس را وارد کنید', 'warning'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        if (!schoolId || !classId) { notify('مدرسه و کلاس را انتخاب کنید', 'warning'); return; }
        const student = await createStudent(normName, schoolId, classId, password, phone.trim());
        await reloadDb();
        clearLockout(ROLE);
        setStudentId(student.id);
        notify('ثبت‌نام موفق', 'success');
      } else {
        const student = await loginStudent(normName, password);
        if (!student) {
          const st = recordFailedAttempt(ROLE);
          if (st.lockedUntil > 0) {
            setLockSecs(getLockoutRemaining(ROLE));
            notify('تعداد تلاش ناموفق زیاد بود. ۶۰ ثانیه صبر کنید', 'error');
          } else {
            notify('نام کاربری یا رمز عبور اشتباه است', 'error');
          }
          return;
        }
        clearLockout(ROLE);
        setStudentId(student.id);
        notify('ورود موفق', 'success');
      }
    } catch (err: any) {
      notify(err?.message || 'خطا در ارتباط با سرور', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const normName = normalizeName(resetName);
    if (!normName || !resetPhone.trim() || !resetPass.trim()) { notify('همه فیلدها را پر کنید', 'warning'); return; }
    const pwErr = validatePassword(resetPass);
    if (pwErr) { notify(pwErr, 'warning'); return; }
    setResetLoading(true);
    try {
      await resetStudentPassword(normName, resetPhone.trim(), resetPass);
      notify('رمز عبور با موفقیت تغییر کرد', 'success');
      setShowReset(false);
      setResetName(''); setResetPhone(''); setResetPass('');
    } catch (err: any) {
      notify(err?.message || 'خطا در تغییر رمز', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="w-full max-w-md animate-slide-up">
        <div className="card p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white shadow-lg mb-3">
              <GraduationCap size={32} />
            </div>
            <h2 className="text-xl font-bold">ورود به پنل دانش‌آموز</h2>
            <p className="text-sm text-muted mt-1">سامانه آزمون و تحلیل زیست‌شناسی</p>
          </div>

          <div className="flex rounded-xl p-1 mb-5" style={{ backgroundColor: 'rgb(var(--color-border) / 0.4)' }}>
            <button className={`flex-1 btn py-2 text-sm ${mode === 'login' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('login')}>ورود</button>
            <button className={`flex-1 btn py-2 text-sm ${mode === 'register' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('register')}>ثبت‌نام</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="نام و نام خانوادگی">
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="نام کامل" disabled={lockSecs > 0} />
            </Field>
            <Field label="رمز عبور">
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" disabled={lockSecs > 0} />
            </Field>
            {mode === 'register' && (
              <>
                <Field label="شماره تماس">
                  <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="۰۹۱۲۳۴۵۶۷۸۹" />
                </Field>
                <Field label="مدرسه">
                  <Select value={schoolId} onChange={(v) => { setSchoolId(v); setClassId(''); }}
                    options={[{ value: '', label: 'انتخاب کنید' }, ...db.schools.map(s => ({ value: s.id, label: s.name }))]} />
                </Field>
                <Field label="کلاس">
                  <Select value={classId} onChange={setClassId}
                    options={[{ value: '', label: 'انتخاب کنید' }, ...classes.map(c => ({ value: c.id, label: c.name }))]} />
                </Field>
              </>
            )}
            {lockSecs > 0 && (
              <p className="text-sm text-error-500 text-center">فرم به دلیل تلاش ناموفق قفل شده است. {lockSecs} ثانیه صبر کنید.</p>
            )}
            <button type="submit" className="btn btn-primary w-full py-3" disabled={loading || lockSecs > 0}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              {mode === 'login' ? 'ورود' : 'ثبت‌نام'}
            </button>
          </form>

          {mode === 'login' && (
            <button className="w-full text-center text-sm text-muted hover:text-primary-500 transition-colors mt-4 flex items-center justify-center gap-1.5"
              onClick={() => setShowReset(true)}>
              <KeyRound size={14} /> رمز عبور خود را فراموش کرده‌اید؟
            </button>
          )}
        </div>
      </div>

      <Modal open={showReset} onClose={() => setShowReset(false)} title="بازیابی رمز عبور" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted">نام کاربری و شماره تماس ثبت‌شده خود را وارد کنید تا رمز جدید تعیین شود.</p>
          <Field label="نام کاربری">
            <input className="input" value={resetName} onChange={e => setResetName(e.target.value)} placeholder="نام کامل" autoFocus />
          </Field>
          <Field label="شماره تماس">
            <input className="input" value={resetPhone} onChange={e => setResetPhone(e.target.value)} placeholder="۰۹۱۲۳۴۵۶۷۸۹" />
          </Field>
          <Field label="رمز عبور جدید">
            <input className="input" type="password" value={resetPass} onChange={e => setResetPass(e.target.value)} placeholder="حداقل ۶ کاراکتر شامل حروف و عدد" />
          </Field>
          <div className="flex gap-3 justify-end">
            <button className="btn btn-outline" onClick={() => setShowReset(false)}>انصراف</button>
            <button className="btn btn-primary" onClick={handleReset} disabled={resetLoading}>
              {resetLoading ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />} تغییر رمز
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
