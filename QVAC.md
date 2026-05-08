# QVAC Integration - FundTracer CLI

## Why QVAC?

FundTracer uses **QVAC by Tether** to power all AI features locally. This is the core differentiator - every AI-powered analysis runs entirely on the user's device, with **no data ever leaving the local machine**.

### QVAC Capabilities Used in FundTracer

| QVAC Feature | How FundTracer Uses It |
|--------------|----------------------|
| **LLM Inference** (`@qvac/llm-llamacpp`) | Wallet risk analysis, natural language Q&A, chat mode, explanations |
| **Text Embeddings** (`@qvac/embed-llamacpp`) | Similar wallet detection using semantic search |
| **Offline Mode** | All AI features work without internet after initial model download |

> **Key Point**: FundTracer's AI integration is not a wrapper or demo - it's the core functionality. Without QVAC, there's no AI-powered wallet analysis.

---

## Overview

FundTracer CLI integrates QVAC for local AI-powered wallet analysis:
- Natural language insights about wallet risk
- Contract explanations in plain English
- Interactive AI chat
- Semantic similarity matching for wallet patterns

All inference runs locally - zero cloud dependency, zero API keys, zero data leaks.

---

## Quick Start

```bash
# Install FundTracer
npm install -g fundtracer

# Set up QVAC (one-time)
fundtracer qvac-setup
# Select model 2 (1.7B) or 3 (4B) for best results
```

That's it. QVAC handles the entire AI stack locally.

---

## AI-Powered Commands

| Command | Description | QVAC Feature Used |
|---------|-------------|-------------------|
| `fundtracer analyze 0x... --ai` | Full wallet analysis with AI risk assessment | LLM Inference |
| `fundtracer ask "is this wallet safe?"` | Natural language questions about any wallet | LLM Inference |
| `fundtracer explain 0x...` | Plain-English explanation of wallet behavior | LLM Inference |
| `fundtracer chat` | Interactive AI assistant | LLM Inference |
| `fundtracer similar 0x...` | Find wallets with similar transaction patterns | Text Embeddings |

---

## Example Output

### AI Wallet Analysis
```bash
$ fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f5b2a1 --ai
```

```
📊 FundTracer Analysis

Address: 0x742d...
Chain: ethereum

Risk Assessment
---
  Score: 25/100
  Level: LOW

🤖 AI Insights
---
This wallet shows LOW risk characteristics:
• Funded primarily from Coinbase (centralized exchange)
• Regular transaction patterns over 2+ years
• No interaction with known risky contracts
• Consistent with typical DeFi usage
```

### Interactive Chat
```bash
$ fundtracer chat
You: is this wallet a scammer?
FundTracer AI: Based on the transaction patterns and 
contract interactions, this wallet appears to be a 
legitimate DeFi user rather than a scammer...
```

---

## Technical Deep-Dive

### Architecture

```
┌────────────────────────┐      OpenAI-Compatible      ┌─────────────────────┐
│    FundTracer CLI      │  ───────────────────────►   │    QVAC Server     │
│                        │    HTTP :11434/v1/         │  (localhost)        │
│ • analyze --ai         │ ◄────────────────────────   │                     │
│ • ask                  │                             │ • Qwen3-1.7B       │
│ • explain             │                             │ • llama.cpp engine │
│ • chat                │                             │ • GPU/CPU fallback │
│ • similar             │                             └─────────────────────┘
└────────────────────────┘
```

### How It Works

1. **`fundtracer qvac-setup`** - Installs @qvac/cli + @qvac/sdk, downloads model to ~/.qvac/models/
2. **Server starts** - QVAC runs on localhost:11434 with OpenAI-compatible API
3. **CLI calls QVAC** - All AI commands send requests to local server
4. **Inference happens** - Model runs on-device using llama.cpp
5. **Response returned** - Results displayed to user

**Critical**: All data stays local. Even if offline, AI features work (after initial model download).

---

## Model Selection

| Model | Size | RAM | Use Case |
|-------|------|-----|----------|
| QWEN3-600M | ~380MB | 2GB | Testing only |
| **QWEN3-1.7B** | ~1.2GB | 4GB | **Recommended** - balance of speed/quality |
| QWEN3-4B | ~2.5GB | 8GB | Best quality, needs more RAM |
| QWEN3-8B | ~5GB | 16GB | Maximum quality |

Choose 1.7B or 4B for meaningful analysis. The 600M model is too small for wallet classification.

---

## Offline & Privacy

FundTracer + QVAC is **completely offline-capable**:

- ✅ No internet required after model download
- ✅ No API keys needed
- ✅ No data sent to external servers
- ✅ AI runs on user's device
- ✅ Sovereign intelligence - your queries never leave your machine

This is the core value proposition of QVAC integration - **functional on-device AI**.

---

## Configuration

### Environment Variables

```bash
# Point to local QVAC server (default)
export QVAC_URL=http://127.0.0.1:11434

# Or individual host/port
export QVAC_HOST=127.0.0.1
export QVAC_PORT=11434
```

### Model Cache Location

Models are cached at: `~/.qvac/models/`

- First download takes time (depends on model size)
- Subsequent runs skip download
- Models persist across sessions

---

## Troubleshooting

```bash
# Check if QVAC is running
fundtracer qvac

# Stop QVAC server
fundtracer qvac stop

# Restart with new model
fundtracer qvac-setup
```

---

## Resources

| Resource | Link |
|----------|------|
| **QVAC Docs** | https://docs.qvac.tether.io |
| **QVAC GitHub** | https://github.com/tetherto/qvac |
| **FundTracer** | https://fundtracer.xyz |
| **CLI Source** | https://github.com/Deji-Tech/fundtracer-by-dt |

---

**Built with QVAC by Tether** - The infrastructure layer for sovereign intelligence.