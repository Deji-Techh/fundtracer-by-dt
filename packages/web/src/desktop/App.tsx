import { Suspense, lazy } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Loader } from './components/common/Loader';
import { AuthPage } from './components/auth/AuthPage';

const AppShell = lazy(() => import('./components/shell/AppShell'));

export default function App() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <Loader fullScreen />;
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <Suspense fallback={<Loader fullScreen />}>
      <AppShell />
    </Suspense>
  );
}
