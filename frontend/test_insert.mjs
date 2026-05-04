import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: lovedOne } = await supabase.from('loved_ones').select('id').limit(1).single()
  const { data: user } = await supabase.from('users').select('id').limit(1).single()
  
  const { data: insertData, error: insertError } = await supabase.from('medications').insert({
    loved_one_id: lovedOne?.id,
    name_ko: 'Test Med NaN',
    dosage_amount: NaN,
    dosage_unit: 'mg',
    is_active: false,
    created_by: user?.id
  }).select()

  console.log("Insert Error:", insertError)
  console.log("Insert Data:", insertData)
}

run()
