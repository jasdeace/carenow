import postgres from 'postgres'

const sql = postgres('postgres://postgres:carelink_pwd_2026@wmzochdgnujalmgnvmku.supabase.co:5432/postgres')

async function run() {
  try {
    await sql`COMMENT ON TABLE medications IS 'Medications table (Updated 2026-05-03)'`
    await sql`NOTIFY pgrst, 'reload schema'`
    console.log("Forced schema reload successfully.")
  } catch (err) {
    console.error("Error:", err)
  } finally {
    await sql.end()
  }
}

run()
