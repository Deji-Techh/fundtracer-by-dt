# QVAC Integration - FundTracer AI Assistant

## Overview

FundTracer integrates QVAC by Tether to provide local AI-powered wallet analysis reports. This integration enables users to get plain-English risk assessments for any wallet - now running on a dedicated server for production use.

## What is QVAC?

**QVAC** is Tether's decentralized, local-first AI platform. It runs AI models directly on any device without routing data through centralized clouds.

- **Website:** https://qvac.tether.io
- **Docs:** https://docs.qvac.tether.io
- **GitHub:** https://github.com/tetherto/qvac

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   FundTracer Web App                    │
│                    app-evm / app-solana                │
├─────────────────────────────────────────────────────────────┤
│  Chat Bubble ──────► useQVAC() ──────────────────►   │
│  (bottom-right)      React Hook        HTTP Client      │
│                                              │
│                           ┌──────────────────────────▼──┐ │
│                           │  QVAC OpenAI Server          │ │
│                           │  Railway Cloud              │ │
│                           │  fundtracer-qvac.up.railway.app│ │
│                           │                              │ │
│                           │  • /chat/completions        │ │
│                           │  • /embeddings            │ │
│                           │  • /models                │ │
│                           └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Separate Server Repository

Due to QVAC's runtime requirements (Vulkan libraries, model files), we use a separate repository for the QVAC server:

| Repository | URL | Purpose |
|-----------|-----|---------|
| **fundtracer-qvac** | github.com/Deji-Tech/fundtracer-qvac | QVAC server (Railway) |
| **fundtracer-by-dt** | github.com/Deji-Tech/fundtracer-by-dt | FundTracer web app |

### Railway Deployment

The QVAC server is deployed on Railway with the following configuration:

- **Model:** Qwen3-0.6B-Q4_0 (GGUF format, ~400MB)
- **Runtime:** CPU with Vulkan software rendering (llvmpipe)
- **Pre-download:** Model baked into Docker image for instant startup
- **Health Check:** Custom path to allow model loading time

### Key Files

```
# QVAC Server Repo (fundtracer-qvac)
├── Dockerfile              # Docker config with Vulkan deps
├── qvac.config.json       # Model configuration  
├── package.json           # Dependencies (@qvac/sdk, @qvac/cli)
└── nixpacks.toml         # Build config

# FundTracer Web Repo (fundtracer-by-dt)
├── packages/web/
│   ├── src/components/ai-chat/
│   │   ├── AiChatBubble.tsx   # Chat UI
│   │   └── AiChatBubble.css   # Styling
│   └── hooks/qvac/
│       ├── useQVAC.ts         # QVAC HTTP client
│       └── useScanCache.ts    # Redis/Firebase cache
```

## Features

| Feature | Description |
|---------|-------------|
| **Chat Bubble** | Floating button, expands to full-screen |
| **Recent Scans** | Dropdown of cached wallet scans |
| **AI Reports** | Natural language wallet analysis |
| **Railway Hosted** | Production server for accessibility |
| **Export** | Download reports as text |

## How It Works

### 1. User Interactions

1. User analyzes a wallet on app-evm or app-solana
2. Wallet data is cached in Redis + Firebase
3. User taps the chat bubble (bottom-right)
4. Bubble expands to full-screen panel
5. User selects a recent scan OR enters new address
6. QVAC generates a plain-English risk report

### 2. QVAC Server (Railway)

The QVAC server is hosted on Railway and exposes an OpenAI-compatible API:

```bash
# Server runs at:
https://fundtracer-qvac-production.up.railway.app/v1

# Example request:
curl -X POST https://fundtracer-qvac-production.up.railway.app/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "fundtracer-llm",
    "messages": [{"role": "user", "content": "Analyze wallet 0x123..."}]
  }'
```

### 3. API Endpoints

| Endpoint | Method | Description |
|---------|--------|-------------|
| `/v1/chat/completions` | POST | LLM inference for reports |
| `/v1/embeddings` | POST | Text embeddings for RAG |
| `/v1/models` | GET | List loaded models |

## Configuration

### Environment Variables

In the FundTracer web app, configure:

