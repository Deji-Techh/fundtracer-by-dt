/**
 * Firebase Client Authentication Module
 * Handles Email/Password authentication with email verification.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    applyActionCode,
    checkActionCode,
    signOut,
    onAuthStateChanged,
    User,
    Auth,
    ActionCodeSettings
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

if (isConfigValid) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        console.log('[Firebase] Initialized successfully');
        console.log('[Firebase] Auth instance:', !!auth);
    } catch (err) {
        console.error('[Firebase] Initialization failed:', err);
    }
} else {
    console.error('[Firebase] Config invalid! Missing:', {
        apiKey: !firebaseConfig.apiKey,
        projectId: !firebaseConfig.projectId
    });
}

// Create user with email and password, then send verification
export async function registerWithEmail(email: string, password: string): Promise<User | null> {
    console.log('[Firebase] Registering with email...');
    
    if (!auth) {
        console.error('[Firebase] Auth not initialized');
        throw new Error('Firebase not initialized');
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('[Firebase] User created:', userCredential.user?.uid);
        
        // Immediately send verification email
        if (userCredential.user) {
            const actionCodeSettings = {
                url: `${window.location.origin}/verify-email?mode=verifyEmail`,
                handleCodeInApp: true
            };
            await sendEmailVerification(userCredential.user, actionCodeSettings);
            console.log('[Firebase] Verification email sent');
        }
        
        return userCredential.user;
    } catch (error: any) {
        console.error('[Firebase] Registration error:', {
            code: error.code,
            message: error.message
        });
        
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('Email already registered');
        } else if (error.code === 'auth/invalid-email') {
            throw new Error('Invalid email address');
        } else if (error.code === 'auth/weak-password') {
            throw new Error('Password is too weak');
        }
        
        throw error;
    }
}

// Sign in with email and password
export async function signInWithEmail(email: string, password: string): Promise<User | null> {
    console.log('[Firebase] Signing in with email...');
    
    if (!auth) {
        console.error('[Firebase] Auth not initialized');
        throw new Error('Firebase not initialized');
    }
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('[Firebase] Sign-in successful:', userCredential.user?.email);
        return userCredential.user;
    } catch (error: any) {
        console.error('[Firebase] Sign-in error:', {
            code: error.code,
            message: error.message
        });
        
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            throw new Error('Invalid email or password');
        } else if (error.code === 'auth/invalid-email') {
            throw new Error('Invalid email address');
        } else if (error.code === 'auth/user-disabled') {
            throw new Error('Account disabled');
        }
        
        throw error;
    }
}

// Send email verification
export async function sendVerificationEmail(user: User): Promise<void> {
    console.log('[Firebase] Sending verification email...');
    
    if (!auth) {
        throw new Error('Firebase not initialized');
    }
    
    try {
        const actionCodeSettings: ActionCodeSettings = {
            url: `${window.location.origin}/verify-email?mode=verifyEmail`,
            handleCodeInApp: true
        };
        
        await sendEmailVerification(user, actionCodeSettings);
        console.log('[Firebase] Verification email sent');
    } catch (error: any) {
        console.error('[Firebase] Failed to send verification email:', error);
        throw new Error('Failed to send verification email');
    }
}

// Verify email with action code
export async function verifyEmail(actionCode: string): Promise<string | null> {
    console.log('[Firebase] Verifying email...');
    
    if (!auth) {
        throw new Error('Firebase not initialized');
    }
    
    try {
        // Check the action code first
        const info = await checkActionCode(auth, actionCode);
        console.log('[Firebase] Action code info:', info);
        
        // Apply the verification
        await applyActionCode(auth, actionCode);
        console.log('[Firebase] Email verified successfully');
        
        // Reload user to get updated emailVerified status
        if (auth.currentUser) {
            await auth.currentUser.reload();
            return auth.currentUser.email;
        }
        
        return null;
    } catch (error: any) {
        console.error('[Firebase] Email verification error:', {
            code: error.code,
            message: error.message
        });
        
        if (error.code === 'auth/invalid-action-code') {
            throw new Error('Invalid or expired verification link');
        }
        
        throw error;
    }
}

// Send password reset email
export async function sendPasswordReset(email: string): Promise<void> {
    console.log('[Firebase] Sending password reset email...');
    
    if (!auth) {
        throw new Error('Firebase not initialized');
    }
    
    try {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        const actionCodeSettings: ActionCodeSettings = {
            url: `${window.location.origin}/login`,
            handleCodeInApp: false
        };
        
        await sendPasswordResetEmail(auth, email, actionCodeSettings);
        console.log('[Firebase] Password reset email sent');
    } catch (error: any) {
        console.error('[Firebase] Password reset error:', error);
        // Don't reveal if email exists
    }
}

// Sign out
export async function logOut(): Promise<void> {
    if (!auth) return;
    try {
        await signOut(auth);
        console.log('[Firebase] Signed out');
    } catch (error) {
        console.error('Sign-out error:', error);
        throw error;
    }
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

// Check if email is verified
export function isEmailVerified(): boolean {
    return auth?.currentUser?.emailVerified || false;
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
