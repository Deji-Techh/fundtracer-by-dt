export interface MarketStat {
  metric: string;
  value: number;
  change_24h: number;
  formatted?: string;
}

export interface MarketData {
  chain: string;
  stats: MarketStat[];
  lastUpdated: string;
}

export const marketApi = {
  async getStats(): Promise<MarketData> {
    const response = await fetch('/api/market/stats');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch market stats');
    }

    return response.json();
  },
};

export default marketApi;
