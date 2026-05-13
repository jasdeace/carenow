-- Enable Row Level Security
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;

-- Allow read access to anyone (or customize to specific roles)
CREATE POLICY "Anyone can view medication_schedules" ON medication_schedules FOR SELECT USING (true);

-- Allow insert access to anyone
CREATE POLICY "Anyone can insert medication_schedules" ON medication_schedules FOR INSERT WITH CHECK (true);

-- Allow update access to anyone
CREATE POLICY "Anyone can update medication_schedules" ON medication_schedules FOR UPDATE USING (true);

-- Allow delete access to anyone
CREATE POLICY "Anyone can delete medication_schedules" ON medication_schedules FOR DELETE USING (true);
