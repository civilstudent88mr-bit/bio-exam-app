import { useState } from 'react';
import { FileUp, Trash2, FileText, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Badge, EmptyState } from '@/components/ui/Form';
import { createHandout, deleteHandout } from '@/services/api';
import { uploadHandoutFile } from '@/services/handouts';
import { formatDate, toFaNum } from '@/services/scoring';

export function HandoutManager() {
  const { db, teacherId, reloadDb } = useApp();
  const { notify } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const mine = db.handouts.filter(handout => handout.teacherId === teacherId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!teacherId || !file || !title.trim()) {
      notify('عنوان و فایل جزوه را وارد کنید', 'warning');
      return;
    }
    const amount = Number(price.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount < 0) {
      notify('قیمت جزوه معتبر نیست', 'warning');
      return;
    }
    setSaving(true);
    try {
      const filePath = await uploadHandoutFile(file, teacherId);
      await createHandout({ title: title.trim(), description: description.trim(), price: amount, filePath, fileName: file.name, fileSize: file.size, teacherId });
      await reloadDb();
      setTitle(''); setDescription(''); setPrice('0'); setFile(null);
      notify('جزوه با موفقیت منتشر شد', 'success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      notify(message.includes('Bucket not found')
        ? 'Bucket جزوات در Supabase ساخته نشده است؛ migration مربوط به جزوات را اجرا کنید.'
        : message || 'خطا در انتشار جزوه؛ تنظیمات Storage را بررسی کنید', 'error');
    } finally { setSaving(false); }
  };

  const remove = async (handout: typeof db.handouts[number]) => {
    if (!confirm(`جزوه «${handout.title}» حذف شود؟`)) return;
    try { await deleteHandout(handout.id, handout.filePath); await reloadDb(); notify('جزوه حذف شد', 'success'); }
    catch (error: unknown) { notify(error instanceof Error ? error.message : 'خطا در حذف جزوه', 'error'); }
  };

  return <div className="space-y-6 animate-fade-in">
    <form onSubmit={submit} className="card space-y-4" dir="rtl">
      <div><h3 className="font-bold text-lg flex items-center gap-2"><FileUp size={20} className="text-primary-500" /> افزودن جزوه جدید</h3><p className="text-xs text-muted mt-1">فایل جزوه را بارگذاری و قیمت آن را به تومان تعیین کنید.</p></div>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-sm">عنوان جزوه<input className="input mt-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="مثلاً جمع‌بندی زیست دوازدهم" /></label>
        <label className="text-sm">قیمت (تومان)<input className="input mt-1" type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} /></label>
      </div>
      <label className="text-sm block">توضیحات<textarea className="input mt-1 min-h-20" value={description} onChange={e => setDescription(e.target.value)} placeholder="توضیح کوتاه درباره محتوای جزوه" /></label>
      <label className="text-sm block">فایل PDF یا جزوه<input className="input mt-1" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
      <button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />} انتشار جزوه</button>
    </form>
    <div className="card" dir="rtl"><h3 className="font-bold mb-4">جزوات من</h3>
      {mine.length === 0 ? <EmptyState icon={<FileText size={36} />} title="جزوه‌ای منتشر نشده" message="اولین جزوه خود را از فرم بالا منتشر کنید." /> : <div className="space-y-3">{mine.map(handout => <div key={handout.id} className="flex items-center justify-between gap-3 border-b last:border-0 pb-3 last:pb-0"><div className="min-w-0"><div className="font-medium truncate">{handout.title}</div><div className="text-xs text-muted mt-1">{formatDate(handout.createdAt)} · {handout.fileName}</div></div><div className="flex items-center gap-2 shrink-0"><Badge color={handout.price === 0 ? 'success' : 'warning'}>{handout.price === 0 ? 'رایگان' : `${toFaNum(handout.price.toLocaleString('fa-IR'))} تومان`}</Badge><button className="btn btn-outline p-2 text-error-500" onClick={() => remove(handout)} aria-label="حذف"><Trash2 size={16} /></button></div></div>)}</div>}
    </div>
  </div>;
}
