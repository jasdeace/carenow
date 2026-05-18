-- =====================================================
-- Remove the caregiver/caretaker user-level role split.
-- Every user is now BOTH: they track their own health AND
-- can connect to family members to view theirs.
--
-- Per-circle roles (care_circle_members.role) are unchanged --
-- they describe the relationship inside a circle (whose data it
-- is vs. who is watching), not a fixed identity for the user.
--
-- Run this in the Supabase SQL Editor.
-- =====================================================

-- No RLS policy references users.role, so a plain drop is safe.
ALTER TABLE public.users DROP COLUMN IF EXISTS role;

-- Reload PostgREST schema cache so the API stops exposing the column
NOTIFY pgrst, 'reload schema';
