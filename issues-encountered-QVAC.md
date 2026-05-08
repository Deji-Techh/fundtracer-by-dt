# Issues Encountered - FundTracer Development

## Hackathon Challenge: Building a Multi-Chain Blockchain Forensics CLI

This document tracks the technical challenges we faced and how we solved them.

---

## QVAC Model Download & Server Timing

### Problem
When users ran `fundtracer qvac-setup`, the model download happened **after** the server started, which caused confusion:
1. Users didn't see download progress
2. Server would appear to "hang" while loading model
3. Users couldn't tell if model was being downloaded or if something was broken

### Solution
Redesigned the flow:
1. **Download first** - Model downloads to `~/.qvac/models/` before server starts
2. **Progress indicator** - Shows percentage during download
3. **Smart caching** - Checks if model already exists in cache, skips if present
4. **Model-aware wait times** - Larger models (4B, 8B) get longer wait windows (180s, 240s)

### Files Changed
- `packages/cli/src/commands/qvac-setup.ts`

---

## QVAC Auto-Start Reliability

### Problem
The QVAC server sometimes failed to start automatically after installation. Users had to manually run:
```bash
cd ~/.fundtracer-qvac
node node_modules/@qvac/cli/dist/index.js serve openai
```

### Solution
- Increased retry attempts from 15 to 30-120 (depending on model size)
- Added console message showing expected wait time
- Improved error handling and logging

---

## AI Not Knowing It Works For FundTracer

### Problem
When users asked the AI "what can you do?" or "do you work for FundTracer?", the model (Qwen) would respond as a generic Alibaba AI, not acknowledging its role in FundTracer.

### Solution
Updated system prompts across all AI commands to explicitly state:
- "You are FundTracer AI"
- "You work FOR FundTracer"
- Clear role description: blockchain forensics, wallet analysis, scam detection

### Files Changed
- `packages/cli/src/commands/chat.ts` - CHAT_SYSTEM_PROMPT
- `packages/cli/src/ai.ts` - BLOCKCHAIN_SYSTEM_PROMPT
- `packages/cli/src/commands/similar.ts` - systemPrompt

---

## NPM Publishing

### Problem
When publishing to npm, the `bin` field in package.json caused a warning:
```
npm warn publish "bin[fundtracer]" script name dist/index.js was invalid and removed
```

### Solution
Not critical - npm auto-corrects this. The CLI still works when installed globally.

---

## Model Caching Location

### Discovery
Found that QVAC stores downloaded models in `~/.qvac/models/` (not in the project directory). This is persistent across installations.

### Files
- `~/.qvac/models/Qwen3-0.6B-Q4_0.gguf` (~365MB)
- `~/.qvac/models/Qwen3-1.7B-Q4_0.gguf` (~1GB)
- `~/.qvac/models/Qwen3-4B-Q4_K_M.gguf` (~2.4GB)

---

## Known Limitations

1. **Large model load times**: 4B and 8B models can take 2-4 minutes to load on first run
2. **No Docker fallback**: If Docker isn't available, relies on npm installation which may be slower
3. **QVAC SDK optional**: Marked as optionalDependency in package.json

---

## Future Improvements (Post-Hackathon)

- [ ] Add model download cancellation
- [ ] Show model file size before download
- [ ] Add `--force-reinstall` flag to redownload models
- [ ] Implement embedding model support (separate from LLM)
- [ ] Add offline mode with cached responses
