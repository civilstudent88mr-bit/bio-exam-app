import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';

export function AISettings() {
  const { notify } = useToast();
  const [provider, setProvider] = useState<'avalai' | 'openai'>('avalai');
  const [apiKey, setApiKey] = useState('');
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (!session?.access_token) return;
        const response = await fetch('/api/ai-settings', { headers: { Authorization: `Bearer ${session.access_token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'خطا در خواندن تنظیمات AI');
        setConfigured(Boolean(data.configured));
        if (data.provider === 'openai' || data.provider === 'avalai') setProvider(data.provider);
      } catch (error: any) { notify(error?.message || 'خطا در خواندن تنظیمات AI', 'error'); }
      finally { setLoading(false); }
    })();
  }, [notify]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (apiKey.trim().length < 10) { notify('کلید AI را کامل وارد کنید.', 'warning'); return; }
    setSaving(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) throw new Error('لطفاً دوباره وارد پنل معلم شوید.');
      const response = await fetch('/api/ai-settings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ provider, apiKey: apiKey.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ذخیره کلید AI انجام نشد.');
      setApiKey(''); setConfigured(true); notify('کلید AI با موفقیت ذخیره شد.', 'success');
    } catch (error: any) { notify(error?.message || 'خطا در ذخیره کلید AI', 'error'); }
    finally { setSaving(false); }
  };

  return <div className="card max-w-2xl space-y-5">
    <div><h2 className="text-xl font-bold flex items-center gap-2"><KeyRound size={21} className="text-primary-500" /> تنظیمات هوش مصنوعی</h2><p className="text-sm text-muted mt-2">کلید سرویس AI را فقط در این بخش وارد کنید. کلید در مرورگر نمایش داده نمی‌شود و برای برنامه‌ریزی هفتگی دانش‌آموز استفاده می‌شود.</p></div>
    {configured && <div className="rounded-xl p-3 bg-success-50 dark:bg-success-900/20 text-sm flex items-center gap-2"><CheckCircle2 size={17} className="text-success-600" /> کلید AI تنظیم شده است. برای جایگزینی، کلید جدید را وارد کنید.</div>}
    <form className="space-y-4" onSubmit={save}>
      <label className="block"><span className="label">سرویس‌دهنده</span><select className="input" value={provider} onChange={event => setProvider(event.target.value as 'avalai' | 'openai')}><option value="avalai">AvalAI</option><option value="openai">OpenAI</option></select></label>
      <label className="block"><span className="label">کلید API</span><input className="input" type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={loading ? 'در حال بررسی...' : 'کلید API را وارد کنید'} autoComplete="new-password" /></label>
      <button className="btn btn-primary" type="submit" disabled={saving || loading}>{saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />} ذخیره کلید امن</button>
    </form>
  </div>;
}
