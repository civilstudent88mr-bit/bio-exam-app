import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { TeacherLogin } from './TeacherLogin';
import { StructureManager } from './StructureManager';
import { QuestionBank } from './QuestionBank';
import { ExamManager } from './ExamManager';
import { PageContainer, StatCard } from '@/components/Header';
import { Building2, FileText, ClipboardList, Users, BookOpen, GraduationCap, Layers } from 'lucide-react';
import type { ReactNode } from 'react';

type Tab = 'overview' | 'structure' | 'questions' | 'exams';

export function TeacherDashboard() {
  const { db, teacherId } = useApp();
  const [tab, setTab] = useState<Tab>('overview');

  if (!teacherId) return <TeacherLogin />;

  const teacher = db.teachers.find(t => t.id === teacherId);
  const totalStudents = db.students.length;
  const totalQuestions = db.questions.length;
  const totalExams = db.exams.length;
  const totalAttempts = db.attempts.length;

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'overview', label: 'داشبورد', icon: <Layers size={18} /> },
    { id: 'structure', label: 'مدارس و کلاس‌ها', icon: <Building2 size={18} /> },
    { id: 'questions', label: 'بانک سوالات', icon: <FileText size={18} /> },
    { id: 'exams', label: 'آزمون‌ها', icon: <ClipboardList size={18} /> },
  ];

  return (
    <PageContainer>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">سلام {teacher?.name}</h2>
        <p className="text-sm text-muted mt-1">به پنل مدیریت معلم خوش آمدید</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} className={`btn px-4 py-2.5 text-sm whitespace-nowrap ${tab === t.id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t.id)}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<Building2 size={20} />} label="مدارس" value={db.schools.length} />
            <StatCard icon={<Users size={20} />} label="دانش‌آموزان" value={totalStudents} color="text-accent-500" />
            <StatCard icon={<FileText size={20} />} label="سوالات" value={totalQuestions} color="text-success-500" />
            <StatCard icon={<ClipboardList size={20} />} label="آزمون‌ها" value={totalExams} color="text-warning-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-bold mb-3 flex items-center gap-2"><GraduationCap size={18} className="text-primary-500" /> آخرین آزمون‌ها</h3>
              {db.exams.length === 0 ? (
                <p className="text-sm text-muted">آزمونی ایجاد نشده</p>
              ) : (
                <div className="space-y-2">
                  {db.exams.slice(-5).reverse().map(exam => (
                    <div key={exam.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{exam.title}</span>
                      <span className="text-muted text-xs">{exam.questionIds.length} سوال</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card">
              <h3 className="font-bold mb-3 flex items-center gap-2"><BookOpen size={18} className="text-primary-500" /> فعالیت اخیر</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>کل شرکت در آزمون‌ها</span><span className="font-bold">{totalAttempts}</span></div>
                <div className="flex justify-between"><span>کلاس‌های فعال</span><span className="font-bold">{db.classes.length}</span></div>
                <div className="flex justify-between"><span>میانگین سوالات هر پایه</span><span className="font-bold">{db.questions.length > 0 ? Math.round(db.questions.length / 3) : 0}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'structure' && <StructureManager />}
      {tab === 'questions' && <QuestionBank />}
      {tab === 'exams' && <ExamManager />}
    </PageContainer>
  );
}
