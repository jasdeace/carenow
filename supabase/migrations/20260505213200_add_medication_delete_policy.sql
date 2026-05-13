-- Add DELETE policy for medications so users can hard delete them
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can delete meds' AND tablename = 'medications') THEN
    CREATE POLICY "Anyone can delete meds" ON medications FOR DELETE USING (true);
  END IF;
END $$;
