const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wmzochdgnujalmgnvmku.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtem9jaGRnbnVqYWxtZ252bWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTc1ODksImV4cCI6MjA5MzI3MzU4OX0.D4T9jlofOM7wqWZ0sf15jvFWom5L3jbACSDUn7MxkT0'
);

async function checkDB() {
  console.log('--- checking users ---');
  const { data: users, error: err1 } = await supabase.from('users').select('id, name_ko, role');
  console.log(users, err1);

  console.log('\n--- checking loved_ones ---');
  const { data: lovedOnes, error: err2 } = await supabase.from('loved_ones').select('*');
  console.log(lovedOnes, err2);

  console.log('\n--- checking care_circle_members ---');
  const { data: members, error: err3 } = await supabase.from('care_circle_members').select('*');
  console.log(members, err3);

  console.log('\n--- testing getCareCircleViewers API query ---');
  if (lovedOnes && lovedOnes.length > 0) {
    const testCircleId = lovedOnes[0].circle_id;
    console.log('Using circleId:', testCircleId);
    
    // First syntax
    const { data: apiData1, error: apiErr1 } = await supabase
      .from('care_circle_members')
      .select('id, user_id, role, users(id, name_ko)')
      .eq('circle_id', testCircleId);
    console.log('API Query users(...):', JSON.stringify(apiData1, null, 2), apiErr1);
  }
}

checkDB();
