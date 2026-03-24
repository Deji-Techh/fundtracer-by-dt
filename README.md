# FundTracer

Multi-chain blockchain forensics platform for tracing wallet funds, detecting Sybil patterns, and analyzing transaction activity.

## Live Apps

| App | URL |
|-----|-----|
| Landing Page | [fundtracer.xyz](https://fundtracer.xyz) |
| EVM Analysis | [fundtracer.xyz/app-evm](https://fundtracer.xyz/app-evm) |
| Solana Analysis | [fundtracer.xyz/app-solana](https://fundtracer.xyz/app-solana) |
| Telegram Alerts | [fundtracer.xyz/telegram](https://fundtracer.xyz/telegram) |

---

## Products

### Web App

Browser-based wallet analysis for EVM chains and Solana. No installation required.

**Supported Chains:** Linea, Base, Arbitrum, Optimism, Polygon, BNB Chain, Ethereum

**Features:**
- Wallet analysis with transaction history and risk scoring
- Sybil detection for identifying coordinated activity
- Contract interaction analysis
- Portfolio tracking for tokens, DeFi positions, and NFTs
- Scan history

### CLI Tool

Terminal-based blockchain forensics for developers and security researchers.

**Installation:**

```bash
npm install -g fundtracer-cli
```

Or build from source:

```bash
git clone https://github.com/Deji-Tech/fundtracer-by-dt.git
cd fundtracer-by-dt
npm install
cd packages/cli && npm run build && npm link
```

**Configuration:**

Before using the CLI, configure your API keys:

```bash
fundtracer config --set-key alchemy:YOUR_KEY
fundtracer config --set-key moralis:YOUR_KEY
fundtracer config --set-key dune:YOUR_KEY
```

Get free API keys:
- Alchemy: [dashboard.alchemy.com](https://dashboard.alchemy.com)
- Moralis: [moralis.io](https://moralis.io)
- Dune: [dune.com](https://dune.com)

**Commands:**

| Command | Description |
|---------|-------------|
| `fundtracer analyze <address>` | Analyze a single wallet |
| `fundtracer compare <addresses...>` | Compare wallets for Sybil detection |
| `fundtracer portfolio <address>` | View NFT and token holdings |
| `fundtracer batch <file>` | Analyze multiple wallets from a file |
| `fundtracer interactive` | Start interactive mode |
| `fundtracer config --show` | View current configuration |

**Examples:**

```bash
# Analyze a wallet
fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71

# Compare multiple wallets
fundtracer compare 0x742d... 0xdEaD... 0x8f2C...

# Export as JSON
fundtracer analyze 0x742d... --output json --export result.json

# Batch analysis from file
fundtracer batch addresses.txt --parallel 10

# View portfolio
fundtracer portfolio 0x742d... --tokens
```

**Options:**

| Option | Description |
|--------|-------------|
| `-c, --chain <chain>` | Target chain (ethereum, linea, arbitrum, base, optimism, polygon) |
| `-o, --output <format>` | Output format: table, json, csv, tree |
| `-d, --depth <number>` | Funding tree depth (default: 3) |
| `--export <file>` | Export results to file |
| `--min-value <eth>` | Minimum transaction value filter |

### Chrome Extension

Embeds FundTracer data directly into Etherscan and blockchain explorers.

**Installation:**

1. Download the extension from [fundtracer.xyz/ext-install](https://fundtracer.xyz/ext-install)
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Drag the downloaded file into the extensions page

**Features:**
- One-click wallet analysis on any Etherscan page
- Risk indicators and labels
- Quick funding trace
- Related wallets panel

### Telegram Bot

Real-time wallet alerts delivered to Telegram.

**Setup:**

1. Open [fundtracer.xyz/telegram](https://fundtracer.xyz/telegram)
2. Connect your wallet
3. Open the Telegram bot and link your account

**Commands:**

| Command | Description |
|---------|-------------|
| `/add <address>` | Add a wallet to your watchlist |
| `/list` | View your watched wallets |
| `/remove <address>` | Remove a wallet |
| `/frequency` | Set alert frequency |
| `/status` | View alert settings |
| `/unlink` | Disconnect Telegram |

---

## API

The FundTracer API provides programmatic access to blockchain forensics data. Generate API keys at [fundtracer.xyz/api/keys](https://fundtracer.xyz/api/keys).

### Base URL

```
https://www.fundtracer.xyz/api
```

### Authentication

All endpoints require a Bearer token:

```bash
curl -H "Authorization: Bearer ft_live_YOUR_API_KEY" \
  https://www.fundtracer.xyz/api/analyze/wallet
```

### Endpoints

#### Wallet Analysis

```bash
# Analyze a single wallet
curl -X POST -H "Authorization: Bearer ft_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"address":"0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1","chain":"ethereum"}' \
  https://www.fundtracer.xyz/api/analyze/wallet
```

#### Funding Tree

```bash
# Get funding flow graph
curl -X POST -H "Authorization: Bearer ft_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"address":"0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1","chain":"ethereum"}' \
  https://www.fundtracer.xyz/api/analyze/funding-tree
```

#### Compare Wallets

```bash
# Find shared interactions between wallets
curl -X POST -H "Authorization: Bearer ft_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"addresses":["0x742d...","0xd8dA..."],"chain":"ethereum"}' \
  https://www.fundtracer.xyz/api/analyze/compare
```

#### Sybil Detection

```bash
# Detect coordinated behavior around a contract
curl -X POST -H "Authorization: Bearer ft_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contractAddress":"0x7a250d...","chain":"ethereum"}' \
  https://www.fundtracer.xyz/api/analyze/sybil
```

#### Contract Analysis

```bash
# Analyze smart contract interactions
curl -X POST -H "Authorization: Bearer ft_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contractAddress":"0x7a250d...","chain":"ethereum"}' \
  https://www.fundtracer.xyz/api/analyze/contract
```

#### Batch Analysis *(NEW)*

```bash
# Analyze up to 50 wallets in one request
curl -X POST -H "Authorization: Bearer ft_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"addresses":["0x742d...","0xd8dA..."],"chain":"ethereum"}' \
  https://www.fundtracer.xyz/api/analyze/batch
```

#### Transaction Lookup *(NEW)*

```bash
# Fetch detailed transaction info with logs and gas costs
curl -H "Authorization: Bearer ft_live_YOUR_API_KEY" \
  "https://www.fundtracer.xyz/api/tx/ethereum/0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640c5a76964d3e17d20f3e7f52a"
```

#### Gas Prices *(NEW)*

```bash
# Get current gas prices (low/medium/high in gwei)
curl -H "Authorization: Bearer ft_live_YOUR_API_KEY" \
  "https://www.fundtracer.xyz/api/gas?chain=ethereum"

# Supported chains: ethereum, arbitrum, optimism, polygon, bsc, base
```

### Supported Chains

| Chain | ID | Identifier |
|-------|----|----|
| Ethereum | 1 | `ethereum` |
| Linea | 59144 | `linea` |
| Arbitrum | 42161 | `arbitrum` |
| Base | 8453 | `base` |
| Optimism | 10 | `optimism` |
| Polygon | 137 | `polygon` |
| BNB Chain | 56 | `bsc` |

### SDK

```bash
npm install @fundtracer/api
```

```typescript
import { FundTracerAPI } from '@fundtracer/api';

const ft = new FundTracerAPI('ft_live_YOUR_API_KEY');

// Analyze a wallet
const { data: wallet } = await ft.analyzeWallet('0x742d...', { chain: 'ethereum' });

// Get funding tree
const { data: tree } = await ft.getFundingTree('0x742d...', { chain: 'ethereum', maxDepth: 3 });

// Batch analyze wallets
const { data: batch } = await ft.analyzeBatch(['0x742d...', '0xd8dA...'], 'ethereum');

// Get transaction details
const { data: tx } = await ft.getTransaction('ethereum', '0x88e6...');

// Get gas prices
const { data: gas } = await ft.getGasPrices('ethereum');
```

See [fundtracer.xyz/api-docs](https://fundtracer.xyz/api-docs) for full documentation.

---

## Pricing

All tiers are currently free. API keys included with every plan.

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Unlimited analyses, 2 API keys, all EVM chains |
| Pro | $0 | Unlimited analyses, unlimited API keys, Sybil detection |
| Max | $0 | Unlimited analyses, unlimited API keys, dedicated support |

---

## Self-Hosting

### Prerequisites

- Node.js 18+
- npm or yarn
- API keys for blockchain data (Alchemy, Moralis, Dune)

### Setup

```bash
# Clone the repository
git clone https://github.com/Deji-Tech/fundtracer-by-dt.git
cd fundtracer-by-dt

# Install dependencies
npm install

# Build packages
npm run build --workspace=@fundtracer/core
npm run build --workspace=@fundtracer/web
npm run build --workspace=@fundtracer/server

# Configure environment
cp packages/server/.env.example packages/server/.env
# Edit .env with your API keys

# Start the server
npm start --workspace=@fundtracer/server

# For development
cd packages/web && npm run dev
```

### Environment Variables

```env
NODE_ENV=production
PORT=3001
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=your-email
FIREBASE_PRIVATE_KEY=your-key
ALCHEMY_API_KEY=your-key
MORALIS_API_KEY=your-key
DUNE_API_KEY=your-key
JWT_SECRET=your-secret
```

---

## Tech Stack

**Frontend:** React, TypeScript, Vite, React Router.

**Backend:** Node.js, Express, Firebase.

**Blockchain:** Ethers.js, Viem, Solana Web3.js.

**APIs:** Alchemy, Moralis, Dune Analytics, CoinGecko.

---

## License

GNU General Public License v3.0 - See [LICENSE](LICENSE)
