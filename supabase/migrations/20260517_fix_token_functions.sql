-- ============================================
-- Fix token functions to bypass RLS on token_transactions
-- The functions need SECURITY DEFINER to insert into token_transactions
-- Run in Supabase SQL Editor
-- ============================================

-- Fix deduct_token: add SECURITY DEFINER
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix add_tokens: add SECURITY DEFINER
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
