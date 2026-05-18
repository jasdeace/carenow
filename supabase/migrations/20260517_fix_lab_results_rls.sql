-- ============================================
-- Fix lab_results RLS to support user_id column
-- Run in Supabase SQL Editor
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Users can insert their own lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Users can update their own lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Users can delete their own lab results" ON public.lab_results;

-- Recreate with support for BOTH user_id and loved_one_id paths
CREATE POLICY "Users can view their own lab results" 
ON public.lab_results FOR SELECT 
USING (
  user_id = auth.uid()
  OR loved_one_id IN (SELECT id FROM loved_ones WHERE user_id = auth.uid())
  OR auth.uid() IN (
    SELECT user_id FROM care_circle_members WHERE circle_id IN (
      SELECT circle_id FROM loved_ones WHERE id = lab_results.loved_one_id
    )
  )
);

CREATE POLICY "Users can insert their own lab results" 
ON public.lab_results FOR INSERT 
WITH CHECK (
  user_id = auth.uid()
  OR loved_one_id IN (SELECT id FROM loved_ones WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their own lab results" 
ON public.lab_results FOR UPDATE 
USING (
  user_id = auth.uid()
  OR loved_one_id IN (SELECT id FROM loved_ones WHERE user_id = auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  OR loved_one_id IN (SELECT id FROM loved_ones WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete their own lab results" 
ON public.lab_results FOR DELETE 
USING (
  user_id = auth.uid()
  OR loved_one_id IN (SELECT id FROM loved_ones WHERE user_id = auth.uid())
);

NOTIFY pgrst, 'reload schema';
