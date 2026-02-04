/**
 * In-memory cache with TTL (Time To Live)
 */
class Cache {
  constructor() {
    this.store = new Map();
  }

  set(key, value, ttlSeconds = 30) {
    const expires = Date.now() + (ttlSeconds * 1000);
    this.store.set(key, { value, expires });
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key) {
    const item = this.store.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expires) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  // TTL configurations for different data types
  static TTL = {
    OHLCV: 30,      // 30 seconds for chart data
    TRADES: 10,     // 10 seconds for live trades
    POOLS: 60,      // 60 seconds for trending pools
    SEARCH: 30      // 30 seconds for search results
  };
}

export const cache = new Cache();
export default Cache;
