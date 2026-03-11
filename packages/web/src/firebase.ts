import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, TwitterAuthProvider, Auth } from 'firebase/auth';

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

// Initialize Firebase only once
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

export { app, auth };
export default app;
