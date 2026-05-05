-- ============================================
-- CONSOLIDATED FIX: lab_results table
-- Run this ONCE in Supabase SQL Editor to fix everything
-- ============================================

-- 1. Ensure correct columns exist
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS recorded_at DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS raw_content TEXT;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS parsed_data JSONB;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS chat_history JSONB;

-- 2. Fix FK to point to loved_ones (idempotent)
ALTER TABLE public.lab_results DROP CONSTRAINT IF EXISTS lab_results_loved_one_id_fkey;
ALTER TABLE public.lab_results ADD CONSTRAINT lab_results_loved_one_id_fkey 
  FOREIGN KEY (loved_one_id) REFERENCES public.loved_ones(id) ON DELETE CASCADE;

-- 3. Enable RLS
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

-- 4. Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Users can view their own lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Users can insert their own lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Users can update their own lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Users can delete their own lab results" ON public.lab_results;

-- 5. Recreate ALL policies with correct logic
--    loved_one_id → loved_ones.id (NOT users.id)
--    So we join through loved_ones to match auth.uid() = loved_ones.user_id

CREATE POLICY "Users can view their own lab results" 
ON public.lab_results FOR SELECT 
USING (
  loved_one_id IN (SELECT id FROM loved_ones WHERE user_id = auth.uid())
  OR auth.uid() IN (
    SELECT user_id FROM care_circle_members WHERE circle_id IN (
      SELECT circle_id FROM loved_ones WHERE id = lab_results.loved_one_id
    )
  )
);

CREATE POLICY "Users can insert their own lab results" 
ON public.lab_results FOR INSERT 
WITH CHECK (
  loved_one_id IN (SELECT id FROM loved_ones WHERE user_id = auth.uid())
  OR auth.uid() IN (
    SELECT user_id FROM care_circle_members WHERE circle_id IN (
      SELECT circle_id FROM loved_ones WHERE id = lab_results.loved_one_id
    )
  )
);

CREATE POLICY "Users can update their own lab results" 
ON public.lab_results FOR UPDATE 
USING (
  loved_one_id IN (SELECT id FROM loved_ones WHERE user_id = auth.uid())
  OR auth.uid() IN (
    SELECT user_id FROM care_circle_members WHERE circle_id IN (
      SELECT circle_id FROM loved_ones WHERE id = lab_results.loved_one_id
    )
  )
)
WITH CHECK (
  loved_one_id IN (SELECT id FROM loved_ones WHERE user_id = auth.uid())
  OR auth.uid() IN (
    SELECT user_id FROM care_circle_members WHERE circle_id IN (
      SELECT circle_id FROM loved_ones WHERE id = lab_results.loved_one_id
    )
  )
);

CREATE POLICY "Users can delete their own lab results" 
ON public.lab_results FOR DELETE 
USING (
  loved_one_id IN (SELECT id FROM loved_ones WHERE user_id = auth.uid())
  OR auth.uid() IN (
    SELECT user_id FROM care_circle_members WHERE circle_id IN (
      SELECT circle_id FROM loved_ones WHERE id = lab_results.loved_one_id
    )
  )
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
