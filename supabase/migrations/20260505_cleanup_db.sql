-- =====================================================
-- FULL DATABASE CLEANUP + ANTI-DUPLICATE PROTECTION
-- Run this ONCE in Supabase SQL Editor
-- =====================================================

-- ======= STEP 1: Delete duplicate loved_ones =======
-- KEEP one per user (the oldest with the most meds)

-- User 7d1dd2e5 (jasdeace1 / 테스터) — keep 40404b19 (circle 86f77e1f, has 9 meds)
DELETE FROM loved_ones WHERE id IN (
  '234fecb3-7359-4ea5-b525-6bbbb8a97f16',  -- dupe, circle e6e1b62e
  'c91f9b6d-bec7-4101-be60-e46bd62e1310'   -- dupe, circle 2fa64908
);

-- User abb56305 (장원석) — keep b8f28ef2 (circle ab65d12b, has 4 meds)
DELETE FROM loved_ones WHERE id IN (
  'de9af30a-0322-4c14-8127-927199cf83b2',  -- dupe, circle aba4e755
  '1de53c64-5f9e-4bff-b2d1-f66cf8efd98f'   -- dupe, circle df40581d
);

-- User 4ff42095 (Hj / 01047230223) — keep 7c2fff69 (circle 2a98be87)
DELETE FROM loved_ones WHERE id IN (
  'd312f73a-77de-4ace-a580-e4ac701224f9',  -- dupe, circle 762b217e
  'ad3fbf31-d17c-475e-8a65-5dcd481a342d'   -- dupe, circle b09003a3
);


-- ======= STEP 2: Clean orphan care_circle_members =======
DELETE FROM care_circle_members WHERE circle_id IN (
  'e6e1b62e-fc18-449f-a49a-427644b8f94b',
  '2fa64908-9b89-4ab3-9851-d78614bc840d',
  'aba4e755-b081-4420-bc55-1ae7a5ce0c66',
  'df40581d-2fc9-46ac-b534-842dbd47c759',
  '762b217e-14c2-4364-9cf6-88256b1b5edc',
  'b09003a3-4601-4043-910d-0ef60340615d'
);

-- ======= STEP 3: Delete orphan care_circles =======
DELETE FROM care_circles WHERE id IN (
  'e6e1b62e-fc18-449f-a49a-427644b8f94b',
  '2fa64908-9b89-4ab3-9851-d78614bc840d',
  'aba4e755-b081-4420-bc55-1ae7a5ce0c66',
  'df40581d-2fc9-46ac-b534-842dbd47c759',
  '762b217e-14c2-4364-9cf6-88256b1b5edc',
  'b09003a3-4601-4043-910d-0ef60340615d'
);

-- ======= STEP 4: Fix care_circle_members =======
-- 4ff42095 (Hj) was connected to circle 86f77e1f as caregiver — 
-- but their own circle is now 2a98be87. Update that member entry.
-- Also ensure each kept user has a loved_one member entry in their own circle.

-- Add missing member entries for users who own a circle
INSERT INTO care_circle_members (circle_id, user_id, role)
SELECT lo.circle_id, lo.user_id, 'loved_one'
FROM loved_ones lo
WHERE NOT EXISTS (
  SELECT 1 FROM care_circle_members ccm 
  WHERE ccm.circle_id = lo.circle_id AND ccm.user_id = lo.user_id
);

-- ======= STEP 5: Delete test/junk users =======
-- b585c13f (01011112222, null role) and 06076682 (01099998888, null role)
-- and f984dab6 (01099999999, never used) 
DELETE FROM care_circle_members WHERE user_id IN (
  'b585c13f-4275-4d07-bee9-3028ab8c4146',
  '06076682-973f-472c-bf3a-30ec69abcf74'
);
DELETE FROM loved_ones WHERE user_id IN (
  'b585c13f-4275-4d07-bee9-3028ab8c4146',
  '06076682-973f-472c-bf3a-30ec69abcf74'
);
DELETE FROM users WHERE id IN (
  'b585c13f-4275-4d07-bee9-3028ab8c4146',
  '06076682-973f-472c-bf3a-30ec69abcf74'
);
-- Note: f984dab6 and 08ce15e4 (test@gmail.com) may also be junk 
-- but leaving them for you to decide.

-- ======= STEP 6: UNIQUE constraint — prevent duplicates forever =======
ALTER TABLE public.loved_ones 
  DROP CONSTRAINT IF EXISTS loved_ones_user_id_key;
ALTER TABLE public.loved_ones 
  ADD CONSTRAINT loved_ones_user_id_key UNIQUE (user_id);

-- ======= STEP 7: Update the user trigger to save phone on signup =======
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone_kr)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone_kr'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======= STEP 8: Reload schema =======
NOTIFY pgrst, 'reload schema';
