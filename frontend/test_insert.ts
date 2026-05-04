import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: 'c:/carenow/carelink/frontend/.env.local' })
dotenv.config({ path: 'c:/carenow/carelink/frontend/.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
  console.log("URL:", supabaseUrl)
  
  // get a loved_one_id
  const { data: lovedOne, error: lErr } = await supabase.from('loved_ones').select('id').limit(1).single()
  if (lErr || !lovedOne) {
    console.log("No loved one to test with:", lErr)
    return
  }

  // get a user_id
  const { data: user, error: uErr } = await supabase.from('users').select('id').limit(1).single()

  console.log("Attempting insert with dosage_amount = '10/60'")
  const { error } = await supabase
    .from('medications')
    .insert({
      loved_one_id: lovedOne.id,
      name_ko: 'Test Med',
      dosage_amount: '10/60',
      dosage_unit: 'mg',
      is_active: true,
      created_by: user.id
    })

  if (error) {
    console.error("INSERT ERROR:", error)
  } else {
    console.log("INSERT SUCCESS!")
  }
}

testInsert()
