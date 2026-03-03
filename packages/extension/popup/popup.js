// FundTracer Extension Popup Script

const API_BASE = 'https://fundtracer.xyz/api';
let selectedChain = 'evm';
let connectedWallet = null;
let userTier = 'free';

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
  resultsSection: document.getElementById('resultsSection'),
  fullResultsBtn: document.getElementById('fullResultsBtn'),
  loading: document.getElementById('loading'),
  errorMessage: document.getElementById('errorMessage'),
  errorText: document.getElementById('errorText'),
  // Result elements
  riskLevel: document.getElementById('riskLevel'),
  sybilScore: document.getElementById('sybilScore'),
  totalTxs: document.getElementById('totalTxs'),
  balance: document.getElementById('balance'),
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadUserData();
  setupEventListeners();
});

async function loadUserData() {
  try {
    // Load stored wallet
    const data = await chrome.storage.local.get(['connectedWallet', 'userTier']);
    
    if (data.connectedWallet) {
      connectedWallet = data.connectedWallet;
      updateWalletDisplay(connectedWallet);
    }
    
    if (data.userTier) {
      userTier = data.userTier;
      updateTierBadge(userTier);
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

function setupEventListeners() {
  // Chain selector
  elements.evmBtn.addEventListener('click', () => selectChain('evm'));
  elements.solanaBtn.addEventListener('click', () => selectChain('solana'));
  
  // Wallet connection
  elements.connectBtn.addEventListener('click', connectWallet);
  elements.disconnectBtn.addEventListener('click', disconnectWallet);
  
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
  elements.evmBtn.classList.toggle('active', chain === 'evm');
  elements.solanaBtn.classList.toggle('active', chain === 'solana');
}

function updateWalletDisplay(address) {
  const shortAddr = address.slice(0, 6) + '...' + address.slice(-4);
  elements.connectedAddress.textContent = shortAddr;
  elements.walletInput.value = address;
  elements.walletSection.innerHTML = `
    <div class="connected-wallet">
      <div class="wallet-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      </div>
      <div class="wallet-info">
        <span class="wallet-label">Connected</span>
        <span class="wallet-address">${shortAddr}</span>
      </div>
      <button class="btn-disconnect" id="disconnectBtn" title="Disconnect">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;
  document.getElementById('disconnectBtn').addEventListener('click', disconnectWallet);
}

function updateTierBadge(tier) {
  userTier = tier;
  elements.tierBadge.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
  elements.tierBadge.className = 'tier-badge ' + tier;
}

async function connectWallet() {
  try {
    // Open the web app in a new tab for wallet connection
    // The user will connect their wallet there and we can get it from storage
    const tab = await chrome.tabs.create({
      url: `https://fundtracer.xyz/app-${selectedChain}`,
      active: true
    });
    
    // Listen for message from the opened tab
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (message.type === 'WALLET_CONNECTED' && sender.tab?.id === tab.id) {
        connectedWallet = message.address;
        chrome.storage.local.set({ connectedWallet });
        updateWalletDisplay(connectedWallet);
        chrome.storage.local.get(['userTier'], (data) => {
          if (data.userTier) updateTierBadge(data.userTier);
        });
      }
    });
  } catch (error) {
    showError('Failed to connect wallet: ' + error.message);
  }
}

async function disconnectWallet() {
  connectedWallet = null;
  await chrome.storage.local.remove(['connectedWallet']);
  elements.walletSection.innerHTML = `
    <button class="btn-connect" id="connectBtn">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/>
        <polyline points="16 6 12 2 8 6"/>
        <line x1="12" y1="2" x2="12" y2="15"/>
      </svg>
      Connect Wallet
    </button>
  `;
  document.getElementById('connectBtn').addEventListener('click', connectWallet);
}

async function analyzeWallet() {
  let address = elements.walletInput.value.trim();
  
  // Use connected wallet if no input
  if (!address && connectedWallet) {
    address = connectedWallet;
  }
  
  if (!address) {
    showError('Please enter a wallet address');
    return;
  }
  
  // Validate address
  if (selectedChain === 'evm' && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    showError('Invalid EVM address format');
    return;
  }
  
  if (selectedChain === 'solana' && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    showError('Invalid Solana address format');
    return;
  }
  
  hideError();
  showLoading(true);
  
  try {
    const endpoint = selectedChain === 'evm' 
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
    displayResults(data);
    
  } catch (error) {
    showError(error.message || 'Analysis failed. Please try again.');
  } finally {
    showLoading(false);
  }
}

function displayResults(data) {
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
  const balance = data.wallet?.balanceInEth || data.balance || 0;
  elements.balance.textContent = `${balance.toFixed(4)} ${selectedChain === 'evm' ? 'ETH' : 'SOL'}`;
  
  // Store last analysis for full results
  chrome.storage.local.set({
    lastAnalysis: {
      address: elements.walletInput.value,
      chain: selectedChain,
      data
    }
  });
}

function openFullResults() {
  const address = elements.walletInput.value || connectedWallet;
  if (address) {
    chrome.tabs.create({
      url: `https://fundtracer.xyz/app-${selectedChain}?address=${address}`
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
