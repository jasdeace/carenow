import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: insertData, error: insertError } = await supabase.from('medications').insert({
    loved_one_id: 'f0850ff2-5128-48ca-8eb8-3c77ed425af3',
    name_ko: 'Exact Test',
    dosage_amount: '10/60',
    dosage_unit: 'mg',
    is_active: true,
    created_by: 'a52ae262-243a-446f-bd5f-4e02185df017'
  }).select()

  console.log("Insert Error:", insertError)
  console.log("Insert Data:", insertData)
}

run()
