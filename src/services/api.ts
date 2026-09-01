import { supabase } from '@/lib/supabase';
import type {
  School, ClassGroup, Teacher, Student, Question, Exam, ExamAttempt,
  SelfQuiz, VaultFolder, Note, Transaction, Database,
} from '@/types';
import { genExamCode, loadDb } from './storage';

const MIGRATION_KEY = 'bio-exam-migrated';

// ============================================================
// One-time migration: upload localStorage data to Supabase
// ============================================================

export async function migrateLocalStorageIfNeeded(): Promise<void> {
  try {
    const { count } = await supabase.from('schools').select('*', { count: 'exact', head: true });
    if ((count ?? 0) > 0) return;

    const localDb = loadDb();
    if (localDb.schools.length === 0) return;

    const schoolIdMap = new Map<string, string>();
    for (const s of localDb.schools) {
      const { data, error } = await supabase.from('schools').insert({ name: s.name }).select().single();
      if (error) throw error;
      schoolIdMap.set(s.id, data.id);
    }

    for (const c of localDb.classes) {
      const newSchoolId = schoolIdMap.get(c.schoolId);
      if (!newSchoolId) continue;
      await supabase.from('classes').insert({ school_id: newSchoolId, name: c.name });
    }

    localStorage.setItem(MIGRATION_KEY, '1');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

// ============================================================
// Row mappers: convert DB snake_case rows to TS camelCase
// ============================================================

function mapSchool(row: any): School {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}
function mapClass(row: any): ClassGroup {
  return { id: row.id, schoolId: row.school_id, name: row.name, createdAt: row.created_at };
}
function mapTeacher(row: any): Teacher {
  return { id: row.id, name: row.name, password: row.password, phone: row.phone || '', createdAt: row.created_at };
}
function mapStudent(row: any): Student {
  return {
    id: row.id, name: row.name, schoolId: row.school_id, classId: row.class_id,
    password: row.password, phone: row.phone || '', walletBalance: row.wallet_balance, createdAt: row.created_at,
  };
}
function mapQuestion(row: any): Question {
  return {
    id: row.id, text: row.text, options: row.options,
    correctAnswer: row.correct_answer, explanation: row.explanation,
    keyNote: row.key_note, grade: row.grade, chapter: row.chapter,
    section: row.section, difficulty: row.difficulty, type: row.type,
    createdAt: row.created_at,
  };
}
function mapExam(row: any): Exam {
  return {
    id: row.id, title: row.title, schoolId: row.school_id,
    classIds: row.class_ids, questionIds: row.question_ids,
    durationMin: row.duration_min, isFree: row.is_free, cost: row.cost,
    startAt: row.start_at, endAt: row.end_at, code: row.code,
    createdAt: row.created_at,
  };
}
function mapAttempt(row: any): ExamAttempt {
  return {
    id: row.id, examId: row.exam_id, studentId: row.student_id,
    answers: row.answers, bookmarked: row.bookmarked,
    startedAt: row.started_at, submittedAt: row.submitted_at,
    status: row.status, correct: row.correct, wrong: row.wrong,
    blank: row.blank, percentage: Number(row.percentage),
    timeSpentSec: row.time_spent_sec,
  };
}
function mapSelfQuiz(row: any): SelfQuiz {
  return {
    id: row.id, studentId: row.student_id, title: row.title,
    questionIds: row.question_ids, mode: row.mode,
    durationMin: row.duration_min, createdAt: row.created_at,
  };
}
function mapVaultFolder(row: any): VaultFolder {
  return {
    id: row.id, studentId: row.student_id, name: row.name,
    questionIds: row.question_ids, createdAt: row.created_at,
  };
}
function mapNote(row: any): Note {
  return {
    id: row.id, studentId: row.student_id, questionId: row.question_id,
    content: row.content, chapter: row.chapter, createdAt: row.created_at,
  };
}
function mapTransaction(row: any): Transaction {
  return {
    id: row.id, studentId: row.student_id, amount: row.amount,
    type: row.type, description: row.description, createdAt: row.created_at,
  };
}

// ============================================================
// Load entire database (for initial context hydration)
// ============================================================

export async function loadDatabase(): Promise<Database> {
  await migrateLocalStorageIfNeeded();
  const [schools, classes, teachers, students, questions, exams, attempts, selfQuizzes, vaultFolders, notes, transactions] = await Promise.all([
    supabase.from('schools').select('*').then(r => r.data || []),
    supabase.from('classes').select('*').then(r => r.data || []),
    supabase.from('teachers').select('*').then(r => r.data || []),
    supabase.from('students').select('*').then(r => r.data || []),
    supabase.from('question_bank').select('*').then(r => r.data || []),
    supabase.from('exams').select('*').then(r => r.data || []),
    supabase.from('exam_results').select('*').then(r => r.data || []),
    supabase.from('self_quizzes').select('*').then(r => r.data || []),
    supabase.from('vault_folders').select('*').then(r => r.data || []),
    supabase.from('notes').select('*').then(r => r.data || []),
    supabase.from('transactions').select('*').then(r => r.data || []),
  ]);

  return {
    version: 1,
    schools: schools.map(mapSchool),
    classes: classes.map(mapClass),
    teachers: teachers.map(mapTeacher),
    students: students.map(mapStudent),
    questions: questions.map(mapQuestion),
    exams: exams.map(mapExam),
    attempts: attempts.map(mapAttempt),
    selfQuizzes: selfQuizzes.map(mapSelfQuiz),
    vaultFolders: vaultFolders.map(mapVaultFolder),
    notes: notes.map(mapNote),
    transactions: transactions.map(mapTransaction),
  };
}

// ============================================================
// Schools
// ============================================================

export async function createSchool(name: string): Promise<School> {
  const { data, error } = await supabase.from('schools').insert({ name }).select().single();
  if (error) throw error;
  return mapSchool(data);
}

export async function deleteSchool(id: string): Promise<void> {
  const { error } = await supabase.from('schools').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Classes
// ============================================================

export async function createClass(schoolId: string, name: string): Promise<ClassGroup> {
  const { data, error } = await supabase.from('classes').insert({ school_id: schoolId, name }).select().single();
  if (error) throw error;
  return mapClass(data);
}

export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Teachers
// ============================================================

export async function createTeacher(name: string, password: string, phone: string): Promise<Teacher> {
  const { data, error } = await supabase.from('teachers').insert({ name, password, phone }).select().single();
  if (error) throw error;
  return mapTeacher(data);
}

export async function loginTeacher(name: string, password: string): Promise<Teacher | null> {
  const { data, error } = await supabase.from('teachers')
    .select('*').eq('name', name).eq('password', password).maybeSingle();
  if (error) throw error;
  return data ? mapTeacher(data) : null;
}

export async function resetTeacherPassword(name: string, phone: string, newPassword: string): Promise<void> {
  const { data, error: selErr } = await supabase.from('teachers')
    .select('id').eq('name', name).eq('phone', phone).maybeSingle();
  if (selErr) throw selErr;
  if (!data) throw new Error('نام کاربری یا شماره تماس اشتباه است');
  const { error: updErr } = await supabase.from('teachers').update({ password: newPassword }).eq('id', data.id);
  if (updErr) throw updErr;
}

// ============================================================
// Students
// ============================================================

export async function createStudent(name: string, schoolId: string, classId: string, password: string, phone: string): Promise<Student> {
  const { data, error } = await supabase.from('students').insert({
    name, school_id: schoolId, class_id: classId, password, phone, wallet_balance: 0,
  }).select().single();
  if (error) throw error;
  return mapStudent(data);
}

export async function loginStudent(name: string, password: string): Promise<Student | null> {
  const { data, error } = await supabase.from('students')
    .select('*').eq('name', name).eq('password', password).maybeSingle();
  if (error) throw error;
  return data ? mapStudent(data) : null;
}

export async function resetStudentPassword(name: string, phone: string, newPassword: string): Promise<void> {
  const { data, error: selErr } = await supabase.from('students')
    .select('id').eq('name', name).eq('phone', phone).maybeSingle();
  if (selErr) throw selErr;
  if (!data) throw new Error('نام کاربری یا شماره تماس اشتباه است');
  const { error: updErr } = await supabase.from('students').update({ password: newPassword }).eq('id', data.id);
  if (updErr) throw updErr;
}

export async function updateStudentWallet(studentId: string, newBalance: number): Promise<void> {
  const { error } = await supabase.from('students').update({ wallet_balance: newBalance }).eq('id', studentId);
  if (error) throw error;
}

export async function getStudentById(id: string): Promise<Student | null> {
  const { data, error } = await supabase.from('students').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapStudent(data) : null;
}

// ============================================================
// Question Bank
// ============================================================

export async function fetchQuestions(): Promise<Question[]> {
  const { data, error } = await supabase.from('question_bank').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapQuestion);
}

export async function createQuestion(q: Omit<Question, 'id' | 'createdAt'>): Promise<Question> {
  const { data, error } = await supabase.from('question_bank').insert({
    text: q.text, options: q.options, correct_answer: q.correctAnswer,
    explanation: q.explanation, key_note: q.keyNote, grade: q.grade,
    chapter: q.chapter, section: q.section, difficulty: q.difficulty, type: q.type,
  }).select().single();
  if (error) throw error;
  return mapQuestion(data);
}

export async function updateQuestion(id: string, q: Omit<Question, 'id' | 'createdAt'>): Promise<void> {
  const { error } = await supabase.from('question_bank').update({
    text: q.text, options: q.options, correct_answer: q.correctAnswer,
    explanation: q.explanation, key_note: q.keyNote, grade: q.grade,
    chapter: q.chapter, section: q.section, difficulty: q.difficulty, type: q.type,
  }).eq('id', id);
  if (error) throw error;
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from('question_bank').delete().eq('id', id);
  if (error) throw error;
}

export async function batchCreateQuestions(qs: Omit<Question, 'id' | 'createdAt'>[]): Promise<Question[]> {
  const rows = qs.map(q => ({
    text: q.text, options: q.options, correct_answer: q.correctAnswer,
    explanation: q.explanation, key_note: q.keyNote, grade: q.grade,
    chapter: q.chapter, section: q.section, difficulty: q.difficulty, type: q.type,
  }));
  const { data, error } = await supabase.from('question_bank').insert(rows).select('*');
  if (error) throw error;
  return (data || []).map(mapQuestion);
}

// ============================================================
// Exams
// ============================================================

export async function fetchExams(): Promise<Exam[]> {
  const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapExam);
}

export async function createExam(exam: Omit<Exam, 'id' | 'createdAt' | 'code'>): Promise<Exam> {
  const { data, error } = await supabase.from('exams').insert({
    title: exam.title, school_id: exam.schoolId, class_ids: exam.classIds,
    question_ids: exam.questionIds, duration_min: exam.durationMin,
    is_free: exam.isFree, cost: exam.cost, start_at: exam.startAt, end_at: exam.endAt,
    code: genExamCode(),
  }).select().single();
  if (error) throw error;
  return mapExam(data);
}

export async function updateExam(id: string, exam: Omit<Exam, 'id' | 'createdAt' | 'code'>): Promise<void> {
  const { error } = await supabase.from('exams').update({
    title: exam.title, school_id: exam.schoolId, class_ids: exam.classIds,
    question_ids: exam.questionIds, duration_min: exam.durationMin,
    is_free: exam.isFree, cost: exam.cost, start_at: exam.startAt, end_at: exam.endAt,
  }).eq('id', id);
  if (error) throw error;
}

export async function deleteExam(id: string): Promise<void> {
  const { error } = await supabase.from('exams').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Exam Results
// ============================================================

export async function fetchExamResults(): Promise<ExamAttempt[]> {
  const { data, error } = await supabase.from('exam_results').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAttempt);
}

export async function createExamResult(attempt: Omit<ExamAttempt, 'id'>): Promise<ExamAttempt> {
  const { data, error } = await supabase.from('exam_results').insert({
    exam_id: attempt.examId, student_id: attempt.studentId,
    answers: attempt.answers, bookmarked: attempt.bookmarked,
    started_at: attempt.startedAt, submitted_at: attempt.submittedAt,
    status: attempt.status, correct: attempt.correct, wrong: attempt.wrong,
    blank: attempt.blank, percentage: attempt.percentage,
    time_spent_sec: attempt.timeSpentSec,
  }).select().single();
  if (error) throw error;
  return mapAttempt(data);
}

export async function fetchResultsForStudent(studentId: string): Promise<ExamAttempt[]> {
  const { data, error } = await supabase.from('exam_results').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAttempt);
}

