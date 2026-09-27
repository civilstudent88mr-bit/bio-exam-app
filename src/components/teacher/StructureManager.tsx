import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Form';
import { School, Plus, Trash2, Users, ChevronLeft, ChevronRight, Building2, Loader2 } from 'lucide-react';
import { createSchool, deleteSchool, createClass, deleteClass } from '@/services/api';

export function StructureManager() {
  const { db, reloadDb } = useApp();
  const { notify } = useToast();
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [className, setClassName] = useState('');
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'school' | 'class'; id: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const addSchool = async () => {
    if (!schoolName.trim()) return;
    setSaving(true);
    try {
      await createSchool(schoolName.trim());
      await reloadDb();
      setSchoolName('');
      setShowSchoolModal(false);
      notify('مدرسه اضافه شد', 'success');
    } catch (err: any) {
      notify(err?.message || 'خطا در ثبت', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addClass = async (schoolId: string) => {
    if (!className.trim()) return;
    setSaving(true);
    try {
      await createClass(schoolId, className.trim());
      await reloadDb();
      setClassName('');
      setShowClassModal(null);
      notify('کلاس اضافه شد', 'success');
    } catch (err: any) {
      notify(err?.message || 'خطا در ثبت', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (deleteTarget.type === 'school') {
        await deleteSchool(deleteTarget.id);
        notify('مدرسه حذف شد', 'success');
      } else {
        await deleteClass(deleteTarget.id);
        notify('کلاس حذف شد', 'success');
      }
      await reloadDb();
    } catch (err: any) {
      notify(err?.message || 'خطا در حذف', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getClassStudents = (classId: string) => db.students.filter(s => s.classId === classId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Building2 size={20} className="text-primary-500" />
          مدیریت مدارس و کلاس‌ها
        </h2>
        <button className="btn btn-primary" onClick={() => setShowSchoolModal(true)}>
          <Plus size={18} /> افزودن مدرسه
        </button>
      </div>

      {db.schools.length === 0 ? (
        <div className="card text-center py-12 text-muted">
          <School size={40} className="mx-auto mb-3 opacity-40" />
          هنوز مدرسه‌ای ثبت نشده است
        </div>
      ) : (
        <div className="space-y-3">
          {db.schools.map(school => {
            const classes = db.classes.filter(c => c.schoolId === school.id);
            const totalStudents = db.students.filter(s => s.schoolId === school.id).length;
            const isExpanded = expandedSchool === school.id;
            return (
              <div key={school.id} className="card overflow-hidden">
                <div className="flex items-center justify-between">
                  <button className="flex items-center gap-3 flex-1 text-right" onClick={() => setExpandedSchool(isExpanded ? null : school.id)}>
                    {isExpanded ? <ChevronDown size={18} className="text-muted" /> : <ChevronLeft size={18} className="text-muted" />}
                    <div>
                      <div className="font-bold">{school.name}</div>
                      <div className="text-xs text-muted">{classes.length} کلاس • {totalStudents} دانش‌آموز</div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button className="btn btn-outline px-3 py-1.5 text-xs" onClick={() => setShowClassModal(school.id)}>
                      <Plus size={14} /> کلاس
                    </button>
                    <button className="btn btn-ghost p-2 text-error-500" onClick={() => setDeleteTarget({ type: 'school', id: school.id })}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-2 animate-fade-in">
                    {classes.length === 0 ? (
                      <p className="text-sm text-muted text-center py-4">کلاسی تعریف نشده</p>
                    ) : (
                      classes.map(cls => {
                        const students = getClassStudents(cls.id);
                        return (
                          <div key={cls.id} className="flex items-center justify-between rounded-xl p-3"
                            style={{ backgroundColor: 'rgb(var(--color-border) / 0.3)' }}>
                            <div className="flex items-center gap-2">
                              <Users size={16} className="text-primary-500" />
                              <span className="font-medium text-sm">{cls.name}</span>
                              <span className="text-xs text-muted">({students.length} دانش‌آموز)</span>
                            </div>
                            <button className="btn btn-ghost p-2 text-error-500" onClick={() => setDeleteTarget({ type: 'class', id: cls.id })}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showSchoolModal} onClose={() => setShowSchoolModal(false)} title="افزودن مدرسه" size="sm">
        <Field label="نام مدرسه">
          <input className="input" value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="مثال: مدرسه شهید بهشتی" autoFocus />
        </Field>
        <div className="flex gap-3 justify-end mt-5">
          <button className="btn btn-outline" onClick={() => setShowSchoolModal(false)}>انصراف</button>
          <button className="btn btn-primary" onClick={addSchool} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} افزودن
          </button>
        </div>
      </Modal>

      <Modal open={!!showClassModal} onClose={() => setShowClassModal(null)} title="افزودن کلاس" size="sm">
        <Field label="نام کلاس">
          <input className="input" value={className} onChange={e => setClassName(e.target.value)} placeholder="مثال: کلاس ۱۲/۱" autoFocus />
        </Field>
        <div className="flex gap-3 justify-end mt-5">
          <button className="btn btn-outline" onClick={() => setShowClassModal(null)}>انصراف</button>
          <button className="btn btn-primary" onClick={() => showClassModal && addClass(showClassModal)} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} افزودن
          </button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="حذف"
        message="آیا از حذف این مورد اطمینان دارید؟ تمام اطلاعات مرتبط نیز حذف خواهد شد."
        confirmText="حذف"
        danger
      />
    </div>
  );
}

function ChevronDown({ size, className }: { size: number; className?: string }) {
  return <ChevronRight size={size} className={className} style={{ transform: 'rotate(90deg)' }} />;
}
