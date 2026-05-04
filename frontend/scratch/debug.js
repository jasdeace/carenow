import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  console.log('--- USERS ---')
  const { data: users } = await supabase.from('users').select('id, name_ko, phone_kr, role')
  console.log(users)

  console.log('\n--- LOVED ONES ---')
  const { data: lovedOnes } = await supabase.from('loved_ones').select('*')
  console.log(lovedOnes)

  console.log('\n--- CARE CIRCLES ---')
  const { data: careCircles } = await supabase.from('care_circles').select('*')
  console.log(careCircles)
}

debug()
