# Build script for low-memory environments (512MB)
#!/bin/bash

echo "Building for low-memory environment..."

# Build core first
cd packages/core
npm run build
cd ../..

# Build server
cd packages/server
npm run build
cd ../..

# Build web with memory optimizations
cd packages/web
echo "Building web with memory optimizations..."
NODE_OPTIONS="--max-old-space-size=384" npx vite build --emptyOutDir
cd ../..

echo "Build complete!"