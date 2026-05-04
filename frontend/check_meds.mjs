import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('medications').select('*').order('created_at', { ascending: false }).limit(5)
  console.log("Recent medications:")
  console.dir(data, { depth: null })
  if (error) console.error("Error fetching medications:", error)
}

run()
