-- Rename result_date to recorded_at if it exists
DO $$ 
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='lab_results' AND column_name='result_date') THEN
    ALTER TABLE public.lab_results RENAME COLUMN result_date TO recorded_at;
  END IF;
END $$;

-- Rename parsed_values to parsed_data if it exists
DO $$ 
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='lab_results' AND column_name='parsed_values') THEN
    ALTER TABLE public.lab_results RENAME COLUMN parsed_values TO parsed_data;
  END IF;
END $$;

-- Add raw_content if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='lab_results' AND column_name='raw_content') THEN
    ALTER TABLE public.lab_results ADD COLUMN raw_content TEXT;
  END IF;
END $$;

-- Reload schema cache so postgREST picks up the new columns immediately
NOTIFY pgrst, 'reload schema';
