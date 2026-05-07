# QVAC Integration - FundTracer CLI

## Overview

FundTracer CLI integrates **QVAC by Tether** for local AI-powered wallet analysis. This enables natural language insights about wallet risk, contract explanations, and interactive AI chat - all running locally on your machine without internet after initial setup.

## What is QVAC?

**QVAC** is Tether's decentralized, local-first AI platform. It runs AI models directly on any device without routing data through centralized clouds.

- **Website:** https://qvac.tether.io
- **Docs:** https://docs.qvac.tether.io  
- **GitHub:** https://github.com/tetherto/qvac

## CLI Features

| Feature | Command | Status |
|---------|---------|--------|
| **AI Analysis** | `fundtracer analyze 0x... --ai` | ✅ Working |
| **Natural Q&A** | `fundtracer ask "why is 0x... risky?"` | ✅ Working |
| **Wallet Explain** | `fundtracer explain 0x...` | ✅ Working |
| **Chat Mode** | `fundtracer chat` | ✅ Working - No thinking tags |
| **Similar Wallets** | `fundtracer similar 0x...` | ✅ Working - Uses QVAC LLM |
| **Check Scam** | `fundtracer check-scam 0x...` | ✅ Working - Offline |
| **Report Scam** | `fundtracer report-scam 0x...` | ✅ Working |
| **Scam DB Stats** | `fundtracer scam-db` | ✅ Working |
| **QVAC Setup** | `fundtracer qvac-setup` | ✅ Working - Model selection |
| **QVAC Status** | `fundtracer qvac` | ✅ Working |

## Quick Start

### Automatic Setup (Recommended)

```bash
fundtracer qvac-setup
```

This will:
1. Check for Docker (optional)
2. Ask you to choose a model (choose **3 or 4** for useful AI)
3. Install `@qvac/cli` and `@qvac/sdk` via npm
4. Create configuration file in `~/.fundtracer-qvac/`
5. Start the QVAC server on port 11434

**Important**: Choose **Qwen3-1.7B** or **Qwen3-4B** when prompted. The 600M model is too small for meaningful analysis.

### Manual Setup

```bash
mkdir -p ~/.fundtracer-qvac && cd ~/.fundtracer-qvac
npm init -y
npm install @qvac/cli @qvac/sdk @qvac/embed-llamacpp
echo '{"serve":{"models":{"fundtracer-ai":{"model":"QWEN3_600M_INST_Q4","default":true,"preload":true}}}}' > qvac.config.json
node node_modules/@qvac/cli/dist/index.js serve openai
```

# Install BOTH CLI and SDK (SDK is required as peer dependency)
npm install @qvac/cli @qvac/sdk

# Create config (preload: true loads model at server start)
echo '{"serve":{"models":{"fundtracer-ai":{"model":"QWEN3_1_7B_INST_Q4","default":true,"preload":true}}}' > qvac.config.json

# Start server
node node_modules/@qvac/cli/dist/index.js serve openai
```

### Requirements

| Requirement | Notes |
|------------|-------|
| Node.js | ≥ v18 (v22+ recommended) |
| npm | Latest version recommended |
| 4GB RAM | For AI model inference |
| ~500MB Storage | For QWEN3-600M model |

## Usage Examples

### Analyze Wallet with AI

```bash
fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1 --ai
```

Output:
```
Checking for QVAC... ✓ connected
Analyzing wallet...

📊 FundTracer Analysis

Address: 0x742d...
Chain: ethereum
Balance: 1.5 ETH
Transactions: 156

Risk
---
  ✓ LOW  Score: 25/100

🤖 AI Insights
---
This wallet shows LOW risk characteristics:
• Funded primarily from Coinbase (centralized exchange)
• Regular transaction patterns over 2+ years
• No interaction with known risky contracts
• Consistent with typical DeFi usage
```

### Ask Natural Questions

```bash
fundtracer ask "is 0x742d... a scammer?" -c ethereum
```

### Explain a Wallet

```bash
fundtracer explain 0x742d...
```

### Interactive Chat

```bash
fundtracer chat
# Then type your questions...
```

## Configuration

### Configuration File

After running `fundtracer qvac-setup`, a config is created at `~/.fundtracer-qvac/qvac.config.json`:

```json
{
  "serve": {
    "models": {
      "fundtracer-ai": {
        "model": "QWEN3_600M_INST_Q4",
        "default": true,
        "preload": true
      }
    }
  }
}
```

**Important**: `preload: true` loads the model at server start. Set to `false` to load on first request (slower first chat).

### Environment Variables

```env
# QVAC server URL (default: http://127.0.0.1:11434)
QVAC_URL=http://localhost:11434

