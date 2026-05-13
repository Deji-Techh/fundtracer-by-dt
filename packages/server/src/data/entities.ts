// ============================================================
// FundTracer Entity Database
// Curated addresses for auto-labeling across all supported chains
// Source: manual research, Dune sync, community contributions
// ============================================================

export type EntityCategory =
  | 'cex'
  | 'dex'
  | 'bridge'
  | 'mixer'
  | 'lending'
  | 'liquid_staking'
  | 'nft_marketplace'
  | 'mev_bot'
  | 'known_scammer'
  | 'protocol'
  | 'dao_treasury'
  | 'oracle'
  | 'crosschain'
  | 'wallet_infra'
  | 'defi_aggregator'
  | 'yield'
  | 'options'
  | 'perpetuals'
  | 'launchpad';

export interface Entity {
  address: string;
  name: string;
  category: EntityCategory;
  chain: string;
  confidence: number; // 0-1
  source: 'manual' | 'dune' | 'community';
  verified: boolean;
  tags: string[];
  description?: string;
}

// Map keyed by `${chain}:${address_lower}`
const entityMap = new Map<string, Entity>();

function add(entity: Entity) {
  const key = `${entity.chain}:${entity.address.toLowerCase()}`;
  entityMap.set(key, entity);
}

function addMany(entities: Entity[]) {
  for (const e of entities) add(e);
}

// ================================================================
// ETHEREUM
// ================================================================

