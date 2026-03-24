import type {
  ChainId,
  WalletAnalysisOptions,
  WalletAnalysis,
  FundingTreeOptions,
  FundingTree,
  CompareOptions,
  CompareResult,
  SybilResult,
  ContractInfo,
  SafetyResult,
  ApiError,
  RateLimitInfo,
  ApiResponse,
  GasPrices,
  TransactionInfo,
  BatchAnalysisResult,
} from './types';

const DEFAULT_BASE_URL = 'https://fundtracer.xyz/api';

export class FundTracerAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = DEFAULT_BASE_URL) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const rateLimit: RateLimitInfo | undefined = {
      limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0', 10),
      remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0', 10),
      reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0', 10),
    };

    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;
      const message = error.message || error.error || `HTTP ${response.status}`;
      const err = new Error(message) as Error & { status: number; hint?: string };
      err.status = response.status;
      err.hint = error.hint;
      throw err;
    }

    return { data: data as T, rateLimit };
  }

  private validateChain(chain: string): asserts chain is ChainId {
    const validChains: ChainId[] = [
      'ethereum', 'linea', 'arbitrum', 'base',
      'optimism', 'polygon', 'bsc'
    ];
    if (!validChains.includes(chain as ChainId)) {
      throw new Error(
        `Invalid chain: ${chain}. Valid chains: ${validChains.join(', ')}`
      );
    }
  }

  async analyzeWallet(
    address: string,
    options: WalletAnalysisOptions
  ): Promise<ApiResponse<WalletAnalysis>> {
    this.validateChain(options.chain);
    return this.request<WalletAnalysis>('/analyze/wallet', {
      method: 'POST',
      body: JSON.stringify({ address, ...options }),
    });
  }

  async getFundingTree(
    address: string,
    options: WalletAnalysisOptions & FundingTreeOptions = {} as any
  ): Promise<ApiResponse<FundingTree>> {
    this.validateChain(options.chain || 'ethereum');
    const { chain = 'ethereum', maxDepth = 3, maxNodes = 100, includeLabels = true } = options;
    return this.request<FundingTree>('/analyze/funding-tree', {
      method: 'POST',
      body: JSON.stringify({
        address,
        chain,
        options: { treeConfig: { maxDepth, maxNodes, includeLabels } },
      }),
    });
  }

  async compareWallets(
    addresses: string[],
    options: CompareOptions
  ): Promise<ApiResponse<CompareResult>> {
    if (addresses.length < 2 || addresses.length > 10) {
      throw new Error('Must provide 2-10 addresses to compare');
    }
    this.validateChain(options.chain);
    return this.request<CompareResult>('/analyze/compare', {
      method: 'POST',
      body: JSON.stringify({ addresses, ...options }),
    });
  }

  async detectSybil(address: string, chain: ChainId): Promise<ApiResponse<SybilResult>> {
    this.validateChain(chain);
    return this.request<SybilResult>('/analyze/sybil', {
      method: 'POST',
      body: JSON.stringify({ contractAddress: address, chain }),
    });
  }

  async analyzeContract(
    address: string,
    chain: ChainId
  ): Promise<ApiResponse<ContractInfo>> {
    this.validateChain(chain);
    return this.request<ContractInfo>('/analyze/contract', {
      method: 'POST',
      body: JSON.stringify({ contractAddress: address, chain }),
    });
  }

  async getContractInfo(
    address: string,
    chain: ChainId
  ): Promise<ApiResponse<ContractInfo>> {
    this.validateChain(chain);
    return this.request<ContractInfo>('/contracts/info', {
      method: 'POST',
      body: JSON.stringify({ address, chain }),
    });
  }

  async getMarketStats(): Promise<ApiResponse<any>> {
    return this.request<any>('/market/stats', {
      method: 'GET',
    });
  }

  async getTrendingCoins(): Promise<ApiResponse<any>> {
    return this.request<any>('/market/coins', {
      method: 'GET',
    });
  }

  async checkSafety(
    address: string,
    chain: ChainId
  ): Promise<ApiResponse<SafetyResult>> {
    this.validateChain(chain);
    return this.request<SafetyResult>('/safety/check', {
      method: 'POST',
      body: JSON.stringify({ contractAddress: address, chain }),
    });
  }

  async getTransaction(
    chain: ChainId,
    txHash: string
  ): Promise<ApiResponse<TransactionInfo>> {
    this.validateChain(chain);
    return this.request<TransactionInfo>(`/tx/${chain}/${txHash}`, {
      method: 'GET',
    });
  }

  async getGasPrices(chain: ChainId = 'ethereum'): Promise<ApiResponse<GasPrices>> {
    this.validateChain(chain);
    return this.request<GasPrices>(`/gas?chain=${chain}`, {
      method: 'GET',
    });
  }

  async analyzeBatch(
    addresses: string[],
    chain: ChainId,
    options: { maxAddresses?: number } = {}
  ): Promise<ApiResponse<BatchAnalysisResult>> {
    if (addresses.length === 0) {
      throw new Error('Must provide at least one address');
    }
    const maxAddresses = options.maxAddresses ?? 50;
    if (addresses.length > maxAddresses) {
      throw new Error(`Maximum ${maxAddresses} addresses per batch`);
    }
    this.validateChain(chain);
    return this.request<BatchAnalysisResult>('/analyze/batch', {
      method: 'POST',
      body: JSON.stringify({ addresses, chain }),
    });
  }

  getApiKey(): string {
    return this.apiKey;
  }
}

export default FundTracerAPI;
