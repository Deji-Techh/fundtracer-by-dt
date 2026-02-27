// ============================================================
// FundTracer by DT - Solana API Functions
// Frontend API for Solana wallet analysis
// ============================================================

const HELIUS_KEYS = [
  '77de5802-5beb-4647-bfbb-0ba215d47c81',
  'b81bcc20-7710-40dc-b0f3-0865c03a8a1d',
  'deae0411-c969-41ff-9420-f1a0f59d5639',
];

let keyIndex = 0;

function getHeliusKey(): string {
  const key = HELIUS_KEYS[keyIndex % HELIUS_KEYS.length];
  keyIndex++;
  return key;
}

function isValidSolanaAddress(address: string): boolean {
  try {
    if (!address) return false;
    if (address.length < 32 || address.length > 44) return false;
    const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    return [...address].every(c => base58Chars.includes(c));
  } catch {
    return false;
  }
}

export async function analyzeSolanaWallet(address: string) {
  if (!isValidSolanaAddress(address)) {
    throw new Error('Invalid Solana address');
  }

  const [walletInfo, transactions, tokenBalances] = await Promise.all([
    getWalletInfo(address),
    getTransactions(address),
    getTokenBalances(address),
  ]);

  return {
    walletInfo,
    transactions,
    tokenBalances,
    riskScore: calculateRiskScore(walletInfo, transactions),
  };
}

async function getWalletInfo(address: string) {
  const key = getHeliusKey();
  const url = `https://mainnet.helius-rpc.com/?api-key=${key}`;
  
  const [balanceRes, accountRes, sigsRes] = await Promise.all([
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
    }).then(r => r.json()),
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAccountInfo', params: [address, { encoding: 'jsonParsed' }] }),
    }).then(r => r.json()),
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [address, { limit: 1 }] }),
    }).then(r => r.json()),
  ]);

  const isProgram = accountRes.value?.executable ?? false;
  const firstTx = sigsRes.value?.[0];

  return {
    address,
    chain: { type: 'solana', id: 'mainnet-beta', name: 'Solana' },
    balance: (balanceRes.value / 1e9).toString(),
    nativeSymbol: 'SOL',
    isContract: isProgram,
    firstSeen: firstTx?.blockTime ? firstTx.blockTime * 1000 : null,
    txCount: null,
    labels: [],
  };
}

async function getTransactions(address: string) {
  const key = getHeliusKey();
  const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${key}&limit=100`;

  try {
    const txs = await fetch(url).then(r => r.json());
    return txs.map((tx: any) => ({
      hash: tx.signature,
      from: tx.nativeTransfers?.[0]?.fromUserAccount || tx.feePayer || '',
      to: tx.nativeTransfers?.[0]?.toUserAccount || '',
      value: ((tx.nativeTransfers?.[0]?.amount || 0) / 1e9).toString(),
      timestamp: tx.timestamp * 1000,
      fee: (tx.fee / 1e9).toString(),
      feePayer: tx.feePayer,
      status: tx.transactionError ? 'failed' : 'success',
      chain: { type: 'solana', id: 'mainnet-beta', name: 'Solana' },
      tokenTransfers: [],
    }));
  } catch {
    return [];
  }
}

async function getTokenBalances(address: string) {
  const key = getHeliusKey();
  const url = `https://mainnet.helius-rpc.com/?api-key=${key}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'token-balances',
        method: 'searchAssets',
        params: {
          ownerAddress: address,
          tokenType: 'fungible',
          displayOptions: { showNativeBalance: true },
        },
      }),
    }).then(r => r.json());

    return response.result?.items?.map((item: any) => ({
      address: item.id,
      symbol: item.content?.metadata?.symbol || 'UNKNOWN',
      name: item.content?.metadata?.name || '',
      balance: item.token_info?.balance || '0',
      decimals: item.token_info?.decimals || 0,
      price: item.token_info?.price_info?.price_per_token || null,
      chain: { type: 'solana', id: 'mainnet-beta', name: 'Solana' },
    })) || [];
  } catch {
    return [];
  }
}

function calculateRiskScore(walletInfo: any, transactions: any[]) {
  const signals: any[] = [];
  let totalScore = 0;

  if (walletInfo.firstSeen) {
    const age = Date.now() - walletInfo.firstSeen;
    const isNew = age < 30 * 24 * 60 * 60 * 1000;
    signals.push({
      id: 'sol_new_wallet',
      name: 'Wallet Created Recently',
      weight: 10,
      detected: isNew,
      severity: 'medium',
    });
    if (isNew) totalScore += 10;
  }

  const balance = parseFloat(walletInfo.balance);
  if (balance < 0.01) {
    signals.push({
      id: 'sol_low_balance',
      name: 'Near-Zero SOL Balance',
      weight: 5,
      detected: true,
      severity: 'low',
    });
    totalScore += 5;
  }

  const externalFeePayers = transactions.filter(tx => tx.feePayer && tx.feePayer !== walletInfo.address);
  if (externalFeePayers.length > transactions.length * 0.5) {
    signals.push({
      id: 'sol_external_fee_payer',
      name: 'External Fee Payer Detected',
      weight: 20,
      detected: true,
      severity: 'high',
    });
    totalScore += 20;
  }

  return {
    score: Math.max(0, Math.min(100, totalScore)),
    signals,
    chain: { type: 'solana', id: 'mainnet-beta', name: 'Solana' },
  };
}

export async function getSolanaFundingTree(address: string) {
  return { root: address, nodes: [], edges: [], ultimateSource: null };
}

export async function detectSolanaSybil(addresses: string[]) {
  return [];
}
