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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app: FirebaseApp | undefined;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('[Firebase] Init error:', error);
  }
} else {
  console.warn('[Firebase] Config not found - OAuth login will not work');
}

const googleProvider = new GoogleAuthProvider();
const twitterProvider = new TwitterAuthProvider();

export const signInWithGoogleRedirect = async (): Promise<void> => {
  if (!auth) throw new Error('Firebase not initialized');
  await signInWithRedirect(auth, googleProvider);
};

export const signInWithTwitterRedirect = async (): Promise<void> => {
  if (!auth) throw new Error('Firebase not initialized');
  await signInWithRedirect(auth, twitterProvider);
};

export const getAuthResult = async (): Promise<string | null> => {
  if (!auth) throw new Error('Firebase not initialized');
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
  if (!auth) throw new Error('Firebase not initialized');
  const result = await signInWithPopup(auth, googleProvider);
  return result.user.getIdToken();
};

export const signInWithTwitter = async (): Promise<string> => {
  if (!auth) throw new Error('Firebase not initialized');
  const result = await signInWithPopup(auth, twitterProvider);
  return result.user.getIdToken();
};

export const signInWithGooglePopup = async () => {
  if (!auth) throw new Error('Firebase not initialized');
  const result = await signInWithPopup(auth, googleProvider);
  return result;
};

export const signInWithTwitterPopup = async () => {
  if (!auth) throw new Error('Firebase not initialized');
  const result = await signInWithPopup(auth, twitterProvider);
  return result;
};

export const signUpWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  if (!auth) throw new Error('Firebase not initialized');
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result;
};

export const signInWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  if (!auth) throw new Error('Firebase not initialized');
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result;
};

export const verifyEmail = async (): Promise<void> => {
  if (!auth?.currentUser) throw new Error('Firebase not initialized');
  await sendEmailVerification(auth.currentUser);
};

export const getFirebaseToken = async (): Promise<string | null> => {
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
}

export const getApiKeys = async (userId: string): Promise<ApiKeyData[]> => {
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
  });
  
  return {
    id: docRef.id,
    name,
    key: fullKey,
    type,
    createdAt: new Date(),
    lastUsed: null,
    requests: 0,
  };
};

export const deleteApiKey = async (userId: string, keyId: string): Promise<void> => {
  if (!db) throw new Error('Firebase not initialized');
  const keyRef = doc(db, 'users', userId, 'apiKeys', keyId);
  await deleteDoc(keyRef);
};

export const getCurrentUserId = (): string | null => {
  return auth?.currentUser?.uid || null;
};

// Email Action Handlers
export const handleVerifyEmail = async (oobCode: string): Promise<void> => {
  if (!auth) throw new Error('Firebase not initialized');
  await applyActionCode(auth, oobCode);
};

export const handlePasswordReset = async (oobCode: string, newPassword: string): Promise<void> => {
  if (!auth) throw new Error('Firebase not initialized');
  await confirmPasswordReset(auth, oobCode, newPassword);
};

export const handleRecoverEmail = async (oobCode: string): Promise<void> => {
  if (!auth) throw new Error('Firebase not initialized');
  await applyActionCode(auth, oobCode);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  if (!auth) throw new Error('Firebase not initialized');
  await sendPasswordResetEmail(auth, email);
};

export { app, auth, db };
export default app;
