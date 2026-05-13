import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wmzochdgnujalmgnvmku.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtem9jaGRnbnVqYWxtZ252bWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTc1ODksImV4cCI6MjA5MzI3MzU4OX0.D4T9jlofOM7wqWZ0sf15jvFWom5L3jbACSDUn7MxkT0'
);

async function testExactAPI() {
  console.log('Testing exact API query...');
  const testCircleId = '86f77e1f-6053-4d66-8c38-cc60ecfb852f';
  const { data, error } = await supabase
      .from('care_circle_members')
      .select(`
        id, 
        user_id, 
        role, 
        users:user_id (
          id, 
          name_ko, 
          email, 
          phone_kr
        )
      `)
      .eq('circle_id', testCircleId)

  console.log('Result:', JSON.stringify({data, error}, null, 2));
}
testExactAPI();
