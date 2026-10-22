-- The OpenAI key must never be readable or writable from the browser.
UPDATE public.app_settings SET openai_api_key = NULL WHERE id = 1;
DROP POLICY IF EXISTS "anon_select_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "anon_insert_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "anon_update_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "anon_delete_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "authenticated_select_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "authenticated_insert_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "authenticated_update_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "authenticated_delete_app_settings" ON public.app_settings;

CREATE POLICY "teacher_read_app_settings" ON public.app_settings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teachers WHERE teachers.auth_user_id = auth.uid()));
CREATE POLICY "teacher_update_app_settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teachers WHERE teachers.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teachers WHERE teachers.auth_user_id = auth.uid()));
ALTER TABLE public.app_settings DROP COLUMN IF EXISTS openai_api_key;
