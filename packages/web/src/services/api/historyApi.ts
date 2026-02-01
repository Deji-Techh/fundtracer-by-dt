export interface Transaction {
  hash: string;
  timestamp: number;
  type: string;
  status: string;
  from: string;
  to: string;
  amount: string;
  gasFee: string;
  blockNumber: number;
}

export interface HistoryResponse {
  wallet: string;
  blockchain: string;
  transactions: Transaction[];
  pagination: {
    pageToken?: string;
    hasMore: boolean;
    count: number;
  };
}

export const historyApi = {
  async getHistory(
    wallet: string, 
    blockchain: string = 'linea',
    pageToken?: string,
    filters?: { type?: string; minAmount?: number }
  ): Promise<HistoryResponse> {
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet,
        blockchain,
        pageToken,
        filters,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch history');
    }

    return response.json();
  },
};

export default historyApi;
