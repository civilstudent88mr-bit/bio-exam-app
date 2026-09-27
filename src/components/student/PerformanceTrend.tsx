import type { Exam, ExamAttempt } from '@/types';
import { toFaNum } from '@/services/scoring';
import { TrendingDown, TrendingUp, Activity } from 'lucide-react';

export function PerformanceTrend({ attempts, exams }: { attempts: ExamAttempt[]; exams: Exam[] }) {
  const points = attempts.filter(item => item.status === 'submitted').slice().reverse().map((attempt, index) => ({ attempt, index, exam: exams.find(exam => exam.id === attempt.examId) }));
  if (points.length === 0) return <div className="card text-sm text-muted">برای نمایش روند، حداقل یک آزمون را به پایان برسانید.</div>;
  const width = 640;
  const height = 180;
  const max = Math.max(100, ...points.map(item => item.attempt.percentage));
  const coordinates = points.map((item, index) => `${points.length === 1 ? width / 2 : 24 + (index * (width - 48)) / (points.length - 1)},${height - 20 - (item.attempt.percentage / max) * (height - 45)}`).join(' ');
  const first = points[0].attempt.percentage;
  const last = points[points.length - 1].attempt.percentage;
  const improving = last >= first;
  return <section className="card space-y-3">
    <div className="flex items-center justify-between gap-2"><h3 className="font-bold flex items-center gap-2"><Activity size={18} className="text-primary-500" /> روند عملکرد</h3><span className={`text-sm font-bold flex items-center gap-1 ${improving ? 'text-success-600' : 'text-error-500'}`}>{improving ? <TrendingUp size={16} /> : <TrendingDown size={16} />} {improving ? 'روند بهتر' : 'نیازمند تلاش بیشتر'}</span></div>
    <div className="overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[520px] h-48" role="img" aria-label="نمودار روند درصد آزمون‌ها"><line x1="24" y1={height - 20} x2={width - 24} y2={height - 20} stroke="rgb(var(--color-border))" /><polyline points={coordinates} fill="none" stroke="rgb(var(--color-primary-500))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />{points.map((item, index) => { const x = points.length === 1 ? width / 2 : 24 + (index * (width - 48)) / (points.length - 1); const y = height - 20 - (item.attempt.percentage / max) * (height - 45); return <g key={item.attempt.id}><circle cx={x} cy={y} r="6" fill="rgb(var(--color-primary-500))" /><text x={x} y={height - 4} textAnchor="middle" fontSize="11" fill="currentColor">{toFaNum(item.attempt.percentage)}٪</text></g>; })}</svg></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted">{points.slice(-3).map(item => <div key={item.attempt.id} className="flex justify-between gap-2"><span className="truncate">{item.exam?.title || 'آزمون'}</span><strong className="text-primary-600">{toFaNum(item.attempt.percentage)}٪</strong></div>)}</div>
  </section>;

}
