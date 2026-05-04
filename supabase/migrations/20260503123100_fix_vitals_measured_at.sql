-- Add DEFAULT NOW() to measured_at on all vitals tables so inserts never fail
ALTER TABLE vitals_blood_pressure ALTER COLUMN measured_at SET DEFAULT NOW();
ALTER TABLE vitals_glucose ALTER COLUMN measured_at SET DEFAULT NOW();
ALTER TABLE vitals_weight ALTER COLUMN measured_at SET DEFAULT NOW();
