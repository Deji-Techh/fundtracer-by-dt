export interface TokenSearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
}

export interface TokenMarketData {
  market_cap?: number;
  total_volume?: number;
  circulating_supply?: number;
  current_price?: number;
  high_24h?: number;
  low_24h?: number;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
}

export interface TokenDetails {
  id: string;
  name: string;
  symbol: string;
  contractAddress?: string;
  thumb?: string;
  large?: string;
  marketData?: TokenMarketData;
}

export const tokensApi = {
  async search(query: string): Promise<TokenSearchResult[]> {
    const response = await fetch(`/api/tokens/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to search tokens');
    }

    const data = await response.json();
    return data.results;
  },

  async getToken(address: string, chain: string = 'linea'): Promise<any> {
    const response = await fetch(`/api/tokens/${address}?chain=${chain}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch token');
    }

    return response.json();
  },

  async getChart(address: string, coinId: string, days: string): Promise<any> {
    const response = await fetch(
      `/api/tokens/${address}/chart?coinId=${coinId}&days=${days}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch chart data');
    }

    return response.json();
  },
};

export default tokensApi;
