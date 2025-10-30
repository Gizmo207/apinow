import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminFirestore: Firestore | null = null;

function initializeAdminApp() {
  if (adminApp) return adminApp;
  
  if (!getApps().length) {
    // Only initialize if credentials are available
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      console.warn('Firebase Admin credentials not found. Admin SDK not initialized.');
      return null;
    }

    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
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
