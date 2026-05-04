import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .gte('created_at', tenMinsAgo)
  
  console.log("Meds created in the last 10 minutes:", data?.length)
  if (data && data.length > 0) {
    console.dir(data, { depth: null })
  }
  if (error) console.error("Error:", error)
}

run()
