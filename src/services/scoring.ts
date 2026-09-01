import type { Question, ExamAttempt } from '@/types';

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

export function toFaNum(n: number | string): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}
