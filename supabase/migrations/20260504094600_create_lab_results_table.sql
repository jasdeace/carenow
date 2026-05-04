CREATE TABLE IF NOT EXISTS public.lab_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loved_one_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    raw_content TEXT,
    parsed_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lab results" 
ON public.lab_results FOR SELECT 
USING (auth.uid() = loved_one_id OR auth.uid() IN (
  SELECT user_id FROM care_circle_members WHERE circle_id IN (
    SELECT circle_id FROM loved_ones WHERE user_id = public.lab_results.loved_one_id
  )
));

CREATE POLICY "Users can insert their own lab results" 
ON public.lab_results FOR INSERT 
WITH CHECK (auth.uid() = loved_one_id OR auth.uid() IN (
  SELECT user_id FROM care_circle_members WHERE circle_id IN (
    SELECT circle_id FROM loved_ones WHERE user_id = public.lab_results.loved_one_id
  )
));

CREATE POLICY "Users can delete their own lab results" 
ON public.lab_results FOR DELETE 
USING (auth.uid() = loved_one_id);
