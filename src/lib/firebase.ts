// Firebase configuration
// This file provides Firebase configuration management
// Firebase apps are created dynamically only when needed with valid credentials

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';

// Only initialize Firebase if we have actual environment variables
const hasFirebaseConfig = !!(
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID && 
  import.meta.env.VITE_FIREBASE_APP_ID &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'your-api-key' &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID !== 'your-project-id'
);

// Firebase config - only used when we have real credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Only initialize if we have real Firebase credentials
let defaultApp: FirebaseApp | undefined;
if (hasFirebaseConfig && getApps().length === 0) {
  try {
    defaultApp = initializeApp(firebaseConfig, 'default-app');
    console.log('Firebase initialized with project:', firebaseConfig.projectId);
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
  }
}

export { defaultApp };
export default firebaseConfig;
