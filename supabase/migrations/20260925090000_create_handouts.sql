CREATE TABLE IF NOT EXISTS handouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  price integer NOT NULL DEFAULT 0 CHECK (price >= 0),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS handout_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handout_id uuid NOT NULL REFERENCES handouts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount integer NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(handout_id, student_id)
);

ALTER TABLE handouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE handout_purchases ENABLE ROW LEVEL SECURITY;

-- Private storage bucket for uploaded handouts.
-- The bucket must exist before the client can upload a file to it.
INSERT INTO storage.buckets (id, name, public)
VALUES ('handouts', 'handouts', false)
ON CONFLICT (id) DO NOTHING;

-- Configure these policies through a server-side Edge Function or Supabase Auth.
-- The app intentionally does not grant anon access to paid files.
