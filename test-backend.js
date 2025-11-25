/**
 * Test script to verify backend connectivity and brand creation
 * Run with: node test-backend.js
 */

const axios = require('axios');

const BACKEND_URL = 'https://octopus-app-73pgz.ondigitalocean.app';

async function testBackend() {
  console.log('\n🧪 Testing Backend Connectivity...\n');
  console.log('Backend URL:', BACKEND_URL);
  console.log('─'.repeat(60));

  // Test 1: Health Check
  console.log('\n1️⃣ Testing health endpoint...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`);
    console.log('✅ Health check passed:', response.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    return; // Stop if backend is not reachable
  }

  // Test 2: Brands List (without auth - should fail gracefully)
  console.log('\n2️⃣ Testing brands list endpoint...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/brands`);
    console.log('✅ Brands endpoint accessible');
    console.log('   Returned', response.data.length, 'brands');
  } catch (error) {
    console.error('❌ Brands endpoint failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }

  // Test 3: CORS Headers
  console.log('\n3️⃣ Checking CORS headers...');
  try {
    const response = await axios.options(`${BACKEND_URL}/api/brands`, {
      headers: {
        'Origin': 'https://prism-five-livid.vercel.app',
        'Access-Control-Request-Method': 'POST'
      }
    });
    console.log('✅ CORS preflight successful');
    console.log('   Access-Control-Allow-Origin:', response.headers['access-control-allow-origin']);
    console.log('   Access-Control-Allow-Methods:', response.headers['access-control-allow-methods']);
  } catch (error) {
    console.error('⚠️ CORS check inconclusive:', error.message);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('\n📝 Summary:');
  console.log('If health check passed, your backend is running correctly.');
  console.log('Next steps:');
  console.log('1. Update SUPABASE_SERVICE_KEY in DigitalOcean environment variables');
  console.log('2. Update VITE_API_BASE_URL in Vercel environment variables');
  console.log('3. Redeploy both backend and frontend');
  console.log('4. Test brand creation in the app\n');
}

testBackend().catch(error => {
  console.error('\n💥 Unexpected error:', error.message);
  process.exit(1);
});
