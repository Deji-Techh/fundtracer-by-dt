/**
 * Firebase Client Authentication Module
 * Handles Google Sign-in and user session management.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    GithubAuthProvider,
    signOut,
    onAuthStateChanged,
    User,
    Auth
} from 'firebase/auth';

// Build Firebase config from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

// Validate config before initialization
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isConfigValid) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        googleProvider = new GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: 'select_account' });
    } catch (err) {
        console.error('Firebase initialization failed:', err);
    }
} else {
    console.warn('Firebase config missing. Set VITE_FIREBASE_* environment variables.');
}

// Sign in with Google
export async function signInWithGoogle(): Promise<User | null> {
    if (!auth || !googleProvider) {
        console.error('Firebase not initialized');
        return null;
    }
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error: any) {
        console.error('Sign-in error:', error);
        throw error;
    }
}

// Sign in with GitHub
export async function signInWithGithub(): Promise<User | null> {
    if (!auth) {
        console.error('Firebase not initialized');
        return null;
    }
    try {
        const githubProvider = new GithubAuthProvider();
        const result = await signInWithPopup(auth, githubProvider);
        return result.user;
    } catch (error: any) {
        console.error('GitHub Sign-in error:', error);
        throw error;
    }
}

// Sign out
export async function logOut(): Promise<void> {
    if (!auth) return;
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Sign-out error:', error);
        throw error;
    }
}

// Alias for consistency
export async function signOutFromGoogle(): Promise<void> {
    return logOut();
}

// Get current user
export function getCurrentUser(): User | null {
    return auth?.currentUser || null;
}

// Get ID token for API requests
export async function getIdToken(): Promise<string | null> {
    const user = auth?.currentUser;
    if (!user) return null;

    try {
        return await user.getIdToken();
    } catch (error) {
        console.error('Token error:', error);
        return null;
    }
}

// Subscribe to auth state changes
export function onAuthChange(callback: (user: User | null) => void): () => void {
    if (!auth) {
        console.warn('Firebase auth not available');
        return () => { };
    }
    return onAuthStateChanged(auth, callback);
}

export { auth };
