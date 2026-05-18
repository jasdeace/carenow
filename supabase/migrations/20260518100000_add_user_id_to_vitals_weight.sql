-- =====================================================
-- vitals_weight was missed by 20260515_add_user_id_to_tables.sql.
-- Add user_id so it matches vitals_blood_pressure / vitals_glucose.
-- Run this in the Supabase SQL Editor.
-- =====================================================

ALTER TABLE vitals_weight ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Backfill from the loved_ones mapping
UPDATE vitals_weight vw
SET user_id = lo.user_id
FROM loved_ones lo
WHERE vw.loved_one_id = lo.id AND vw.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_vitals_weight_user_id ON vitals_weight(user_id);

-- user_id based RLS (mirrors the other vitals tables)
DROP POLICY IF EXISTS "Users read own weight by user_id" ON vitals_weight;
DROP POLICY IF EXISTS "Users insert own weight by user_id" ON vitals_weight;
DROP POLICY IF EXISTS "Users update own weight by user_id" ON vitals_weight;
DROP POLICY IF EXISTS "Users delete own weight by user_id" ON vitals_weight;

CREATE POLICY "Users read own weight by user_id" ON vitals_weight
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own weight by user_id" ON vitals_weight
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own weight by user_id" ON vitals_weight
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own weight by user_id" ON vitals_weight
  FOR DELETE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
