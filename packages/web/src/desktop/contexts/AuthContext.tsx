import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { getProfile, UserProfile } from '../api/auth';
import { getAuthToken, setAuthToken, removeAuthToken, apiRequest } from '../api/client';
import { isTauri, tauriInvoke } from '../lib/tauri-commands';
import { clearLocalAppSessionState } from '../stores/sessionState';

const logAuthDebug = (message: string, data?: Record<string, unknown>) => {
  console.log(`[DesktopAuth] ${message}`, data || '');
};

interface AuthContextType {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  apiKey: string | null;
  login: (key: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  isAuthenticated: false,
  loading: true,
  apiKey: null,
  login: async () => {},
  loginWithToken: async () => {},
  setApiKey: () => {},
  clearApiKey: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    try { return localStorage.getItem('fdt_api_key'); } catch { return null; }
  });

  const saveKey = useCallback((key: string) => {
    try { localStorage.setItem('fdt_api_key', key); } catch {}
    setApiKeyState(key);
  }, []);

  const clearApiKey = useCallback(() => {
    try { localStorage.removeItem('fdt_api_key'); } catch {}
    setApiKeyState(null);
  }, []);

  const signOut = useCallback(() => {
    const shouldRedirect = !isTauri() && typeof window !== 'undefined';
    const logoutRequest = shouldRedirect
      ? apiRequest('/api/auth/logout', 'POST').catch((err: any) => {
          logAuthDebug('server logout failed', {
            status: err?.status,
            message: err?.message,
          });
        })
      : Promise.resolve();

    if (isTauri()) {
      tauriInvoke('watchtower_stop').catch(() => {});
    }
    clearLocalAppSessionState();
    removeAuthToken();
    clearApiKey();
    setProfile(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      logoutRequest.finally(() => window.location.assign('/'));
    }
  }, [clearApiKey]);

  const login = useCallback(async (key: string) => {
    logAuthDebug('API key login started', { hasKey: !!key });
    saveKey(key);
    setAuthToken('');
    const p = await apiRequest<UserProfile>('/api/user/profile');
    setProfile(p);
    setIsAuthenticated(true);
    logAuthDebug('API key login succeeded', { uid: p.uid, authProvider: p.authProvider });
  }, [saveKey]);

  const loginInFlightRef = useRef(false);

  const loginWithToken = useCallback(async (token: string) => {
    if (loginInFlightRef.current) throw new Error('in-flight');
    loginInFlightRef.current = true;
    try {
      logAuthDebug('token login started', { hasToken: !!token, tauri: isTauri() });
      clearApiKey();
      setAuthToken(token);
      const p = await getProfile();
      setProfile(p);
      setIsAuthenticated(true);
      logAuthDebug('token login succeeded', { uid: p.uid, authProvider: p.authProvider });
      if (isTauri()) {
        tauriInvoke('watchtower_start', { token }).catch((e: any) => {
          console.error('[Watchtower] Failed to start:', e?.message || e);
        });
      }
    } finally {
      loginInFlightRef.current = false;
    }
  }, [clearApiKey]);

  const setApiKey = useCallback((key: string) => {
    saveKey(key);
  }, [saveKey]);

  // Listen for deep link token from Tauri backend
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen<string>('oauth-token', (event) => {
          const token = event.payload;
          if (token) {
            loginWithToken(token).catch((err: Error) => {
              console.error('[oauth-token] loginWithToken failed:', err?.message || err);
            });
          }
        });
      } catch {
        // Not running in Tauri — skip
      }
    };

    setupListener();

    return () => {
      unlisten?.();
    };
  }, [loginWithToken]);

  // On mount, validate existing credentials
  useEffect(() => {
    const init = async () => {
      const urlParams = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
      const authSuccess = urlParams.get('auth') === 'success';
      const authError = urlParams.get('error');
      const key = localStorage.getItem('fdt_api_key');
      const token = getAuthToken();

      logAuthDebug('init started', {
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        authSuccess,
        authError,
        hasApiKey: !!key,
        hasBearerToken: !!token,
        tauri: isTauri(),
      });

      if (authError) {
        logAuthDebug('OAuth callback returned error', { authError });
      }

      if (key) {
        try {
          removeAuthToken();
          const p = await apiRequest<UserProfile>('/api/user/profile');
          setProfile(p);
          setIsAuthenticated(true);
          logAuthDebug('init authenticated with API key', { uid: p.uid, authProvider: p.authProvider });
        } catch (err: any) {
          logAuthDebug('init API key profile failed', {
            status: err?.status,
            message: err?.message,
          });
          setIsAuthenticated(false);
        }
      } else {
        if (token) {
          try {
            const p = await getProfile();
            setProfile(p);
            setIsAuthenticated(true);
            logAuthDebug('init authenticated with bearer token', { uid: p.uid, authProvider: p.authProvider });
            if (isTauri()) {
              tauriInvoke('watchtower_start', { token }).catch((e: any) => {
                console.error('[Watchtower] Failed to start:', e?.message || e);
              });
            }
          } catch (err: any) {
            logAuthDebug('init bearer profile failed', {
              status: err?.status,
              message: err?.message,
            });
            setIsAuthenticated(false);
          }
        } else if (!isTauri()) {
          try {
            const p = await getProfile();
            setProfile(p);
            setIsAuthenticated(true);
            logAuthDebug('init authenticated with session cookie', {
              uid: p.uid,
              authProvider: p.authProvider,
              fromOAuthCallback: authSuccess,
            });
            if (authSuccess && typeof window !== 'undefined') {
              const cleanUrl = `${window.location.pathname}${window.location.hash}`;
              window.history.replaceState({}, '', cleanUrl);
            }
          } catch (err: any) {
            logAuthDebug('init session cookie profile failed', {
              fromOAuthCallback: authSuccess,
              status: err?.status,
              message: err?.message,
            });
            setIsAuthenticated(false);
          }
        }
      }
      logAuthDebug('init completed');
      setLoading(false);
    };
    init();
  }, []);

  return (
    <AuthContext.Provider value={{
      profile,
      isAuthenticated,
      loading,
      apiKey,
      login,
      loginWithToken,
      setApiKey,
      clearApiKey,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { AuthContext };
