require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('Testing Supabase Connection...\n');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('SUPABASE_URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT FOUND');
console.log('SUPABASE_ANON_KEY:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT FOUND');

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ Supabase credentials not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\nTesting connection...');
    // Test by trying to get current session (should work even if not logged in)
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('\n❌ Connection failed:', error.message);
      return;
    }
    
    console.log('\n✅ Connection successful!');
    console.log('Session data:', data);
    
    // Test signup
    console.log('\n\nTesting signup...');
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'test123456';
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (signupError) {
      console.log('❌ Signup failed:', signupError.message);
    } else {
      console.log('✅ Signup successful!');
      console.log('User ID:', signupData.user?.id);
      console.log('Email:', signupData.user?.email);
    }
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
  }
}

testConnection();
