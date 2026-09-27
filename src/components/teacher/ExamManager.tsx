import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Field, Select, Badge, EmptyState } from '@/components/ui/Form';
import {
  Plus, FileText, Trash2, Edit2, Clock, Users, DollarSign, Gift, Wand2, Check, Loader2,
} from 'lucide-react';
import type { Exam, Grade, Difficulty } from '@/types';
import { createExam, updateExam, deleteExam } from '@/services/api';
import { printExamPaper, printAnswerSheet, printAnswerKey, printExamResults } from '@/services/pdf';

const GRADES: Grade[] = ['دهم', 'یازدهم', 'دوازدهم'];
const DIFFICULTIES: Difficulty[] = ['ساده', 'متوسط', 'چالشی'];

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}

export function ExamManager() {
  const { db, reloadDb } = useApp();
  const { notify } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<string | null>(null);
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [saving, setSaving] = useState(false);

  const [selectedQs, setSelectedQs] = useState<string[]>([]);
  const [autoGrade, setAutoGrade] = useState('');
  const [autoChapter, setAutoChapter] = useState('');
  const [autoDifficulty, setAutoDifficulty] = useState('');
  const [autoCount, setAutoCount] = useState(10);

  const [title, setTitle] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [classIds, setClassIds] = useState<string[]>([]);
  const [duration, setDuration] = useState(30);
  const [isFree, setIsFree] = useState(true);
  const [cost, setCost] = useState(0);
  const [startAt, setStartAt] = useState(toLocalInput(new Date().toISOString()));
  const [endAt, setEndAt] = useState(toLocalInput(new Date(Date.now() + 86400000).toISOString()));

  const chapters = useMemo(() => {
    const set = new Set(db.questions.map(q => q.chapter).filter(Boolean));
    return Array.from(set);
  }, [db.questions]);

  const resetForm = () => {
    setTitle(''); setSchoolId(''); setClassIds([]); setDuration(30); setIsFree(true); setCost(0);
    setStartAt(toLocalInput(new Date().toISOString()));
    setEndAt(toLocalInput(new Date(Date.now() + 86400000).toISOString()));
    setSelectedQs([]); setAutoGrade(''); setAutoChapter(''); setAutoDifficulty(''); setAutoCount(10);
    setMode('manual'); setEditId(null);
  };

  const openAdd = () => { resetForm(); setShowModal(true); };

  const openEdit = (exam: Exam) => {
    setTitle(exam.title); setSchoolId(exam.schoolId); setClassIds(exam.classIds);
    setDuration(exam.durationMin); setIsFree(exam.isFree); setCost(exam.cost);
    setStartAt(toLocalInput(exam.startAt)); setEndAt(toLocalInput(exam.endAt));
    setSelectedQs(exam.questionIds); setMode('manual'); setEditId(exam.id); setShowModal(true);
  };

  const toggleClass = (id: string) => {
    setClassIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleQuestion = (id: string) => {
    setSelectedQs(prev => prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]);
  };

  const autoGenerate = () => {
    const pool = db.questions.filter(q => {
      if (autoGrade && q.grade !== autoGrade) return false;
      if (autoChapter && q.chapter !== autoChapter) return false;
      if (autoDifficulty && q.difficulty !== autoDifficulty) return false;
      return true;
    });
    if (pool.length < autoCount) {
      notify(`فقط ${pool.length} سوال با این فیلترها موجود است`, 'warning');
      return;
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, autoCount);
    setSelectedQs(shuffled.map(q => q.id));
    notify(`${autoCount} سوال به‌صورت خودکار انتخاب شد`, 'success');
  };

  const saveExam = async () => {
    if (!title.trim()) { notify('عنوان آزمون الزامی است', 'warning'); return; }
    if (selectedQs.length === 0) { notify('حداقل یک سوال انتخاب کنید', 'warning'); return; }
    if (!schoolId) { notify('مدرسه را انتخاب کنید', 'warning'); return; }
    if (classIds.length === 0) { notify('حداقل یک کلاس انتخاب کنید', 'warning'); return; }

    const examData = {
      title: title.trim(), schoolId, classIds, questionIds: selectedQs,
      durationMin: duration, isFree, cost: isFree ? 0 : cost,
      startAt: fromLocalInput(startAt), endAt: fromLocalInput(endAt),
    };

    setSaving(true);
    try {
      if (editId) {
        await updateExam(editId, examData);
        notify('آزمون ویرایش شد', 'success');
      } else {
        await createExam(examData);
        notify('آزمون ایجاد شد', 'success');
      }
      await reloadDb();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      notify(err?.message || 'خطا در ثبت', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteExam(deleteId);
      await reloadDb();
      notify('آزمون حذف شد', 'success');
    } catch (err: any) {
      notify(err?.message || 'خطا در حذف', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getExamQuestions = (exam: Exam) => exam.questionIds.map(id => db.questions.find(q => q.id === id)).filter(Boolean) as typeof db.questions;
  const getSchoolName = (id: string) => db.schools.find(s => s.id === id)?.name || '—';
  const getClassName = (id: string) => db.classes.find(c => c.id === id)?.name || '—';

  const isExamActive = (exam: Exam) => {
    const now = Date.now();
    return now >= new Date(exam.startAt).getTime() && now <= new Date(exam.endAt).getTime();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileText size={20} className="text-primary-500" />
          مدیریت آزمون‌ها ({db.exams.length})
        </h2>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={18} /> آزمون جدید
        </button>
      </div>

      {db.exams.length === 0 ? (
        <EmptyState icon={<FileText size={48} />} title="آزمونی ایجاد نشده" message="آزمون جدیدی برای کلاس‌های خود بسازید" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {db.exams.map(exam => {
            const active = isExamActive(exam);
            const attempts = db.attempts.filter(a => a.examId === exam.id);
            return (
              <div key={exam.id} className="card hover:shadow-md transition-shadow animate-fade-in">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold">{exam.title}</h3>
                    <p className="text-xs text-muted mt-0.5">کد: {exam.code} • {exam.questionIds.length} سوال</p>
                  </div>
                  <Badge color={active ? 'success' : 'neutral'}>{active ? 'فعال' : 'غیرفعال'}</Badge>
                </div>
                <div className="space-y-1.5 text-xs text-muted mb-3">
                  <div className="flex items-center gap-1.5"><Users size={12} /> {getSchoolName(exam.schoolId)} — {exam.classIds.map(c => getClassName(c)).join('، ')}</div>
                  <div className="flex items-center gap-1.5"><Clock size={12} /> {exam.durationMin} دقیقه</div>
                  <div className="flex items-center gap-1.5">{exam.isFree ? <Gift size={12} /> : <DollarSign size={12} />} {exam.isFree ? 'رایگان' : `${exam.cost.toLocaleString('fa-IR')} تومان`}</div>
                  <div className="flex items-center gap-1.5"><Check size={12} /> {attempts.length} شرکت‌کننده</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button className="btn btn-outline px-3 py-1.5 text-xs" onClick={() => printExamPaper(exam.title, exam.code, getExamQuestions(exam))}>
                    <FileText size={12} /> PDF آزمون
                  </button>
                  <button className="btn btn-outline px-3 py-1.5 text-xs" onClick={() => printAnswerSheet(exam.title, exam.code, exam.questionIds.length)}>
                    پاسخ‌برگ
                  </button>
                  <button className="btn btn-outline px-3 py-1.5 text-xs" onClick={() => printAnswerKey(exam.title, exam.code, getExamQuestions(exam))}>
                    پاسخ‌نامه
                  </button>
                  <button className="btn btn-outline px-3 py-1.5 text-xs" onClick={() => setShowResults(exam.id)}>
                    گزارش
                  </button>
                  <button className="btn btn-ghost p-1.5" onClick={() => openEdit(exam)}><Edit2 size={14} /></button>
                  <button className="btn btn-ghost p-1.5 text-error-500" onClick={() => setDeleteId(exam.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'ویرایش آزمون' : 'آزمون جدید'} size="xl">
        <div className="space-y-4">
          <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: 'rgb(var(--color-border) / 0.4)' }}>
            <button className={`flex-1 btn py-2 text-sm ${mode === 'manual' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('manual')}>
              انتخاب دستی سوالات
            </button>
            <button className={`flex-1 btn py-2 text-sm ${mode === 'auto' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('auto')}>
              <Wand2 size={14} /> ساخت خودکار هوشمند
            </button>
          </div>

          <Field label="عنوان آزمون">
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: آزمون فصل ۳ زیست" />
          </Field>

          {mode === 'auto' && (
            <div className="card space-y-3" style={{ backgroundColor: 'rgb(var(--color-border) / 0.2)' }}>
              <h4 className="font-bold text-sm flex items-center gap-2"><Wand2 size={16} className="text-primary-500" /> ساخت خودکار</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="پایه">
                  <Select value={autoGrade} onChange={setAutoGrade} options={[{ value: '', label: 'همه' }, ...GRADES.map(g => ({ value: g, label: g }))]} />
                </Field>
                <Field label="فصل">
                  <Select value={autoChapter} onChange={setAutoChapter} options={[{ value: '', label: 'همه' }, ...chapters.map(c => ({ value: c, label: c }))]} />
                </Field>
                <Field label="سطح">
                  <Select value={autoDifficulty} onChange={setAutoDifficulty} options={[{ value: '', label: 'همه' }, ...DIFFICULTIES.map(d => ({ value: d, label: d }))]} />
                </Field>
                <Field label="تعداد">
                  <input type="number" className="input" value={autoCount} onChange={e => setAutoCount(parseInt(e.target.value) || 0)} min={1} />
                </Field>
              </div>
              <button className="btn btn-primary w-full" onClick={autoGenerate}>
                <Wand2 size={16} /> تولید خودکار سوالات
              </button>
              {selectedQs.length > 0 && <p className="text-xs text-success-600 text-center">{selectedQs.length} سوال انتخاب شد</p>}
            </div>
          )}

          {mode === 'manual' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">انتخاب سوالات ({selectedQs.length})</label>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl p-2" style={{ border: '1px solid rgb(var(--color-border))' }}>
                {db.questions.length === 0 ? (
                  <p className="text-sm text-muted text-center py-4">ابتدا سوال اضافه کنید</p>
                ) : db.questions.map(q => (
                  <button key={q.id} className={`w-full text-right p-2.5 rounded-lg text-sm transition-colors ${selectedQs.includes(q.id) ? 'bg-primary-50 dark:bg-slate-700 border border-primary-300' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    onClick={() => toggleQuestion(q.id)}>
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedQs.includes(q.id) ? 'bg-primary-500 border-primary-500' : 'border-slate-300'}`}>
                        {selectedQs.includes(q.id) && <Check size={12} className="text-white" />}
                      </div>
                      <span className="truncate">{q.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="مدرسه">
              <Select value={schoolId} onChange={setSchoolId} options={[{ value: '', label: 'انتخاب کنید' }, ...db.schools.map(s => ({ value: s.id, label: s.name }))]} />
            </Field>
            <Field label="مدت زمان (دقیقه)">
              <input type="number" className="input" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 0)} min={1} />
            </Field>
          </div>

          <Field label="کلاس‌های مجاز">
            {schoolId ? (
              <div className="flex flex-wrap gap-2">
                {db.classes.filter(c => c.schoolId === schoolId).map(cls => (
                  <button key={cls.id} className={`btn px-3 py-1.5 text-sm ${classIds.includes(cls.id) ? 'btn-primary' : 'btn-outline'}`} onClick={() => toggleClass(cls.id)}>
                    {classIds.includes(cls.id) && <Check size={14} />}
                    {cls.name}
                  </button>
                ))}
                {db.classes.filter(c => c.schoolId === schoolId).length === 0 && <p className="text-sm text-muted">کلاسی تعریف نشده</p>}
              </div>
            ) : (
              <p className="text-sm text-muted">ابتدا مدرسه را انتخاب کنید</p>
            )}
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="تاریخ شروع">
              <input type="datetime-local" className="input" value={startAt} onChange={e => setStartAt(e.target.value)} />
            </Field>
            <Field label="تاریخ پایان">
              <input type="datetime-local" className="input" value={endAt} onChange={e => setEndAt(e.target.value)} />
            </Field>
          </div>

          <div className="card space-y-3" style={{ backgroundColor: 'rgb(var(--color-border) / 0.2)' }}>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">آزمون رایگان یا پولی</label>
              <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: 'rgb(var(--color-border) / 0.4)' }}>
                <button className={`btn px-3 py-1.5 text-xs ${isFree ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setIsFree(true)}>رایگان</button>
                <button className={`btn px-3 py-1.5 text-xs ${!isFree ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setIsFree(false)}>پولی</button>
              </div>
            </div>
            {!isFree && (
              <Field label="هزینه آزمون (تومان)">
                <input type="number" className="input" value={cost} onChange={e => setCost(parseInt(e.target.value) || 0)} min={0} />
              </Field>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button className="btn btn-outline" onClick={() => setShowModal(false)}>انصراف</button>
            <button className="btn btn-primary" onClick={saveExam} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {editId ? 'ذخیره' : 'ایجاد آزمون'}
            </button>
          </div>
        </div>
      </Modal>

      <ResultsModal examId={showResults} onClose={() => setShowResults(null)} />

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="حذف آزمون" message="آیا از حذف این آزمون و تمام شرکت‌کنندگان آن اطمینان دارید؟" confirmText="حذف" danger />
    </div>
  );
}

function ResultsModal({ examId, onClose }: { examId: string | null; onClose: () => void }) {
  const { db } = useApp();
  if (!examId) return null;
  const exam = db.exams.find(e => e.id === examId);
  if (!exam) return null;
  const attempts = db.attempts.filter(a => a.examId === examId);

  const rows = attempts.map(a => {
    const student = db.students.find(s => s.id === a.studentId);
    return {
      name: student?.name || 'نامشخص',
      percentage: a.percentage,
      correct: a.correct,
      wrong: a.wrong,
      blank: a.blank,
      timeSpentSec: a.timeSpentSec,
      paid: true,
    };
  }).sort((a, b) => b.percentage - a.percentage);

  return (
    <Modal open={!!examId} onClose={onClose} title={`گزارش: ${exam.title}`} size="xl">
      {attempts.length === 0 ? (
        <EmptyState icon={<Users size={40} />} title="شرکت‌کننده‌ای ندارد" message="هنوز دانش‌آموزی در این آزمون شرکت نکرده است" />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn btn-outline" onClick={() => printExamResults(exam.title, exam.code, rows)}>
              <FileText size={16} /> خروجی PDF
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
                  <th className="text-right p-2">ردیف</th>
                  <th className="text-right p-2">نام</th>
                  <th className="text-center p-2">درصد</th>
                  <th className="text-center p-2">درست</th>
                  <th className="text-center p-2">غلط</th>
                  <th className="text-center p-2">نزده</th>
                  <th className="text-center p-2">زمان</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2 font-medium">{r.name}</td>
                    <td className="p-2 text-center font-bold text-primary-600">{r.percentage}٪</td>
                    <td className="p-2 text-center text-success-600">{r.correct}</td>
                    <td className="p-2 text-center text-error-500">{r.wrong}</td>
                    <td className="p-2 text-center text-muted">{r.blank}</td>
                    <td className="p-2 text-center">{Math.floor(r.timeSpentSec / 60)} دقیقه</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
