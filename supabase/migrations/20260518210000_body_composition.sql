-- =====================================================
-- Body composition (InBody) records — weight, skeletal
-- muscle mass, body fat mass, body fat %.
-- Run this in the Supabase SQL Editor.
-- =====================================================

CREATE TABLE IF NOT EXISTS body_composition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  recorded_at timestamptz DEFAULT now(),
  weight_kg numeric(5,1),
  skeletal_muscle_kg numeric(5,1),
  body_fat_kg numeric(5,1),
  body_fat_pct numeric(4,1),
  source text DEFAULT 'manual',          -- 'manual' | 'ocr'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_composition_user
  ON body_composition(user_id, recorded_at DESC);

ALTER TABLE body_composition ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own body composition" ON body_composition;
CREATE POLICY "Users manage own body composition" ON body_composition
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
