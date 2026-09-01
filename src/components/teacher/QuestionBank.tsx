import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Field, Select, Badge, EmptyState } from '@/components/ui/Form';
import {
  Plus, Search, Edit2, Trash2, FileUp, Download, Sparkles, FileText, Filter, BookMarked, Loader2, FileSpreadsheet, Eye, Settings, X, ClipboardPaste, Image as ImageIcon,
} from 'lucide-react';
import type { Question, Grade, Difficulty, QuestionType } from '@/types';
import { OPTION_LABELS, OPTION_NUMBERS } from '@/types';
import { createQuestion, updateQuestion, deleteQuestion, batchCreateQuestions } from '@/services/api';
import { parseCsv, parseFile, downloadSampleCsv, downloadSampleExcel } from '@/services/import';
import { extractFromText, extractFromImages, fileToBase64, getApiKey, setApiKey } from '@/services/aiImport';

const GRADES: Grade[] = ['دهم', 'یازدهم', 'دوازدهم'];
const DIFFICULTIES: Difficulty[] = ['ساده', 'متوسط', 'چالشی'];
const TYPES: QuestionType[] = ['مفهومی', 'خط‌به‌خط', 'ترکیبی', 'شکل‌دار', 'شمارشی'];

const emptyQ = (): Omit<Question, 'id' | 'createdAt'> => ({
  text: '', options: ['', '', '', ''], correctAnswer: 0,
  explanation: '', keyNote: '', grade: 'دهم', chapter: '', section: '',
  difficulty: 'متوسط', type: 'مفهومی',
});