# Or specify host and port separately
QVAC_HOST=127.0.0.1
QVAC_PORT=11434

# Custom model name (if different from default)
QVAC_MODEL=fundtracer-ai
```

## How It Works

1. **Setup**: `fundtracer qvac-setup` installs packages and creates config
2. **Server Start**: Server starts on `localhost:11434` with model preloaded
3. **Inference**: Model runs locally via llama.cpp
4. **API**: OpenAI-compatible (`/v1/chat/completions`)

**First Run**: Model may take 10-30s to load from cache  
**Subsequent Runs**: Near-instant startup

## Troubleshooting

### QVAC Not Running

If you see `QVAC not available` or `503` errors:

```bash
# Automatic - kills existing server first
fundtracer qvac-setup

# Or manually
fuser -k 11434/tcp 2>/dev/null
cd ~/.fundtracer-qvac
node node_modules/@qvac/cli/dist/index.js serve openai
```

### Check QVAC Status

```bash
fundtracer chat
# If server is running, it'll connect
```

### Port Already in Use

```bash
# Check what's using port 11434
lsof -i :11434

# Kill existing process
fuser -k 11434/tcp

# Then restart
fundtracer qvac-setup
```

### Model Not Loading (503 errors)

If you get 503 on chat requests:
1. Server is running but model failed to load
2. Check server output for errors: run manually with `node ... serve openai`
3. Try reinstalling: `rm -rf ~/.fundtracer-qvac && fundtracer qvac-setup`

### Reinstall

To reinstall from scratch:

```bash
rm -rf ~/.fundtracer-qvac
fundtracer qvac-setup
```

## Model Options

| Model | Size | Speed | Quality | Recommendation |
|-------|------|-------|---------|----------------|
| QWEN3-600M | ~380MB | Fast | Good | Only for quick tests - too small |
| QWEN3-1.7B | ~1.2GB | Medium | Better | **Recommended for most users** |
| QWEN3-4B | ~2.5GB | Slow | Best | For best quality, powerful machines |
| QWEN3-8B | ~5GB | Slowest | Ultra | For max quality, high-end machines |

### Which Model to Choose?

- **600M**: This small model is too basic for meaningful analysis. Use only for testing.
- **1.7B**: Good balance of speed and quality. Handles simple classification well.
- **4B**: Best quality but needs more RAM. Use if you have 8GB+ RAM.
- **8B**: Maximum quality but requires 16GB+ RAM.

**Run `fundtracer qvac-setup` and choose option 3 or 4 for useful AI responses.**

To change model, edit `~/.fundtracer-qvac/qvac.config.json`:

```json
{
  "serve": {
    "models": {
      "fundtracer-ai": {
        "model": "QWEN3_1_7B_INST_Q4",
        "default": true,
        "preload": true
      }
    }
  }
}
```

**Note**: Models are cached in `~/.qvac/models/`

## Architecture

```
┌─────────────────────┐     HTTP      ┌─────────────────────┐
│   FundTracer CLI    │ ──────────►  │   QVAC Server     │
│                   │ ◄────────── │  localhost:11434  │
│  • analyze --ai   │            │                  │
│  • ask          │            │  • QWEN3-600M    │
│  • explain      │            │  • llama.cpp     │
│  • chat        │            │                  │
└─────────────────────┘            └─────────────────────┘

Installation: ~/.fundtracer-qvac/
Model cache: ~/.qvac/models/
```

**Files**:
- `~/.fundtracer-qvac/` - QVAC installation
- `~/.fundtracer-qvac/qvac.config.json` - Server config
- `~/.qvac/models/` - Downloaded model files (~380MB)

## Security

- **Local Only**: All AI processing happens on your device
- **No Data Sharing**: Your queries are not sent to external servers
- **No Account Required**: No login or API keys needed

## Links

- **FundTracer:** https://fundtracer.xyz
- **GitHub:** https://github.com/Deji-Tech/fundtracer-by-dt
- **QVAC Docs:** https://docs.qvac.tether.io
- **QVAC GitHub:** https://github.com/tetherto/qvac

---

Built with QVAC by Tether
