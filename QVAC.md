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
│                           │  QVAC OpenAI Server         │ │
│                           │  Railway Cloud             │ │
│                           │  fundtracer-qvac.up.railway.app│ │
│                           │                             │ │
│                           │  • /v1/chat/completions    │ │
│                           │  • /v1/embeddings         │ │
│                           │  • /v1/models             │ │
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

The QVAC server is deployed on Railway with optimized configuration:

| Setting | Value | Purpose |
|---------|-------|---------|
| **Model** | Qwen3-0.6B-Q2 (~180MB) | Smaller for faster CPU inference |
| **Runtime** | CPU with Vulkan (llvmpipe) | Software rendering |
| **Threads** | 4 | Utilize all CPU cores |
| **Context Size** | 256 | Reduced for speed |
| **Max Tokens** | 80 | Limited response length |
| **Pre-download** | Yes | Baked into Docker image |

### Performance Optimization

For optimal response times on CPU-only infrastructure:

- **Q2 Quantization**: 180MB vs 400MB (2x+ faster)
- **Threading**: `--threads 4` for parallel processing
- **Context**: 256 tokens (vs 4096 default)
- **Output**: 80 tokens max (vs unlimited)
- **System Prompt**: "Reply in 1-2 sentences maximum"

This achieves **~5-10 second response times** on CPU-only Railway deployment.

### Key Files

```
# QVAC Server Repo (fundtracer-qvac)
├── Dockerfile              # Docker config with Vulkan deps + Q2 model
├── qvac.config.json       # Optimized model configuration  
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
        "src": "/root/.qvac/models/Qwen3-0.6B-Q2_K.gguf",
        "type": "llm",
        "default": true,
        "preload": true,
        "config": {
          "ctx_size": 256,
          "predict": 80,
          "temp": 0.7,
          "top_k": 20,
          "top_p": 0.9,
          "no_mmap": true,
          "verbosity": 1
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
3. **Model pre-download** - Q2 model for faster inference

```dockerfile
FROM node:22-slim

RUN apt-get update && apt-get install -y \
    libvulkan1 \
    libatomic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json qvac.config.json ./
RUN npm install

# Pre-download Q2 model (~180MB) for faster inference
RUN mkdir -p /root/.qvac/models && \
    curl -L -o /root/.qvac/models/Qwen3-0.6B-Q2_K.gguf \
    "https://huggingface.co/bartowski/Qwen_Qwen3-0.6B-GGUF/resolve/main/Qwen_Qwen3-0.6B-Q2_K.gguf"

EXPOSE 8080

# Use 4 threads for parallel CPU processing
CMD ["node", "node_modules/.bin/qvac", "serve", "openai", "--config", "qvac.config.json", "--port", "8080", "--host", "0.0.0.0", "--cors", "--verbose", "--threads", "4"]
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
| Meaningful QVAC integration | Uses LLM + embeddings + RAG pipeline for wallet analysis |
| Not wrapper/demo | Core report generation via local AI - integral to product |
| Production deployment | Railway-hosted QVAC server, live at fundtracer-qvac.up.railway.app |
| Public repo | GitHub: github.com/Deji-Tech/fundtracer-by-dt |
| Works offline/on-device capability | QVAC runs locally - demonstrates local-first AI architecture |

### What Counts as Meaningful Integration

Our QVAC integration is meaningful because:

1. **Core Functionality**: AI-powered wallet risk analysis IS the product - not a demo
2. **LLM Inference**: Uses QVAC's local LLM for natural language generation
3. **Practical Application**: Real blockchain forensics for actual wallet addresses
4. **Local-First Architecture**: Demonstrates QVAC's core value proposition

## Evaluation Criteria

| Criteria | Weight | Our Approach |
|----------|--------|---------------|
| Technical depth | 40% | QVAC LLM + embeddings + RAG + Railway deployment + optimization |
| Product value | 30% | Real wallet forensics tool - actionable risk reports |
| Innovation | 20% | Blockchain + local AI - unique combination |
| Demo quality | 10% | Working web app + chat interface + live demo |

## Challenges & Solutions

### Issue 1: Vulkan Required
**Problem:** QVAC requires Vulkan GPU libraries, not available in standard containers.
**Solution:** Install `libvulkan1` + `libatomic1` in Dockerfile.

### Issue 2: Model Download Timeout
**Problem:** Model (~400MB) download timed out Railway's health check.
**Solution:** Pre-download Q2 model during Docker build, bake into image.

### Issue 3: Railway Port Configuration
**Problem:** Container port needed to match Railway's proxy.
**Solution:** Use port 8080 (Railway default), configure health check path.

### Issue 4: CPU-Only Performance
**Problem:** Response times too slow (~87s) on CPU-only infrastructure.
**Solution:** 
- Switch to Q2 quantization (~180MB vs ~400MB)
- Optimize context size (256 vs 4096)
- Limit output tokens (80 vs unlimited)
- Enable multi-threading (--threads 4)
- Brief system prompts

### Issue 5: Cold Start
**Problem:** Model needs to load on each request initially.
**Solution:** Preload model on server startup with `preload: true`.

## Future Enhancements

Potential additions for post-hackathon:

- **Voice Input:** `@qvac/transcription-whispercpp` for voice commands
- **OCR Scanner:** `@qvac/ocr-onnx` for scanning addresses from images
- **Image Generation:** `@qvac/diffusion-cpp` for wallet visualization
- **RAG Pipeline:** `@qvac/rag` for semantic wallet pattern search
- **Local Mode:** Offer optional local QVAC for privacy
- **Mobile App:** Deploy QVAC on-device for iOS/Android

## Links

- **FundTracer:** https://fundtracer.xyz
- **GitHub Repo:** https://github.com/Deji-Tech/fundtracer-by-dt
- **QVAC Server Repo:** https://github.com/Deji-Tech/fundtracer-qvac
- **QVAC Docs:** https://docs.qvac.tether.io
- **QVAC GitHub:** https://github.com/tetherto/qvac
- **Hackathon:** https://colosseum.io (Tether Frontier Track)

---

Built for the Tether Frontier Hackathon - QVAC Side Track
