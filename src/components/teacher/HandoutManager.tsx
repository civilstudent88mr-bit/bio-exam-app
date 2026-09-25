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
      notify('????? ? ???? ???? ?? ???? ????', 'warning');
      return;
    }
    const amount = Number(price.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount < 0) {
      notify('???? ???? ????? ????', 'warning');
      return;
    }
    setSaving(true);
    try {
      const filePath = await uploadHandoutFile(file, teacherId);
      await createHandout({ title: title.trim(), description: description.trim(), price: amount, filePath, fileName: file.name, fileSize: file.size, teacherId });
      await reloadDb();
      setTitle(''); setDescription(''); setPrice('0'); setFile(null);
      notify('???? ?? ?????? ????? ??', 'success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      notify(message.includes('Bucket not found')
        ? 'Bucket ????? ?? Supabase ????? ???? ???? migration ????? ?? ????? ?? ???? ????.'
        : message || '??? ?? ?????? ????? ??????? Storage ?? ????? ????', 'error');
    } finally { setSaving(false); }
  };

  const remove = async (handout: typeof db.handouts[number]) => {
    if (!confirm(`???? ?${handout.title}? ??? ????`)) return;
    try { await deleteHandout(handout.id, handout.filePath); await reloadDb(); notify('???? ??? ??', 'success'); }
    catch (error: unknown) { notify(error instanceof Error ? error.message : '??? ?? ??? ????', 'error'); }
  };

  return <div className="space-y-6 animate-fade-in">
    <form onSubmit={submit} className="card space-y-4">
      <div><h3 className="font-bold text-lg flex items-center gap-2"><FileUp size={20} className="text-primary-500" /> ?????? ???? ????</h3><p className="text-xs text-muted mt-1">???? ???? ?? ???????? ? ???? ?? ?? ?? ????? ????? ????.</p></div>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-sm">????? ????<input className="input mt-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="????? ???????? ???? ???????" /></label>
        <label className="text-sm">???? (?????)<input className="input mt-1" type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} /></label>
      </div>
      <label className="text-sm block">???????<textarea className="input mt-1 min-h-20" value={description} onChange={e => setDescription(e.target.value)} placeholder="????? ????? ?????? ?????? ????" /></label>
      <label className="text-sm block">???? PDF ?? ????<input className="input mt-1" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
      <button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />} ?????? ????</button>
    </form>
    <div className="card"><h3 className="font-bold mb-4">????? ??</h3>
      {mine.length === 0 ? <EmptyState icon={<FileText size={36} />} title="??????? ????? ????" message="????? ???? ??? ?? ?? ??? ???? ????? ????." /> : <div className="space-y-3">{mine.map(handout => <div key={handout.id} className="flex items-center justify-between gap-3 border-b last:border-0 pb-3 last:pb-0"><div className="min-w-0"><div className="font-medium truncate">{handout.title}</div><div className="text-xs text-muted mt-1">{formatDate(handout.createdAt)} ? {handout.fileName}</div></div><div className="flex items-center gap-2 shrink-0"><Badge color={handout.price === 0 ? 'success' : 'warning'}>{handout.price === 0 ? '??????' : `${toFaNum(handout.price.toLocaleString('fa-IR'))} ?????`}</Badge><button className="btn btn-outline p-2 text-error-500" onClick={() => remove(handout)} aria-label="???"><Trash2 size={16} /></button></div></div>)}</div>}
    </div>
  </div>;
}
