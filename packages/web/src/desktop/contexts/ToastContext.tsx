import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = String(++toastId);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, 'error'), [addToast]);
  const info = useCallback((msg: string) => addToast(msg, 'info'), [addToast]);
  const warning = useCallback((msg: string) => addToast(msg, 'warning'), [addToast]);

  const value = useMemo(() => ({ toasts, success, error, info, warning, dismiss }), [toasts, success, error, info, warning, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed',
        top: 48,
        right: 16,
        zIndex: 700,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {toasts.map(toast => (
          <div key={toast.id} className="animate-slide-up" style={{
            background: toast.type === 'error' ? 'var(--destructive)' :
                        toast.type === 'success' ? '#00cc6a' :
                        toast.type === 'warning' ? 'var(--warning)' : '#00cc6a',
            color: toast.type === 'warning' ? '#000' : '#fff',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-overlay)',
            maxWidth: 360,
            wordBreak: 'break-word',
          }} onClick={() => dismiss(toast.id)}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useNotify must be used within ToastProvider');
  return ctx;
}

export { ToastContext };
