# FundTracer Chrome Extension

A Chrome extension for quick blockchain wallet analysis with Sybil detection, funding trace, and transaction history.

## Features

- **Quick Wallet Analysis** - Enter any wallet address and get instant risk assessment
- **Sybil Detection** - Identify potential Sybil attacks and suspicious patterns
- **Funding Trace** - Track the source of funds
- **Transaction History** - View transaction history
- **Pro/Max Sync** - Automatically syncs your subscription tier from the web app
- **Multi-chain Support** - EVM chains (Ethereum, Linea, Arbitrum, Base, etc.) and Solana

## Installation

### Option 1: Load Unpacked (Development)
1. Clone the repository
2. Run `npm install` in the `packages/extension` folder
3. Run `npm run build`
4. Open Chrome and go to `chrome://extensions/`
5. Enable Developer mode
6. Click "Load unpacked" and select the `dist` folder

### Option 2: Load from Folder
1. Build the extension (`npm run build`)
2. Open Chrome and go to `chrome://extensions/`
3. Enable Developer mode
4. Click "Load unpacked"
5. Select the `packages/extension/dist` folder

## Usage

1. **Connect Wallet** - Click "Connect Wallet" to sign in with your wallet (syncs Pro/Max tier)
2. **Select Chain** - Choose EVM or Solana
3. **Enter Address** - Type or paste a wallet address
4. **Analyze** - Click "Analyze" to get quick results
5. **View Full** - Click "View Full" to open detailed analysis in the web app

## API Integration

The extension communicates with your server API at `https://fundtracer.xyz/api`:
- `POST /api/evm/analyze` - Analyze EVM wallet
- `POST /api/solana/analyze` - Analyze Solana wallet
- `GET /api/user/subscription` - Get user subscription tier

## Files

```
packages/extension/
├── manifest.json          # Extension manifest (V3)
├── popup/                # Popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/           # Background service worker
│   └── background.js
├── content/             # Content scripts
│   └── content.js
├── icons/               # Extension icons
└── build.js             # Build script
```

## Development

```bash
cd packages/extension
npm install
npm run build
```

To create a zip file for distribution:
```bash
npm run zip
```

## License

MIT
