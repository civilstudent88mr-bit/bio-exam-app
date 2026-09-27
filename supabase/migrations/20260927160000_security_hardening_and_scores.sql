-- Move sensitive application data behind Supabase Auth and store a persisted
-- score snapshot for each submitted exam result.

ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS score numeric(6,1);

-- Profile tables: students can read their own row, teachers can manage the
-- student directory, and a user can only create/link their own profile.
DROP POLICY IF EXISTS "anon_select_teachers" ON teachers;
DROP POLICY IF EXISTS "anon_insert_teachers" ON teachers;
DROP POLICY IF EXISTS "anon_update_teachers" ON teachers;
DROP POLICY IF EXISTS "anon_delete_teachers" ON teachers;
DROP POLICY IF EXISTS "anon_select_students" ON students;
DROP POLICY IF EXISTS "anon_insert_students" ON students;
DROP POLICY IF EXISTS "anon_update_students" ON students;
DROP POLICY IF EXISTS "anon_delete_students" ON students;

CREATE POLICY "authenticated_read_teachers" ON teachers FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR EXISTS (SELECT 1 FROM teachers own WHERE own.auth_user_id = auth.uid()));
CREATE POLICY "authenticated_insert_teachers" ON teachers FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "authenticated_update_teachers" ON teachers FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() OR EXISTS (SELECT 1 FROM teachers own WHERE own.auth_user_id = auth.uid()))
  WITH CHECK (auth_user_id = auth.uid() OR EXISTS (SELECT 1 FROM teachers own WHERE own.auth_user_id = auth.uid()));
CREATE POLICY "authenticated_delete_teachers" ON teachers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM teachers own WHERE own.auth_user_id = auth.uid()));

CREATE POLICY "authenticated_read_students" ON students FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR EXISTS (SELECT 1 FROM teachers own WHERE own.auth_user_id = auth.uid()));
CREATE POLICY "authenticated_insert_students" ON students FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid() OR EXISTS (SELECT 1 FROM teachers own WHERE own.auth_user_id = auth.uid()));
CREATE POLICY "authenticated_update_students" ON students FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() OR EXISTS (SELECT 1 FROM teachers own WHERE own.auth_user_id = auth.uid()))
  WITH CHECK (auth_user_id = auth.uid() OR EXISTS (SELECT 1 FROM teachers own WHERE own.auth_user_id = auth.uid()));
CREATE POLICY "authenticated_delete_students" ON students FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM teachers own WHERE own.auth_user_id = auth.uid()));

-- Only teachers can modify the question bank and exams. Public read access is
-- retained because students must be able to take assigned exams.
DROP POLICY IF EXISTS "anon_insert_question_bank" ON question_bank;
DROP POLICY IF EXISTS "anon_update_question_bank" ON question_bank;
DROP POLICY IF EXISTS "anon_delete_question_bank" ON question_bank;
DROP POLICY IF EXISTS "anon_insert_exams" ON exams;
DROP POLICY IF EXISTS "anon_update_exams" ON exams;
DROP POLICY IF EXISTS "anon_delete_exams" ON exams;
CREATE POLICY "teacher_insert_question_bank" ON question_bank FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()));
CREATE POLICY "teacher_update_question_bank" ON question_bank FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()));
CREATE POLICY "teacher_delete_question_bank" ON question_bank FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()));
CREATE POLICY "teacher_insert_exams" ON exams FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()));
CREATE POLICY "teacher_update_exams" ON exams FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()));
CREATE POLICY "teacher_delete_exams" ON exams FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()));

-- Results are private to the student and teaching staff.
DROP POLICY IF EXISTS "anon_select_exam_results" ON exam_results;
DROP POLICY IF EXISTS "anon_insert_exam_results" ON exam_results;
DROP POLICY IF EXISTS "anon_update_exam_results" ON exam_results;
DROP POLICY IF EXISTS "anon_delete_exam_results" ON exam_results;
CREATE POLICY "student_or_teacher_read_exam_results" ON exam_results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = exam_results.student_id AND students.auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()));
CREATE POLICY "student_insert_exam_results" ON exam_results FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = exam_results.student_id AND students.auth_user_id = auth.uid()));
CREATE POLICY "student_update_exam_results" ON exam_results FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = exam_results.student_id AND students.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = exam_results.student_id AND students.auth_user_id = auth.uid()));

-- Personal learning data and wallet transactions.
DROP POLICY IF EXISTS "anon_select_self_quizzes" ON self_quizzes;
DROP POLICY IF EXISTS "anon_insert_self_quizzes" ON self_quizzes;
DROP POLICY IF EXISTS "anon_update_self_quizzes" ON self_quizzes;
DROP POLICY IF EXISTS "anon_delete_self_quizzes" ON self_quizzes;
DROP POLICY IF EXISTS "anon_select_vault_folders" ON vault_folders;
DROP POLICY IF EXISTS "anon_insert_vault_folders" ON vault_folders;
DROP POLICY IF EXISTS "anon_update_vault_folders" ON vault_folders;
DROP POLICY IF EXISTS "anon_delete_vault_folders" ON vault_folders;
DROP POLICY IF EXISTS "anon_select_notes" ON notes;
DROP POLICY IF EXISTS "anon_insert_notes" ON notes;
DROP POLICY IF EXISTS "anon_update_notes" ON notes;
DROP POLICY IF EXISTS "anon_delete_notes" ON notes;
DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;

CREATE POLICY "student_read_self_quizzes" ON self_quizzes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = self_quizzes.student_id AND students.auth_user_id = auth.uid()));
CREATE POLICY "student_write_self_quizzes" ON self_quizzes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = self_quizzes.student_id AND students.auth_user_id = auth.uid()));
CREATE POLICY "student_update_self_quizzes" ON self_quizzes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = self_quizzes.student_id AND students.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = self_quizzes.student_id AND students.auth_user_id = auth.uid()));
CREATE POLICY "student_delete_self_quizzes" ON self_quizzes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = self_quizzes.student_id AND students.auth_user_id = auth.uid()));

CREATE POLICY "student_read_vault_folders" ON vault_folders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = vault_folders.student_id AND students.auth_user_id = auth.uid()));
CREATE POLICY "student_write_vault_folders" ON vault_folders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = vault_folders.student_id AND students.auth_user_id = auth.uid()));
CREATE POLICY "student_update_vault_folders" ON vault_folders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = vault_folders.student_id AND students.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = vault_folders.student_id AND students.auth_user_id = auth.uid()));
CREATE POLICY "student_delete_vault_folders" ON vault_folders FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = vault_folders.student_id AND students.auth_user_id = auth.uid()));

CREATE POLICY "student_read_notes" ON notes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = notes.student_id AND students.auth_user_id = auth.uid()));
CREATE POLICY "student_write_notes" ON notes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = notes.student_id AND students.auth_user_id = auth.uid()));
CREATE POLICY "student_update_notes" ON notes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = notes.student_id AND students.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = notes.student_id AND students.auth_user_id = auth.uid()));
CREATE POLICY "student_delete_notes" ON notes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = notes.student_id AND students.auth_user_id = auth.uid()));

CREATE POLICY "student_or_teacher_read_transactions" ON transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE students.id = transactions.student_id AND students.auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()));
CREATE POLICY "student_insert_transactions" ON transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = transactions.student_id AND students.auth_user_id = auth.uid()));
CREATE POLICY "teacher_update_transactions" ON transactions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_exam_results_score ON exam_results(exam_id, score DESC);
