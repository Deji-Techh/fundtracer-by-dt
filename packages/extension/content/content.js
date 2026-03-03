// FundTracer Extension Content Script
// Optional: Allows right-click analysis on any page

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REQUEST_TIER') {
    // Check if user is logged in on the page
    chrome.storage.local.get(['userTier'], (data) => {
      sendResponse({ tier: data.userTier || 'free' });
    });
    return true;
  }
  
  if (message.type === 'SHOW_ANALYSIS') {
    // Could open a mini popup or highlight addresses
    console.log('FundTracer: Analysis requested for', message.address);
  }
});

// Find wallet addresses on the page and make them clickable
function setupAddressDetection() {
  // Common patterns for wallet addresses
  const addressPatterns = [
    /0x[a-fA-F0-9]{40}/g,  // EVM addresses
    /[1-9A-HJ-NP-Za-km-z]{32,44}/g  // Solana addresses
  ];
  
  // This is optional - could add hover tooltips or make addresses clickable
  // For now, we'll just detect and store found addresses
  document.addEventListener('mouseover', (e) => {
    const text = e.target.textContent;
    if (text) {
      for (const pattern of addressPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          // Could send to background for potential analysis
          break;
        }
      }
    }
  });
}

// Initialize if enabled
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAddressDetection);
} else {
  setupAddressDetection();
}
