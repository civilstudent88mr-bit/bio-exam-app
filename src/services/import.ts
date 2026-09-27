import * as XLSX from 'xlsx';
import type { Question, Grade, Difficulty, QuestionType } from '@/types';

// ============================================================
// Column header aliases (Persian + English)
// ============================================================

const HEADER_MAP: Record<string, string> = {
  // text
  'text': 'text', 'questiontext': 'text', 'متن سوال': 'text', 'سوال': 'text', 'صورت سوال': 'text',
  // option1
  'option1': 'option1', 'گزینه ۱': 'option1', 'گزینه1': 'option1', 'الف': 'option1', 'گزینه الف': 'option1',
  // option2
  'option2': 'option2', 'گزینه ۲': 'option2', 'گزینه2': 'option2', 'ب': 'option2', 'گزینه ب': 'option2',
  // option3
  'option3': 'option3', 'گزینه ۳': 'option3', 'گزینه3': 'option3', 'ج': 'option3', 'گزینه ج': 'option3',
  // option4
  'option4': 'option4', 'گزینه ۴': 'option4', 'گزینه4': 'option4', 'د': 'option4', 'گزینه د': 'option4',
  // correct answer
  'correctanswer': 'correctAnswer', 'گزینه صحیح': 'correctAnswer', 'پاسخ': 'correctAnswer', 'پاسخ صحیح': 'correctAnswer', 'correct': 'correctAnswer',
  // explanation
  'explanation': 'explanation', 'پاسخ تشریحی': 'explanation', 'توضیحات': 'explanation', 'تشریح': 'explanation',
  // key note
  'keynote': 'keyNote', 'نکته': 'keyNote', 'نکته کلیدی': 'keyNote', 'دام تستی': 'keyNote',
  // grade
  'grade': 'grade', 'پایه': 'grade',
  // chapter
  'chapter': 'chapter', 'فصل': 'chapter',
  // section
  'section': 'section', 'گفتار': 'section', 'مبحث': 'section', 'topic': 'section',
  // difficulty
  'difficulty': 'difficulty', 'سختی': 'difficulty', 'درجه سختی': 'difficulty',
  // type
  'type': 'type', 'تیپ': 'type', 'نوع': 'type',
};

const DIFFICULTY_MAP: Record<string, Difficulty> = {
  'ساده': 'ساده', 'آسان': 'ساده', 'easy': 'ساده',
  'متوسط': 'متوسط', 'medium': 'متوسط',
  'دشوار': 'چالشی', 'چالشی': 'چالشی', 'سخت': 'چالشی', 'hard': 'چالشی',
};

const LETTER_MAP: Record<string, number> = { 'الف': 0, 'ب': 1, 'ج': 2, 'د': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '').replace(/‌/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک');
}

function mapRowToQuestion(row: Record<string, string>): Omit<Question, 'id' | 'createdAt'> | null {
  const mapped: Record<string, string> = {};
  for (const [key, val] of Object.entries(row)) {
    const norm = normalizeHeader(key);
    const target = HEADER_MAP[norm] || HEADER_MAP[key.trim().toLowerCase()] || '';
    if (target) mapped[target] = (val || '').trim();
  }

  const text = mapped.text || '';
  if (!text) return null;

  const options = [mapped.option1 || '', mapped.option2 || '', mapped.option3 || '', mapped.option4 || ''];
  if (options.some(o => !o)) return null;

  let correctIdx: number;
  const rawAns = (mapped.correctAnswer || '1').trim();
  if (LETTER_MAP[rawAns.toLowerCase()] !== undefined) {
    correctIdx = LETTER_MAP[rawAns.toLowerCase()];
  } else if (LETTER_MAP[rawAns] !== undefined) {
    correctIdx = LETTER_MAP[rawAns];
  } else {
    correctIdx = Math.max(0, Math.min(3, parseInt(rawAns, 10) - 1));
    if (isNaN(correctIdx)) correctIdx = 0;
  }

  const diffRaw = (mapped.difficulty || 'متوسط').trim();
  const difficulty: Difficulty = DIFFICULTY_MAP[diffRaw.toLowerCase()] || DIFFICULTY_MAP[diffRaw] || 'متوسط';

  const validGrades: Grade[] = ['دهم', 'یازدهم', 'دوازدهم'];
  const grade = (validGrades.includes(mapped.grade as Grade) ? mapped.grade : 'دهم') as Grade;

  const validTypes: QuestionType[] = ['مفهومی', 'خط‌به‌خط', 'ترکیبی', 'شکل‌دار', 'شمارشی'];
  const type = (validTypes.includes(mapped.type as QuestionType) ? mapped.type : 'مفهومی') as QuestionType;

  return {
    text,
    options: options as [string, string, string, string],
    correctAnswer: correctIdx as 0 | 1 | 2 | 3,
    explanation: mapped.explanation || '',
    keyNote: mapped.keyNote || '',
    grade,
    chapter: mapped.chapter || '',
    section: mapped.section || '',
    difficulty,
    type,
  };
}

