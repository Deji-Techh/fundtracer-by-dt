const cacheControl = {
  TTL: {
    OHLCV: 30,
    TRADES: 10,
    POOLS: 60,
    SEARCH: 30,
    TRANSACTIONS: 300,
    BALANCES: 30,
    PRICES: 60,
    TOKENS: 30,
    NFTS: 60,
  },

  generateCacheKey: (req) => {
    const protocol = req.get('X-Forwarded-Proto') || req.protocol || 'http';
    const host = req.get('host') || 'localhost';
    const url = req.originalUrl || req.url;
    return `${protocol}://${host}${url}`;
  },

  getTTL: (req) => {
    const path = req.path.toLowerCase();
    
    if (path.includes('/transactions') || path.includes('/txs')) {
      return cacheControl.TTL.TRANSACTIONS;
    }
    if (path.includes('/balance')) {
      return cacheControl.TTL.BALANCES;
    }
    if (path.includes('/price')) {
      return cacheControl.TTL.PRICES;
    }
    if (path.includes('/token')) {
      return cacheControl.TTL.TOKENS;
    }
    if (path.includes('/nft')) {
      return cacheControl.TTL.NFTS;
    }
    if (path.includes('/ohlcv')) {
      return cacheControl.TTL.OHLCV;
    }
    if (path.includes('/trade')) {
      return cacheControl.TTL.TRADES;
    }
    if (path.includes('/pool')) {
      return cacheControl.TTL.POOLS;
    }
    
    return cacheControl.TTL.SEARCH;
  },

  setCacheHeaders: (res, ttlSeconds) => {
    res.set({
      'Cache-Control': `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`,
      'X-Cache-TTL': ttlSeconds.toString(),
    });
  },

  middleware: (req, res, next) => {
    const ttl = cacheControl.getTTL(req);
    cacheControl.setCacheHeaders(res, ttl);
    req.cacheTTL = ttl;
    req.cacheKey = cacheControl.generateCacheKey(req);
    next();
  },
};

export default cacheControl;
