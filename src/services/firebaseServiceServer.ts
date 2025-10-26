// Server-side Firebase Service using Firebase Admin
import * as admin from 'firebase-admin';

/**
 * Initialize Firebase Admin for OUR app's Firestore
 * Uses service account credentials from environment variable or falls back to minimal config
 */
function getOurFirestoreAdmin() {
  const appName = 'our-app-firestore';
  
  try {
    return admin.app(appName);
  } catch {
    console.log('[Firestore Server] Initializing Firebase Admin for our app');
    
    // Require service account key from environment
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.error('[Firestore Server] FIREBASE_SERVICE_ACCOUNT_KEY not found in environment variables');
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required but not set');
    }
    
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      console.log('[Firestore Server] Successfully parsed service account for project:', serviceAccount.project_id);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      }, appName);
    } catch (error) {
      console.error('[Firestore Server] Failed to parse or initialize Firebase Admin:', error);
      throw new Error(`Failed to initialize Firebase Admin: ${(error as Error).message}`);
    }
  }
}

/**
 * Get Firestore instance for our app
 */
export function getOurFirestore() {
  const app = getOurFirestoreAdmin();
  return app.firestore();
}

export interface APIEndpoint {
  id: string;
  userId: string;
  name: string;
  path: string;
  method: string;
  tableName: string;
  connectionId: string;
  authRequired: boolean;
  filters: any[];
  rateLimit: number;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface DatabaseConnection {
  id: string;
  userId: string;
  name: string;
  type: string;
  host?: string;
  port?: string;
  databaseName?: string;
  username?: string;
  encryptedPassword?: string;
  projectId?: string;
  apiKey?: string;
  authDomain?: string;
  serviceAccountKey?: string;
  [key: string]: any;
}

/**
 * Get endpoint by path and method (server-side)
 * Uses CLIENT SDK to read from our own Firestore
 */
export async function getEndpointByPath(
  path: string,
  method: string,
  userId?: string
): Promise<APIEndpoint | null> {
  try {
    console.log('[Firestore Server] Looking for endpoint:', { path, method, userId });
    
    const app = getOurFirestoreAdmin();
    const db = admin.firestore(app);
    
    // Build query using Firebase Admin SDK
    let query = db.collection('api_endpoints')
      .where('path', '==', path)
      .where('method', '==', method)
      .where('isActive', '==', true);

    if (userId) {
      console.log('[Firestore Server] Filtering by userId:', userId);
      query = query.where('userId', '==', userId) as any;
    }

    const snapshot = await query.limit(1).get();
    
    console.log('[Firestore Server] Query returned', snapshot.size, 'results');

    if (snapshot.empty) {
      console.log('[Firestore Server] No endpoint found - trying without userId filter...');
      // Debug: try without userId
      const debugQuery = db.collection('api_endpoints')
        .where('path', '==', path)
        .where('method', '==', method)
        .limit(5);
      const debugSnapshot = await debugQuery.get();
      console.log('[Firestore Server] Without userId filter:', debugSnapshot.size, 'results');
      if (!debugSnapshot.empty) {
        debugSnapshot.docs.forEach((doc: any) => {
          console.log('[Firestore Server] Found endpoint with userId:', doc.data().userId);
        });
      }
      return null;
    }

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    console.log('[Firestore Server] Found endpoint:', { id: docSnap.id, userId: data.userId, path: data.path });
    
    return {
      id: docSnap.id,
      ...data
    } as APIEndpoint;
  } catch (error) {
    console.error('[Firestore Server] Error getting endpoint:', error);
    return null;
  }
}

/**
 * Get database connection by ID (server-side)
 * Uses Firebase Admin SDK to read from our own Firestore
 */
export async function getConnectionById(connectionId: string): Promise<DatabaseConnection | null> {
  try {
    const app = getOurFirestoreAdmin();
    const db = admin.firestore(app);
    
    const docRef = db.collection('database_connections').doc(connectionId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data()
    } as DatabaseConnection;
  } catch (error) {
    console.error('[Firestore Server] Error getting connection:', error);
    return null;
  }
}
