const API_BASE = '';

function getAuthToken(): string | null {
  return localStorage.getItem('fundtracer_token');
}

async function authenticatedFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options?.headers },
    credentials: 'include',
  });
  
  return response;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  price: number;
  value: number;
  logoUrl?: string;
  change24h?: number;
}

export interface NFT {
  contractAddress: string;
  tokenId: string;
  name: string;
  imageUrl?: string;
  collectionName?: string;
}

export interface PortfolioData {
  wallet: string;
  chain: string;
  totalValue: number;
  tokens: Token[];
  nfts: NFT[];
  attribution: { text: string; url: string };
  lastUpdated: string;
}

export const portfolioApi = {
  async getPortfolio(walletAddress: string, chain: string = 'linea'): Promise<PortfolioData> {
    const response = await authenticatedFetch(`${API_BASE}/api/portfolio/${walletAddress}?chain=${chain}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch portfolio');
    }
    
    return response.json();
  },

  async getNFTs(walletAddress: string, chain: string = 'linea'): Promise<NFT[]> {
    const response = await authenticatedFetch(`${API_BASE}/api/portfolio/${walletAddress}/nfts?chain=${chain}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch NFTs');
    }
    
    const data = await response.json();
    return data.nfts;
  },
};

export default portfolioApi;
