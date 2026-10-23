import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Select, EmptyState } from '@/components/ui/Form';
import { Activity, BarChart3, CheckCircle2, Clock3, FileText, TrendingDown, TrendingUp, Users, XCircle } from 'lucide-react';
import { formatDate, getExamAnalytics, toFaNum } from '@/services/scoring';

export function TeacherStudentPerformance() {
  const { db } = useApp();
  const [studentId, setStudentId] = useState('');

  useEffect(() => {
    if (!studentId && db.students.length > 0) setStudentId(db.students[0].id);
    if (studentId && !db.students.some(student => student.id === studentId)) setStudentId(db.students[0]?.id || '');
  }, [db.students, studentId]);

  const student = db.students.find(item => item.id === studentId);
  const studentAttempts = useMemo(() => db.attempts
    .filter(attempt => attempt.studentId === studentId && attempt.status === 'submitted')
    .map(attempt => ({
      attempt,
      exam: db.exams.find(exam => exam.id === attempt.examId),
      analytics: getExamAnalytics(attempt, db.exams.find(exam => exam.id === attempt.examId), db.attempts, db.students),
    }))
    .sort((a, b) => new Date(a.attempt.submittedAt || a.attempt.startedAt || 0).getTime() - new Date(b.attempt.submittedAt || b.attempt.startedAt || 0).getTime()),
  [db.attempts, db.exams, db.students, studentId]);

  const chartWidth = 720;
  const chartHeight = 230;
  const chartPoints = studentAttempts.map((row, index) => {
    const x = studentAttempts.length === 1 ? chartWidth / 2 : 36 + (index * (chartWidth - 72)) / Math.max(1, studentAttempts.length - 1);
    const y = chartHeight - 34 - (row.attempt.percentage / 100) * (chartHeight - 68);
    return { ...row, x, y };
  });
  const coordinates = chartPoints.map(point => `${point.x},${point.y}`).join(' ');
  const latest = studentAttempts[studentAttempts.length - 1];
  const previous = studentAttempts[studentAttempts.length - 2];
  const improving = !previous || latest.attempt.percentage >= previous.attempt.percentage;

  if (db.students.length === 0) {
    return <EmptyState icon={<Users size={42} />} title="دانش‌آموزی ثبت نشده است" message="پس از ثبت دانش‌آموز، روند عملکرد او در این بخش نمایش داده می‌شود." />;
  }

  return <section className="space-y-5 animate-fade-in">
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div><h3 className="font-bold flex items-center gap-2"><BarChart3 size={19} className="text-primary-500" /> روند و کارنامه دانش‌آموز</h3><p className="text-sm text-muted mt-1">نمایش تمام نتایج آزمون‌ها به تفکیک دانش‌آموز</p></div>
        <div className="w-full sm:w-72"><Select value={studentId} onChange={setStudentId} options={db.students.map(item => ({ value: item.id, label: item.name }))} /></div>
      </div>
      {student && <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
        <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 p-3"><div className="font-bold">{student.name}</div><div className="text-xs text-muted mt-1">دانش‌آموز انتخاب‌شده</div></div>
        <div className="rounded-xl bg-success-50 dark:bg-success-900/20 p-3"><div className="font-bold text-success-600">{toFaNum(studentAttempts.length)}</div><div className="text-xs text-muted mt-1">تعداد آزمون</div></div>
        <div className="rounded-xl bg-accent-50 dark:bg-accent-900/20 p-3"><div className="font-bold text-accent-600">{latest ? `${toFaNum(latest.attempt.percentage)}٪` : '—'}</div><div className="text-xs text-muted mt-1">آخرین درصد</div></div>
        <div className={`rounded-xl p-3 ${improving ? 'bg-success-50 dark:bg-success-900/20' : 'bg-error-50 dark:bg-error-900/20'}`}><div className={`font-bold flex justify-center items-center gap-1 ${improving ? 'text-success-600' : 'text-error-500'}`}>{improving ? <TrendingUp size={17} /> : <TrendingDown size={17} />}{improving ? 'بهبود' : 'کاهش'}</div><div className="text-xs text-muted mt-1">مقایسه با آزمون قبل</div></div>
      </div>}
    </div>

    {studentAttempts.length === 0 ? <EmptyState icon={<FileText size={42} />} title="نتیجه‌ای برای این دانش‌آموز ثبت نشده است" message="پس از شرکت دانش‌آموز در آزمون، کارنامه او در این بخش دیده می‌شود." /> : <>
      <div className="card">
        <div className="flex items-center justify-between mb-3"><h4 className="font-bold flex items-center gap-2"><Activity size={18} className="text-primary-500" /> نمودار روند درصد آزمون‌ها</h4><span className="text-xs text-muted">محور عمودی: درصد</span></div>
        <div className="overflow-x-auto"><svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[560px] h-56" role="img" aria-label="روند نمرات دانش‌آموز">
          {[0, 25, 50, 75, 100].map(value => { const y = chartHeight - 34 - (value / 100) * (chartHeight - 68); return <g key={value}><line x1="36" y1={y} x2={chartWidth - 36} y2={y} stroke="rgb(var(--color-border))" strokeDasharray="4 4" /><text x="28" y={y + 4} textAnchor="end" fontSize="11" fill="currentColor">{toFaNum(value)}٪</text></g>; })}
          {chartPoints.length > 1 && <polyline points={coordinates} fill="none" stroke="rgb(var(--color-primary))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
          {chartPoints.map((point, index) => <g key={point.attempt.id}><circle cx={point.x} cy={point.y} r="6" fill="rgb(var(--color-primary))" /><text x={point.x} y={chartHeight - 10} textAnchor="middle" fontSize="11" fill="currentColor">{toFaNum(index + 1)}</text></g>)}
        </svg></div>
      </div>

      <div className="card">
        <h4 className="font-bold flex items-center gap-2 mb-3"><FileText size={18} className="text-primary-500" /> کارنامه آزمون‌ها</h4>
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[760px]"><thead><tr className="text-right text-muted border-b" style={{ borderColor: 'rgb(var(--color-border))' }}><th className="p-2">آزمون</th><th className="p-2 text-center">تاریخ</th><th className="p-2 text-center">درصد</th><th className="p-2 text-center">تراز</th><th className="p-2 text-center">درست</th><th className="p-2 text-center">غلط</th><th className="p-2 text-center">نزده</th><th className="p-2 text-center">زمان</th></tr></thead><tbody>{studentAttempts.slice().reverse().map(row => <tr key={row.attempt.id} className="border-b" style={{ borderColor: 'rgb(var(--color-border))' }}><td className="p-2 font-medium">{row.exam?.title || 'آزمون حذف‌شده'}</td><td className="p-2 text-center text-xs text-muted">{formatDate(row.attempt.submittedAt || row.attempt.startedAt)}</td><td className="p-2 text-center font-bold text-primary-600">{toFaNum(row.attempt.percentage)}٪</td><td className="p-2 text-center font-bold text-accent-600">{toFaNum(row.analytics.score)}</td><td className="p-2 text-center text-success-600"><span className="inline-flex items-center gap-1"><CheckCircle2 size={14} />{toFaNum(row.attempt.correct)}</span></td><td className="p-2 text-center text-error-500"><span className="inline-flex items-center gap-1"><XCircle size={14} />{toFaNum(row.attempt.wrong)}</span></td><td className="p-2 text-center text-muted">{toFaNum(row.attempt.blank)}</td><td className="p-2 text-center"><span className="inline-flex items-center gap-1"><Clock3 size={14} />{toFaNum(Math.floor(row.attempt.timeSpentSec / 60))} دقیقه</span></td></tr>)}</tbody></table></div>
      </div>
    </>}
  </section>;
}