export function QuestionBank() {
  const { db, reloadDb } = useApp();
  const { notify } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyQ());
  const [search, setSearch] = useState('');
  const [fGrade, setFGrade] = useState('');
  const [fDifficulty, setFDifficulty] = useState('');
  const [fType, setFType] = useState('');
  const [fChapter, setFChapter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [importText, setImportText] = useState('');
  const [previewQuestions, setPreviewQuestions] = useState<Omit<Question, 'id' | 'createdAt'>[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chapters = useMemo(() => {
    const set = new Set(db.questions.map(q => q.chapter).filter(Boolean));
    return Array.from(set);
  }, [db.questions]);

  const filtered = useMemo(() => {
    return db.questions.filter(q => {
      if (search && !q.text.includes(search) && !q.explanation.includes(search)) return false;
      if (fGrade && q.grade !== fGrade) return false;
      if (fDifficulty && q.difficulty !== fDifficulty) return false;
      if (fType && q.type !== fType) return false;
      if (fChapter && q.chapter !== fChapter) return false;
      return true;
    });
  }, [db.questions, search, fGrade, fDifficulty, fType, fChapter]);

  const openAdd = () => { setForm(emptyQ()); setEditId(null); setShowModal(true); };
  const openEdit = (q: Question) => {
    setForm({ text: q.text, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation, keyNote: q.keyNote, grade: q.grade, chapter: q.chapter, section: q.section, difficulty: q.difficulty, type: q.type });
    setEditId(q.id);
    setShowModal(true);
  };

  const saveQuestion = async () => {
    if (!form.text.trim()) { notify('متن سوال الزامی است', 'warning'); return; }
    if (form.options.some(o => !o.trim())) { notify('هر چهار گزینه باید پر باشد', 'warning'); return; }
    setSaving(true);
    try {
      if (editId) {
        await updateQuestion(editId, form);
        notify('سوال ویرایش شد', 'success');
      } else {
        await createQuestion(form);
        notify('سوال اضافه شد', 'success');
      }
      await reloadDb();
      setShowModal(false);
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
      await deleteQuestion(deleteId);
      await reloadDb();
      notify('سوال حذف شد', 'success');
    } catch (err: any) {
      notify(err?.message || 'خطا در حذف', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImportCsv = async () => {
    try {
      const questions = parseCsv(importText);
      if (questions.length === 0) { notify('سوالی یافت نشد. فرمت فایل را بررسی کنید', 'warning'); return; }
      setPreviewQuestions(questions);
      setShowPreview(true);
    } catch (err: any) {
      notify(err?.message || 'خطا در پردازش فایل', 'error');
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const questions = await parseFile(file);
      if (questions.length === 0) { notify('سوالی یافت نشد. فرمت فایل را بررسی کنید', 'warning'); return; }
      setPreviewQuestions(questions);
      setShowPreview(true);
    } catch (err: any) {
      notify(err?.message || 'خطا در پردازش فایل', 'error');
    }
    e.target.value = '';
  };

  const confirmImport = async () => {
    if (previewQuestions.length === 0) return;
    setSaving(true);
    try {
      const qsWithoutIds = previewQuestions.map(q => ({
        text: q.text, options: q.options, correctAnswer: q.correctAnswer,
        explanation: q.explanation, keyNote: q.keyNote, grade: q.grade,
        chapter: q.chapter, section: q.section, difficulty: q.difficulty, type: q.type,
      }));
      await batchCreateQuestions(qsWithoutIds);
      await reloadDb();
      notify(`${previewQuestions.length} سوال اضافه شد`, 'success');
      setShowPreview(false);
      setShowImport(false);
      setImportText('');
      setPreviewQuestions([]);
    } catch (err: any) {
      notify(err?.message || 'خطا در ثبت', 'error');
    } finally {
      setSaving(false);
    }
  };

  const diffColor = (d: Difficulty) => d === 'ساده' ? 'success' : d === 'متوسط' ? 'warning' : 'error';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileText size={20} className="text-primary-500" />
          بانک سوالات ({db.questions.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-outline" onClick={() => setShowAi(true)}>
            <Sparkles size={16} /> استخراج هوشمند از PDF/تصویر آزمون (AI)
          </button>
          <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
            <FileUp size={16} /> ورود دسته‌جمعی
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={handleFileImport} />
          <button className="btn btn-ghost" onClick={downloadSampleExcel}>
            <FileSpreadsheet size={16} /> نمونه اکسل
          </button>
          <button className="btn btn-ghost" onClick={downloadSampleCsv}>
            <Download size={16} /> نمونه CSV
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={18} /> سوال جدید
          </button>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input pr-10" placeholder="جستجوی متن سوال..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-outline" onClick={() => setShowFilters(s => !s)}>
            <Filter size={16} /> فیلتر
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
            <Select value={fGrade} onChange={setFGrade} options={[{ value: '', label: 'همه پایه‌ها' }, ...GRADES.map(g => ({ value: g, label: g }))]} />
            <Select value={fDifficulty} onChange={setFDifficulty} options={[{ value: '', label: 'همه سطوح' }, ...DIFFICULTIES.map(d => ({ value: d, label: d }))]} />
            <Select value={fType} onChange={setFType} options={[{ value: '', label: 'همه تیپ‌ها' }, ...TYPES.map(t => ({ value: t, label: t }))]} />
            <Select value={fChapter} onChange={setFChapter} options={[{ value: '', label: 'همه فصول' }, ...chapters.map(c => ({ value: c, label: c }))]} />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<FileText size={48} />} title="سوالی یافت نشد" message="سوال جدید اضافه کنید یا فیلترها را تغییر دهید" />
      ) : (
        <div className="space-y-2">
          {filtered.map(q => (
            <div key={q.id} className="card hover:shadow-md transition-shadow animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge color="primary">{q.grade}</Badge>
                    <Badge color={diffColor(q.difficulty) as 'success' | 'warning' | 'error'}>{q.difficulty}</Badge>
                    <Badge>{q.type}</Badge>
                    {q.chapter && <Badge color="neutral">{q.chapter}</Badge>}
                  </div>
                  <p className="text-sm font-medium mb-2">{q.text}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                    {q.options.map((o, i) => (
                      <div key={i} className={`flex items-center gap-1.5 ${i === q.correctAnswer ? 'text-success-600 font-bold' : 'text-muted'}`}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                          style={{ backgroundColor: i === q.correctAnswer ? 'rgb(34 197 94 / 0.15)' : 'rgb(var(--color-border) / 0.4)' }}>
                          {OPTION_LABELS[i]}
                        </span>
                        {o}
                      </div>
                    ))}
                  </div>
                  {q.keyNote && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-warning-600">
                      <BookMarked size={14} className="shrink-0 mt-0.5" />
                      <span>{q.keyNote}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button className="btn btn-ghost p-2" onClick={() => openEdit(q)}><Edit2 size={16} /></button>
                  <button className="btn btn-ghost p-2 text-error-500" onClick={() => setDeleteId(q.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'ویرایش سوال' : 'سوال جدید'} size="xl">
        <div className="space-y-4">
          <Field label="متن سوال">
            <textarea className="input min-h-[80px]" value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
            {form.options.map((opt, i) => (
              <Field key={i} label={`گزینه ${OPTION_NUMBERS[i]} (${OPTION_LABELS[i]})`}>
                <div className="flex gap-2">
                  <input className="input flex-1" value={opt} onChange={e => {
                    const opts = [...form.options]; opts[i] = e.target.value; setForm({ ...form, options: opts as [string, string, string, string] });
                  }} />
                  <button type="button" className={`btn px-3 shrink-0 ${form.correctAnswer === i ? 'bg-success-500 text-white' : 'btn-outline'}`}
                    onClick={() => setForm({ ...form, correctAnswer: i as 0 | 1 | 2 | 3 })}>
                    صحیح
                  </button>
                </div>
              </Field>
            ))}
          </div>
          <Field label="پاسخ تشریحی">
            <textarea className="input min-h-[60px]" value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} />
          </Field>
          <Field label="نکته کلیدی / دام تستی">
            <input className="input" value={form.keyNote} onChange={e => setForm({ ...form, keyNote: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="پایه">
              <Select value={form.grade} onChange={v => setForm({ ...form, grade: v as Grade })} options={GRADES.map(g => ({ value: g, label: g }))} />
            </Field>
            <Field label="فصل">
              <input className="input" value={form.chapter} onChange={e => setForm({ ...form, chapter: e.target.value })} placeholder="مثال: فصل ۱" />
            </Field>
            <Field label="گفتار">
              <input className="input" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} placeholder="مثال: گفتار ۱" />
            </Field>
            <Field label="سختی">
              <Select value={form.difficulty} onChange={v => setForm({ ...form, difficulty: v as Difficulty })} options={DIFFICULTIES.map(d => ({ value: d, label: d }))} />
            </Field>
          </div>
          <Field label="تیپ سوال">
            <Select value={form.type} onChange={v => setForm({ ...form, type: v as QuestionType })} options={TYPES.map(t => ({ value: t, label: t }))} />
          </Field>
          <div className="flex gap-3 justify-end">
            <button className="btn btn-outline" onClick={() => setShowModal(false)}>انصراف</button>
            <button className="btn btn-primary" onClick={saveQuestion} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {editId ? 'ذخیره تغییرات' : 'افزودن سوال'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showImport} onClose={() => setShowImport(false)} title="ورود دسته‌جمعی سوالات" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-muted">متن CSV را اینجا جای‌گذاری کنید یا فایل آپلود کنید. ستون‌ها به فارسی یا انگلیسی قابل تشخیص هستند.</p>
          <textarea className="input min-h-[200px] font-mono text-xs" placeholder="متن سوال,گزینه ۱,گزینه ۲,گزینه ۳,گزینه ۴,گزینه صحیح,..." value={importText} onChange={e => setImportText(e.target.value)} />
          <div className="flex gap-3 justify-between">
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={downloadSampleCsv}><Download size={16} /> نمونه CSV</button>
              <button className="btn btn-ghost" onClick={downloadSampleExcel}><FileSpreadsheet size={16} /> نمونه اکسل</button>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-outline" onClick={() => setShowImport(false)}>انصراف</button>
              <button className="btn btn-primary" onClick={handleImportCsv}>
                <Eye size={16} /> پیش‌نمایش
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={showPreview} onClose={() => setShowPreview(false)} title={`پیش‌نمایش ${previewQuestions.length} سوال`} size="xl">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-success-600 bg-success-50 dark:bg-success-900/20 rounded-lg p-3">
            <Eye size={16} />
            <span>سوالات استخراج شدند. قبل از ثبت نهایی بررسی کنید.</span>
          </div>
          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {previewQuestions.map((q, idx) => (
              <div key={idx} className="card space-y-2" style={{ backgroundColor: 'rgb(var(--color-border) / 0.2)' }}>
                <div className="flex items-start gap-2">
                  <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 shrink-0">{idx + 1}</span>
                  <p className="text-sm font-medium flex-1">{q.text}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                  {q.options.map((o, i) => (
                    <div key={i} className={`flex items-center gap-1.5 ${i === q.correctAnswer ? 'text-success-600 font-bold' : 'text-muted'}`}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
                        style={{ backgroundColor: i === q.correctAnswer ? 'rgb(34 197 94 / 0.15)' : 'rgb(var(--color-border) / 0.4)' }}>
                        {OPTION_LABELS[i]}
                      </span>
                      {o}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge color="primary">{q.grade}</Badge>
                  <Badge color="neutral">{q.difficulty}</Badge>
                  <Badge>{q.type}</Badge>
                  {q.chapter && <Badge color="neutral">{q.chapter}</Badge>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn btn-outline" onClick={() => setShowPreview(false)}>انصراف</button>
            <button className="btn btn-primary" onClick={confirmImport} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} ثبت در بانک سوالات
            </button>
          </div>
        </div>
      </Modal>

      <AiImportModal open={showAi} onClose={() => setShowAi(false)} />

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="حذف سوال" message="آیا از حذف این سوال اطمینان دارید؟" confirmText="حذف" danger />
    </div>
  );
}

function AiImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { reloadDb } = useApp();
  const { notify } = useToast();
  const [step, setStep] = useState<'input' | 'processing' | 'review'>('input');
  const [tab, setTab] = useState<'upload' | 'paste'>('upload');
  const [parsed, setParsed] = useState<Omit<Question, 'id' | 'createdAt'>[]>([]);
  const [saving, setSaving] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [aiGrade, setAiGrade] = useState('');
  const [aiChapter, setAiChapter] = useState('');
  const [aiSection, setAiSection] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setStep('input');
      setTab('upload');
      setParsed([]);
      setPasteText('');
      setFiles([]);
      setFilePreviews([]);
      setAiGrade('');
      setAiChapter('');
      setAiSection('');
    }
  }, [open]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const previews: string[] = [];
    for (const f of selected) {
      if (!f.type.startsWith('image/')) {
        notify('فقط فایل تصویری قابل آپلود است', 'warning');
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        notify(`فایل ${f.name} بزرگتر از ۱۰ مگابایت است`, 'warning');
        continue;
      }
      const b64 = await fileToBase64(f);
      previews.push(b64);
    }
    setFiles(prev => [...prev, ...selected.filter(f => f.type.startsWith('image/'))]);
    setFilePreviews(prev => [...prev, ...previews]);
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setFilePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const startExtraction = async () => {
    if (tab === 'paste' && !pasteText.trim()) { notify('متن سوالات را وارد کنید', 'warning'); return; }
    if (tab === 'upload' && filePreviews.length === 0) { notify('حداقل یک تصویر آپلود کنید', 'warning'); return; }

    setStep('processing');
    try {
      const opts = {
        grade: (aiGrade || undefined) as Grade | undefined,
        chapter: aiChapter || undefined,
        section: aiSection || undefined,
      };
      let result: Omit<Question, 'id' | 'createdAt'>[];
      if (tab === 'paste') {
        result = await extractFromText(pasteText, opts);
      } else {
        result = await extractFromImages(filePreviews, opts);
      }
      if (result.length === 0) {
        notify('هیچ سوال چهارگزینه‌ای استخراج نشد. متن یا تصویر را بررسی کنید', 'warning');
        setStep('input');
        return;
      }
      setParsed(result);
      setStep('review');
    } catch (err: any) {
      notify(err?.message || 'خطا در استخراج سوالات', 'error');
      setStep('input');
    }
  };

  const removeQuestion = (idx: number) => {
    setParsed(prev => prev.filter((_, i) => i !== idx));
  };

  const confirmSave = async () => {
    if (parsed.length === 0) return;
    setSaving(true);
    try {
      await batchCreateQuestions(parsed);
      await reloadDb();
      notify(`${parsed.length} سوال از AI ذخیره شد`, 'success');
      onClose();
    } catch (err: any) {
      notify(err?.message || 'خطا در ثبت', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openKeyModal = async () => {
    try {
      const key = await getApiKey();
      setKeyInput(key || '');
    } catch { setKeyInput(''); }
    setShowKeyModal(true);
  };

  const saveKey = async () => {
    setKeyLoading(true);
    try {
      await setApiKey(keyInput.trim());
      notify('کلید API ذخیره شد', 'success');
      setShowKeyModal(false);
    } catch (err: any) {
      notify(err?.message || 'خطا در ذخیره کلید', 'error');
    } finally {
      setKeyLoading(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="استخراج هوشمند سوالات با AI" size="xl">
        {step === 'input' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex rounded-xl p-1" style={{ backgroundColor: 'rgb(var(--color-border) / 0.4)' }}>
                <button className={`flex-1 btn py-2 px-4 text-sm ${tab === 'upload' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('upload')}>
                  <ImageIcon size={16} /> آپلود فایل
                </button>
                <button className={`flex-1 btn py-2 px-4 text-sm ${tab === 'paste' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('paste')}>
                  <ClipboardPaste size={16} /> چسباندن متن
                </button>
              </div>
              <button className="btn btn-ghost text-sm" onClick={openKeyModal}>
                <Settings size={16} /> تنظیمات کلید API
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="پایه (اختیاری)">
                <Select value={aiGrade} onChange={setAiGrade}
                  options={[{ value: '', label: 'پیش‌فرض' }, ...GRADES.map(g => ({ value: g, label: g }))]} />
              </Field>
              <Field label="فصل (اختیاری)">
                <input className="input" value={aiChapter} onChange={e => setAiChapter(e.target.value)} placeholder="مثال: فصل ۳" />
              </Field>
              <Field label="مبحث (اختیاری)">
                <input className="input" value={aiSection} onChange={e => setAiSection(e.target.value)} placeholder="مثال: گفتار ۱" />
              </Field>
            </div>

            {tab === 'upload' && (
              <div className="space-y-3">
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 transition-colors"
                  style={{ borderColor: 'rgb(var(--color-border))' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp size={32} className="mx-auto mb-2 text-muted" />
                  <p className="text-sm font-medium">تصاویر سوالات یا صفحات PDF آزمون را آپلود کنید</p>
                  <p className="text-xs text-muted mt-1">JPG, PNG — حداکثر ۱۰ مگابایت</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />

                {filePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filePreviews.map((src, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgb(var(--color-border))' }}>
                        <img src={src} alt={`page ${idx + 1}`} className="w-full h-32 object-cover" />
                        <button className="absolute top-1 left-1 btn btn-ghost p-1 rounded-lg bg-black/40 text-white"
                          onClick={() => removeFile(idx)}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'paste' && (
              <div className="space-y-2">
                <p className="text-sm text-muted">متن کامل سوالات و گزینه‌ها را اینجا جای‌گذاری کنید. هوش مصنوعی سوالات را تفکیک می‌کند.</p>
                <textarea className="input min-h-[250px] text-sm" placeholder="متن سوالات را اینجا بچسبانید..."
                  value={pasteText} onChange={e => setPasteText(e.target.value)} />
              </div>
            )}

            <button className="btn btn-primary w-full py-3" onClick={startExtraction}>
              <Sparkles size={18} /> شروع استخراج با هوش مصنوعی
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center py-16">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-4" />
            <p className="text-sm text-muted">در حال پردازش و تفکیک سوالات توسط هوش مصنوعی...</p>
            <p className="text-xs text-muted mt-1">این عملیات ممکن است چند ثانیه طول بکشد</p>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-success-600 text-sm font-medium">
                <Sparkles size={16} /> {parsed.length} سوال استخراج شد — موارد را بررسی و ویرایش کنید
              </div>
              <button className="btn btn-ghost text-sm" onClick={() => setStep('input')}>
                بازگشت
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto space-y-3">
              {parsed.map((p, idx) => (
                <div key={idx} className="card space-y-3" style={{ backgroundColor: 'rgb(var(--color-border) / 0.2)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 shrink-0">{idx + 1}</span>
                    <button className="btn btn-ghost p-1.5 text-error-500" onClick={() => removeQuestion(idx)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <Field label="متن سوال">
                    <textarea className="input min-h-[60px]" value={p.text}
                      onChange={e => { const n = [...parsed]; n[idx] = { ...p, text: e.target.value }; setParsed(n); }} />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {p.options.map((o, i) => (
                      <div key={i} className="flex gap-2">
                        <input className="input" value={o}
                          onChange={e => {
                            const n = [...parsed]; const opts = [...p.options] as string[]; opts[i] = e.target.value;
                            n[idx] = { ...p, options: opts as [string, string, string, string] }; setParsed(n);
                          }} />
                        <button className={`btn px-3 shrink-0 ${p.correctAnswer === i ? 'bg-success-500 text-white' : 'btn-outline'}`}
                          onClick={() => { const n = [...parsed]; n[idx] = { ...p, correctAnswer: i as 0 | 1 | 2 | 3 }; setParsed(n); }}>
                          صحیح
                        </button>
                      </div>
                    ))}
                  </div>
                  <Field label="پاسخ تشریحی">
                    <textarea className="input min-h-[50px]" value={p.explanation}
                      onChange={e => { const n = [...parsed]; n[idx] = { ...p, explanation: e.target.value }; setParsed(n); }} />
                  </Field>
                  <Field label="نکته کلیدی / دام تستی">
                    <input className="input" value={p.keyNote}
                      onChange={e => { const n = [...parsed]; n[idx] = { ...p, keyNote: e.target.value }; setParsed(n); }} />
                  </Field>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Select value={p.grade} onChange={v => { const n = [...parsed]; n[idx] = { ...p, grade: v as Grade }; setParsed(n); }}
                      options={GRADES.map(g => ({ value: g, label: g }))} />
                    <input className="input" placeholder="فصل" value={p.chapter}
                      onChange={e => { const n = [...parsed]; n[idx] = { ...p, chapter: e.target.value }; setParsed(n); }} />
                    <Select value={p.difficulty} onChange={v => { const n = [...parsed]; n[idx] = { ...p, difficulty: v as Difficulty }; setParsed(n); }}
                      options={DIFFICULTIES.map(d => ({ value: d, label: d }))} />
                    <Select value={p.type} onChange={v => { const n = [...parsed]; n[idx] = { ...p, type: v as QuestionType }; setParsed(n); }}
                      options={TYPES.map(t => ({ value: t, label: t }))} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end sticky bottom-0 pt-3" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
              <button className="btn btn-outline" onClick={() => setStep('input')}>بازگشت</button>
              <button className="btn btn-primary" onClick={confirmSave} disabled={saving || parsed.length === 0}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                افزودن {parsed.length} سوال به بانک سوالات
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showKeyModal} onClose={() => setShowKeyModal(false)} title="تنظیمات کلید OpenAI API" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            کلید API OpenAI خود را وارد کنید. این کلید برای استخراج سوالات توسط هوش مصنوعی استفاده می‌شود.
            می‌توانید کلید را از <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline">پنل OpenAI</a> دریافت کنید.
          </p>
          <Field label="کلید API">
            <input className="input font-mono text-xs" value={keyInput} onChange={e => setKeyInput(e.target.value)}
              placeholder="sk-..." type="password" />
          </Field>
          <div className="flex gap-3 justify-end">
            <button className="btn btn-outline" onClick={() => setShowKeyModal(false)}>انصراف</button>
            <button className="btn btn-primary" onClick={saveKey} disabled={keyLoading}>
              {keyLoading ? <Loader2 size={16} className="animate-spin" /> : null} ذخیره کلید
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
