# 🕵️‍♂️ FundTracer by DT

<p align="center">
  <img src="packages/web/public/logo.png" alt="FundTracer Logo" width="220">
</p>

<p align="center">
  <strong>Multi-Chain Blockchain Forensics & Sybil Detection Suite</strong><br>
  Trace wallet funds, detect Sybil patterns, and analyze transactions across EVM chains and Solana.
</p>

<p align="center">
  <a href="https://fundtracer.xyz">Website</a> •
  <a href="#-features">Features</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-structure">Project Structure</a> •
  <a href="#-tech-stack">Tech Stack</a>
</p>

---

## 🚀 Live Demo

- **Landing Page**: [fundtracer.xyz](https://fundtracer.xyz)
- **EVM App**: [fundtracer.xyz/app-evm](https://fundtracer.xyz/app-evm)
- **Solana App**: [fundtracer.xyz/app-solana](https://fundtracer.xyz/app-solana)

---

## ✨ Features

### EVM Chains (app-evm)
| Feature | Description |
|---------|-------------|
| **Wallet Analysis** | Deep-dive into any wallet address across multiple EVM chains |
| **Sybil Detection** | Identify coordinated activity and airdrop farmers |
| **Contract Scanner** | Analyze smart contracts and discover interacting wallets |
| **Portfolio Analytics** | Track token holdings, DeFi positions, and NFT collections |
| **Funding Trace** | Recursively find the ultimate source of funds |
| **History** | View and search past analyses |

### Solana (app-solana)
| Feature | Description |
|---------|-------------|
| **Wallet Analysis** | Analyze Solana wallets for risk signals |
| **Fee Payer Detection** | Detect Sybils via shared fee payers |
| **Funding Tracing** | Trace SOL origin from exchanges |
| **Program Fingerprints** | Identify airdrop farming patterns |

---

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/Deji-Tech/fundtracer-by-dt.git
cd fundtracer-by-dt

# Install dependencies
npm install

# Build all packages
npm run build --workspace=@fundtracer/core
npm run build --workspace=@fundtracer/web
npm run build --workspace=@fundtracer/server

# Start the server
npm start --workspace=@fundtracer/server
```

### Development

```bash
# Start web app in development mode
cd packages/web
npm run dev
```

---

## 📁 Project Structure

```
fundtracer-by-dt/
├── packages/
│   ├── core/           # Shared utilities, types, and API functions
│   ├── web/            # React frontend (Vite)
│   │   └── src/
│   │       ├── pages/           # Landing and static pages
│   │       ├── components/      # UI components
│   │       │   ├── CoinGecko/   # EVM app components
│   │       │   ├── Terminal/     # Terminal UI components
│   │       │   └── common/      # Shared components
│   │       ├── contexts/         # React contexts
│   │       ├── hooks/           # Custom hooks
│   │       └── api/             # API integrations
│   └── server/         # Express backend API
├── .github/
│   └── workflows/      # CI/CD deployment
└── README.md
```

---

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing page with EVM/Solana launch buttons |
| `/app-evm` | EVM blockchain analysis app |
| `/app-solana` | Solana blockchain analysis app |

---

## ⚙️ Configuration

Create a `.env` file in `packages/server/`:

```env
NODE_ENV=production
PORT=3001
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key
ALCHEMY_API_KEY=your-alchemy-key
MORALIS_API_KEY=your-moralis-key
DUNE_API_KEY=your-dune-key
JWT_SECRET=your-jwt-secret
```

---

## 🛡️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React Router
- **Styling**: CSS Variables, Framer Motion, Huge Icons
- **Blockchain**: Ethers.js, Viem, Reown AppKit (EVM), Solana Web3.js
- **Charts**: Chart.js, Lightweight Charts, D3.js
- **Backend**: Node.js, Express, Firebase
- **Deployment**: GitHub Actions, Render

---

## 📄 License

MIT © Built with ❤️ by **DT Development**
