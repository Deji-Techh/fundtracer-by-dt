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

// Debug: Log config (without sensitive data)
console.log('[Firebase] Config check:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasAuthDomain: !!firebaseConfig.authDomain,
    hasProjectId: !!firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    apiKeyLength: firebaseConfig.apiKey?.length
});

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
        googleProvider.setCustomParameters({ 
            prompt: 'select_account',
            access_type: 'online'
        });
        console.log('[Firebase] Initialized successfully');
        console.log('[Firebase] Auth instance:', !!auth);
        console.log('[Firebase] Provider instance:', !!googleProvider);
    } catch (err) {
        console.error('[Firebase] Initialization failed:', err);
    }
} else {
    console.error('[Firebase] Config invalid! Missing:', {
        apiKey: !firebaseConfig.apiKey,
        projectId: !firebaseConfig.projectId
    });
}

// Sign in with Google
export async function signInWithGoogle(): Promise<User | null> {
    console.log('[Firebase] Attempting Google sign-in...');
    
    if (!auth || !googleProvider) {
        console.error('[Firebase] Auth or provider not initialized:', {
            hasAuth: !!auth,
            hasProvider: !!googleProvider,
            isConfigValid
        });
        throw new Error('Firebase not initialized - check console for details');
    }
    
    // Check for popup blockers
    const testPopup = window.open('', '_blank', 'width=1,height=1');
    if (!testPopup || testPopup.closed || typeof testPopup.closed === 'undefined') {
        console.error('[Firebase] Popup appears to be blocked by browser');
        throw new Error('Popup blocked by browser. Please allow popups for this site.');
    }
    testPopup.close();
    console.log('[Firebase] Popups appear to be allowed');
    
    try {
        console.log('[Firebase] Opening popup...');
        console.log('[Firebase] Current domain:', window.location.origin);
        console.log('[Firebase] Current URL:', window.location.href);
        
        const result = await signInWithPopup(auth, googleProvider);
        console.log('[Firebase] Sign-in successful:', result.user?.email);
        return result.user;
    } catch (error: any) {
        // Log detailed error info
        console.error('[Firebase] Sign-in failed:', {
            code: error.code,
            message: error.message,
            customData: error.customData,
            fullError: error
        });
        
        // Specific error handling with user-friendly messages
        if (error.code === 'auth/popup-blocked') {
            throw new Error('Popup blocked by browser. Please allow popups for this site.');
        } else if (error.code === 'auth/popup-closed-by-user') {
            throw new Error('Sign-in cancelled. You closed the popup.');
        } else if (error.code === 'auth/cancelled-popup-request') {
            throw new Error('Multiple popups opened. Please try again.');
        } else if (error.code === 'auth/invalid-client-id') {
            throw new Error('Invalid OAuth client ID. Check Google Cloud Console settings.');
        } else if (error.code === 'auth/unauthorized-domain') {
            throw new Error('Domain not authorized. Add ' + window.location.host + ' to Firebase authorized domains.');
        } else if (error.message?.includes('COOP')) {
            throw new Error('Cross-Origin-Opener-Policy error. Check server headers.');
        } else if (error.code === 'auth/network-request-failed') {
            throw new Error('Network error. Check your internet connection.');
        }
        
        // Re-throw with full details for debugging
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
