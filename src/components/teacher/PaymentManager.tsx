import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Badge, EmptyState, Field } from '@/components/ui/Form';
import { Check, CreditCard, ExternalLink, Loader2, Save, X } from 'lucide-react';
import { createTransaction, getReceiptDownloadUrl, updateCardTransferStatus, updateStudentWallet, upsertPaymentSettings } from '@/services/api';
import { formatDate, toFaNum } from '@/services/scoring';

export function PaymentManager() {
  const { db, reloadDb } = useApp();
  const { notify } = useToast();
  const [cardNumber, setCardNumber] = useState(db.paymentSettings?.cardNumber || '');
  const [cardHolder, setCardHolder] = useState(db.paymentSettings?.cardHolder || '');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const pending = db.cardTransfers.filter(transfer => transfer.status === 'pending');

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (cardNumber.replace(/\s/g, '').length !== 16 || !cardHolder.trim()) { notify('شماره کارت ۱۶ رقمی و نام صاحب کارت را وارد کنید', 'warning'); return; }
    setSaving(true);
    try { await upsertPaymentSettings({ id: 1, cardNumber, cardHolder: cardHolder.trim() }); await reloadDb(); notify('اطلاعات کارت ذخیره شد', 'success'); }
    catch (error: unknown) { notify(error instanceof Error ? error.message : 'خطا در ذخیره اطلاعات کارت', 'error'); }
    finally { setSaving(false); }
  };

  const openReceipt = async (path: string) => {
    try { const url = await getReceiptDownloadUrl(path); window.open(url, '_blank', 'noopener,noreferrer'); }
    catch (error: unknown) { notify(error instanceof Error ? error.message : 'خطا در بازکردن رسید', 'error'); }
  };

  const review = async (transfer: typeof db.cardTransfers[number], status: 'approved' | 'rejected') => {
    setBusyId(transfer.id);
    try {
      if (status === 'approved') {
        const student = db.students.find(item => item.id === transfer.studentId);
        if (!student) throw new Error('دانش‌آموز پیدا نشد');
        await updateStudentWallet(student.id, student.walletBalance + transfer.amount);
        await createTransaction({ studentId: student.id, amount: transfer.amount, type: 'charge', description: 'شارژ کیف پول با تأیید کارت‌به‌کارت' });
      }
      await updateCardTransferStatus(transfer.id, status);
      await reloadDb(); notify(status === 'approved' ? 'رسید تأیید و کیف پول شارژ شد' : 'رسید رد شد', status === 'approved' ? 'success' : 'warning');
    } catch (error: unknown) { notify(error instanceof Error ? error.message : 'خطا در بررسی رسید', 'error'); }
    finally { setBusyId(null); }
  };

  return <div className="space-y-6 animate-fade-in">
    <form onSubmit={saveSettings} className="card space-y-4"><div><h3 className="font-bold text-lg flex items-center gap-2"><CreditCard size={20} className="text-primary-500" /> اطلاعات کارت دریافت وجه</h3><p className="text-xs text-muted mt-1">این اطلاعات به دانش‌آموزان نمایش داده می‌شود.</p></div><div className="grid md:grid-cols-2 gap-4"><Field label="شماره کارت"><input className="input font-mono text-left" dir="ltr" value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="6037 9900 0000 0000" maxLength={19} /></Field><Field label="نام صاحب کارت"><input className="input" value={cardHolder} onChange={e => setCardHolder(e.target.value)} placeholder="نام و نام خانوادگی" /></Field></div><button className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} ذخیره اطلاعات کارت</button></form>
    <div className="card"><h3 className="font-bold mb-4">رسیدهای کارت‌به‌کارت</h3>{pending.length === 0 ? <EmptyState icon={<CreditCard size={36} />} title="رسید در انتظار بررسی وجود ندارد" message="درخواست‌های جدید دانش‌آموزان در این بخش نمایش داده می‌شود." /> : <div className="space-y-3">{pending.map(transfer => { const student = db.students.find(item => item.id === transfer.studentId); return <div key={transfer.id} className="border rounded-xl p-4" style={{ borderColor: 'rgb(var(--color-border))' }}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-bold">{student?.name || 'دانش‌آموز حذف‌شده'}</div><div className="text-sm mt-1">مبلغ: {toFaNum(transfer.amount.toLocaleString('fa-IR'))} تومان</div><div className="text-xs text-muted mt-1">کد پیگیری: {transfer.trackingCode} · {formatDate(transfer.createdAt)}</div></div><Badge color="warning">در انتظار بررسی</Badge></div><div className="flex flex-wrap gap-2 mt-4"><button className="btn btn-outline py-2 text-sm" onClick={() => openReceipt(transfer.receiptPath)}><ExternalLink size={15} /> مشاهده رسید</button><button className="btn btn-primary py-2 text-sm" disabled={busyId === transfer.id} onClick={() => review(transfer, 'approved')}><Check size={15} /> تأیید و شارژ کیف پول</button><button className="btn btn-outline py-2 text-sm text-error-500" disabled={busyId === transfer.id} onClick={() => review(transfer, 'rejected')}><X size={15} /> رد رسید</button></div></div>; })}</div>}</div>
  </div>;
}
