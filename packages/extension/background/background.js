// FundTracer Extension Background Service Worker

const API_BASE = 'https://fundtracer.xyz/api';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for API responses
const apiCache = new Map();

chrome.runtime.onInstalled.addListener(() => {
  console.log('FundTracer Extension installed');
  
  // Set default values
  chrome.storage.local.set({
    userTier: 'free',
    lastAnalysis: null,
  });
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_WALLET') {
    analyzeWallet(message.address, message.chain)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'CHECK_TIER') {
    checkUserTier(message.wallet)
      .then(tier => sendResponse({ success: true, tier }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'GET_CACHED_ANALYSIS') {
    const cached = getCachedAnalysis(message.address, message.chain);
    sendResponse({ cached });
    return false;
  }
});

// Analyze wallet through server API
async function analyzeWallet(address, chain) {
  const cacheKey = `${chain}:${address}`;
  
  // Check cache first
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    const endpoint = chain === 'evm' 
      ? `${API_BASE}/evm/analyze`
      : `${API_BASE}/solana/analyze`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        includeFundingTrace: true,
        includeSybilAnalysis: true,
        includeHistory: true,
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Analysis failed');
    }
    
    const data = await response.json();
    
    // Cache the result
    apiCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
    
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

// Check user tier from server
async function checkUserTier(wallet) {
  if (!wallet) return 'free';
  
  try {
    const response = await fetch(`${API_BASE}/user/subscription?wallet=${wallet}`);
    
    if (response.ok) {
      const data = await response.json();
      const tier = data.tier || 'free';
      
      // Store tier for future use
      await chrome.storage.local.set({ userTier: tier });
      
      return tier;
    }
    
    return 'free';
    
  } catch (error) {
    console.error('Tier check error:', error);
    return 'free';
  }
}

// Get cached analysis if available
function getCachedAnalysis(address, chain) {
  const cacheKey = `${chain}:${address}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  return null;
}

// Clean old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of apiCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      apiCache.delete(key);
    }
  }
}, 60000);

// Handle tab updates to sync tier from web app
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('fundtracer.xyz')) {
    // Listen for tier updates from the web app
    chrome.tabs.sendMessage(tabId, { type: 'REQUEST_TIER' }, (response) => {
      if (response?.tier) {
        chrome.storage.local.set({ userTier: response.tier });
      }
    });
  }
});

console.log('FundTracer background service worker initialized');
