import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import {
  Trophy, CheckCircle2, XCircle, MinusCircle, Clock, FileText, Star,
  FolderPlus, Trash2, NotebookPen, BookMarked, Folder, Loader2,
} from 'lucide-react';
import type { ExamAttempt, Question } from '@/types';
import { toFaNum, formatTime } from '@/services/scoring';
import { printReportCard } from '@/services/pdf';
import {
  createVaultFolder, updateVaultFolder, deleteVaultFolder,
  createNote, deleteNote,
} from '@/services/api';

interface ResultViewProps {
  attempt: ExamAttempt;
  questions: Question[];
  onExit: () => void;
}

export function ResultView({ attempt, questions, onExit }: ResultViewProps) {
  const { db, reloadDb, studentId } = useApp();
  const { notify } = useToast();
  const [tab, setTab] = useState<'report' | 'vault' | 'notes'>('report');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState<number | null>(null);
  const [folderName, setFolderName] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const student = db.students.find(s => s.id === studentId);
  const studentName = student?.name || 'دانش‌آموز';

  const wrongQs = questions.filter((_, i) => {
    const ans = attempt.answers[i];
    return ans !== undefined && ans !== questions[i].correctAnswer;
  });
  const blankQs = questions.filter((_, i) => attempt.answers[i] === undefined);
  const bookmarkedQs = questions.filter((_, i) => attempt.bookmarked.includes(i));

  const vaultFolders = db.vaultFolders.filter(f => f.studentId === studentId);
  const myNotes = db.notes.filter(n => n.studentId === studentId);

  const addFolder = async () => {
    if (!folderName.trim()) return;
    setSaving(true);
    try {
      await createVaultFolder(studentId!, folderName.trim());
      await reloadDb();
      setFolderName('');
      setShowFolderModal(false);
      notify('پوشه ساخته شد', 'success');
    } catch (err: any) {
      notify(err?.message || 'خطا در ثبت', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addToFolder = async (folderId: string, questionId: string) => {
    const folder = vaultFolders.find(f => f.id === folderId);
    if (!folder || folder.questionIds.includes(questionId)) return;
    setSaving(true);
    try {
      await updateVaultFolder(folderId, [...folder.questionIds, questionId]);
      await reloadDb();
      notify('سوال به پوشه اضافه شد', 'success');
    } catch (err: any) {
      notify(err?.message || 'خطا در ثبت', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    setSaving(true);
    try {
      await deleteVaultFolder(id);
      await reloadDb();
      notify('پوشه حذف شد', 'success');
    } catch (err: any) {
      notify(err?.message || 'خطا در حذف', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveNote = async () => {
    if (showNoteModal === null || !noteContent.trim()) return;
    const q = questions[showNoteModal];
    setSaving(true);
    try {
      await createNote({
        studentId: studentId!, questionId: q.id,
        content: noteContent.trim(), chapter: q.chapter,
      });
      await reloadDb();
      setNoteContent('');
      setShowNoteModal(null);
      notify('نکته ذخیره شد', 'success');
    } catch (err: any) {
      notify(err?.message || 'خطا در ثبت', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    setSaving(true);
    try {
      await deleteNote(id);
      await reloadDb();
      notify('نکته حذف شد', 'success');
    } catch (err: any) {
      notify(err?.message || 'خطا در حذف', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button className="btn btn-outline" onClick={onExit}>بازگشت</button>
          <button className="btn btn-primary" onClick={() => printReportCard(
            db.exams.find(e => e.id === attempt.examId)?.title || 'آزمون',
            db.exams.find(e => e.id === attempt.examId)?.code || '',
            attempt, questions, studentName
          )}>
            <FileText size={16} /> PDF کارنامه
          </button>
        </div>

        <div className="card mb-6 overflow-hidden">
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-lg mb-3">
              <Trophy size={36} />
            </div>
            <div className="text-4xl font-bold text-primary-600">{toFaNum(attempt.percentage)}٪</div>
            <div className="text-sm text-muted mt-1">درصد کنکوری</div>
          </div>
          <div className="grid grid-cols-4 gap-2 border-t pt-4" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <div className="text-center">
              <CheckCircle2 size={20} className="mx-auto text-success-500 mb-1" />
              <div className="text-xl font-bold text-success-600">{toFaNum(attempt.correct)}</div>
              <div className="text-xs text-muted">درست</div>
            </div>
            <div className="text-center">
              <XCircle size={20} className="mx-auto text-error-500 mb-1" />
              <div className="text-xl font-bold text-error-500">{toFaNum(attempt.wrong)}</div>
              <div className="text-xs text-muted">غلط</div>
            </div>
            <div className="text-center">
              <MinusCircle size={20} className="mx-auto text-muted mb-1" />
              <div className="text-xl font-bold text-muted">{toFaNum(attempt.blank)}</div>
              <div className="text-xs text-muted">نزده</div>
            </div>
            <div className="text-center">
              <Clock size={20} className="mx-auto text-primary-500 mb-1" />
              <div className="text-xl font-bold text-primary-600">{formatTime(attempt.timeSpentSec)}</div>
              <div className="text-xs text-muted">زمان</div>
            </div>
          </div>
        </div>

        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {[
            { id: 'report' as const, label: 'پاسخ‌نامه', icon: <FileText size={16} /> },
            { id: 'vault' as const, label: 'صندوقچه', icon: <BookMarked size={16} /> },
            { id: 'notes' as const, label: 'دفترچه نکات', icon: <NotebookPen size={16} /> },
          ].map(t => (
            <button key={t.id} className={`btn px-4 py-2 text-sm whitespace-nowrap ${tab === t.id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'report' && (
          <div className="space-y-3 animate-fade-in">
            {questions.map((q, i) => {
              const ans = attempt.answers[i];
              const isCorrect = ans === q.correctAnswer;
              const isBlank = ans === undefined;
              const status = isBlank ? 'blank' : isCorrect ? 'correct' : 'wrong';
              const colors = {
                correct: 'border-r-success-500 bg-success-50 dark:bg-success-900/20',
                wrong: 'border-r-error-500 bg-error-50 dark:bg-error-900/20',
                blank: 'border-r-slate-400 bg-slate-50 dark:bg-slate-700/30',
              };
              const labels = { correct: 'درست', wrong: 'غلط', blank: 'نزده' };
              const labelColors = { correct: 'text-success-600', wrong: 'text-error-500', blank: 'text-muted' };
              return (
                <div key={q.id} className={`card border-r-4 ${colors[status]}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{toFaNum(i + 1)}.</span>
                      <span className={`text-xs font-bold ${labelColors[status]}`}>{labels[status]}</span>
                      {attempt.bookmarked.includes(i) && <Star size={14} className="text-warning-400 fill-warning-400" />}
                    </div>
                    <button className="btn btn-ghost p-1.5 text-xs" onClick={() => setShowNoteModal(i)}>
                      <NotebookPen size={14} />
                    </button>
                  </div>
                  <p className="text-sm font-medium mb-3">{q.text}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                    {q.options.map((opt, oi) => {
                      const isUserAns = ans === oi;
                      const isRightAns = q.correctAnswer === oi;
                      return (
                        <div key={oi} className={`flex items-center gap-2 p-2 rounded-lg ${isRightAns ? 'bg-success-100 dark:bg-success-900/30 text-success-700 font-bold' : isUserAns ? 'bg-error-100 dark:bg-error-900/30 text-error-600 font-bold' : 'text-muted'}`}>
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
                            style={{ backgroundColor: isRightAns ? 'rgb(34 197 94 / 0.2)' : isUserAns ? 'rgb(239 68 68 / 0.2)' : 'rgb(var(--color-border) / 0.4)' }}>
                            {'الف‌ب‌ج‌د'[oi]}
                          </span>
                          {opt}
                          {isRightAns && <CheckCircle2 size={14} className="mr-auto" />}
                          {isUserAns && !isRightAns && <XCircle size={14} className="mr-auto" />}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <div className="mt-3 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-sm border-r-2 border-primary-400">
                      <span className="font-bold">پاسخ تشریحی: </span>{q.explanation}
                    </div>
                  )}
                  {q.keyNote && (
                    <div className="mt-2 p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 text-sm border-r-2 border-warning-400">
                      <span className="font-bold">نکته کلیدی: </span>{q.keyNote}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'vault' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="card">
                <div className="flex items-center gap-2 mb-2"><XCircle size={18} className="text-error-500" /><h4 className="font-bold text-sm">سوالات غلط</h4></div>
                <p className="text-2xl font-bold text-error-500">{toFaNum(wrongQs.length)}</p>
              </div>
              <div className="card">
                <div className="flex items-center gap-2 mb-2"><MinusCircle size={18} className="text-muted" /><h4 className="font-bold text-sm">سوالات نزده</h4></div>
                <p className="text-2xl font-bold text-muted">{toFaNum(blankQs.length)}</p>
              </div>
              <div className="card">
                <div className="flex items-center gap-2 mb-2"><Star size={18} className="text-warning-400" /><h4 className="font-bold text-sm">مهم/نشان‌دار</h4></div>
                <p className="text-2xl font-bold text-warning-500">{toFaNum(bookmarkedQs.length)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm">پوشه‌های مرور</h4>
              <button className="btn btn-outline py-1.5 px-3 text-sm" onClick={() => setShowFolderModal(true)}>
                <FolderPlus size={14} /> پوشه جدید
              </button>
            </div>

            {vaultFolders.length === 0 ? (
              <div className="card text-center py-8 text-muted text-sm">
                <Folder size={32} className="mx-auto mb-2 opacity-40" />
                پوشه‌ای نساخته‌اید
              </div>
            ) : (
              <div className="space-y-2">
                {vaultFolders.map(folder => (
                  <div key={folder.id} className="card">
                    <div className="flex items-center justify-between">
                      <button className="flex items-center gap-2 flex-1 text-right" onClick={() => setSelectedFolder(selectedFolder === folder.id ? null : folder.id)}>
                        <Folder size={18} className="text-primary-500" />
                        <span className="font-medium text-sm">{folder.name}</span>
                        <span className="text-xs text-muted">({toFaNum(folder.questionIds.length)})</span>
                      </button>
                      <button className="btn btn-ghost p-1.5 text-error-500" onClick={() => handleDeleteFolder(folder.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {selectedFolder === folder.id && (
                      <div className="mt-3 space-y-2 animate-fade-in">
                        {folder.questionIds.length === 0 ? (
                          <p className="text-xs text-muted text-center py-3">سوالی در این پوشه نیست</p>
                        ) : folder.questionIds.map(qid => {
                          const q = db.questions.find(qq => qq.id === qid);
                          if (!q) return null;
                          return (
                            <div key={qid} className="text-sm p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-border) / 0.2)' }}>
                              {q.text}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(wrongQs.length > 0 || bookmarkedQs.length > 0) && (
              <div className="card">
                <h4 className="font-bold text-sm mb-3">افزودن سوال به پوشه</h4>
                <div className="space-y-2">
                  {[...wrongQs, ...bookmarkedQs].map(q => {
                    const realIdx = questions.indexOf(q);
                    const isWrong = wrongQs.includes(q);
                    return (
                      <div key={q.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-border) / 0.2)' }}>
                        <div className="flex items-center gap-2 min-w-0">
                          {isWrong ? <XCircle size={14} className="text-error-500 shrink-0" /> : <Star size={14} className="text-warning-400 shrink-0" />}
                          <span className="truncate">{toFaNum(realIdx + 1)}. {q.text}</span>
                        </div>
                        {vaultFolders.length > 0 && (
                          <select className="text-xs rounded-lg px-2 py-1 outline-none" style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}
                            onChange={(e) => { if (e.target.value) addToFolder(e.target.value, q.id); e.target.value = ''; }}>
                            <option value="">افزودن به پوشه...</option>
                            {vaultFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-4 animate-fade-in">
            <div className="card text-center py-8">
              <NotebookPen size={32} className="mx-auto mb-2 text-primary-400" />
              <p className="text-sm text-muted">با کلیک روی آیکون دفترچه در کنار هر سوال، نکته ثبت کنید</p>
            </div>
            {myNotes.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-sm">نکات ثبت شده ({toFaNum(myNotes.length)})</h4>
                {myNotes.map(note => {
                  const q = db.questions.find(qq => qq.id === note.questionId);
                  return (
                    <div key={note.id} className="card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {q && <p className="text-xs text-muted mb-1">سوال: {q.text.slice(0, 60)}...</p>}
                          <p className="text-sm">{note.content}</p>
                          {note.chapter && <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 mt-2">{note.chapter}</span>}
                        </div>
                        <button className="btn btn-ghost p-1.5 text-error-500" onClick={() => handleDeleteNote(note.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <Modal open={showFolderModal} onClose={() => setShowFolderModal(false)} title="پوشه جدید" size="sm">
          <Field label="نام پوشه">
            <input className="input" value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="مثال: دام‌های فصل ۳" autoFocus />
          </Field>
          <div className="flex gap-3 justify-end mt-5">
            <button className="btn btn-outline" onClick={() => setShowFolderModal(false)}>انصراف</button>
            <button className="btn btn-primary" onClick={addFolder} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : null} ساخت
            </button>
          </div>
        </Modal>

        <Modal open={showNoteModal !== null} onClose={() => setShowNoteModal(null)} title="ثبت نکته" size="sm">
          {showNoteModal !== null && (
            <div className="space-y-3">
              <p className="text-sm text-muted">{questions[showNoteModal]?.text}</p>
              <Field label="نکته">
                <textarea className="input min-h-[100px]" value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="نکته یا دام تستی را بنویسید..." autoFocus />
              </Field>
              <div className="flex gap-3 justify-end">
                <button className="btn btn-outline" onClick={() => setShowNoteModal(null)}>انصراف</button>
                <button className="btn btn-primary" onClick={saveNote} disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null} ذخیره
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
