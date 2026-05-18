-- =============================================
-- CareNow Premium Token System
-- =============================================

-- 1. Add token_balance to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance integer DEFAULT 5;
-- New users get 5 free tokens as signup bonus

-- 2. Token transaction log
CREATE TABLE IF NOT EXISTS token_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_tx_user ON token_transactions(user_id, created_at DESC);

-- 3. Atomic token deduction function (prevents negative balance)
CREATE OR REPLACE FUNCTION deduct_token(p_user_id uuid, p_amount integer, p_reason text, p_metadata jsonb DEFAULT '{}')
RETURNS integer AS $$
DECLARE
  new_balance integer;
BEGIN
  UPDATE users 
  SET token_balance = token_balance - p_amount 
  WHERE id = p_user_id AND token_balance >= p_amount
  RETURNING token_balance INTO new_balance;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient token balance';
  END IF;
  
  INSERT INTO token_transactions (user_id, amount, reason, metadata)
  VALUES (p_user_id, -p_amount, p_reason, p_metadata);
  
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- 4. Add tokens function (for admin top-up)
CREATE OR REPLACE FUNCTION add_tokens(p_user_id uuid, p_amount integer, p_reason text, p_metadata jsonb DEFAULT '{}')
RETURNS integer AS $$
DECLARE
  new_balance integer;
BEGIN
  UPDATE users 
  SET token_balance = token_balance + p_amount 
  WHERE id = p_user_id
  RETURNING token_balance INTO new_balance;
  
  INSERT INTO token_transactions (user_id, amount, reason, metadata)
  VALUES (p_user_id, p_amount, p_reason, p_metadata);
  
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own token transactions" ON token_transactions
  FOR SELECT USING (auth.uid() = user_id);