// ============================================================
// Public API
// ============================================================

export function parseCsv(csvText: string): Omit<Question, 'id' | 'createdAt'>[] {
  const text = csvText.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]);
  const results: Omit<Question, 'id' | 'createdAt'>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] || ''; });
    const q = mapRowToQuestion(row);
    if (q) results.push(q);
  }
  return results;
}

export function parseExcel(arrayBuffer: ArrayBuffer): Omit<Question, 'id' | 'createdAt'>[] {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  const results: Omit<Question, 'id' | 'createdAt'>[] = [];
  for (const row of rows) {
    const stringRow: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) { stringRow[k] = String(v ?? '').trim(); }
    const q = mapRowToQuestion(stringRow);
    if (q) results.push(q);
  }
  return results;
}

export async function parseFile(file: File): Promise<Omit<Question, 'id' | 'createdAt'>[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer();
    return parseExcel(buf);
  }
  const text = await file.text();
  return parseCsv(text);
}

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === ',' && !inQuote) {
      result.push(cur); cur = '';
    } else { cur += ch; }
  }
  result.push(cur);
  return result;
}

// ============================================================
// Sample template
// ============================================================

export function getSampleCsv(): string {
  const headers = 'متن سوال,گزینه ۱,گزینه ۲,گزینه ۳,گزینه ۴,گزینه صحیح,پاسخ تشریحی,نکته کلیدی,پایه,فصل,گفتار,سختی,تیپ';
  const sample = [
    'کدام‌یک از زیر واحد ساختاری DNA نیست؟,قند پنتوز,باز آلی,گروه فسفات,اسید آمینه,۴,DNA از قند پنتوز، باز آلی و گروه فسفات تشکیل شده است. اسید آمینه واحد پروتئین است.,دام: اسید آمینه با باز نیتروژنی اشتباه گرفته می‌شود,دهم,فصل ۳,گفتار ۱,متوسط,مفهومی',
    'واحد ساختاری پروتئین چیست؟,اسید آمینه,قند پنتوز,گروه فسفات,باز آلی,۱,پروتئین‌ها از زنجیره اسید آمینه‌ها تشکیل می‌شوند.,نکته: پیوند پپتیدی اسید آمینه‌ها را متصل می‌کند,دهم,فصل ۳,گفتار ۲,ساده,خط‌به‌خط',
  ];
  return [headers, ...sample].join('\n');
}

export function downloadSampleCsv(): void {
  const blob = new Blob(['\uFEFF' + getSampleCsv()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample-questions.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSampleExcel(): void {
  const data = [
    ['متن سوال', 'گزینه ۱', 'گزینه ۲', 'گزینه ۳', 'گزینه ۴', 'گزینه صحیح', 'پاسخ تشریحی', 'نکته کلیدی', 'پایه', 'فصل', 'گفتار', 'سختی', 'تیپ'],
    ['کدام‌یک از زیر واحد ساختاری DNA نیست؟', 'قند پنتوز', 'باز آلی', 'گروه فسفات', 'اسید آمینه', '۴', 'DNA از قند پنتوز، باز آلی و گروه فسفات تشکیل شده است.', 'دام: اسید آمینه با باز نیتروژنی اشتباه گرفته می‌شود', 'دهم', 'فصل ۳', 'گفتار ۱', 'متوسط', 'مفهومی'],
    ['واحد ساختاری پروتئین چیست؟', 'اسید آمینه', 'قند پنتوز', 'گروه فسفات', 'باز آلی', '۱', 'پروتئین‌ها از زنجیره اسید آمینه‌ها تشکیل می‌شوند.', 'نکته: پیوند پپتیدی اسید آمینه‌ها را متصل می‌کند', 'دهم', 'فصل ۳', 'گفتار ۲', 'ساده', 'خط‌به‌خط'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 35 }, { wch: 30 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  XLSX.writeFile(wb, 'sample-questions.xlsx');
}
