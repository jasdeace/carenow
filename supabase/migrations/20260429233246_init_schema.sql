-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('loved_one', 'caregiver', 'primary', 'viewer');
CREATE TYPE user_tier AS ENUM ('free', 'premium');
CREATE TYPE medication_form AS ENUM ('tablet', 'capsule', 'liquid', 'injection', 'patch');
CREATE TYPE frequency_type AS ENUM ('daily', 'weekly', 'custom');
CREATE TYPE log_status AS ENUM ('taken', 'missed', 'skipped', 'snoozed');
CREATE TYPE measurement_timing AS ENUM ('fasting', 'pre_meal', 'post_meal', 'bedtime');
CREATE TYPE lab_status AS ENUM ('normal', 'low', 'high', 'critical');
CREATE TYPE activity_intensity AS ENUM ('low', 'moderate', 'high');

-- Users Table
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE,
  phone_kr TEXT,
  name TEXT,
  name_ko TEXT,
  avatar_url TEXT,
  locale TEXT DEFAULT 'ko',
  timezone TEXT DEFAULT 'Asia/Seoul',
  role user_role,
  tier user_tier DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles Table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  blood_type TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  allergies TEXT[],
  conditions TEXT[],
  primary_physician TEXT,
  emergency_contact TEXT,
  notes_ko TEXT,
  notes_en TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Care Circles
CREATE TABLE care_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  name_ko TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Care Circle Members
CREATE TABLE care_circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES care_circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role user_role,
  accepted_at TIMESTAMPTZ,
  invited_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

-- Loved Ones
CREATE TABLE loved_ones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES care_circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  display_name_ko TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medications
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loved_one_id UUID REFERENCES loved_ones(id) ON DELETE CASCADE,
  name_ko TEXT,
  name_en TEXT,
  brand_name TEXT,
  dosage_amount NUMERIC,
  dosage_unit TEXT,
  form medication_form,
  instructions_ko TEXT,
  prescribing_doctor TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medication Schedules
CREATE TABLE medication_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  time_of_day TIME,
  frequency frequency_type,
  days_of_week INTEGER[],
  remind_minutes_before INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medication Logs
CREATE TABLE medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ,
  taken_at TIMESTAMPTZ,
  status log_status,
  skip_reason TEXT,
  photo_url TEXT,
  logged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vitals: Blood Pressure
CREATE TABLE vitals_blood_pressure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loved_one_id UUID REFERENCES loved_ones(id) ON DELETE CASCADE,
  systolic INTEGER,
  diastolic INTEGER,
  pulse INTEGER,
  measurement_method TEXT,
  device_model TEXT,
  notes_ko TEXT,
  measured_at TIMESTAMPTZ,
  logged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vitals: Glucose
CREATE TABLE vitals_glucose (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loved_one_id UUID REFERENCES loved_ones(id) ON DELETE CASCADE,
  value_mmol NUMERIC,
  measurement_timing measurement_timing,
  device_model TEXT,
  measured_at TIMESTAMPTZ,
  logged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab Results (OCR)
CREATE TABLE lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loved_one_id UUID REFERENCES loved_ones(id) ON DELETE CASCADE,
  result_date DATE,
  lab_name TEXT,
  source TEXT,
  raw_image_url TEXT,
  parsed_values JSONB,
  flagged_values JSONB,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Check-ins
CREATE TABLE daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loved_one_id UUID REFERENCES loved_ones(id) ON DELETE CASCADE,
  checkin_date DATE,
  checked_in_at TIMESTAMPTZ,
  mood_score INTEGER,
  mood_note_ko TEXT,
  energy_level INTEGER,
  pain_level INTEGER,
  pain_location_ko TEXT,
  sleep_hours NUMERIC,
  sleep_quality INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up RLS (Row Level Security) - Basic initial setup
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE loved_ones ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
