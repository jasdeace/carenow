-- Change dosage_amount from NUMERIC to TEXT to allow dual sizes like 10/60
ALTER TABLE medications ALTER COLUMN dosage_amount TYPE TEXT USING dosage_amount::TEXT;
