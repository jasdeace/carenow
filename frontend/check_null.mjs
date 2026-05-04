import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('medications').select('*').is('loved_one_id', null)
  console.log("Meds with null loved_one_id:")
  console.dir(data, { depth: null })
  if (error) console.error("Error:", error)
}

run()
