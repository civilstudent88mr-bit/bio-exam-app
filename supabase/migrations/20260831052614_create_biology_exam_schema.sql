/*
# Biology Exam System — Full Database Schema

## Overview
Creates the complete schema for the Biology Exam System (سامانه آزمون‌ساز زیست‌شناسی).
This is a single-tenant application with custom login (no Supabase Auth).
All tables use `TO anon, authenticated` policies so the anon-key frontend can read/write.

## New Tables
1. `schools` — Educational institutions (مدارس)
2. `classes` — Class groups within schools (کلاس‌ها)
3. `teachers` — Teacher accounts with name/password login
4. `students` — Student accounts with school/class assignment and wallet balance
5. `question_bank` — Biology questions with 4 options, correct answer, explanation, key note, grade, chapter, section, difficulty, type
6. `exams` — Exam definitions with question IDs, class IDs, time window, pricing, duration, code
7. `exam_results` — Student exam attempts with answers, scores, percentage, timing
8. `self_quizzes` — Student-created practice quizzes
9. `vault_folders` — Student folders for organizing bookmarked/mistake questions
10. `notes` — Student notes journal entries per question
11. `transactions` — Wallet charge/payment transactions

## Security
- RLS enabled on ALL tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because this is a single-tenant app with custom auth (no Supabase Auth sessions).
- The app manages its own access control in the frontend.

## Notes
1. `question_bank.options` is stored as `jsonb` array of 4 strings.
2. `question_bank.correct_answer` is integer 0-3.
3. `exams.question_ids` and `exams.class_ids` are `jsonb` arrays.
4. `exam_results.answers` is `jsonb` object mapping question index to answer (0-3).
5. `exam_results.bookmarked` is `jsonb` array of question indices.
6. All `id` columns are `uuid` with `gen_random_uuid()` default.
7. All `created_at` columns default to `now()`.
*/

-- ============================================================
-- 1. SCHOOLS
-- ============================================================
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_schools" ON schools;
CREATE POLICY "anon_select_schools" ON schools FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_schools" ON schools;
CREATE POLICY "anon_insert_schools" ON schools FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_schools" ON schools;
CREATE POLICY "anon_update_schools" ON schools FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_schools" ON schools;
CREATE POLICY "anon_delete_schools" ON schools FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 2. CLASSES
-- ============================================================
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_classes" ON classes;
CREATE POLICY "anon_select_classes" ON classes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_classes" ON classes;
CREATE POLICY "anon_insert_classes" ON classes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_classes" ON classes;
CREATE POLICY "anon_update_classes" ON classes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_classes" ON classes;
CREATE POLICY "anon_delete_classes" ON classes FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 3. TEACHERS
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_teachers" ON teachers;
CREATE POLICY "anon_select_teachers" ON teachers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_teachers" ON teachers;
CREATE POLICY "anon_insert_teachers" ON teachers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_teachers" ON teachers;
CREATE POLICY "anon_update_teachers" ON teachers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_teachers" ON teachers;
CREATE POLICY "anon_delete_teachers" ON teachers FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 4. STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  password text NOT NULL,
  wallet_balance integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_students" ON students;
CREATE POLICY "anon_select_students" ON students FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 5. QUESTION_BANK
-- ============================================================
CREATE TABLE IF NOT EXISTS question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_answer smallint NOT NULL DEFAULT 0,
  explanation text NOT NULL DEFAULT '',
  key_note text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT 'دهم',
  chapter text NOT NULL DEFAULT '',
  section text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'متوسط',
  type text NOT NULL DEFAULT 'مفهومی',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_question_bank" ON question_bank;
