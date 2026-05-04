-- Add chat_history if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='lab_results' AND column_name='chat_history') THEN
    ALTER TABLE public.lab_results ADD COLUMN chat_history JSONB;
  END IF;
END $$;

-- Reload schema cache so postgREST picks up the new column immediately
NOTIFY pgrst, 'reload schema';
