import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Badge, EmptyState, Select } from '@/components/ui/Form';
import { formatDate, toFaNum } from '@/services/scoring';
import { Search, Users, Wallet, Phone, School, ChevronDown, ChevronUp } from 'lucide-react';

export function StudentDirectory() {
  const { db } = useApp();
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredStudents = useMemo(() => db.students.filter(student => {
    if (classId && student.classId !== classId) return false;
    if (search && !`${student.name} ${student.phone}`.includes(search.trim())) return false;
    return true;
  }), [db.students, classId, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof filteredStudents>();
    filteredStudents.forEach(student => {
      const list = groups.get(student.classId) || [];
      list.push(student);
      groups.set(student.classId, list);
    });
    return Array.from(groups.entries()).sort((a, b) => {
      const aName = db.classes.find(item => item.id === a[0])?.name || '';
      const bName = db.classes.find(item => item.id === b[0])?.name || '';
      return aName.localeCompare(bName, 'fa');
    });
  }, [db.classes, filteredStudents]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><Users size={20} className="text-primary-500" /> فهرست دانش‌آموزان</h3>
          <p className="text-sm text-muted mt-1">دانش‌آموزان به تفکیک کلاس همراه با اطلاعات تماس و تراکنش‌ها</p>
        </div>
        <Badge color="primary">{toFaNum(filteredStudents.length)} دانش‌آموز</Badge>
      </div>

      <div className="card grid grid-cols-1 md:grid-cols-[1fr_260px] gap-3">
        <div className="relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pr-10" placeholder="جستجو بر اساس نام یا شماره تلفن" value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <Select value={classId} onChange={setClassId} options={[{ value: '', label: 'همه کلاس‌ها' }, ...db.classes.map(item => ({ value: item.id, label: item.name }))]} />
      </div>

      {grouped.length === 0 ? (
        <EmptyState icon={<Users size={48} />} title="دانش‌آموزی پیدا نشد" message="فیلترها را تغییر دهید یا منتظر ثبت‌نام دانش‌آموزان باشید" />
      ) : grouped.map(([groupId, students]) => {
        const classGroup = db.classes.find(item => item.id === groupId);
        const school = db.schools.find(item => item.id === classGroup?.schoolId);
        return (
          <section key={groupId} className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <div>
                <h4 className="font-bold flex items-center gap-2"><School size={17} className="text-primary-500" /> {classGroup?.name || 'کلاس بدون عنوان'}</h4>
                <p className="text-xs text-muted mt-1">{school?.name || 'مدرسه نامشخص'} · {toFaNum(students.length)} دانش‌آموز</p>
              </div>
              <Badge color="neutral">کلاس</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-3">
                <thead><tr className="text-right text-muted border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
                  <th className="py-2 px-2">نام و نام خانوادگی</th><th className="py-2 px-2">تلفن</th><th className="py-2 px-2">وضعیت احراز هویت</th><th className="py-2 px-2">کیف پول</th><th className="py-2 px-2">جزئیات</th>
                </tr></thead>
                <tbody>{students.map(student => {
                  const transactions = db.transactions.filter(item => item.studentId === student.id);
                  const expanded = expandedId === student.id;
                  return <>
                    <tr key={student.id} className="border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
                      <td className="py-3 px-2 font-medium">{student.name}</td>
                      <td className="py-3 px-2"><span className="inline-flex items-center gap-1"><Phone size={13} /> {student.phone || 'ثبت نشده'}</span></td>
                      <td className="py-3 px-2"><Badge color={student.authUserId ? 'success' : 'warning'}>{student.authUserId ? 'احراز‌شده' : 'نیازمند ورود مجدد'}</Badge></td>
                      <td className="py-3 px-2"><span className="inline-flex items-center gap-1"><Wallet size={13} /> {toFaNum(student.walletBalance.toLocaleString('fa-IR'))}</span></td>
                      <td className="py-3 px-2"><button className="btn btn-ghost py-1.5 px-2 text-xs" onClick={() => setExpandedId(expanded ? null : student.id)}>{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />} تراکنش‌ها</button></td>
                    </tr>
                    {expanded && <tr key={`${student.id}-details`}><td colSpan={5} className="p-3" style={{ backgroundColor: 'rgb(var(--color-border) / 0.18)' }}>
                      {transactions.length === 0 ? <p className="text-xs text-muted">تراکنشی برای این دانش‌آموز ثبت نشده است.</p> : <div className="space-y-2">{transactions.map(transaction => <div key={transaction.id} className="flex flex-wrap justify-between gap-2 text-xs"><span>{transaction.description || transaction.type}</span><span className={transaction.amount >= 0 ? 'text-success-600' : 'text-error-500'}>{toFaNum(transaction.amount.toLocaleString('fa-IR'))} تومان · {formatDate(transaction.createdAt)}</span></div>)}</div>}
                    </td></tr>}
                  </>;
                })}</tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
