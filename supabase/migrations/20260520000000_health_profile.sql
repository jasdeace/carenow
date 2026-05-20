-- =====================================================
-- AI-maintained health report HISTORY per user. Each call
-- to generate-health-profile INSERTs a new row; "latest"
-- is just `ORDER BY generated_at DESC LIMIT 1`.
--
-- chat_history holds the Q&A the user has had with the AI
-- about that specific report (chat-health-report fn).
--
-- Run this whole file in the Supabase SQL Editor.
-- (Supersedes the earlier single-row form of this file.)
-- =====================================================

DROP TABLE IF EXISTS health_profile CASCADE;

CREATE TABLE health_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  highlights jsonb DEFAULT '[]'::jsonb,
  risks jsonb DEFAULT '[]'::jsonb,
  watch jsonb DEFAULT '[]'::jsonb,
  next_actions jsonb DEFAULT '[]'::jsonb,
  summary text,
  chat_history jsonb DEFAULT '[]'::jsonb,
  generated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_profile_user_generated
  ON health_profile(user_id, generated_at DESC);

ALTER TABLE health_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own health profile" ON health_profile;
CREATE POLICY "Users manage own health profile" ON health_profile
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
