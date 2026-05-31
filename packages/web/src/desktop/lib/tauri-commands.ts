// Typed wrappers for Tauri invoke() calls
// In non-Tauri context (browser), these return sensible defaults.

let _tauriInvoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;

try {
  if (typeof window !== 'undefined' && window.__TAURI__) {
    import('@tauri-apps/api/core').then(mod => {
      _tauriInvoke = mod.invoke;
    });
  }
} catch {
  // Not in Tauri environment
}

export async function tauriInvoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!_tauriInvoke) {
    try {
      const mod = await import('@tauri-apps/api/core');
      _tauriInvoke = mod.invoke;
    } catch {
      throw new Error('Tauri not available');
    }
  }
  return _tauriInvoke(cmd, args) as Promise<T>;
}

export async function getAppVersion(): Promise<string> {
  try { return await tauriInvoke<string>('get_app_version'); }
  catch { return '1.0.0'; }
}

export async function openInBrowser(url: string): Promise<void> {
  try { await tauriInvoke('open_in_browser', { url }); } catch {}
}

export async function showNotification(title: string, body: string): Promise<void> {
  try { await tauriInvoke('show_notification', { title, body }); } catch {}
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
}
