-- Add UPDATE policy for care_circle_members to allow acceptance (setting accepted_at)
DROP POLICY IF EXISTS "Anyone can update circle members" ON care_circle_members;
CREATE POLICY "Anyone can update circle members" ON care_circle_members FOR UPDATE USING (true);
