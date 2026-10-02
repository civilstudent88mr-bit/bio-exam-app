import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Badge, EmptyState, Select } from '@/components/ui/Form';
import { questionCode, type Difficulty, type Grade } from '@/types';
import { BookOpen, Filter, Search } from 'lucide-react';

const GRADES: Grade[] = ['دهم', 'یازدهم', 'دوازدهم'];
const DIFFICULTIES: Difficulty[] = ['ساده', 'متوسط', 'چالشی'];

export function StudentQuestionBank() {
  const { db } = useApp();
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [chapter, setChapter] = useState('');
  const [usage, setUsage] = useState('');
  const usedQuestionIds = useMemo(() => new Set(db.exams.flatMap(exam => exam.questionIds)), [db.exams]);
  const chapters = useMemo(() => Array.from(new Set(db.questions.map(question => question.chapter).filter(Boolean))), [db.questions]);
  const filtered = useMemo(() => db.questions.filter(question => {
    if (search && !`${question.text} ${questionCode(question.id)}`.includes(search.trim())) return false;
    if (grade && question.grade !== grade) return false;
    if (difficulty && question.difficulty !== difficulty) return false;
    if (chapter && question.chapter !== chapter) return false;
    if (usage === 'used' && !usedQuestionIds.has(question.id)) return false;
    if (usage === 'unused' && usedQuestionIds.has(question.id)) return false;
    return true;
  }), [db.questions, search, grade, difficulty, chapter, usage, usedQuestionIds]);

  return <section className="card space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold flex items-center gap-2"><BookOpen size={19} className="text-primary-500" /> بانک سوالات</h3><p className="text-sm text-muted mt-1">مشاهده شناسه، پایه، دشواری و سابقه استفاده هر تست</p></div><Badge color="primary">{filtered.length} از {db.questions.length}</Badge></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2"><div className="relative lg:col-span-2"><Search size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input pr-9" placeholder="جستجو یا شناسه سوال" value={search} onChange={event => setSearch(event.target.value)} /></div><Select value={grade} onChange={setGrade} options={[{ value: '', label: 'همه پایه‌ها' }, ...GRADES.map(item => ({ value: item, label: item }))]} /><Select value={difficulty} onChange={setDifficulty} options={[{ value: '', label: 'همه دشواری‌ها' }, ...DIFFICULTIES.map(item => ({ value: item, label: item }))]} /><Select value={chapter} onChange={setChapter} options={[{ value: '', label: 'همه فصل‌ها' }, ...chapters.map(item => ({ value: item, label: item }))]} /><Select value={usage} onChange={setUsage} options={[{ value: '', label: 'همه سوالات' }, { value: 'used', label: 'استفاده‌شده در آزمون' }, { value: 'unused', label: 'استفاده‌نشده' }]} /></div>
    {filtered.length === 0 ? <EmptyState icon={<Filter size={40} />} title="سوالی با این فیلترها پیدا نشد" message="فیلترها را تغییر دهید." /> : <div className="space-y-2 max-h-[620px] overflow-y-auto">{filtered.map(question => { const usedIn = db.exams.filter(exam => exam.questionIds.includes(question.id)); return <article key={question.id} className="border rounded-xl p-3" style={{ borderColor: 'rgb(var(--color-border))' }}><div className="flex flex-wrap gap-1.5 mb-2"><Badge color="primary">{questionCode(question.id)}</Badge><Badge>{question.grade}</Badge><Badge color={question.difficulty === 'چالشی' ? 'error' : question.difficulty === 'متوسط' ? 'warning' : 'success'}>{question.difficulty}</Badge>{question.chapter && <Badge color="neutral">{question.chapter}</Badge>}{usedIn.length > 0 ? <Badge color="success">در {usedIn.length} آزمون</Badge> : <Badge color="neutral">استفاده نشده</Badge>}</div><p className="text-sm font-medium">{question.text}</p>{question.imageUrl && <img src={question.imageUrl} alt="شکل سوال" className="max-h-40 rounded-lg object-contain border mt-2" />}{usedIn.length > 0 && <p className="text-xs text-muted mt-2">آزمون‌ها: {usedIn.map(exam => exam.title).join('، ')}</p>}</article>; })}</div>}
  </section>;
}
