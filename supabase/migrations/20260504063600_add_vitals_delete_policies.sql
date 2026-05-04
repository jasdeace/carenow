-- Add DELETE policies for vitals tables so users can remove entries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can delete bp' AND tablename = 'vitals_blood_pressure') THEN
    CREATE POLICY "Anyone can delete bp" ON vitals_blood_pressure FOR DELETE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can delete glucose' AND tablename = 'vitals_glucose') THEN
    CREATE POLICY "Anyone can delete glucose" ON vitals_glucose FOR DELETE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can delete weight' AND tablename = 'vitals_weight') THEN
    CREATE POLICY "Anyone can delete weight" ON vitals_weight FOR DELETE USING (true);
  END IF;
END $$;
