import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminFirestore: Firestore | null = null;

function initializeAdminApp() {
  if (adminApp) return adminApp;
  
  if (!getApps().length) {
    // Check if service account key is available
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.warn('Firebase Admin credentials not found. Admin SDK not initialized.');
      return null;
    }

    try {
      // Parse the service account JSON
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
      return null;
    }
  } else {
    adminApp = getApps()[0];
  }
  
  return adminApp;
}

function getAdminDb(): Firestore {
  if (adminFirestore) return adminFirestore;
  
  const app = initializeAdminApp();
  if (!app) {
    throw new Error('Firebase Admin not initialized. Missing credentials.');
  }
  
  adminFirestore = getFirestore(app);
  return adminFirestore;
}

// Export getter function instead of direct instance
export const adminDb = new Proxy({} as Firestore, {
  get(target, prop) {
    const db = getAdminDb();
    return db[prop as keyof Firestore];
  }
});
