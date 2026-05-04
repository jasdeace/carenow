import postgres from 'postgres'

const sql = postgres('postgres://postgres:carelink_pwd_2026@wmzochdgnujalmgnvmku.supabase.co:5432/postgres')

async function run() {
  try {
    const res = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'medications' AND column_name = 'dosage_amount';
    `
    console.log("Column Type Info:", res)
  } catch (err) {
    console.error("Error:", err)
  } finally {
    await sql.end()
  }
}

run()
