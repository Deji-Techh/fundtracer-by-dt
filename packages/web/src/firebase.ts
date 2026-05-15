import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  TwitterAuthProvider,
  Auth,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  UserCredential
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import {
  applyActionCode,
  confirmPasswordReset,
  sendPasswordResetEmail
} from 'firebase/auth';

// Try import.meta.env first (works in dev with .env files, or when VITE_ is at build time)
let firebaseConfig: Record<string, string | null> = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseInitError: string | null = null;
let initPromise: Promise<void> | null = null;

// Track which config values are missing (for diagnostics)
function getMissingVars(): string[] {
  const missing: string[] = [];
  if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!firebaseConfig.authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!firebaseConfig.projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  return missing;
}

async function tryInit(): Promise<void> {
  if (auth) return;

  // If import.meta.env values are missing, try fetching from server at runtime
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    try {
      const resp = await fetch('/api/config/firebase');
      if (resp.ok) {
        const serverConfig = await resp.json();
        // Only keep defined import.meta.env values so they don't override server config with undefined
        const definedLocal = Object.fromEntries(
          Object.entries(firebaseConfig).filter(([_, v]) => v != null)
        );
        firebaseConfig = {
          ...serverConfig,
          ...definedLocal,
        };
      }
    } catch {
      // Server might not be reachable yet; will fail downstream
    }
  }

  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    try {
      const config = firebaseConfig as Record<string, string>;
      app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
      auth = getAuth(app);
      db = getFirestore(app);
    } catch (error) {
      firebaseInitError = `[Firebase] Init error: ${error instanceof Error ? error.message : error}`;
      console.error(firebaseInitError);
    }
  } else {
    firebaseInitError = `[Firebase] Config not found - missing: ${getMissingVars().join(', ')}`;
    console.warn(firebaseInitError);
  }
}

// Eager init on module load (best-effort, won't block the page)
tryInit().catch(e => {
  firebaseInitError = `[Firebase] Init failed: ${e}`;
  console.error(firebaseInitError);
});

// Ensure Firebase is initialized before use (lazy init if eager failed)
async function ensureInit(): Promise<void> {
  if (auth) return;
  if (initPromise) return initPromise;
  initPromise = tryInit();
  return initPromise;
}

export function getFirebaseStatus(): { initialized: boolean; error: string | null; missingVars: string[] } {
  return {
    initialized: auth !== null,
    error: firebaseInitError,
    missingVars: getMissingVars(),
  };
}

const googleProvider = new GoogleAuthProvider();
const twitterProvider = new TwitterAuthProvider();

export const signInWithGoogleRedirect = async (): Promise<void> => {
  await ensureInit();
  if (!auth) throw new Error('Firebase not initialized');
  await signInWithRedirect(auth, googleProvider);
};

export const signInWithTwitterRedirect = async (): Promise<void> => {
  await ensureInit();
  if (!auth) throw new Error('Firebase not initialized');
  await signInWithRedirect(auth, twitterProvider);
};

export const getAuthResult = async (): Promise<string | null> => {
  await ensureInit();
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      return result.user.getIdToken();
    }
    return null;
  } catch (error) {
    console.error('[Firebase] Redirect result error:', error);
    return null;
  }
};

export const signInWithGoogle = async (): Promise<string> => {
  await ensureInit();
  if (!auth) throw new Error('Firebase not initialized');
  const result = await signInWithPopup(auth, googleProvider);
  return result.user.getIdToken();
};

export const signInWithTwitter = async (): Promise<string> => {
  await ensureInit();
  if (!auth) throw new Error('Firebase not initialized');
  const result = await signInWithPopup(auth, twitterProvider);
  return result.user.getIdToken();
};

export const signInWithGooglePopup = async () => {
  await ensureInit();
  if (!auth) throw new Error('Firebase not initialized');
  const result = await signInWithPopup(auth, googleProvider);
  return result;
};

export const signInWithTwitterPopup = async () => {
  await ensureInit();
  if (!auth) throw new Error('Firebase not initialized');
  const result = await signInWithPopup(auth, twitterProvider);
  return result;
};

export const signUpWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  await ensureInit();
  if (!auth) throw new Error('Firebase not initialized');
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result;
};

export const signInWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  await ensureInit();
  if (!auth) throw new Error('Firebase not initialized');
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result;
};

export const verifyEmail = async (): Promise<void> => {
  await ensureInit();
  if (!auth?.currentUser) throw new Error('Firebase not initialized');
  await sendEmailVerification(auth.currentUser);
};

export const getFirebaseToken = async (): Promise<string | null> => {
  await ensureInit();
  if (!auth?.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
};

// API Keys Functions (Firestore)
export interface ApiKeyData {
  id: string;
  name: string;
  key: string;
  type: 'live' | 'test';
  createdAt: Date;
  lastUsed: Date | null;
  requests: number;
  active: boolean;
}

export const getApiKeys = async (userId: string): Promise<ApiKeyData[]> => {
  await ensureInit();
  if (!db) throw new Error('Firebase not initialized');
  const keysRef = collection(db, 'users', userId, 'apiKeys');
  const q = query(keysRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    lastUsed: doc.data().lastUsed?.toDate() || null,
  })) as ApiKeyData[];
};

export const createApiKey = async (
  userId: string,
  name: string,
  type: 'live' | 'test'
): Promise<ApiKeyData> => {
  await ensureInit();
  if (!db) throw new Error('Firebase not initialized');

  const keyPrefix = type === 'live' ? 'ft_live' : 'ft_test';
  const randomPart = Math.random().toString(36).substring(2, 30);
  const suffix = Math.random().toString(36).substring(2, 6);
  const fullKey = `${keyPrefix}_${randomPart}_${suffix}`;

  const keysRef = collection(db, 'users', userId, 'apiKeys');
  const docRef = await addDoc(keysRef, {
    name,
    key: fullKey,
    type,
    createdAt: serverTimestamp(),
    lastUsed: null,
    requests: 0,
    active: true,
  });

  return {
    id: docRef.id,
    name,
    key: fullKey,
    type,
    createdAt: new Date(),
    lastUsed: null,
    requests: 0,
    active: true,
  };
};

export const deleteApiKey = async (userId: string, keyId: string): Promise<void> => {
  await ensureInit();
  if (!db) throw new Error('Firebase not initialized');
  const keyRef = doc(db, 'users', userId, 'apiKeys', keyId);
  await deleteDoc(keyRef);
};

export const getCurrentUserId = (): string | null => {
  return auth?.currentUser?.uid || null;
};

// Email Action Handlers
export const handleVerifyEmail = async (oobCode: string): Promise<void> => {
  await ensureInit();
  if (!auth) throw new Error('Firebase not initialized');
  await applyActionCode(auth, oobCode);
};

export const handlePasswordReset = async (oobCode: string, newPassword: string): Promise<void> => {
  await ensureInit();
  if (!auth) throw new Error('Firebase not initialized');
  await confirmPasswordReset(auth, oobCode, newPassword);
};

export const handleRecoverEmail = async (oobCode: string): Promise<void> => {
  await ensureInit();
  if (!auth) throw new Error('Firebase not initialized');
  await applyActionCode(auth, oobCode);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  await ensureInit();
  if (!auth) throw new Error('Firebase not initialized');
  await sendPasswordResetEmail(auth, email);
};

export { app, auth, db };
export default app;
