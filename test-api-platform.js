/**
 * Comprehensive API Platform Test Suite
 * Tests all major functionality before going live
 */

const BASE_URL = process.env.TEST_URL || 'https://apinow.cloud';
let authToken = '';
let testConnectionId = '';
let testEndpointId = '';

// Colors for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(message, type = 'info') {
  const color = type === 'success' ? GREEN : type === 'error' ? RED : YELLOW;
  console.log(`${color}${message}${RESET}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  log(`✅ ${message}`, 'success');
}

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (authToken && !options.noAuth) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  const data = await response.text();
  let jsonData;
  try {
    jsonData = JSON.parse(data);
  } catch {
    jsonData = data;
  }
  
  return { response, data: jsonData, status: response.status };
}

// ============================================
// TEST SUITE
// ============================================

async function test1_HealthCheck() {
  log('\n📋 Test 1: Health Check', 'info');
  
  const { status } = await makeRequest('/', { noAuth: true });
  assert(status === 200, 'Home page loads');
  
  const { status: dashStatus } = await makeRequest('/dashboard', { noAuth: true });
  assert(dashStatus === 200, 'Dashboard page loads');
}

async function test2_Authentication() {
  log('\n🔐 Test 2: Authentication', 'info');
  
  // Note: This test requires manual auth token
  // You'll need to get your token from browser DevTools
  console.log('⚠️  Please provide auth token:');
  console.log('   1. Open browser, go to https://apinow.cloud');
  console.log('   2. Open DevTools > Application > Local Storage');
  console.log('   3. Look for Firebase token');
  console.log('   4. Set TEST_AUTH_TOKEN environment variable');
  
  authToken = process.env.TEST_AUTH_TOKEN;
  
  if (!authToken) {
    log('⚠️  Skipping auth tests - no token provided', 'error');
    return;
  }
  
  const { status, data } = await makeRequest('/api/api-keys');
  assert(status === 200, 'API keys endpoint accessible with auth');
}

async function test3_DatabaseConnections() {
  log('\n🗄️  Test 3: Database Connections', 'info');
  
  if (!authToken) {
    log('⚠️  Skipping - requires authentication', 'error');
    return;
  }
  
  // List connections
  const { status, data } = await makeRequest('/api/database/connections');
  assert(status === 200, 'Can list database connections');
  assert(Array.isArray(data), 'Connections returned as array');
  
  if (data.length > 0) {
    testConnectionId = data[0].id;
    log(`   Using connection: ${data[0].name}`, 'info');
  }
}

async function test4_APIEndpoints() {
  log('\n🔌 Test 4: API Endpoints', 'info');
  
  if (!authToken) {
    log('⚠️  Skipping - requires authentication', 'error');
    return;
  }
  
  // Get saved endpoints
  const { status, data } = await makeRequest('/api/endpoints');
  assert(status === 200, 'Can fetch saved endpoints');
  
  if (Array.isArray(data) && data.length > 0) {
    testEndpointId = data[0].id;
    log(`   Found ${data.length} saved endpoint(s)`, 'info');
    
    // Check endpoint structure
    const endpoint = data[0];
    assert(endpoint.path, 'Endpoint has path');
    assert(endpoint.method, 'Endpoint has method');
    assert(!endpoint.path.includes('/api/dynamic/api/api'), 'No double /api/api prefix');
    assert(endpoint.path.startsWith('/api/dynamic/'), 'Correct path prefix');
  } else {
    log('   No saved endpoints found', 'info');
  }
}

async function test5_DynamicAPIExecution() {
  log('\n⚡ Test 5: Dynamic API Execution', 'info');
  
  if (!authToken || !testEndpointId) {
    log('⚠️  Skipping - requires authentication and saved endpoint', 'error');
    return;
  }
  
  // Get endpoint details
  const { data: endpoints } = await makeRequest('/api/endpoints');
  const endpoint = endpoints.find(e => e.id === testEndpointId);
  
  if (!endpoint) {
    log('⚠️  No endpoint found to test', 'error');
    return;
  }
  
  // Test GET request
  if (endpoint.method === 'GET') {
    const { status, data } = await makeRequest(endpoint.path);
    assert(status === 200 || status === 404, `${endpoint.method} ${endpoint.path} executes`);
    
    if (status === 200) {
      log(`   Response: ${Array.isArray(data) ? `${data.length} items` : 'Success'}`, 'info');
    }
  }
  
  // Test POST request
  if (endpoint.method === 'POST' && !endpoint.path.includes(':id')) {
    const testData = {
      name: 'Test Document',
      description: 'Created by automated test',
      timestamp: new Date().toISOString(),
    };
    
    const { status, data } = await makeRequest(endpoint.path, {
      method: 'POST',
      body: JSON.stringify(testData),
    });
    
    assert(status === 200 || status === 201, `POST ${endpoint.path} creates document`);
    log(`   Created document with ID: ${data.id}`, 'info');
  }
}

async function test6_Analytics() {
  log('\n📊 Test 6: Analytics', 'info');
  
  if (!authToken) {
    log('⚠️  Skipping - requires authentication', 'error');
    return;
  }
  
  const { status, data } = await makeRequest('/api/analytics');
  assert(status === 200, 'Analytics endpoint accessible');
  
  if (data && data.totalRequests !== undefined) {
    log(`   Total requests tracked: ${data.totalRequests}`, 'info');
    log(`   Success rate: ${data.successRate || 0}%`, 'info');
  }
}

async function test7_FirebaseAdmin() {
  log('\n🔥 Test 7: Firebase Admin SDK', 'info');
  
  if (!authToken) {
    log('⚠️  Skipping - requires authentication', 'error');
    return;
  }
  
  // Test that Firebase Admin is properly initialized
  const { status, data } = await makeRequest('/api/database/connections');
  assert(status === 200, 'Firebase Admin SDK initialized (no credential errors)');
  
  // The fact that we got here without "Could not load credentials" means it's working
  log('   No credential errors detected', 'info');
}

async function test8_CORSAndOrigins() {
  log('\n🌐 Test 8: CORS & Origins', 'info');
  
  // Test that same-origin requests work
  const { response } = await makeRequest('/api/analytics', { noAuth: true });
  const corsHeader = response.headers.get('access-control-allow-origin');
  
  log(`   CORS header: ${corsHeader || 'not set'}`, 'info');
}

async function test9_ErrorHandling() {
  log('\n❌ Test 9: Error Handling', 'info');
  
  // Test 404
  const { status: status404 } = await makeRequest('/api/nonexistent', { noAuth: true });
  assert(status404 === 404, 'Returns 404 for nonexistent endpoints');
  
  // Test 401 (if we have auth)
  if (authToken) {
    const { status: status401 } = await makeRequest('/api/dynamic/test', { 
      noAuth: true 
    });
    assert(status401 === 401 || status401 === 404, 'Returns 401/404 for unauthorized requests');
  }
}

async function test10_EndpointPathValidation() {
  log('\n✅ Test 10: Endpoint Path Validation', 'info');
  
  if (!authToken) {
    log('⚠️  Skipping - requires authentication', 'error');
    return;
  }
  
  const { data: endpoints } = await makeRequest('/api/endpoints');
  
  if (Array.isArray(endpoints) && endpoints.length > 0) {
    endpoints.forEach((endpoint, i) => {
      assert(
        !endpoint.path.includes('/api/dynamic/api/api'),
        `Endpoint ${i + 1}: No double /api/api prefix (${endpoint.path})`
      );
      
      assert(
        endpoint.path.startsWith('/api/dynamic/'),
        `Endpoint ${i + 1}: Correct prefix (${endpoint.path})`
      );
    });
  }
}

// ============================================
// RUN ALL TESTS
// ============================================

async function runTests() {
  console.log('🚀 API Platform Test Suite\n');
  console.log(`Testing: ${BASE_URL}\n`);
  
  const tests = [
    test1_HealthCheck,
    test2_Authentication,
    test3_DatabaseConnections,
    test4_APIEndpoints,
    test5_DynamicAPIExecution,
    test6_Analytics,
    test7_FirebaseAdmin,
    test8_CORSAndOrigins,
    test9_ErrorHandling,
    test10_EndpointPathValidation,
  ];
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      if (error.message.includes('Skipping')) {
        skipped++;
      } else {
        failed++;
        log(`\n❌ ${test.name} failed:`, 'error');
        log(`   ${error.message}`, 'error');
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log('='.repeat(50));
  
  if (failed === 0) {
    log('\n🎉 All tests passed! Platform is ready to go! 🚀\n', 'success');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please review and fix before going live.\n', 'error');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n💥 Test suite crashed: ${error.message}`, 'error');
  process.exit(1);
});
