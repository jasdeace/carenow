-- Force PostgREST schema cache reload by performing a no-op DDL change
COMMENT ON TABLE medications IS 'Medications table (Updated 2026-05-03)';
NOTIFY pgrst, 'reload schema';
