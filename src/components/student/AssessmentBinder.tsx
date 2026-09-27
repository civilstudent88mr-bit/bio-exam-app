import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Badge, EmptyState } from '@/components/ui/Form';
import { deleteVaultFolder, updateVaultFolder } from '@/services/api';
import { questionCode } from '@/types';
import type { Question, SelfQuiz } from '@/types';
import { BookMarked, Play, Trash2 } from 'lucide-react';

interface AssessmentBinderProps { onStart: (quiz: SelfQuiz) => void; }

export function AssessmentBinder({ onStart }: AssessmentBinderProps) {
  const { db, studentId, reloadDb } = useApp();
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const folder = db.vaultFolders.find(item => item.studentId === studentId && item.name === 'کلاسور ارزیابی');
  const questions = useMemo(() => (folder?.questionIds || []).map(id => db.questions.find(question => question.id === id)).filter(Boolean) as Question[], [db.questions, folder?.questionIds]);

  const removeQuestion = async (questionId: string) => {
    if (!folder) return;
    setSaving(true);
    try { await updateVaultFolder(folder.id, folder.questionIds.filter(id => id !== questionId)); await reloadDb(); notify('سوال از کلاسور حذف شد', 'success'); }
    catch (error: unknown) { notify(error instanceof Error ? error.message : 'خطا در حذف سوال', 'error'); }
    finally { setSaving(false); }
  };

  const clearBinder = async () => {
    if (!folder) return;
    setSaving(true);
    try { await deleteVaultFolder(folder.id); await reloadDb(); notify('کلاسور ارزیابی پاک شد', 'success'); }
    catch (error: unknown) { notify(error instanceof Error ? error.message : 'خطا در پاک‌کردن کلاسور', 'error'); }
    finally { setSaving(false); }
  };

  return <section className="card space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-bold flex items-center gap-2"><BookMarked size={19} className="text-warning-500" /> کلاسور ارزیابی</h3><p className="text-sm text-muted mt-1">تست‌هایی که در آزمون‌ها غلط زده‌اید، خودکار اینجا ذخیره می‌شوند.</p></div>
      <div className="flex gap-2"><Badge color="warning">{questions.length} سوال</Badge>{questions.length > 0 && <button className="btn btn-primary py-1.5 px-3 text-xs" onClick={() => onStart({ id: folder?.id || '', studentId: studentId!, title: 'مرور کلاسور ارزیابی', questionIds: questions.map(question => question.id), mode: 'practice', durationMin: 0, createdAt: new Date().toISOString() })}><Play size={14} /> مرور مجدد</button>}</div>
    </div>
    {questions.length === 0 ? <EmptyState icon={<BookMarked size={38} />} title="کلاسور خالی است" message="پس از پاسخ‌دادن به تست‌های آزمون، تست‌های غلط اینجا قرار می‌گیرند." /> : <div className="space-y-2">{questions.map(question => <div key={question.id} className="flex items-start gap-3 border rounded-xl p-3" style={{ borderColor: 'rgb(var(--color-border))' }}><div className="flex-1"><div className="flex flex-wrap gap-1.5 mb-1"><Badge color="primary">{questionCode(question.id)}</Badge><Badge color="neutral">{question.chapter || 'بدون فصل'}</Badge></div><p className="text-sm">{question.text}</p></div><button className="btn btn-ghost text-error-500 p-2" disabled={saving} onClick={() => removeQuestion(question.id)} title="حذف از کلاسور"><Trash2 size={16} /></button></div>)}</div>}
    {questions.length > 0 && <button className="btn btn-outline text-error-500 text-xs" disabled={saving} onClick={clearBinder}>پاک‌کردن کلاسور</button>}
  </section>;
}
