import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Field, Select, EmptyState } from '@/components/ui/Form';
import { Wand2, Plus, Trash2, Clock, Infinity as InfinityIcon, Play, Loader2 } from 'lucide-react';
import type { SelfQuiz, SelfQuizMode, Grade, Difficulty } from '@/types';
import { createSelfQuiz, deleteSelfQuiz } from '@/services/api';
import { toFaNum } from '@/services/scoring';

const GRADES: Grade[] = ['دهم', 'یازدهم', 'دوازدهم'];
const DIFFICULTIES: Difficulty[] = ['ساده', 'متوسط', 'چالشی'];

export function SelfQuizMaker({ onStart }: { onStart: (quiz: SelfQuiz) => void }) {
  const { db, reloadDb, studentId } = useApp();
  const { notify } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [fGrade, setFGrade] = useState('');
  const [fChapter, setFChapter] = useState('');
  const [fDifficulty, setFDifficulty] = useState('');
  const [count, setCount] = useState(10);
  const [mode, setMode] = useState<SelfQuizMode>('practice');
  const [duration, setDuration] = useState(15);
  const [saving, setSaving] = useState(false);

  const chapters = useMemo(() => {
    const set = new Set(db.questions.map(q => q.chapter).filter(Boolean));
    return Array.from(set);
  }, [db.questions]);

  const myQuizzes = db.selfQuizzes.filter(q => q.studentId === studentId);

  const createQuiz = async () => {
    const pool = db.questions.filter(q => {
      if (fGrade && q.grade !== fGrade) return false;
      if (fChapter && q.chapter !== fChapter) return false;
      if (fDifficulty && q.difficulty !== fDifficulty) return false;
      return true;
    });
    if (pool.length === 0) { notify('سوالی با این فیلترها موجود نیست', 'warning'); return; }
    const actualCount = Math.min(count, pool.length);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, actualCount);
    setSaving(true);
    try {
      const quiz = await createSelfQuiz({
        studentId: studentId!, title: title.trim() || 'آزمون تمرینی',
        questionIds: shuffled.map(q => q.id), mode,
        durationMin: mode === 'timed' ? duration : 0,
      });
      await reloadDb();
      setShowModal(false);
      setTitle(''); setFGrade(''); setFChapter(''); setFDifficulty(''); setCount(10); setMode('practice'); setDuration(15);
      notify('آزمون تمرینی ساخته شد', 'success');
      onStart(quiz);
    } catch (err: any) {
      notify(err?.message || 'خطا در ثبت', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSelfQuiz(id);
      await reloadDb();
      notify('آزمون حذف شد', 'success');
    } catch (err: any) {
      notify(err?.message || 'خطا در حذف', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <Wand2 size={20} className="text-primary-500" />
          آزمون‌ساز شخصی
        </h3>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> ساخت آزمون
        </button>
      </div>

      {myQuizzes.length === 0 ? (
        <EmptyState icon={<Wand2 size={40} />} title="آزمون تمرینی بسازید" message="از بانک سوالات، آزمون تمرینی با فیلترهای دلخواه خود بسازید" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {myQuizzes.map(quiz => (
            <div key={quiz.id} className="card hover:shadow-md transition-shadow animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold">{quiz.title}</h4>
                  <p className="text-xs text-muted mt-1">{toFaNum(quiz.questionIds.length)} سوال</p>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted">
                    {quiz.mode === 'timed' ? <><Clock size={12} /> {toFaNum(quiz.durationMin)} دقیقه</> : <><InfinityIcon size={12} /> بدون زمان</>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="btn btn-primary px-3 py-1.5 text-xs" onClick={() => onStart(quiz)}>
                    <Play size={14} /> شروع
                  </button>
                  <button className="btn btn-ghost p-2 text-error-500" onClick={() => handleDelete(quiz.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="ساخت آزمون تمرینی" size="lg">
        <div className="space-y-4">
          <Field label="عنوان (اختیاری)">
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: تمرین فصل ۳" />
          </Field>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="پایه">
              <Select value={fGrade} onChange={setFGrade} options={[{ value: '', label: 'همه' }, ...GRADES.map(g => ({ value: g, label: g }))]} />
            </Field>
            <Field label="فصل">
              <Select value={fChapter} onChange={setFChapter} options={[{ value: '', label: 'همه' }, ...chapters.map(c => ({ value: c, label: c }))]} />
            </Field>
            <Field label="سطح دشواری">
              <Select value={fDifficulty} onChange={setFDifficulty} options={[{ value: '', label: 'همه' }, ...DIFFICULTIES.map(d => ({ value: d, label: d }))]} />
            </Field>
          </div>
          <Field label="تعداد سوال">
            <input type="number" className="input" value={count} onChange={e => setCount(parseInt(e.target.value) || 1)} min={1} />
          </Field>
          <Field label="حالت آزمون">
            <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: 'rgb(var(--color-border) / 0.4)' }}>
              <button className={`flex-1 btn py-2 text-sm ${mode === 'practice' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('practice')}>
                <InfinityIcon size={14} /> تمرینی (بدون زمان)
              </button>
              <button className={`flex-1 btn py-2 text-sm ${mode === 'timed' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('timed')}>
                <Clock size={14} /> شبیه‌ساز زمان‌دار
              </button>
            </div>
          </Field>
          {mode === 'timed' && (
            <Field label="مدت زمان (دقیقه)">
              <input type="number" className="input" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 1)} min={1} />
            </Field>
          )}
          <div className="flex gap-3 justify-end">
            <button className="btn btn-outline" onClick={() => setShowModal(false)}>انصراف</button>
            <button className="btn btn-primary" onClick={createQuiz} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />} ساخت و شروع
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
