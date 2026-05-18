-- =====================================================
-- Add user_id to all data tables, backfill from loved_ones
-- Run this in Supabase SQL Editor BEFORE deploying frontend
-- =====================================================

-- 1. Add user_id columns
ALTER TABLE medications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE vitals_blood_pressure ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE vitals_glucose ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- 2. Backfill user_id from loved_ones mapping
UPDATE medications m SET user_id = lo.user_id FROM loved_ones lo WHERE m.loved_one_id = lo.id AND m.user_id IS NULL;
UPDATE daily_checkins dc SET user_id = lo.user_id FROM loved_ones lo WHERE dc.loved_one_id = lo.id AND dc.user_id IS NULL;
UPDATE vitals_blood_pressure vbp SET user_id = lo.user_id FROM loved_ones lo WHERE vbp.loved_one_id = lo.id AND vbp.user_id IS NULL;
UPDATE vitals_glucose vg SET user_id = lo.user_id FROM loved_ones lo WHERE vg.loved_one_id = lo.id AND vg.user_id IS NULL;
UPDATE lab_results lr SET user_id = lo.user_id FROM loved_ones lo WHERE lr.loved_one_id = lo.id AND lr.user_id IS NULL;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_id ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_vitals_bp_user_id ON vitals_blood_pressure(user_id);
CREATE INDEX IF NOT EXISTS idx_vitals_glucose_user_id ON vitals_glucose(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_user_id ON lab_results(user_id);

-- 4. Add RLS policies for user_id based access
CREATE POLICY "Users can read own medications by user_id" ON medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medications by user_id" ON medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medications by user_id" ON medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medications by user_id" ON medications FOR DELETE USING (auth.uid() = user_id);

-- 5. Reload schema cache
NOTIFY pgrst, 'reload schema';
