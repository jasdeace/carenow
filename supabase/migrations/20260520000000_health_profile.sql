-- =====================================================
-- Per-user AI-maintained health snapshot. Written by the
-- generate-health-profile edge function (Gemini analyzes
-- the user's recent meds, vitals, body comp, nutrition,
-- and labs); read by the report screen and used as extra
-- context for the nutrition / lab AI chats.
-- Run this in the Supabase SQL Editor.
-- =====================================================

CREATE TABLE IF NOT EXISTS health_profile (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  highlights jsonb DEFAULT '[]'::jsonb,
  risks jsonb DEFAULT '[]'::jsonb,
  watch jsonb DEFAULT '[]'::jsonb,
  next_actions jsonb DEFAULT '[]'::jsonb,
  summary text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE health_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own health profile" ON health_profile;
CREATE POLICY "Users manage own health profile" ON health_profile
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
