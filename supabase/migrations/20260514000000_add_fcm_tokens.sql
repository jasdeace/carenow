-- Add fcm_token to users table to store push notification tokens
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
