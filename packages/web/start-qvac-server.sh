#!/bin/bash
# QVAC Server for FundTracer AI Assistant
# Usage: ./start-qvac-server.sh

set -e

# Check if packages are installed
if [ ! -d "node_modules/@qvac/sdk" ] || [ ! -d "node_modules/@qvac/cli" ]; then
    echo "Installing QVAC packages..."
    npm install @qvac/sdk @qvac/cli --save
fi

# Start the QVAC OpenAI-compatible server
echo "Starting QVAC server on http://127.0.0.1:11434..."

npx qvac serve openai \
    --config qvac.config.json \
    --port 11434 \
    --host 127.0.0.1 \
    --cors \
    --model fundtracer-llm \
    --model fundtracer-embed \
    --api-key fundtracer-ai-key

echo "QVAC server running at http://127.0.0.1:11434"
echo "API Key: fundtracer-ai-key"