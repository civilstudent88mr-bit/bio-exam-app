import type { Question, ExamAttempt } from '@/types';

// Lightweight PDF generator — produces a printable HTML document and
// triggers the browser print dialog (user can "Save as PDF").
// This avoids heavy dependencies while delivering standard print output.

function printWindow(html: string): void {
  const w = window.open('', '_blank');
  if (!w) {
    alert('لطفاً اجازه باز شدن پنجره جدید را بدهید');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    setTimeout(() => {
      w.print();
    }, 300);
  };
}

const baseStyle = `
  <style>
    @page { margin: 1.5cm; }
    * { font-family: 'Vazirmatn', Tahoma, sans-serif; box-sizing: border-box; }
    body { direction: rtl; color: #1e293b; line-height: 1.8; font-size: 13px; }
    .header { text-align: center; border-bottom: 3px double #0d9488; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { font-size: 20px; color: #0f766e; margin: 0 0 4px; }
    .header .meta { font-size: 12px; color: #64748b; }
    .exam-code { text-align: center; margin: 12px 0; font-size: 13px; }
    .exam-code span { border: 1px solid #94a3b8; padding: 4px 16px; border-radius: 6px; letter-spacing: 2px; font-family: monospace; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .q { margin-bottom: 16px; break-inside: avoid; }
    .q .num { font-weight: 700; color: #0f766e; }
    .opts { list-style: none; padding: 0; margin: 8px 0 0; }
    .opts li { padding: 2px 0; }
    .opt-label { font-weight: 700; margin-left: 6px; }
    .footer { margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 11px; color: #94a3b8; }
    .answer-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; margin: 20px 0; }
    .answer-cell { border: 1px solid #94a3b8; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 11px; }
    .answer-cell .q-num { font-size: 10px; color: #64748b; }
    .explanation { background: #f0fdfa; border-right: 3px solid #14b8a6; padding: 8px 12px; margin-top: 6px; border-radius: 4px; font-size: 12px; }
    .keynote { background: #fffbeb; border-right: 3px solid #f59e0b; padding: 6px 12px; margin-top: 4px; border-radius: 4px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center; font-size: 12px; }
    th { background: #f0fdfa; color: #0f766e; }
    .stat-box { display: inline-block; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 20px; margin: 4px; text-align: center; }
    .stat-box .val { font-size: 22px; font-weight: 700; color: #0f766e; }
    .stat-box .lbl { font-size: 11px; color: #64748b; }
  </style>
`;

export function printExamPaper(title: string, code: string, questions: Question[]): void {
  const half = Math.ceil(questions.length / 2);
  const col1 = questions.slice(0, half);
  const col2 = questions.slice(half);
  const renderQ = (q: Question, i: number) => `
    <div class="q">
      <span class="num">${i + 1}.</span> ${q.text}
      <ul class="opts">
        ${q.options.map((o, idx) => `<li><span class="opt-label">${'الف‌ب‌ج‌د'[idx]}.</span> ${o}</li>`).join('')}
      </ul>
    </div>`;
  const html = `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap" rel="stylesheet">
    ${baseStyle}</head><body>
    <div class="header">
      <h1>${title}</h1>
      <div class="meta">آزمون زیست‌شناسی — سامانه آزمون‌ساز</div>
    </div>
    <div class="exam-code">کد آزمون: <span>${code}</span></div>
    <div class="cols">
      <div>${col1.map((q, i) => renderQ(q, i)).join('')}</div>
      <div>${col2.map((q, i) => renderQ(q, half + i)).join('')}</div>
    </div>
    <div class="footer">تولید شده توسط سامانه آزمون‌ساز زیست‌شناسی</div>
    </body></html>`;
  printWindow(html);
}

export function printAnswerSheet(title: string, code: string, count: number): void {
  const cells = Array.from({ length: count }, (_, i) => `
    <div class="answer-cell">
      <div class="q-num">${i + 1}</div>
    </div>`).join('');
  const html = `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>پاسخ‌برگ</title>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap" rel="stylesheet">
    ${baseStyle}</head><body>
    <div class="header">
      <h1>پاسخ‌برگ</h1>
      <div class="meta">${title} — کد: ${code}</div>
    </div>
    <p style="font-size:12px;color:#64748b">نام و نام خانوادگی: ____________________</p>
    <div class="answer-grid">${cells}</div>
    <div class="footer">سامانه آزمون‌ساز زیست‌شناسی</div>
    </body></html>`;
  printWindow(html);
}

