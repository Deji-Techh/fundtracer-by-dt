import { useEffect, useRef } from 'react';

const EVM_RE = /0x[a-fA-F0-9]{40}/g;
const SOLANA_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

export function extractAddress(text: string): string | null {
  const evm = text.match(EVM_RE);
  if (evm) return evm[0];
  const sol = text.match(SOLANA_RE);
  if (sol) return sol[0];
  return null;
}

interface UseClipboardDetectionOptions {
  enabled: boolean;
  onAddressDetected: (address: string) => void;
  intervalMs?: number;
}

export function useClipboardDetection({
  enabled,
  onAddressDetected,
  intervalMs = 2000,
}: UseClipboardDetectionOptions) {
  const lastValue = useRef<string>('');
  const callbackRef = useRef(onAddressDetected);
  callbackRef.current = onAddressDetected;

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text !== lastValue.current) {
          lastValue.current = text;
          const address = extractAddress(text);
          if (address) {
            callbackRef.current(address);
          }
        }
      } catch {
        // Clipboard access denied or unavailable
      }
    };

    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);
}
