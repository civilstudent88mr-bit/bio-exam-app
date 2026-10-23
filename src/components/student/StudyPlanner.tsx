import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Loader2, Sparkles, Target, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Field } from '@/components/ui/Form';
import type { StudyDay, StudyPlan } from '@/types';
import { purchaseStudyPlan, updateStudyPlan } from '@/services/api';

const PLAN_PRICE = 50000;

function mondayOf(date = new Date()) {
  const value = new Date(date); const day = value.getDay();
  value.setDate(value.getDate() - (day === 0 ? 6 : day - 1));
  return value.toISOString().slice(0, 10);
}

export function StudyPlanner() {
  const { db, studentId, reloadDb } = useApp();
  const { notify } = useToast();
  const [grade, setGrade] = useState('');
  const [subjects, setSubjects] = useState('');
  const [topics, setTopics] = useState('');
  const [weekStart, setWeekStart] = useState(mondayOf());
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [draftDays, setDraftDays] = useState<StudyDay[]>([]);
  const student = db.students.find(item => item.id === studentId);
  const plans = useMemo(() => db.studyPlans.filter(item => item.studentId === studentId), [db.studyPlans, studentId]);
  const activePlan = plans.find(item => item.id === activePlanId) || plans[0];
  useEffect(() => { setDraftDays(activePlan?.days || []); }, [activePlan?.id]);
  const daysDone = draftDays.filter(day => day.completed).length;
  const taskCount = draftDays.reduce((total, day) => total + day.tasks.length, 0);
  const completedTasks = draftDays.reduce((total, day) => total + day.tasks.filter(task => task.completed).length, 0);
  const progress = taskCount ? Math.round((completedTasks / taskCount) * 100) : 0;

  const generate = async () => {
    const subjectList = subjects.split(/[،,\n]/).map(item => item.trim()).filter(Boolean);
    if (!grade.trim() || subjectList.length === 0 || !topics.trim()) { notify('پایه، درس‌ها و صفحات یا فصل‌های مورد مطالعه را وارد کنید.', 'warning'); return; }
    if (!student) return;
    if (student.walletBalance < PLAN_PRICE) { notify('موجودی کیف پول برای دریافت برنامه هفتگی کافی نیست.', 'error'); return; }
    setGenerating(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) throw new Error('جلسه ورود دانش‌آموز منقضی شده است.');
      const response = await fetch('/api/study-plan', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ grade: grade.trim(), subjects: subjectList, topics: topics.trim(), weekStart }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'تولید برنامه با خطا مواجه شد.');
      const plan = await purchaseStudyPlan({ studentId: student.id, grade: grade.trim(), subjects: subjectList, topics: topics.trim(), weekStart, days: payload.days, price: PLAN_PRICE });
      await reloadDb(); setActivePlanId(plan.id); notify('برنامه هفتگی با موفقیت ایجاد شد و ۵۰٬۰۰۰ تومان کسر شد.', 'success');
    } catch (error: any) { notify(error?.message || 'خطا در ایجاد برنامه هفتگی', 'error'); }
    finally { setGenerating(false); }
  };

  const saveDays = async () => {
    if (!activePlan) return;
    setSaving(true);
    try { await updateStudyPlan(activePlan.id, draftDays); await reloadDb(); notify('گزارش عملکرد ذخیره شد.', 'success'); }
    catch (error: any) { notify(error?.message || 'خطا در ذخیره گزارش', 'error'); }
    finally { setSaving(false); }
  };

  const updateDay = (dayIndex: number, updater: (day: StudyDay) => StudyDay) => {
    setDraftDays(current => current.map((day, index) => index === dayIndex ? updater(day) : day));
  };

  return <section className="card space-y-5">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold flex items-center gap-2"><Sparkles size={20} className="text-primary-500" /> برنامه‌ریزی هفتگی هوشمند</h2><p className="text-sm text-muted mt-1">هوش مصنوعی برنامه مطالعه، تست زوج آموزشی و تست فرد پوششی را برای شما می‌چیند.</p></div>
      <div className="text-xs rounded-xl px-3 py-2 bg-primary-50 dark:bg-primary-900/20"><Wallet size={14} className="inline ml-1" /> هزینه هر هفته: ۵۰٬۰۰۰ تومان</div>
    </div>
    <div className="grid md:grid-cols-4 gap-3">
      <Field label="پایه درسی"><input className="input" value={grade} onChange={event => setGrade(event.target.value)} placeholder="مثلاً یازدهم" /></Field>
      <Field label="درس‌های این هفته"><input className="input" value={subjects} onChange={event => setSubjects(event.target.value)} placeholder="زیست، شیمی، فیزیک" /></Field>
      <Field label="شروع هفته"><input className="input" type="date" value={weekStart} onChange={event => setWeekStart(event.target.value)} /></Field>
      <div className="flex items-end"><button className="btn btn-primary w-full" onClick={generate} disabled={generating}>{generating ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />} دریافت برنامه</button></div>
    </div>
    <Field label="صفحات، فصل‌ها یا گفتارهای مورد مطالعه"><textarea className="input min-h-[90px]" value={topics} onChange={event => setTopics(event.target.value)} placeholder="مثلاً زیست فصل ۲ گفتار ۱، صفحات ۳۵ تا ۵۰" /></Field>
    {plans.length > 1 && <div className="flex gap-2 overflow-x-auto">{plans.map(plan => <button key={plan.id} className={`btn text-xs ${activePlan?.id === plan.id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActivePlanId(plan.id)}>{plan.weekStart}</button>)}</div>}
    {activePlan ? <>
      <div className="grid grid-cols-3 gap-3"><div className="rounded-xl p-3 bg-primary-50 dark:bg-primary-900/20"><Target size={17} /><div className="text-2xl font-bold mt-1">{progress}٪</div><div className="text-xs text-muted">پیشرفت تست‌ها و مطالعه</div></div><div className="rounded-xl p-3 bg-success-50 dark:bg-success-900/20"><CheckCircle2 size={17} /><div className="text-2xl font-bold mt-1">{daysDone}/۷</div><div className="text-xs text-muted">روز تکمیل‌شده</div></div><div className="rounded-xl p-3 bg-warning-50 dark:bg-warning-900/20"><CalendarDays size={17} /><div className="text-sm font-bold mt-2">{activePlan.weekStart}</div><div className="text-xs text-muted">شروع برنامه</div></div></div>
      <div className="space-y-3">{draftDays.map((day, dayIndex) => <div key={`${activePlan.id}-${day.day}`} className="rounded-2xl border p-4" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex items-start justify-between gap-3"><div><div className="font-bold">روز {day.day} · {day.title}</div><div className="text-xs text-muted mt-1">{day.date}</div></div><label className="text-sm flex items-center gap-2"><input type="checkbox" checked={day.completed} onChange={event => updateDay(dayIndex, current => ({ ...current, completed: event.target.checked }))} /> روز کامل شد</label></div>
        <div className="mt-3 space-y-2">{day.tasks.map((task, taskIndex) => <div key={task.id} className="rounded-xl p-3 bg-surface-2"><div className="flex gap-2"><button className="text-primary-600 mt-0.5" onClick={() => updateDay(dayIndex, current => ({ ...current, tasks: current.tasks.map((item, index) => index === taskIndex ? { ...item, completed: !item.completed } : item) }))}>{task.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}</button><div className="flex-1"><div className={task.completed ? 'line-through opacity-60' : 'font-medium'}>{task.title}</div><div className="text-xs text-muted mt-1">{task.subject} · {task.topic}{task.tests > 0 ? ` · ${task.tests} تست` : ''}</div></div></div></div>)}</div>
        <div className="grid md:grid-cols-2 gap-3 mt-3"><input className="input" type="number" min="0" placeholder="زمان واقعی مطالعه (دقیقه)" value={day.actualMinutes || ''} onChange={event => updateDay(dayIndex, current => ({ ...current, actualMinutes: Number(event.target.value) || 0 }))} /><textarea className="input" placeholder="گزارش کار این روز: چه مقدار خواندم؟ چند تست درست/غلط شد؟" value={day.report} onChange={event => updateDay(dayIndex, current => ({ ...current, report: event.target.value }))} /></div>
      </div>)}</div>
      {saving && <div className="text-xs text-muted">در حال ذخیره گزارش...</div>}
    </> : <div className="rounded-xl p-5 text-sm text-muted text-center">برای شروع، اطلاعات درسی را وارد کنید و روی دریافت برنامه بزنید.</div>}
  </section>;
}
