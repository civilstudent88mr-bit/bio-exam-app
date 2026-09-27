import type { Question, ExamAttempt, Exam, Student } from '@/types';

// Standard Konkur scoring: (3*correct - wrong) / (3*total) * 100
export function calcPercentage(correct: number, wrong: number, total: number): number {
  if (total === 0) return 0;
  const score = ((3 * correct - wrong) / (3 * total)) * 100;
  return Math.max(0, Math.round(score * 10) / 10);
}

export function gradeAnswers(
  answers: Record<number, 0 | 1 | 2 | 3>,
  questions: Question[]
): { correct: number; wrong: number; blank: number; percentage: number } {
  let correct = 0;
  let wrong = 0;
  let blank = 0;
  questions.forEach((q, i) => {
    const ans = answers[i];
    if (ans === undefined) {
      blank++;
    } else if (ans === q.correctAnswer) {
      correct++;
    } else {
      wrong++;
    }
  });
  return { correct, wrong, blank, percentage: calcPercentage(correct, wrong, questions.length) };
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export interface ExamAnalytics {
  score: number;
  classRank: number;
  classTotal: number;
  schoolRank: number;
  schoolTotal: number;
}

export function getExamAnalytics(attempt: ExamAttempt, exam: Exam | undefined, attempts: ExamAttempt[], students: Student[]): ExamAnalytics {
  const submitted = attempts.filter(item => item.examId === attempt.examId && item.status === 'submitted');
  const values = submitted.map(item => item.percentage);
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : attempt.percentage;
  const variance = values.length > 1 ? values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length : 0;
  const deviation = Math.sqrt(variance);
  const score = attempt.score ?? Math.max(1000, Math.min(10000, Math.round(deviation > 0 ? 5000 + ((attempt.percentage - mean) / deviation) * 1000 : 5000)));
  const student = students.find(item => item.id === attempt.studentId);
  const schoolId = student?.schoolId || exam?.schoolId;
  const classAttempts = submitted.filter(item => students.find(candidate => candidate.id === item.studentId)?.classId === student?.classId);
  const schoolAttempts = submitted.filter(item => students.find(candidate => candidate.id === item.studentId)?.schoolId === schoolId);
  const rank = (pool: ExamAttempt[]) => 1 + pool.filter(item => item.percentage > attempt.percentage).length;
  return { score, classRank: rank(classAttempts), classTotal: classAttempts.length, schoolRank: rank(schoolAttempts), schoolTotal: schoolAttempts.length };
}

export function toFaNum(n: number | string): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}
