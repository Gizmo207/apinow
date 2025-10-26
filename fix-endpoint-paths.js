// Fix endpoint paths in Firestore
const admin = require('firebase-admin');

// Initialize with your service account
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixEndpointPaths() {
  console.log('🔍 Finding endpoints with wrong paths...');
  
  const snapshot = await db.collection('api_endpoints').get();
  
  if (snapshot.empty) {
    console.log('❌ No endpoints found');
    return;
  }

  console.log(`📊 Found ${snapshot.size} endpoints`);
  
  let fixed = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const oldPath = data.path;
    
    // Fix double /api/api to single /api
    if (oldPath && oldPath.includes('/api/dynamic/api/')) {
      const newPath = oldPath.replace('/api/dynamic/api/', '/api/dynamic/');
      
      await doc.ref.update({ path: newPath });
      
      console.log(`✅ Fixed: ${oldPath} → ${newPath}`);
      fixed++;
    }
  }
  
  console.log(`\n🎉 Fixed ${fixed} endpoints!`);
  process.exit(0);
}

fixEndpointPaths().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
