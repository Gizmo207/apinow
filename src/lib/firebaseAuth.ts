import { getAuth, signInAnonymously, onAuthStateChanged, User, Auth } from 'firebase/auth';
import { defaultApp } from './firebase';

class FirebaseAuthService {
  private static instance: FirebaseAuthService;
  private auth: Auth | null = null;
  private currentUser: User | null = null;
  private authPromise: Promise<User> | null = null;

  private constructor() {
    if (defaultApp) {
      this.auth = getAuth(defaultApp);
      this.setupAuthListener();
    }
  }

  static getInstance(): FirebaseAuthService {
    if (!FirebaseAuthService.instance) {
      FirebaseAuthService.instance = new FirebaseAuthService();
    }
    return FirebaseAuthService.instance;
  }

  private setupAuthListener() {
    if (!this.auth) return;
    
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      if (user) {
        console.log('Firebase user authenticated:', user.uid, user.isAnonymous ? '(anonymous)' : '(signed in)');
      } else {
        console.log('Firebase user signed out');
      }
    });
  }

  /**
   * Ensures a user is signed in (anonymously if needed) before making Firestore calls.
   * This fixes the 400 Bad Request errors from unauthenticated Listen channels.
   */
  async ensureAuthenticated(): Promise<User> {
    if (!this.auth) {
      console.warn('Firebase Auth not initialized - Firebase config may be missing');
      throw new Error('Firebase Auth not initialized - check your Firebase config. Please set VITE_FIREBASE_* environment variables.');
    }

    // If already have a user, return immediately
    if (this.currentUser) {
      return this.currentUser;
    }

    // If sign-in is already in progress, wait for it
    if (this.authPromise) {
      return this.authPromise;
    }

    // Start anonymous sign-in
    this.authPromise = this.performAnonymousSignIn();
    
    try {
      const user = await this.authPromise;
      this.authPromise = null;
      return user;
    } catch (error) {
      this.authPromise = null;
      throw error;
    }
  }

  private async performAnonymousSignIn(): Promise<User> {
    if (!this.auth) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      console.log('Signing in anonymously to Firebase...');
      const userCredential = await signInAnonymously(this.auth);
      console.log('Anonymous sign-in successful:', userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error('Anonymous sign-in failed:', error);
      throw new Error(`Firebase anonymous sign-in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }
}

export default FirebaseAuthService;
