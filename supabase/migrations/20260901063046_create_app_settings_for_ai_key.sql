/*
# Create app_settings table for AI API key storage

## Overview
Creates a single-row settings table to store the OpenAI API key used by
the AI question importer. The key is set by the teacher from the UI and
read at runtime when extracting questions.

## New Tables
1. `app_settings`
   - `id` (int, primary key, always 1 — singleton row)
   - `openai_api_key` (text, nullable — the API key)
   - `updated_at` (timestamptz)

## Security
- RLS enabled on `app_settings`.
- `anon, authenticated` can SELECT (to read the key client-side for API calls).
- `anon, authenticated` can INSERT/UPDATE/DELETE (teacher configures the key).
- This is a single-tenant app with custom auth; the key is managed by the teacher.

## Notes
1. Only one row will ever exist (id = 1).
2. The key is stored as plaintext — this is acceptable for this single-tenant
   educational app where the teacher manages their own key.
*/

CREATE TABLE IF NOT EXISTS app_settings (
  id int PRIMARY KEY DEFAULT 1,
  openai_api_key text,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_app_settings" ON app_settings;
CREATE POLICY "anon_select_app_settings" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_app_settings" ON app_settings;
CREATE POLICY "anon_insert_app_settings" ON app_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_app_settings" ON app_settings;
CREATE POLICY "anon_update_app_settings" ON app_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_app_settings" ON app_settings;
CREATE POLICY "anon_delete_app_settings" ON app_settings FOR DELETE
  TO anon, authenticated USING (true);

-- Insert the singleton row if it doesn't exist
INSERT INTO app_settings (id, openai_api_key)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;