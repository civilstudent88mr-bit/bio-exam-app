import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Form';
import { Wallet, Plus, ArrowDownCircle, ArrowUpCircle, CreditCard, ShieldCheck, Loader2 } from 'lucide-react';
import { updateStudentWallet, createTransaction } from '@/services/api';
import { toFaNum, formatDate } from '@/services/scoring';

export function WalletCard() {
  const { db, reloadDb, studentId } = useApp();
  const { notify } = useToast();
  const [showCharge, setShowCharge] = useState(false);
  const [amount, setAmount] = useState(50000);
  const [step, setStep] = useState<'amount' | 'gateway' | 'processing' | 'done'>('amount');
  const [cardNum, setCardNum] = useState('');
  const [cvv, setCvv] = useState('');

  const student = db.students.find(s => s.id === studentId);
  if (!student) return null;

  const transactions = db.transactions.filter(t => t.studentId === studentId).slice(0, 10);

  const startCharge = () => {
    if (amount < 1000) { notify('حداقل مبلغ ۱۰۰۰ تومان', 'warning'); return; }
    setStep('gateway');
  };

  const processPayment = () => {
    if (cardNum.replace(/\s/g, '').length < 16) { notify('شماره کارت نامعتبر', 'warning'); return; }
    if (cvv.length < 3) { notify('CVV2 نامعتبر', 'warning'); return; }
    setStep('processing');
    setTimeout(async () => {
      try {
        await createTransaction({
          studentId: student.id, amount, type: 'charge', description: 'شارژ کیف پول',
        });
        await updateStudentWallet(student.id, student.walletBalance + amount);
        await reloadDb();
        setStep('done');
        notify('شارژ موفق بود', 'success');
        setTimeout(() => { setShowCharge(false); setStep('amount'); setCardNum(''); setCvv(''); }, 1500);
      } catch (err: any) {
        notify(err?.message || 'خطا در پرداخت', 'error');
        setStep('amount');
      }
    }, 2000);
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          <Wallet size={20} className="text-primary-500" />
          کیف پول
        </h3>
        <button className="btn btn-primary py-1.5 px-3 text-sm" onClick={() => { setStep('amount'); setShowCharge(true); }}>
          <Plus size={16} /> شارژ
        </button>
      </div>
      <div className="rounded-2xl p-5 bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg">
        <div className="text-sm opacity-80">موجودی فعلی</div>
        <div className="text-3xl font-bold mt-1">{toFaNum(student.walletBalance.toLocaleString('fa-IR'))} <span className="text-base font-normal opacity-80">تومان</span></div>
      </div>

      {transactions.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="text-xs font-medium text-muted mb-2">تراکنش‌های اخیر</div>
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <div className="flex items-center gap-2">
                {tx.type === 'charge'
                  ? <ArrowDownCircle size={16} className="text-success-500" />
                  : <ArrowUpCircle size={16} className="text-error-500" />}
                <div>
                  <div className="font-medium">{tx.description}</div>
                  <div className="text-xs text-muted">{formatDate(tx.createdAt)}</div>
                </div>
              </div>
              <span className={tx.type === 'charge' ? 'text-success-600 font-bold' : 'text-error-500 font-bold'}>
                {tx.type === 'charge' ? '+' : '-'}{toFaNum(tx.amount.toLocaleString('fa-IR'))}
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCharge} onClose={() => setShowCharge(false)} title="شارژ کیف پول" size="sm">
        {step === 'amount' && (
          <div className="space-y-4">
            <Field label="مبلغ شارژ (تومان)">
              <input type="number" className="input" value={amount} onChange={e => setAmount(parseInt(e.target.value) || 0)} min={1000} step={1000} />
            </Field>
            <div className="flex gap-2">
              {[50000, 100000, 200000].map(a => (
                <button key={a} className="btn btn-outline flex-1 py-2 text-sm" onClick={() => setAmount(a)}>
                  {toFaNum(a.toLocaleString('fa-IR'))}
                </button>
              ))}
            </div>
            <button className="btn btn-primary w-full" onClick={startCharge}>
              <CreditCard size={18} /> ادامه به درگاه پرداخت
            </button>
          </div>
        )}

        {step === 'gateway' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 justify-center text-success-600 text-sm mb-2">
              <ShieldCheck size={18} /> درگاه پرداخت امن
            </div>
            <div className="text-center text-sm text-muted">مبلغ: {toFaNum(amount.toLocaleString('fa-IR'))} تومان</div>
            <Field label="شماره کارت">
              <input className="input font-mono text-left" dir="ltr" value={cardNum} onChange={e => setCardNum(e.target.value)} placeholder="1234 5678 9012 3456" maxLength={19} />
            </Field>
            <Field label="CVV2">
              <input className="input font-mono" dir="ltr" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" maxLength={4} />
            </Field>
            <div className="flex gap-3">
              <button className="btn btn-outline flex-1" onClick={() => setStep('amount')}>انصراف</button>
              <button className="btn btn-primary flex-1" onClick={processPayment}>پرداخت</button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center py-12">
            <Loader2 size={40} className="animate-spin text-primary-500 mb-4" />
            <p className="text-sm text-muted">در حال پردازش تراکنش...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center py-12">
            <ShieldCheck size={48} className="text-success-500 mb-3" />
            <p className="text-lg font-bold text-success-600">پرداخت موفق</p>
            <p className="text-sm text-muted mt-1">کیف پول شما شارژ شد</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
