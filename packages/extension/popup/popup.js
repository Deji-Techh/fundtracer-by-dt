// FundTracer Extension Popup Script

const API_BASE = 'https://fundtracer.xyz/api';
let selectedChain = 'ethereum';
let apiKey = null;

// DOM Elements
const elements = {
  connectBtn: document.getElementById('connectBtn'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  connectedWallet: document.getElementById('connectedWallet'),
  connectedAddress: document.getElementById('connectedAddress'),
  walletSection: document.getElementById('walletSection'),
  walletInput: document.getElementById('walletInput'),
  scanBtn: document.getElementById('scanBtn'),
  evmBtn: document.getElementById('evmBtn'),
  solanaBtn: document.getElementById('solanaBtn'),
  tierBadge: document.getElementById('tierBadge'),
  chainTag: document.getElementById('chainTag'),
  resultsSection: document.getElementById('resultsSection'),
  fullResultsBtn: document.getElementById('fullResultsBtn'),
  loading: document.getElementById('loading'),
  errorMessage: document.getElementById('errorMessage'),
  errorText: document.getElementById('errorText'),
  riskLevel: document.getElementById('riskLevel'),
  sybilScore: document.getElementById('sybilScore'),
  totalTxs: document.getElementById('totalTxs'),
  balance: document.getElementById('balance'),
};

// Chain configuration
const chains = {
  ethereum: { name: 'Ethereum', symbol: 'ETH', color: '#627EEA' },
  arbitrum: { name: 'Arbitrum', symbol: 'ETH', color: '#28A0F0' },
  base: { name: 'Base', symbol: 'ETH', color: '#0052FF' },
  optimism: { name: 'Optimism', symbol: 'ETH', color: '#FF0420' },
  polygon: { name: 'Polygon', symbol: 'MATIC', color: '#8247E5' },
  linea: { name: 'Linea', symbol: 'ETH', color: '#A7A7A7' },
  solana: { name: 'Solana', symbol: 'SOL', color: '#14F195' },
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadUserData();
  setupEventListeners();
  updateChainButtons();
  
  // Set initial chain tag
  const chainInfo = chains[selectedChain];
  elements.chainTag.textContent = chainInfo?.symbol || 'ETH';
});

async function loadUserData() {
  try {
    const data = await chrome.storage.local.get(['apiKey', 'selectedChain', 'lastAddress']);
    
    if (data.apiKey) {
      apiKey = data.apiKey;
      elements.tierBadge.textContent = 'API';
      elements.tierBadge.classList.add('pro');
    }
    
    if (data.selectedChain && chains[data.selectedChain]) {
      selectedChain = data.selectedChain;
      updateChainButtons();
    }
    
    if (data.lastAddress) {
      elements.walletInput.value = data.lastAddress;
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

function setupEventListeners() {
  // Chain selector
  document.querySelectorAll('.chain-btn').forEach(btn => {
    btn.addEventListener('click', () => selectChain(btn.dataset.chain));
  });
  
  // Scan
  elements.scanBtn.addEventListener('click', analyzeWallet);
  elements.walletInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') analyzeWallet();
  });
  
  // Full results
  elements.fullResultsBtn.addEventListener('click', openFullResults);
}

function selectChain(chain) {
  selectedChain = chain;
  chrome.storage.local.set({ selectedChain: chain });
  updateChainButtons();
  
  // Update chain tag
  const chainInfo = chains[chain];
  elements.chainTag.textContent = chainInfo?.symbol || chain.toUpperCase();
}

function updateChainButtons() {
  document.querySelectorAll('.chain-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.chain === selectedChain);
  });
}

async function analyzeWallet() {
  let address = elements.walletInput.value.trim();
  
  if (!address) {
    showError('Please enter a wallet address');
    return;
  }
  
  // Validate address
  if (selectedChain === 'solana') {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      showError('Invalid Solana address');
      return;
    }
  } else {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      showError('Invalid EVM address (0x...)');
      return;
    }
  }
  
  hideError();
  showLoading(true);
  
  // Save last address
  chrome.storage.local.set({ lastAddress: address });
  
  try {
    // Determine endpoint
    const isSolana = selectedChain === 'solana';
    const endpoint = isSolana 
      ? `${API_BASE}/solana`
      : `${API_BASE}/analyze`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({ 
        address,
        chain: selectedChain,
        includeFundingTrace: true,
        includeSybilAnalysis: true,
      })
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        showError('API key required. Get one at fundtracer.xyz');
        return;
      }
      const error = await response.json().catch(() => ({ message: 'Analysis failed' }));
      throw new Error(error.message || 'Analysis failed');
    }
    
    const data = await response.json();
    displayResults(data, address);
    
  } catch (error) {
    // If API fails, show demo data for UX
    console.error('Analysis error:', error);
    displayDemoResults(address);
  } finally {
    showLoading(false);
  }
}

function displayResults(data, address) {
  elements.resultsSection.style.display = 'flex';
  
  // Risk Level
  const risk = data.riskLevel || data.risk?.level || 'low';
  elements.riskLevel.textContent = risk.charAt(0).toUpperCase() + risk.slice(1);
  elements.riskLevel.className = 'result-value risk ' + risk;
  
  // Sybil Score
  const sybilScore = data.sybilScore || data.sybil?.score || 0;
  elements.sybilScore.textContent = `${sybilScore}%`;
  
  // Total Transactions
  const txs = data.totalTransactions || data.summary?.totalTransactions || 0;
  elements.totalTxs.textContent = txs.toLocaleString();
  
  // Balance
  const chainInfo = chains[selectedChain];
  const balance = data.wallet?.balanceInEth || data.balance || 0;
  elements.balance.textContent = `${balance.toFixed(4)} ${chainInfo?.symbol || 'ETH'}`;
  
  // Store for full results
  chrome.storage.local.set({
    lastAnalysis: { address, chain: selectedChain, data }
  });
}

function displayDemoResults(address) {
  elements.resultsSection.style.display = 'flex';
  
  // Demo data
  elements.riskLevel.textContent = 'Low';
  elements.riskLevel.className = 'result-value risk low';
  elements.sybilScore.textContent = '12%';
  elements.totalTxs.textContent = '1,247';
  elements.balance.textContent = '2.4532 ETH';
  
  showError('Using demo mode - Connect API key for full results');
}

function openFullResults() {
  const address = elements.walletInput.value;
  if (address) {
    const path = selectedChain === 'solana' ? '/app-solana' : '/app-evm';
    chrome.tabs.create({
      url: `https://fundtracer.xyz${path}?address=${address}`
    });
  }
}

function showLoading(show) {
  elements.loading.style.display = show ? 'flex' : 'none';
  elements.scanBtn.disabled = show;
  if (show) {
    elements.resultsSection.style.display = 'none';
    hideError();
  }
}

function showError(message) {
  elements.errorText.textContent = message;
  elements.errorMessage.style.display = 'flex';
}

function hideError() {
  elements.errorMessage.style.display = 'none';
}
