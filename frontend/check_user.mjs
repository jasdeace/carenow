import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('users').select('*').eq('id', 'a52ae262-243a-446f-bd5f-4e02185df017').single()
  console.log("User Profile:", data)
}

run()