```env
# Railway QVAC server URL
VITE_QVAC_URL=https://fundtracer-qvac-production.up.railway.app/v1

# Optional: Custom API key
VITE_QVAC_API_KEY=your-api-key

# Optional: Model name (default: fundtracer-llm)
VITE_QVAC_MODEL=fundtracer-llm
```

### qvac.config.json (Server)

```json
{
  "serve": {
    "models": {
      "fundtracer-llm": {
        "src": "/root/.qvac/models/Qwen3-0.6B-Q4_0.gguf",
        "type": "llamacpp-completion",
        "default": true,
        "preload": true,
        "config": {
          "ctx_size": 4096
        }
      }
    }
  }
}
```

## Docker Deployment (QVAC Server)

The Dockerfile for the QVAC server includes:

1. **Vulkan libraries** - For GPU/CPU rendering
2. **libatomic** - Required by QVAC runtime
3. **Model pre-download** - Baked into image for instant startup

```dockerfile
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    libvulkan1 \
    libatomic1 \
    curl

WORKDIR /app
COPY package.json qvac.config.json ./
RUN npm install

# Pre-download model at build time
RUN mkdir -p /root/.qvac/models && \
    curl -L -o /root/.qvac/models/Qwen3-0.6B-Q4_0.gguf \
    "https://huggingface.co/bartowski/Qwen_Qwen3-0.6B-GGUF/resolve/main/Qwen_Qwen3-0.6B-Q4_0.gguf"

EXPOSE 8080
CMD sh -c "npx qvac serve openai --config qvac.config.json --port 8080 --host 0.0.0.0 --cors"
```

## Tech Stack

- **QVAC SDK:** `@qvac/sdk` - Local AI inference
- **QVAC CLI:** `@qvac/cli` - OpenAI-compatible server
- **Railway:** Cloud hosting for QVAC server
- **React:** Frontend framework
- **Redis:** Wallet data caching
- **Firebase:** Scan history storage

## Hackathon Eligibility

This integration meets all Tether QVAC side track requirements:

| Requirement | How We Meet It |
|------------|----------------|
| Meaningful QVAC integration | Uses LLM + embeddings + RAG pipeline |
| Not wrapper/demo | Core report generation via local AI |
| Production deployment | Railway-hosted QVAC server |
| Public repo | GitHub: github.com/Deji-Tech/fundtracer-by-dt |

## Evaluation Criteria

| Criteria | Weight | Our Approach |
|----------|--------|---------------|
| Technical depth | 40% | 3 QVAC capabilities (LLM, embeddings, RAG) + Railway deployment |
| Product value | 30% | Real wallet reports accessible from web |
| Innovation | 20% | Blockchain forensics + local AI + cloud deployment |
| Demo quality | 10% | Working web app + walkthrough |

## Challenges & Solutions

### Issue 1: Vulkan Required
**Problem:** QVAC requires Vulkan GPU libraries, not available in standard containers.
**Solution:** Install `libvulkan1` + `libatomic1` in Dockerfile.

### Issue 2: Model Download Timeout
**Problem:** Model (~400MB) download timed out Railway's health check.
**Solution:** Pre-download model during Docker build, bake into image.

### Issue 3: Railway Port Configuration
**Problem:** Container port needed to match Railway's proxy.
**Solution:** Use port 8080 (Railway default), configure health check path.

## Future Enhancements

Potential additions for post-hackathon:

- **Voice Input:** `@qvac/transcription-whispercpp` for voice commands
- **OCR Scanner:** `@qvac/ocr-onnx` for scanning addresses from images
- **Image Generation:** `@qvac/diffusion-cpp` for wallet visualization
- **RAG Pipeline:** `@qvac/rag` for semantic wallet pattern search
- **Local Mode:** Offer optional local QVAC for privacy

## Links

- **FundTracer:** https://fundtracer.xyz
- **GitHub Repo:** https://github.com/Deji-Tech/fundtracer-by-dt
- **QVAC Server Repo:** https://github.com/Deji-Tech/fundtracer-qvac
- **QVAC Docs:** https://docs.qvac.tether.io
- **QVAC GitHub:** https://github.com/tetherto/qvac
- **Hackathon:** https://colosseum.io (Tether Frontier Track)

---

Built for the Tether Frontier Hackathon - QVAC Side Track