export function printAnswerKey(title: string, code: string, questions: Question[]): void {
  const renderQ = (q: Question, i: number) => `
    <div class="q">
      <span class="num">${i + 1}.</span> ${q.text}
      <div style="margin-top:4px;font-size:12px">پاسخ صحیح: <b>${'الف‌ب‌ج‌د'[q.correctAnswer]}</b></div>
      <div class="explanation"><b>پاسخ تشریحی:</b> ${q.explanation}</div>
      ${q.keyNote ? `<div class="keynote"><b>نکته کلیدی:</b> ${q.keyNote}</div>` : ''}
    </div>`;
  const html = `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>پاسخ‌نامه تشریحی</title>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap" rel="stylesheet">
    ${baseStyle}</head><body>
    <div class="header">
      <h1>پاسخ‌نامه تشریحی</h1>
      <div class="meta">${title} — کد: ${code}</div>
    </div>
    ${questions.map((q, i) => renderQ(q, i)).join('')}
    <div class="footer">سامانه آزمون‌ساز زیست‌شناسی</div>
    </body></html>`;
  printWindow(html);
}

export function printReportCard(
  title: string,
  code: string,
  attempt: ExamAttempt,
  questions: Question[],
  studentName: string
): void {
  const status = (i: number) => {
    const ans = attempt.answers[i];
    if (ans === undefined) return { label: 'نزده', color: '#94a3b8' };
    if (ans === questions[i].correctAnswer) return { label: 'درست', color: '#16a34a' };
    return { label: 'غلط', color: '#dc2626' };
  };
  const rows = questions.map((q, i) => {
    const s = status(i);
    const ans = attempt.answers[i];
    return `<tr>
      <td>${i + 1}</td>
      <td style="color:${s.color};font-weight:700">${s.label}</td>
      <td>${ans !== undefined ? 'الف‌ب‌ج‌د'[ans] : '—'}</td>
      <td>${'الف‌ب‌ج‌د'[q.correctAnswer]}</td>
      <td style="text-align:right;font-size:11px">${q.explanation}</td>
    </tr>`;
  }).join('');
  const html = `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>کارنامه</title>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap" rel="stylesheet">
    ${baseStyle}</head><body>
    <div class="header">
      <h1>کارنامه آزمون</h1>
      <div class="meta">${title} — کد: ${code}</div>
    </div>
    <p style="font-size:13px">دانش‌آموز: <b>${studentName}</b></p>
    <div style="text-align:center;margin:16px 0">
      <div class="stat-box"><div class="val">${attempt.percentage}٪</div><div class="lbl">درصد کنکوری</div></div>
      <div class="stat-box"><div class="val">${attempt.correct}</div><div class="lbl">درست</div></div>
      <div class="stat-box"><div class="val">${attempt.wrong}</div><div class="lbl">غلط</div></div>
      <div class="stat-box"><div class="val">${attempt.blank}</div><div class="lbl">نزده</div></div>
    </div>
    <table>
      <tr><th>سوال</th><th>وضعیت</th><th>پاسخ شما</th><th>پاسخ صحیح</th><th>توضیح</th></tr>
      ${rows}
    </table>
    <div class="footer">سامانه آزمون‌ساز زیست‌شناسی</div>
    </body></html>`;
  printWindow(html);
}

export function printExamResults(
  title: string,
  code: string,
  rows: { name: string; percentage: number; correct: number; wrong: number; blank: number; timeSpentSec: number; paid: boolean }[]
): void {
  const trows = rows.map((r, i) => `<tr>
    <td>${i + 1}</td>
    <td>${r.name}</td>
    <td style="font-weight:700;color:#0f766e">${r.percentage}٪</td>
    <td>${r.correct}</td>
    <td>${r.wrong}</td>
    <td>${r.blank}</td>
    <td>${Math.floor(r.timeSpentSec / 60)} دقیقه</td>
    <td style="color:${r.paid ? '#16a34a' : '#dc2626'}">${r.paid ? 'پرداخت شده' : 'پرداخت نشده'}</td>
  </tr>`).join('');
  const html = `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>گزارش آزمون</title>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap" rel="stylesheet">
    ${baseStyle}</head><body>
    <div class="header">
      <h1>گزارش آزمون</h1>
      <div class="meta">${title} — کد: ${code}</div>
    </div>
    <table>
      <tr><th>ردیف</th><th>نام</th><th>درصد</th><th>درست</th><th>غلط</th><th>نزده</th><th>زمان</th><th>پرداخت</th></tr>
      ${trows}
    </table>
    <div class="footer">سامانه آزمون‌ساز زیست‌شناسی</div>
    </body></html>`;
  printWindow(html);
}
