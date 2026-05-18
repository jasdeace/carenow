-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cron job to call the edge function every 5 minutes
-- NOTE: You must replace YOUR_ANON_KEY and YOUR_PROJECT_REF with your actual Supabase credentials
-- Or configure pg_net to use the service role key if needed.
SELECT cron.schedule(
  'check-medication-reminders-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/check-medication-reminders',
      headers:='{"Content-Type": "application/json"}'::jsonb
  )
  $$
);
