-- Users can select any user to look up their phone number for linking
CREATE POLICY "Users can look up phone numbers" ON users FOR SELECT USING (true);

-- Care Circles
CREATE POLICY "Anyone can create a circle" ON care_circles FOR INSERT WITH CHECK (true);
CREATE POLICY "Members can view circle" ON care_circles FOR SELECT USING (true);

-- Loved Ones
CREATE POLICY "Anyone can create a loved one" ON loved_ones FOR INSERT WITH CHECK (true);
CREATE POLICY "Members can view loved ones" ON loved_ones FOR SELECT USING (true);

-- Care Circle Members
CREATE POLICY "Anyone can join a circle" ON care_circle_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Members can view members" ON care_circle_members FOR SELECT USING (true);

-- Medications
CREATE POLICY "Anyone can view meds" ON medications FOR SELECT USING (true);
CREATE POLICY "Anyone can insert meds" ON medications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update meds" ON medications FOR UPDATE USING (true);

-- Vitals Blood Pressure
ALTER TABLE vitals_blood_pressure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view bp" ON vitals_blood_pressure FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bp" ON vitals_blood_pressure FOR INSERT WITH CHECK (true);

-- Vitals Glucose
ALTER TABLE vitals_glucose ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view glucose" ON vitals_glucose FOR SELECT USING (true);
CREATE POLICY "Anyone can insert glucose" ON vitals_glucose FOR INSERT WITH CHECK (true);

-- Vitals Weight
CREATE POLICY "Anyone can view weight" ON vitals_weight FOR SELECT USING (true);
CREATE POLICY "Anyone can insert weight" ON vitals_weight FOR INSERT WITH CHECK (true);

-- Daily Checkins
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view checkins" ON daily_checkins FOR SELECT USING (true);
CREATE POLICY "Anyone can insert checkins" ON daily_checkins FOR INSERT WITH CHECK (true);

-- Medication Logs
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view med logs" ON medication_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert med logs" ON medication_logs FOR INSERT WITH CHECK (true);
