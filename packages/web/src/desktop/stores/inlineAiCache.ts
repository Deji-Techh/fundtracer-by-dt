const STORAGE_PREFIX = 'fundtracer_inline_ai_cache:';
const MAX_ENTRIES = 40;

export interface InlineAiMessage {
  role: 'assistant' | 'user';
  content: string;
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getInlineAiCacheKey(address: string, chain: string, analysisData: unknown): string {
  const normalizedAddress = address.trim().toLowerCase();
  const signatureSource = (() => {
    try {
      return JSON.stringify(analysisData || {}).slice(0, 120_000);
    } catch {
      return 'unserializable-analysis-data';
    }
  })();
  return `${chain}:${normalizedAddress}:${hashString(signatureSource)}`;
}

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function pruneCache(): void {
  const entries: Array<{ key: string; updatedAt: number }> = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '{}') as { updatedAt?: number };
      entries.push({ key, updatedAt: parsed.updatedAt || 0 });
    } catch {
      entries.push({ key, updatedAt: 0 });
    }
  }

  entries
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(MAX_ENTRIES)
    .forEach(entry => localStorage.removeItem(entry.key));
}

export function getInlineAiMessages(key: string): InlineAiMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { messages?: InlineAiMessage[] };
    return Array.isArray(parsed.messages) ? parsed.messages : [];
  } catch {
    return [];
  }
}

export function saveInlineAiMessages(key: string, messages: InlineAiMessage[]): void {
  try {
    if (messages.length === 0) return;
    localStorage.setItem(storageKey(key), JSON.stringify({
      messages,
      updatedAt: Date.now(),
    }));
    pruneCache();
  } catch {}
}

export function clearInlineAiCache(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key);
    }
  } catch {}
}
