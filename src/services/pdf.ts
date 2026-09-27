import type { Question, ExamAttempt } from '@/types';
import { OPTION_LABELS } from '@/types';

function toFaNum(n: number | string): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function openPrintWindow(html: string): void {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>چاپ</title>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      * { font-family: 'Vazirmatn', sans-serif; box-sizing: border-box; }
      body { padding: 24px; color: #1e293b; line-height: 1.7; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      h2 { font-size: 16px; margin: 20px 0 10px; }
      .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 20px; }
      .meta { font-size: 13px; color: #64748b; margin-bottom: 4px; }
      .q { margin-bottom: 16px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; }
      .q-num { font-weight: bold; }
      .opt { margin: 4px 0 4px 20px; font-size: 14px; }
      .answer-key { background: #f0fdfa; border-color: #5eead4; }
      .correct { color: #16a34a; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-size: 13px; }
      th { background: #f8fafc; }
      .sheet { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 16px; }
      .cell { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center; }
      .cell .n { font-weight: bold; font-size: 12px; }
      .cell .circles { display: flex; gap: 6px; justify-content: center; margin-top: 6px; }
      .circle { width: 18px; height: 18px; border: 1.5px solid #475569; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; }
      .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
      .summary .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
      .summary .val { font-size: 24px; font-weight: bold; }
      .summary .lbl { font-size: 12px; color: #64748b; }
      @media print { body { padding: 12px; } }
    </style></head><body>${html}</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 600);
}

export function printExamPaper(title: string, code: string, questions: Question[]): void {
  let html = `<div class="header"><h1>${title}</h1><div class="meta">کد آزمون: ${code} • تعداد سوالات: ${toFaNum(questions.length)}</div></div>`;
  questions.forEach((q, i) => {
    html += `<div class="q"><span class="q-num">${toFaNum(i + 1)}.</span> ${q.text}`;
    q.options.forEach((opt, oi) => {
      html += `<div class="opt">${OPTION_LABELS[oi]}) ${opt}</div>`;
    });
    html += `</div>`;
  });
  openPrintWindow(html);
}

export function printAnswerSheet(title: string, code: string, count: number): void {
  let html = `<div class="header"><h1>${title}</h1><div class="meta">کد آزمون: ${code} • پاسخ‌برگ</div></div>`;
  html += `<div class="sheet">`;
  for (let i = 0; i < count; i++) {
    html += `<div class="cell"><div class="n">${toFaNum(i + 1)}</div><div class="circles">`;
    for (let j = 0; j < 4; j++) {
      html += `<div class="circle">${OPTION_LABELS[j]}</div>`;
    }
    html += `</div></div>`;
  }
  html += `</div>`;
  openPrintWindow(html);
}

export function printAnswerKey(title: string, code: string, questions: Question[]): void {
  let html = `<div class="header"><h1>${title}</h1><div class="meta">کد آزمون: ${code} • پاسخ‌نامه کلیدی</div></div>`;
  questions.forEach((q, i) => {
    html += `<div class="q answer-key"><span class="q-num">${toFaNum(i + 1)}.</span> ${q.text}`;
    q.options.forEach((opt, oi) => {
      const isCorrect = oi === q.correctAnswer;
      html += `<div class="opt ${isCorrect ? 'correct' : ''}">${OPTION_LABELS[oi]}) ${opt}${isCorrect ? ' ✓' : ''}</div>`;
    });
    if (q.explanation) html += `<div style="margin-top:6px;font-size:13px;color:#334155;"><b>پاسخ تشریحی:</b> ${q.explanation}</div>`;
    html += `</div>`;
  });
  openPrintWindow(html);
}

interface ResultRow {
  name: string;
  percentage: number;
  correct: number;
  wrong: number;
  blank: number;
  timeSpentSec: number;
  paid: boolean;
}

export function printExamResults(title: string, code: string, rows: ResultRow[]): void {
  let html = `<div class="header"><h1>${title}</h1><div class="meta">کد آزمون: ${code} • گزارش نتایج</div></div>`;
  html += `<table><thead><tr><th>ردیف</th><th>نام</th><th>درصد</th><th>درست</th><th>غلط</th><th>نزده</th><th>زمان</th></tr></thead><tbody>`;
  rows.forEach((r, i) => {
    html += `<tr><td>${toFaNum(i + 1)}</td><td style="text-align:right">${r.name}</td><td>${toFaNum(r.percentage)}٪</td><td>${toFaNum(r.correct)}</td><td>${toFaNum(r.wrong)}</td><td>${toFaNum(r.blank)}</td><td>${Math.floor(r.timeSpentSec / 60)} دقیقه</td></tr>`;
  });
  html += `</tbody></table>`;
  openPrintWindow(html);
}

export function printReportCard(
  title: string,
  code: string,
  attempt: ExamAttempt,
  questions: Question[],
  studentName: string,
): void {
  const faDate = new Date(attempt.submittedAt || attempt.startedAt).toLocaleString('fa-IR');
  let html = `<div class="header"><h1>کارنامه: ${title}</h1><div class="meta">کد: ${code} • ${studentName} • ${faDate}</div></div>`;
  html += `<div class="summary">`;
  html += `<div class="box"><div class="val" style="color:#0d9488">${toFaNum(attempt.percentage)}٪</div><div class="lbl">درصد کنکوری</div></div>`;
  html += `<div class="box"><div class="val" style="color:#16a34a">${toFaNum(attempt.correct)}</div><div class="lbl">درست</div></div>`;
  html += `<div class="box"><div class="val" style="color:#ef4444">${toFaNum(attempt.wrong)}</div><div class="lbl">غلط</div></div>`;
  html += `<div class="box"><div class="val" style="color:#64748b">${toFaNum(attempt.blank)}</div><div class="lbl">نزده</div></div>`;
  html += `</div>`;
  html += `<div class="meta">زمان صرف‌شده: ${formatTime(attempt.timeSpentSec)}</div>`;
  html += `<h2>پاسخ‌نامه</h2>`;
  questions.forEach((q, i) => {
    const ans = attempt.answers[i];
    const isCorrect = ans === q.correctAnswer;
    const isBlank = ans === undefined;
    const statusLabel = isBlank ? 'نزده' : isCorrect ? 'درست' : 'غلط';
    const statusColor = isBlank ? '#64748b' : isCorrect ? '#16a34a' : '#ef4444';
    html += `<div class="q ${isCorrect ? 'answer-key' : ''}">`;
    html += `<span class="q-num">${toFaNum(i + 1)}.</span> <span style="color:${statusColor};font-weight:bold;font-size:12px">[${statusLabel}]</span> ${q.text}`;
    q.options.forEach((opt, oi) => {
      const isRight = oi === q.correctAnswer;
      const isUser = ans === oi;
      let cls = 'opt';
      if (isRight) cls += ' correct';
      else if (isUser) cls += ' style="color:#ef4444;font-weight:bold"';
      html += `<div class="${cls}">${OPTION_LABELS[oi]}) ${opt}${isRight ? ' ✓' : isUser ? ' ✗' : ''}</div>`;
    });
    if (q.explanation) html += `<div style="margin-top:6px;font-size:13px;color:#334155;"><b>پاسخ تشریحی:</b> ${q.explanation}</div>`;
    html += `</div>`;
  });
  openPrintWindow(html);
}
