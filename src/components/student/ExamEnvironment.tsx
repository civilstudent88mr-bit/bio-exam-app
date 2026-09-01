import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Clock, Star, Check, ChevronRight, ChevronLeft, Flag, AlertCircle, X, Loader2 } from 'lucide-react';
import type { Exam, SelfQuiz, ExamAttempt, Question } from '@/types';
import { createExamResult } from '@/services/api';
import { gradeAnswers, formatTime, toFaNum } from '@/services/scoring';

interface ExamEnvProps {
  exam?: Exam;
  quiz?: SelfQuiz;
  onExit: () => void;
  onComplete: (result: ExamAttempt) => void;
}

export function ExamEnvironment({ exam, quiz, onExit, onComplete }: ExamEnvProps) {
  const { db, reloadDb, studentId } = useApp();
  const { notify } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, 0 | 1 | 2 | 3>>({});
  const [bookmarked, setBookmarked] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const title = exam?.title || quiz?.title || 'آزمون';
  const perPage = 10;

  useEffect(() => {
    const ids = exam?.questionIds || quiz?.questionIds || [];
    const qs = ids.map(id => db.questions.find(q => q.id === id)).filter(Boolean) as Question[];
    setQuestions(qs);
    if (quiz?.mode === 'timed' || (exam && exam.durationMin > 0)) {
      setTimeLeft((exam?.durationMin || quiz?.durationMin || 0) * 60);
    }
  }, [exam, quiz, db.questions]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(true); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft === null]);

  const totalPages = Math.ceil(questions.length / perPage);
  const pageQuestions = questions.slice(currentPage * perPage, (currentPage + 1) * perPage);
  const answeredCount = Object.keys(answers).length;

  const selectAnswer = (qIndex: number, opt: 0 | 1 | 2 | 3) => {
    setAnswers(prev => ({ ...prev, [qIndex]: opt }));
  };

  const toggleBookmark = (qIndex: number) => {
    setBookmarked(prev => prev.includes(qIndex) ? prev.filter(b => b !== qIndex) : [...prev, qIndex]);
  };

  const handleSubmit = (auto = false) => {
    if (!auto && answeredCount < questions.length) {
      setShowSubmitConfirm(true);
      return;
    }
    doSubmit();
  };

  const doSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    const result = gradeAnswers(answers, questions);
    const timeSpentSec = Math.floor((Date.now() - startTime) / 1000);
    const attemptData = {
      examId: exam?.id || quiz?.id || '',
      studentId: studentId!,
      answers, bookmarked,
      startedAt: new Date(startTime).toISOString(),
      submittedAt: new Date().toISOString(),
      status: 'submitted' as const,
      correct: result.correct, wrong: result.wrong, blank: result.blank,
      percentage: result.percentage, timeSpentSec,
    };

    let savedAttempt: ExamAttempt;
    try {
      if (exam) {
        savedAttempt = await createExamResult(attemptData);
        await reloadDb();
      } else {
        // For self-quizzes, create a temporary attempt object (not persisted)
        savedAttempt = { ...attemptData, id: '' };
      }
      onComplete(savedAttempt);
    } catch (err: any) {
      notify(err?.message || 'خطا در ثبت پاسخ‌ها', 'error');
      setSubmitting(false);
    }
  };

  const isLowTime = timeLeft !== null && timeLeft < 60;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      <div className="sticky top-0 z-30 border-b" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button className="btn btn-ghost p-2" onClick={() => setShowExitConfirm(true)}>
              <X size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="font-bold text-sm truncate">{title}</h2>
              <div className="text-xs text-muted">{toFaNum(answeredCount)} از {toFaNum(questions.length)} پاسخ داده شده</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {timeLeft !== null && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm ${isLowTime ? 'bg-error-100 text-error-600 dark:bg-error-900/40 animate-pulse' : 'bg-primary-100 text-primary-700 dark:bg-primary-900/40'}`}>
                <Clock size={16} />
                {formatTime(timeLeft)}
              </div>
            )}
            <button className="btn btn-primary py-2 px-4 text-sm" onClick={() => handleSubmit(false)} disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />} ثبت نهایی
            </button>
          </div>
        </div>
        <div className="h-1" style={{ backgroundColor: 'rgb(var(--color-border))' }}>
          <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="card mb-4">
          <div className="flex flex-wrap gap-1.5">
            {questions.map((_, i) => {
              const isAnswered = answers[i] !== undefined;
              const isBookmarked = bookmarked.includes(i);
              const isCurrent = i >= currentPage * perPage && i < (currentPage + 1) * perPage;
              return (
                <button key={i} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${isCurrent ? 'ring-2 ring-primary-400' : ''} ${isAnswered ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-muted'}`}
                  onClick={() => setCurrentPage(Math.floor(i / perPage))}>
                  {isBookmarked && <Star size={8} className="absolute -mt-3 -ml-2 text-warning-400 fill-warning-400" />}
                  {toFaNum(i + 1)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {pageQuestions.map((q, idx) => {
            const globalIdx = currentPage * perPage + idx;
            const selected = answers[globalIdx];
            const isBookmarked = bookmarked.includes(globalIdx);
            return (
              <div key={q.id} className="card animate-fade-in">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 font-bold flex items-center justify-center text-sm">
                      {toFaNum(globalIdx + 1)}
                    </span>
                    <div className="flex gap-1">
                      <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{q.grade}</span>
                      <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{q.difficulty}</span>
                    </div>
                  </div>
                  <button className={`btn btn-ghost p-2 ${isBookmarked ? 'text-warning-400' : 'text-muted'}`} onClick={() => toggleBookmark(globalIdx)}>
                    <Star size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <p className="text-sm font-medium mb-4 leading-relaxed">{q.text}</p>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt, i) => (
                    <button key={i} className={`flex items-center gap-3 p-3 rounded-xl text-right text-sm transition-all ${selected === i ? 'bg-primary-50 dark:bg-primary-900/30 border-2 border-primary-400' : 'border-2 border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                      style={{ borderColor: selected === i ? 'rgb(var(--color-primary))' : 'rgb(var(--color-border) / 0.3)' }}
                      onClick={() => selectAnswer(globalIdx, i as 0 | 1 | 2 | 3)}>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selected === i ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-muted'}`}>
                        {selected === i ? <Check size={14} /> : 'الف‌ب‌ج‌د'[i]}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-6">
          <button className="btn btn-outline" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
            <ChevronRight size={18} /> قبلی
          </button>
          <span className="text-sm text-muted">صفحه {toFaNum(currentPage + 1)} از {toFaNum(totalPages)}</span>
          <button className="btn btn-outline" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>
            بعدی <ChevronLeft size={18} />
          </button>
        </div>
      </div>

      <ConfirmModal open={showExitConfirm} onClose={() => setShowExitConfirm(false)} onConfirm={onExit}
        title="خروج از آزمون" message="آیا مطمئن هستید؟ پاسخ‌های شما ذخیره نمی‌شود." confirmText="خروج" danger />

      <Modal open={showSubmitConfirm} onClose={() => setShowSubmitConfirm(false)} title="تایید ارسال پاسخ" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-warning-600 text-sm">
            <AlertCircle size={18} />
            <span>{toFaNum(questions.length - answeredCount)} سوال بدون پاسخ مانده است</span>
          </div>
          <p className="text-sm text-muted">آیا می‌خواهید پاسخ‌ها را نهایی کنید؟ پس از تایید امکان تغییر وجود ندارد.</p>
          <div className="flex gap-3 justify-end">
            <button className="btn btn-outline" onClick={() => setShowSubmitConfirm(false)}>بازگشت</button>
            <button className="btn btn-primary" onClick={doSubmit} disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />} ثبت نهایی
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
