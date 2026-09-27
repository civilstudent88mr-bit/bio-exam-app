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
}

export async function getApiKey(): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('openai_api_key')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data?.openai_api_key || null;
}

export async function setApiKey(key: string): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ id: 1, openai_api_key: key, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
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

async function callOpenAI(apiKey: string, userContent: string, images: string[]): Promise<AIQuestion[]> {
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

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let msg = `خطای API (${res.status})`;
    try {
      const parsed = JSON.parse(errBody);
      msg = parsed.error?.message || msg;
    } catch { /* keep default */ }
    throw new Error(msg);
  }

  const data = await res.json();
  const contentStr = data.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(contentStr);
  return parsed.questions || [];
}

export async function extractFromText(
  text: string,
  opts: AIExtractOptions = {}
): Promise<Omit<Question, 'id' | 'createdAt'>[]> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('کلید API تنظیم نشده است. ابتدا از دکمه تنظیمات، کلید OpenAI خود را وارد کنید.');

  const raw = await callOpenAI(apiKey, text, []);
  return normalizeQuestions(raw, opts);
}

export async function extractFromImages(
  images: string[],
  opts: AIExtractOptions = {}
): Promise<Omit<Question, 'id' | 'createdAt'>[]> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('کلید API تنظیم نشده است. ابتدا از دکمه تنظیمات، کلید OpenAI خود را وارد کنید.');

  const raw = await callOpenAI(apiKey, '', images);
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
