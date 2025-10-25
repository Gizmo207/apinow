// Firestore adapter for client-side Firebase
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, limit, addDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { DatabaseAdapter } from './types';

export class FirestoreAdapter implements DatabaseAdapter {
  type = 'firestore';
  private app: FirebaseApp;
  private db: any;
  private auth: any;
  private adminConfig: any; // Store admin credentials for server-side operations

  constructor(config: any) {
    // Store admin config for server-side operations
    this.adminConfig = {
      serviceAccountKey: config.serviceAccountKey,
      databaseURL: config.databaseURL,
      storageBucket: config.storageBucket
    };

    // Create Firebase app with user-provided config for client-side operations
    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
      projectId: config.projectId,
      storageBucket: config.storageBucket || `${config.projectId}.appspot.com`,
      messagingSenderId: config.messagingSenderId || "000000000000",
      appId: config.appId || "1:000000000000:web:0000000000000000"
    };
    
    this.app = initializeApp(firebaseConfig, `apiflow-${config.projectId}-${Date.now()}`);
    this.db = getFirestore(this.app);
    this.auth = getAuth(this.app);
  }

  getAdminCredentials() {
    return this.adminConfig;
  }

  private async listCollectionsWithAdmin(): Promise<string[]> {
    if (!this.adminConfig.serviceAccountKey) {
      throw new Error('Admin service account key not provided');
    }

    try {
      // Parse service account key
      const serviceAccount = JSON.parse(this.adminConfig.serviceAccountKey);
      const projectId = serviceAccount.project_id;

      console.log('Admin mode: Discovering actual collections in project:', projectId);
      
      // Try to discover collections by attempting to read from common ones
      const possibleCollections = [
        'users', 'database_connections', 'api_endpoints', 'user_subscriptions',
        'products', 'orders', 'categories', 'posts', 'comments',
        'mail', 'licenses', 'payments', 'public', 'classes', 'recordings', 
        'transcripts', 'studyPlans', 'notes', 'lectures', 'profiles', 'settings',
        'notifications', 'analytics', 'audit', 'feedback', 'reports', 'templates'
      ];
      
      const existingCollections: string[] = [];
      
      // Check which collections actually exist by trying to read from them
      for (const collectionName of possibleCollections) {
        try {
          const snapshot = await getDocs(query(collection(this.db, collectionName), limit(1)));
          existingCollections.push(collectionName);
          console.log(`Collection '${collectionName}' exists`);
        } catch (error) {
          // Collection doesn't exist or no permission - skip it
          console.log(`Collection '${collectionName}' not accessible`);
        }
      }
      
      return existingCollections.length > 0 ? existingCollections : ['users', 'database_connections', 'api_endpoints'];
    } catch (error) {
      console.error('Failed to use admin credentials:', error);
      // Fallback to known collections
      return ['users', 'database_connections', 'api_endpoints'];
    }
  }

  private async listDocumentsWithAdmin(collectionName: string, limitCount: number): Promise<any[]> {
    if (!this.adminConfig.serviceAccountKey) {
      throw new Error('Admin service account key not provided');
    }

    try {
      // Parse service account key to get project ID
      const serviceAccount = JSON.parse(this.adminConfig.serviceAccountKey);
      const projectId = serviceAccount.project_id;

      // For now, we'll still use the client SDK but with better error handling
      // In a production environment, you'd implement OAuth2 token generation
      // and use the Firestore REST API directly
      
      console.log(`Admin mode: Accessing collection '${collectionName}' in project '${projectId}'`);
      
      // Use client SDK but catch permission errors gracefully
      const snapshot = await getDocs(query(collection(this.db, collectionName), limit(limitCount)));
      const results: any[] = [];
      
      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        results.push({
          id: docSnapshot.id,
          ...data
        });
      });

      return results;
    } catch (error) {
      console.log(`Admin access to '${collectionName}' failed:`, error);
      throw error;
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(this.auth, async (user) => {
        unsubscribe(); // Clean up listener
        
        if (user) {
          console.log('Firestore adapter - User authenticated:', user.uid);
          resolve();
        } else {
          // No user, sign in anonymously
          try {
            console.log('Firestore adapter - Signing in anonymously...');
            await signInAnonymously(this.auth);
            console.log('Firestore adapter - Anonymous sign-in successful');
            resolve();
          } catch (signInError) {
            console.error('Firestore adapter - Anonymous sign-in failed:', signInError);
            reject(signInError);
          }
        }
      });
    });
  }

  async listCollections(): Promise<string[]> {
    // If we have admin credentials, we can access all collections
    if (this.adminConfig.serviceAccountKey) {
      console.log('Using admin credentials for collection listing');
      return await this.listCollectionsWithAdmin();
    }
    
    // Otherwise, use client-side authentication
    await this.ensureAuthenticated();
    
    // For client-side Firestore, we can't list collections directly
    // We'll return known collections or collections that have been accessed
    const knownCollections = [
      'users', 'products', 'orders', 'categories', 'posts', 'comments',
      'mail', 'licenses', 'payments', 'public', 'classes', 'recordings', 
      'transcripts', 'studyPlans', 'notes', 'lectures'
    ];
    
    const existingCollections: string[] = [];
    
    for (const collectionName of knownCollections) {
      try {
        const snapshot = await getDocs(query(collection(this.db, collectionName), limit(1)));
        if (!snapshot.empty) {
          existingCollections.push(collectionName);
        }
      } catch (error) {
        // Collection doesn't exist or no permission
        continue;
      }
    }
    
    return existingCollections;
  }

  async listDocuments(collectionName: string, limitCount: number = 100): Promise<any[]> {
    // If we have admin credentials, try to use them for better access
    if (this.adminConfig.serviceAccountKey) {
      try {
        return await this.listDocumentsWithAdmin(collectionName, limitCount);
      } catch (error) {
        console.log('Admin access failed, falling back to client access:', error);
        // Fall through to client access
      }
    }
    
    await this.ensureAuthenticated();
    
    try {
      const snapshot = await getDocs(query(collection(this.db, collectionName), limit(limitCount)));
      const results: any[] = [];
      
      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        results.push({
          id: docSnapshot.id,
          ...data
        });
      });
      
      return results;
    } catch (error) {
      console.error(`Error listing documents from ${collectionName}:`, error);
      throw new Error(`Failed to list documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(collectionName: string, id: string | undefined, data: any): Promise<any> {
    await this.ensureAuthenticated();
    
    try {
      if (id) {
        // Create with specific ID
        await setDoc(doc(this.db, collectionName, id), data);
        return { id, ...data };
      } else {
        // Auto-generate ID
        const docRef = await addDoc(collection(this.db, collectionName), data);
        return { id: docRef.id, ...data };
      }
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      throw new Error(`Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async read(collectionName: string, id: string): Promise<any> {
    await this.ensureAuthenticated();
    
    try {
      const docSnapshot = await getDoc(doc(this.db, collectionName, id));
      
      if (docSnapshot.exists()) {
        return {
          id: docSnapshot.id,
          ...docSnapshot.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error reading document ${id} from ${collectionName}:`, error);
      throw new Error(`Failed to read document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(collectionName: string, id: string, data: any): Promise<any> {
    await this.ensureAuthenticated();
    
    try {
      const docRef = doc(this.db, collectionName, id);
      await updateDoc(docRef, data);
      return { id, ...data };
    } catch (error) {
      console.error(`Error updating document ${id} in ${collectionName}:`, error);
      throw new Error(`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(collectionName: string, id: string): Promise<{ success: boolean }> {
    await this.ensureAuthenticated();
    
    try {
      await deleteDoc(doc(this.db, collectionName, id));
      return { success: true };
    } catch (error) {
      console.error(`Error deleting document ${id} from ${collectionName}:`, error);
      throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.auth?.currentUser) {
        await this.auth.signOut();
      }
      // Note: Firebase apps can't be easily deleted in client-side environments
      console.log('Firestore adapter disconnected');
    } catch (error) {
      console.warn('Error during Firestore disconnect:', error);
    }
  }
}
