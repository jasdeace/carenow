-- Add DELETE policy for care_circle_members so users can remove connections
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can delete circle members' AND tablename = 'care_circle_members') THEN
    CREATE POLICY "Anyone can delete circle members" ON care_circle_members FOR DELETE USING (true);
  END IF;
END $$;
