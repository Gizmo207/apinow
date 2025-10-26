// Check what endpoints exist in Firebase
const admin = require('firebase-admin');

// Initialize with your service account
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkEndpoints() {
  console.log('🔍 Checking api_endpoints collection...\n');
  
  const snapshot = await db.collection('api_endpoints').get();
  
  if (snapshot.empty) {
    console.log('❌ No endpoints found in Firebase\n');
    return;
  }

  console.log(`📊 Found ${snapshot.size} endpoint(s):\n`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`  Path: ${data.path}`);
    console.log(`  Method: ${data.method}`);
    console.log(`  Active: ${data.isActive}`);
    console.log(`  User: ${data.userId}`);
    console.log(`  Connection: ${data.connectionId}`);
    console.log('');
  });
  
  process.exit(0);
}

checkEndpoints().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
