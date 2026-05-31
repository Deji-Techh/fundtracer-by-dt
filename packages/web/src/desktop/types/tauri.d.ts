// Declare __TAURI__ on the window object for Tauri environment detection
interface Window {
  __TAURI__?: {
    __TAURI_INTERNALS__?: unknown;
  };
}
