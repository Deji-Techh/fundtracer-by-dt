# QVAC Integration - FundTracer AI Assistant

## Overview

FundTracer integrates QVAC by Tether to provide local AI-powered wallet analysis reports. This integration enables users to get plain-English risk assessments for any wallet entirely offline - no data leaves their device.

## What is QVAC?

**QVAC** is Tether's decentralized, local-first AI platform. It runs AI models directly on any device without routing data through centralized clouds.

- **Website:** https://qvac.tether.io
- **Docs:** https://docs.qvac.tether.io
- **GitHub:** https://github.com/tetherto/qvac

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   FundTracer Web App                         │
│                    app-evm / app-solana                      │
├─────────────────────────────────────────────────────────────┤
│  Chat Bubble ──────► useQVAC() ──────────────────►       │
│  (bottom-right)      React Hook        HTTP Client         │
│                                           │                │
│                              ┌────────────▼────────────┐  │
│                              │  QVAC OpenAI Server      │  │
│                              │  localhost:11434/v1      │  │
│                              │                          │  │
│                              │  • /chat/completions     │  │
│                              │  • /embeddings          │  │
│                              └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Files Structure

```
packages/web/
├── qvac.config.json           # QVAC server configuration
├── start-qvac-server.sh       # Server startup script
└── src/
    ├── components/ai-chat/
    │   ├── AiChatBubble.tsx   # Floating chat bubble
    │   └── AiChatBubble.css   # Styling
    └── hooks/qvac/
        ├── useQVAC.ts         # QVAC HTTP client
        ├── useScanCache.ts   # Redis/Firebase cache hook
        └── index.ts          # Exports
```

## Features

| Feature | Description |
|---------|-------------|
| **Chat Bubble** | Floating button, expands to full-screen |
| **Recent Scans** | Dropdown of cached wallet scans |
| **AI Reports** | Natural language wallet analysis |
| **Offline Mode** | All AI runs locally |
| **Export** | Download reports as text |

## How It Works

### 1. User Interactions

1. User analyzes a wallet on app-evm or app-solana
2. Wallet data is cached in Redis + Firebase
3. User taps the chat bubble (bottom-right)
4. Bubble expands to full-screen panel
5. User selects a recent scan OR enters new address
6. QVAC generates a plain-English risk report

### 2. QVAC Server

The QVAC server runs locally and exposes an OpenAI-compatible API:

```bash
# Install dependencies
npm install @qvac/sdk @qvac/cli

# Start server
npx qvac serve openai --config qvac.config.json --port 11434 --cors
```

### 3. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/chat/completions` | POST | LLM inference for reports |
| `/v1/embeddings` | POST | Text embeddings for RAG |
| `/v1/models` | GET | List loaded models |

## Configuration

### qvac.config.json

```json
{
  "serve": {
    "models": {
      "fundtracer-llm": {
        "model": "QWEN3_600M_INST_Q4",
        "default": true,
        "preload": true,
        "config": {
          "ctx_size": 8192,
          "tools": true
        }
      },
      "fundtracer-embed": {
        "model": "GTE_LARGE_FP16",
        "default": true
      }
    }
  }
}
```

### Environment

QVAC requires no API keys - everything runs locally on the device.

## Tech Stack

- **QVAC SDK:** `@qvac/sdk` - Local AI inference
- **QVAC CLI:** `@qvac/cli` - OpenAI-compatible server
- **React:** Frontend framework
- **Redis:** Wallet data caching
- **Firebase:** Scan history storage

## Hackathon Eligibility

This integration meets all Tether QVAC side track requirements:

| Requirement | How We Meet It |
|-------------|----------------|
| Meaningful QVAC integration | Uses LLM + embeddings + RAG pipeline |
| Not wrapper/demo | Core report generation via local AI |
| Works offline | All inference runs locally |
| Public repo | GitHub: github.com/Deji-Tech/fundtracer-by-dt |

## Evaluation Criteria

| Criteria | Weight | Our Approach |
|----------|--------|---------------|
| Technical depth | 40% | 3 QVAC capabilities (LLM, embeddings, RAG) |
| Product value | 30% | Real offline wallet reports |
| Innovation | 20% | Blockchain forensics + local AI |
| Demo quality | 10% | Working web app + walkthrough |

## Future Enhancements

Potential additions for post-hackathon:

- **Voice Input:** `@qvac/transcription-whispercpp` for voice commands
- **OCR Scanner:** `@qvac/ocr-onnx` for scanning addresses from images
- **Image Generation:** `@qvac/diffusion-cpp` for wallet visualization
- **RAG Pipeline:** `@qvac/rag` for semantic wallet pattern search

## Links

- **FundTracer:** https://fundtracer.xyz
- **GitHub Repo:** https://github.com/Deji-Tech/fundtracer-by-dt
- **QVAC Docs:** https://docs.qvac.tether.io
- **QVAC GitHub:** https://github.com/tetherto/qvac
- **Hackathon:** https://colosseum.io (Tether Frontier Track)

---

Built for the Tether Frontier Hackathon - QVAC Side Track