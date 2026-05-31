import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signInWithGoogleOneTap } from '../firebase';
import { loginWithGoogle } from '../api';

export function useGoogleOneTap() {
  const { isAuthenticated, setTokenFromExternal } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId || initialized.current || isAuthenticated) return;

    if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const init = () => {
      if (typeof window.google?.accounts?.id === 'undefined') return;
      initialized.current = true;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          if (!response.credential) return;
          try {
            const firebaseToken = await signInWithGoogleOneTap(response.credential);
            const data = await loginWithGoogle(firebaseToken);
            setTokenFromExternal(data.token);
            const redirectTo = window.location.pathname.includes('/api') ? '/api/keys' : '/app-evm';
            window.location.href = redirectTo;
          } catch {
            // silent fail — user can try again
          }
        },
        auto_select: true,
      });

      window.google.accounts.id.prompt();
    };

    const timer = setTimeout(() => init(), 1000);
    if (typeof window.google?.accounts?.id !== 'undefined') {
      clearTimeout(timer);
      init();
    }

    return () => {
      clearTimeout(timer);
      try { window.google?.accounts?.id?.cancel(); } catch {}
    };
  }, [isAuthenticated, setTokenFromExternal]);
}
