CREATE TABLE IF NOT EXISTS payment_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  card_number text NOT NULL DEFAULT '',
  card_holder text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount >= 1000),
  tracking_code text NOT NULL,
  receipt_path text NOT NULL,
  receipt_file_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transfers ENABLE ROW LEVEL SECURITY;

-- Keep these tables private. Add policies through Supabase Auth or an Edge Function
-- that validates the application's teacher/student session before exposing data.
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;
