import type { IncomingMessage, ServerResponse } from 'node:http';
type Request = IncomingMessage & { body?: unknown };
type Response = ServerResponse & { status: (code: number) => Response; json: (body: unknown) => void };
const SYSTEM_PROMPT = `You create a practical Persian weekly study plan for a high-school student. Return JSON only with exactly {"days":[...]} and seven days. Each day has day (1-7), date (YYYY-MM-DD), title, tasks. Each task has type (study, even-practice, odd-practice, chapter-review), title, subject, topic, tests (integer), completed (false), report (empty string). Rules: Day 1 studies the first portion then does 20 even educational questions. Each following day starts with 20 odd/covering questions from the previous day's topic, then studies a new portion and does 20 even educational questions. When a chapter/topic is completed, add a chapter-review task that asks for all questions of that chapter; use tests 0 when exact count is unknown. Do not invent textbook page numbers. Use supplied pages/chapters/sections exactly. Distribute subjects fairly. Do not add fields outside the requested shape.`;
function send(res: Response, status: number, body: unknown) { res.status(status).json(body); }
async function verifyStudent(req: Request) {
  const token = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) return false;
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
  if (!userResponse.ok) return false;
  const user = await userResponse.json() as { id?: string };
  if (!user.id) return false;
  const query = new URLSearchParams({ select: 'id', auth_user_id: `eq.${user.id}`, limit: '1' });
  const studentResponse = await fetch(`${supabaseUrl}/rest/v1/students?${query.toString()}`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
  if (!studentResponse.ok) return false;
  const students = await studentResponse.json() as Array<{ id: string }>;
  return students.length > 0;
}
function normalizeDays(value: unknown, weekStart: string) {
  const days = Array.isArray((value as { days?: unknown })?.days) ? (value as { days: unknown[] }).days : [];
  return Array.from({ length: 7 }, (_, index) => {
    const raw = (days[index] || {}) as Record<string, unknown>;
    const date = new Date(`${weekStart}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + index);
    const tasks = Array.isArray(raw.tasks) ? raw.tasks : [];
    return { day: index + 1, date: typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : date.toISOString().slice(0, 10), title: typeof raw.title === 'string' ? raw.title.slice(0, 200) : `روز ${index + 1}`, completed: false, report: '', actualMinutes: 0, tasks: tasks.slice(0, 8).map((task, taskIndex) => { const item = (task || {}) as Record<string, unknown>; const allowed = ['study', 'even-practice', 'odd-practice', 'chapter-review']; return { id: `${Date.now().toString(36)}-${index}-${taskIndex}`, type: allowed.includes(String(item.type)) ? item.type : 'study', title: typeof item.title === 'string' ? item.title.slice(0, 300) : 'مطالعه مبحث', subject: typeof item.subject === 'string' ? item.subject.slice(0, 100) : '', topic: typeof item.topic === 'string' ? item.topic.slice(0, 200) : '', tests: Math.max(0, Math.min(200, Number(item.tests) || 0)), completed: false, report: '' }; }) };
  });
}
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
  try {
    if (!(await verifyStudent(req))) return send(res, 401, { error: 'Student authentication is invalid.' });
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}) as Record<string, unknown>;
    const grade = typeof body.grade === 'string' ? body.grade.trim() : '';
    const subjects = Array.isArray(body.subjects) ? body.subjects.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 12) : [];
    const topics = typeof body.topics === 'string' ? body.topics.trim() : '';
    const weekStart = typeof body.weekStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.weekStart) ? body.weekStart : '';
    if (!grade || subjects.length === 0 || !topics || !weekStart) return send(res, 400, { error: 'Grade, subjects, topics, and week start are required.' });
    const apiKey = process.env.AVALAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) return send(res, 503, { error: 'AI service is not configured.' });
    const baseUrl = process.env.AVALAI_API_KEY ? 'https://api.avalai.ir/v1' : 'https://api.openai.com/v1';
    const model = process.env.AI_STUDY_PLAN_MODEL || (process.env.AVALAI_API_KEY ? 'gemini-2.5-flash' : 'gpt-4o-mini');
    const response = await fetch(`${baseUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: JSON.stringify({ grade, subjects, topics, weekStart }) }] }) });
    const providerBody = await response.text();
    if (!response.ok) return send(res, 502, { error: 'AI provider rejected the study plan request.', status: response.status });
    const parsed = JSON.parse(providerBody) as { choices?: Array<{ message?: { content?: string } }> };
    const content = (parsed.choices?.[0]?.message?.content || '').replaceAll('```json', '').replaceAll('```', '').trim();
    return send(res, 200, { days: normalizeDays(JSON.parse(content), weekStart) });
  } catch (error) { console.error('Study plan generation failed', error instanceof Error ? error.message : 'unknown error'); return send(res, 500, { error: 'Study plan generation failed.' }); }
}
