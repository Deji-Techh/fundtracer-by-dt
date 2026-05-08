# FundTracer CLI

Professional blockchain forensics tool for analyzing wallets, detecting suspicious activity, and tracing funds - all from your terminal.

## Installation

```bash
npm install -g fundtracer
```

Or build from source:
```bash
git clone https://github.com/Deji-Tech/fundtracer-by-dt.git
cd fundtracer-by-dt/packages/cli
npm run build && npm link
```

## Quick Start

```bash
# Analyze a wallet
fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1

# With AI insights (requires QVAC setup)
fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1 --ai
```

## Configuration

Before using, configure at least one API key:

```bash
fundtracer config --set-key alchemy:YOUR_KEY
```

Get free keys:
- **Alchemy:** https://dashboard.alchemy.com
- **Moralis:** https://moralis.io
- **Dune:** https://dune.com

## Commands

| Command | Description |
|---------|-------------|
| `fundtracer analyze <address>` | Analyze a wallet |
| `fundtracer analyze <address> --ai` | Analyze with AI insights |
| `fundtracer compare <addresses...>` | Sybil detection |
| `fundtracer portfolio <address>` | Token/NFT holdings |
| `fundtracer batch <file>` | Batch analysis |
| `fundtracer config --show` | View config |

### AI Commands (requires QVAC)

```bash
# Set up local AI server (downloads model first, then starts server)
fundtracer qvac-setup

# Check QVAC server status
fundtracer qvac

# Stop QVAC server
fundtracer qvac stop

# AI-powered analysis
fundtracer analyze 0x... --ai

# Natural language questions
fundtracer ask "is this wallet safe?"

# Interactive chat
fundtracer chat

# Explain a wallet
fundtracer explain 0x...

# Find similar wallets
fundtracer similar 0x...

# Check scam database
fundtracer check-scam 0x...

# Report scammer
fundtracer report-scam 0x...
```

## Options

| Option | Description |
|--------|-------------|
| `-c, --chain <chain>` | Chain: ethereum, linea, arbitrum, base, optimism, polygon, bsc |
| `-o, --output <format>` | Output: table, json, csv, tree |
| `-d, --depth <number>` | Funding tree depth (default: 3) |
| `--min-value <eth>` | Minimum transaction value |
| `--ai` | Enable AI insights |
| `--no-track` | Skip tracking for rewards |

## Examples

```bash
# Basic analysis
fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1

# With AI insights
fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1 --ai -c ethereum

# Compare wallets for Sybil
fundtracer compare 0x742d... 0xdEaD... 0x8f2C...

# View portfolio
fundtracer portfolio 0x742d... --tokens

# Export JSON
fundtracer analyze 0x742d... --output json --export result.json

# Batch from file
fundtracer batch addresses.txt --parallel 10
```

## QVAC Setup

The AI features require a local QVAC server. Run:

```bash
fundtracer qvac-setup
```

This will:
1. Offer model selection (600M, 1.7B, 4B, 8B)
2. Install QVAC packages
3. Create config
4. Start server on port 11434

**Recommendation:** Choose QWEN3-1.7B or QWEN3-4B for better AI responses. The 600M model is too small for meaningful analysis.

## Rewards

Analyze wallets to earn points:
- 10 points per wallet analyzed
- Top performers earn equity in FundTracer

```bash
# View your stats
fundtracer rewards --me

# Leaderboard
fundtracer rewards
```

## Troubleshooting

```bash
# Check API keys
fundtracer config --show

# Reset config
fundtracer config --reset

# Reinstall QVAC
rm -rf ~/.fundtracer-qvac
fundtracer qvac-setup
```

## Links

- **Website:** https://fundtracer.xyz
- **GitHub:** https://github.com/Deji-Tech/fundtracer-by-dt
- **Docs:** https://fundtracer.xyz/docs