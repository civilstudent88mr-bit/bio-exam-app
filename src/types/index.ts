// ============================================================
// Core Data Schemas — Biology Exam System
// Designed to be extensible: add fields to interfaces without
// breaking existing persisted data (storage merges defaults).
// ============================================================

export type ID = string;
export type ISODate = string;

// --- Educational structure ---
export interface School {
  id: ID;
  name: string;
  createdAt: ISODate;
}

export interface ClassGroup {
  id: ID;
  schoolId: ID;
  name: string;
  createdAt: ISODate;
}

// --- Users ---
export type Role = 'teacher' | 'student';

export interface Teacher {
  id: ID;
  name: string;
  password: string;
  phone: string;
  createdAt: ISODate;
}

export interface Student {
  id: ID;
  name: string;
  schoolId: ID;
  classId: ID;
  password: string;
  phone: string;
  walletBalance: number;
  createdAt: ISODate;
}

// --- Question bank ---
export type Grade = 'دهم' | 'یازدهم' | 'دوازدهم';
export type Difficulty = 'ساده' | 'متوسط' | 'چالشی';
export type QuestionType = 'مفهومی' | 'خط‌به‌خط' | 'ترکیبی' | 'شکل‌دار' | 'شمارشی';

export interface Question {
  id: ID;
  text: string;
  options: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
  explanation: string;
  keyNote: string;
  grade: Grade;
  chapter: string;
  section: string;
  difficulty: Difficulty;
  type: QuestionType;
  createdAt: ISODate;
}

// --- Exams ---
export interface Exam {
  id: ID;
  title: string;
  schoolId: ID;
  classIds: ID[];
  questionIds: ID[];
  durationMin: number;
  isFree: boolean;
  cost: number;
  startAt: ISODate;
  endAt: ISODate;
  code: string;
  createdAt: ISODate;
}

export type AttemptStatus = 'in-progress' | 'submitted' | 'locked';

export interface ExamAttempt {
  id: ID;
  examId: ID;
  studentId: ID;
  answers: Record<number, 0 | 1 | 2 | 3>;
  bookmarked: number[];
  startedAt: ISODate;
  submittedAt: ISODate | null;
  status: AttemptStatus;
  correct: number;
  wrong: number;
  blank: number;
  percentage: number;
  timeSpentSec: number;
}

// --- Student self-quizzes ---
export type SelfQuizMode = 'practice' | 'timed';

export interface SelfQuiz {
  id: ID;
  studentId: ID;
  title: string;
  questionIds: ID[];
  mode: SelfQuizMode;
  durationMin: number;
  createdAt: ISODate;
}

// --- Mistake & bookmark vault ---
export interface VaultFolder {
  id: ID;
  studentId: ID;
  name: string;
  questionIds: ID[];
  createdAt: ISODate;
}

// --- Notes journal ---
export interface Note {
  id: ID;
  studentId: ID;
  questionId: ID;
  content: string;
  chapter: string;
  createdAt: ISODate;
}

// --- Wallet transactions ---
export type TxType = 'charge' | 'exam';

export interface Transaction {
  id: ID;
  studentId: ID;
  amount: number;
  type: TxType;
  description: string;
  createdAt: ISODate;
}

// --- Root database shape ---
export interface Database {
  version: number;
  schools: School[];
  classes: ClassGroup[];
  teachers: Teacher[];
  students: Student[];
  questions: Question[];
  exams: Exam[];
  attempts: ExamAttempt[];
  selfQuizzes: SelfQuiz[];
  vaultFolders: VaultFolder[];
  notes: Note[];
  transactions: Transaction[];
}

// --- UI prefs (stored separately) ---
export type ThemeMode = 'light' | 'dark';
export type ActiveRole = 'teacher' | 'student';

export interface Prefs {
  theme: ThemeMode;
  activeRole: ActiveRole;
  teacherId: string | null;
  studentId: string | null;
}