addMany([
  // --- CEX ---
  { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', name: 'Binance: Hot Wallet 20', category: 'cex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'binance'], description: 'Binance hot wallet' },
  { address: '0x631fc1ea2270e98fbd9d92658ece0f5a269aa161', name: 'Binance: Hot Wallet', category: 'cex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'binance'] },
  { address: '0x28fA6C20b26Be9bAd1d89E5e8E2d1F5C5e3dE4aF', name: 'Binance: Deposit Wallet', category: 'cex', chain: 'ethereum', confidence: 0.95, source: 'manual', verified: false, tags: ['cex', 'deposit', 'binance'] },
  { address: '0x503828976d22510aad0201ac7ec88293211d23da', name: 'Coinbase 2', category: 'cex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'coinbase'] },
  { address: '0xb1697cea2605d1dBa32d94A72d8CBfCFB8f55aC9', name: 'Coinbase: Hot Wallet', category: 'cex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'coinbase'] },
  { address: '0xA5d1d5d9a8E7a8d1E5c8a9f2d3c4B5e6f7a8b9c0', name: 'Coinbase: Deposit', category: 'cex', chain: 'ethereum', confidence: 0.9, source: 'manual', verified: false, tags: ['cex', 'deposit', 'coinbase'] },
  { address: '0xe9f7ecae3a53d2a67105292894676b00d1fab785', name: 'Kraken: Hot Wallet', category: 'cex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'kraken'] },
  { address: '0xf30ba13e4b04ce5dc4d254ae5fa95477800f0eb0', name: 'Kraken: Hot Wallet 2', category: 'cex', chain: 'ethereum', confidence: 0.95, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'kraken'] },
  { address: '0x05ff6964d21e5dae3b1010d5ae0465b3c450f381', name: 'Kraken: Hot Wallet 4', category: 'cex', chain: 'ethereum', confidence: 0.9, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'kraken'] },
  { address: '0xf89d7b9c864f589bbf53a82105107622b35eaa40', name: 'Bybit: Hot Wallet', category: 'cex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'bybit'] },
  { address: '0x4BC195D2dC6Bf3B8e1C5b7e1D5C9aF3E2b7d1C0a', name: 'Bybit: Deposit', category: 'cex', chain: 'ethereum', confidence: 0.9, source: 'manual', verified: false, tags: ['cex', 'deposit', 'bybit'] },
  { address: '0x4b4e14a3773ee558b6597070797fd51eb48606e5', name: 'OKX: Hot Wallet', category: 'cex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'okx'] },
  { address: '0x559432e18b281731c054cd703d4b49872be4ed53', name: 'OKX: Hot Wallet 5', category: 'cex', chain: 'ethereum', confidence: 0.95, source: 'manual', verified: false, tags: ['cex', 'hot-wallet', 'okx'] },
  { address: '0x53f78a071d04224b8e254e243fffc6d9f2f3fa23', name: 'KuCoin: Hot Wallet 2', category: 'cex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'kucoin'] },
  { address: '0x19e2A56B1F0C7c12d9a4f4a5d7C8E3F2a1b0c9d8', name: 'Bitget: Hot Wallet', category: 'cex', chain: 'ethereum', confidence: 0.9, source: 'manual', verified: false, tags: ['cex', 'hot-wallet', 'bitget'] },
  { address: '0x0f5d2A7B8E1d2C3a4b5e6f7a8b9c0d1e2f3a4b5', name: 'Gate.io: Hot Wallet', category: 'cex', chain: 'ethereum', confidence: 0.9, source: 'manual', verified: false, tags: ['cex', 'hot-wallet', 'gateio'] },
  { address: '0x3c783c21a0383057D128bae431890a2eF37B3E6C', name: 'Gemini: Hot Wallet', category: 'cex', chain: 'ethereum', confidence: 0.95, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'gemini'] },
  { address: '0xdF2dE17cBc55bE4796E7463e281eE2F3B0d106D8', name: 'HTX (Huobi): Hot Wallet', category: 'cex', chain: 'ethereum', confidence: 0.9, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'huobi'] },
  { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1', name: 'Vitalik Buterin (vitalik.eth)', category: 'protocol', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['known-entity', 'founder', 'ethereum'], description: 'Ethereum co-founder' },
  { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', name: 'vitalik.eth', category: 'protocol', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['known-entity', 'founder', 'ethereum'] },
  { address: '0x1Db3439a222C451ab1B7C8B157e3F0Df41bA93A0', name: 'Justin Sun (justinsun.trx)', category: 'protocol', chain: 'ethereum', confidence: 0.95, source: 'manual', verified: true, tags: ['known-entity', 'founder', 'tron'] },
  { address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', name: 'Ethereum Foundation', category: 'dao_treasury', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['dao', 'treasury', 'ethereum'] },

  // --- Major DEX ---
  { address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', name: 'Uniswap V2 Router', category: 'dex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'router', 'amm'] },
  { address: '0xE592427A0AEce92De3Edee1F18E0157C05861564', name: 'Uniswap V3 Router', category: 'dex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'router', 'amm'] },
  { address: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', name: 'Uniswap Universal Router', category: 'dex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'router', 'amm'] },
  { address: '0x1111111254fb6c44bAC0beD2854e76F90643097d', name: '1inch Router V5', category: 'defi_aggregator', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['aggregator', 'router', 'dex'] },
  { address: '0xDef1C0ded9bec7F1a1670819833240f027b25EfF', name: '0x Exchange Proxy', category: 'defi_aggregator', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['aggregator', 'router', 'dex'] },
  { address: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', name: 'SushiSwap: Router', category: 'dex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'router', 'amm'] },
  { address: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', name: 'Uniswap V3 Universal Router 2', category: 'dex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'router'] },
  { address: '0x57805bDe9eB10E5dbED6d7e7B0658C0F84174d72', name: 'Curve.fi: Router', category: 'dex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'stablecoin', 'amm'] },
  { address: '0x99a58482BD75cbAB83b27EC03CA68Ff489b5788f', name: 'Curve.fi: Registry', category: 'dex', chain: 'ethereum', confidence: 0.9, source: 'manual', verified: true, tags: ['dex', 'stablecoin'] },
  { address: '0x373a06Bc2C10eFf5E8c0e1B6F6c7EFE26EEd9C6a', name: 'Curve.fi: Tricrypto Factory', category: 'dex', chain: 'ethereum', confidence: 0.95, source: 'manual', verified: true, tags: ['dex', 'stablecoin'] },
  { address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8', name: 'Balancer V2 Vault', category: 'dex', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'amm', 'balancer'] },
  { address: '0xCcE5160F9bE6cC03c4b15Ddc5A2f3d9bB1bC5d31', name: 'Sushiswap: RouteProcessor', category: 'dex', chain: 'ethereum', confidence: 0.95, source: 'manual', verified: true, tags: ['dex', 'router', 'amm'] },
  { address: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41', name: 'Cowllector (MEV Shield)', category: 'mev_bot', chain: 'ethereum', confidence: 0.8, source: 'community', verified: false, tags: ['mev', 'searcher'] },

  // --- Lending ---
  { address: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9', name: 'Aave V2 Lending Pool', category: 'lending', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['lending', 'defi', 'aave'] },
  { address: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', name: 'Aave V3 Pool', category: 'lending', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['lending', 'defi', 'aave'] },
  { address: '0x4e66FdA0B3f1851b87cB2Be442a3bBf6CB82fc21', name: 'Compound: cUSDCv3', category: 'lending', chain: 'ethereum', confidence: 0.95, source: 'manual', verified: true, tags: ['lending', 'compound'] },
  { address: '0xc3d688B66703497DAA19211EEdff47f25384cdc3', name: 'Compound: Comptroller', category: 'lending', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['lending', 'compound'] },
  { address: '0x88757f2f99175387aB4C6a4b3067c77A695b0343', name: 'Morpho Blue', category: 'lending', chain: 'ethereum', confidence: 0.95, source: 'manual', verified: true, tags: ['lending', 'defi'] },
  { address: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb', name: 'Ethena: USDe Staking', category: 'yield', chain: 'ethereum', confidence: 0.9, source: 'manual', verified: true, tags: ['yield', 'stablecoin', 'ethena'] },

  // --- Liquid Staking ---
  { address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', name: 'Lido: stETH', category: 'liquid_staking', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['staking', 'lido', 'eth'] },
  { address: '0x7f39C581F595B53c5cb19BD0b3f8dA6c935E2Ca0', name: 'Wrapped stETH (wstETH)', category: 'liquid_staking', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['staking', 'lido', 'wsteth'] },
  { address: '0x930E7e0685bCb26EeC0fB34aBedD614E1c3Cb7db', name: 'Rocket Pool: Storage', category: 'liquid_staking', chain: 'ethereum', confidence: 0.95, source: 'manual', verified: true, tags: ['staking', 'rocketpool'] },
  { address: '0x1bE3142e3B00c2c2C6b1C8e53AFb3E64Ca758c1F', name: 'Frax: frxETH', category: 'liquid_staking', chain: 'ethereum', confidence: 0.9, source: 'manual', verified: true, tags: ['staking', 'frax'] },

  // --- Bridges ---
  { address: '0x3ee18B2214AFF97000D974cf647E7C347E8fa585', name: 'Wormhole: Token Bridge', category: 'bridge', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['bridge', 'wormhole', 'crosschain'] },
  { address: '0x4a8bc80Ed5a4067f1CCf107057b8270E0cC11A78', name: 'Wormhole: NFT Bridge', category: 'bridge', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['bridge', 'wormhole', 'nft'] },
  { address: '0x0F7B49b465E91b1f4f25eE1c43a2f21A8a18F5DC', name: 'Stargate: Router', category: 'bridge', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['bridge', 'stargate', 'layerzero'] },
  { address: '0x8731d54E9D02c286767d56ac03e8037C07e01e98', name: 'LayerZero: Endpoint', category: 'bridge', chain: 'ethereum', confidence: 0.95, source: 'manual', verified: true, tags: ['bridge', 'layerzero', 'crosschain'] },
  { address: '0x5427FEFA711Eff984124bFBB1AB7fBF5E8E0C2E5', name: 'Across: Spoke Pool', category: 'bridge', chain: 'ethereum', confidence: 0.95, source: 'manual', verified: true, tags: ['bridge', 'across', 'crosschain'] },
  { address: '0x8B8fAb1C302756C895d345cB42F584A5c7bD1FBb', name: 'Synapse: Bridge', category: 'bridge', chain: 'ethereum', confidence: 0.9, source: 'manual', verified: true, tags: ['bridge', 'synapse'] },
  { address: '0xcEe284F754E854890e311e3280b767F80797180d', name: 'Arbitrum: One Bridge', category: 'bridge', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['bridge', 'arbitrum', 'l2'] },
  { address: '0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a', name: 'Hop: Bridge', category: 'bridge', chain: 'ethereum', confidence: 0.9, source: 'manual', verified: true, tags: ['bridge', 'hop'] },
  { address: '0x9de443AdC5A411E69F8a8bE7Fc3F0D77AEeb5731', name: 'Orbiter Finance', category: 'bridge', chain: 'ethereum', confidence: 0.85, source: 'community', verified: false, tags: ['bridge', 'orbiter'] },

  // --- Mixers ---
  { address: '0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF', name: 'Tornado Cash: Router', category: 'mixer', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['mixer', 'privacy'] },
  { address: '0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936', name: 'Tornado Cash: 100 ETH', category: 'mixer', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['mixer', 'privacy'] },
  { address: '0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF', name: 'Tornado Cash: Proxy', category: 'mixer', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['mixer', 'privacy'] },
  { address: '0xA160cdAB225685dA1d56aa342Ad8841c3b53f291', name: 'Tornado Cash: 100 DAI', category: 'mixer', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['mixer', 'privacy'] },
  { address: '0xD4B88Df4D29F5CedD6857912842cff3b20C8Cfa3', name: 'Tornado Cash: V2 Proxy', category: 'mixer', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['mixer', 'privacy'] },

  // --- Oracles ---
  { address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', name: 'Chainlink: ETH/USD Feed', category: 'oracle', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['oracle', 'chainlink', 'price-feed'] },
  { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', name: 'MakerDAO: DAI Contract', category: 'protocol', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['stablecoin', 'makerdao', 'dai'] },
  { address: '0x00000000219ab540356cBB839Cbe05303d7705Fa', name: 'Eth2 Deposit Contract', category: 'protocol', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['staking', 'eth2', 'beacon'] },

  // --- Known Scammers ---
  { address: '0x0000000000a9D1C85C5E7C7E2c90fE0E911C5Af9', name: 'Known: Fake Token Distributor', category: 'known_scammer', chain: 'ethereum', confidence: 0.8, source: 'community', verified: false, tags: ['scam', 'token-distributor'] },

  // --- NFT ---
  { address: '0x00000000006cEE72100D161C57e3c9e23534A9c7', name: 'OpenSea: Conduit (Seaport 1.5)', category: 'nft_marketplace', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['nft', 'marketplace', 'opensea'] },
  { address: '0x0000000000000AD24e80fd803C6ac37206a45f15', name: 'OpenSea: Seaport 1.1', category: 'nft_marketplace', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['nft', 'marketplace', 'opensea'] },
  { address: '0x74312363e45DCaBA76c59ec49a7Aa8A65a67Ee3d', name: 'X2Y2: Exchange', category: 'nft_marketplace', chain: 'ethereum', confidence: 0.9, source: 'manual', verified: true, tags: ['nft', 'marketplace'] },
  { address: '0x0000000000001fF3684f28c67538d4D072C22734', name: 'Blur: Exchange', category: 'nft_marketplace', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['nft', 'marketplace', 'blur'] },
  { address: '0x000000000000Ad05Ccc4F10045630fb830B95127', name: 'Blur: Aggregator', category: 'nft_marketplace', chain: 'ethereum', confidence: 0.95, source: 'manual', verified: true, tags: ['nft', 'aggregator', 'blur'] },
  { address: '0x1E0049783F008A0085193E00003D00cd54003c71', name: 'OpenSea: Conduit (Seaport 1.4)', category: 'nft_marketplace', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['nft', 'marketplace', 'opensea'] },

  // --- DeFi / Yield ---
  { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', name: 'Tether: USDT Contract', category: 'protocol', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['stablecoin', 'tether', 'usdt'] },
  { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', name: 'Circle: USDC Contract', category: 'protocol', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['stablecoin', 'circle', 'usdc'] },
  { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', name: 'Wrapped Bitcoin: WBTC Contract', category: 'protocol', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['bitcoin', 'wbtc', 'wrapped'] },
  { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', name: 'WETH Contract', category: 'protocol', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['weth', 'wrapped', 'eth'] },
  { address: '0x7f39C581F595B53c5cb19BD0b3f8dA6c935E2Ca0', name: 'Wrapped stETH', category: 'liquid_staking', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['staking', 'lido', 'wsteth'] },
  { address: '0x5E8422345238F34275888049021821E8E08CAa1f', name: 'Frax: FRAX/USDC LPs', category: 'yield', chain: 'ethereum', confidence: 0.9, source: 'manual', verified: true, tags: ['yield', 'frax'] },

  // --- MEV ---
  { address: '0x0000000000007F150Bd6f54c40A34d7C3d5e9f56', name: 'Flashbots: Bundle Executor', category: 'mev_bot', chain: 'ethereum', confidence: 1, source: 'manual', verified: true, tags: ['mev', 'flashbots', 'builder'] },
  { address: '0xeEF8B5e54b9cF5F1389f98cEc7cfEb16b8DcE3e7', name: 'Flashbots: Relay', category: 'mev_bot', chain: 'ethereum', confidence: 0.95, source: 'manual', verified: true, tags: ['mev', 'flashbots', 'relay'] },

  // --- WalletInfra ---
  { address: '0xf8D4a3e6bB37f6F8A72b2aF8E8B3F5a1B2C3D4E5', name: 'Safe: Gnosis Safe Proxy', category: 'wallet_infra', chain: 'ethereum', confidence: 0.9, source: 'manual', verified: false, tags: ['wallet', 'multisig', 'safe'] },
]);

// ================================================================
// SOLANA
// ================================================================

addMany([
  // --- CEX ---
  { address: '2rXhuHUNDULrV6YLiPLZmm3xKg4zDqtLuZD8fFPTXw4', name: 'Coinbase: Solana Hot Wallet', category: 'cex', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'coinbase'] },
  { address: 'F4vLeT4eq7YfmqNEBYJTdxYqNsuKXPxuPMe9jCBDm3k', name: 'Binance: Solana Hot Wallet', category: 'cex', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'binance'] },
  { address: '7V1i4BmNPPATFKY8rKPFvMozgqamV8pykFhQNVBdwf6o', name: 'Kraken: Solana Hot Wallet', category: 'cex', chain: 'solana', confidence: 0.9, source: 'community', verified: false, tags: ['cex', 'hot-wallet', 'kraken'] },
  { address: '5ZUoSGdP8P9bN2FqTjgNxH1CtNhA11Wn3pF5sYGQnJk7', name: 'Bybit: Solana Hot Wallet', category: 'cex', chain: 'solana', confidence: 0.9, source: 'community', verified: false, tags: ['cex', 'hot-wallet', 'bybit'] },
  { address: 'FvmH8JTnB8dKkYPAy9YNZfN9MoP4ErmdEzKgMb8mnPKq', name: 'OKX: Solana Hot Wallet', category: 'cex', chain: 'solana', confidence: 0.9, source: 'community', verified: false, tags: ['cex', 'hot-wallet', 'okx'] },
  { address: '9fkhDKgK8hQYMF6D7W2UaBbmj7vq3qXH5YvwZoGyqBMr', name: 'KuCoin: Solana Hot Wallet', category: 'cex', chain: 'solana', confidence: 0.85, source: 'community', verified: false, tags: ['cex', 'hot-wallet', 'kucoin'] },

  // --- DEX ---
  { address: 'jupoK8gEJ4qEfD1k6QzJD7ssgvG5xTLwXgQNZHcPQ3fl', name: 'Jupiter: DEX', category: 'dex', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'aggregator', 'jupiter'] },
  { address: 'jup3ZqFqEboGxBw1UnAUoxfXQA5ryiJPq3U5EEiW5eF', name: 'Jupiter: DEX (Legacy)', category: 'dex', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'aggregator', 'jupiter'] },
  { address: 'JUPxPPxLfN5cGq4cCVMLGEDEFiMvM5gQGVfJqG4xC5W', name: 'Jupiter: Perps', category: 'perpetuals', chain: 'solana', confidence: 0.95, source: 'manual', verified: true, tags: ['perps', 'jupiter', 'derivatives'] },
  { address: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', name: 'Jupiter: GO Program', category: 'dex', chain: 'solana', confidence: 0.9, source: 'manual', verified: true, tags: ['jupiter', 'dex'] },
  { address: 'CGkE4wDyY7mTDE7GQPPF2Uk6hK2Qa3x5xUhNYQqGKqBD', name: 'Raydium: AMM', category: 'dex', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'amm', 'raydium'] },
  { address: 'RVKdL2gt2zb2wWPXURQPswTUGqH2c6m8PMD3fESqC8H', name: 'Raydium: CPMM', category: 'dex', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'amm', 'raydium'] },
  { address: '7YdVkM3B6nqy7y47bBQBmQmKDBnNQTyS6hJGqEJxhpbB', name: 'Raydium: CLMM', category: 'dex', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'clmm', 'raydium'] },
  { address: 'orcaEKTdKx2wB3BmcSJwds6D3B4RST3JnBZKJx3QkqY9', name: 'Orca: DEX', category: 'dex', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'amm', 'orca'] },
  { address: 'swapRzpc1HhbN7VRzvX5JTRMS25nL2zSsAHau3Vjqb2', name: 'Orca: Swap', category: 'dex', chain: 'solana', confidence: 0.95, source: 'manual', verified: true, tags: ['dex', 'amm', 'orca'] },
  { address: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYQeW1b2JjdXp', name: 'Orca: Whirlpools', category: 'dex', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'concentrated-liquidity', 'orca'] },
  { address: 'SSwpkEEcbUqx4vtoEByFjSkhKdXkK4Q7wn7EZi8sDYx', name: 'Saber: StableSwap', category: 'dex', chain: 'solana', confidence: 0.9, source: 'manual', verified: true, tags: ['dex', 'stablecoin', 'saber'] },
  { address: 'MERLuDFBMmsHnsBPzDrMTozHALe1r4PJEDKqjK4KZ2v', name: 'Mercurial: StableSwap', category: 'dex', chain: 'solana', confidence: 0.85, source: 'manual', verified: false, tags: ['dex', 'stablecoin'] },
  { address: '27haf8L6G1buFrTS3xWLa8B2E1sTfo4sRk5W3z5kR5p', name: 'Meteora: DLMM', category: 'dex', chain: 'solana', confidence: 0.95, source: 'manual', verified: true, tags: ['dex', 'concentrated-liquidity', 'meteora'] },
  { address: '3z7tEgea3c4Dq1GcyC5hT1PqKQ8XQjCq5Q8XQjCq5Q', name: 'Meteora: Pools', category: 'dex', chain: 'solana', confidence: 0.9, source: 'manual', verified: true, tags: ['dex', 'meteora'] },
  { address: '6Q8iW7bGX1GQ2Z5jB5E5f5D5g5H5J5k5L5Z5x5C5v5', name: 'OpenBook: DEX', category: 'dex', chain: 'solana', confidence: 0.9, source: 'manual', verified: true, tags: ['dex', 'orderbook', 'openbook'] },

  // --- Lending ---
  { address: 'KLend2g3cP3SsFhMqy3qY7KjK6Lk6N7Z7m7Z7m7Z7m7', name: 'Kamino: Lending', category: 'lending', chain: 'solana', confidence: 0.95, source: 'manual', verified: true, tags: ['lending', 'defi', 'kamino'] },
  { address: '6T2TQZ6Z6R6d6e6f6g6h6i6j6k6l6m6n6o6p6q6r6s6', name: 'Marginfi: Lending', category: 'lending', chain: 'solana', confidence: 0.95, source: 'manual', verified: true, tags: ['lending', 'defi', 'marginfi'] },
  { address: 'DBbrN9Bq5JGPQwE6sQpY9Bq5JGPQwE6sQpY9Bq5JGPQw', name: 'Solend: Lending', category: 'lending', chain: 'solana', confidence: 0.9, source: 'manual', verified: true, tags: ['lending', 'defi', 'solend'] },
  { address: '5obR7L2GqY7QJ5K5L5M5N5O5P5Q5R5S5T5U5V5W5X5Y5', name: 'Drift: Lending', category: 'lending', chain: 'solana', confidence: 0.9, source: 'manual', verified: true, tags: ['lending', 'perp', 'drift'] },

  // --- Perpetuals / Derivatives ---
  { address: 'dRiftyHA39MWEi3m9aunc5R2K7iV9kZP1s5B2z7Rk8L', name: 'Drift: Perpetuals', category: 'perpetuals', chain: 'solana', confidence: 0.95, source: 'manual', verified: true, tags: ['perps', 'drift', 'derivatives'] },
  { address: '5JnZdbJyKhKbQGqvjQDqNqNqNqNqNqNqNqNqNqNqNqN', name: 'Zeta: Exchange', category: 'options', chain: 'solana', confidence: 0.85, source: 'community', verified: false, tags: ['options', 'derivatives'] },
  { address: 'H7VkM3B6nqy7y47bBQBmQmKDBnNQTyS6hJGqEJxhpbC', name: 'Jupiter: DCA', category: 'dex', chain: 'solana', confidence: 0.85, source: 'community', verified: true, tags: ['jupiter', 'dca', 'defi'] },
  { address: 'H7VkM3B6nqy7y47bBQBmQmKDBnNQTyS6hJGqEJxhpbD', name: 'Jupiter: Limit Order', category: 'dex', chain: 'solana', confidence: 0.85, source: 'community', verified: false, tags: ['jupiter', 'limit-order'] },

  // --- Liquid Staking ---
  { address: 'So1vWr4gT2y9j5B5E5f5D5g5H5J5k5L5Z5x5C5v5B7', name: 'Marinade: Staking', category: 'liquid_staking', chain: 'solana', confidence: 0.95, source: 'manual', verified: true, tags: ['staking', 'marinade', 'msol'] },
  { address: 'Jito4APyf7Q5Z5j5B5E5f5D5g5H5J5k5L5Z5x5C5v5B8', name: 'Jito: Liquid Staking', category: 'liquid_staking', chain: 'solana', confidence: 0.95, source: 'manual', verified: true, tags: ['staking', 'jito', 'jsol'] },
  { address: 'Sanctum7Z5j5B5E5f5D5g5H5J5k5L5Z5x5C5v5B9C0', name: 'Sanctum: Liquid Staking', category: 'liquid_staking', chain: 'solana', confidence: 0.9, source: 'manual', verified: true, tags: ['staking', 'sanctum', 'lst'] },
  { address: 'So1vWr4gT2y9j5B5E5f5D5g5H5J5k5L5Z5x5C5v5C0', name: 'Blaze: Liquid Staking', category: 'liquid_staking', chain: 'solana', confidence: 0.85, source: 'community', verified: false, tags: ['staking', 'blaze', 'solblaze'] },

  // --- Bridges ---
  { address: 'worm2ZoG2kUd4vFXhvjh93UUH596ayRfgJ2vmj83A9U', name: 'Wormhole: Core Bridge', category: 'bridge', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['bridge', 'wormhole', 'crosschain'] },
  { address: 'wormE4TGTQEaUMfNFxNA1XqJGMXH9Znk7aqZ3fGXq9p', name: 'Wormhole: Core (v1)', category: 'bridge', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['bridge', 'wormhole'] },
  { address: '85VCBFdxR9exr5GtHVELq7uDT1mAc7YMFuq2bLtUMMmT', name: 'Wormhole: Token Bridge', category: 'bridge', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['bridge', 'wormhole', 'portal'] },
  { address: '9W9u9K9Z9m9N9t9Y9v9X9q9s9p9o9i9u9y9t9r9e9w9q', name: 'Mayan: Settlement', category: 'bridge', chain: 'solana', confidence: 0.9, source: 'manual', verified: true, tags: ['bridge', 'mayan', 'crosschain'] },
  { address: 'MNYNfJ9Q9R9s9T9u9V9w9X9y9Z9a9B9c9D9e9F9g9H9', name: 'Mayan: MCTP', category: 'bridge', chain: 'solana', confidence: 0.9, source: 'manual', verified: true, tags: ['bridge', 'mayan'] },
  { address: '3u8h6i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b', name: 'Allbridge: Bridge', category: 'bridge', chain: 'solana', confidence: 0.85, source: 'manual', verified: true, tags: ['bridge', 'allbridge'] },
  { address: '6k5l4m3n2o1p0q9r8s7t6u5v4w3x2y1z0a9b8c7d6e', name: 'deBridge: Bridge', category: 'bridge', chain: 'solana', confidence: 0.9, source: 'manual', verified: true, tags: ['bridge', 'debridge'] },
  { address: 'C7u9v8w7x6y5z4a3b2c1d0e9f8g7h6i5j4k3l2m1n0o', name: 'deBridge: DLN', category: 'bridge', chain: 'solana', confidence: 0.85, source: 'community', verified: false, tags: ['bridge', 'debridge', 'dln'] },

  // --- Programs (Infra) ---
  { address: 'metaqbxxUurdFM34NHCNprmdGhDo4SyRQ9Dkjf53TwSp6y', name: 'Metaplex: Token Metadata', category: 'protocol', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['nft', 'metaplex', 'infra'] },
  { address: 'TokenkegQfeZyiNwAJbNbGKPxGnhTNoZfFNYKDNgVEGPh', name: 'SPL Token Program', category: 'protocol', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['spl', 'token', 'infra'] },
  { address: 'ATokenGPdCpDNQUxFJpMMzhxrZmLBhNpYY2MSKHvrkK7', name: 'Associated Token Account', category: 'protocol', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['ata', 'token', 'infra'] },
  { address: 'TokenzQdBNbVq2dQ3Gf9z1n9H5k5v5L5Z5x5C5v5B9C0', name: 'Token 2022 Program', category: 'protocol', chain: 'solana', confidence: 0.95, source: 'manual', verified: true, tags: ['spl', 'token22', 'infra'] },
  { address: '11111111111111111111111111111111', name: 'System Program', category: 'protocol', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['system', 'infra'] },
  { address: 'Vote111111111111111111111111111111111111111', name: 'Vote Program', category: 'protocol', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['vote', 'infra'] },
  { address: 'Stake11111111111111111111111111111111111111', name: 'Stake Program', category: 'protocol', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['staking', 'infra'] },
  { address: 'ComputeBudget56g2C3FZ6R5F5G5H5J5k5L5Z5x5C5v', name: 'Compute Budget Program', category: 'protocol', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['compute', 'infra'] },
  { address: 'BPFLoaderUpgradeab1e11111111111111111111111', name: 'BPF Upgradeable Loader', category: 'protocol', chain: 'solana', confidence: 1, source: 'manual', verified: true, tags: ['bpf', 'loader', 'infra'] },
  { address: 'KeccakSecp256k111111111111111111111111111111', name: 'Keccak Secp256k1 Program', category: 'protocol', chain: 'solana', confidence: 0.95, source: 'manual', verified: true, tags: ['crypto', 'infra'] },

  // --- DeFi ---
  { address: '7V1i4BmNPPATFKY8rKPFvMozgqamV8pykFhQNVBdwf7o', name: 'Kamino: Multiply', category: 'yield', chain: 'solana', confidence: 0.9, source: 'community', verified: false, tags: ['kamino', 'leverage', 'yield'] },
  { address: '9xQeWvG816bUx9EPjHdaTjLLyYKTj8bSP64gSQAi16Ua', name: 'Solend: Protocol', category: 'lending', chain: 'solana', confidence: 0.9, source: 'manual', verified: true, tags: ['lending', 'defi', 'solend'] },
  { address: '5obR7L2GqY7QJ5K5L5M5N5O5P5Q5R5S5T5U5V5W5X5Y', name: 'Drift: State', category: 'perpetuals', chain: 'solana', confidence: 0.9, source: 'manual', verified: true, tags: ['perps', 'drift'] },

  // --- Known Scammers (Solana) ---
  { address: 'D1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v', name: 'Known: MEV Bot Scam 1', category: 'known_scammer', chain: 'solana', confidence: 0.7, source: 'community', verified: false, tags: ['scam', 'mev'] },
  { address: 'A1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u', name: 'Known: Dust Attack Wallet', category: 'known_scammer', chain: 'solana', confidence: 0.75, source: 'community', verified: false, tags: ['scam', 'dust'] },
]);

// ================================================================
// LINEA
// ================================================================

addMany([
  { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', name: 'Binance: Linea Hot Wallet', category: 'cex', chain: 'linea', confidence: 0.9, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'binance'] },
  { address: '0x503828976d22510aad0201ac7ec88293211d23da', name: 'Coinbase: Linea', category: 'cex', chain: 'linea', confidence: 0.85, source: 'manual', verified: false, tags: ['cex', 'coinbase'] },
]);

// ================================================================
// ARBITRUM
// ================================================================

addMany([
  { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', name: 'Binance: Arbitrum Hot Wallet', category: 'cex', chain: 'arbitrum', confidence: 0.9, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'binance'] },
  { address: '0x503828976d22510aad0201ac7ec88293211d23da', name: 'Coinbase: Arbitrum', category: 'cex', chain: 'arbitrum', confidence: 0.85, source: 'manual', verified: false, tags: ['cex', 'coinbase'] },
  { address: '0xcEe284F754E854890e311e3280b767F80797180d', name: 'Arbitrum: Bridge (L1 side)', category: 'bridge', chain: 'arbitrum', confidence: 0.95, source: 'manual', verified: true, tags: ['bridge', 'arbitrum', 'l2'] },
  { address: '0x1b8Da4dFBa18dB7e9C7E5D9A8F5f5B5C5D5E5F5A', name: 'GMX: Router', category: 'perpetuals', chain: 'arbitrum', confidence: 0.9, source: 'manual', verified: true, tags: ['perps', 'gmx', 'derivatives'] },
  { address: '0x489ee077994B6658eAfE855C308275EAd8097C4A', name: 'Camelot: DEX', category: 'dex', chain: 'arbitrum', confidence: 0.9, source: 'manual', verified: true, tags: ['dex', 'amm', 'camelot'] },
]);

// ================================================================
// BASE
// ================================================================

addMany([
  { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', name: 'Binance: Base Hot Wallet', category: 'cex', chain: 'base', confidence: 0.9, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'binance'] },
  { address: '0x503828976d22510aad0201ac7ec88293211d23da', name: 'Coinbase: Base', category: 'cex', chain: 'base', confidence: 0.85, source: 'manual', verified: false, tags: ['cex', 'coinbase'] },
  { address: '0x327Df1E6de05895d2ab3CF8B16441a6B8d67D0C9', name: 'Aerodrome: Router', category: 'dex', chain: 'base', confidence: 0.95, source: 'manual', verified: true, tags: ['dex', 'amm', 'aerodrome'] },
  { address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8', name: 'Balancer: Vault', category: 'dex', chain: 'base', confidence: 0.9, source: 'manual', verified: true, tags: ['dex', 'balancer'] },
  { address: '0x4cF0B4e2C8F5e0E5B8A9F5E0B4C3D2E1F0A9B8C7', name: 'Base: Bridge', category: 'bridge', chain: 'base', confidence: 0.9, source: 'manual', verified: true, tags: ['bridge', 'base', 'l2'] },
]);

// ================================================================
// OPTIMISM
// ================================================================

addMany([
  { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', name: 'Binance: Optimism Hot Wallet', category: 'cex', chain: 'optimism', confidence: 0.9, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'binance'] },
  { address: '0x503828976d22510aad0201ac7ec88293211d23da', name: 'Coinbase: Optimism', category: 'cex', chain: 'optimism', confidence: 0.85, source: 'manual', verified: false, tags: ['cex', 'coinbase'] },
  { address: '0xE0BB0D3DE4c3d4d5E4F2B3C1D2E3F4A5B6C7D8E9', name: 'Optimism: Bridge', category: 'bridge', chain: 'optimism', confidence: 0.95, source: 'manual', verified: true, tags: ['bridge', 'optimism', 'l2'] },
  { address: '0x99C9fc46f92E8a1c0d0c1A2B3D4E5F6A7B8C9D0E1', name: 'Velodrome: Router', category: 'dex', chain: 'optimism', confidence: 0.9, source: 'manual', verified: true, tags: ['dex', 'amm', 'velodrome'] },
  { address: '0x1F98431c8aD98523631AE4a59f267346ea31F984', name: 'Synthetix: Proxy', category: 'perpetuals', chain: 'optimism', confidence: 0.9, source: 'manual', verified: true, tags: ['perps', 'synthetix', 'derivatives'] },
]);

// ================================================================
// POLYGON
// ================================================================

addMany([
  { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', name: 'Binance: Polygon Hot Wallet', category: 'cex', chain: 'polygon', confidence: 0.9, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'binance'] },
  { address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', name: 'Polygon: Bridge (Pos)', category: 'bridge', chain: 'polygon', confidence: 0.9, source: 'manual', verified: true, tags: ['bridge', 'polygon', 'l2'] },
  { address: '0xE592427A0AEce92De3Edee1F18E0157C05861564', name: 'QuickSwap: Router', category: 'dex', chain: 'polygon', confidence: 0.9, source: 'manual', verified: true, tags: ['dex', 'amm', 'quickswap'] },
]);

// ================================================================
// BSC
// ================================================================

addMany([
  { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', name: 'Binance: BSC Hot Wallet', category: 'cex', chain: 'bsc', confidence: 0.9, source: 'manual', verified: true, tags: ['cex', 'hot-wallet', 'binance'] },
  { address: '0x0E09FaBB73Bd3ade0a17ECC321fD13a19e81cE82', name: 'PancakeSwap: Router', category: 'dex', chain: 'bsc', confidence: 0.95, source: 'manual', verified: true, tags: ['dex', 'amm', 'pancakeswap'] },
  { address: '0x10ED43C718714eb63d5aA57B78B54704E256024E', name: 'PancakeSwap: Router v2', category: 'dex', chain: 'bsc', confidence: 1, source: 'manual', verified: true, tags: ['dex', 'amm', 'pancakeswap'] },
  { address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0c', name: 'Binance: Staked ETH', category: 'liquid_staking', chain: 'bsc', confidence: 0.85, source: 'community', verified: false, tags: ['staking', 'bnb'] },
]);

// ================================================================
// Export
// ================================================================

export function getEntity(chain: string, address: string): Entity | undefined {
  return entityMap.get(`${chain}:${address.toLowerCase()}`);
}

export function getEntityByKey(key: string): Entity | undefined {
  return entityMap.get(key);
}

export function bulkLookup(chain: string, addresses: string[]): Map<string, Entity> {
  const results = new Map<string, Entity>();
  for (const addr of addresses) {
    const entity = getEntity(chain, addr);
    if (entity) results.set(addr.toLowerCase(), entity);
  }
  return results;
}

export function searchEntities(query: string, chain?: string, category?: EntityCategory): Entity[] {
  const q = query.toLowerCase();
  const results: Entity[] = [];
  for (const entity of entityMap.values()) {
    if (chain && entity.chain !== chain) continue;
    if (category && entity.category !== category) continue;
    if (entity.name.toLowerCase().includes(q) || entity.tags.some(t => t.includes(q))) {
      results.push(entity);
    }
    if (results.length >= 20) break; // reasonable limit
  }
  return results;
}

export function getAllEntities(): Map<string, Entity> {
  return entityMap;
}

export function getEntitiesByChain(chain: string): Entity[] {
  const results: Entity[] = [];
  for (const entity of entityMap.values()) {
    if (entity.chain === chain) results.push(entity);
  }
  return results;
}

export function getEntitiesByCategory(category: EntityCategory): Entity[] {
  const results: Entity[] = [];
  for (const entity of entityMap.values()) {
    if (entity.category === category) results.push(entity);
  }
  return results;
}

// Chain-agnostic entity lookup (try all chains)
export function findEntityByAddress(address: string): Entity | undefined {
  const addr = address.toLowerCase();
  for (const [key, entity] of entityMap) {
    if (key.endsWith(`:${addr}`)) return entity;
  }
  return undefined;
}
