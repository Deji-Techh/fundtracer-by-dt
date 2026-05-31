import DesktopApp from '../desktop/App';
import { AuthProvider as DesktopAuthProvider } from '../desktop/contexts/AuthContext';
import { KeyboardProvider as DesktopKeyboardProvider } from '../desktop/contexts/KeyboardContext';
import { ThemeProvider as DesktopThemeProvider } from '../desktop/contexts/ThemeContext';
import { ToastProvider as DesktopToastProvider } from '../desktop/contexts/ToastContext';
import '../desktop/index.css';

export function AppPage() {
  return (
    <DesktopThemeProvider>
      <DesktopToastProvider>
        <DesktopAuthProvider>
          <DesktopKeyboardProvider>
            <DesktopApp />
          </DesktopKeyboardProvider>
        </DesktopAuthProvider>
      </DesktopToastProvider>
    </DesktopThemeProvider>
  );
}

export default AppPage;
