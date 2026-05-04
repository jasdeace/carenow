import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://wmzochdgnujalmgnvmku.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtem9jaGRnbnVqYWxtZ252bWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTc1ODksImV4cCI6MjA5MzI3MzU4OX0.D4T9jlofOM7wqWZ0sf15jvFWom5L3jbACSDUn7MxkT0'
)

async function run() {
  // Test delete on a non-existent row - if policy is missing, we get 42501
  const { error: bpErr } = await supabase
    .from('vitals_blood_pressure')
    .delete()
    .eq('id', '00000000-0000-0000-0000-000000000000')

  console.log('BP delete test:', bpErr ? `${bpErr.code} - ${bpErr.message}` : 'OK (policy exists)')

  const { error: gErr } = await supabase
    .from('vitals_glucose')
    .delete()
    .eq('id', '00000000-0000-0000-0000-000000000000')

  console.log('Glucose delete test:', gErr ? `${gErr.code} - ${gErr.message}` : 'OK (policy exists)')

  const { error: wErr } = await supabase
    .from('vitals_weight')
    .delete()
    .eq('id', '00000000-0000-0000-0000-000000000000')

  console.log('Weight delete test:', wErr ? `${wErr.code} - ${wErr.message}` : 'OK (policy exists)')
}

run()
