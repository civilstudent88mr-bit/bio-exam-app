import type { IncomingMessage, ServerResponse } from 'node:http';

type Request = IncomingMessage & { body?: unknown };
type Response = ServerResponse & { status: (code: number) => Response; json: (body: unknown) => void };

type QuestionInput = {
  text?: unknown;
  options?: unknown;
  correctAnswer?: unknown;
  explanation?: unknown;
  keyNote?: unknown;
  difficulty?: unknown;
  type?: unknown;
};

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_IMAGES = 6;
const MAX_IMAGE_DATA_URL_LENGTH = 7_000_000;
const MAX_TEXT_LENGTH = 50_000;
const PROVIDER_BASE_URLS = { avalai: 'https://api.avalai.ir/v1', openai: 'https://api.openai.com/v1' } as const;

const SYSTEM_PROMPT = `تو یک دستیار متخصص استخراج سوالات چهارگزینه‌ای زیست‌شناسی هستی.
از متن یا تصاویر آزمون، فقط سوالات چهارگزینه‌ای را استخراج کن.
برای هر سوال متن، دقیقاً چهار گزینه، شماره گزینه صحیح از 1 تا 4، پاسخ تشریحی، نکته کلیدی، سطح دشواری و نوع سوال را برگردان.
سطح دشواری فقط یکی از «ساده»، «متوسط»، «چالشی» باشد.
نوع سوال فقط یکی از «مفهومی»، «خط‌به‌خط»، «ترکیبی»، «شکل‌دار»، «شماری» باشد.
پاسخ را فقط به صورت JSON با ساختار زیر برگردان:
{"questions":[{"text":"...","options":["...","...","...","..."],"correctAnswer":1,"explanation":"...","keyNote":"...","difficulty":"متوسط","type":"مفهومی"}]}
اگر پاسخ صحیح از تصویر قابل تشخیص نیست، حدس نزن و سوال را برنگردان.`;

function send(res: Response, status: number, body: unknown) {
  res.status(status).json(body);
}

function getClientKey(req: Request, userId: string) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : 'unknown';
  return `${userId}:${ip}`;
}

function isAllowed(key: string) {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

async function verifyTeacher(req: Request) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) return { userId: '', errorCode: 'missing_auth_config' };

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) return { userId: '', errorCode: 'supabase_user_rejected' };
  const user = await userResponse.json() as { id?: string };
  if (!user.id) return { userId: '', errorCode: 'invalid_user' };

  const query = new URLSearchParams({ select: 'id', auth_user_id: `eq.${user.id}`, limit: '1' });
  const teacherResponse = await fetch(`${supabaseUrl}/rest/v1/teachers?${query}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!teacherResponse.ok) return { userId: '', errorCode: `teacher_query_failed_${teacherResponse.status}` };
  const teachers = await teacherResponse.json() as Array<{ id: string }>;
  return teachers[0] ? { userId: user.id } : { userId: '', errorCode: 'teacher_profile_not_linked' };
}

function sanitizeQuestions(value: unknown) {
  if (!value || typeof value !== 'object') return [];
  const questions = Array.isArray((value as { questions?: unknown }).questions)
    ? (value as { questions: unknown[] }).questions
    : [];
  return questions.slice(0, 50).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const question = item as QuestionInput;
    const options = Array.isArray(question.options) ? question.options.slice(0, 4).map(String) : [];
    const correctAnswer = Number(question.correctAnswer);
    if (typeof question.text !== 'string' || !question.text.trim() || options.length !== 4 || correctAnswer < 1 || correctAnswer > 4) return [];
    return [{
      text: question.text.trim().slice(0, 10_000),
      options: options.map(option => option.trim().slice(0, 2_000)),
      correctAnswer,
      explanation: typeof question.explanation === 'string' ? question.explanation.trim().slice(0, 5_000) : '',
      keyNote: typeof question.keyNote === 'string' ? question.keyNote.trim().slice(0, 2_000) : '',
      difficulty: typeof question.difficulty === 'string' ? question.difficulty : 'متوسط',
      type: typeof question.type === 'string' ? question.type : 'مفهومی',
    }];
  });
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  try {
    const teacher = await verifyTeacher(req);
    if (!teacher?.userId) return send(res, 401, { error: 'Teacher authentication is invalid.', code: teacher?.errorCode || 'unauthorized' });
    if (!isAllowed(getClientKey(req, teacher.userId))) return send(res, 429, { error: 'تعداد درخواست‌ها زیاد است. یک دقیقه بعد دوباره تلاش کنید.' });

    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}) as { text?: unknown; images?: unknown; provider?: unknown; apiKey?: unknown; options?: { grade?: string; chapter?: string; section?: string } };
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const images = Array.isArray(body.images) ? body.images.filter((image): image is string => typeof image === 'string') : [];
    if (!text && images.length === 0) return send(res, 400, { error: 'متن یا تصویر ارسال نشده است.' });
    if (text.length > MAX_TEXT_LENGTH || images.length > MAX_IMAGES || images.some(image => image.length > MAX_IMAGE_DATA_URL_LENGTH)) return send(res, 413, { error: 'حجم ورودی بیش از حد مجاز است.' });
    if (images.some(image => !/^data:image\/(jpeg|png|webp|gif);base64,/i.test(image))) return send(res, 400, { error: 'فرمت تصویر مجاز نیست.' });

    const provider = body.provider === 'openai' ? 'openai' : 'avalai';
    const suppliedApiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    const apiKey = suppliedApiKey || (provider === 'avalai' ? process.env.AVALAI_API_KEY : process.env.OPENAI_API_KEY);
    if (!apiKey) return send(res, 503, { error: 'سرویس هوش مصنوعی هنوز در تنظیمات سرور فعال نشده است.' });
    const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [];
    content.push({ type: 'text', text: `${text}\n\nپایه: ${body.options?.grade || 'نامشخص'}\nفصل: ${body.options?.chapter || 'نامشخص'}\nمبحث: ${body.options?.section || 'نامشخص'}` });
    for (const image of images) content.push({ type: 'image_url', image_url: { url: image } });

    const openAiResponse = await fetch(`${provider === 'avalai' ? PROVIDER_BASE_URLS.avalai : PROVIDER_BASE_URLS.openai}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content }], response_format: { type: 'json_object' }, temperature: 0.1 }),
    });
    if (!openAiResponse.ok) return send(res, 502, { error: 'پاسخ سرویس هوش مصنوعی دریافت نشد.' });
    const result = await openAiResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = JSON.parse(result.choices?.[0]?.message?.content || '{}');
    return send(res, 200, { questions: sanitizeQuestions(parsed) });
  } catch (error) {
    console.error('AI extraction failed', error instanceof Error ? error.message : 'unknown error');
    return send(res, 500, { error: 'استخراج سوالات با خطای سرور مواجه شد.' });
  }
}
