import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Field, Badge } from '@/components/ui/Form';
import { Wallet, Plus, ArrowDownCircle, ArrowUpCircle, Copy, Upload, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { createCardTransfer } from '@/services/api';
import { uploadPaymentReceipt } from '@/services/payment';
import { toFaNum, formatDate } from '@/services/scoring';

export function WalletCard() {
  const { db, reloadDb, studentId } = useApp();
  const { notify } = useToast();
  const [showCharge, setShowCharge] = useState(false);
  const [amount, setAmount] = useState(50000);
  const [trackingCode, setTrackingCode] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const student = db.students.find(s => s.id === studentId);
  if (!student) return null;

  const transactions = db.transactions.filter(t => t.studentId === student.id).slice(0, 10);
  const transfers = db.cardTransfers.filter(t => t.studentId === student.id).slice(0, 5);
  const cardNumber = db.paymentSettings?.cardNumber || '';

  const copyCard = async () => {
    if (!cardNumber) return;
    await navigator.clipboard.writeText(cardNumber.replace(/\s/g, ''));
    notify('شماره کارت کپی شد', 'success');
  };

  const submitTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (amount < 1000) { notify('حداقل مبلغ شارژ ۱۰۰۰ تومان است', 'warning'); return; }
    if (!trackingCode.trim()) { notify('کد پیگیری واریز را وارد کنید', 'warning'); return; }
    if (!receipt) { notify('تصویر یا فایل رسید را انتخاب کنید', 'warning'); return; }
    if (!cardNumber) { notify('شماره کارت مقصد هنوز ثبت نشده است', 'warning'); return; }
    setSubmitting(true);
    try {
      const receiptPath = await uploadPaymentReceipt(receipt, student.id);
      await createCardTransfer({ studentId: student.id, amount, trackingCode: trackingCode.trim(), receiptPath, receiptFileName: receipt.name });
      await reloadDb();
      setShowCharge(false); setTrackingCode(''); setReceipt(null); setAmount(50000);
      notify('رسید ثبت شد و پس از بررسی دبیر کیف پول شارژ می‌شود', 'success');
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'خطا در ثبت رسید', 'error');
    } finally { setSubmitting(false); }
  };

  return <div className="card overflow-hidden">
    <div className="flex items-center justify-between mb-4"><h3 className="font-bold flex items-center gap-2"><Wallet size={20} className="text-primary-500" /> کیف پول</h3><button className="btn btn-primary py-1.5 px-3 text-sm" onClick={() => setShowCharge(true)}><Plus size={16} /> شارژ با کارت‌به‌کارت</button></div>
    <div className="rounded-2xl p-5 bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg"><div className="text-sm opacity-80">موجودی فعلی</div><div className="text-3xl font-bold mt-1">{toFaNum(student.walletBalance.toLocaleString('fa-IR'))} <span className="text-base font-normal opacity-80">تومان</span></div></div>
    {transfers.length > 0 && <div className="mt-4 space-y-1.5"><div className="text-xs font-medium text-muted mb-2">درخواست‌های کارت‌به‌کارت</div>{transfers.map(transfer => <div key={transfer.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0"><div className="flex items-center gap-2">{transfer.status === 'pending' ? <Clock size={16} className="text-warning-500" /> : transfer.status === 'approved' ? <CheckCircle2 size={16} className="text-success-500" /> : <XCircle size={16} className="text-error-500" />}<div><div className="font-medium">{toFaNum(transfer.amount.toLocaleString('fa-IR'))} تومان</div><div className="text-xs text-muted">{formatDate(transfer.createdAt)}</div></div></div><Badge color={transfer.status === 'approved' ? 'success' : transfer.status === 'rejected' ? 'error' : 'warning'}>{transfer.status === 'approved' ? 'تأیید شده' : transfer.status === 'rejected' ? 'رد شده' : 'در انتظار بررسی'}</Badge></div>)}</div>}
    {transactions.length > 0 && <div className="mt-4 space-y-1.5"><div className="text-xs font-medium text-muted mb-2">تراکنش‌های اخیر</div>{transactions.map(tx => <div key={tx.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0"><div className="flex items-center gap-2">{tx.type === 'charge' ? <ArrowDownCircle size={16} className="text-success-500" /> : <ArrowUpCircle size={16} className="text-error-500" />}<div><div className="font-medium">{tx.description}</div><div className="text-xs text-muted">{formatDate(tx.createdAt)}</div></div></div><span className={tx.type === 'charge' ? 'text-success-600 font-bold' : 'text-error-500 font-bold'}>{tx.type === 'charge' ? '+' : '-'}{toFaNum(tx.amount.toLocaleString('fa-IR'))}</span></div>)}</div>}
    <Modal open={showCharge} onClose={() => setShowCharge(false)} title="ثبت کارت‌به‌کارت" size="sm"><form onSubmit={submitTransfer} className="space-y-4">
      <div className="rounded-xl p-3 bg-primary-50 dark:bg-primary-900/20 text-sm"><div className="text-muted mb-1">واریز به کارت</div><div className="font-bold tracking-wider" dir="ltr">{cardNumber || 'شماره کارت هنوز ثبت نشده'}</div>{db.paymentSettings?.cardHolder && <div className="text-xs text-muted mt-1">به نام: {db.paymentSettings.cardHolder}</div>}{cardNumber && <button type="button" className="btn btn-outline py-1 px-2 text-xs mt-2" onClick={copyCard}><Copy size={13} /> کپی شماره کارت</button>}</div>
      <Field label="مبلغ واریز (تومان)"><input type="number" className="input" value={amount} onChange={e => setAmount(parseInt(e.target.value) || 0)} min={1000} step={1000} /></Field>
      <Field label="کد پیگیری واریز"><input className="input" value={trackingCode} onChange={e => setTrackingCode(e.target.value)} placeholder="کد پیگیری درج‌شده در رسید" /></Field>
      <Field label="تصویر یا فایل رسید"><input className="input" type="file" accept="image/*,.pdf" onChange={e => setReceipt(e.target.files?.[0] || null)} /></Field>
      <p className="text-xs text-muted">پس از بررسی رسید توسط دبیر، مبلغ به کیف پول شما اضافه می‌شود.</p>
      <button className="btn btn-primary w-full" disabled={submitting}>{submitting ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />} ثبت رسید برای بررسی</button>
    </form></Modal>
  </div>;
}
