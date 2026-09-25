ALTER TABLE teachers ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_payment_settings" ON payment_settings;
CREATE POLICY "authenticated_read_payment_settings" ON payment_settings
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "teacher_write_payment_settings" ON payment_settings;
CREATE POLICY "teacher_write_payment_settings" ON payment_settings
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "teacher_update_payment_settings" ON payment_settings;
CREATE POLICY "teacher_update_payment_settings" ON payment_settings
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "student_read_own_card_transfers" ON card_transfers;
CREATE POLICY "student_read_own_card_transfers" ON card_transfers
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM students WHERE students.id = card_transfers.student_id AND students.auth_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "student_insert_own_card_transfers" ON card_transfers;
CREATE POLICY "student_insert_own_card_transfers" ON card_transfers
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = card_transfers.student_id AND students.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "teacher_review_card_transfers" ON card_transfers;
CREATE POLICY "teacher_review_card_transfers" ON card_transfers
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "authenticated_read_handouts" ON handouts;
CREATE POLICY "authenticated_read_handouts" ON handouts
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "teacher_insert_handouts" ON handouts;
CREATE POLICY "teacher_insert_handouts" ON handouts
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM teachers WHERE teachers.id = handouts.teacher_id AND teachers.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "teacher_delete_handouts" ON handouts;
CREATE POLICY "teacher_delete_handouts" ON handouts
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM teachers WHERE teachers.id = handouts.teacher_id AND teachers.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "student_read_own_handout_purchases" ON handout_purchases;
CREATE POLICY "student_read_own_handout_purchases" ON handout_purchases
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM students WHERE students.id = handout_purchases.student_id AND students.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "student_insert_own_handout_purchases" ON handout_purchases;
CREATE POLICY "student_insert_own_handout_purchases" ON handout_purchases
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM students WHERE students.id = handout_purchases.student_id AND students.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "student_upload_payment_receipts" ON storage.objects;
CREATE POLICY "student_upload_payment_receipts" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'payment-receipts' AND split_part(name, '/', 1) IN (SELECT students.id::text FROM students WHERE students.auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "teacher_read_payment_receipts" ON storage.objects;
CREATE POLICY "teacher_read_payment_receipts" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'payment-receipts' AND (EXISTS (SELECT 1 FROM teachers WHERE teachers.auth_user_id = auth.uid()) OR split_part(name, '/', 1) IN (SELECT students.id::text FROM students WHERE students.auth_user_id = auth.uid()))
);

DROP POLICY IF EXISTS "teacher_upload_handouts" ON storage.objects;
CREATE POLICY "teacher_upload_handouts" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'handouts' AND split_part(name, '/', 1) IN (SELECT teachers.id::text FROM teachers WHERE teachers.auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "authorized_read_handouts" ON storage.objects;
CREATE POLICY "authorized_read_handouts" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'handouts' AND (
    EXISTS (SELECT 1 FROM handouts WHERE handouts.file_path = storage.objects.name AND handouts.price = 0) OR
    EXISTS (SELECT 1 FROM handouts WHERE handouts.file_path = storage.objects.name AND EXISTS (SELECT 1 FROM teachers WHERE teachers.id = handouts.teacher_id AND teachers.auth_user_id = auth.uid())) OR
    EXISTS (SELECT 1 FROM handout_purchases WHERE handout_purchases.handout_id = (SELECT handouts.id FROM handouts WHERE handouts.file_path = storage.objects.name LIMIT 1) AND EXISTS (SELECT 1 FROM students WHERE students.id = handout_purchases.student_id AND students.auth_user_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "teacher_delete_handouts" ON storage.objects;
CREATE POLICY "teacher_delete_handouts" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'handouts' AND EXISTS (SELECT 1 FROM handouts JOIN teachers ON teachers.id = handouts.teacher_id WHERE handouts.file_path = storage.objects.name AND teachers.auth_user_id = auth.uid())
);
