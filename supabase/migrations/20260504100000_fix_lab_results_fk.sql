DROP POLICY IF EXISTS "Users can view their own lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Users can insert their own lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Users can delete their own lab results" ON public.lab_results;

ALTER TABLE public.lab_results DROP CONSTRAINT IF EXISTS lab_results_loved_one_id_fkey;
ALTER TABLE public.lab_results ADD CONSTRAINT lab_results_loved_one_id_fkey FOREIGN KEY (loved_one_id) REFERENCES public.loved_ones(id) ON DELETE CASCADE;

CREATE POLICY "Users can view their own lab results" 
ON public.lab_results FOR SELECT 
USING (
  auth.uid() IN (SELECT user_id FROM loved_ones WHERE id = lab_results.loved_one_id)
  OR auth.uid() IN (
    SELECT user_id FROM care_circle_members WHERE circle_id IN (
      SELECT circle_id FROM loved_ones WHERE id = lab_results.loved_one_id
    )
  )
);

CREATE POLICY "Users can insert their own lab results" 
ON public.lab_results FOR INSERT 
WITH CHECK (
  auth.uid() IN (SELECT user_id FROM loved_ones WHERE id = lab_results.loved_one_id)
  OR auth.uid() IN (
    SELECT user_id FROM care_circle_members WHERE circle_id IN (
      SELECT circle_id FROM loved_ones WHERE id = lab_results.loved_one_id
    )
  )
);

CREATE POLICY "Users can delete their own lab results" 
ON public.lab_results FOR DELETE 
USING (
  auth.uid() IN (SELECT user_id FROM loved_ones WHERE id = lab_results.loved_one_id)
  OR auth.uid() IN (
    SELECT user_id FROM care_circle_members WHERE circle_id IN (
      SELECT circle_id FROM loved_ones WHERE id = lab_results.loved_one_id
    )
  )
);
