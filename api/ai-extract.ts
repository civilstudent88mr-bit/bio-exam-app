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

const SYSTEM_PROMPT = `You are a strict exam-question transcription engine. Extract multiple-choice biology questions from the supplied text and images.\n\nNON-NEGOTIABLE SOURCE RULES:\n1. Treat supplied question images and text as the only source of truth. Transcribe exactly what is visible. Preserve Persian wording, punctuation, numbers, symbols, scientific names, and line meaning. Do not correct, rewrite, summarize, translate, or complete missing text from your own knowledge.\n2. Question images come first. Any images after the marker 'The final uploaded images are explanation images.' are explanation/answer images. Do not mix their content with question text.\n3. Explanation text or explanation images are the only source for the explanation field and correct answer. Copy the explanation faithfully, including all steps and details. Never shorten it or replace it with general knowledge.\n4. Select correctAnswer only when supported by supplied answer text or explanation image. Never solve from memory.\n5. Never invent options, explanations, or facts. If text is unreadable, keep the closest visible transcription instead of guessing.\n\nOUTPUT RULES:\n- Return JSON only, no Markdown or commentary.\n- Each question must have exactly four options.\n- correctAnswer is 1 to 4 and must match the supplied answer material.\n- difficulty is one of: ساده, متوسط, چالشی.\n- type is one of: مفهومی, خط‌به‌خط, ترکیبی, شکل‌دار, شمارشی.\n- Keep explanation as a faithful transcription, not a generated summary.\n- Exact shape: {\"questions\":[{\"text\":\"...\",\"options\":[\"...\",\"...\",\"...\",\"...\"],\"correctAnswer\":1,\"explanation\":\"...\",\"keyNote\":\"...\",\"difficulty\":\"متوسط\",\"type\":\"مفهومی\"}]}`;

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

    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}) as { text?: unknown; images?: unknown; provider?: unknown; apiKey?: unknown; options?: { grade?: string; chapter?: string; section?: string; questionImageCount?: number; answerImageCount?: number } };
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const images = Array.isArray(body.images) ? body.images.filter((image): image is string => typeof image === 'string') : [];
    if (!text && images.length === 0) return send(res, 400, { error: 'متن یا تصویر ارسال نشده است.' });
    if (text.length > MAX_TEXT_LENGTH || images.length > MAX_IMAGES || images.some(image => image.length > MAX_IMAGE_DATA_URL_LENGTH)) return send(res, 413, { error: 'حجم ورودی بیش از حد مجاز است.' });
    if (images.some(image => !/^data:image\/(jpeg|png|webp|gif);base64,/i.test(image))) return send(res, 400, { error: 'فرمت تصویر مجاز نیست.' });

    const provider = body.provider === 'openai' ? 'openai' : 'avalai';
    const suppliedApiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    const apiKey = suppliedApiKey || (provider === 'avalai' ? process.env.AVALAI_API_KEY : process.env.OPENAI_API_KEY);
    if (!apiKey) return send(res, 503, { error: 'سرویس هوش مصنوعی هنوز در تنظیمات سرور فعال نشده است.' });
    const content: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string; detail?: 'high' | 'low' | 'auto' } }> = [];
    content.push({ type: 'text', text: `${text}\n\nپایه: ${body.options?.grade || 'نامشخص'}\nفصل: ${body.options?.chapter || 'نامشخص'}\nمبحث: ${body.options?.section || 'نامشخص'}` });
    const questionImageCount = Math.max(0, Math.min(images.length, Number(body.options?.questionImageCount) || images.length));
    for (const [index, image] of images.entries()) {
      if (index === questionImageCount && index > 0) content.push({ type: 'text', text: 'The next images are explanation/answer images. Copy their explanation exactly and use them as the only source for correctAnswer.' });
      content.push({ type: 'image_url', image_url: { url: image, detail: 'high' } });
    }

    let openAiResponse: Response;
    try {
      openAiResponse = await fetch(`${provider === 'avalai' ? PROVIDER_BASE_URLS.avalai : PROVIDER_BASE_URLS.openai}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: process.env.AI_VISION_MODEL || 'gpt-4o', messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content }], response_format: { type: 'json_object' }, temperature: 0, max_tokens: 8000 }),
      });
    } catch (error) {
      console.error('AI provider request failed', error instanceof Error ? error.message : 'unknown error');
      return send(res, 502, { error: 'AI provider connection failed.', code: 'provider_request_failed' });
    }
    const providerBody = await openAiResponse.text();
    let result: { choices?: Array<{ message?: { content?: string } }> };
    try {
      result = JSON.parse(providerBody);
    } catch {
      return send(res, 502, { error: 'AI provider returned a non-JSON response.', code: 'provider_invalid_response', status: openAiResponse.status });
    }
    if (!openAiResponse.ok) return send(res, 502, { error: 'AI provider rejected the request.', code: 'provider_http_error', status: openAiResponse.status });
    const rawContent = result.choices?.[0]?.message?.content || '';
    const jsonCandidate = rawContent.replaceAll('```json', '').replaceAll('```', '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonCandidate);
    } catch {
      const jsonStart = jsonCandidate.indexOf('{');
      const jsonEnd = jsonCandidate.lastIndexOf('}');
      if (jsonStart < 0 || jsonEnd <= jsonStart) return send(res, 502, { error: 'AI returned an invalid JSON response.', code: 'invalid_ai_json' });
      try {
        parsed = JSON.parse(jsonCandidate.slice(jsonStart, jsonEnd + 1));
      } catch {
        return send(res, 502, { error: 'AI returned an invalid JSON response.', code: 'invalid_ai_json' });
      }
    }
    return send(res, 200, { questions: sanitizeQuestions(parsed) });
  } catch (error) {
    console.error('AI extraction failed', error instanceof Error ? error.message : 'unknown error');
    return send(res, 500, { error: 'AI extraction failed on the server.', code: 'ai_processing_failed' });
  }
}
