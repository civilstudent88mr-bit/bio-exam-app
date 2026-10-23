import type { IncomingMessage, ServerResponse } from 'node:http';
type Request = IncomingMessage & { body?: unknown };
type Response = ServerResponse & { status: (code: number) => Response; json: (body: unknown) => void };
function send(res: Response, status: number, body: unknown) { res.status(status).json(body); }
function config() { return { url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY, service: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY }; }
async function verifyTeacher(req: Request) {
  const token = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  const { url, anon } = config();
  if (!token || !url || !anon) return false;
  const userResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!userResponse.ok) return false;
  const user = await userResponse.json() as { id?: string };
  if (!user.id) return false;
  const query = new URLSearchParams({ select: 'id', auth_user_id: `eq.${user.id}`, limit: '1' });
  const teacherResponse = await fetch(`${url}/rest/v1/teachers?${query}`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!teacherResponse.ok) return false;
  return (await teacherResponse.json() as unknown[]).length > 0;
}
async function readSettings() {
  const { url, service } = config();
  if (!url || !service) return null;
  const response = await fetch(`${url}/rest/v1/app_settings?select=ai_provider,ai_api_key&id=eq.1`, { headers: { apikey: service, Authorization: `Bearer ${service}` } });
  if (!response.ok) return null;
  const rows = await response.json() as Array<{ ai_provider?: string; ai_api_key?: string | null }>;
  return rows[0] || null;
}
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET' && req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
  try {
    if (!(await verifyTeacher(req))) return send(res, 401, { error: 'Teacher authentication is invalid.' });
    if (req.method === 'GET') {
      const settings = await readSettings();
      if (!settings) return send(res, 503, { error: 'Server secret configuration is incomplete.' });
      return send(res, 200, { configured: Boolean(settings.ai_api_key), provider: settings.ai_provider || 'avalai' });
    }
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}) as { provider?: unknown; apiKey?: unknown };
    const provider = body.provider === 'openai' ? 'openai' : body.provider === 'avalai' ? 'avalai' : '';
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    if (!provider || apiKey.length < 10 || apiKey.length > 500) return send(res, 400, { error: 'کلید AI معتبر نیست.' });
    const { url, service } = config();
    if (!url || !service) return send(res, 503, { error: 'کلید server-only Supabase در Vercel تنظیم نشده است.' });
    const headers = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    let response = await fetch(`${url}/rest/v1/app_settings?id=eq.1`, { method: 'PATCH', headers, body: JSON.stringify({ ai_provider: provider, ai_api_key: apiKey }) });
    if (response.ok && (await response.text()).length >= 0) return send(res, 200, { configured: true, provider });
    response = await fetch(`${url}/rest/v1/app_settings`, { method: 'POST', headers, body: JSON.stringify({ id: 1, ai_provider: provider, ai_api_key: apiKey }) });
    if (!response.ok) return send(res, 502, { error: 'ذخیره کلید AI در Supabase انجام نشد.' });
    return send(res, 200, { configured: true, provider });
  } catch (error) { console.error('AI settings failed', error instanceof Error ? error.message : 'unknown error'); return send(res, 500, { error: 'خطا در تنظیمات AI.' }); }
}
