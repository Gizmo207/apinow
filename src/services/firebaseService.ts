// Firebase Service - Replaces Supabase Service
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebaseConfig';

export interface DatabaseConnection {
  id: string;
  userId: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'firebase';
  host?: string;
  port?: string;
  databaseName?: string;
  username?: string;
  encryptedPassword?: string;
  projectId?: string;
  apiKey?: string;
  authDomain?: string;
  serviceAccountKey?: string;
  adminApiKey?: string;
  adminAuthDomain?: string;
  databaseURL?: string;
  storageBucket?: string;
  status: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

export interface APIEndpoint {
  id: string;
  userId: string;
  connectionId: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  tableName: string;
  filters: any[];
  authRequired: boolean;
  rateLimit: number;
  isActive: boolean;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

export class FirebaseService {
  private static instance: FirebaseService;

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  // Database Connections
  async saveConnection(connection: any): Promise<DatabaseConnection> {
    const userId = this.getCurrentUserId();

    const docRef = await addDoc(collection(db, 'database_connections'), {
      userId,
      name: connection.name,
      type: connection.type,
      host: connection.host,
      port: connection.port,
      databaseName: connection.database,
      username: connection.username,
      encryptedPassword: connection.password,
      projectId: connection.projectId,
      apiKey: connection.apiKey,
      authDomain: connection.authDomain,
      serviceAccountKey: connection.serviceAccountKey,
      adminApiKey: connection.adminApiKey,
      adminAuthDomain: connection.adminAuthDomain,
      databaseURL: connection.databaseURL,
      storageBucket: connection.storageBucket,
      status: 'connected',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const snapshot = await getDoc(docRef);
    return { id: snapshot.id, ...snapshot.data() } as DatabaseConnection;
  }

  async getConnections(): Promise<DatabaseConnection[]> {
    const userId = this.getCurrentUserId();

    const q = query(
      collection(db, 'database_connections'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DatabaseConnection[];
  }

  async updateConnection(id: string, updates: Partial<DatabaseConnection>): Promise<DatabaseConnection> {
    const docRef = doc(db, 'database_connections', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    const snapshot = await getDoc(docRef);
    return { id: snapshot.id, ...snapshot.data() } as DatabaseConnection;
  }

  async deleteConnection(id: string): Promise<void> {
    await deleteDoc(doc(db, 'database_connections', id));
  }

  // API Endpoints
  async saveEndpoint(endpoint: Omit<APIEndpoint, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<APIEndpoint> {
    const userId = this.getCurrentUserId();

    const docRef = await addDoc(collection(db, 'api_endpoints'), {
      userId,
      ...endpoint,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const snapshot = await getDoc(docRef);
    return { id: snapshot.id, ...snapshot.data() } as APIEndpoint;
  }

  async getEndpoints(): Promise<APIEndpoint[]> {
    const userId = this.getCurrentUserId();

    const q = query(
      collection(db, 'api_endpoints'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as APIEndpoint[];
  }

  async updateEndpoint(id: string, updates: Partial<APIEndpoint>): Promise<APIEndpoint> {
    const docRef = doc(db, 'api_endpoints', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    const snapshot = await getDoc(docRef);
    return { id: snapshot.id, ...snapshot.data() } as APIEndpoint;
  }

  async deleteEndpoint(id: string): Promise<void> {
    await deleteDoc(doc(db, 'api_endpoints', id));
  }

  // Analytics
  async recordApiUsage(endpointId: string, responseTime: number, isError: boolean = false): Promise<void> {
    const userId = this.getCurrentUserId();
    const today = new Date().toISOString().split('T')[0];

    const usageQuery = query(
      collection(db, 'api_usage'),
      where('endpointId', '==', endpointId),
      where('date', '==', today)
    );

    const querySnapshot = await getDocs(usageQuery);

    if (!querySnapshot.empty) {
      const existing = querySnapshot.docs[0];
      const data = existing.data();
      await updateDoc(doc(db, 'api_usage', existing.id), {
        requestsCount: data.requestsCount + 1,
        responseTimeAvg: (data.responseTimeAvg * data.requestsCount + responseTime) / (data.requestsCount + 1),
        errorsCount: data.errorsCount + (isError ? 1 : 0),
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'api_usage'), {
        endpointId,
        userId,
        requestsCount: 1,
        responseTimeAvg: responseTime,
        errorsCount: isError ? 1 : 0,
        date: today,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  }

  async getApiUsage(days: number = 30): Promise<any[]> {
    const userId = this.getCurrentUserId();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const q = query(
      collection(db, 'api_usage'),
      where('userId', '==', userId),
      where('date', '>=', cutoffDate),
      orderBy('date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  // User Subscription
  async getUserSubscription(): Promise<any> {
    const userId = this.getCurrentUserId();

    const docRef = doc(db, 'subscriptions', userId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
    return null;
  }

  async createUserSubscription(): Promise<any> {
    const userId = this.getCurrentUserId();

    const subscription = {
      userId,
      planType: 'free',
      requestsLimit: 1000,
      requestsUsed: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await addDoc(collection(db, 'subscriptions'), subscription);
    return subscription;
  }
}
