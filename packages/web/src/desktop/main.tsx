import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { KeyboardProvider } from './contexts/KeyboardContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

const root = document.getElementById('root')!;

// Check if this is the widget window
const params = new URLSearchParams(window.location.search);
if (params.get('view') === 'widget') {
  import('./components/shell/WidgetView').then(({ WidgetView }) => {
    ReactDOM.createRoot(root).render(
      <ThemeProvider>
        <WidgetView />
      </ThemeProvider>
    );
  });
} else {
  ReactDOM.createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <KeyboardProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </KeyboardProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}
