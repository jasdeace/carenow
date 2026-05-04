const url = 'https://wmzochdgnujalmgnvmku.supabase.co/rest/v1'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtem9jaGRnbnVqYWxtZ252bWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTc1ODksImV4cCI6MjA5MzI3MzU4OX0.D4T9jlofOM7wqWZ0sf15jvFWom5L3jbACSDUn7MxkT0'

async function check() {
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
  
  console.log('--- USERS ---')
  const res1 = await fetch(`${url}/users?select=id,name_ko,phone_kr,role`, { headers })
  console.log(await res1.json())

  console.log('\n--- LOVED ONES ---')
  const res2 = await fetch(`${url}/loved_ones?select=*`, { headers })
  console.log(await res2.json())
}

check()
