import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { getProfile, UserProfile } from '../api/auth';
import { getAuthToken, setAuthToken, removeAuthToken, apiRequest } from '../api/client';
import { isTauri, tauriInvoke } from '../lib/tauri-commands';

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
    if (isTauri()) {
      tauriInvoke('watchtower_stop').catch(() => {});
    }
    removeAuthToken();
    clearApiKey();
    setProfile(null);
    setIsAuthenticated(false);
  }, [clearApiKey]);

  const login = useCallback(async (key: string) => {
    saveKey(key);
    setAuthToken('');
    const p = await apiRequest<UserProfile>('/api/user/profile');
    setProfile(p);
    setIsAuthenticated(true);
  }, [saveKey]);

  const loginInFlightRef = useRef(false);

  const loginWithToken = useCallback(async (token: string) => {
    if (loginInFlightRef.current) throw new Error('in-flight');
    loginInFlightRef.current = true;
    try {
      clearApiKey();
      setAuthToken(token);
      const p = await getProfile();
      setProfile(p);
      setIsAuthenticated(true);
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
      const key = localStorage.getItem('fdt_api_key');
      if (key) {
        try {
          removeAuthToken();
          const p = await apiRequest<UserProfile>('/api/user/profile');
          setProfile(p);
          setIsAuthenticated(true);
        } catch {
          setIsAuthenticated(false);
        }
      } else {
        const token = getAuthToken();
        if (token) {
          try {
            const p = await getProfile();
            setProfile(p);
            setIsAuthenticated(true);
            if (isTauri()) {
              tauriInvoke('watchtower_start', { token }).catch((e: any) => {
                console.error('[Watchtower] Failed to start:', e?.message || e);
              });
            }
          } catch {
            setIsAuthenticated(false);
          }
        }
      }
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
