-- Add DELETE policy for medication_logs (needed for undo functionality)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can delete med logs' AND tablename = 'medication_logs'
  ) THEN
    CREATE POLICY "Anyone can delete med logs" ON medication_logs FOR DELETE USING (true);
  END IF;
END $$;
