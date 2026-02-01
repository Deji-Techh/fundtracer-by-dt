import { cache } from '../utils/cache.js';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

export class CoinGeckoService {
  async getTokenPrices(ids: string[], currencies: string[] = ['usd']) {
    const cacheKey = `coingecko:prices:${ids.join(',')}:${currencies.join(',')}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const idsParam = ids.join(',');
      const currenciesParam = currencies.join(',');
      
      const response = await fetch(
        `${COINGECKO_BASE_URL}/simple/price?ids=${idsParam}&vs_currencies=${currenciesParam}&include_24hr_change=true`,
        {
          headers: {
            'accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('CoinGecko rate limit exceeded. Please try again later.');
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 60); // 60 second cache
      return data;
    } catch (error) {
      console.error('[CoinGeckoService] Error fetching prices:', error);
      throw error;
    }
  }

  async getTokenMarketData(id: string) {
    const cacheKey = `coingecko:market:${id}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${COINGECKO_BASE_URL}/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
        {
          headers: {
            'accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 300); // 5 minute cache
      return data;
    } catch (error) {
      console.error('[CoinGeckoService] Error fetching market data:', error);
      throw error;
    }
  }

  async getMarketChart(id: string, days: number = 7) {
    const cacheKey = `coingecko:chart:${id}:${days}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${COINGECKO_BASE_URL}/coins/${id}/market_chart?vs_currency=usd&days=${days}`,
        {
          headers: {
            'accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 300); // 5 minute cache
      return data;
    } catch (error) {
      console.error('[CoinGeckoService] Error fetching market chart:', error);
      throw error;
    }
  }

  async searchTokens(query: string) {
    const cacheKey = `coingecko:search:${query}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(query)}`,
        {
          headers: {
            'accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      cache.set(cacheKey, data, 300); // 5 minute cache
      return data;
    } catch (error) {
      console.error('[CoinGeckoService] Error searching tokens:', error);
      throw error;
    }
  }

  // Attribution notice
  getAttribution() {
    return {
      text: 'Powered by CoinGecko',
      url: 'https://www.coingecko.com',
    };
  }
}

export const coinGeckoService = new CoinGeckoService();
