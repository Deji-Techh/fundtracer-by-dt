export interface ShareData {
  address?: string;
  chain?: string;
  type?: 'wallet' | 'contract' | 'analysis';
  tab?: string;
}

export function generateShareUrl(data: ShareData): string {
  const params = new URLSearchParams();
  
  if (data.address) params.set('address', data.address);
  if (data.chain) params.set('chain', data.chain);
  if (data.type) params.set('type', data.type);
  if (data.tab) params.set('tab', data.tab);
  
  const queryString = params.toString();
  return queryString ? `${window.location.origin}/investigate?${queryString}` : window.location.origin;
}

export function parseShareUrl(url: string): ShareData | null {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    return {
      address: params.get('address') || undefined,
      chain: params.get('chain') || undefined,
      type: params.get('type') as 'wallet' | 'contract' | 'analysis' || undefined,
      tab: params.get('tab') || undefined,
    };
  } catch {
    return null;
  }
}

export async function shareToClipboard(data: ShareData): Promise<boolean> {
  const url = generateShareUrl(data);
  
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

export async function shareNative(data: ShareData, title?: string): Promise<boolean> {
  const url = generateShareUrl(data);
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: title || 'FundTracer Analysis',
        text: `Check out this ${data.type || 'analysis'} on FundTracer`,
        url,
      });
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return false;
      throw err;
    }
  }
  
  return shareToClipboard(data);
}

export function getAddressFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('address');
}

export function getChainFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('chain');
}