CREATE POLICY "anon_select_question_bank" ON question_bank FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_question_bank" ON question_bank;
CREATE POLICY "anon_insert_question_bank" ON question_bank FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_question_bank" ON question_bank;
CREATE POLICY "anon_update_question_bank" ON question_bank FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_question_bank" ON question_bank;
CREATE POLICY "anon_delete_question_bank" ON question_bank FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 6. EXAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_ids jsonb NOT NULL DEFAULT '[]',
  question_ids jsonb NOT NULL DEFAULT '[]',
  duration_min integer NOT NULL DEFAULT 30,
  is_free boolean NOT NULL DEFAULT true,
  cost integer NOT NULL DEFAULT 0,
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz NOT NULL DEFAULT now() + interval '1 day',
  code text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_exams" ON exams;
CREATE POLICY "anon_select_exams" ON exams FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_exams" ON exams;
CREATE POLICY "anon_insert_exams" ON exams FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_exams" ON exams;
CREATE POLICY "anon_update_exams" ON exams FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_exams" ON exams;
CREATE POLICY "anon_delete_exams" ON exams FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 7. EXAM_RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}',
  bookmarked jsonb NOT NULL DEFAULT '[]',
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  status text NOT NULL DEFAULT 'submitted',
  correct integer NOT NULL DEFAULT 0,
  wrong integer NOT NULL DEFAULT 0,
  blank integer NOT NULL DEFAULT 0,
  percentage numeric(5,1) NOT NULL DEFAULT 0,
  time_spent_sec integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_exam_results" ON exam_results;
CREATE POLICY "anon_select_exam_results" ON exam_results FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_exam_results" ON exam_results;
CREATE POLICY "anon_insert_exam_results" ON exam_results FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_exam_results" ON exam_results;
CREATE POLICY "anon_update_exam_results" ON exam_results FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_exam_results" ON exam_results;
CREATE POLICY "anon_delete_exam_results" ON exam_results FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 8. SELF_QUIZZES
-- ============================================================
CREATE TABLE IF NOT EXISTS self_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title text NOT NULL,
  question_ids jsonb NOT NULL DEFAULT '[]',
  mode text NOT NULL DEFAULT 'practice',
  duration_min integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE self_quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_self_quizzes" ON self_quizzes;
CREATE POLICY "anon_select_self_quizzes" ON self_quizzes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_self_quizzes" ON self_quizzes;
CREATE POLICY "anon_insert_self_quizzes" ON self_quizzes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_self_quizzes" ON self_quizzes;
CREATE POLICY "anon_update_self_quizzes" ON self_quizzes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_self_quizzes" ON self_quizzes;
CREATE POLICY "anon_delete_self_quizzes" ON self_quizzes FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 9. VAULT_FOLDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS vault_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name text NOT NULL,
  question_ids jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vault_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_vault_folders" ON vault_folders;
CREATE POLICY "anon_select_vault_folders" ON vault_folders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_vault_folders" ON vault_folders;
CREATE POLICY "anon_insert_vault_folders" ON vault_folders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_vault_folders" ON vault_folders;
CREATE POLICY "anon_update_vault_folders" ON vault_folders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_vault_folders" ON vault_folders;
CREATE POLICY "anon_delete_vault_folders" ON vault_folders FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 10. NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  content text NOT NULL,
  chapter text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_notes" ON notes;
CREATE POLICY "anon_select_notes" ON notes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_notes" ON notes;
CREATE POLICY "anon_insert_notes" ON notes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_notes" ON notes;
CREATE POLICY "anon_update_notes" ON notes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_notes" ON notes;
CREATE POLICY "anon_delete_notes" ON notes FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 11. TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount integer NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'charge',
  description text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- INDEXES for frequently queried columns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_grade ON question_bank(grade);
CREATE INDEX IF NOT EXISTS idx_question_bank_chapter ON question_bank(chapter);
CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_exams_school_id ON exams(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_id ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_self_quizzes_student_id ON self_quizzes(student_id);
CREATE INDEX IF NOT EXISTS idx_vault_folders_student_id ON vault_folders(student_id);
CREATE INDEX IF NOT EXISTS idx_notes_student_id ON notes(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_student_id ON transactions(student_id);
