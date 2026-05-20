-- Track the MFDS canonical item identifier on a medication so we can show
-- 의약품안전나라 details only for meds the user explicitly picked from the
-- official drug search, instead of best-guess fuzzy matches against the name.
ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS mfds_item_seq TEXT;

NOTIFY pgrst, 'reload schema';
