const API_BASE = import.meta.env.VITE_API_URL || 'https://api.fundtracer.xyz';

const logAuthDebug = (message: string, data?: Record<string, unknown>) => {
  console.log(`[DesktopAuth] ${message}`, data || '');
};

export const getAuthToken = (): string | null => {
  try { return localStorage.getItem('fundtracer_token'); } catch { return null; }
};

export const setAuthToken = (token: string): void => {
  try { localStorage.setItem('fundtracer_token', token); } catch {}
};

export const removeAuthToken = (): void => {
  try { localStorage.removeItem('fundtracer_token'); } catch {}
};

const getApiKey = (): string | null => {
  try { return localStorage.getItem('fdt_api_key'); } catch { return null; }
};

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

export async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
  retryCount = 0,
): Promise<T> {
  const token = getAuthToken();
  const apiKey = getApiKey();
  const hasToken = !!token;
  const hasApiKey = !!apiKey;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    if (endpoint === '/api/user/profile') {
      logAuthDebug('profile request', {
        method,
        hasBearerToken: hasToken,
        hasApiKey,
        credentials: 'include',
      });
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || errorData.error || `API error: ${response.status}`;
      const hint = errorData.hint;

      if (response.status === 401) {
        removeAuthToken();
      }

      if (endpoint === '/api/user/profile') {
        logAuthDebug('profile request failed', {
          status: response.status,
          message,
          hint,
        });
      }

      const shouldRetry = (response.status >= 500 || response.status === 429) && retryCount < MAX_RETRIES;
      if (shouldRetry) {
        await delay(INITIAL_RETRY_DELAY * Math.pow(2, retryCount));
        return apiRequest<T>(endpoint, method, body, retryCount + 1);
      }

      const error = new Error(hint ? `${message} ${hint}` : message) as Error & { status: number };
      error.status = response.status;
      throw error;
    }

    if (endpoint === '/api/user/profile') {
      logAuthDebug('profile request succeeded', { status: response.status });
    }

    return response.json();
  } catch (err: unknown) {
    if (err instanceof Error && 'status' in err) throw err;
    const shouldRetry = retryCount < MAX_RETRIES;
    if (shouldRetry) {
      await delay(INITIAL_RETRY_DELAY * Math.pow(2, retryCount));
      return apiRequest<T>(endpoint, method, body, retryCount + 1);
    }
    throw err;
  }
}

// ── Scheduled Reports ──────────────────────────────────────────

export interface ReportSchedule {
  id: string;
  userId: string;
  name: string;
  cronExpression: string;
  format: 'pdf' | 'csv' | 'json';
  chain: string;
  addresses: string[];
  timePeriod: '24h' | '7d' | '30d' | 'all';
  deliveryMethod: 'email' | 'download';
  emailRecipient: string | null;
  lastRunAt: number | null;
  lastError: string | null;
  lastOutputId: string | null;
  lastOutputFilename: string | null;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateReportScheduleParams {
  name: string;
  cronExpression: string;
  format: 'pdf' | 'csv' | 'json';
  chain: string;
  addresses: string[];
  timePeriod: '24h' | '7d' | '30d' | 'all';
  deliveryMethod: 'email' | 'download';
  emailRecipient?: string;
}

export async function getScheduledReports(): Promise<{ schedules: ReportSchedule[] }> {
  return apiRequest<{ schedules: ReportSchedule[] }>('/api/scheduled-reports');
}

export async function createScheduledReport(data: CreateReportScheduleParams): Promise<ReportSchedule> {
  return apiRequest<ReportSchedule>('/api/scheduled-reports', 'POST', data);
}

export async function updateScheduledReport(id: string, data: Partial<CreateReportScheduleParams & { enabled: boolean }>): Promise<ReportSchedule> {
  return apiRequest<ReportSchedule>(`/api/scheduled-reports/${id}`, 'PATCH', data);
}

export async function deleteScheduledReport(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/scheduled-reports/${id}`, 'DELETE');
}

export async function runScheduledReport(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/scheduled-reports/${id}/run`, 'POST');
}

export interface ReportOutputMeta {
  id: string;
  filename: string;
  format: string;
  contentType: string;
  createdAt: number;
  expiresAt: number;
}

export async function listReportOutputs(scheduleId: string): Promise<{ outputs: ReportOutputMeta[] }> {
  return apiRequest<{ outputs: ReportOutputMeta[] }>(`/api/scheduled-reports/${scheduleId}/outputs`);
}

export function getReportDownloadUrl(scheduleId: string, outputId: string): string {
  const base = localStorage.getItem('fundtracer_api_base') || 'https://api.fundtracer.xyz';
  return `${base}/api/scheduled-reports/${scheduleId}/download/${outputId}`;
}

export async function downloadReportOutput(scheduleId: string, outputId: string, filename: string): Promise<void> {
  const token = getAuthToken();
  const url = getReportDownloadUrl(scheduleId, outputId);
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}
