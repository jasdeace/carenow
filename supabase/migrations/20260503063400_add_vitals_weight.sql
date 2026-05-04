-- Vitals: Weight
CREATE TABLE vitals_weight (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loved_one_id UUID REFERENCES loved_ones(id) ON DELETE CASCADE,
  weight_kg NUMERIC,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  logged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vitals_weight ENABLE ROW LEVEL SECURITY;
