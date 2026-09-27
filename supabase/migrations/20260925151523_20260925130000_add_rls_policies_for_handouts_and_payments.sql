/*
# Add RLS Policies for Handouts and Payment Tables

## Problem
The `handouts`, `handout_purchases`, `payment_settings`, and `card_transfers` tables
were created with RLS enabled but NO policies. This means every operation (SELECT,
INSERT, UPDATE, DELETE) from the anon-key frontend is blocked — the teacher cannot
upload handouts, save card numbers, or review payment receipts.

The storage buckets `handouts` and `payment-receipts` were also created without
storage policies, so file uploads and signed-URL downloads fail.

## Fix
1. Add full CRUD policies (TO anon, authenticated) on all four tables, matching the
   pattern used by the rest of the schema (single-tenant, app-managed auth).
2. Add storage policies allowing anon/authenticated to upload and read objects in the
   `handouts` and `payment-receipts` buckets so the frontend can upload files and
   generate signed URLs.

## Tables affected
- handouts
- handout_purchases
- payment_settings
- card_transfers
- storage.objects (for objects in buckets 'handouts' and 'payment-receipts')
*/

-- ============================================================
-- handouts
-- ============================================================
DROP POLICY IF EXISTS "anon_select_handouts" ON handouts;
CREATE POLICY "anon_select_handouts" ON handouts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_handouts" ON handouts;
CREATE POLICY "anon_insert_handouts" ON handouts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_handouts" ON handouts;
CREATE POLICY "anon_update_handouts" ON handouts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_handouts" ON handouts;
CREATE POLICY "anon_delete_handouts" ON handouts FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- handout_purchases
-- ============================================================
DROP POLICY IF EXISTS "anon_select_handout_purchases" ON handout_purchases;
CREATE POLICY "anon_select_handout_purchases" ON handout_purchases FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_handout_purchases" ON handout_purchases;
CREATE POLICY "anon_insert_handout_purchases" ON handout_purchases FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_handout_purchases" ON handout_purchases;
CREATE POLICY "anon_update_handout_purchases" ON handout_purchases FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_handout_purchases" ON handout_purchases;
CREATE POLICY "anon_delete_handout_purchases" ON handout_purchases FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- payment_settings
-- ============================================================
DROP POLICY IF EXISTS "anon_select_payment_settings" ON payment_settings;
CREATE POLICY "anon_select_payment_settings" ON payment_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_payment_settings" ON payment_settings;
CREATE POLICY "anon_insert_payment_settings" ON payment_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_payment_settings" ON payment_settings;
CREATE POLICY "anon_update_payment_settings" ON payment_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_payment_settings" ON payment_settings;
CREATE POLICY "anon_delete_payment_settings" ON payment_settings FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- card_transfers
-- ============================================================
DROP POLICY IF EXISTS "anon_select_card_transfers" ON card_transfers;
CREATE POLICY "anon_select_card_transfers" ON card_transfers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_card_transfers" ON card_transfers;
CREATE POLICY "anon_insert_card_transfers" ON card_transfers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_card_transfers" ON card_transfers;
CREATE POLICY "anon_update_card_transfers" ON card_transfers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_card_transfers" ON card_transfers;
CREATE POLICY "anon_delete_card_transfers" ON card_transfers FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- Storage policies for 'handouts' bucket
-- ============================================================
DROP POLICY IF EXISTS "anon_upload_handouts" ON storage.objects;
CREATE POLICY "anon_upload_handouts" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'handouts');

DROP POLICY IF EXISTS "anon_read_handouts" ON storage.objects;
CREATE POLICY "anon_read_handouts" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'handouts');

DROP POLICY IF EXISTS "anon_delete_handouts" ON storage.objects;
CREATE POLICY "anon_delete_handouts" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'handouts');

-- ============================================================
-- Storage policies for 'payment-receipts' bucket
-- ============================================================
DROP POLICY IF EXISTS "anon_upload_payment_receipts" ON storage.objects;
CREATE POLICY "anon_upload_payment_receipts" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-receipts');

DROP POLICY IF EXISTS "anon_read_payment_receipts" ON storage.objects;
CREATE POLICY "anon_read_payment_receipts" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'payment-receipts');

DROP POLICY IF EXISTS "anon_delete_payment_receipts" ON storage.objects;
CREATE POLICY "anon_delete_payment_receipts" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'payment-receipts');
