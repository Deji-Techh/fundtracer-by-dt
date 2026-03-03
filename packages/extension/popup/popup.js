// FundTracer Extension Popup
const API_BASE = 'https://fundtracer.xyz/api';

const chains = {
  ethereum: { name: 'Ethereum', symbol: 'ETH', id: 1 },
  linea: { name: 'Linea', symbol: 'ETH', id: 59144 },
  arbitrum: { name: 'Arbitrum', symbol: 'ETH', id: 42161 },
  base: { name: 'Base', symbol: 'ETH', id: 8453 },
  optimism: { name: 'Optimism', symbol: 'ETH', id: 10 },
  polygon: { name: 'Polygon', symbol: 'MATIC', id: 137 },
};

// State
let state = {
  chain: 'ethereum',
  apiKey: '',
  address: '',
};

// DOM Elements
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupEventListeners();
  updateUI();
});

function loadState() {
  chrome.storage.local.get(['selectedChain', 'apiKey', 'lastAddress'], (data) => {
    if (data.selectedChain && chains[data.selectedChain]) {
      state.chain = data.selectedChain;
    }
    if (data.apiKey) {
      state.apiKey = data.apiKey;
    }
    if (data.lastAddress) {
      state.address = data.lastAddress;
      $('#addressInput').value = data.lastAddress;
      $('#clearBtn').style.display = data.lastAddress ? 'block' : 'none';
    }
    updateChainTabs();
    updateSettingsUI();
  });
}

function setupEventListeners() {
  // Chain tabs
  $$('.chain-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.chain = tab.dataset.chain;
      chrome.storage.local.set({ selectedChain: state.chain });
      updateChainTabs();
    });
  });

  // Search
  $('#addressInput').addEventListener('input', (e) => {
    state.address = e.target.value;
    $('#clearBtn').style.display = state.address ? 'block' : 'none';
  });

  $('#addressInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') analyze();
  });

  $('#analyzeBtn').addEventListener('click', analyze);
  $('#clearBtn').addEventListener('click', () => {
    state.address = '';
    $('#addressInput').value = '';
    $('#clearBtn').style.display = 'none';
    $('#addressInput').focus();
  });

  // Settings
  $('#settingsBtn').addEventListener('click', toggleSettings);
  $('#closeSettings').addEventListener('click', toggleSettings);
  
  $('#saveKeyBtn').addEventListener('click', () => {
    const key = $('#apiKeyInput').value.trim();
    if (key) {
      state.apiKey = key;
      chrome.storage.local.set({ apiKey: key });
      showMessage('API key saved', 'success');
      toggleSettings();
    }
  });

  $('#defaultChain').addEventListener('change', (e) => {
    state.chain = e.target.value;
    chrome.storage.local.set({ selectedChain: state.chain });
    updateChainTabs();
    toggleSettings();
  });

  // View full
  $('#viewFullBtn').addEventListener('click', () => {
    if (state.address) {
      const url = state.chain === 'ethereum' || chains[state.chain]?.id === 1
        ? `https://fundtracer.xyz/app-evm?address=${state.address}`
        : `https://fundtracer.xyz/app-evm?chain=${state.chain}&address=${state.address}`;
      chrome.tabs.create({ url });
    }
  });

  // API link
  $('#getApiLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://fundtracer.xyz/pricing' });
  });
}

function updateUI() {
  updateChainTabs();
  updateSettingsUI();
}

function updateChainTabs() {
  $$('.chain-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.chain === state.chain);
  });
  $('#defaultChain').value = state.chain;
}

function updateSettingsUI() {
  $('#apiKeyInput').value = state.apiKey ? '••••••••••••••••' : '';
  $('#defaultChain').value = state.chain;
}

function toggleSettings() {
  const panel = $('#settingsPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function showMessage(text, type = 'error') {
  const el = $('#errorState');
  $('#errorText').textContent = text;
  el.style.display = 'flex';
  if (type === 'success') {
    el.style.background = 'rgba(16, 185, 129, 0.1)';
    el.style.borderColor = 'rgba(16, 185, 129, 0.2)';
    el.style.color = 'var(--success)';
  }
  setTimeout(() => {
    el.style.display = 'none';
    el.style.background = '';
    el.style.borderColor = '';
    el.style.color = '';
  }, 3000);
}

async function analyze() {
  const address = state.address.trim();
  
  if (!address) {
    showMessage('Enter a wallet address');
    return;
  }

  // Validate address
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    showMessage('Invalid EVM address');
    return;
  }

  // Save address
  chrome.storage.local.set({ lastAddress: address });

  // Show loading
  $('#loadingState').style.display = 'flex';
  $('#errorState').style.display = 'none';
  $('#results').style.display = 'none';
  $('#emptyState').style.display = 'none';
  $('#analyzeBtn').disabled = true;

  try {
    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(state.apiKey ? { 'Authorization': `Bearer ${state.apiKey}` } : {})
      },
      body: JSON.stringify({
        address,
        chain: state.chain,
        includeFundingTrace: true,
        includeSybilAnalysis: true,
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('API key required');
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Analysis failed');
    }

    const data = await response.json();
    displayResults(data);

  } catch (error) {
    console.error('Analysis error:', error);
    $('#errorText').textContent = error.message;
    $('#errorState').style.display = 'flex';
    $('#emptyState').style.display = 'none';
  } finally {
    $('#loadingState').style.display = 'none';
    $('#analyzeBtn').disabled = false;
  }
}

function displayResults(data) {
  const chainInfo = chains[state.chain];
  
  // Risk
  const risk = data.riskLevel || data.risk?.level || 'low';
  const riskEl = $('#riskValue');
  riskEl.textContent = risk.charAt(0).toUpperCase() + risk.slice(1);
  riskEl.className = 'risk-value ' + risk;

  // Stats
  $('#sybilScore').textContent = (data.sybilScore || data.sybil?.score || 0) + '%';
  $('#txCount').textContent = (data.totalTransactions || data.summary?.totalTransactions || 0).toLocaleString();
  
  const balance = data.wallet?.balanceInEth || data.balance || 0;
  $('#balance').textContent = balance.toFixed(4) + ' ' + (chainInfo?.symbol || 'ETH');

  const firstTx = data.wallet?.firstTxTimestamp || data.firstTxTimestamp;
  if (firstTx) {
    const date = new Date(firstTx * 1000);
    $('#firstTx').textContent = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } else {
    $('#firstTx').textContent = '-';
  }

  $('#results').style.display = 'flex';
  $('#emptyState').style.display = 'none';
  $('#errorState').style.display = 'none';
}