export async function fetchResultsForExam(examId: string): Promise<ExamAttempt[]> {
  const { data, error } = await supabase.from('exam_results').select('*').eq('exam_id', examId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAttempt);
}

// ============================================================
// Self Quizzes
// ============================================================

export async function fetchSelfQuizzes(studentId: string): Promise<SelfQuiz[]> {
  const { data, error } = await supabase.from('self_quizzes').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSelfQuiz);
}

export async function createSelfQuiz(quiz: Omit<SelfQuiz, 'id' | 'createdAt'>): Promise<SelfQuiz> {
  const { data, error } = await supabase.from('self_quizzes').insert({
    student_id: quiz.studentId, title: quiz.title, question_ids: quiz.questionIds,
    mode: quiz.mode, duration_min: quiz.durationMin,
  }).select().single();
  if (error) throw error;
  return mapSelfQuiz(data);
}

export async function deleteSelfQuiz(id: string): Promise<void> {
  const { error } = await supabase.from('self_quizzes').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Vault Folders
// ============================================================

export async function fetchVaultFolders(studentId: string): Promise<VaultFolder[]> {
  const { data, error } = await supabase.from('vault_folders').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapVaultFolder);
}

export async function createVaultFolder(studentId: string, name: string): Promise<VaultFolder> {
  const { data, error } = await supabase.from('vault_folders').insert({
    student_id: studentId, name, question_ids: [],
  }).select().single();
  if (error) throw error;
  return mapVaultFolder(data);
}

export async function updateVaultFolder(id: string, questionIds: string[]): Promise<void> {
  const { error } = await supabase.from('vault_folders').update({ question_ids: questionIds }).eq('id', id);
  if (error) throw error;
}

export async function deleteVaultFolder(id: string): Promise<void> {
  const { error } = await supabase.from('vault_folders').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Notes
// ============================================================

export async function fetchNotes(studentId: string): Promise<Note[]> {
  const { data, error } = await supabase.from('notes').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapNote);
}

export async function createNote(note: Omit<Note, 'id' | 'createdAt'>): Promise<Note> {
  const { data, error } = await supabase.from('notes').insert({
    student_id: note.studentId, question_id: note.questionId,
    content: note.content, chapter: note.chapter,
  }).select().single();
  if (error) throw error;
  return mapNote(data);
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Transactions
// ============================================================

export async function fetchTransactions(studentId: string): Promise<Transaction[]> {
  const { data, error } = await supabase.from('transactions').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapTransaction);
}

export async function createTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  const { data, error } = await supabase.from('transactions').insert({
    student_id: tx.studentId, amount: tx.amount, type: tx.type, description: tx.description,
  }).select().single();
  if (error) throw error;
  return mapTransaction(data);
}
