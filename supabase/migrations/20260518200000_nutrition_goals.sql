-- =====================================================
-- Per-user nutrition / fitness goal — set conversationally
-- by the AI nutrition coach, read by NutriTrack for the
-- daily calorie target.
-- Run this in the Supabase SQL Editor.
-- =====================================================

CREATE TABLE IF NOT EXISTS nutrition_goals (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  goal_type text,                          -- 'lose' | 'maintain' | 'gain'
  daily_calorie_goal integer DEFAULT 2000,
  daily_protein_goal integer,
  notes text,                              -- the user's goal in their words
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own nutrition goal" ON nutrition_goals;
CREATE POLICY "Users manage own nutrition goal" ON nutrition_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
