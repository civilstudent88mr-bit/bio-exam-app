import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { StudentLogin } from './StudentLogin';
import { WalletCard } from './WalletCard';
import { SelfQuizMaker } from './SelfQuizMaker';
import { ExamEnvironment } from './ExamEnvironment';
import { ResultView } from './ResultView';
import { PageContainer, StatCard } from '@/components/Header';
import { Badge, EmptyState } from '@/components/ui/Form';
import {
  ClipboardList, Clock, Gift, DollarSign, Lock, Play, CheckCircle2,
  Wallet, Wand2, BookOpen, GraduationCap, Calendar,
} from 'lucide-react';
import type { Exam, SelfQuiz, ExamAttempt, Question } from '@/types';
import { toFaNum, formatDate } from '@/services/scoring';
import { updateStudentWallet, createTransaction } from '@/services/api';

type View = 'dashboard' | 'exam' | 'result';
type ExamSource = { exam?: Exam; quiz?: SelfQuiz };

export function StudentDashboard() {
  const { db, reloadDb, studentId } = useApp();
  const { notify } = useToast();
  const [view, setView] = useState<View>('dashboard');
  const [examSource, setExamSource] = useState<ExamSource>({});
  const [result, setResult] = useState<{ attempt: ExamAttempt; questions: Question[] } | null>(null);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState<Exam | null>(null);

  if (!studentId) return <StudentLogin />;

  const student = db.students.find(s => s.id === studentId);
  if (!student) return <StudentLogin />;

  // Exam environment
  if (view === 'exam') {
    return (
      <ExamEnvironment
        exam={examSource.exam}
        quiz={examSource.quiz}
        onExit={() => setView('dashboard')}
        onComplete={(attempt) => {
          const ids = examSource.exam?.questionIds || examSource.quiz?.questionIds || [];
          const questions = ids.map(id => db.questions.find(q => q.id === id)).filter(Boolean) as Question[];
          setResult({ attempt, questions });
          setView('result');
        }}
      />
    );
  }

  // Result view
  if (view === 'result' && result) {
    return (
      <ResultView
        attempt={result.attempt}
        questions={result.questions}
        onExit={() => { setView('dashboard'); setResult(null); }}
      />
    );
  }

  // Available exams for this student
  const availableExams = db.exams.filter(exam =>
    exam.classIds.includes(student.classId) &&
    !db.attempts.some(a => a.examId === exam.id && a.studentId === student.id)
  );

  // Past attempts
  const myAttempts = db.attempts.filter(a => a.studentId === student.id);
  const completedExamIds = new Set(myAttempts.map(a => a.examId));

  const isExamActive = (exam: Exam) => {
    const now = Date.now();
    return now >= new Date(exam.startAt).getTime() && now <= new Date(exam.endAt).getTime();
  };

  const startExam = (exam: Exam) => {
    if (!isExamActive(exam)) { notify('آزمون در بازه زمانی مجاز نیست', 'warning'); return; }
    if (exam.isFree) {
      setExamSource({ exam });
      setView('exam');
    } else {
      setShowPaymentConfirm(exam);
    }
  };

  const confirmPayment = async () => {
    if (!showPaymentConfirm) return;
    const exam = showPaymentConfirm;
    if (student.walletBalance < exam.cost) { notify('موجودی کیف پول کافی نیست', 'error'); return; }
    try {
      await createTransaction({
        studentId: student.id, amount: exam.cost, type: 'exam',
        description: `هزینه آزمون: ${exam.title}`,
      });
      await updateStudentWallet(student.id, student.walletBalance - exam.cost);
      await reloadDb();
      notify('پرداخت موفق', 'success');
      setShowPaymentConfirm(null);
      setExamSource({ exam });
      setView('exam');
    } catch (err: any) {
      notify(err?.message || 'خطا در پرداخت', 'error');
    }
  };

  const startQuiz = (quiz: SelfQuiz) => {
    setExamSource({ quiz });
    setView('exam');
  };

  return (
    <PageContainer>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">سلام {student.name}</h2>
        <p className="text-sm text-muted mt-1">
          {db.schools.find(s => s.id === student.schoolId)?.name} — {db.classes.find(c => c.id === student.classId)?.name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Wallet size={20} />} label="موجودی کیف پول" value={`${toFaNum(student.walletBalance.toLocaleString('fa-IR'))}`} />
        <StatCard icon={<ClipboardList size={20} />} label="آزمون‌های انجام شده" value={toFaNum(myAttempts.length)} color="text-success-500" />
        <StatCard icon={<CheckCircle2 size={20} />} label="میانگین درصد" value={`${toFaNum(myAttempts.length > 0 ? Math.round(myAttempts.reduce((s, a) => s + a.percentage, 0) / myAttempts.length) : 0)}٪`} color="text-accent-500" />
        <StatCard icon={<Wand2 size={20} />} label="آزمون‌های تمرینی" value={toFaNum(db.selfQuizzes.filter(q => q.studentId === student.id).length)} color="text-warning-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Exams & quizzes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Teacher exams */}
          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <ClipboardList size={20} className="text-primary-500" />
              آزمون‌های معلم
            </h3>
            {availableExams.length === 0 ? (
              <EmptyState icon={<ClipboardList size={40} />} title="آزمونی موجود نیست" message="آزمون‌های معلم شما اینجا نمایش داده می‌شود" />
            ) : (
              <div className="space-y-2">
                {availableExams.map(exam => {
                  const active = isExamActive(exam);
                  return (
                    <div key={exam.id} className="card hover:shadow-md transition-shadow animate-fade-in">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold">{exam.title}</h4>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge color="primary">{toFaNum(exam.questionIds.length)} سوال</Badge>
                            <Badge color="neutral"><Clock size={10} /> {toFaNum(exam.durationMin)} دقیقه</Badge>
                            {exam.isFree ? <Badge color="success"><Gift size={10} /> رایگان</Badge> : <Badge color="warning"><DollarSign size={10} /> {toFaNum(exam.cost.toLocaleString('fa-IR'))} تومان</Badge>}
                          </div>
                          <div className="text-xs text-muted mt-2 flex items-center gap-1">
                            <Calendar size={12} />
                            از {formatDate(exam.startAt)} تا {formatDate(exam.endAt)}
                          </div>
                        </div>
                        <button className={`btn py-2 px-4 text-sm ${active ? 'btn-primary' : 'btn-outline'}`} disabled={!active} onClick={() => startExam(exam)}>
                          {active ? <><Play size={16} /> ورود</> : <><Lock size={16} /> غیرفعال</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Completed exams */}
          {myAttempts.length > 0 && (
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-success-500" />
                آزمون‌های انجام شده
              </h3>
              <div className="space-y-2">
                {myAttempts.map(attempt => {
                  const exam = db.exams.find(e => e.id === attempt.examId);
                  const quiz = db.selfQuizzes.find(q => q.id === attempt.examId);
                  const title = exam?.title || quiz?.title || 'آزمون';
                  return (
                    <div key={attempt.id} className="card flex items-center justify-between animate-fade-in">
                      <div>
                        <h4 className="font-bold text-sm">{title}</h4>
                        <p className="text-xs text-muted">{formatDate(attempt.submittedAt || attempt.startedAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary-600">{toFaNum(attempt.percentage)}٪</span>
                        <button className="btn btn-outline py-1.5 px-3 text-xs" onClick={() => {
                          const ids = exam?.questionIds || quiz?.questionIds || [];
                          const questions = ids.map(id => db.questions.find(q => q.id === id)).filter(Boolean) as Question[];
                          setResult({ attempt, questions });
                          setView('result');
                        }}>
                          مشاهده
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Self quiz maker */}
          <div>
            <SelfQuizMaker onStart={startQuiz} />
          </div>
        </div>

        {/* Right: Wallet */}
        <div className="space-y-6">
          <WalletCard />
        </div>
      </div>

      {/* Payment confirm */}
      <ConfirmModal
        open={!!showPaymentConfirm}
        onClose={() => setShowPaymentConfirm(null)}
        onConfirm={confirmPayment}
        title="پرداخت هزینه آزمون"
        message={showPaymentConfirm ? `مبلغ ${toFaNum(showPaymentConfirm.cost.toLocaleString('fa-IR'))} تومان از کیف پول شما کسر می‌شود. موجودی فعلی: ${toFaNum(student.walletBalance.toLocaleString('fa-IR'))} تومان` : ''}
        confirmText="پرداخت و ورود"
      />
    </PageContainer>
  );
}
