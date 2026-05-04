import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wmzochdgnujalmgnvmku.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtem9jaGRnbnVqYWxtZ252bWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTc1ODksImV4cCI6MjA5MzI3MzU4OX0.D4T9jlofOM7wqWZ0sf15jvFWom5L3jbACSDUn7MxkT0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('=== STEP 1: Check existing medications ===')
  const { data: existing, error: existError } = await supabase
    .from('medications')
    .select('id, name_ko, dosage_amount, dosage_unit')
    .limit(5)
  console.log('Existing meds:', existing)
  if (existError) console.error('Error reading:', existError)

  // Get a valid loved_one_id and user_id
  const { data: lovedOne } = await supabase.from('loved_ones').select('id').limit(1).single()
  const { data: user } = await supabase.from('users').select('id').limit(1).single()
  console.log('\nLoved One ID:', lovedOne?.id)
  console.log('User ID:', user?.id)

  if (!lovedOne?.id || !user?.id) {
    console.error('Cannot proceed - no loved_one or user found')
    return
  }

  console.log('\n=== STEP 2: Try insert with string "10/60" ===')
  const { data: insertData, error: insertError } = await supabase
    .from('medications')
    .insert({
      loved_one_id: lovedOne.id,
      name_ko: 'Diag Test String',
      dosage_amount: '10/60',
      dosage_unit: 'mg',
      is_active: false,
      created_by: user.id
    })
    .select()

  if (insertError) {
    console.error('INSERT ERROR (string):', JSON.stringify(insertError, null, 2))
  } else {
    console.log('INSERT SUCCESS (string):', insertData)
    // Cleanup
    if (insertData?.[0]?.id) {
      await supabase.from('medications').delete().eq('id', insertData[0].id)
      console.log('Cleaned up test row')
    }
  }

  console.log('\n=== STEP 3: Try insert with numeric 10 ===')
  const { data: insertData2, error: insertError2 } = await supabase
    .from('medications')
    .insert({
      loved_one_id: lovedOne.id,
      name_ko: 'Diag Test Numeric',
      dosage_amount: 10,
      dosage_unit: 'mg',
      is_active: false,
      created_by: user.id
    })
    .select()

  if (insertError2) {
    console.error('INSERT ERROR (numeric):', JSON.stringify(insertError2, null, 2))
  } else {
    console.log('INSERT SUCCESS (numeric):', insertData2)
    if (insertData2?.[0]?.id) {
      await supabase.from('medications').delete().eq('id', insertData2[0].id)
      console.log('Cleaned up test row')
    }
  }

  console.log('\n=== STEP 4: Try insert with NaN ===')
  const dosageNaN = Number('10/60')
  console.log('Number("10/60") =', dosageNaN, 'isNaN:', isNaN(dosageNaN))
  const { data: insertData3, error: insertError3 } = await supabase
    .from('medications')
    .insert({
      loved_one_id: lovedOne.id,
      name_ko: 'Diag Test NaN',
      dosage_amount: dosageNaN,
      dosage_unit: 'mg',
      is_active: false,
      created_by: user.id
    })
    .select()

  if (insertError3) {
    console.error('INSERT ERROR (NaN):', JSON.stringify(insertError3, null, 2))
  } else {
    console.log('INSERT SUCCESS (NaN):', insertData3)
    if (insertData3?.[0]?.id) {
      await supabase.from('medications').delete().eq('id', insertData3[0].id)
    }
  }

  console.log('\n=== STEP 5: Try insert with null dosage ===')
  const { data: insertData4, error: insertError4 } = await supabase
    .from('medications')
    .insert({
      loved_one_id: lovedOne.id,
      name_ko: 'Diag Test Null',
      dosage_amount: null,
      dosage_unit: 'mg',
      is_active: false,
      created_by: user.id
    })
    .select()

  if (insertError4) {
    console.error('INSERT ERROR (null):', JSON.stringify(insertError4, null, 2))
  } else {
    console.log('INSERT SUCCESS (null):', insertData4)
    if (insertData4?.[0]?.id) {
      await supabase.from('medications').delete().eq('id', insertData4[0].id)
    }
  }
}

run().catch(console.error)
