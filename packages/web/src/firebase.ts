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

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
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

export { app, auth };
export default app;
