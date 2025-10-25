/**
 * Test script to generate analytics data
 * Run with: node test-analytics.js YOUR_FIREBASE_ID_TOKEN
 */

const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error('❌ Error: Please provide your Firebase ID token');
  console.log('Usage: node test-analytics.js YOUR_FIREBASE_ID_TOKEN');
  console.log('\nTo get your token:');
  console.log('1. Open browser console on localhost:3000');
  console.log('2. Run: await firebase.auth().currentUser.getIdToken()');
  console.log('3. Copy the token and run this script');
  process.exit(1);
}

const API_URL = 'http://localhost:3000/api/dynamic/api/users';

async function makeRequest(num) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    const responseTime = Date.now() - startTime;
    const status = response.status;
    const statusEmoji = status === 200 ? '✅' : '❌';
    
    console.log(`${statusEmoji} Request ${num}/100 - Status: ${status} - Time: ${responseTime}ms`);
    
    return { success: status === 200, responseTime };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ Request ${num}/100 - Error: ${error.message} - Time: ${responseTime}ms`);
    return { success: false, responseTime };
  }
}

async function runTest() {
  console.log('🚀 Starting analytics test...\n');
  console.log(`📊 Making 100 requests to ${API_URL}\n`);
  
  const results = [];
  const batchSize = 5; // Make 5 requests at a time
  
  for (let i = 0; i < 100; i += batchSize) {
    const batch = [];
    for (let j = 0; j < batchSize && (i + j) < 100; j++) {
      batch.push(makeRequest(i + j + 1));
    }
    
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n✅ Test complete!\n');
  console.log('📊 Results:');
  console.log(`   Total Requests: ${results.length}`);
  console.log(`   Successful: ${results.filter(r => r.success).length}`);
  console.log(`   Failed: ${results.filter(r => !r.success).length}`);
  console.log(`   Avg Response Time: ${Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length)}ms`);
  console.log('\n🎉 Check your Analytics page to see the data!');
}

runTest();
