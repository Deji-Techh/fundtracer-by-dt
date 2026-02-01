/**
 * Simple in-memory cache with TTL
 */
export class Cache {
  private store: Map<string, { value: any; expires: number }> = new Map();

  set(key: string, value: any, ttlSeconds: number): void {
    const expires = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expires });
  }

  get(key: string): any | null {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    const item = this.store.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expires) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }
}

export const cache = new Cache();
