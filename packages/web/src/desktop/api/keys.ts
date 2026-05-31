import { getAuthToken } from './client';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.fundtracer.xyz';

export interface ApiKeyData {
  id: string;
  name: string;
  key: string;
  prefix: string;
  type: 'live' | 'test' | 'mcp';
  createdAt: number;
  lastUsed?: number;
  requests?: number;
  active?: boolean;
}

export async function listApiKeys(): Promise<{ success: boolean; keys: ApiKeyData[] }> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/user/api-keys`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load API keys');
  return {
    success: data.success,
    keys: (data.keys || []).map((k: ApiKeyData) => ({
      ...k,
      prefix: k.key ? k.key.slice(0, 12) : k.prefix || '',
    })),
  };
}

export async function createApiKey(name: string, type: 'live' | 'test' | 'mcp' = 'test'): Promise<{ success: boolean; key?: ApiKeyData; error?: string }> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/user/api-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ name, type }),
  });
  return res.json();
}

export async function deleteApiKey(keyId: string): Promise<{ success: boolean }> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/user/api-keys/${keyId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return res.json();
}
