import { createClient } from '@supabase/supabase-js'

const url = 'https://wmzochdgnujalmgnvmku.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtem9jaGRnbnVqYWxtZ252bWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTc1ODksImV4cCI6MjA5MzI3MzU4OX0.D4T9jlofOM7wqWZ0sf15jvFWom5L3jbACSDUn7MxkT0'

const supabase = createClient(url, key)

async function diagnose() {
  // 1. Check if we can read lab_results at all (no auth, so RLS will block - just checking table exists)
  console.log('=== Step 1: Check lab_results table columns ===')
  const { data: cols, error: colErr } = await supabase.rpc('to_jsonb', {}).maybeSingle()
  
  // Try a simpler approach - just select and see what columns come back
  const { data, error } = await supabase.from('lab_results').select('*').limit(1)
  if (error) {
    console.log('SELECT error:', error.message, error.code)
  } else if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]))
    console.log('chat_history value:', data[0].chat_history)
  } else {
    console.log('No rows returned (could be RLS blocking or empty table)')
  }

  // 2. Check column info via information_schema (won't work without service role, but try)
  console.log('\n=== Step 2: Check if chat_history column exists ===')
  const { data: schemaData, error: schemaErr } = await supabase
    .from('lab_results')
    .select('id, chat_history')
    .limit(1)
  
  if (schemaErr) {
    if (schemaErr.message.includes('chat_history')) {
      console.log('❌ CONFIRMED: chat_history column does NOT exist!')
    } else {
      console.log('Schema check error:', schemaErr.message, schemaErr.code)
    }
  } else {
    console.log('✅ chat_history column exists')
    if (schemaData && schemaData.length > 0) {
      console.log('   Current value:', JSON.stringify(schemaData[0].chat_history))
    }
  }

  // 3. Try to do an update (will fail without auth, but error message will tell us why)
  console.log('\n=== Step 3: Test UPDATE capability ===')
  const { error: updateErr } = await supabase
    .from('lab_results')
    .update({ chat_history: [{ role: 'ai', text: 'test' }] })
    .eq('id', '00000000-0000-0000-0000-000000000000')  // fake ID
  
  if (updateErr) {
    console.log('Update error:', updateErr.message, updateErr.code, updateErr.details)
    if (updateErr.code === '42501') {
      console.log('❌ CONFIRMED: UPDATE RLS policy is MISSING!')
    } else if (updateErr.message.includes('chat_history')) {
      console.log('❌ CONFIRMED: chat_history column does NOT exist!')
    } else {
      console.log('   (This error may just be because we used a fake ID with no auth)')
    }
  } else {
    console.log('✅ UPDATE did not error (policy exists)')
  }
}

diagnose().catch(console.error)
