-- =============================================
-- CareNow NutriTrack Tables
-- =============================================

-- 1. Daily nutrition log entries (meals + activities)
CREATE TABLE IF NOT EXISTS nutrition_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  entry_type text NOT NULL CHECK (entry_type IN ('meal', 'activity')),
  
  -- Meal fields
  meal_type text,
  description text,
  image_url text,
  
  -- Activity fields  
  activity_name text,
  duration_minutes integer,
  
  -- Nutrition data (from AI or manual)
  calories integer DEFAULT 0,
  protein_g numeric(6,1) DEFAULT 0,
  carbs_g numeric(6,1) DEFAULT 0,
  fat_g numeric(6,1) DEFAULT 0,
  fiber_g numeric(6,1) DEFAULT 0,
  
  -- AI analysis metadata
  ai_analysis jsonb,
  is_manually_edited boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON nutrition_entries(user_id, entry_date DESC);

-- 2. Daily summary cache
CREATE TABLE IF NOT EXISTS nutrition_daily_summary (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  summary_date date NOT NULL,
  total_calories_in integer DEFAULT 0,
  total_calories_burned integer DEFAULT 0,
  net_calories integer DEFAULT 0,
  total_protein numeric(6,1) DEFAULT 0,
  total_carbs numeric(6,1) DEFAULT 0,
  total_fat numeric(6,1) DEFAULT 0,
  entry_count integer DEFAULT 0,
  ai_feedback text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, summary_date)
);

-- 3. Chat history for nutrition conversations
CREATE TABLE IF NOT EXISTS nutrition_chat (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  chat_date date NOT NULL DEFAULT CURRENT_DATE,
  messages jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, chat_date)
);

-- RLS policies
ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own nutrition entries" ON nutrition_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own nutrition summary" ON nutrition_daily_summary
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own nutrition chat" ON nutrition_chat
  FOR ALL USING (auth.uid() = user_id);
