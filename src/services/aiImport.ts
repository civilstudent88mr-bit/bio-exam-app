import { supabase } from '@/lib/supabase';
import type { Question, Grade, Difficulty, QuestionType } from '@/types';

const SYSTEM_PROMPT = `تو یک دستیار تخصصی برای استخراج سوالات چهارگزینه‌ای زیست‌شناسی هستی.
کاربر متن یا تصویر یک آزمون زیست‌شناسی را به تو می‌دهد. وظیفه تو این است:
۱. تمام سوالات چهارگزینه‌ای را از متن استخراج کنی.
۲. برای هر سوال: متن سوال، چهار گزینه، گزینه صحیح (عدد ۱ تا ۴)، پاسخ تشریحی، نکته کلیدی/دام تستی (در صورت وجود)، و درجه سختی را مشخص کنی.
۳. درجه سختی فقط یکی از این مقادیر باشد: "ساده"، "متوسط"، "چالشی".
۴. تیپ سوال یکی از این مقادیر باشد: "مفهومی"، "خط‌به‌خط"، "ترکیبی"، "شکل‌دار"، "شمارشی".
۵. پایه یکی از این مقادیر باشد: "دهم"، "یازدهم"، "دوازدهم".

پاسخ را حتماً به صورت JSON با ساختار زیر بده:
{
  "questions": [
    {
      "text": "متن سوال",
      "options": ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
      "correctAnswer": 1,
      "explanation": "پاسخ تشریحی",
      "keyNote": "نکته کلیدی یا دام تستی",
      "difficulty": "متوسط",
      "type": "مفهومی"
    }
  ]
}

correctAnswer عددی بین ۱ تا ۴ است (۱ یعنی گزینه اول).
اگر نکته کلیدی وجود ندارد، آن را خالی بگذار.
فقط سوالات چهارگزینه‌ای را استخراج کن و از سوالات تشریحی یا صحیح/غلط چشم‌پوشی کن.`;

export interface AIExtractOptions {
  grade?: Grade;
  chapter?: string;
  section?: string;
  provider?: 'avalai' | 'openai';
  apiKey?: string;
}

interface AIQuestion {
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  keyNote: string;
  difficulty: string;
  type: string;
}

function normalizeQuestions(
  raw: AIQuestion[],
  opts: AIExtractOptions
): Omit<Question, 'id' | 'createdAt'>[] {
  const validGrades: Grade[] = ['دهم', 'یازدهم', 'دوازدهم'];
  const validDiffs: Difficulty[] = ['ساده', 'متوسط', 'چالشی'];
  const validTypes: QuestionType[] = ['مفهومی', 'خط‌به‌خط', 'ترکیبی', 'شکل‌دار', 'شمارشی'];

  return raw
    .filter(q => q.text && Array.isArray(q.options) && q.options.length >= 4)
    .map(q => {
      const correctIdx = Math.max(0, Math.min(3, (q.correctAnswer || 1) - 1));
      const diff = validDiffs.includes(q.difficulty as Difficulty) ? q.difficulty as Difficulty : 'متوسط';
      const type = validTypes.includes(q.type as QuestionType) ? q.type as QuestionType : 'مفهومی';
      const grade = (opts.grade && validGrades.includes(opts.grade)) ? opts.grade : 'دهم';

      return {
        text: q.text.trim(),
        options: [
          (q.options[0] || '').trim(),
          (q.options[1] || '').trim(),
          (q.options[2] || '').trim(),
          (q.options[3] || '').trim(),
        ] as [string, string, string, string],
        correctAnswer: correctIdx as 0 | 1 | 2 | 3,
        explanation: (q.explanation || '').trim(),
        keyNote: (q.keyNote || '').trim(),
        grade,
        chapter: opts.chapter || '',
        section: opts.section || '',
        difficulty: diff,
        type,
      };
    });
}

async function callOpenAI(userContent: string, images: string[], opts: AIExtractOptions): Promise<AIQuestion[]> {
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

  if (userContent) {
    content.push({ type: 'text', text: userContent });
  }
  for (const img of images) {
    content.push({ type: 'image_url', image_url: { url: img } });
  }

  if (content.length === 0) {
    throw new Error('هیچ ورودی برای استخراج ارائه نشده است');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  let accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    accessToken = refreshed.session?.access_token;
  }
  if (!accessToken) throw new Error('جلسه ورود معلم منقضی شده است. لطفاً دوباره وارد شوید.');
  const res = await fetch('/api/ai-extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text: userContent, images, options: opts, provider: opts.provider, apiKey: opts.apiKey }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let msg = `خطای API (${res.status})`;
    try {
      const parsed = JSON.parse(errBody);
      msg = parsed.error?.message || (parsed.code ? ${msg}:  : msg);
    } catch { /* keep default */ }
    throw new Error(msg);
  }

  const data = await res.json();
  return data.questions || [];
}

export async function extractFromText(
  text: string,
  opts: AIExtractOptions = {}
): Promise<Omit<Question, 'id' | 'createdAt'>[]> {
  const raw = await callOpenAI(text, [], opts);
  return normalizeQuestions(raw, opts);
}

export async function extractFromImages(
  images: string[],
  opts: AIExtractOptions = {}
): Promise<Omit<Question, 'id' | 'createdAt'>[]> {
  const raw = await callOpenAI('', images, opts);
  return normalizeQuestions(raw, opts);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
    reader.readAsDataURL(file);
  });
}
