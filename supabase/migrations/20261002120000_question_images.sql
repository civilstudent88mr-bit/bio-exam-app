ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "question_images_public_read" ON storage.objects;
CREATE POLICY "question_images_public_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'question-images');

DROP POLICY IF EXISTS "question_images_teacher_upload" ON storage.objects;
CREATE POLICY "question_images_teacher_upload" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'question-images'
    AND EXISTS (SELECT 1 FROM public.teachers WHERE teachers.auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "question_images_teacher_update" ON storage.objects;
CREATE POLICY "question_images_teacher_update" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'question-images'
    AND EXISTS (SELECT 1 FROM public.teachers WHERE teachers.auth_user_id = auth.uid())
  ) WITH CHECK (
    bucket_id = 'question-images'
    AND EXISTS (SELECT 1 FROM public.teachers WHERE teachers.auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "question_images_teacher_delete" ON storage.objects;
CREATE POLICY "question_images_teacher_delete" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'question-images'
    AND EXISTS (SELECT 1 FROM public.teachers WHERE teachers.auth_user_id = auth.uid())
  );